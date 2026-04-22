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
  | 'documents'
  | 'review';

export type IntakeFormData = {
  patientType: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  heightFt: string;
  heightIn: string;
  weightLb: string;
  phoneNumber: string;
  email: string;
  chiefConcern: string;
  symptomDuration: string;
  painLevel: string;
  symptomNotes: string;
  medications: string;
  pharmacy: string;
  lastDose: string;
  medicalConditions: string;
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
    key: 'basicInfo',
    title: 'Patient Info',
    subtitle: 'Enter the patient details to begin check-in.',
  },
  {
    key: 'symptoms',
    title: 'Medical Info',
    subtitle: 'Add the health details that matter for today.',
  },
  {
    key: 'review',
    title: 'Review & Confirm',
    subtitle: 'Confirm the information before optional uploads.',
  },
  {
    key: 'documents',
    title: 'Add Documents (Optional)',
    subtitle: 'Add documents now, or skip and finish your check-in.',
  },
] as const satisfies readonly {
  key: IntakeStepKey;
  title: string;
  subtitle: string;
}[];

export const patientTypeOptions = [
  {
    value: 'myself',
    label: 'Myself',
    description: 'I am checking in for my own visit today.',
  },
  {
    value: 'someone_else',
    label: 'Someone else',
    description: 'I am helping a child or family member with their visit.',
  },
] as const;

export const patientHistoryOptions = [
  {
    value: 'new',
    label: 'This is my first visit',
    description: 'Use the full guided intake for a new patient visit.',
  },
  {
    value: 'returning',
    label: 'I have been here before',
    description: 'Mark this as a returning patient visit.',
  },
  {
    value: 'self_pay',
    label: 'I am paying without insurance',
    description: 'Keep the visit moving even if this will be self-pay.',
  },
] as const;

function normalizeDigitsOnly(value: string, maxLength: number) {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

function formatPhoneNumber(value: string) {
  const digits = normalizeDigitsOnly(value, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function normalizeWeightInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const sanitized = trimmed.replace(/[^\d.]/g, '');
  const [whole = '', ...rest] = sanitized.split('.');
  const fraction = rest.join('').slice(0, 1);
  const normalizedWhole = whole.slice(0, 4);

  if (!sanitized.includes('.')) {
    return normalizedWhole;
  }

  return fraction.length > 0 ? `${normalizedWhole}.${fraction}` : `${normalizedWhole}.`;
}

export function formatDateInput(value: string) {
  const digits = normalizeDigitsOnly(value, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function normalizeDateDisplay(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    return `${month}/${day}/${year}`;
  }

  return formatDateInput(trimmed);
}

export function normalizeIntakeFormFields(
  values: Partial<IntakeFormData>,
): Partial<IntakeFormData> {
  const nextValues = { ...values };

  if (typeof nextValues.dateOfBirth === 'string') {
    nextValues.dateOfBirth = normalizeDateDisplay(nextValues.dateOfBirth);
  }
  if (typeof nextValues.phoneNumber === 'string') {
    nextValues.phoneNumber = formatPhoneNumber(nextValues.phoneNumber);
  }
  if (typeof nextValues.emergencyContactPhone === 'string') {
    nextValues.emergencyContactPhone = formatPhoneNumber(
      nextValues.emergencyContactPhone,
    );
  }
  if (typeof nextValues.gender === 'string') {
    const normalizedGender = nextValues.gender.trim().toLowerCase();
    nextValues.gender =
      normalizedGender === 'male' || normalizedGender === 'female'
        ? normalizedGender
        : '';
  }
  if (typeof nextValues.heightFt === 'string') {
    nextValues.heightFt = normalizeDigitsOnly(nextValues.heightFt, 2);
  }
  if (typeof nextValues.heightIn === 'string') {
    nextValues.heightIn = normalizeDigitsOnly(nextValues.heightIn, 2);
  }
  if (typeof nextValues.weightLb === 'string') {
    nextValues.weightLb = normalizeWeightInput(nextValues.weightLb);
  }

  return nextValues;
}

export function normalizeReturningPatientFields(
  values: Partial<ReturningPatientFormData>,
): Partial<ReturningPatientFormData> {
  const nextValues = { ...values };

  if (typeof nextValues.dateOfBirth === 'string') {
    nextValues.dateOfBirth = normalizeDateDisplay(nextValues.dateOfBirth);
  }
  if (typeof nextValues.phoneNumber === 'string') {
    nextValues.phoneNumber = formatPhoneNumber(nextValues.phoneNumber);
  }

  return nextValues;
}

export function createInitialIntakeForm(): IntakeFormData {
  return {
    patientType: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    heightFt: '',
    heightIn: '',
    weightLb: '',
    phoneNumber: '',
    email: '',
    chiefConcern: '',
    symptomDuration: '',
    painLevel: '',
    symptomNotes: '',
    medications: '',
    pharmacy: '',
    lastDose: '',
    medicalConditions: '',
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
  const fallback: IntakeStepKey = 'basicInfo';
  if (normalized === 'patientType') {
    return 'basicInfo';
  }
  if (
    normalized === 'medications' ||
    normalized === 'allergies' ||
    normalized === 'insurance'
  ) {
    return 'symptoms';
  }
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
    form: normalizeIntakeFormFields(form as Partial<IntakeFormData>),
    id:
      readString(record.id) ??
      readString(record.draft_id) ??
      readString(record.draftId) ??
      '',
    janetHandoff:
      (readRecord(record.janet_handoff ?? record.janetHandoff) as JanetHandoff | null) ??
      null,
    patientId: readNumber(record.patient_id) ?? readNumber(record.patientId),
    returningPatient: normalizeReturningPatientFields(
      returningPatient as Partial<ReturningPatientFormData>,
    ),
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
