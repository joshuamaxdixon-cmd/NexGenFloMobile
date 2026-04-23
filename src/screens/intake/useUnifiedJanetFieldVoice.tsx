import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Audio } from 'expo-av';

import { InlineJanetPanel } from '../../components/InlineJanetPanel';
import type { IntakeInlineVoiceState, IntakeVoiceBindings } from './types';
import {
  addJanetLiveSpeechListener,
  abortJanetLiveSpeech,
  bootstrapJanetSession,
  configureJanetPlaybackAudioMode,
  configureJanetRecordingAudioMode,
  getJanetLiveSpeechAvailability,
  normalizeIntakeFormFields,
  playJanetReplyAudio,
  requestJanetLiveSpeechPermissions,
  requestJanetResponse,
  startJanetLiveSpeech,
  stopJanetReplyAudio,
  transcribeJanetAudio,
  type IntakeFormData,
  type IntakeStepKey,
  type JanetConversationStep,
  type JanetSessionState,
  type ReturningPatientFormData,
} from '../../services';

type JanetRecordingStatus = {
  durationMillis: number;
  isRecording: boolean;
  metering?: number;
};

type UseUnifiedJanetFieldVoiceOptions = {
  currentStep: IntakeStepKey;
  draftId: string | null;
  form: IntakeFormData;
  patientId: number | null;
  returningPatient: ReturningPatientFormData;
  setVoiceListening: (value: boolean) => void;
  setVoiceTranscript: (value: string) => void;
  syncCurrentDraft: () => Promise<void>;
  updateIntakeFields: (values: Partial<IntakeFormData>) => void;
  visitId: number | null;
};

const AUTO_STOP_SILENCE_MS = 1000;
const MIN_SPEECH_DURATION_MS = 500;
const SPEECH_DETECTION_THRESHOLD = -38;
const SILENCE_DETECTION_THRESHOLD = -48;

const SUPPORTED_STEPS: IntakeStepKey[] = ['basicInfo', 'symptoms'];

function normalizeConversationStep(step: IntakeStepKey): JanetConversationStep {
  return step === 'symptoms' ? 'symptoms' : 'basicInfo';
}

function normalizeTranscriptText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function isMeaningfulTranscript(value: string) {
  const normalized = normalizeTranscriptText(value);
  return normalized.length > 0 && /[A-Za-z0-9]/.test(normalized);
}

function buildFieldPrompt(field: keyof IntakeFormData) {
  switch (field) {
    case 'firstName':
      return "What is the patient's first name?";
    case 'lastName':
      return "What is the patient's last name?";
    case 'dateOfBirth':
      return "What is the patient's date of birth?";
    case 'gender':
      return 'What sex should we place in the chart, male, female, or other?';
    case 'phoneNumber':
      return "What is the patient's phone number?";
    case 'email':
      return "What is the patient's email address?";
    case 'emergencyContactName':
      return 'What is the emergency contact name?';
    case 'emergencyContactPhone':
      return 'What is the emergency contact phone number?';
    case 'allergies':
      return 'What allergies should we note?';
    case 'medications':
      return 'What medications are being taken right now?';
    case 'medicalConditions':
      return 'Any additional history notes staff should know for this visit?';
    case 'lastDose':
      return 'When was the last dose taken?';
    case 'allergyReaction':
      return 'What reaction happens with that allergy?';
    case 'allergyNotes':
      return 'Are there any additional safety notes?';
    case 'heightFt':
      return "What is the patient's height? You can say feet and inches.";
    case 'weightLb':
      return "What is the patient's weight in pounds?";
    case 'chiefConcern':
      return 'What is the reason for this visit?';
    case 'symptomDuration':
      return 'How long has this been going on?';
    case 'painLevel':
      return 'If there is pain, how would you rate it from zero to ten?';
    case 'symptomNotes':
      return 'Any extra symptom details to add?';
    default:
      return 'Tell me the next detail.';
  }
}

function buildRecognitionContext(field: keyof IntakeFormData) {
  switch (field) {
    case 'gender':
      return ['male', 'female', 'other'];
    case 'dateOfBirth':
      return ['date of birth', 'month', 'day', 'year'];
    case 'phoneNumber':
    case 'emergencyContactPhone':
      return ['phone number', 'area code', 'cell phone'];
    case 'chiefConcern':
      return ['checkup', 'cough', 'fever', 'headache', 'chest pain'];
    case 'symptomDuration':
      return ['today', '2 days', '3 weeks', '1 month'];
    default:
      return [];
  }
}

function toVoiceTargetField(field: keyof IntakeFormData) {
  if (field === 'heightIn') {
    return 'heightFt';
  }

  return field;
}

export function useUnifiedJanetFieldVoice({
  currentStep,
  draftId,
  form,
  patientId,
  returningPatient,
  setVoiceListening,
  setVoiceTranscript,
  syncCurrentDraft,
  updateIntakeFields,
  visitId,
}: UseUnifiedJanetFieldVoiceOptions): IntakeVoiceBindings | null {
  const supportedStep = SUPPORTED_STEPS.includes(currentStep);
  const liveSpeechAvailability = useMemo(
    () => getJanetLiveSpeechAvailability(),
    [],
  );
  const sessionRef = useRef<JanetSessionState | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const activeFieldRef = useRef<keyof IntakeFormData | null>(null);
  const previousSupportedStepRef = useRef(supportedStep);
  const setVoiceListeningRef = useRef(setVoiceListening);
  const setVoiceTranscriptRef = useRef(setVoiceTranscript);
  const liveSpeechTranscriptRef = useRef('');
  const liveSpeechConfidenceRef = useRef<number | null>(null);
  const liveSpeechAudioUriRef = useRef<string | null>(null);
  const liveSpeechActiveRef = useRef(false);
  const liveSpeechFinalizingRef = useRef(false);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectedSpeechRef = useRef(false);
  const [activeField, setActiveField] = useState<keyof IntakeFormData | null>(null);
  const [state, setState] = useState<IntakeInlineVoiceState>('idle');
  const [promptText, setPromptText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVoiceListeningRef.current = setVoiceListening;
    setVoiceTranscriptRef.current = setVoiceTranscript;
  }, [setVoiceListening, setVoiceTranscript]);

  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  const clearState = useCallback(() => {
    setState((previous) => (previous !== 'idle' ? 'idle' : previous));
    setActiveField((previous) => (previous !== null ? null : previous));
    activeFieldRef.current = null;
    setPromptText((previous) => (previous !== '' ? '' : previous));
    setTranscript((previous) => (previous !== '' ? '' : previous));
    setWarnings((previous) => (previous.length > 0 ? [] : previous));
    setError((previous) => (previous !== null ? null : previous));
    setVoiceListeningRef.current(false);
    setVoiceTranscriptRef.current('');
  }, []);

  const ensureSession = useCallback(async () => {
    if (!supportedStep) {
      return null;
    }

    const normalizedStep = normalizeConversationStep(currentStep);
    if (
      sessionRef.current?.sessionId &&
      sessionRef.current.currentStep === normalizedStep
    ) {
      return sessionRef.current;
    }

    const nextSession = await bootstrapJanetSession({
      currentStep: normalizedStep,
      draftId,
      form,
      language: 'en',
      patientId,
      returningPatient,
      visitId,
    });
    sessionRef.current = nextSession;
    return nextSession;
  }, [currentStep, draftId, form, patientId, returningPatient, supportedStep, visitId]);

  const stopPlayback = useCallback(async () => {
    await stopJanetReplyAudio(soundRef.current);
    soundRef.current = null;
  }, []);

  const handleTurnResult = useCallback(
    async (targetField: keyof IntakeFormData, nextTranscript: string, confidence: number | null) => {
      const session = await ensureSession();
      if (!session?.sessionId) {
        throw new Error('Janet is still getting ready.');
      }

      setState('processing');
      setError(null);
      setWarnings([]);

      const result = await requestJanetResponse({
        currentStep: normalizeConversationStep(currentStep),
        form,
        interaction: {
          mode: 'normal',
          targetField: toVoiceTargetField(targetField),
        },
        returningPatient,
        sessionId: session.sessionId,
        transcript: nextTranscript,
        transcriptConfidence: confidence,
      });

      const patch = normalizeIntakeFormFields(result.extraction.draftPatch);
      updateIntakeFields(patch);
      setWarnings(result.warnings);

      setTimeout(() => {
        void syncCurrentDraft();
      }, 0);

      if (result.confirmation.required || result.lowConfidence) {
        setState('confirming');
        setPromptText(
          result.confirmation.prompt?.trim() ||
            result.janet.text.trim() ||
            `I heard ${nextTranscript}. Is that right?`,
        );
        setTranscript(nextTranscript);
        setVoiceListening(false);
        setVoiceTranscript(nextTranscript);
        return;
      }

      clearState();
    },
    [
      clearState,
      currentStep,
      ensureSession,
      form,
      returningPatient,
      setVoiceListening,
      setVoiceTranscript,
      syncCurrentDraft,
      updateIntakeFields,
    ],
  );

  const resetLiveSpeechCapture = useCallback(() => {
    liveSpeechTranscriptRef.current = '';
    liveSpeechConfidenceRef.current = null;
    liveSpeechAudioUriRef.current = null;
    liveSpeechActiveRef.current = false;
    liveSpeechFinalizingRef.current = false;
    clearSilenceTimeout();
  }, [clearSilenceTimeout]);

  const finalizeLiveSpeechCapture = useCallback(async () => {
    if (liveSpeechFinalizingRef.current) {
      return;
    }

    liveSpeechFinalizingRef.current = true;
    liveSpeechActiveRef.current = false;
    setVoiceListening(false);
    setState('processing');

    try {
      let nextTranscript = normalizeTranscriptText(liveSpeechTranscriptRef.current);
      let confidence = liveSpeechConfidenceRef.current;
      const audioUri = liveSpeechAudioUriRef.current;
      const targetField = activeFieldRef.current;

      if (audioUri) {
        try {
          const transcription = await transcribeJanetAudio({
            currentStep: normalizeConversationStep(currentStep),
            language: sessionRef.current?.language ?? 'en',
            sessionId: sessionRef.current?.sessionId ?? '',
            uri: audioUri,
          });
          const backendTranscript = normalizeTranscriptText(transcription.text);
          if (isMeaningfulTranscript(backendTranscript)) {
            nextTranscript = backendTranscript;
            confidence = transcription.confidence ?? confidence;
            setWarnings(transcription.warnings);
          }
        } catch {
          // fall back to live partial transcript if available
        }
      }

      if (!targetField || !isMeaningfulTranscript(nextTranscript)) {
        setState('error');
        setError('Janet did not catch a clear answer. Try again or type it manually.');
        return;
      }

      setTranscript(nextTranscript);
      setVoiceTranscript(nextTranscript);
      await handleTurnResult(targetField, nextTranscript, confidence);
    } catch (nextError) {
      setState('error');
      setError(
        nextError instanceof Error && nextError.message
          ? nextError.message
          : 'Janet could not finish that voice capture.',
      );
    } finally {
      resetLiveSpeechCapture();
    }
  }, [
    currentStep,
    handleTurnResult,
    resetLiveSpeechCapture,
    setVoiceListening,
    setVoiceTranscript,
  ]);

  const stopRecordingAndProcess = useCallback(async () => {
    const activeRecording = recordingRef.current;
    if (!activeRecording) {
      return;
    }

    clearSilenceTimeout();
    detectedSpeechRef.current = false;
    recordingRef.current = null;
    setVoiceListening(false);
    setState('processing');

    try {
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      if (!uri) {
        throw new Error('No voice capture was saved.');
      }

      const targetField = activeFieldRef.current;
      const transcription = await transcribeJanetAudio({
        currentStep: normalizeConversationStep(currentStep),
        language: sessionRef.current?.language ?? 'en',
        sessionId: sessionRef.current?.sessionId ?? '',
        uri,
      });
      const normalizedTranscript = normalizeTranscriptText(transcription.text);

      if (!targetField || !isMeaningfulTranscript(normalizedTranscript)) {
        setState('error');
        setError('Janet did not catch a clear answer. Try again or type it manually.');
        return;
      }

      setTranscript(normalizedTranscript);
      setVoiceTranscript(normalizedTranscript);
      setWarnings(transcription.warnings);
      await handleTurnResult(
        targetField,
        normalizedTranscript,
        transcription.confidence,
      );
    } catch (nextError) {
      setState('error');
      setError(
        nextError instanceof Error && nextError.message
          ? nextError.message
          : 'Janet could not finish that voice capture.',
      );
    }
  }, [
    clearSilenceTimeout,
    currentStep,
    handleTurnResult,
    setVoiceListening,
    setVoiceTranscript,
  ]);

  const handleRecordingStatusUpdate = useCallback(
    (status: JanetRecordingStatus) => {
      if (!status.isRecording) {
        clearSilenceTimeout();
        return;
      }

      const metering = typeof status.metering === 'number' ? status.metering : null;
      if (metering === null) {
        return;
      }

      const hasSpeechNow =
        metering > SPEECH_DETECTION_THRESHOLD &&
        status.durationMillis > MIN_SPEECH_DURATION_MS;
      const isQuietNow = metering < SILENCE_DETECTION_THRESHOLD;

      if (hasSpeechNow) {
        detectedSpeechRef.current = true;
        clearSilenceTimeout();
        return;
      }

      if (
        isQuietNow &&
        detectedSpeechRef.current &&
        !silenceTimeoutRef.current &&
        status.durationMillis > 900
      ) {
        silenceTimeoutRef.current = setTimeout(() => {
          silenceTimeoutRef.current = null;
          void stopRecordingAndProcess();
        }, AUTO_STOP_SILENCE_MS);
      }
    },
    [clearSilenceTimeout, stopRecordingAndProcess],
  );

  const startListening = useCallback(
    async (field: keyof IntakeFormData) => {
      if (!supportedStep) {
        return;
      }

      const targetField = toVoiceTargetField(field);
      const question = buildFieldPrompt(targetField);
      activeFieldRef.current = targetField;
      setActiveField(targetField);
      setPromptText(question);
      setTranscript('');
      setWarnings([]);
      setError(null);
      setState('listening');
      setVoiceListening(true);
      setVoiceTranscript('');

      const session = await ensureSession();
      if (!session?.sessionId) {
        throw new Error('Janet is still getting ready.');
      }

      await stopPlayback();

      if (
        liveSpeechAvailability.moduleAvailable &&
        liveSpeechAvailability.recognitionAvailable
      ) {
        const permission = await requestJanetLiveSpeechPermissions();
        if (!permission.granted) {
          throw new Error('Speech recognition permission is required.');
        }

        liveSpeechTranscriptRef.current = '';
        liveSpeechConfidenceRef.current = null;
        liveSpeechAudioUriRef.current = null;
        liveSpeechActiveRef.current = true;
        liveSpeechFinalizingRef.current = false;
        startJanetLiveSpeech({
          contextualStrings: buildRecognitionContext(targetField),
          language: 'en-US',
        });
        return;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission is required.');
      }

      await configureJanetRecordingAudioMode();
      const recording = new Audio.Recording();
      detectedSpeechRef.current = false;
      clearSilenceTimeout();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recording.setOnRecordingStatusUpdate(handleRecordingStatusUpdate);
      recording.setProgressUpdateInterval(250);
      await recording.startAsync();
      recordingRef.current = recording;
    },
    [
      clearSilenceTimeout,
      ensureSession,
      handleRecordingStatusUpdate,
      liveSpeechAvailability.moduleAvailable,
      liveSpeechAvailability.recognitionAvailable,
      setVoiceListening,
      setVoiceTranscript,
      stopPlayback,
      supportedStep,
    ],
  );

  const retry = useCallback(async () => {
    const nextField = activeFieldRef.current;
    if (!nextField) {
      return;
    }
    await startListening(nextField);
  }, [startListening]);

  const repeatPrompt = useCallback(async () => {
    if (!promptText.trim()) {
      return;
    }

    await stopPlayback();
    await configureJanetPlaybackAudioMode();
    soundRef.current = await playJanetReplyAudio({
      fallbackToDeviceSpeech: true,
      language: 'en',
      sessionId: sessionRef.current?.sessionId ?? null,
      text: promptText,
    });
  }, [promptText, stopPlayback]);

  const confirmCurrent = useCallback(async () => {
    const targetField = activeFieldRef.current;
    if (!targetField) {
      return;
    }

    try {
      await handleTurnResult(targetField, 'yes', 1);
    } catch (nextError) {
      setState('error');
      setError(
        nextError instanceof Error && nextError.message
          ? nextError.message
          : 'Janet could not confirm that answer.',
      );
    }
  }, [handleTurnResult]);

  useEffect(() => {
    if (!supportedStep || !liveSpeechAvailability.moduleAvailable) {
      return;
    }

    const startSubscription = addJanetLiveSpeechListener('start', () => {
      setState('listening');
      setVoiceListening(true);
    });
    const resultSubscription = addJanetLiveSpeechListener('result', (event) => {
      const nextTranscript = normalizeTranscriptText(
        event.results[0]?.transcript ?? '',
      );
      if (!nextTranscript) {
        return;
      }

      liveSpeechTranscriptRef.current = nextTranscript;
      const nextConfidence = event.results[0]?.confidence;
      if (typeof nextConfidence === 'number' && nextConfidence >= 0) {
        liveSpeechConfidenceRef.current = nextConfidence;
      }
      setTranscript(nextTranscript);
      setVoiceTranscript(nextTranscript);
    });
    const audioEndSubscription = addJanetLiveSpeechListener('audioend', (event) => {
      liveSpeechAudioUriRef.current = event.uri;
    });
    const errorSubscription = addJanetLiveSpeechListener('error', (event) => {
      if (!liveSpeechActiveRef.current) {
        return;
      }
      resetLiveSpeechCapture();
      setState('error');
      setVoiceListening(false);
      setError(event.message || 'Speech recognition aborted.');
    });
    const endSubscription = addJanetLiveSpeechListener('end', () => {
      if (!liveSpeechActiveRef.current) {
        return;
      }
      void finalizeLiveSpeechCapture();
    });

    return () => {
      startSubscription.remove();
      resultSubscription.remove();
      audioEndSubscription.remove();
      errorSubscription.remove();
      endSubscription.remove();
    };
  }, [
    finalizeLiveSpeechCapture,
    liveSpeechAvailability.moduleAvailable,
    resetLiveSpeechCapture,
    setVoiceListening,
    setVoiceTranscript,
    supportedStep,
  ]);

  useEffect(() => {
    const wasSupportedStep = previousSupportedStepRef.current;
    previousSupportedStepRef.current = supportedStep;

    if (supportedStep || !wasSupportedStep) {
      return;
    }

    const shouldResetVoiceState =
      state !== 'idle' ||
      activeFieldRef.current !== null ||
      promptText !== '' ||
      transcript !== '' ||
      warnings.length > 0 ||
      error !== null ||
      liveSpeechActiveRef.current ||
      recordingRef.current !== null;

    if (!shouldResetVoiceState) {
      return;
    }

    clearSilenceTimeout();
    abortJanetLiveSpeech();
    liveSpeechActiveRef.current = false;
    liveSpeechFinalizingRef.current = false;
    if (recordingRef.current) {
      const activeRecording = recordingRef.current;
      recordingRef.current = null;
      void activeRecording.stopAndUnloadAsync().catch(() => {
        // Best-effort shutdown when the user leaves an inline Janet step.
      });
    }
    clearState();
  }, [
    clearSilenceTimeout,
    clearState,
    error,
    promptText,
    state,
    supportedStep,
    transcript,
    warnings.length,
  ]);

  useEffect(() => {
    if (__DEV__) {
      console.log('Janet state:', state);
    }
  }, [state]);

  useEffect(() => {
    return () => {
      clearSilenceTimeout();
      abortJanetLiveSpeech();
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      void stopPlayback();
    };
  }, [clearSilenceTimeout, stopPlayback]);

  const bindField = useCallback(
    (field: keyof IntakeFormData) => {
      const targetField = toVoiceTargetField(field);
      const isActive = activeField === targetField;
      const panelState = isActive ? state : 'idle';
      const footer =
        isActive && panelState !== 'idle' ? (
          <InlineJanetPanel
            error={error}
            onConfirm={panelState === 'confirming' ? () => void confirmCurrent() : undefined}
            onEdit={panelState === 'confirming' || panelState === 'error' ? clearState : undefined}
            onRepeat={panelState === 'confirming' ? () => void repeatPrompt() : undefined}
            onRetry={panelState === 'error' ? () => void retry() : undefined}
            prompt={promptText || buildFieldPrompt(targetField)}
            state={panelState}
            transcript={transcript}
            warnings={warnings}
          />
        ) : null;

      return {
        footer,
        onVoicePress: supportedStep ? () => void startListening(targetField) : undefined,
        state: panelState,
      };
    },
    [
      activeField,
      clearState,
      confirmCurrent,
      error,
      promptText,
      repeatPrompt,
      retry,
      startListening,
      state,
      supportedStep,
      transcript,
      warnings,
    ],
  );

  if (!supportedStep) {
    return null;
  }

  return {
    bindField,
  };
}
