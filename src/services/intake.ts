import { api } from './api';
import type { JanetHandoff } from './janet';
import type { UploadDocumentType } from './uploads';

export type IntakeLaunchMode = 'intake' | 'returning';

export type IntakeStepKey =
  | 'patientType'
  | 'basicInfo'
  | 'symptoms'
  | 'medications'
  | 'allergies'
  | 'insurance'
  | 'review';

export type IntakeFormData = {
  patientType: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  chiefConcern: string;
  symptomDuration: string;
  painLevel: string;
  symptomNotes: string;
  medications: string;
  pharmacy: string;
  lastDose: string;
  allergies: string;
  allergyReaction: string;
  allergyNotes: string;
  insuranceProvider: string;
  memberId: string;
  groupNumber: string;
  subscriberName: string;
};

export type ReturningPatientFormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
};

export const intakeFlowSteps = [
  {
    key: 'patientType',
    title: 'Patient Type',
    subtitle: 'Choose the onboarding profile that matches this visit.',
  },
  {
    key: 'basicInfo',
    title: 'Basic Information',
    subtitle: 'Capture identity and reliable follow-up details.',
  },
  {
    key: 'symptoms',
    title: 'Symptoms',
    subtitle: 'Document the presenting concern with concise clinical context.',
  },
  {
    key: 'medications',
    title: 'Medications',
    subtitle: 'Review active medications and supporting pharmacy details.',
  },
  {
    key: 'allergies',
    title: 'Allergies',
    subtitle: 'Flag sensitivities, reactions, and safety notes.',
  },
  {
    key: 'insurance',
    title: 'Insurance',
    subtitle: 'Capture the essential coverage details for verification.',
  },
  {
    key: 'review',
    title: 'Review',
    subtitle: 'Confirm the intake summary before the staff handoff.',
  },
] as const satisfies readonly {
  key: IntakeStepKey;
  title: string;
  subtitle: string;
}[];

export const patientTypeOptions = [
  {
    value: 'New patient',
    label: 'New Patient',
    description: 'Best for first-time visits, new registration, and full onboarding.',
  },
  {
    value: 'Returning patient',
    label: 'Returning Patient',
    description: 'Fast-track a known patient into symptom capture and review.',
  },
  {
    value: 'Dependent / family member',
    label: 'Dependent / Family',
    description: 'Collect intake on behalf of a child or supported family member.',
  },
  {
    value: 'Self pay',
    label: 'Self Pay',
    description: 'Keep the workflow ready for non-insurance or direct-pay visits.',
  },
] as const;

export function createInitialIntakeForm(): IntakeFormData {
  return {
    patientType: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    email: '',
    chiefConcern: '',
    symptomDuration: '',
    painLevel: '',
    symptomNotes: '',
    medications: '',
    pharmacy: '',
    lastDose: '',
    allergies: '',
    allergyReaction: '',
    allergyNotes: '',
    insuranceProvider: '',
    memberId: '',
    groupNumber: '',
    subscriberName: '',
  };
}

export function createInitialReturningPatientForm(): ReturningPatientFormData {
  return {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
  };
}

export const uploadChecklist = [
  'Insurance cards',
  'Photo identification',
  'Referral or lab attachments',
] as const;

export const uploadDocumentPreviews = [
  {
    key: 'insurance',
    title: 'Insurance Card',
    subtitle: 'Front and back capture placeholder for coverage verification.',
  },
  {
    key: 'id',
    title: 'Government ID',
    subtitle: 'Photo ID placeholder for identity confirmation and matching.',
  },
] as const;

export type RemoteDraftStatus = 'draft' | 'ready_for_review' | 'submitted';

export type IntakeDraftPayload = {
  currentStep: IntakeStepKey;
  draftId?: string | null;
  janetHandoff?: JanetHandoff | null;
  patientId?: number | null;
  returningPatient?: ReturningPatientFormData;
  source?: string;
  uploads?: Partial<Record<UploadDocumentType, string | null>>;
  visitId?: number | null;
  form: IntakeFormData;
};

export type IntakeDraftRecord = {
  currentStep: IntakeStepKey;
  form: Partial<IntakeFormData>;
  id: string;
  janetHandoff: JanetHandoff | null;
  patientId: number | null;
  returningPatient: Partial<ReturningPatientFormData>;
  status: RemoteDraftStatus;
  syncedAt: string;
  uploadedDocumentTypes: UploadDocumentType[];
  visitId: number | null;
};

export type IntakeDraftResponse = {
  draft: IntakeDraftRecord;
  message: string;
  ok: boolean;
};

export type IntakeSubmitPayload = {
  draftId?: string | null;
  form: IntakeFormData;
  janetHandoff?: JanetHandoff | null;
  patientId?: number | null;
  returningPatient?: ReturningPatientFormData;
  uploads?: Partial<Record<UploadDocumentType, string | null>>;
  visitId?: number | null;
};

export type IntakeSubmitResponse = {
  confirmationCode: string | null;
  draftId: string | null;
  message: string;
  ok: boolean;
  patientId: number | null;
  status: string;
  submittedAt: string;
  visitId: number | null;
};

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

function readStep(value: unknown): IntakeStepKey {
  const normalized = readString(value);
  const fallback: IntakeStepKey = 'patientType';
  return intakeFlowSteps.some((step) => step.key === normalized)
    ? (normalized as IntakeStepKey)
    : fallback;
}

function normalizeUploadedTypes(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as UploadDocumentType[];
  }

  return value.filter(
    (entry): entry is UploadDocumentType =>
      entry === 'insurance' || entry === 'id',
  );
}

function normalizeDraftRecord(raw: unknown): IntakeDraftRecord {
  const record = readRecord(raw) ?? {};
  const form = readRecord(record.form) ?? {};
  const returningPatient = readRecord(
    record.returning_patient ?? record.returningPatient,
  ) ?? {};

  return {
    currentStep: readStep(record.current_step ?? record.currentStep),
    form: form as Partial<IntakeFormData>,
    id:
      readString(record.id) ??
      readString(record.draft_id) ??
      readString(record.draftId) ??
      '',
    janetHandoff:
      (readRecord(record.janet_handoff ?? record.janetHandoff) as JanetHandoff | null) ??
      null,
    patientId: readNumber(record.patient_id) ?? readNumber(record.patientId),
    returningPatient: returningPatient as Partial<ReturningPatientFormData>,
    status:
      readString(record.status) === 'submitted'
        ? 'submitted'
        : readString(record.status) === 'ready_for_review'
          ? 'ready_for_review'
          : 'draft',
    syncedAt:
      readString(record.synced_at) ??
      readString(record.last_synced_at) ??
      readString(record.syncedAt) ??
      new Date().toISOString(),
    uploadedDocumentTypes: normalizeUploadedTypes(
      record.uploaded_document_types ?? record.uploadedDocumentTypes,
    ),
    visitId: readNumber(record.visit_id) ?? readNumber(record.visitId),
  };
}

function normalizeDraftResponse(raw: unknown): IntakeDraftResponse {
  const record = readRecord(raw) ?? {};
  const draftSource = record.draft ?? raw;

  return {
    draft: normalizeDraftRecord(draftSource),
    message:
      readString(record.message) ?? 'The intake draft was synced successfully.',
    ok: record.ok !== false,
  };
}

function normalizeSubmitResponse(raw: unknown): IntakeSubmitResponse {
  const record = readRecord(raw) ?? {};

  return {
    confirmationCode:
      readString(record.confirmation_code) ??
      readString(record.confirmationCode),
    draftId: readString(record.draft_id) ?? readString(record.draftId),
    message:
      readString(record.message) ?? 'The intake was submitted successfully.',
    ok: record.ok !== false,
    patientId: readNumber(record.patient_id) ?? readNumber(record.patientId),
    status: readString(record.status) ?? 'submitted',
    submittedAt:
      readString(record.submitted_at) ??
      readString(record.submittedAt) ??
      new Date().toISOString(),
    visitId: readNumber(record.visit_id) ?? readNumber(record.visitId),
  };
}

function toRemoteDraftPayload(payload: IntakeDraftPayload) {
  return {
    current_step: payload.currentStep,
    draft_id: payload.draftId ?? null,
    form: payload.form,
    janet_handoff: payload.janetHandoff ?? null,
    patient_id: payload.patientId ?? null,
    returning_patient: payload.returningPatient ?? null,
    source: payload.source ?? 'mobile',
    uploads: payload.uploads ?? {},
    visit_id: payload.visitId ?? null,
  };
}

function toSubmitPayload(payload: IntakeSubmitPayload) {
  return {
    draft_id: payload.draftId ?? null,
    form: payload.form,
    janet_handoff: payload.janetHandoff ?? null,
    patient_id: payload.patientId ?? null,
    returning_patient: payload.returningPatient ?? null,
    uploads: payload.uploads ?? {},
    visit_id: payload.visitId ?? null,
  };
}

export async function saveIntakeDraft(payload: IntakeDraftPayload) {
  const response = await api.post<unknown>(
    '/api/intake/draft',
    toRemoteDraftPayload(payload),
  );

  return normalizeDraftResponse(response);
}

export async function updateIntakeDraft(
  draftId: string,
  payload: IntakeDraftPayload,
) {
  const response = await api.put<unknown>(
    `/api/intake/draft/${draftId}`,
    toRemoteDraftPayload(payload),
  );

  return normalizeDraftResponse(response);
}

export async function fetchIntakeDraft(draftId: string) {
  const response = await api.get<unknown>(`/api/intake/draft/${draftId}`);
  return normalizeDraftResponse(response);
}

export async function submitIntake(payload: IntakeSubmitPayload) {
  const response = await api.post<unknown>(
    '/api/intake/submit',
    toSubmitPayload(payload),
  );

  return normalizeSubmitResponse(response);
}
