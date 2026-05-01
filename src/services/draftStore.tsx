import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { Directory, File, Paths } from 'expo-file-system';

import {
  ApiError,
  checkApiHealth,
  clearLastApiExchange,
  getApiFieldErrors,
  getApiDebugInfo,
  type ApiFieldErrors,
  type ApiConfigSource,
} from './api';
import {
  fetchIntakeDraft,
  saveIntakeDraft,
  submitIntake,
  updateIntakeDraft,
  createInitialIntakeForm,
  createInitialReturningPatientForm,
  intakeFlowSteps,
  normalizeIntakeFormFields,
  reconcileStructuredIntakeForm,
  normalizeReturningPatientFields,
  type IntakeDraftRecord,
  type IntakeFormData,
  type IntakeStepKey,
  type ReturningPatientFormData,
} from './intake';
import {
  createEmptyJanetHandoff,
  createInitialJanetVoiceDraft,
  submitJanetHandoff,
  type JanetHandoff,
  type JanetVoiceDraft,
} from './janet';
import {
  buildLookupPrefill,
  lookupReturningPatient,
  type PatientLookupResponse,
  type PatientLookupResumeContext,
  type PatientLookupSummary,
  type ReturningPatientMemoryContext,
} from './patients';
import { logDevQaEvent, type DevQaAction } from './devQa';
import {
  uploadDocumentToApi,
  type UploadDocumentAsset,
  type UploadDocumentType,
} from './uploads';
import {
  clearDraftSession,
  isDraftExpired,
  loadDraftSession,
  saveDraftSession,
} from './draftSession';

export type DraftSource =
  | 'home'
  | 'manual'
  | 'preview'
  | 'resume'
  | 'returning'
  | 'voice';

export type DraftScope = 'all' | 'intake' | 'returning' | 'uploads' | 'voice';

export type BackendConnectivityState = {
  apiBaseUrl: string;
  baseUrl: string;
  checkedAt: string | null;
  configSource: ApiConfigSource;
  envBaseUrl: string | null;
  errorMessage: string | null;
  healthUrl: string;
  legacyEnvBaseUrl: string | null;
  message: string | null;
  rawStatus: string | null;
  requestId: string | null;
  serverVersion: string | null;
  status: 'checking' | 'error' | 'idle' | 'ready';
};

export type BackendDraftState = {
  draftId: string | null;
  fieldErrors: ApiFieldErrors | null;
  lastFetchedAt: string | null;
  lastSyncedAt: string | null;
  message: string | null;
  patientId: number | null;
  status: 'error' | 'local-only' | 'synced' | 'syncing';
  visitId: number | null;
};

export type BackendLookupState = {
  fieldErrors: ApiFieldErrors | null;
  lastCheckedAt: string | null;
  memoryContext: ReturningPatientMemoryContext | null;
  message: string | null;
  patient: PatientLookupSummary | null;
  resumeContext: PatientLookupResumeContext | null;
  status: 'ambiguous' | 'error' | 'idle' | 'loading' | 'matched' | 'not_found';
};

export type BackendSubmitState = {
  confirmationCode: string | null;
  fieldErrors: ApiFieldErrors | null;
  message: string | null;
  status: 'error' | 'idle' | 'submitted' | 'submitting';
  submittedAt: string | null;
};

export type BackendJanetState = {
  appliedFields: string[];
  lastSyncedAt: string | null;
  message: string | null;
  status: 'error' | 'idle' | 'sending' | 'sent';
};

export type BackendUploadEntryState = {
  lastUploadedAt: string | null;
  message: string | null;
  previewUrl: string | null;
  status: 'error' | 'idle' | 'uploaded' | 'uploading';
  uploadId: string | null;
};

export type BackendQaState = {
  lastAction: DevQaAction | null;
  lastError: string | null;
  lastResult: string | null;
  lastUpdatedAt: string | null;
};

export type BackendState = {
  connectivity: BackendConnectivityState;
  draft: BackendDraftState;
  janet: BackendJanetState;
  lookup: BackendLookupState;
  qa: BackendQaState;
  submit: BackendSubmitState;
  uploads: {
    id: BackendUploadEntryState;
    insurance: BackendUploadEntryState;
  };
};

type IntakeDraftSlice = {
  currentStep: IntakeStepKey;
  form: IntakeFormData;
  lastUpdatedAt: string | null;
  source: DraftSource;
  voiceImportedAt: string | null;
};

type ReturningPatientDraftSlice = {
  form: ReturningPatientFormData;
  lastUpdatedAt: string | null;
};

type UploadDraftSlice = {
  id: UploadDocumentAsset | null;
  insurance: UploadDocumentAsset | null;
  lastUpdatedAt: string | null;
};

export type JanetModeState = {
  active: boolean;
  currentStep: IntakeStepKey;
  language: 'en' | 'es';
  noisyRoomEnabled: boolean;
  returnStep: IntakeStepKey | null;
};

export type DraftStoreState = {
  activeFlowMode: 'intake' | 'returning';
  backend: BackendState;
  hydrated: boolean;
  intake: IntakeDraftSlice;
  janetMode: JanetModeState;
  resumeCandidate: null | {
    description: string;
    draftId: string;
    updatedAt: string;
  };
  returningPatient: ReturningPatientDraftSlice;
  uploads: UploadDraftSlice;
  voice: JanetVoiceDraft;
};

type PersistedDraftStoreState = Omit<DraftStoreState, 'hydrated' | 'resumeCandidate'>;

type DraftStoreAction =
  | {
      type: 'apply_lookup_success';
      payload: PatientLookupResponse;
    }
  | {
      type: 'apply_remote_draft';
      payload: IntakeDraftRecord;
    }
  | {
      type: 'apply_voice_to_intake';
    }
  | {
      type: 'clear_draft';
      payload?: DraftScope;
    }
  | {
      type: 'clear_backend_debug_state';
    }
  | {
      type: 'clear_backend_stale_feedback';
      payload?: {
        resetQa?: boolean;
      };
    }
  | {
      type: 'continue_returning_patient';
    }
  | {
      type: 'hydrate';
      payload: {
        persisted: PersistedDraftStoreState | null;
        resumeCandidate?: DraftStoreState['resumeCandidate'];
      };
    }
  | {
      type: 'open_returning_flow';
      payload?: {
        reset?: boolean;
      };
    }
  | {
      type: 'set_active_flow_mode';
      payload: 'intake' | 'returning';
    }
  | {
      type: 'set_backend_connectivity';
      payload: Partial<BackendConnectivityState>;
    }
  | {
      type: 'set_backend_draft';
      payload: Partial<BackendDraftState>;
    }
  | {
      type: 'set_backend_janet';
      payload: Partial<BackendJanetState>;
    }
  | {
      type: 'set_backend_qa';
      payload: Partial<BackendQaState>;
    }
  | {
      type: 'set_backend_lookup';
      payload: Partial<BackendLookupState>;
    }
  | {
      type: 'set_backend_submit';
      payload: Partial<BackendSubmitState>;
    }
  | {
      type: 'set_backend_upload';
      payload: {
        documentType: UploadDocumentType;
        value: Partial<BackendUploadEntryState>;
      };
    }
  | {
      type: 'set_resume_candidate';
      payload: DraftStoreState['resumeCandidate'];
    }
  | {
      type: 'set_intake_step';
      payload: IntakeStepKey;
    }
  | {
      type: 'open_janet_mode';
      payload?: {
        step?: IntakeStepKey;
      };
    }
  | {
      type: 'close_janet_mode';
    }
  | {
      type: 'set_janet_mode_step';
      payload: IntakeStepKey;
    }
  | {
      type: 'set_janet_language';
      payload: 'en' | 'es';
    }
  | {
      type: 'set_janet_noisy_room';
      payload: boolean;
    }
  | {
      type: 'set_upload_asset';
      payload: {
        asset: UploadDocumentAsset | null;
        documentType: UploadDocumentType;
      };
    }
  | {
      type: 'set_voice_editing';
      payload: boolean;
    }
  | {
      type: 'set_voice_handoff';
      payload: JanetHandoff | null;
    }
  | {
      type: 'set_voice_listening';
      payload: boolean;
    }
  | {
      type: 'set_voice_spell_mode';
      payload: boolean;
    }
  | {
      type: 'set_voice_transcript';
      payload: string;
    }
  | {
      type: 'resume_saved_draft';
      payload: PersistedDraftStoreState;
    }
  | {
      type: 'start_new_intake';
      payload?: {
        prefill?: Partial<IntakeFormData>;
        source?: DraftSource;
        step?: IntakeStepKey;
      };
    }
  | {
      type: 'update_intake_form';
      payload: Partial<IntakeFormData>;
    }
  | {
      type: 'update_returning_patient';
      payload: Partial<ReturningPatientFormData>;
    }
  | {
      type: 'update_voice_handoff';
      payload: Partial<JanetHandoff>;
    };

type DraftStoreContextValue = {
  applyVoiceToIntake: () => void;
  checkBackendHealth: () => Promise<boolean>;
  clearBackendDebugState: () => void;
  clearDraft: (scope?: DraftScope) => void;
  continueReturningPatient: () => void;
  closeJanetMode: () => void;
  fetchRemoteDraft: (draftId?: string | null) => Promise<boolean>;
  lookupReturningPatient: () => Promise<boolean>;
  openJanetMode: (options?: { step?: IntakeStepKey }) => void;
  openReturningFlow: (reset?: boolean) => void;
  resumeSavedDraft: () => void;
  setJanetLanguage: (language: 'en' | 'es') => void;
  setJanetModeStep: (step: IntakeStepKey) => void;
  setJanetNoisyRoom: (enabled: boolean) => void;
  setIntakeStep: (step: IntakeStepKey) => void;
  setUploadAsset: (
    documentType: UploadDocumentType,
    asset: UploadDocumentAsset | null,
  ) => void;
  setVoiceEditing: (isEditing: boolean) => void;
  setVoiceHandoff: (handoff: JanetHandoff | null) => void;
  setVoiceListening: (isListening: boolean) => void;
  setVoiceSpellMode: (spellModeEnabled: boolean) => void;
  setVoiceTranscript: (transcript: string) => void;
  startNewIntake: (options?: {
    prefill?: Partial<IntakeFormData>;
    source?: DraftSource;
    step?: IntakeStepKey;
  }) => void;
  state: DraftStoreState;
  submitCurrentIntake: () => Promise<boolean>;
  syncCurrentDraft: (options?: { formOverride?: IntakeFormData }) => Promise<boolean>;
  syncSelectedUpload: (documentType: UploadDocumentType) => Promise<boolean>;
  syncVoiceHandoff: () => Promise<boolean>;
  updateIntakeField: <K extends keyof IntakeFormData>(
    field: K,
    value: IntakeFormData[K],
  ) => void;
  updateIntakeFields: (values: Partial<IntakeFormData>) => void;
  updateReturningPatientField: (
    field: keyof ReturningPatientFormData,
    value: string,
  ) => void;
  updateVoiceHandoff: (values: Partial<JanetHandoff>) => void;
};

const DraftStoreContext = createContext<DraftStoreContextValue | null>(null);

const draftDirectory = new Directory(Paths.document, 'nexgen-flo');
const draftFile = new File(draftDirectory, 'draft-store.json');

function nowIso() {
  return new Date().toISOString();
}

function hasText(value: string) {
  return value.trim().length > 0;
}

function hasIntakeFieldValue(value: IntakeFormData[keyof IntakeFormData]) {
  if (typeof value === 'string') {
    return hasText(value);
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value === true;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.message.trim().length > 0) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function getUploadFailureMessage(
  documentType: UploadDocumentType,
  error: unknown,
) {
  if (error instanceof ApiError && error.status === 413) {
    return `That ${documentType === 'insurance' ? 'insurance card' : 'photo ID'} image is too large to upload. Take a closer photo or crop it tighter, then try again.`;
  }

  return getErrorMessage(error, 'That document could not be uploaded right now.');
}

function isDraftMissingError(error: unknown) {
  return error instanceof ApiError && error.status === 404;
}

function isDraftConflictError(error: unknown) {
  return error instanceof ApiError && error.status === 409;
}

function getConnectivityDebugState() {
  const apiDebug = getApiDebugInfo();

  return {
    apiBaseUrl: apiDebug.resolvedApiBaseUrl,
    baseUrl: apiDebug.resolvedBaseUrl,
    configSource: apiDebug.configSource,
    envBaseUrl: apiDebug.envApiBaseUrl,
    healthUrl: apiDebug.healthUrl,
    legacyEnvBaseUrl: apiDebug.legacyEnvApiBaseUrl,
  } satisfies Pick<
    BackendConnectivityState,
    | 'apiBaseUrl'
    | 'baseUrl'
    | 'configSource'
    | 'envBaseUrl'
    | 'healthUrl'
    | 'legacyEnvBaseUrl'
  >;
}

function createInitialUploadEntryState(): BackendUploadEntryState {
  return {
    lastUploadedAt: null,
    message: null,
    previewUrl: null,
    status: 'idle',
    uploadId: null,
  };
}

function createInitialBackendState(): BackendState {
  return {
    connectivity: {
      ...getConnectivityDebugState(),
      checkedAt: null,
      errorMessage: null,
      message: null,
      rawStatus: null,
      requestId: null,
      serverVersion: null,
      status: 'idle',
    },
    draft: {
      draftId: null,
      fieldErrors: null,
      lastFetchedAt: null,
      lastSyncedAt: null,
      message: null,
      patientId: null,
      status: 'local-only',
      visitId: null,
    },
    janet: {
      appliedFields: [],
      lastSyncedAt: null,
      message: null,
      status: 'idle',
    },
    lookup: {
      fieldErrors: null,
      lastCheckedAt: null,
      memoryContext: null,
      message: null,
      patient: null,
      resumeContext: null,
      status: 'idle',
    },
    qa: {
      lastAction: null,
      lastError: null,
      lastResult: null,
      lastUpdatedAt: null,
    },
    submit: {
      confirmationCode: null,
      fieldErrors: null,
      message: null,
      status: 'idle',
      submittedAt: null,
    },
    uploads: {
      id: createInitialUploadEntryState(),
      insurance: createInitialUploadEntryState(),
    },
  };
}

function createInitialPersistedState(): PersistedDraftStoreState {
  return {
    activeFlowMode: 'intake',
    backend: createInitialBackendState(),
    intake: {
      currentStep: 'basicInfo',
      form: createInitialIntakeForm(),
      lastUpdatedAt: null,
      source: 'home',
      voiceImportedAt: null,
    },
    returningPatient: {
      form: createInitialReturningPatientForm(),
      lastUpdatedAt: null,
    },
    janetMode: {
      active: false,
      currentStep: 'basicInfo',
      language: 'en',
      noisyRoomEnabled: false,
      returnStep: null,
    },
    uploads: {
      id: null,
      insurance: null,
      lastUpdatedAt: null,
    },
    voice: createInitialJanetVoiceDraft(),
  };
}

function createFreshPatientIntakeForm(
  prefill?: Partial<IntakeFormData>,
): IntakeFormData {
  const initial = createInitialIntakeForm();

  return {
    ...initial,
    ...prefill,
    allergies: prefill?.allergies ?? initial.allergies,
    allergyEnvironmentalSelections:
      prefill?.allergyEnvironmentalSelections ?? initial.allergyEnvironmentalSelections,
    allergyFoodSelections:
      prefill?.allergyFoodSelections ?? initial.allergyFoodSelections,
    allergyMaterialSelections:
      prefill?.allergyMaterialSelections ?? initial.allergyMaterialSelections,
    allergyMedicationSelections:
      prefill?.allergyMedicationSelections ?? initial.allergyMedicationSelections,
    allergyNotes: prefill?.allergyNotes ?? initial.allergyNotes,
    allergyReaction: prefill?.allergyReaction ?? initial.allergyReaction,
    chiefConcern: prefill?.chiefConcern ?? initial.chiefConcern,
    immunizations: prefill?.immunizations ?? initial.immunizations,
    immunizationCoreSelections:
      prefill?.immunizationCoreSelections ?? initial.immunizationCoreSelections,
    immunizationRoutineSelections:
      prefill?.immunizationRoutineSelections ?? initial.immunizationRoutineSelections,
    immunizationTravelSelections:
      prefill?.immunizationTravelSelections ?? initial.immunizationTravelSelections,
    immunizationUnknownSelections:
      prefill?.immunizationUnknownSelections ?? initial.immunizationUnknownSelections,
    medicalConditions: prefill?.medicalConditions ?? initial.medicalConditions,
    medicalInfoHydrated: prefill?.medicalInfoHydrated ?? initial.medicalInfoHydrated,
    medications: prefill?.medications ?? initial.medications,
    painLevel: prefill?.painLevel ?? initial.painLevel,
    pastMedicalHistoryChronicConditions:
      prefill?.pastMedicalHistoryChronicConditions ?? initial.pastMedicalHistoryChronicConditions,
    pastMedicalHistoryHydrated:
      prefill?.pastMedicalHistoryHydrated ?? initial.pastMedicalHistoryHydrated,
    pastMedicalHistoryOtherMentalHealthCondition:
      prefill?.pastMedicalHistoryOtherMentalHealthCondition ??
      initial.pastMedicalHistoryOtherMentalHealthCondition,
    pastMedicalHistoryOtherRelevantHistory:
      prefill?.pastMedicalHistoryOtherRelevantHistory ??
      initial.pastMedicalHistoryOtherRelevantHistory,
    pastMedicalHistoryOtherSurgery:
      prefill?.pastMedicalHistoryOtherSurgery ?? initial.pastMedicalHistoryOtherSurgery,
    pastMedicalHistorySurgicalHistory:
      prefill?.pastMedicalHistorySurgicalHistory ?? initial.pastMedicalHistorySurgicalHistory,
    pharmacy: prefill?.pharmacy ?? initial.pharmacy,
    symptomDuration: prefill?.symptomDuration ?? initial.symptomDuration,
    symptomNotes: prefill?.symptomNotes ?? initial.symptomNotes,
  };
}

function createClearedBackendDebugState(currentState: BackendState): BackendState {
  const initialBackend = createInitialBackendState();

  return {
    ...currentState,
    connectivity: initialBackend.connectivity,
    draft: {
      ...initialBackend.draft,
      draftId: currentState.draft.draftId,
      patientId: currentState.draft.patientId,
      visitId: currentState.draft.visitId,
      status:
        currentState.draft.draftId ||
        currentState.draft.patientId ||
        currentState.draft.visitId
          ? 'local-only'
          : initialBackend.draft.status,
    },
    janet: initialBackend.janet,
    lookup: initialBackend.lookup,
    qa: initialBackend.qa,
    submit: initialBackend.submit,
    uploads: initialBackend.uploads,
  };
}

function clearStaleBackendFeedbackState(
  currentState: BackendState,
  resetQa = false,
): BackendState {
  const initialBackend = createInitialBackendState();

  return {
    ...currentState,
    connectivity:
      currentState.connectivity.status === 'error'
        ? initialBackend.connectivity
        : {
            ...currentState.connectivity,
            errorMessage: null,
          },
    draft:
      currentState.draft.status === 'error'
        ? {
            ...initialBackend.draft,
            draftId: currentState.draft.draftId,
            lastFetchedAt: currentState.draft.lastFetchedAt,
            lastSyncedAt: currentState.draft.lastSyncedAt,
            patientId: currentState.draft.patientId,
            status:
              currentState.draft.lastSyncedAt || currentState.draft.draftId
                ? 'synced'
                : 'local-only',
            visitId: currentState.draft.visitId,
          }
        : {
            ...currentState.draft,
            fieldErrors: null,
          },
    janet:
      currentState.janet.status === 'error'
        ? initialBackend.janet
        : currentState.janet,
    lookup:
      currentState.lookup.status === 'error'
        ? initialBackend.lookup
        : currentState.lookup,
    qa: resetQa
      ? initialBackend.qa
      : {
          ...currentState.qa,
          lastError: null,
        },
    submit:
      currentState.submit.status === 'error'
        ? initialBackend.submit
        : {
            ...currentState.submit,
            fieldErrors: null,
          },
    uploads: {
      insurance:
        currentState.uploads.insurance.status === 'error'
          ? {
              ...initialBackend.uploads.insurance,
              lastUploadedAt: currentState.uploads.insurance.lastUploadedAt,
              previewUrl: currentState.uploads.insurance.previewUrl,
              uploadId: currentState.uploads.insurance.uploadId,
            }
          : currentState.uploads.insurance,
      id:
        currentState.uploads.id.status === 'error'
          ? {
              ...initialBackend.uploads.id,
              lastUploadedAt: currentState.uploads.id.lastUploadedAt,
              previewUrl: currentState.uploads.id.previewUrl,
              uploadId: currentState.uploads.id.uploadId,
            }
          : currentState.uploads.id,
    },
  };
}

function createInitialDraftState(): DraftStoreState {
  return {
    ...createInitialPersistedState(),
    hydrated: false,
    resumeCandidate: null,
  };
}

function buildMemoryPrefill(memoryContext: ReturningPatientMemoryContext | null) {
  if (!memoryContext) {
    return {};
  }

  return memoryContext.steps.reduce<Partial<IntakeFormData>>((accumulator, step) => {
    if (step.fieldKey === 'allergies') {
      return {
        ...accumulator,
        allergies: step.items.join(', '),
      };
    }
    if (step.fieldKey === 'medications') {
      return {
        ...accumulator,
        medications: step.items.join(', '),
      };
    }
    if (step.fieldKey === 'conditions') {
      return {
        ...accumulator,
        symptomNotes: step.items.join(', '),
      };
    }
    return accumulator;
  }, {});
}

function mergePersistedState(
  payload: PersistedDraftStoreState | null,
): DraftStoreState {
  const initial = createInitialPersistedState();

  if (!payload) {
    return {
      ...initial,
      hydrated: true,
      resumeCandidate: null,
    };
  }

  const normalizedPersistedStep = (() => {
    const currentStep = String(payload.intake?.currentStep ?? '');

    if (currentStep === 'patientType') {
      return 'basicInfo';
    }

    if (
      currentStep === 'medications' ||
      currentStep === 'allergies' ||
      currentStep === 'insurance'
    ) {
      return 'symptoms';
    }

    return payload.intake?.currentStep;
  })();

  return {
    activeFlowMode:
      payload.activeFlowMode === 'returning' ? 'returning' : 'intake',
    backend: {
      ...initial.backend,
      ...payload.backend,
      connectivity: {
        ...initial.backend.connectivity,
        ...payload.backend?.connectivity,
        ...getConnectivityDebugState(),
        status: 'idle',
      },
      draft: {
        ...initial.backend.draft,
        ...payload.backend?.draft,
      },
      janet: {
        ...initial.backend.janet,
        ...payload.backend?.janet,
        status:
          payload.backend?.janet?.status === 'sent'
            ? 'sent'
            : initial.backend.janet.status,
      },
      lookup: {
        ...initial.backend.lookup,
        ...payload.backend?.lookup,
        status: 'idle',
      },
      qa: {
        ...initial.backend.qa,
        ...payload.backend?.qa,
      },
      submit: {
        ...initial.backend.submit,
        ...payload.backend?.submit,
        status:
          payload.backend?.submit?.status === 'submitted'
            ? 'submitted'
            : initial.backend.submit.status,
      },
      uploads: {
        insurance: {
          ...initial.backend.uploads.insurance,
          ...payload.backend?.uploads?.insurance,
        },
        id: {
          ...initial.backend.uploads.id,
          ...payload.backend?.uploads?.id,
        },
      },
    },
    hydrated: true,
    intake: {
      ...initial.intake,
      ...payload.intake,
      currentStep: normalizedPersistedStep ?? initial.intake.currentStep,
      form: reconcileStructuredIntakeForm(
        normalizeIntakeFormFields({
          ...initial.intake.form,
          ...payload.intake?.form,
        }) as IntakeFormData,
      ),
    },
    returningPatient: {
      ...initial.returningPatient,
      ...payload.returningPatient,
      form: normalizeReturningPatientFields({
        ...initial.returningPatient.form,
        ...payload.returningPatient?.form,
      }) as ReturningPatientFormData,
    },
    janetMode: {
      ...initial.janetMode,
      ...payload.janetMode,
      currentStep: normalizedPersistedStep ?? payload.janetMode?.currentStep ?? initial.janetMode.currentStep,
      returnStep: payload.janetMode?.returnStep ?? null,
    },
    resumeCandidate: null,
    uploads: {
      ...initial.uploads,
      ...payload.uploads,
      insurance: payload.uploads?.insurance
        ? { ...payload.uploads.insurance }
        : null,
      id: payload.uploads?.id ? { ...payload.uploads.id } : null,
    },
    voice: {
      ...initial.voice,
      ...payload.voice,
      handoff: payload.voice?.handoff ? { ...payload.voice.handoff } : null,
    },
  };
}

function getPersistableState(state: DraftStoreState): PersistedDraftStoreState {
  return {
    activeFlowMode: state.activeFlowMode,
    backend: {
      ...state.backend,
      connectivity: {
        ...state.backend.connectivity,
        ...getConnectivityDebugState(),
        status:
          state.backend.connectivity.status === 'checking'
            ? 'idle'
            : state.backend.connectivity.status,
      },
      draft: {
        ...state.backend.draft,
        status:
          state.backend.draft.status === 'syncing'
            ? 'local-only'
            : state.backend.draft.status,
      },
      janet: {
        ...state.backend.janet,
        status:
          state.backend.janet.status === 'sending'
            ? 'idle'
            : state.backend.janet.status,
      },
      lookup: {
        ...state.backend.lookup,
        status:
          state.backend.lookup.status === 'loading'
            ? 'idle'
            : state.backend.lookup.status,
      },
      submit: {
        ...state.backend.submit,
        status:
          state.backend.submit.status === 'submitting'
            ? 'idle'
            : state.backend.submit.status,
      },
      uploads: {
        insurance: {
          ...state.backend.uploads.insurance,
          status:
            state.backend.uploads.insurance.status === 'uploading'
              ? 'idle'
              : state.backend.uploads.insurance.status,
        },
        id: {
          ...state.backend.uploads.id,
          status:
            state.backend.uploads.id.status === 'uploading'
              ? 'idle'
              : state.backend.uploads.id.status,
        },
      },
    },
    intake: state.intake,
    janetMode: state.janetMode,
    returningPatient: state.returningPatient,
    uploads: state.uploads,
    voice: state.voice,
  };
}

async function deletePersistedDraftFile() {
  try {
    if (draftFile.exists) {
      await draftFile.delete();
    }
  } catch {
    // ignore local cleanup errors
  }
}

function applyRemoteDraftToState(
  state: DraftStoreState,
  draft: IntakeDraftRecord,
): DraftStoreState {
  const timestamp = draft.syncedAt || nowIso();
  const uploadedInsurance = draft.uploadedDocumentTypes.includes('insurance');
  const uploadedId = draft.uploadedDocumentTypes.includes('id');

  return {
    ...state,
    activeFlowMode: 'intake',
    backend: {
      ...state.backend,
      draft: {
        ...state.backend.draft,
        draftId: draft.id,
        fieldErrors: null,
        lastFetchedAt: timestamp,
        lastSyncedAt: timestamp,
        message: 'Remote draft loaded successfully.',
        patientId: draft.patientId,
        status: 'synced',
        visitId: draft.visitId,
      },
      uploads: {
        insurance: uploadedInsurance
          ? {
              ...state.backend.uploads.insurance,
              lastUploadedAt:
                state.backend.uploads.insurance.lastUploadedAt ?? timestamp,
              message: 'Insurance document is synced to the backend.',
              status: 'uploaded',
            }
          : state.backend.uploads.insurance,
        id: uploadedId
          ? {
              ...state.backend.uploads.id,
              lastUploadedAt: state.backend.uploads.id.lastUploadedAt ?? timestamp,
              message: 'ID document is synced to the backend.',
              status: 'uploaded',
            }
          : state.backend.uploads.id,
      },
    },
    intake: {
      ...state.intake,
      currentStep: draft.currentStep,
      form: reconcileStructuredIntakeForm(
        normalizeIntakeFormFields({
          ...state.intake.form,
          ...draft.form,
        }) as IntakeFormData,
      ),
      lastUpdatedAt: timestamp,
      source: state.intake.source,
      voiceImportedAt:
        draft.janetHandoff?.interpretedAt ?? state.intake.voiceImportedAt,
    },
    returningPatient: {
      ...state.returningPatient,
      form: normalizeReturningPatientFields({
        ...state.returningPatient.form,
        ...draft.returningPatient,
      }) as ReturningPatientFormData,
      lastUpdatedAt: timestamp,
    },
    voice: {
      ...state.voice,
      handoff: draft.janetHandoff ?? state.voice.handoff,
      transcriptDraft:
        draft.janetHandoff?.transcript ?? state.voice.transcriptDraft,
    },
  };
}

function reducer(
  state: DraftStoreState,
  action: DraftStoreAction,
): DraftStoreState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...mergePersistedState(action.payload.persisted),
        resumeCandidate: action.payload.resumeCandidate ?? null,
      };
    case 'resume_saved_draft':
      return {
        ...mergePersistedState(action.payload),
        resumeCandidate: null,
      };
    case 'start_new_intake': {
      const timestamp = nowIso();
      const initial = createInitialPersistedState();
      const nextInitialForm =
        action.payload?.source === 'preview'
          ? {
              ...createInitialIntakeForm(),
              ...action.payload?.prefill,
            }
          : createFreshPatientIntakeForm(action.payload?.prefill);
      const nextForm = reconcileStructuredIntakeForm(
        normalizeIntakeFormFields({
          ...nextInitialForm,
        }) as IntakeFormData,
      );

      return {
        ...state,
        activeFlowMode: 'intake',
        backend: {
          ...state.backend,
          draft: initial.backend.draft,
          janet: initial.backend.janet,
          lookup: {
            ...createInitialBackendState().lookup,
          },
          submit: {
            ...createInitialBackendState().submit,
          },
          uploads: initial.backend.uploads,
          qa: initial.backend.qa,
        },
        intake: {
          currentStep: action.payload?.step ?? 'basicInfo',
          form: nextForm,
          lastUpdatedAt: timestamp,
          source: action.payload?.source ?? 'home',
          voiceImportedAt: null,
        },
        janetMode: {
          ...initial.janetMode,
          active: false,
          currentStep: action.payload?.step ?? 'basicInfo',
        },
        resumeCandidate: null,
        returningPatient: initial.returningPatient,
        uploads: initial.uploads,
        voice: initial.voice,
      };
    }
    case 'set_resume_candidate':
      return {
        ...state,
        resumeCandidate: action.payload,
      };
    case 'set_active_flow_mode':
      return {
        ...state,
        activeFlowMode: action.payload,
      };
    case 'set_intake_step':
      return {
        ...state,
        activeFlowMode: 'intake',
        janetMode: {
          ...state.janetMode,
          currentStep: state.janetMode.active
            ? state.janetMode.currentStep
            : action.payload,
        },
        intake: {
          ...state.intake,
          currentStep: action.payload,
          lastUpdatedAt: nowIso(),
        },
      };
    case 'open_janet_mode': {
      const targetStep = action.payload?.step ?? state.intake.currentStep;

      return {
        ...state,
        activeFlowMode: 'intake',
        janetMode: {
          ...state.janetMode,
          active: true,
          currentStep: targetStep,
          returnStep: state.intake.currentStep,
        },
      };
    }
    case 'close_janet_mode':
      return {
        ...state,
        intake: {
          ...state.intake,
          currentStep: state.janetMode.currentStep,
          lastUpdatedAt: nowIso(),
        },
        janetMode: {
          ...state.janetMode,
          active: false,
          currentStep: state.janetMode.currentStep,
          returnStep: null,
        },
      };
    case 'set_janet_mode_step':
      return {
        ...state,
        janetMode: {
          ...state.janetMode,
          currentStep: action.payload,
        },
      };
    case 'set_janet_language':
      return {
        ...state,
        janetMode: {
          ...state.janetMode,
          language: action.payload,
        },
      };
    case 'set_janet_noisy_room':
      return {
        ...state,
        janetMode: {
          ...state.janetMode,
          noisyRoomEnabled: action.payload,
        },
        voice: {
          ...state.voice,
          spellModeEnabled: action.payload,
          lastUpdatedAt: nowIso(),
        },
      };
    case 'update_intake_form':
      return {
        ...state,
        activeFlowMode: 'intake',
        intake: {
          ...state.intake,
          form: reconcileStructuredIntakeForm(
            normalizeIntakeFormFields({
              ...state.intake.form,
              ...action.payload,
            }) as IntakeFormData,
          ),
          lastUpdatedAt: nowIso(),
        },
      };
    case 'open_returning_flow':
      return {
        ...state,
        activeFlowMode: 'returning',
        backend: {
          ...state.backend,
          lookup: action.payload?.reset
            ? createInitialBackendState().lookup
            : state.backend.lookup,
        },
        returningPatient: action.payload?.reset
          ? {
              form: createInitialReturningPatientForm(),
              lastUpdatedAt: null,
            }
          : state.returningPatient,
      };
    case 'update_returning_patient':
      return {
        ...state,
        activeFlowMode: 'returning',
        returningPatient: {
          form: normalizeReturningPatientFields({
            ...state.returningPatient.form,
            ...action.payload,
          }) as ReturningPatientFormData,
          lastUpdatedAt: nowIso(),
        },
      };
    case 'continue_returning_patient': {
      const timestamp = nowIso();

      return {
        ...state,
        activeFlowMode: 'intake',
        intake: {
          currentStep: 'symptoms',
          form: reconcileStructuredIntakeForm(
            normalizeIntakeFormFields({
              ...state.intake.form,
              firstName: state.returningPatient.form.firstName,
              lastName: state.returningPatient.form.lastName,
              dateOfBirth: state.returningPatient.form.dateOfBirth,
              phoneNumber: state.returningPatient.form.phoneNumber,
            }) as IntakeFormData,
          ),
          lastUpdatedAt: timestamp,
          source: 'returning',
          voiceImportedAt: state.intake.voiceImportedAt,
        },
        returningPatient: {
          ...state.returningPatient,
          lastUpdatedAt: timestamp,
        },
      };
    }
    case 'set_voice_listening':
      return {
        ...state,
        voice: {
          ...state.voice,
          isListening: action.payload,
          lastUpdatedAt: nowIso(),
        },
      };
    case 'set_voice_spell_mode':
      return {
        ...state,
        voice: {
          ...state.voice,
          spellModeEnabled: action.payload,
          lastUpdatedAt: nowIso(),
        },
      };
    case 'set_voice_transcript':
      return {
        ...state,
        voice: {
          ...state.voice,
          transcriptDraft: action.payload,
          lastUpdatedAt: nowIso(),
        },
      };
    case 'set_voice_handoff':
      return {
        ...state,
        voice: {
          ...state.voice,
          handoff: action.payload,
          isEditing: false,
          isListening: false,
          lastUpdatedAt: nowIso(),
          transcriptDraft:
            action.payload?.transcript ?? state.voice.transcriptDraft,
        },
      };
    case 'update_voice_handoff':
      return {
        ...state,
        voice: {
          ...state.voice,
          handoff: {
            ...(state.voice.handoff ?? createEmptyJanetHandoff()),
            ...action.payload,
          },
          lastUpdatedAt: nowIso(),
        },
      };
    case 'set_voice_editing':
      return {
        ...state,
        voice: {
          ...state.voice,
          isEditing: action.payload,
          lastUpdatedAt: nowIso(),
        },
      };
    case 'apply_voice_to_intake': {
      if (!state.voice.handoff) {
        return state;
      }

      const timestamp = nowIso();

      return {
        ...state,
        activeFlowMode: 'intake',
        intake: {
          currentStep: 'symptoms',
          form: reconcileStructuredIntakeForm(
            normalizeIntakeFormFields({
              ...state.intake.form,
              chiefConcern: state.voice.handoff.symptomSummary,
              symptomDuration: state.voice.handoff.duration,
              medications:
                state.voice.handoff.medicationNotes || state.intake.form.medications,
              allergyNotes:
                state.voice.handoff.allergyNotes || state.intake.form.allergyNotes,
              symptomNotes:
                state.voice.handoff.transcript || state.intake.form.symptomNotes,
            }) as IntakeFormData,
          ),
          lastUpdatedAt: timestamp,
          source: 'voice',
          voiceImportedAt: timestamp,
        },
        voice: {
          ...state.voice,
          appliedToIntakeAt: timestamp,
          lastUpdatedAt: timestamp,
        },
      };
    }
    case 'set_upload_asset':
      return {
        ...state,
        uploads: {
          ...state.uploads,
          [action.payload.documentType]: action.payload.asset,
          lastUpdatedAt: nowIso(),
        },
      };
    case 'set_backend_connectivity':
      return {
        ...state,
        backend: {
          ...state.backend,
          connectivity: {
            ...state.backend.connectivity,
            ...action.payload,
            ...getConnectivityDebugState(),
          },
        },
      };
    case 'set_backend_draft':
      return {
        ...state,
        backend: {
          ...state.backend,
          draft: {
            ...state.backend.draft,
            ...action.payload,
          },
        },
      };
    case 'set_backend_lookup':
      return {
        ...state,
        backend: {
          ...state.backend,
          lookup: {
            ...state.backend.lookup,
            ...action.payload,
          },
        },
      };
    case 'set_backend_submit':
      return {
        ...state,
        backend: {
          ...state.backend,
          submit: {
            ...state.backend.submit,
            ...action.payload,
          },
        },
      };
    case 'set_backend_janet':
      return {
        ...state,
        backend: {
          ...state.backend,
          janet: {
            ...state.backend.janet,
            ...action.payload,
          },
        },
      };
    case 'set_backend_qa':
      return {
        ...state,
        backend: {
          ...state.backend,
          qa: {
            ...state.backend.qa,
            ...action.payload,
          },
        },
      };
    case 'set_backend_upload':
      return {
        ...state,
        backend: {
          ...state.backend,
          uploads: {
            ...state.backend.uploads,
            [action.payload.documentType]: {
              ...state.backend.uploads[action.payload.documentType],
              ...action.payload.value,
            },
          },
        },
      };
    case 'apply_lookup_success': {
      const timestamp = nowIso();
      const lookupPrefill = buildLookupPrefill(
        state.returningPatient.form,
        action.payload,
      );
      const memoryPrefill = buildMemoryPrefill(action.payload.memoryContext);

      return {
        ...state,
        activeFlowMode: 'intake',
        backend: {
          ...state.backend,
          draft: {
            ...state.backend.draft,
            draftId: action.payload.draftId ?? state.backend.draft.draftId,
            fieldErrors: null,
            message: action.payload.message,
            patientId: action.payload.patient?.id ?? state.backend.draft.patientId,
            visitId: action.payload.visitId ?? state.backend.draft.visitId,
          },
          lookup: {
            ...state.backend.lookup,
            fieldErrors: null,
            lastCheckedAt: timestamp,
            memoryContext: action.payload.memoryContext,
            message: action.payload.message,
            patient: action.payload.patient,
            resumeContext: action.payload.resumeContext,
            status: 'matched',
          },
        },
        intake: {
          currentStep: 'symptoms',
          form: reconcileStructuredIntakeForm(
            normalizeIntakeFormFields({
              ...state.intake.form,
              ...memoryPrefill,
              ...lookupPrefill,
            }) as IntakeFormData,
          ),
          lastUpdatedAt: timestamp,
          source: 'returning',
          voiceImportedAt: state.intake.voiceImportedAt,
        },
        returningPatient: {
          ...state.returningPatient,
          lastUpdatedAt: timestamp,
        },
      };
    }
    case 'apply_remote_draft':
      return applyRemoteDraftToState(state, action.payload);
    case 'clear_backend_debug_state':
      return {
        ...state,
        backend: createClearedBackendDebugState(state.backend),
      };
    case 'clear_backend_stale_feedback':
      return {
        ...state,
        backend: clearStaleBackendFeedbackState(
          state.backend,
          action.payload?.resetQa ?? false,
        ),
      };
    case 'clear_draft': {
      const initial = createInitialPersistedState();

      switch (action.payload ?? 'all') {
        case 'intake':
          return {
            ...state,
            activeFlowMode: 'intake',
            intake: initial.intake,
            resumeCandidate: null,
            backend: {
              ...state.backend,
              draft: initial.backend.draft,
              submit: initial.backend.submit,
            },
          };
        case 'returning':
          return {
            ...state,
            activeFlowMode: 'intake',
            returningPatient: initial.returningPatient,
            backend: {
              ...state.backend,
              lookup: initial.backend.lookup,
            },
          };
        case 'voice':
          return {
            ...state,
            janetMode: initial.janetMode,
            voice: initial.voice,
            backend: {
              ...state.backend,
              janet: initial.backend.janet,
            },
          };
        case 'uploads':
          return {
            ...state,
            uploads: initial.uploads,
            backend: {
              ...state.backend,
              uploads: initial.backend.uploads,
            },
          };
        case 'all':
        default:
          return {
            ...initial,
            hydrated: state.hydrated,
            resumeCandidate: null,
          };
      }
    }
    default:
      return state;
  }
}

async function readPersistedDraft(): Promise<PersistedDraftStoreState | null> {
  try {
    if (!draftFile.exists) {
      return null;
    }

    const raw = await draftFile.text();

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as PersistedDraftStoreState;
  } catch {
    return null;
  }
}

function writePersistedDraft(state: PersistedDraftStoreState) {
  try {
    if (!draftDirectory.exists) {
      draftDirectory.create({
        idempotent: true,
        intermediates: true,
      });
    }

    if (!draftFile.exists) {
      draftFile.create({
        intermediates: true,
        overwrite: true,
      });
    }

    draftFile.write(JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to save NexGen Flo draft locally.', error);
  }
}

function hasMinimumIdentityForSync(state: DraftStoreState) {
  if (state.backend.draft.patientId || state.backend.draft.draftId) {
    return true;
  }

  const intakeIdentity =
    hasText(state.intake.form.firstName) &&
    hasText(state.intake.form.lastName) &&
    hasText(state.intake.form.dateOfBirth);

  if (intakeIdentity) {
    return true;
  }

  return (
    hasText(state.returningPatient.form.firstName) &&
    hasText(state.returningPatient.form.lastName) &&
    hasText(state.returningPatient.form.dateOfBirth)
  );
}

function buildRemoteDraftPayload(
  state: DraftStoreState,
  options?: { formOverride?: IntakeFormData },
) {
  return {
    currentStep: state.intake.currentStep,
    draftId: state.backend.draft.draftId,
    form: options?.formOverride ?? state.intake.form,
    janetHandoff: state.voice.handoff,
    patientId: state.backend.draft.patientId,
    returningPatient: state.returningPatient.form,
    source: 'mobile',
    uploads: {
      insurance: state.uploads.insurance?.uri ?? null,
      id: state.uploads.id?.uri ?? null,
    },
    visitId: state.backend.draft.visitId,
  };
}

export function DraftStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialDraftState);
  const stateRef = useRef(state);
  const pendingResumeDraftRef = useRef<PersistedDraftStoreState | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateDraft() {
      const persistedDraft = await readPersistedDraft();
      let draftSession = await loadDraftSession();

      if (!draftSession && persistedDraft) {
        const migratedState = mergePersistedState(persistedDraft);
        if (hasResumableIntakeDraft(migratedState)) {
          const migratedUpdatedAt =
            persistedDraft.intake.lastUpdatedAt ??
            persistedDraft.voice.lastUpdatedAt ??
            persistedDraft.returningPatient.lastUpdatedAt;

          if (migratedUpdatedAt && !isDraftExpired({ updatedAt: migratedUpdatedAt })) {
            draftSession = await saveDraftSession({
              currentStep:
                intakeFlowSteps.findIndex(
                  (step) => step.key === persistedDraft.intake.currentStep,
                ) + 1,
              formData: persistedDraft.intake.form,
              janetContext: {
                currentQuestionKey: persistedDraft.janetMode.currentStep,
                enabled: persistedDraft.janetMode.active,
              },
              updatedAt: migratedUpdatedAt,
            });
          }
        }
      }

      if (!draftSession || isDraftExpired(draftSession) || !persistedDraft) {
        pendingResumeDraftRef.current = null;

        if (!draftSession && persistedDraft) {
          await deletePersistedDraftFile();
        } else if (draftSession && !persistedDraft) {
          await clearDraftSession();
        } else if (draftSession && isDraftExpired(draftSession)) {
          await clearDraftSession();
          await deletePersistedDraftFile();
        }
      }

      if (!isMounted) {
        return;
      }

      const resumeCandidate =
        persistedDraft && draftSession && !isDraftExpired(draftSession)
          ? {
              description: `Continue at ${
                intakeFlowSteps[draftSession.currentStep - 1]?.title ?? 'Patient Information'
              }. ${formatLastSaved(draftSession.updatedAt)}`,
              draftId: draftSession.draftId,
              updatedAt: draftSession.updatedAt,
            }
          : null;

      pendingResumeDraftRef.current = resumeCandidate ? persistedDraft : null;

      startTransition(() => {
        dispatch({
          type: 'hydrate',
          payload: {
            persisted: null,
            resumeCandidate: resumeCandidate ?? undefined,
          },
        });
      });
    }

    void hydrateDraft();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!state.hydrated) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (state.backend.submit.status === 'submitted') {
        void clearDraftSession();
        void deletePersistedDraftFile();
        pendingResumeDraftRef.current = null;
        return;
      }

      if (!hasResumableIntakeDraft(state)) {
        if (state.resumeCandidate || pendingResumeDraftRef.current) {
          return;
        }
        void clearDraftSession();
        void deletePersistedDraftFile();
        pendingResumeDraftRef.current = null;
        return;
      }

      const persistableState = getPersistableState(state);
      writePersistedDraft(persistableState);
      pendingResumeDraftRef.current = persistableState;
      void saveDraftSession({
        currentStep:
          intakeFlowSteps.findIndex((step) => step.key === state.intake.currentStep) + 1,
        formData: state.intake.form,
        janetContext: {
          currentQuestionKey: state.janetMode.active ? state.janetMode.currentStep : undefined,
          enabled: state.janetMode.active,
        },
      });
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [state]);

  const clearStaleDraftReference = (message: string) => {
    dispatch({
      type: 'set_backend_draft',
      payload: {
        draftId: null,
        fieldErrors: null,
        message,
        status: 'local-only',
        visitId: null,
      },
    });
  };

  const recordQaEvent = (
    action: DevQaAction,
    outcome: 'error' | 'success',
    message: string,
    details?: Record<string, unknown>,
  ) => {
    dispatch({
      type: 'set_backend_qa',
      payload: {
        lastAction: action,
        lastError: outcome === 'error' ? message : null,
        lastResult: outcome === 'success' ? message : null,
        lastUpdatedAt: nowIso(),
      },
    });
    logDevQaEvent(action, outcome, message, details);
  };

  const createFreshRemoteDraft = async (
    currentState: DraftStoreState,
    messageOverride?: string,
  ) => {
    const response = await saveIntakeDraft({
      ...buildRemoteDraftPayload(currentState),
      draftId: null,
      visitId: null,
    });
    dispatch({
      type: 'clear_backend_stale_feedback',
    });

    dispatch({
      type: 'apply_remote_draft',
      payload: response.draft,
    });
    dispatch({
      type: 'set_backend_draft',
      payload: {
        fieldErrors: null,
        message: messageOverride ?? response.message,
      },
    });
    recordQaEvent(
      'draft_save',
      'success',
      messageOverride ?? response.message,
      {
        draftId: response.draft.id,
        patientId: response.draft.patientId,
        visitId: response.draft.visitId,
      },
    );

    return true;
  };

  const syncCurrentDraft = async (options?: { formOverride?: IntakeFormData }) => {
    const currentState = stateRef.current;

    if (!hasMinimumIdentityForSync(currentState)) {
      dispatch({
        type: 'set_backend_draft',
        payload: {
          fieldErrors: null,
          message:
            'Saved locally. Add patient identity details before syncing to the backend.',
          status: 'local-only',
        },
      });
      return false;
    }

    dispatch({
      type: 'set_backend_draft',
      payload: {
        fieldErrors: null,
        message: null,
        status: 'syncing',
      },
    });

    try {
      const payload = buildRemoteDraftPayload(currentState, {
        formOverride: options?.formOverride,
      });
      const response = currentState.backend.draft.draftId
        ? await updateIntakeDraft(currentState.backend.draft.draftId, payload)
        : await saveIntakeDraft(payload);
      dispatch({
        type: 'clear_backend_stale_feedback',
      });

      dispatch({
        type: 'apply_remote_draft',
        payload: response.draft,
      });
      dispatch({
        type: 'set_backend_draft',
        payload: {
          message: response.message,
        },
      });
      recordQaEvent('draft_save', 'success', response.message, {
        draftId: response.draft.id,
        patientId: response.draft.patientId,
        visitId: response.draft.visitId,
      });
      return true;
    } catch (error) {
      if (isDraftMissingError(error) && currentState.backend.draft.draftId) {
        clearStaleDraftReference(
          'The previous backend draft expired. Creating a fresh backend draft from the local copy.',
        );

        try {
          return await createFreshRemoteDraft(
            currentState,
            'Fresh backend draft created from the local copy.',
          );
        } catch (retryError) {
          dispatch({
            type: 'set_backend_draft',
            payload: {
              fieldErrors: getApiFieldErrors(retryError),
              message: getErrorMessage(
                retryError,
                'The backend draft expired and could not be recreated. Your local draft is still safe on this device.',
              ),
              status: 'error',
            },
          });
          recordQaEvent(
            'draft_save',
            'error',
            getErrorMessage(
              retryError,
              'The backend draft expired and could not be recreated. Your local draft is still safe on this device.',
            ),
            {
              draftId: currentState.backend.draft.draftId,
              patientId: currentState.backend.draft.patientId,
              visitId: currentState.backend.draft.visitId,
            },
          );
          return false;
        }
      }

      const message = getErrorMessage(
        error,
        'The draft could not be synced right now.',
      );
      dispatch({
        type: 'set_backend_draft',
        payload: {
          fieldErrors: getApiFieldErrors(error),
          message,
          status: isDraftConflictError(error) ? 'local-only' : 'error',
        },
      });
      recordQaEvent('draft_save', 'error', message, {
        draftId: currentState.backend.draft.draftId,
        patientId: currentState.backend.draft.patientId,
        visitId: currentState.backend.draft.visitId,
      });
      return false;
    }
  };

  const fetchRemoteDraftState = async (explicitDraftId?: string | null) => {
    const draftId = explicitDraftId ?? stateRef.current.backend.draft.draftId;

    if (!draftId) {
      return false;
    }

    dispatch({
      type: 'set_backend_draft',
      payload: {
        fieldErrors: null,
        message: null,
        status: 'syncing',
      },
    });

    try {
      const response = await fetchIntakeDraft(draftId);
      dispatch({
        type: 'clear_backend_stale_feedback',
      });
      dispatch({
        type: 'apply_remote_draft',
        payload: response.draft,
      });
      dispatch({
        type: 'set_backend_draft',
        payload: {
          fieldErrors: null,
          message: response.message,
        },
      });
      recordQaEvent('draft_resume', 'success', response.message, {
        draftId: response.draft.id,
        patientId: response.draft.patientId,
        visitId: response.draft.visitId,
      });
      return true;
    } catch (error) {
      if (isDraftMissingError(error)) {
        clearStaleDraftReference(
          'The backend draft is no longer available. The local draft is still available on this device.',
        );
        dispatch({
          type: 'set_backend_draft',
          payload: {
            lastFetchedAt: nowIso(),
          },
        });
        recordQaEvent(
          'draft_resume',
          'error',
          'The backend draft is no longer available. The local draft is still available on this device.',
          {
            draftId,
          },
        );
        return false;
      }

      const message = getErrorMessage(
        error,
        'The saved backend draft could not be loaded.',
      );
      dispatch({
        type: 'set_backend_draft',
        payload: {
          fieldErrors: getApiFieldErrors(error),
          message,
          status: 'error',
        },
      });
      recordQaEvent('draft_resume', 'error', message, {
        draftId,
      });
      return false;
    }
  };

  const checkBackendHealth = async () => {
    const connectivityDebug = getConnectivityDebugState();

    dispatch({
      type: 'set_backend_connectivity',
      payload: {
        ...connectivityDebug,
        errorMessage: null,
        message: null,
        rawStatus: null,
        status: 'checking',
      },
    });

    try {
      const health = await checkApiHealth();
      dispatch({
        type: 'clear_backend_stale_feedback',
        payload: {
          resetQa: true,
        },
      });
      dispatch({
        type: 'set_backend_connectivity',
        payload: {
          ...connectivityDebug,
          checkedAt: nowIso(),
          errorMessage: null,
          message: 'Connected to the NexGEN backend.',
          rawStatus: health.status,
          requestId: health.requestId,
          serverVersion: health.version,
          status: 'ready',
        },
      });
      return true;
    } catch (error) {
      const rawErrorMessage = getErrorMessage(
        error,
        'The backend health check failed. Local draft mode is still available.',
      );
      dispatch({
        type: 'set_backend_connectivity',
        payload: {
          ...connectivityDebug,
          checkedAt: nowIso(),
          errorMessage: rawErrorMessage,
          message: rawErrorMessage,
          rawStatus: error instanceof ApiError && error.isTimeout ? 'timeout' : null,
          requestId: null,
          status: 'error',
        },
      });
      return false;
    }
  };

  const lookupReturningPatientState = async () => {
    const currentState = stateRef.current;
    const form = currentState.returningPatient.form;

    if (
      !hasText(form.firstName) ||
      !hasText(form.lastName) ||
      !hasText(form.dateOfBirth)
    ) {
      dispatch({
        type: 'set_backend_lookup',
        payload: {
          fieldErrors: null,
          message:
            'Add first name, last name, and date of birth before running lookup.',
          status: 'error',
        },
      });
      return false;
    }

    dispatch({
      type: 'set_backend_lookup',
      payload: {
        fieldErrors: null,
        message: null,
        status: 'loading',
      },
    });

    try {
      const response = await lookupReturningPatient({
        dateOfBirth: form.dateOfBirth,
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
      });
      dispatch({
        type: 'clear_backend_stale_feedback',
      });

      if (response.matchStatus === 'likely_match' && response.patient) {
        dispatch({
          type: 'apply_lookup_success',
          payload: response,
        });
        recordQaEvent('returning_lookup', 'success', response.message, {
          draftId: response.draftId,
          matchStatus: response.matchStatus,
          patientId: response.patient.id,
          visitId: response.visitId,
        });

        if (response.draftId) {
          await fetchRemoteDraftState(response.draftId);
        }

        return true;
      }

      dispatch({
        type: 'set_backend_lookup',
        payload: {
          fieldErrors: null,
          lastCheckedAt: nowIso(),
          memoryContext: response.memoryContext,
          message: response.message,
          patient: response.patient,
          resumeContext: response.resumeContext,
          status:
            response.matchStatus === 'ambiguous_match'
              ? 'ambiguous'
              : 'not_found',
        },
      });
      recordQaEvent('returning_lookup', 'success', response.message, {
        draftId: response.draftId,
        matchStatus: response.matchStatus,
        patientId: response.patient?.id,
        visitId: response.visitId,
      });
      return false;
    } catch (error) {
      const message = getErrorMessage(
        error,
        'Returning patient lookup is unavailable right now.',
      );
      dispatch({
        type: 'set_backend_lookup',
        payload: {
          fieldErrors: getApiFieldErrors(error),
          lastCheckedAt: nowIso(),
          message,
          status: 'error',
        },
      });
      recordQaEvent('returning_lookup', 'error', message, {
        firstName: form.firstName,
        lastName: form.lastName,
      });
      return false;
    }
  };

  const syncVoiceHandoff = async () => {
    const currentState = stateRef.current;

    if (!currentState.voice.handoff) {
      return false;
    }

    if (!currentState.backend.draft.draftId && hasMinimumIdentityForSync(currentState)) {
      await syncCurrentDraft();
    }

    const nextState = stateRef.current;
    if (!nextState.backend.draft.draftId && !nextState.backend.draft.patientId) {
      dispatch({
        type: 'set_backend_janet',
        payload: {
          message:
            'Janet handoff is saved locally and will sync after the backend draft is created.',
          status: 'idle',
        },
      });
      return false;
    }

    dispatch({
      type: 'set_backend_janet',
      payload: {
        message: null,
        status: 'sending',
      },
    });

    try {
      const response = await submitJanetHandoff({
        draftId: nextState.backend.draft.draftId,
        handoff: nextState.voice.handoff!,
        patientId: nextState.backend.draft.patientId,
        visitId: nextState.backend.draft.visitId,
      });
      dispatch({
        type: 'clear_backend_stale_feedback',
      });

      dispatch({
        type: 'set_backend_janet',
        payload: {
          appliedFields: response.appliedFields,
          lastSyncedAt: response.syncedAt,
          message: response.message,
          status: 'sent',
        },
      });
      dispatch({
        type: 'set_backend_draft',
        payload: {
          draftId: response.draftId ?? nextState.backend.draft.draftId,
          visitId: response.visitId ?? nextState.backend.draft.visitId,
        },
      });
      recordQaEvent('janet_handoff', 'success', response.message, {
        appliedFields: response.appliedFields,
        draftId: response.draftId,
        visitId: response.visitId,
      });
      return true;
    } catch (error) {
      if (isDraftMissingError(error)) {
        clearStaleDraftReference(
          'The backend draft expired. Janet handoff is still saved locally and can be sent again.',
        );
      }

      const message = getErrorMessage(
        error,
        'Janet handoff could not be synced right now.',
      );
      dispatch({
        type: 'set_backend_janet',
        payload: {
          message,
          status: 'error',
        },
      });
      recordQaEvent('janet_handoff', 'error', message, {
        draftId: nextState.backend.draft.draftId,
        visitId: nextState.backend.draft.visitId,
      });
      return false;
    }
  };

  const syncSelectedUpload = async (documentType: UploadDocumentType) => {
    const currentState = stateRef.current;
    const asset = currentState.uploads[documentType];

    if (!asset) {
      dispatch({
        type: 'set_backend_upload',
        payload: {
          documentType,
          value: {
            message: 'Choose a document first before syncing to the backend.',
            status: 'error',
          },
        },
      });
      return false;
    }

    if (!currentState.backend.draft.draftId && hasMinimumIdentityForSync(currentState)) {
      await syncCurrentDraft();
    }

    const nextState = stateRef.current;
    if (!nextState.backend.draft.draftId && !nextState.backend.draft.patientId) {
      dispatch({
        type: 'set_backend_upload',
        payload: {
          documentType,
          value: {
            message:
              'Document saved locally. Sync a patient draft first to upload it remotely.',
            status: 'idle',
          },
        },
      });
      return false;
    }

    dispatch({
      type: 'set_backend_upload',
      payload: {
        documentType,
        value: {
          message: null,
          status: 'uploading',
        },
      },
    });

    try {
      const response = await uploadDocumentToApi(documentType, asset, {
        draftId: nextState.backend.draft.draftId,
        patientId: nextState.backend.draft.patientId,
        visitId: nextState.backend.draft.visitId,
      });
      dispatch({
        type: 'clear_backend_stale_feedback',
      });

      dispatch({
        type: 'set_backend_upload',
        payload: {
          documentType,
          value: {
            lastUploadedAt: response.upload.uploadedAt,
            message: response.message,
            previewUrl: response.upload.previewUrl,
            status: 'uploaded',
            uploadId: response.upload.id,
          },
        },
      });
      recordQaEvent(
        documentType === 'insurance' ? 'upload_insurance' : 'upload_id',
        'success',
        response.message,
        {
          draftId: nextState.backend.draft.draftId,
          uploadId: response.upload.id,
          visitId: nextState.backend.draft.visitId,
        },
      );
      return true;
    } catch (error) {
      if (isDraftMissingError(error)) {
        clearStaleDraftReference(
          'The backend draft expired. The selected document is still saved locally and can be uploaded again.',
        );
      }

      const message = getUploadFailureMessage(documentType, error);
      dispatch({
        type: 'set_backend_upload',
        payload: {
          documentType,
          value: {
            message,
            status: 'error',
          },
        },
      });
      recordQaEvent(
        documentType === 'insurance' ? 'upload_insurance' : 'upload_id',
        'error',
        message,
        {
          draftId: nextState.backend.draft.draftId,
          visitId: nextState.backend.draft.visitId,
        },
      );
      return false;
    }
  };

  const submitCurrentIntake = async () => {
    const currentState = stateRef.current;

    if (currentState.backend.submit.status === 'submitting') {
      return false;
    }

    if (currentState.backend.submit.status === 'submitted') {
      return true;
    }

    dispatch({
      type: 'set_backend_submit',
      payload: {
        fieldErrors: null,
        message: null,
        status: 'submitting',
      },
    });

    await syncCurrentDraft();

    if (stateRef.current.voice.handoff) {
      await syncVoiceHandoff();
    }

    const selectedUploads = {
      insurance: Boolean(stateRef.current.uploads.insurance),
      id: Boolean(stateRef.current.uploads.id),
    };

    let insuranceUploadReady =
      !selectedUploads.insurance ||
      stateRef.current.backend.uploads.insurance.status === 'uploaded';
    let idUploadReady =
      !selectedUploads.id || stateRef.current.backend.uploads.id.status === 'uploaded';

    if (selectedUploads.insurance && !insuranceUploadReady) {
      insuranceUploadReady = await syncSelectedUpload('insurance');
    }
    if (selectedUploads.id && !idUploadReady) {
      idUploadReady = await syncSelectedUpload('id');
    }

    const missingUploadedDocuments: string[] = [];
    if (selectedUploads.insurance && !insuranceUploadReady) {
      missingUploadedDocuments.push('insurance card');
    }
    if (selectedUploads.id && !idUploadReady) {
      missingUploadedDocuments.push('photo ID');
    }

    try {
      const latestState = stateRef.current;
      const submitPayload = {
        draftId: latestState.backend.draft.draftId,
        form: latestState.intake.form,
        janetHandoff: latestState.voice.handoff,
        patientId: latestState.backend.draft.patientId,
        returningPatient: latestState.returningPatient.form,
        uploads: {
          insurance:
            latestState.backend.uploads.insurance.status === 'uploaded'
              ? latestState.uploads.insurance?.uri ?? null
              : null,
          id:
            latestState.backend.uploads.id.status === 'uploaded'
              ? latestState.uploads.id?.uri ?? null
              : null,
        },
        visitId: latestState.backend.draft.visitId,
      };

      let response;

      try {
        response = await submitIntake(submitPayload);
      } catch (error) {
        if (isDraftMissingError(error) && latestState.backend.draft.draftId) {
          clearStaleDraftReference(
            'The backend draft expired during submit. Retrying with a fresh backend draft.',
          );
          response = await submitIntake({
            ...submitPayload,
            draftId: null,
            visitId: null,
          });
        } else {
          throw error;
        }
      }

      dispatch({
        type: 'clear_backend_stale_feedback',
      });
      dispatch({
        type: 'set_backend_submit',
        payload: {
          confirmationCode: response.confirmationCode,
          fieldErrors: null,
          message:
            missingUploadedDocuments.length > 0
              ? `${response.message} The check-in was submitted without the ${missingUploadedDocuments.join(
                  ' and ',
                )} because the upload did not finish.`
              : response.message,
          status: 'submitted',
          submittedAt: response.submittedAt,
        },
      });
      dispatch({
        type: 'set_backend_draft',
        payload: {
          draftId: response.draftId ?? latestState.backend.draft.draftId,
          fieldErrors: null,
          lastSyncedAt: response.submittedAt,
          message: response.message,
          patientId: response.patientId ?? latestState.backend.draft.patientId,
          status: 'synced',
          visitId: response.visitId ?? latestState.backend.draft.visitId,
        },
      });
      recordQaEvent('final_submit', 'success', response.message, {
        confirmationCode: response.confirmationCode,
        draftId: response.draftId ?? latestState.backend.draft.draftId,
        missingUploadedDocuments,
        patientId: response.patientId,
        visitId: response.visitId,
      });
      return true;
    } catch (error) {
      const message = getErrorMessage(
        error,
        'The intake could not be submitted right now.',
      );
      dispatch({
        type: 'set_backend_submit',
        payload: {
          fieldErrors: getApiFieldErrors(error),
          message,
          status: 'error',
        },
      });
      recordQaEvent('final_submit', 'error', message, {
        draftId: stateRef.current.backend.draft.draftId,
        patientId: stateRef.current.backend.draft.patientId,
        visitId: stateRef.current.backend.draft.visitId,
      });
      return false;
    }
  };

  const value: DraftStoreContextValue = {
    state,
    applyVoiceToIntake: () => {
      dispatch({
        type: 'apply_voice_to_intake',
      });
    },
    checkBackendHealth,
    clearBackendDebugState: () => {
      clearLastApiExchange();
      dispatch({
        type: 'clear_backend_debug_state',
      });
    },
    clearDraft: (scope) => {
      if ((scope ?? 'all') === 'all') {
        clearLastApiExchange();
        pendingResumeDraftRef.current = null;
        void clearDraftSession();
        void deletePersistedDraftFile();
      }
      dispatch({
        type: 'clear_draft',
        payload: scope,
      });
    },
    continueReturningPatient: () => {
      dispatch({
        type: 'continue_returning_patient',
      });
    },
    closeJanetMode: () => {
      dispatch({
        type: 'close_janet_mode',
      });
    },
    fetchRemoteDraft: fetchRemoteDraftState,
    lookupReturningPatient: lookupReturningPatientState,
    openJanetMode: (options) => {
      dispatch({
        type: 'open_janet_mode',
        payload: options,
      });
    },
    openReturningFlow: (reset) => {
      dispatch({
        type: 'open_returning_flow',
        payload: {
          reset,
        },
      });
    },
    resumeSavedDraft: () => {
      if (pendingResumeDraftRef.current) {
        dispatch({
          type: 'resume_saved_draft',
          payload: pendingResumeDraftRef.current,
        });
        pendingResumeDraftRef.current = null;
        return;
      }
      dispatch({
        type: 'set_active_flow_mode',
        payload: 'intake',
      });
    },
    setJanetLanguage: (language) => {
      dispatch({
        type: 'set_janet_language',
        payload: language,
      });
    },
    setJanetModeStep: (step) => {
      dispatch({
        type: 'set_janet_mode_step',
        payload: step,
      });
    },
    setJanetNoisyRoom: (enabled) => {
      dispatch({
        type: 'set_janet_noisy_room',
        payload: enabled,
      });
    },
    setIntakeStep: (step) => {
      dispatch({
        type: 'set_intake_step',
        payload: step,
      });
    },
    setUploadAsset: (documentType, asset) => {
      dispatch({
        type: 'set_upload_asset',
        payload: {
          asset,
          documentType,
        },
      });
    },
    setVoiceEditing: (isEditing) => {
      dispatch({
        type: 'set_voice_editing',
        payload: isEditing,
      });
    },
    setVoiceHandoff: (handoff) => {
      dispatch({
        type: 'set_voice_handoff',
        payload: handoff,
      });
    },
    setVoiceListening: (isListening) => {
      dispatch({
        type: 'set_voice_listening',
        payload: isListening,
      });
    },
    setVoiceSpellMode: (spellModeEnabled) => {
      dispatch({
        type: 'set_voice_spell_mode',
        payload: spellModeEnabled,
      });
    },
    setVoiceTranscript: (transcript) => {
      dispatch({
        type: 'set_voice_transcript',
        payload: transcript,
      });
    },
    startNewIntake: (options) => {
      pendingResumeDraftRef.current = null;
      void clearDraftSession();
      void deletePersistedDraftFile();
      dispatch({
        type: 'start_new_intake',
        payload: options,
      });
    },
    submitCurrentIntake,
    syncCurrentDraft,
    syncSelectedUpload,
    syncVoiceHandoff,
    updateIntakeField: (field, value) => {
      dispatch({
        type: 'update_intake_form',
        payload: {
          [field]: value,
        },
      });
    },
    updateIntakeFields: (values) => {
      dispatch({
        type: 'update_intake_form',
        payload: values,
      });
    },
    updateReturningPatientField: (field, value) => {
      dispatch({
        type: 'update_returning_patient',
        payload: {
          [field]: value,
        },
      });
    },
    updateVoiceHandoff: (values) => {
      dispatch({
        type: 'update_voice_handoff',
        payload: values,
      });
    },
  };

  return (
    <DraftStoreContext.Provider value={value}>
      {children}
    </DraftStoreContext.Provider>
  );
}

export function useDraftStore() {
  const context = useContext(DraftStoreContext);

  if (!context) {
    throw new Error('useDraftStore must be used within a DraftStoreProvider.');
  }

  return context;
}

export function formatLastSaved(timestamp: string | null) {
  if (!timestamp) {
    return 'Draft not saved yet';
  }

  const diffMs = Date.now() - new Date(timestamp).getTime();

  if (diffMs < 60_000) {
    return 'Saved locally just now';
  }

  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 60) {
    return `Saved locally ${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  return `Saved locally ${diffHours}h ago`;
}

export function formatDraftSyncStatus(state: DraftStoreState) {
  if (state.backend.submit.status === 'submitted') {
    return `Submitted successfully${
      state.backend.submit.submittedAt
        ? ` ${formatLastSaved(state.backend.submit.submittedAt).replace('Saved locally ', '')}`
        : ''
    }`;
  }

  if (state.backend.submit.status === 'error') {
    return state.backend.submit.message ?? 'Submission needs attention.';
  }

  if (state.backend.draft.status === 'synced') {
    return state.backend.draft.lastSyncedAt
      ? `Backend synced. ${formatLastSaved(state.backend.draft.lastSyncedAt)}`
      : 'Backend synced.';
  }

  if (state.backend.draft.status === 'syncing') {
    return 'Syncing draft to backend...';
  }

  if (state.backend.draft.status === 'error') {
    return state.backend.draft.message ?? 'Using local draft only.';
  }

  return state.backend.draft.message ?? 'Using local draft only.';
}

export function hasResumeableDraft(state: DraftStoreState) {
  const intakeHasData = Object.values(state.intake.form).some((value) =>
    hasIntakeFieldValue(value),
  );
  const returningHasData = Object.values(state.returningPatient.form).some(
    (value) => hasText(value),
  );

  return (
    intakeHasData ||
    returningHasData ||
    state.intake.currentStep !== 'basicInfo' ||
    state.activeFlowMode === 'returning'
  );
}

export function hasResumableIntakeDraft(state: DraftStoreState) {
  if (state.backend.submit.status === 'submitted') {
    return false;
  }

  const intakeHasData = Object.values(state.intake.form).some((value) =>
    hasIntakeFieldValue(value),
  );

  return (
    intakeHasData ||
    Boolean(state.backend.draft.draftId) ||
    state.intake.currentStep !== 'basicInfo'
  );
}

export function getResumeDraftDescription(state: DraftStoreState) {
  if (
    state.activeFlowMode === 'returning' &&
    Object.values(state.returningPatient.form).some((value) => hasText(value))
  ) {
    return `Returning patient lookup in progress. ${formatLastSaved(
      state.returningPatient.lastUpdatedAt,
    )}`;
  }

  const currentStep = intakeFlowSteps.find(
    (step) => step.key === state.intake.currentStep,
  );

  return `Continue at ${currentStep?.title ?? 'Patient Info'}. ${formatLastSaved(
    state.intake.lastUpdatedAt,
  )}`;
}

export function getResumableIntakeDraftDescription(state: DraftStoreState) {
  const currentStep = intakeFlowSteps.find(
    (step) => step.key === state.intake.currentStep,
  );

  return `Continue at ${currentStep?.title ?? 'Patient Information'}. ${formatLastSaved(
    state.intake.lastUpdatedAt,
  )}`;
}
