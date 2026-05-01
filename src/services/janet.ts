import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Directory, File, Paths } from 'expo-file-system';

import { ApiError, api, fetchApiResponse, getApiBaseUrl } from './api';
import type {
  IntakeFormData,
  IntakeStepKey,
  ReturningPatientFormData,
} from './intake';
import { normalizeIntakeFormFields } from './intake';

export type JanetHandoff = {
  allergyNotes: string;
  duration: string;
  interpretedAt: string;
  medicationNotes: string;
  symptomSummary: string;
  transcript: string;
};

export type JanetVoiceDraft = {
  appliedToIntakeAt: string | null;
  handoff: JanetHandoff | null;
  isEditing: boolean;
  isListening: boolean;
  lastUpdatedAt: string | null;
  spellModeEnabled: boolean;
  transcriptDraft: string;
};

export type JanetConversationStep = 'basicInfo' | 'documents' | 'review' | 'symptoms';

export type JanetInteractionMode =
  | 'correction'
  | 'manual_fallback'
  | 'normal'
  | 'repeat'
  | 'spell';

export type JanetConfirmationState = {
  choices: string[];
  field: string | null;
  prompt: string | null;
  required: boolean;
};

export type JanetSessionState = {
  confirmation: JanetConfirmationState;
  currentField: string | null;
  currentStep: JanetConversationStep;
  draftId: string | null;
  draftPatch: Partial<IntakeFormData>;
  firstPrompt: string;
  janetMode: string;
  language: string;
  missingFields: string[];
  patientId: number | null;
  sessionId: string;
  visitId: number | null;
};

export type JanetSessionRequest = {
  currentStep?: JanetConversationStep | IntakeStepKey | null;
  draftId?: string | null;
  form: IntakeFormData;
  language?: string;
  launchMode?: 'voice';
  patientId?: number | null;
  returningPatient?: ReturningPatientFormData;
  visitId?: number | null;
};

export type JanetTranscriptionResult = {
  confidence: number | null;
  durationMs: number | null;
  needsConfirmation: boolean;
  text: string;
  warnings: string[];
};

export type JanetRespondRequest = {
  currentStep: JanetConversationStep;
  form: IntakeFormData;
  interaction?: {
    mode?: JanetInteractionMode;
    targetField?: string | null;
  };
  returningPatient?: ReturningPatientFormData;
  sessionId: string;
  transcript: string;
  transcriptConfidence?: number | null;
};

export type JanetRespondResult = {
  confirmation: JanetConfirmationState;
  extraction: {
    completion: {
      intakeComplete: boolean;
      stepComplete: boolean;
    };
    currentField: string | null;
    draftPatch: Partial<IntakeFormData>;
    extractedFields: Partial<IntakeFormData>;
    missingFields: string[];
    nextStep: JanetConversationStep;
    updatedStep: JanetConversationStep;
  };
  janet: {
    shouldSpeak: boolean;
    speakText: string;
    text: string;
  };
  lowConfidence: boolean;
  warnings: string[];
};

export type JanetHandoffSubmitPayload = {
  draftId?: string | null;
  handoff: JanetHandoff;
  patientId?: number | null;
  visitId?: number | null;
};

export type JanetHandoffSubmitResponse = {
  appliedFields: string[];
  draftId: string | null;
  message: string;
  ok: boolean;
  syncedAt: string;
  visitId: number | null;
};

export type JanetSpeechPlaybackState =
  | 'paused'
  | 'processing'
  | 'ready'
  | 'replay'
  | 'speaking';

export const janetAssistant = {
  description:
    'Guided voice intake for patient identity, symptoms, medications, allergies, and check-in support.',
  greetingText:
    "Hi, I'm Janet. I'll help you check in one step at a time and keep everything organized for your care team.",
  name: 'Janet',
  prompts: [
    'You can say your first name when you are ready.',
    'You can ask Janet to repeat the question.',
    'You can switch to typing at any time.',
  ],
  role: 'Guided Voice Check-In',
} as const;

const janetAudioDirectory = new Directory(Paths.cache, 'janet-audio');

function readRecord(value: unknown) {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' ? value : null;
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeConversationStep(
  value: unknown,
  fallback: JanetConversationStep = 'basicInfo',
): JanetConversationStep {
  const normalized = readString(value)?.trim().toLowerCase();
  const compact = normalized?.replace(/[\s_-]+/g, '');

  if (!compact) {
    return fallback;
  }

  if (compact === 'documents' || compact === 'document') {
    return 'documents';
  }

  if (compact === 'review' || compact === 'reviewconfirm' || compact === 'summary') {
    return 'review';
  }

  if (
    compact === 'symptoms' ||
    compact === 'medicalinfo' ||
    compact === 'medicalhistory' ||
    compact === 'allergies' ||
    compact === 'medications' ||
    compact === 'insurance'
  ) {
    return 'symptoms';
  }

  if (
    compact === 'basicinfo' ||
    compact === 'patienttype' ||
    compact === 'patientinformation' ||
    compact === 'newpatient'
  ) {
    return 'basicInfo';
  }

  return fallback;
}

function normalizeDraftPatch(value: unknown): Partial<IntakeFormData> {
  const record = readRecord(value) ?? {};
  const patch: Partial<IntakeFormData> = {};

  const stringKeys = [
    'patientType',
    'firstName',
    'lastName',
    'dateOfBirth',
    'gender',
    'emergencyContactName',
    'emergencyContactPhone',
    'heightFt',
    'heightIn',
    'weightLb',
    'phoneNumber',
    'email',
    'chiefConcern',
    'symptomDuration',
    'painLevel',
    'symptomNotes',
    'medications',
    'pharmacy',
    'medicalConditions',
    'allergies',
    'allergyMedicationStatus',
    'allergyReaction',
    'allergyNotes',
    'insuranceProvider',
    'memberId',
    'groupNumber',
    'subscriberName',
    'pastMedicalHistoryOtherMentalHealthCondition',
    'pastMedicalHistoryOtherSurgery',
  ] as const satisfies readonly (keyof IntakeFormData)[];

  const arrayKeys = [
    'allergyMedicationSelections',
    'allergyMaterialSelections',
    'allergyFoodSelections',
    'allergyEnvironmentalSelections',
    'immunizationCoreSelections',
    'immunizationRoutineSelections',
    'immunizationTravelSelections',
    'immunizationUnknownSelections',
    'pastMedicalHistoryChronicConditions',
    'pastMedicalHistorySurgicalHistory',
    'pastMedicalHistoryOtherRelevantHistory',
  ] as const satisfies readonly (keyof IntakeFormData)[];

  const booleanKeys = [
    'medicalInfoHydrated',
    'pastMedicalHistoryHydrated',
  ] as const satisfies readonly (keyof IntakeFormData)[];

  for (const key of stringKeys) {
    const rawValue = record[key];
    if (typeof rawValue === 'string') {
      patch[key] = rawValue;
    }
  }

  for (const key of arrayKeys) {
    const rawValue = record[key];
    if (Array.isArray(rawValue)) {
      patch[key] = rawValue.filter(
        (entry): entry is string =>
          typeof entry === 'string' && entry.trim().length > 0,
      ) as IntakeFormData[typeof key];
    }
  }

  for (const key of booleanKeys) {
    const rawValue = record[key];
    if (typeof rawValue === 'boolean') {
      patch[key] = rawValue as IntakeFormData[typeof key];
    }
  }

  return normalizeIntakeFormFields(patch);
}

function normalizeConfirmation(value: unknown): JanetConfirmationState {
  const record = readRecord(value) ?? {};
  const choicesValue = Array.isArray(record.choices) ? record.choices : [];

  return {
    choices: choicesValue.filter(
      (entry): entry is string =>
        typeof entry === 'string' && entry.trim().length > 0,
    ),
    field: readString(record.field),
    prompt: readString(record.prompt),
    required: readBoolean(record.required, false),
  };
}

function buildSpeechErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.message.trim().length > 0) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Janet voice playback is unavailable right now.';
}

function buildFileName(prefix: string, extension: string) {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
}

function inferAudioMimeType(uri: string, mimeType?: string | null) {
  if (mimeType?.trim()) {
    return mimeType;
  }

  const normalizedUri = uri.toLowerCase();
  if (normalizedUri.endsWith('.m4a') || normalizedUri.endsWith('.mp4')) {
    return 'audio/mp4';
  }
  if (normalizedUri.endsWith('.caf')) {
    return 'audio/x-caf';
  }
  if (normalizedUri.endsWith('.wav')) {
    return 'audio/wav';
  }
  if (normalizedUri.endsWith('.ogg')) {
    return 'audio/ogg';
  }

  return 'audio/webm';
}

function inferAudioFileName(uri: string, mimeType?: string | null) {
  const baseName = uri.split('/').pop()?.trim();
  if (baseName) {
    return baseName;
  }

  const normalizedType = inferAudioMimeType(uri, mimeType);
  if (normalizedType === 'audio/mp4') {
    return buildFileName('janet-capture', 'm4a');
  }
  if (normalizedType === 'audio/wav') {
    return buildFileName('janet-capture', 'wav');
  }
  if (normalizedType === 'audio/ogg') {
    return buildFileName('janet-capture', 'ogg');
  }

  return buildFileName('janet-capture', 'webm');
}

export function inferJanetConversationStep(
  step?: IntakeStepKey | JanetConversationStep | null,
): JanetConversationStep {
  if (step === 'documents' || step === 'review' || step === 'symptoms') {
    return step;
  }

  return 'basicInfo';
}

export function createEmptyJanetHandoff(): JanetHandoff {
  return {
    allergyNotes: '',
    duration: '',
    interpretedAt: '',
    medicationNotes: '',
    symptomSummary: '',
    transcript: '',
  };
}

export function createInitialJanetVoiceDraft(): JanetVoiceDraft {
  return {
    appliedToIntakeAt: null,
    handoff: null,
    isEditing: false,
    isListening: false,
    lastUpdatedAt: null,
    spellModeEnabled: false,
    transcriptDraft: '',
  };
}

export function formatJanetConfirmation(handoff: JanetHandoff | null) {
  if (!handoff?.symptomSummary || !handoff.duration) {
    return 'Awaiting confirmed summary';
  }

  return `${handoff.symptomSummary.toLowerCase()} for ${handoff.duration}`;
}

export function buildJanetSpeechText(options: {
  confirmation: JanetConfirmationState;
  handoff: JanetHandoff | null;
  replyText: string;
  spellModeEnabled: boolean;
}) {
  const { confirmation, handoff, replyText, spellModeEnabled } = options;

  if (confirmation.required && confirmation.prompt) {
    return confirmation.prompt;
  }

  if (replyText.trim().length > 0) {
    return replyText;
  }

  if (handoff?.symptomSummary) {
    return `I heard ${formatJanetConfirmation(
      handoff,
    )}. You can keep speaking, or switch to typing if you prefer.`;
  }

  if (spellModeEnabled) {
    return 'Spell mode is on. Speak slowly and Janet will capture one detail at a time.';
  }

  return janetAssistant.greetingText;
}

export function buildJanetHandoffFromDraft(options: {
  existing?: JanetHandoff | null;
  form: Partial<IntakeFormData>;
  interpretedAt?: string;
  transcript: string;
}) {
  const { existing, form, interpretedAt, transcript } = options;

  return {
    ...(existing ?? createEmptyJanetHandoff()),
    allergyNotes:
      form.allergyNotes ??
      form.allergyReaction ??
      existing?.allergyNotes ??
      '',
    duration: form.symptomDuration ?? existing?.duration ?? '',
    interpretedAt: interpretedAt ?? new Date().toISOString(),
    medicationNotes:
      form.medications ??
      existing?.medicationNotes ??
      '',
    symptomSummary:
      form.chiefConcern ??
      existing?.symptomSummary ??
      '',
    transcript: transcript.trim() || existing?.transcript || '',
  } satisfies JanetHandoff;
}

export async function configureJanetRecordingAudioMode() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playThroughEarpieceAndroid: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });
}

export async function configureJanetPlaybackAudioMode() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playThroughEarpieceAndroid: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });
}

export async function bootstrapJanetSession(
  payload: JanetSessionRequest,
): Promise<JanetSessionState> {
  const response = await api.post<unknown>('/janet/intake-session', {
    current_step: inferJanetConversationStep(payload.currentStep),
    draft_id: payload.draftId ?? null,
    form: payload.form,
    language: payload.language ?? 'en',
    launch_mode: payload.launchMode ?? 'voice',
    patient_id: payload.patientId ?? null,
    returning_patient: payload.returningPatient ?? null,
    visit_id: payload.visitId ?? null,
  });
  const record = readRecord(response) ?? {};
  const sessionRecord = readRecord(record.session) ?? {};

  return {
    confirmation: normalizeConfirmation(sessionRecord.confirmation),
    currentField: readString(sessionRecord.current_field ?? sessionRecord.currentField),
    currentStep: normalizeConversationStep(
      sessionRecord.current_step ?? sessionRecord.currentStep,
      inferJanetConversationStep(payload.currentStep),
    ),
    draftId: readString(sessionRecord.draft_id ?? sessionRecord.draftId),
    draftPatch: normalizeDraftPatch(
      sessionRecord.draft_patch ?? sessionRecord.draftPatch,
    ),
    firstPrompt:
      readString(sessionRecord.first_prompt ?? sessionRecord.firstPrompt) ??
      janetAssistant.greetingText,
    janetMode:
      readString(sessionRecord.janet_mode ?? sessionRecord.janetMode) ??
      'guided_intake',
    language: readString(sessionRecord.language) ?? 'en',
    missingFields: Array.isArray(sessionRecord.missing_fields)
      ? sessionRecord.missing_fields.filter(
          (entry): entry is string =>
            typeof entry === 'string' && entry.trim().length > 0,
        )
      : [],
    patientId: readNumber(sessionRecord.patient_id ?? sessionRecord.patientId),
    sessionId:
      readString(sessionRecord.session_id ?? sessionRecord.sessionId) ?? '',
    visitId: readNumber(sessionRecord.visit_id ?? sessionRecord.visitId),
  } satisfies JanetSessionState;
}

export async function transcribeJanetAudio(options: {
  currentStep: JanetConversationStep;
  fileName?: string | null;
  language?: string;
  mimeType?: string | null;
  sessionId: string;
  uri: string;
}) {
  const formData = new FormData();
  const mimeType = inferAudioMimeType(options.uri, options.mimeType);
  const fileName = options.fileName?.trim()
    ? options.fileName.trim()
    : inferAudioFileName(options.uri, mimeType);

  formData.append('session_id', options.sessionId);
  formData.append('current_step', options.currentStep);
  formData.append('language', options.language ?? 'en');
  formData.append(
    'audio',
    {
      name: fileName,
      type: mimeType,
      uri: options.uri,
    } as never,
  );

  const response = await api.post<unknown>('/janet/transcribe', formData, {
    timeoutMs: 45000,
  });
  const record = readRecord(response) ?? {};
  const transcriptRecord = readRecord(record.transcript) ?? {};
  const warningsValue = Array.isArray(transcriptRecord.warnings)
    ? transcriptRecord.warnings
    : [];

  return {
    confidence:
      readNumber(transcriptRecord.confidence) ??
      readNumber(record.confidence) ??
      null,
    durationMs:
      readNumber(transcriptRecord.duration_ms ?? transcriptRecord.durationMs) ??
      null,
    needsConfirmation: readBoolean(
      transcriptRecord.needs_confirmation ?? transcriptRecord.needsConfirmation,
      false,
    ),
    text:
      readString(transcriptRecord.text) ?? readString(record.text) ?? '',
    warnings: warningsValue.filter(
      (entry): entry is string =>
        typeof entry === 'string' && entry.trim().length > 0,
    ),
  } satisfies JanetTranscriptionResult;
}

export async function requestJanetResponse(
  payload: JanetRespondRequest,
): Promise<JanetRespondResult> {
  const response = await api.post<unknown>('/janet/respond', {
    current_step: payload.currentStep,
    form: payload.form,
    interaction: {
      mode: payload.interaction?.mode ?? 'normal',
      target_field: payload.interaction?.targetField ?? null,
    },
    returning_patient: payload.returningPatient ?? null,
    session_id: payload.sessionId,
    transcript: payload.transcript,
    transcript_confidence: payload.transcriptConfidence ?? null,
  });
  const record = readRecord(response) ?? {};
  const janetRecord = readRecord(record.janet) ?? {};
  const extractionRecord = readRecord(record.extraction) ?? {};
  const completionRecord = readRecord(extractionRecord.completion) ?? {};
  const warningsValue = Array.isArray(record.warnings) ? record.warnings : [];

  return {
    confirmation: normalizeConfirmation(record.confirmation),
    extraction: {
      completion: {
        intakeComplete: readBoolean(
          completionRecord.intake_complete ?? completionRecord.intakeComplete,
          false,
        ),
        stepComplete: readBoolean(
          completionRecord.step_complete ?? completionRecord.stepComplete,
          false,
        ),
      },
      currentField: readString(
        extractionRecord.current_field ?? extractionRecord.currentField,
      ),
      draftPatch: normalizeDraftPatch(
        extractionRecord.draft_patch ?? extractionRecord.draftPatch,
      ),
      extractedFields: normalizeDraftPatch(
        extractionRecord.extracted_fields ?? extractionRecord.extractedFields,
      ),
      missingFields: Array.isArray(extractionRecord.missing_fields)
        ? extractionRecord.missing_fields.filter(
            (entry): entry is string =>
              typeof entry === 'string' && entry.trim().length > 0,
          )
        : [],
      nextStep: normalizeConversationStep(
        extractionRecord.next_step ?? extractionRecord.nextStep,
        payload.currentStep,
      ),
      updatedStep: normalizeConversationStep(
        extractionRecord.updated_step ?? extractionRecord.updatedStep,
        payload.currentStep,
      ),
    },
    janet: {
      shouldSpeak: readBoolean(
        janetRecord.should_speak ?? janetRecord.shouldSpeak,
        true,
      ),
      speakText:
        readString(janetRecord.speak_text ?? janetRecord.speakText) ??
        readString(janetRecord.text) ??
        janetAssistant.greetingText,
      text:
        readString(janetRecord.text) ?? janetAssistant.greetingText,
    },
    lowConfidence: readBoolean(
      record.low_confidence ?? record.lowConfidence,
      false,
    ),
    warnings: warningsValue.filter(
      (entry): entry is string =>
        typeof entry === 'string' && entry.trim().length > 0,
    ),
  } satisfies JanetRespondResult;
}

async function fetchJanetSpeechAudioFile(options: {
  cacheSafe?: boolean;
  language?: string;
  sessionId?: string | null;
  text: string;
}) {
  if (!janetAudioDirectory.exists) {
    janetAudioDirectory.create({ idempotent: true, intermediates: true });
  }

  const requestUrl = `${getApiBaseUrl()}/janet/speak`;
  const { response } = await fetchApiResponse(requestUrl, {
    body: JSON.stringify({
      cache_safe: Boolean(options.cacheSafe),
      language: options.language ?? 'en',
      session_id: options.sessionId ?? null,
      text: options.text,
    }),
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    let errorMessage = 'Janet voice playback is unavailable right now.';

    try {
      const payload = (await response.json()) as {
        fallback?: string;
        message?: string;
      };
      if (typeof payload.message === 'string' && payload.message.trim()) {
        errorMessage = payload.message;
      }
    } catch {
      // Keep the fallback error message if the response is not JSON.
    }

    throw new Error(errorMessage);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const audioFile = new File(janetAudioDirectory, buildFileName('janet-reply', 'mp3'));
  if (!audioFile.exists) {
    audioFile.create({ intermediates: true, overwrite: true });
  }
  audioFile.write(bytes);
  return audioFile.uri;
}

export async function playJanetReplyAudio(options: {
  cacheSafe?: boolean;
  fallbackToDeviceSpeech?: boolean;
  language?: string;
  onComplete?: () => void;
  onStart?: () => void;
  sessionId?: string | null;
  text: string;
}) {
  try {
    await configureJanetPlaybackAudioMode();
    const audioUri = await fetchJanetSpeechAudioFile(options);
    const sound = new Audio.Sound();
    await sound.loadAsync({ uri: audioUri }, { shouldPlay: true });

    options.onStart?.();

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        return;
      }

      if (status.didJustFinish) {
        options.onComplete?.();
      }
    });

    return sound;
  } catch (error) {
    if (!options.fallbackToDeviceSpeech) {
      throw error;
    }

    const message = buildSpeechErrorMessage(error);

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      Speech.stop();
      Speech.speak(options.text, {
        language: options.language === 'es' ? 'es-US' : 'en-US',
        pitch: 1.02,
        rate: 0.92,
        onDone: () => {
          if (settled) {
            return;
          }
          settled = true;
          options.onComplete?.();
          resolve();
        },
        onError: () => {
          if (settled) {
            return;
          }
          settled = true;
          reject(new Error(message));
        },
        onStart: () => {
          options.onStart?.();
        },
      });
    });

    return null;
  }
}

export async function stopJanetReplyAudio(sound: Audio.Sound | null) {
  if (!sound) {
    await Speech.stop();
    return;
  }

  try {
    await sound.stopAsync();
  } finally {
    await sound.unloadAsync();
  }
}

export async function submitJanetHandoff(
  payload: JanetHandoffSubmitPayload,
) {
  const response = await api.post<unknown>('/janet/handoff', {
    draft_id: payload.draftId ?? null,
    handoff: payload.handoff,
    patient_id: payload.patientId ?? null,
    visit_id: payload.visitId ?? null,
  });
  const record = readRecord(response) ?? {};
  const appliedFieldsValue = Array.isArray(record.applied_fields)
    ? record.applied_fields
    : Array.isArray(record.appliedFields)
      ? record.appliedFields
      : [];

  return {
    appliedFields: appliedFieldsValue.filter(
      (field): field is string => typeof field === 'string',
    ),
    draftId: readString(record.draft_id) ?? readString(record.draftId),
    message:
      readString(record.message) ??
      'Janet handoff was synced to the backend draft.',
    ok: record.ok !== false,
    syncedAt:
      readString(record.synced_at) ??
      readString(record.syncedAt) ??
      new Date().toISOString(),
    visitId: readNumber(record.visit_id) ?? readNumber(record.visitId),
  } satisfies JanetHandoffSubmitResponse;
}
