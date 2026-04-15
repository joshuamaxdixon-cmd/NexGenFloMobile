import * as Speech from 'expo-speech';

import { api } from './api';

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
  | 'ready'
  | 'replay'
  | 'speaking';

export type JanetSpeechProviderMode = 'device_tts' | 'premium_voice';

export type JanetSpeechRequest = {
  onComplete?: () => void;
  onError?: (message: string) => void;
  onPause?: () => void;
  onStart?: () => void;
  text: string;
};

export type JanetSpeechProvider = {
  id: string;
  isAvailable: () => Promise<boolean>;
  label: string;
  mode: JanetSpeechProviderMode;
  speak: (request: JanetSpeechRequest) => Promise<void>;
  stop: () => Promise<void>;
};

export const janetAssistant = {
  name: 'Janet',
  role: 'Voice Intake Concierge',
  description:
    'Voice intake assistant for symptoms, patient context, and conversational onboarding.',
  greetingText:
    "Hi, I'm Janet. Tell me what brings you in today, and I will guide the intake for your care team.",
  transcriptPreview:
    'Patient reports chest pain that started two days ago and feels worse when climbing stairs.',
  confirmationText: 'chest pain for 2 days',
  simulatedInterpretation: {
    symptomSummary: 'Chest pain',
    duration: '2 days',
    medicationNotes: 'Uses albuterol as needed and took ibuprofen this morning.',
    allergyNotes: 'No known drug allergies reported during voice intake.',
  },
  prompts: [
    'I am a returning patient',
    'I need help with my insurance card',
    'I want to start a new intake',
  ],
} as const;

let activeJanetSpeechProvider: JanetSpeechProvider;

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

export function buildSimulatedJanetHandoff(spellModeEnabled: boolean) {
  return {
    allergyNotes: janetAssistant.simulatedInterpretation.allergyNotes,
    duration: janetAssistant.simulatedInterpretation.duration,
    interpretedAt: new Date().toISOString(),
    medicationNotes: janetAssistant.simulatedInterpretation.medicationNotes,
    symptomSummary: janetAssistant.simulatedInterpretation.symptomSummary,
    transcript: spellModeEnabled
      ? 'C-H-E-S-T pain for two days. Uses albuterol as needed. No known drug allergies.'
      : janetAssistant.transcriptPreview,
  } satisfies JanetHandoff;
}

export function formatJanetConfirmation(handoff: JanetHandoff | null) {
  if (!handoff?.symptomSummary || !handoff.duration) {
    return 'Awaiting confirmed summary';
  }

  return `${handoff.symptomSummary.toLowerCase()} for ${handoff.duration}`;
}

function buildSpeechErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Janet voice playback is unavailable on this device right now.';
}

const deviceJanetSpeechProvider: JanetSpeechProvider = {
  id: 'janet-device-tts',
  isAvailable: async () => true,
  label: 'Device TTS',
  mode: 'device_tts',
  speak: async ({
    onComplete,
    onError,
    onPause,
    onStart,
    text,
  }: JanetSpeechRequest) =>
    new Promise<void>((resolve, reject) => {
      let settled = false;

      const finish = (callback?: () => void) => {
        if (settled) {
          return;
        }

        settled = true;
        callback?.();
        resolve();
      };

      const fail = (message: string) => {
        if (settled) {
          return;
        }

        settled = true;
        onError?.(message);
        reject(new Error(message));
      };

      void Speech.stop();
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.02,
        rate: 0.92,
        onDone: () => finish(onComplete),
        onError: (error) => fail(buildSpeechErrorMessage(error)),
        onStart: () => {
          onStart?.();
        },
        onStopped: () => finish(onPause),
      });
    }),
  stop: async () => {
    await Speech.stop();
  },
};

activeJanetSpeechProvider = deviceJanetSpeechProvider;

export function getJanetSpeechProvider() {
  return activeJanetSpeechProvider;
}

// Future premium Janet voices can swap in here without changing the Voice screen.
export function setJanetSpeechProvider(provider: JanetSpeechProvider) {
  activeJanetSpeechProvider = provider;
}

export function buildJanetSpeechText(options: {
  handoff: JanetHandoff | null;
  spellModeEnabled: boolean;
}) {
  const { handoff, spellModeEnabled } = options;

  if (handoff?.symptomSummary) {
    return `I heard ${formatJanetConfirmation(
      handoff,
    )}. When you are ready, I can send this into intake, or you can edit the details first.`;
  }

  if (spellModeEnabled) {
    return 'Spell mode is on. Speak slowly, and I will capture one detail at a time for the intake record.';
  }

  return janetAssistant.greetingText;
}

export async function speakWithJanet(
  request: JanetSpeechRequest,
  provider = getJanetSpeechProvider(),
) {
  const isAvailable = await provider.isAvailable();

  if (!isAvailable) {
    throw new Error('Janet voice playback is not available on this device.');
  }

  return provider.speak(request);
}

export async function stopJanetSpeech(provider = getJanetSpeechProvider()) {
  await provider.stop();
}

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

export async function submitJanetHandoff(
  payload: JanetHandoffSubmitPayload,
) {
  const response = await api.post<unknown>('/api/janet/handoff', {
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
