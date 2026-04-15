import {
  normalizeDateDisplay,
  type IntakeFormData,
  type ReturningPatientFormData,
} from './intake';
import { api } from './api';

export type PatientLookupMatchStatus =
  | 'ambiguous_match'
  | 'likely_match'
  | 'no_match';

export type PatientLookupRequest = {
  dateOfBirth: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
};

export type PatientLookupResumeContext = {
  buttonLabel: string;
  headline: string;
  kind: 'patient' | 'visit';
  lastUpdatedLabel: string | null;
  nextStepNote: string | null;
  prompt: string | null;
  reasonForVisit: string | null;
  statusLabel: string | null;
  visitId: number | null;
};

export type ReturningPatientMemoryStep = {
  fieldKey: string;
  items: string[];
  label: string;
  prompt: string;
};

export type ReturningPatientMemoryContext = {
  lastVisitReason: string | null;
  phoneOnFile: string | null;
  steps: ReturningPatientMemoryStep[];
  welcomeMessage: string | null;
};

export type PatientLookupSummary = {
  dateOfBirth: string;
  emailHint: string | null;
  firstName: string;
  fullName: string;
  id: number;
  lastName: string;
  phoneHint: string | null;
  ptIdn: string | null;
};

export type PatientLookupResponse = {
  candidates: PatientLookupSummary[];
  draftId: string | null;
  matchStatus: PatientLookupMatchStatus;
  memoryContext: ReturningPatientMemoryContext | null;
  message: string;
  patient: PatientLookupSummary | null;
  resumeContext: PatientLookupResumeContext | null;
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

function normalizePatientSummary(value: unknown): PatientLookupSummary | null {
  const record = readRecord(value);

  if (!record || typeof record.id !== 'number') {
    return null;
  }

  const firstName =
    readString(record.first_name) ?? readString(record.firstName) ?? '';
  const lastName =
    readString(record.last_name) ?? readString(record.lastName) ?? '';

  return {
    dateOfBirth:
      normalizeDateDisplay(
        readString(record.date_of_birth) ??
          readString(record.dateOfBirth) ??
          '',
      ),
    emailHint:
      readString(record.email_hint) ?? readString(record.emailHint) ?? null,
    firstName,
    fullName:
      readString(record.full_name) ??
      readString(record.fullName) ??
      `${firstName} ${lastName}`.trim(),
    id: record.id,
    lastName,
    phoneHint:
      readString(record.phone_hint) ?? readString(record.phoneHint) ?? null,
    ptIdn: readString(record.pt_idn) ?? readString(record.ptIdn) ?? null,
  };
}

function normalizeResumeContext(value: unknown): PatientLookupResumeContext | null {
  const record = readRecord(value);

  if (!record) {
    return null;
  }

  const kind = readString(record.kind);

  if (kind !== 'patient' && kind !== 'visit') {
    return null;
  }

  return {
    buttonLabel:
      readString(record.button_label) ?? readString(record.buttonLabel) ?? '',
    headline: readString(record.headline) ?? '',
    kind,
    lastUpdatedLabel:
      readString(record.last_updated_label) ??
      readString(record.lastUpdatedLabel),
    nextStepNote:
      readString(record.next_step_note) ?? readString(record.nextStepNote),
    prompt: readString(record.prompt),
    reasonForVisit:
      readString(record.reason_for_visit) ?? readString(record.reasonForVisit),
    statusLabel:
      readString(record.status_label) ?? readString(record.statusLabel),
    visitId: readNumber(record.visit_id) ?? readNumber(record.visitId),
  };
}

function normalizeMemoryContext(value: unknown): ReturningPatientMemoryContext | null {
  const record = readRecord(value);

  if (!record) {
    return null;
  }

  const stepsValue = Array.isArray(record.steps) ? record.steps : [];
  const steps = stepsValue
    .map((entry) => {
      const step = readRecord(entry);

      if (!step) {
        return null;
      }

      const items = Array.isArray(step.items)
        ? step.items.filter((item): item is string => typeof item === 'string')
        : [];

      return {
        fieldKey:
          readString(step.field_key) ?? readString(step.fieldKey) ?? '',
        items,
        label: readString(step.label) ?? '',
        prompt: readString(step.prompt) ?? '',
      } satisfies ReturningPatientMemoryStep;
    })
    .filter((entry): entry is ReturningPatientMemoryStep => entry !== null);

  return {
    lastVisitReason:
      readString(record.last_visit_reason) ?? readString(record.lastVisitReason),
    phoneOnFile:
      readString(record.phone_on_file) ?? readString(record.phoneOnFile),
    steps,
    welcomeMessage:
      readString(record.welcome_message) ?? readString(record.welcomeMessage),
  };
}

function normalizeLookupResponse(raw: unknown): PatientLookupResponse {
  const record = readRecord(raw) ?? {};
  const patient = normalizePatientSummary(record.patient);
  const candidatesValue = Array.isArray(record.candidates) ? record.candidates : [];
  const candidates = candidatesValue
    .map(normalizePatientSummary)
    .filter((candidate): candidate is PatientLookupSummary => candidate !== null);
  const matchStatus =
    readString(record.match_status) ?? readString(record.matchStatus) ?? 'no_match';

  return {
    candidates,
    draftId: readString(record.draft_id) ?? readString(record.draftId),
    matchStatus:
      matchStatus === 'likely_match' || matchStatus === 'ambiguous_match'
        ? matchStatus
        : 'no_match',
    memoryContext: normalizeMemoryContext(
      record.memory_context ?? record.memoryContext,
    ),
    message:
      readString(record.message) ??
      (patient
        ? 'Returning patient found.'
        : 'No patient match was found for those details.'),
    patient,
    resumeContext: normalizeResumeContext(
      record.resume_context ?? record.resumeContext,
    ),
    visitId: readNumber(record.visit_id) ?? readNumber(record.visitId),
  };
}

export function buildLookupPrefill(
  returningForm: ReturningPatientFormData,
  lookupResponse: PatientLookupResponse,
): Partial<IntakeFormData> {
  const patient = lookupResponse.patient;

  return {
    patientType: 'Returning patient',
    firstName: patient?.firstName ?? returningForm.firstName,
    lastName: patient?.lastName ?? returningForm.lastName,
    dateOfBirth: normalizeDateDisplay(
      patient?.dateOfBirth ?? returningForm.dateOfBirth,
    ),
    phoneNumber: returningForm.phoneNumber,
    chiefConcern: lookupResponse.resumeContext?.reasonForVisit ?? '',
  };
}

export async function lookupReturningPatient(payload: PatientLookupRequest) {
  const response = await api.post<unknown>('/api/patients/lookup', {
    date_of_birth: payload.dateOfBirth,
    first_name: payload.firstName,
    last_name: payload.lastName,
    phone: payload.phoneNumber?.trim() ?? '',
  });

  return normalizeLookupResponse(response);
}
