import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

import { DraftBanner } from '../components/DraftBanner';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SecondaryButton } from '../components/SecondaryButton';
import type { RootTabParamList } from '../navigation/types';
import {
  addJanetLiveSpeechListener,
  abortJanetLiveSpeech,
  bootstrapJanetSession,
  buildJanetHandoffFromDraft,
  buildJanetSpeechText,
  configureJanetPlaybackAudioMode,
  configureJanetRecordingAudioMode,
  normalizeIntakeFormFields,
  formatJanetConfirmation,
  getJanetLiveSpeechAvailability,
  inferJanetConversationStep,
  intakeFlowSteps,
  janetAssistant,
  pickDocumentFromSource,
  requestJanetLiveSpeechPermissions,
  playJanetReplyAudio,
  requestJanetResponse,
  scanDocumentWithTextract,
  startJanetLiveSpeech,
  stopJanetLiveSpeech,
  stopJanetReplyAudio,
  transcribeJanetAudio,
  useDraftStore,
  type DocumentScanResult,
  type IntakeFormData,
  type JanetConfirmationState,
  type JanetConversationStep,
  type JanetSessionState,
  type JanetSpeechPlaybackState,
} from '../services';
import { colors, spacing, typography } from '../theme';

type VoiceExperienceProps = {
  embedded?: boolean;
  onSwitchToTyping?: () => void;
};

type JanetRecordingStatus = {
  durationMillis: number;
  isRecording: boolean;
  metering?: number;
};

type PendingScanResult = DocumentScanResult & {
  promptText: string;
};

const SCAN_LOW_CONFIDENCE_THRESHOLD = 0.8;
const JANET_TIMING = {
  // How long Janet waits after speaking before auto-listening starts again.
  autoListenDelayMs: 420,
  // How much quiet audio must pass before an answer auto-stops.
  silenceDurationMs: 850,
  // Minimum capture duration before metering counts as real speech.
  minimumSpeechDurationMs: 320,
  // Metering level that marks the start of speech.
  speechStartThresholdDb: -40,
  // Metering level that marks a return to silence.
  silenceThresholdDb: -50,
  // Short pause before playback so Janet feels deliberate instead of abrupt.
  preSpeakDelayMs: 120,
  // Small post-processing pause before Janet replies.
  postResponseDelayMs: 90,
} as const;

const EMPTY_CONFIRMATION: JanetConfirmationState = {
  choices: [],
  field: null,
  prompt: null,
  required: false,
};

const FIELD_LABELS: Record<string, string> = {
  allergies: 'allergies',
  chiefConcern: 'reason for your visit',
  dateOfBirth: 'date of birth',
  email: 'email address',
  emergencyContactName: 'emergency contact name',
  emergencyContactPhone: 'emergency contact phone',
  firstName: 'first name',
  gender: 'gender',
  groupNumber: 'insurance group number',
  heightFt: 'height',
  heightIn: 'height',
  insuranceProvider: 'insurance provider',
  lastName: 'last name',
  medicalConditions: 'medical history',
  medications: 'medications',
  memberId: 'insurance member ID',
  painLevel: 'pain level',
  patientType: 'visit type',
  phoneNumber: 'phone number',
  subscriberName: 'insurance subscriber',
  symptomDuration: 'how long this has been going on',
  symptomNotes: 'extra symptom details',
  weightLb: 'weight',
};

function getCurrentFieldLabel(field: string | null) {
  if (!field) {
    return 'the next intake detail';
  }

  return FIELD_LABELS[field] ?? field;
}

function getDocumentTypeLabel(documentType: DocumentScanResult['documentType']) {
  return documentType === 'insurance' ? 'insurance card' : 'ID';
}

function getScanAssistCopy(options: {
  canOfferIdScan: boolean;
  canOfferInsuranceScan: boolean;
}) {
  if (options.canOfferIdScan && options.canOfferInsuranceScan) {
    return {
      title: 'Scan to fill this faster',
      subtitle:
        'Janet can read your ID or insurance card and ask you to confirm the details before saving them.',
    };
  }

  if (options.canOfferInsuranceScan) {
    return {
      title: 'Scan your insurance card',
      subtitle:
        'Janet can pull your payer, member ID, group number, and subscriber details for review.',
    };
  }

  return {
    title: 'Scan your ID',
    subtitle:
      'Janet can read your name and date of birth from your ID so you do not need to type them.',
  };
}

function buildScanPreviewRows(
  extractedFields: Partial<IntakeFormData>,
  confidence: Partial<Record<keyof IntakeFormData, number>>,
) {
  return Object.entries(extractedFields)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .map(([fieldName, value]) => {
      const fieldConfidence = confidence[fieldName as keyof IntakeFormData] ?? null;

      return {
        confidence: fieldConfidence,
        confidenceLabel:
          typeof fieldConfidence === 'number'
            ? `${Math.round(fieldConfidence * 100)}% confidence`
            : null,
        isLowConfidence:
          typeof fieldConfidence === 'number' &&
          fieldConfidence < SCAN_LOW_CONFIDENCE_THRESHOLD,
        label: FIELD_LABELS[fieldName] ?? fieldName,
        value: value.trim(),
      };
    });
}

function getStepTitle(field: string | null) {
  switch (field) {
    case 'patientType':
      return 'Visit Type';
    case 'firstName':
      return 'First Name';
    case 'lastName':
      return 'Last Name';
    case 'dateOfBirth':
      return 'Date of Birth';
    case 'phoneNumber':
      return 'Phone Number';
    case 'gender':
      return 'Gender';
    case 'emergencyContactName':
      return 'Emergency Contact';
    case 'emergencyContactPhone':
      return 'Emergency Contact Phone';
    case 'chiefConcern':
      return 'Reason for Visit';
    case 'symptomDuration':
      return 'Symptom Duration';
    case 'painLevel':
      return 'Pain Level';
    case 'heightFt':
      return 'Height';
    case 'weightLb':
      return 'Weight';
    case 'insuranceProvider':
      return 'Insurance Provider';
    case 'memberId':
      return 'Member ID';
    case 'groupNumber':
      return 'Group Number';
    case 'subscriberName':
      return 'Subscriber';
    default:
      return 'Review';
  }
}

function normalizeTranscriptText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isMeaningfulTranscript(value: string) {
  const normalized = normalizeTranscriptText(value);
  if (!normalized) {
    return false;
  }

  return /[A-Za-z0-9]/.test(normalized);
}

function getLivePillLabel(args: {
  isBootstrapping: boolean;
  isProcessing: boolean;
  isRecording: boolean;
  speechState: JanetSpeechPlaybackState;
}) {
  if (args.isBootstrapping) {
    return 'JANET STARTING';
  }
  if (args.isProcessing) {
    return 'JANET THINKING';
  }
  if (args.isRecording) {
    return 'JANET LISTENING';
  }
  if (args.speechState === 'speaking' || args.speechState === 'processing') {
    return 'JANET TALKING';
  }
  return 'JANET READY';
}

function buildPreviewRows(
  step: JanetConversationStep,
  form: ReturnType<typeof useDraftStore>['state']['intake']['form'],
) {
  if (step === 'basicInfo') {
    return [
      ['Name', [form.firstName, form.lastName].filter(Boolean).join(' ').trim()],
      ['Date of birth', form.dateOfBirth],
      ['Phone', form.phoneNumber],
      ['Email', form.email],
      ['Emergency contact', [form.emergencyContactName, form.emergencyContactPhone].filter(Boolean).join(' · ').trim()],
      ['Gender', form.gender],
    ] as const;
  }

  if (step === 'symptoms') {
    const height =
      form.heightFt || form.heightIn
        ? `${form.heightFt || '0'} ft ${form.heightIn || '0'} in`
        : '';

    return [
      ['Chief concern', form.chiefConcern],
      ['Duration', form.symptomDuration],
      ['Medications', form.medications],
      ['Allergies', form.allergies],
      ['Reaction details', form.allergyReaction],
      ['Safety notes', form.allergyNotes],
      ['Preferred pharmacy', form.pharmacy],
      ['Last dose', form.lastDose],
      ['Height', height],
      ['Weight', form.weightLb ? `${form.weightLb} lb` : ''],
      ['Severity', form.painLevel],
    ] as const;
  }

  if (step === 'documents') {
    return [
      ['Insurance provider', form.insuranceProvider],
      ['Member ID', form.memberId],
      ['Subscriber', form.subscriberName],
    ] as const;
  }

  return [
    ['Name', [form.firstName, form.lastName].filter(Boolean).join(' ').trim()],
    ['Chief concern', form.chiefConcern],
    ['Medications', form.medications],
  ] as const;
}

function buildRecognitionContext(
  field: string | null,
  form: ReturnType<typeof useDraftStore>['state']['intake']['form'],
) {
  const defaults = [
    'new patient',
    'returning patient',
    'family member',
    'male',
    'female',
    'date of birth',
    'emergency contact',
    'phone number',
  ];

  switch (field) {
    case 'patientType':
      return ['new patient', 'returning patient', 'family member'];
    case 'gender':
      return ['male', 'female'];
    case 'dateOfBirth':
      return ['date of birth', 'month', 'day', 'year'];
    case 'phoneNumber':
    case 'emergencyContactPhone':
      return ['phone number', 'area code', 'cell phone'];
    case 'emergencyContactName':
      return ['emergency contact', 'mother', 'father', 'spouse', 'friend'];
    case 'chiefConcern':
      return ['chest pain', 'checkup', 'cough', 'fever', 'headache'];
    case 'symptomDuration':
      return ['today', '2 days', '3 weeks', '1 month'];
    default:
      return [
        ...defaults,
        form.firstName,
        form.lastName,
        form.emergencyContactName,
      ].filter((value): value is string => Boolean(value && value.trim()));
  }
}

export function VoiceExperience({
  embedded = false,
  onSwitchToTyping,
}: VoiceExperienceProps) {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const {
    setIntakeStep,
    setVoiceEditing,
    setVoiceHandoff,
    setVoiceListening,
    setVoiceSpellMode,
    setVoiceTranscript,
    startNewIntake,
    state,
    syncCurrentDraft,
    syncVoiceHandoff,
    updateIntakeFields,
  } = useDraftStore();

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const bootstrapKeyRef = useRef('');
  const lastSpokenTextRef = useRef('');
  const autoPlayedSessionRef = useRef('');
  const autoListenRef = useRef('');
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectedSpeechRef = useRef(false);
  const stopRecordingAndProcessRef = useRef<(() => Promise<void>) | null>(null);
  const handleJanetTurnRef = useRef<
    ((
      transcript: string,
      confidence: number | null,
      interactionMode?: 'correction' | 'normal' | 'spell',
    ) => Promise<void>) | null
  >(null);
  const liveSpeechTranscriptRef = useRef('');
  const liveSpeechConfidenceRef = useRef<number | null>(null);
  const liveSpeechAudioUriRef = useRef<string | null>(null);
  const liveSpeechActiveRef = useRef(false);
  const liveSpeechFinalizingRef = useRef(false);
  const [session, setSession] = useState<JanetSessionState | null>(null);
  const [replyText, setReplyText] = useState<string>(janetAssistant.greetingText);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [confirmation, setConfirmation] =
    useState<JanetConfirmationState>(EMPTY_CONFIRMATION);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [speechState, setSpeechState] =
    useState<JanetSpeechPlaybackState>('ready');
  const [autoListenEnabled, setAutoListenEnabled] = useState(true);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [liveMeterLevel, setLiveMeterLevel] = useState(0);
  const [pendingAutoListenToken, setPendingAutoListenToken] = useState<string | null>(
    null,
  );
  const [pendingScanResult, setPendingScanResult] = useState<PendingScanResult | null>(
    null,
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanningDocumentType, setScanningDocumentType] = useState<
    DocumentScanResult['documentType'] | null
  >(null);
  const hasDraftProgress = useMemo(
    () => Object.values(state.intake.form).some((value) => value.trim().length > 0),
    [state.intake.form],
  );
  const liveSpeechAvailability = useMemo(
    () => getJanetLiveSpeechAvailability(),
    [],
  );

  const janetStep =
    session?.currentStep ?? inferJanetConversationStep(state.intake.currentStep);
  const currentFieldLabel = getCurrentFieldLabel(session?.currentField ?? null);
  const currentStepTitle = getStepTitle(session?.currentField ?? null);
  const currentSpeechText = buildJanetSpeechText({
    confirmation,
    handoff: state.voice.handoff,
    replyText,
    spellModeEnabled: state.voice.spellModeEnabled,
  });
  const previewRows = useMemo(
    () =>
      buildPreviewRows(janetStep, state.intake.form).filter(
        ([, value]) => value.trim().length > 0,
      ),
    [janetStep, state.intake.form],
  );
  const livePillLabel = getLivePillLabel({
    isBootstrapping,
    isProcessing,
    isRecording,
    speechState,
  });
  const transcriptPreview = useMemo(() => {
    if (partialTranscript.trim()) {
      return partialTranscript;
    }
    if (finalTranscript.trim()) {
      return finalTranscript;
    }
    if (isRecording) {
      return 'Listening…';
    }
    if (isProcessing) {
      return 'Processing your answer…';
    }
    return 'Tap or speak when ready.';
  }, [finalTranscript, isProcessing, isRecording, partialTranscript]);

  const stopPlayback = useCallback(async () => {
    await stopJanetReplyAudio(soundRef.current);
    soundRef.current = null;
    setSpeechState(lastSpokenTextRef.current.trim() ? 'paused' : 'ready');
  }, []);

  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  const bootstrapSession = useCallback(
    async (options?: {
      currentStepOverride?: JanetConversationStep | null;
      force?: boolean;
      formOverride?: IntakeFormData;
    }) => {
      const nextBootstrapKey = [
        state.backend.draft.draftId ?? '',
        state.backend.draft.patientId ?? '',
        state.backend.draft.visitId ?? '',
        options?.currentStepOverride ?? state.intake.currentStep,
        options?.formOverride?.firstName ?? state.intake.form.firstName,
        options?.formOverride?.lastName ?? state.intake.form.lastName,
        options?.formOverride?.dateOfBirth ?? state.intake.form.dateOfBirth,
      ].join(':');

      if (!options?.force && bootstrapKeyRef.current === nextBootstrapKey) {
        return session;
      }

      if (isBootstrapping) {
        return session;
      }

      bootstrapKeyRef.current = nextBootstrapKey;
      setIsBootstrapping(true);
      setMicError(null);

      try {
        const nextSession = await bootstrapJanetSession({
          currentStep: options?.currentStepOverride ?? state.intake.currentStep,
          draftId: state.backend.draft.draftId,
          form: options?.formOverride ?? state.intake.form,
          language: 'en',
          patientId: state.backend.draft.patientId,
          returningPatient: state.returningPatient.form,
          visitId: state.backend.draft.visitId,
        });

        setSession(nextSession);
        setConfirmation(nextSession.confirmation);
        setReplyText(nextSession.firstPrompt);

        if (Object.keys(nextSession.draftPatch).length > 0) {
          updateIntakeFields(nextSession.draftPatch);
        }

        setPartialTranscript('');
        setFinalTranscript('');

        return nextSession;
      } catch (error) {
        setMicError(
          error instanceof Error && error.message
            ? error.message
            : 'Janet could not start right now.',
        );
        return null;
      } finally {
        setIsBootstrapping(false);
      }
    },
    [
      isBootstrapping,
      session,
      state.backend.draft.draftId,
      state.backend.draft.patientId,
      state.backend.draft.visitId,
      state.intake.currentStep,
      state.intake.form,
      state.returningPatient.form,
      updateIntakeFields,
    ],
  );

  const handleRecordingStatusUpdate = useCallback(
    (status: JanetRecordingStatus) => {
      if (!status.isRecording) {
        setLiveMeterLevel(0);
        clearSilenceTimeout();
        return;
      }

      const metering = typeof status.metering === 'number' ? status.metering : null;
      if (metering === null) {
        setLiveMeterLevel(0);
        return;
      }

      const normalizedMeter = Math.max(
        0,
        Math.min(1, (metering - JANET_TIMING.silenceThresholdDb) / 24),
      );
      setLiveMeterLevel(normalizedMeter);

      const hasSpeechNow =
        metering > JANET_TIMING.speechStartThresholdDb &&
        status.durationMillis > JANET_TIMING.minimumSpeechDurationMs;
      const isQuietNow = metering < JANET_TIMING.silenceThresholdDb;

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
          void stopRecordingAndProcessRef.current?.();
        }, JANET_TIMING.silenceDurationMs);
      }
    },
    [clearSilenceTimeout],
  );

  const resetLiveSpeechCapture = useCallback(() => {
    liveSpeechTranscriptRef.current = '';
    liveSpeechConfidenceRef.current = null;
    liveSpeechAudioUriRef.current = null;
    liveSpeechActiveRef.current = false;
    liveSpeechFinalizingRef.current = false;
    setLiveMeterLevel(0);
  }, []);

  const finalizeLiveSpeechCapture = useCallback(async () => {
    if (liveSpeechFinalizingRef.current) {
      return;
    }

    liveSpeechFinalizingRef.current = true;
    liveSpeechActiveRef.current = false;
    setIsRecording(false);
    setVoiceListening(false);
    setIsProcessing(true);
    setLiveMeterLevel(0);

    try {
      let transcript = normalizeTranscriptText(liveSpeechTranscriptRef.current);
      let confidence = liveSpeechConfidenceRef.current;
      const audioUri = liveSpeechAudioUriRef.current;

      if (audioUri) {
        try {
          const transcription = await transcribeJanetAudio({
            currentStep: janetStep,
            language: session?.language ?? 'en',
            sessionId: session?.sessionId ?? '',
            uri: audioUri,
          });
          const backendTranscript = normalizeTranscriptText(transcription.text);
          if (isMeaningfulTranscript(backendTranscript)) {
            transcript = backendTranscript;
            confidence = transcription.confidence ?? confidence;
            setWarnings(transcription.warnings);
            setPartialTranscript('');
            setFinalTranscript(backendTranscript);
            setVoiceTranscript(backendTranscript);
          }
        } catch (error) {
          if (!isMeaningfulTranscript(transcript)) {
            throw error;
          }
        }
      }

      if (!isMeaningfulTranscript(transcript)) {
        setWarnings((currentWarnings) =>
          currentWarnings.length > 0
            ? currentWarnings
            : ['Janet did not catch a clear answer.'],
        );
        setMicError('Janet did not catch a clear answer. Please try again.');
        return;
      }

      await handleJanetTurnRef.current?.(
        transcript,
        confidence,
        state.voice.spellModeEnabled ? 'spell' : 'normal',
      );
    } catch (error) {
      setMicError(
        error instanceof Error && error.message
          ? error.message
          : 'We could not finish the voice capture.',
      );
      setIsProcessing(false);
    } finally {
      resetLiveSpeechCapture();
    }
  }, [
    janetStep,
    resetLiveSpeechCapture,
    session?.language,
    session?.sessionId,
    setVoiceListening,
    setVoiceTranscript,
    state.voice.spellModeEnabled,
  ]);

  const startRecording = useCallback(async () => {
    setMicError(null);
    setWarnings([]);

    try {
      if (!session?.sessionId) {
        const nextSession = await bootstrapSession({ force: true });
        if (!nextSession?.sessionId) {
          throw new Error('Janet is still getting ready. Please try again.');
        }
      }

      if (
        liveSpeechAvailability.moduleAvailable &&
        liveSpeechAvailability.recognitionAvailable
      ) {
        const permission = await requestJanetLiveSpeechPermissions();
        if (!permission.granted) {
          throw new Error(
            'Speech recognition permission is required for live Janet voice intake.',
          );
        }

        await stopPlayback();
        liveSpeechTranscriptRef.current = '';
        liveSpeechConfidenceRef.current = null;
        liveSpeechAudioUriRef.current = null;
        liveSpeechActiveRef.current = true;
        liveSpeechFinalizingRef.current = false;
        setPartialTranscript('');
        setFinalTranscript('');
        setIsRecording(true);
        setVoiceEditing(false);
        setVoiceListening(true);
        setSpeechState('ready');
        setVoiceTranscript('Listening for the next answer...');
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        startJanetLiveSpeech({
          contextualStrings: buildRecognitionContext(
            session?.currentField ?? null,
            state.intake.form,
          ),
          language: 'en-US',
        });
        return;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission is required for Janet voice intake.');
      }

      await stopPlayback();
      await configureJanetRecordingAudioMode();

      const recording = new Audio.Recording();
      detectedSpeechRef.current = false;
      clearSilenceTimeout();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recording.setOnRecordingStatusUpdate(handleRecordingStatusUpdate);
      recording.setProgressUpdateInterval(250);
      await recording.startAsync();
      recordingRef.current = recording;
      setPartialTranscript('');
      setFinalTranscript('');
      setIsRecording(true);
      setVoiceEditing(false);
      setVoiceListening(true);
      setSpeechState('ready');
      setVoiceTranscript(
        state.voice.spellModeEnabled
          ? 'Spell mode is on. Janet is listening carefully for one detail at a time.'
          : 'Listening for the next answer...',
      );
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      setMicError(
        error instanceof Error && error.message
          ? error.message
          : 'Janet could not start the microphone.',
      );
      setIsRecording(false);
      setVoiceListening(false);
    }
  }, [
    bootstrapSession,
    clearSilenceTimeout,
    handleRecordingStatusUpdate,
    liveSpeechAvailability.moduleAvailable,
    liveSpeechAvailability.recognitionAvailable,
    session?.sessionId,
    session?.currentField,
    setVoiceEditing,
    setVoiceListening,
    setVoiceTranscript,
    state.voice.spellModeEnabled,
    state.intake.form,
    stopPlayback,
  ]);

  const playPrompt = useCallback(
    async (text: string, options?: { autoListenAfter?: boolean }) => {
      const trimmedText = text.trim();
      if (!trimmedText) {
        return;
      }

      const shouldAutoListenAfter = options?.autoListenAfter ?? autoListenEnabled;
      setMicError(null);
      setSpeechState('processing');
      lastSpokenTextRef.current = trimmedText;

      try {
        if (!voiceOutputEnabled) {
          setSpeechState('replay');
          if (shouldAutoListenAfter) {
            setPendingAutoListenToken(
              `${session?.sessionId ?? 'local'}:${Date.now()}:${trimmedText}`,
            );
          }
          return;
        }

        await stopJanetReplyAudio(soundRef.current);
        await configureJanetPlaybackAudioMode();
        await wait(JANET_TIMING.preSpeakDelayMs);
        soundRef.current = await playJanetReplyAudio({
          cacheSafe: false,
          fallbackToDeviceSpeech: true,
          language: session?.language ?? 'en',
          onComplete: () => {
            setSpeechState('replay');
            if (shouldAutoListenAfter) {
              setPendingAutoListenToken(
                `${session?.sessionId ?? 'local'}:${Date.now()}:${trimmedText}`,
              );
            }
          },
          onStart: () => {
            setSpeechState('speaking');
          },
          sessionId: session?.sessionId ?? null,
          text: trimmedText,
        });
      } catch (error) {
        setMicError(
          error instanceof Error && error.message
            ? error.message
            : 'Janet voice guidance is unavailable right now.',
        );
        setSpeechState(lastSpokenTextRef.current.trim() ? 'replay' : 'ready');
      }
    },
    [autoListenEnabled, session?.language, session?.sessionId, voiceOutputEnabled],
  );

  const handleJanetTurn = useCallback(
    async (
      transcript: string,
      confidence: number | null,
      interactionMode: 'correction' | 'normal' | 'spell' = 'normal',
    ) => {
      if (!session?.sessionId) {
        return;
      }

      setIsProcessing(true);
      setMicError(null);

      try {
        const result = await requestJanetResponse({
          currentStep: janetStep,
          form: state.intake.form,
          interaction: {
            mode:
              interactionMode === 'normal' && state.voice.spellModeEnabled
                ? 'spell'
                : interactionMode,
            targetField: session.currentField,
          },
          returningPatient: state.returningPatient.form,
          sessionId: session.sessionId,
          transcript,
          transcriptConfidence: confidence,
        });

        const mergedForm = {
          ...state.intake.form,
          ...result.extraction.draftPatch,
        };

        updateIntakeFields(result.extraction.draftPatch);
        const shouldKeepTranscriptVisible =
          result.confirmation.required || result.lowConfidence;
        setPartialTranscript('');
        setFinalTranscript(shouldKeepTranscriptVisible ? transcript : '');
        setVoiceTranscript(shouldKeepTranscriptVisible ? transcript : '');

        const nextHandoff = buildJanetHandoffFromDraft({
          existing: state.voice.handoff,
          form: mergedForm,
          interpretedAt: new Date().toISOString(),
          transcript,
        });
        setVoiceHandoff(nextHandoff);

        setSession((currentSession) =>
          currentSession
            ? {
                ...currentSession,
                confirmation: result.confirmation,
                currentField: result.extraction.currentField,
                currentStep: result.extraction.updatedStep,
                draftPatch: result.extraction.draftPatch,
                missingFields: result.extraction.missingFields,
              }
            : currentSession,
        );
        setConfirmation(result.confirmation);
        setReplyText(result.janet.text);
        setWarnings(result.warnings);
        setLowConfidence(result.lowConfidence);
        setIntakeStep(result.extraction.updatedStep);

        setTimeout(() => {
          void syncCurrentDraft();
          void syncVoiceHandoff();
        }, 0);

        if (result.janet.shouldSpeak) {
          await wait(JANET_TIMING.postResponseDelayMs);
          await playPrompt(result.janet.speakText);
        }
      } catch (error) {
        setMicError(
          error instanceof Error && error.message
            ? error.message
            : 'Janet could not process that answer.',
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [
      janetStep,
      playPrompt,
      session,
      setIntakeStep,
      setVoiceHandoff,
      setVoiceTranscript,
      state.intake.form,
      state.returningPatient.form,
      state.voice.handoff,
      state.voice.spellModeEnabled,
      syncCurrentDraft,
      syncVoiceHandoff,
      updateIntakeFields,
    ],
  );

  const stopRecordingAndProcess = useCallback(async () => {
    const activeRecording = recordingRef.current;
    if (!activeRecording) {
      return;
    }

    clearSilenceTimeout();
    detectedSpeechRef.current = false;
    setLiveMeterLevel(0);
    recordingRef.current = null;
    setIsRecording(false);
    setVoiceListening(false);
    setIsProcessing(true);

    try {
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      if (!uri) {
        throw new Error('No voice capture was saved. Please try again.');
      }

      const transcription = await transcribeJanetAudio({
        currentStep: janetStep,
        language: session?.language ?? 'en',
        sessionId: session?.sessionId ?? '',
        uri,
      });

      const normalizedTranscript = normalizeTranscriptText(transcription.text);
      setPartialTranscript('');
      setFinalTranscript(normalizedTranscript);
      setVoiceTranscript(normalizedTranscript);
      setWarnings(transcription.warnings);

      if (!isMeaningfulTranscript(normalizedTranscript)) {
        setWarnings((currentWarnings) =>
          currentWarnings.length > 0
            ? currentWarnings
            : ['Janet did not catch a clear answer.'],
        );
        setMicError('Janet did not catch a clear answer. Please try again.');
        setIsProcessing(false);
        return;
      }

      await handleJanetTurn(
        normalizedTranscript,
        transcription.confidence,
        state.voice.spellModeEnabled ? 'spell' : 'normal',
      );
    } catch (error) {
      setMicError(
        error instanceof Error && error.message
          ? error.message
          : 'We could not finish the voice capture.',
      );
      setIsProcessing(false);
    }
  }, [
    handleJanetTurn,
    janetStep,
    session?.language,
    session?.sessionId,
    clearSilenceTimeout,
    setVoiceListening,
    setVoiceTranscript,
    state.voice.spellModeEnabled,
  ]);

  const handleScan = useCallback(
    async (documentType: DocumentScanResult['documentType']) => {
      setMicError(null);
      setWarnings([]);
      setLowConfidence(false);
      setPendingAutoListenToken(null);

      try {
        await stopPlayback();

        const pickerResult = await pickDocumentFromSource('camera');
        if (pickerResult.status === 'cancelled') {
          return;
        }
        if (pickerResult.status === 'permission_denied') {
          throw new Error('Camera permission is required to scan a document.');
        }

        setScanningDocumentType(documentType);
        setIsScanning(true);
        const scanResult = await scanDocumentWithTextract(
          documentType,
          pickerResult.asset,
        );
        const normalizedFields = normalizeIntakeFormFields(
          scanResult.extractedFields,
        );

        if (Object.keys(normalizedFields).length === 0) {
          throw new Error(
            'We could not read details from that document. Please retake the photo or type the details manually.',
          );
        }

        const promptText =
          documentType === 'insurance'
            ? 'I found some insurance details. Please confirm them before I save them.'
            : 'I found some details from your ID. Please confirm them before I save them.';

        setPendingScanResult({
          ...scanResult,
          extractedFields: normalizedFields,
          promptText,
        });
        setConfirmation(EMPTY_CONFIRMATION);
        setFinalTranscript('');
        setPartialTranscript('');
        setVoiceTranscript('');
        setReplyText(promptText);
        setWarnings(scanResult.warnings);
        setSpeechState('ready');
        void playPrompt(promptText, { autoListenAfter: false });
      } catch (error) {
        const errorMessage =
          error instanceof Error && error.message
            ? error.message
            : 'Janet could not scan that document right now.';

        const isUnreadableDocumentError =
          /No readable details were detected|could not read details from that document/i.test(
            errorMessage,
          );
        setMicError(
          isUnreadableDocumentError
            ? 'We could not read that document. Retake it in bright light, keep it flat, and fill the frame, or type the details manually.'
            : errorMessage,
        );
      } finally {
        setIsScanning(false);
        setScanningDocumentType(null);
      }
    },
    [playPrompt, setVoiceTranscript, stopPlayback],
  );

  const handleConfirmScannedFields = useCallback(async () => {
    if (!pendingScanResult) {
      return;
    }

    const mergedForm = normalizeIntakeFormFields({
      ...state.intake.form,
      ...pendingScanResult.extractedFields,
    }) as IntakeFormData;

    updateIntakeFields(pendingScanResult.extractedFields);
    setPendingScanResult(null);
    setWarnings([]);
    setLowConfidence(false);
    setPartialTranscript('');
    setFinalTranscript('');
    setVoiceTranscript('');

    setTimeout(() => {
      void syncCurrentDraft();
    }, 0);

    await bootstrapSession({
      currentStepOverride: janetStep,
      force: true,
      formOverride: mergedForm,
    });
  }, [
    bootstrapSession,
    janetStep,
    pendingScanResult,
    setVoiceTranscript,
    state.intake.form,
    syncCurrentDraft,
    updateIntakeFields,
  ]);


  const handleMicPress = useCallback(async () => {
    if (isBootstrapping || isProcessing) {
      setMicError('Janet is getting ready. Please try again in a moment.');
      return;
    }

    if (isRecording) {
      void Haptics.selectionAsync();
      if (liveSpeechActiveRef.current) {
        stopJanetLiveSpeech();
        return;
      }
      await stopRecordingAndProcess();
      return;
    }

    await startRecording();
  }, [
    isBootstrapping,
    isProcessing,
    isRecording,
    startRecording,
    stopRecordingAndProcess,
  ]);

  const continueInTypedIntake = useCallback(() => {
    setPendingScanResult(null);

    if (!state.intake.form.firstName && !state.intake.form.chiefConcern) {
      startNewIntake({
        source: 'voice',
        step: janetStep,
      });
    }

    setIntakeStep(janetStep);
    if (onSwitchToTyping) {
      onSwitchToTyping();
      return;
    }

    navigation.navigate('Intake', {
      mode: 'intake',
      startStep: janetStep,
      launchSource: 'voice',
    });
  }, [
    janetStep,
    navigation,
    onSwitchToTyping,
    setIntakeStep,
    startNewIntake,
    state.intake.form.chiefConcern,
    state.intake.form.firstName,
  ]);

  useEffect(() => {
    stopRecordingAndProcessRef.current = stopRecordingAndProcess;
  }, [stopRecordingAndProcess]);

  useEffect(() => {
    handleJanetTurnRef.current = handleJanetTurn;
  }, [handleJanetTurn]);

  useEffect(() => {
    if (!liveSpeechAvailability.moduleAvailable) {
      return;
    }

    const startSubscription = addJanetLiveSpeechListener('start', () => {
      setIsRecording(true);
      setVoiceListening(true);
      setMicError(null);
      setIsProcessing(false);
    });

    const resultSubscription = addJanetLiveSpeechListener('result', (event) => {
      const transcript = normalizeTranscriptText(
        event.results[0]?.transcript ?? '',
      );
      if (!transcript) {
        return;
      }

      liveSpeechTranscriptRef.current = transcript;
      const confidence = event.results[0]?.confidence;
      if (typeof confidence === 'number' && confidence >= 0) {
        liveSpeechConfidenceRef.current = confidence;
      }
      if (event.isFinal) {
        setFinalTranscript(transcript);
        setPartialTranscript('');
      } else {
        setPartialTranscript(transcript);
      }
      setVoiceTranscript(transcript);
    });

    const audioEndSubscription = addJanetLiveSpeechListener('audioend', (event) => {
      liveSpeechAudioUriRef.current = event.uri;
    });

    const volumeSubscription = addJanetLiveSpeechListener('volumechange', (event) => {
      const normalizedVolume = Math.max(
        0,
        Math.min(1, (event.value + 2) / 12),
      );
      setLiveMeterLevel(normalizedVolume);
    });

    const errorSubscription = addJanetLiveSpeechListener('error', (event) => {
      if (!liveSpeechActiveRef.current) {
        return;
      }

      resetLiveSpeechCapture();
      setIsRecording(false);
      setVoiceListening(false);
      setIsProcessing(false);
      setMicError(
        event.message || 'Janet live listening is unavailable right now.',
      );
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
      volumeSubscription.remove();
      errorSubscription.remove();
      endSubscription.remove();
    };
  }, [
    finalizeLiveSpeechCapture,
    liveSpeechAvailability.moduleAvailable,
    resetLiveSpeechCapture,
    setVoiceListening,
    setVoiceTranscript,
  ]);

  useEffect(() => {
    return () => {
      clearSilenceTimeout();
      abortJanetLiveSpeech();
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      setIsRecording(false);
      void stopPlayback();
    };
  }, [clearSilenceTimeout, stopPlayback]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const nextSession = await bootstrapSession();
      if (cancelled || !nextSession?.sessionId) {
        return;
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [bootstrapSession]);

  useEffect(() => {
    if (
      !session?.sessionId ||
      !session.firstPrompt.trim() ||
      state.voice.isListening ||
      isBootstrapping ||
      isProcessing
    ) {
      return;
    }

    if (autoPlayedSessionRef.current === session.sessionId) {
      return;
    }

    autoPlayedSessionRef.current = session.sessionId;
    void playPrompt(session.firstPrompt);
  }, [
    isBootstrapping,
    isProcessing,
    playPrompt,
    session?.firstPrompt,
    session?.sessionId,
    state.voice.isListening,
  ]);

  useEffect(() => {
    const nextBootstrapKey = [
      state.backend.draft.draftId ?? '',
      state.backend.draft.patientId ?? '',
      state.backend.draft.visitId ?? '',
      state.intake.currentStep,
      state.intake.form.firstName,
      state.intake.form.lastName,
      state.intake.form.dateOfBirth,
    ].join(':');

    if (bootstrapKeyRef.current === nextBootstrapKey || isBootstrapping) {
      return;
    }

    void bootstrapSession({ force: true });
  }, [
    bootstrapSession,
    isBootstrapping,
    state.backend.draft.draftId,
    state.backend.draft.patientId,
    state.backend.draft.visitId,
    state.intake.currentStep,
    state.intake.form,
    state.returningPatient.form,
  ]);

  useEffect(() => {
    if (
      !pendingAutoListenToken ||
      !autoListenEnabled ||
      isBootstrapping ||
      isProcessing ||
      isRecording ||
      state.voice.isListening
    ) {
      return;
    }

    if (autoListenRef.current === pendingAutoListenToken) {
      return;
    }

    autoListenRef.current = pendingAutoListenToken;
    const timeout = setTimeout(() => {
      setPendingAutoListenToken(null);
      void startRecording();
    }, JANET_TIMING.autoListenDelayMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [
    autoListenEnabled,
    isBootstrapping,
    isProcessing,
    isRecording,
    pendingAutoListenToken,
    startRecording,
    state.voice.isListening,
  ]);

  const scanPreviewRows = useMemo(
    () =>
      pendingScanResult
        ? buildScanPreviewRows(
            pendingScanResult.extractedFields,
            pendingScanResult.confidence,
          )
        : [],
    [pendingScanResult],
  );
  const shouldShowScanConfirmation = Boolean(pendingScanResult);
  const showListeningState = isRecording;
  const canOfferIdScan =
    !shouldShowScanConfirmation &&
    janetStep === 'basicInfo' &&
    !showListeningState &&
    !isProcessing &&
    !isScanning;
  const canOfferInsuranceScan =
    !shouldShowScanConfirmation &&
    (janetStep === 'documents' ||
      ['insuranceProvider', 'memberId', 'groupNumber', 'subscriberName'].includes(
        session?.currentField ?? '',
      )) &&
    !showListeningState &&
    !isProcessing &&
    !isScanning;
  const scanAssistCopy = getScanAssistCopy({
    canOfferIdScan,
    canOfferInsuranceScan,
  });
  const currentQuestionText = shouldShowScanConfirmation
    ? pendingScanResult?.promptText ?? 'Please confirm these scanned details before saving them.'
    : isScanning
      ? `Janet is reading your ${getDocumentTypeLabel(scanningDocumentType ?? 'id')}.`
    : currentSpeechText.trim()
      ? currentSpeechText
      : `Janet is working on ${currentFieldLabel}.`;
  const canReplay = currentSpeechText.trim().length > 0;
  const displayTranscript = transcriptPreview;
  const shouldShowEmbeddedPromptButton = !embedded;
  const shouldShowConfirmationActions =
    !shouldShowScanConfirmation &&
    confirmation.required &&
    !showListeningState &&
    !isProcessing;
  const shouldShowAnswerCard =
    showListeningState ||
    (!shouldShowConfirmationActions &&
      !shouldShowScanConfirmation &&
      (finalTranscript.trim().length > 0 ||
        partialTranscript.trim().length > 0 ||
        lowConfidence ||
        confirmation.required));
  const confirmationTranscript = normalizeTranscriptText(
    finalTranscript || partialTranscript || state.voice.transcriptDraft || '',
  );
  const meterBarStyles = [
    styles.meterBar1,
    styles.meterBar2,
    styles.meterBar3,
    styles.meterBar4,
    styles.meterBar5,
  ];

  const startFreshVoiceCheckIn = useCallback(() => {
    void stopPlayback();
    clearSilenceTimeout();
    bootstrapKeyRef.current = '';
    autoPlayedSessionRef.current = '';
    autoListenRef.current = '';
    lastSpokenTextRef.current = '';
    setPendingAutoListenToken(null);
    setPendingScanResult(null);
    setScanningDocumentType(null);
    setSession(null);
    setReplyText(janetAssistant.greetingText);
    setConfirmation(EMPTY_CONFIRMATION);
    setWarnings([]);
    setLowConfidence(false);
    setMicError(null);
    setSpeechState('ready');
    setPartialTranscript('');
    setFinalTranscript('');
    setVoiceTranscript('');
    setVoiceHandoff(null);
    setVoiceListening(false);
    setVoiceSpellMode(false);
    startNewIntake({
      source: 'voice',
      step: 'basicInfo',
    });
  }, [
    clearSilenceTimeout,
    setVoiceHandoff,
    setVoiceListening,
    setVoiceSpellMode,
    setVoiceTranscript,
    startNewIntake,
    stopPlayback,
  ]);

  const content = (
    <>
      {!embedded ? (
        <>
          <View style={styles.topbar}>
            <Text style={styles.topbarLabel}>JANET{'\n'}VOICE MODE</Text>
            <View style={styles.topbarActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void Haptics.selectionAsync();
                  setAutoListenEnabled((current) => !current);
                }}
                style={styles.topbarButton}
              >
                <Text style={styles.topbarButtonText}>
                  Hands-Free: {autoListenEnabled ? 'On' : 'Off'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void Haptics.selectionAsync();
                  setVoiceOutputEnabled((current) => !current);
                }}
                style={styles.topbarButton}
              >
                <Text style={styles.topbarButtonText}>
                  {voiceOutputEnabled ? 'Mute Janet Voice' : 'Turn Janet Voice On'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.avatarWrap}>
              <Ionicons color={colors.primaryDeep} name="mic" size={26} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Janet Guided Check-In</Text>
              <Text style={styles.heroSubtitle}>
                Janet asks one question at a time and fills the form after you confirm it.
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    Math.round(
                      (Math.max(
                        1,
                        intakeFlowSteps.findIndex((step) => step.key === janetStep) + 1,
                      ) /
                        intakeFlowSteps.length) *
                        100,
                    )
                  }%`,
                },
              ]}
            />
          </View>
        </>
      ) : null}

      {micError ? (
        <DraftBanner
          badgeLabel="Voice"
          message={micError}
          style={styles.banner}
          title="Janet needs attention"
          tone="warning"
        />
      ) : null}

      {lowConfidence && !shouldShowConfirmationActions ? (
        <DraftBanner
          badgeLabel="Confirm"
          message="Janet heard something uncertain. Please confirm the value or try again."
          style={styles.banner}
          title="Low confidence capture"
          tone="warning"
        />
      ) : null}

      {hasDraftProgress && !isRecording && !isProcessing && !embedded ? (
        <SecondaryButton
          onPress={startFreshVoiceCheckIn}
          style={styles.freshStartButton}
          title="Start new check-in"
        />
      ) : null}

      {!embedded ? (
        <View style={styles.stepPanel}>
          <View>
            <Text style={styles.stepKicker}>
              JANET STEP {Math.max(1, intakeFlowSteps.findIndex((step) => step.key === janetStep) + 1)} OF {intakeFlowSteps.length}
            </Text>
            <Text style={styles.stepTitle}>{currentStepTitle}</Text>
          </View>
          <View style={styles.livePill}>
            <Text style={styles.livePillText}>{livePillLabel}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.embeddedHeader}>
          <Text style={styles.embeddedHeaderLabel}>Speaking with Janet</Text>
          <View style={styles.livePill}>
            <Text style={styles.livePillText}>{livePillLabel}</Text>
          </View>
        </View>
      )}

      <View style={styles.questionCard}>
        <Text style={styles.questionKicker}>CURRENT QUESTION</Text>
        <Text style={styles.questionText}>{currentQuestionText}</Text>
      </View>

      {shouldShowEmbeddedPromptButton ? (
        <PrimaryButton
          disabled={isBootstrapping || isProcessing || isScanning || showListeningState}
          onPress={() => {
            void playPrompt(currentSpeechText);
          }}
          style={styles.primaryActionButton}
          title={speechState === 'speaking' ? 'Janet Speaking…' : 'Play prompt'}
        />
      ) : null}

      {canOfferIdScan || canOfferInsuranceScan ? (
        <View style={styles.scanAssistCard}>
          <View style={styles.scanAssistHeader}>
            <View style={styles.scanAssistIconWrap}>
              <Ionicons
                color={colors.primaryDeep}
                name={
                  canOfferInsuranceScan && !canOfferIdScan
                    ? 'card-outline'
                    : 'scan-outline'
                }
                size={18}
              />
            </View>
            <View style={styles.scanAssistCopy}>
              <Text style={styles.scanAssistTitle}>{scanAssistCopy.title}</Text>
              <Text style={styles.scanAssistSubtitle}>
                {scanAssistCopy.subtitle}
              </Text>
            </View>
          </View>
          <View style={styles.inlineActions}>
            {canOfferIdScan ? (
              <SecondaryButton
                disabled={isBootstrapping || isProcessing || isScanning}
                icon="scan-outline"
                loading={isScanning && scanningDocumentType === 'id'}
                onPress={() => {
                  void handleScan('id');
                }}
                style={[styles.inlineButton, styles.inlineButtonLeft]}
                title="Scan ID"
              />
            ) : (
              <View style={[styles.inlineButton, styles.inlineButtonLeft]} />
            )}
            {canOfferInsuranceScan ? (
              <SecondaryButton
                disabled={isBootstrapping || isProcessing || isScanning}
                icon="card-outline"
                loading={isScanning && scanningDocumentType === 'insurance'}
                onPress={() => {
                  void handleScan('insurance');
                }}
                style={[
                  styles.inlineButton,
                  canOfferIdScan ? styles.inlineButtonRight : styles.skipButton,
                ]}
                title="Scan Insurance"
              />
            ) : null}
          </View>
          <Text style={styles.scanAssistHint}>
            Janet will ask you to confirm every scanned detail before saving anything.
          </Text>
        </View>
      ) : null}

      {isScanning ? (
        <View style={styles.scanningCard}>
          <Text style={styles.scanningTitle}>Reading document</Text>
          <Text style={styles.scanningText}>
            Janet is checking your {getDocumentTypeLabel(scanningDocumentType ?? 'id')}. This usually takes a few seconds.
          </Text>
        </View>
      ) : null}

      {showListeningState ? (
        <View style={styles.listeningCard}>
          <Text style={styles.listeningTitle}>Janet is listening</Text>
          <Text style={styles.listeningText}>
            Speak naturally and pause when you are done. Janet will capture the answer automatically.
          </Text>
          <View style={styles.meterRow}>
            {meterBarStyles.map((meterBarStyle, index) => {
              const threshold = (index + 1) / 5;
              const isActive = liveMeterLevel >= threshold;
              return (
                <View
                  key={index}
                  style={[
                    styles.meterBar,
                    meterBarStyle,
                    isActive ? styles.meterBarActive : null,
                  ]}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {shouldShowAnswerCard ? (
        <View style={styles.answerCard}>
          <Text style={styles.answerTitle}>I heard</Text>
          <Text style={styles.answerSubtitle}>
            {showListeningState
              ? partialTranscript.trim()
                ? 'Janet is hearing your answer in real time.'
                : 'Janet is listening now.'
              : lowConfidence
                ? 'Janet is less certain and will ask to confirm.'
                : confirmation.required
                  ? 'Janet is ready for your confirmation.'
                  : 'Janet will keep the intake moving one answer at a time.'}
          </Text>
          <Text style={styles.answerTranscript}>
            {displayTranscript || 'Listening for the next answer…'}
          </Text>
        </View>
      ) : null}

      {showListeningState ? (
        <SecondaryButton
          disabled={isProcessing}
          onPress={() => {
            void handleMicPress();
          }}
          style={styles.finishButton}
          title="Stop now"
        />
      ) : shouldShowConfirmationActions || shouldShowScanConfirmation ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void handleMicPress();
          }}
          style={({ pressed }) => [
            styles.micButton,
            pressed ? styles.micButtonPressed : null,
            isProcessing ? styles.micButtonMuted : null,
          ]}
        >
          <Ionicons
            color={colors.surface}
            name={isProcessing ? 'sync' : 'mic'}
            size={42}
          />
          <Text style={styles.micButtonText}>
            {isProcessing || isScanning ? 'Janet is processing…' : 'Start speaking'}
          </Text>
          </Pressable>
      )}

      {shouldShowScanConfirmation ? (
        <View style={styles.confirmationCard}>
          <Text style={styles.confirmationTitle}>Review scanned details</Text>
          <Text style={styles.confirmationSubtitle}>
            Janet found details from your {getDocumentTypeLabel(pendingScanResult?.documentType ?? 'id')}. Review them before saving.
          </Text>
          <View style={styles.previewList}>
            {scanPreviewRows.map((row) => (
              <View key={`${row.label}:${row.value}`} style={styles.previewRow}>
                <View style={styles.previewRowHeader}>
                  <Text style={styles.previewLabel}>{row.label}</Text>
                  {row.confidenceLabel ? (
                    <Text
                      style={[
                        styles.previewMeta,
                        row.isLowConfidence ? styles.previewMetaWarning : null,
                      ]}
                    >
                      {row.confidenceLabel}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.previewValue}>{row.value}</Text>
                {row.isLowConfidence ? (
                  <Text style={styles.previewSupport}>
                    Review this field closely before saving.
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
          {warnings.length > 0 ? (
            <Text style={styles.confirmationHelp}>{warnings[0]}</Text>
          ) : scanPreviewRows.some((row) => row.isLowConfidence) ? (
            <Text style={styles.confirmationHelp}>
              Some scanned fields are less certain and should be reviewed before saving.
            </Text>
          ) : null}
          <Text style={styles.scanAssistHint}>
            Nothing is saved until you confirm these details.
          </Text>
          <View style={styles.inlineActions}>
            <PrimaryButton
              disabled={isProcessing || isScanning}
              onPress={() => {
                void handleConfirmScannedFields();
              }}
              style={[styles.inlineButton, styles.inlineButtonLeft]}
              title="Confirm and save"
            />
            <SecondaryButton
              disabled={isProcessing || isScanning}
              onPress={() => {
                void handleScan(pendingScanResult?.documentType ?? 'id');
              }}
              style={[styles.inlineButton, styles.inlineButtonRight]}
              title="Retake scan"
            />
          </View>
        </View>
      ) : shouldShowConfirmationActions ? (
        <View style={styles.confirmationCard}>
          <Text style={styles.confirmationTitle}>Confirm this answer</Text>
          <Text style={styles.confirmationSubtitle}>
            Janet is waiting for a quick yes or no before moving on.
          </Text>
          {confirmationTranscript ? (
            <View style={styles.confirmationTranscriptWrap}>
              <Text style={styles.confirmationTranscriptLabel}>Current answer</Text>
              <Text style={styles.confirmationTranscriptText}>
                {confirmationTranscript}
              </Text>
            </View>
          ) : null}
          {warnings.length > 0 ? (
            <Text style={styles.confirmationHelp}>
              {warnings[0]}
            </Text>
          ) : lowConfidence ? (
            <Text style={styles.confirmationHelp}>
              Janet heard something uncertain and needs a quick confirmation.
            </Text>
          ) : null}
          <View style={styles.inlineActions}>
            <PrimaryButton
              disabled={isProcessing}
              onPress={() => {
                void handleJanetTurn('yes', 1, 'normal');
              }}
              style={[styles.inlineButton, styles.inlineButtonLeft]}
              title="Yes, that's right"
            />
            <SecondaryButton
              disabled={isProcessing}
              onPress={() => {
                void handleJanetTurn('no', 1, 'correction');
              }}
              style={[styles.inlineButton, styles.inlineButtonRight]}
              title="Try again"
            />
          </View>
        </View>
      ) : null}

      {!shouldShowConfirmationActions && !embedded && !state.voice.transcriptDraft && !state.voice.handoff ? (
        <View style={styles.emptyWrap}>
          <EmptyStateCard
            icon="mic-circle-outline"
            message="Janet uses the same intake draft as typed intake, so you can switch to manual entry without losing progress."
            title="One shared intake draft"
          />
        </View>
      ) : !shouldShowConfirmationActions && state.voice.handoff ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewCardTitle}>Structured intake preview</Text>
          <Text style={styles.previewCardSubtitle}>
            Janet turns your latest answer into the same fields staff and providers will review later.
          </Text>

          <Text style={styles.heardLabel}>
            {formatJanetConfirmation(state.voice.handoff)}
          </Text>

          {previewRows.length > 0 ? (
            <View style={styles.previewList}>
              {previewRows.map(([label, value]) => (
                <View key={label} style={styles.previewRow}>
                  <Text style={styles.previewLabel}>{label}</Text>
                  <Text style={styles.previewValue}>{value}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.previewEmpty}>
              Janet will show structured intake values here after each confirmed answer.
            </Text>
          )}
        </View>
      ) : null}

      {!shouldShowConfirmationActions && warnings.length > 0 ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewCardTitle}>Clarifications</Text>
          <Text style={styles.previewCardSubtitle}>
            Janet is asking for a little extra care before moving on.
          </Text>
          {warnings.map((warning) => (
            <Text key={warning} style={styles.warningText}>
              • {warning}
            </Text>
          ))}
        </View>
      ) : null}

      {shouldShowScanConfirmation ? (
        <View style={styles.utilityRow}>
          <SecondaryButton
            disabled={isProcessing || isScanning}
            icon="create-outline"
            onPress={continueInTypedIntake}
            style={styles.skipButton}
            title={embedded ? 'Type it myself' : 'Edit manually'}
          />
        </View>
      ) : shouldShowConfirmationActions ? (
        <View style={styles.utilityRow}>
          <SecondaryButton
            disabled={!canReplay || isBootstrapping || isProcessing}
            onPress={() => {
              void playPrompt(currentSpeechText);
            }}
            style={[styles.utilityButton, styles.inlineButtonLeft]}
            title="Repeat"
          />
          <SecondaryButton
            disabled={isProcessing || isBootstrapping}
            icon="create-outline"
            onPress={continueInTypedIntake}
            style={[styles.utilityButton, styles.inlineButtonRight]}
            title={embedded ? 'Switch to typing' : 'Edit manually'}
          />
        </View>
      ) : (
        <>
          <View style={styles.utilityRow}>
            <SecondaryButton
              disabled={!canReplay || isBootstrapping || isProcessing || isScanning || showListeningState}
              onPress={() => {
                void playPrompt(currentSpeechText);
              }}
              style={[styles.utilityButton, styles.inlineButtonLeft]}
              title="Repeat"
            />
            <SecondaryButton
              disabled={isProcessing || isBootstrapping || isScanning}
              icon="create-outline"
              onPress={continueInTypedIntake}
              style={[styles.utilityButton, styles.inlineButtonRight]}
              title={embedded ? 'Switch to typing' : 'Edit manually'}
            />
          </View>

          <View style={styles.utilityRow}>
            <SecondaryButton
              disabled={isProcessing || isBootstrapping || isScanning}
              icon="text-outline"
              onPress={() => {
                void Haptics.selectionAsync();
                setVoiceSpellMode(!state.voice.spellModeEnabled);
              }}
              style={[styles.utilityButton, styles.inlineButtonLeft]}
              title={state.voice.spellModeEnabled ? 'Spell Mode On' : 'Spell Mode'}
            />
            <SecondaryButton
              disabled={isProcessing || isBootstrapping || isScanning || !session?.currentField}
              onPress={() => {
                void handleJanetTurn('skip', 1, 'normal');
              }}
              style={[styles.utilityButton, styles.inlineButtonRight]}
              title="Skip for now"
            />
          </View>

          {!embedded && (speechState === 'speaking' || speechState === 'processing') ? (
          <View style={styles.utilityRow}>
            <SecondaryButton
              disabled={speechState !== 'speaking' && speechState !== 'processing'}
              onPress={() => {
                void stopPlayback();
              }}
              style={styles.skipButton}
              title="Stop audio"
            />
          </View>
          ) : null}
        </>
      )}
    </>
  );

  if (embedded) {
    return <View style={styles.embeddedContent}>{content}</View>;
  }

  return (
    <ScreenContainer contentContainerStyle={styles.content} style={styles.screen}>
      {content}
    </ScreenContainer>
  );
}

export function VoiceScreen() {
  return <VoiceExperience />;
}

const styles = StyleSheet.create({
  answerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: '100%',
  },
  answerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  answerTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  answerTranscript: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.divider,
    borderWidth: 1,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  banner: {
    marginTop: spacing.sm,
  },
  content: {
    alignItems: 'stretch',
    paddingBottom: spacing.xxxl,
  },
  embeddedContent: {
    paddingBottom: spacing.xxxl,
  },
  embeddedHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  embeddedHeaderLabel: {
    ...typography.label,
    color: colors.primaryText,
  },
  confirmationCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  confirmationSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  confirmationTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  confirmationTranscriptLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  confirmationTranscriptText: {
    ...typography.bodyLarge,
    color: colors.primaryText,
    fontWeight: '700',
    lineHeight: 28,
  },
  confirmationTranscriptWrap: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.divider,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  confirmationHelp: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyWrap: {
    marginTop: spacing.md,
  },
  finishButton: {
    marginTop: spacing.md,
  },
  freshStartButton: {
    marginTop: spacing.md,
  },
  heardLabel: {
    ...typography.body,
    color: colors.primaryDeep,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  hero: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  heroCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  heroTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    fontSize: 24,
  },
  inlineActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  inlineButton: {
    flex: 1,
  },
  inlineButtonLeft: {
    marginRight: spacing.xs,
  },
  inlineButtonRight: {
    marginLeft: spacing.xs,
  },
  listeningCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.divider,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  listeningText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  listeningTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  meterBar: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    flex: 1,
    opacity: 0.45,
  },
  meterBar1: {
    height: 8,
  },
  meterBar2: {
    height: 12,
  },
  meterBar3: {
    height: 16,
  },
  meterBar4: {
    height: 12,
  },
  meterBar5: {
    height: 8,
  },
  meterBarActive: {
    backgroundColor: colors.primaryDeep,
    opacity: 1,
  },
  meterRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  livePill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primarySoft,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  livePillText: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  micButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: 20,
    elevation: 8,
    height: 96,
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: {
      height: 12,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: '100%',
  },
  micButtonMuted: {
    opacity: 0.7,
  },
  micButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  micButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
    width: '100%',
  },
  previewCardSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  previewCardTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  previewEmpty: {
    ...typography.body,
    color: colors.textSecondary,
  },
  previewLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  previewMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  previewMetaWarning: {
    color: colors.warning,
  },
  previewList: {
    gap: spacing.sm,
  },
  previewRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  previewRowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewSupport: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  previewValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  primaryActionButton: {
    marginTop: spacing.md,
    minHeight: 56,
  },
  progressFill: {
    backgroundColor: colors.primaryDeep,
    borderRadius: 999,
    height: 10,
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 10,
    marginTop: spacing.lg,
    overflow: 'hidden',
    width: '100%',
  },
  questionCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.divider,
    marginTop: spacing.lg,
    padding: spacing.md,
    width: '100%',
  },
  questionKicker: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  questionText: {
    ...typography.title,
    color: colors.primaryDeep,
    fontSize: 20,
    lineHeight: 28,
    marginTop: spacing.sm,
  },
  screen: {
    backgroundColor: colors.background,
  },
  scanAssistCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  scanAssistCopy: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  scanAssistHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  scanAssistHint: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  scanAssistIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.divider,
    borderRadius: 14,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  scanAssistSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scanAssistTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  scanningCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.divider,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  scanningText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scanningTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  skipButton: {
    flex: 1,
  },
  stepKicker: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stepPanel: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.divider,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    padding: spacing.sm + 2,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    width: '100%',
  },
  stepTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  topbar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  topbarActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  topbarButton: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  topbarButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  topbarLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  utilityButton: {
    flex: 1,
  },
  utilityRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  warningText: {
    ...typography.body,
    color: colors.warning,
    marginTop: spacing.sm,
  },
});
