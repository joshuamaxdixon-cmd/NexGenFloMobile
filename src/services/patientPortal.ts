import { api } from './api';
import { formatDateInput, type IntakeFormData } from './intake';

export type PatientPortalPatient = {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  phone: string;
  email: string;
  profileImageUrl: string;
  avatarInitials: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

export type PatientPortalMedicalHistory = {
  sex: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  allergies: string;
  medications: string;
  medicalConditions: string;
  surgeries: string;
  immunizations: string;
  currentVisitReason: string;
};

export type PatientPortalVisit = {
  id: number;
  status: string;
  statusLabel: string;
  reasonForVisit: string;
  symptomDuration: string;
  symptomSeverity: string;
  updatedAt: string | null;
};

export type PatientPortalAccount = {
  id: number;
  email: string;
  lastLoginAt: string | null;
};

export type PatientPortalSummary = {
  patient: PatientPortalPatient;
  portalAccount: PatientPortalAccount;
  medicalHistory: PatientPortalMedicalHistory;
  activeVisit: PatientPortalVisit | null;
  hasBlockingNonportalVisit: boolean;
  hasUnfinishedCheckIn: boolean;
};

export type PatientPortalLoginForm = {
  email: string;
  dateOfBirth: string;
};

export type PatientPortalProfileUpdate = {
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
};

export type PatientPortalCheckInUpdate = {
  reasonForVisit: string;
  symptomDuration: string;
  symptomSeverity: string;
};

export type PatientPortalPhotoAsset = {
  name: string;
  type: string;
  uri: string;
};

function readRecord(value: unknown) {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function readBoolean(value: unknown) {
  return value === true;
}

function readNumber(value: unknown) {
  return typeof value === 'number' ? value : null;
}

function normalizePatient(value: unknown): PatientPortalPatient {
  const record = readRecord(value) ?? {};

  return {
    id: readNumber(record.id) ?? 0,
    fullName: readString(record.fullName),
    firstName: readString(record.firstName),
    lastName: readString(record.lastName),
    dateOfBirth: formatDateInput(readString(record.dateOfBirth)),
    sex: readString(record.sex),
    phone: readString(record.phone),
    email: readString(record.email),
    profileImageUrl: readString(record.profileImageUrl),
    avatarInitials: readString(record.avatarInitials),
    addressLine1: readString(record.addressLine1),
    addressLine2: readString(record.addressLine2),
    city: readString(record.city),
    state: readString(record.state),
    zipCode: readString(record.zipCode),
    emergencyContactName: readString(record.emergencyContactName),
    emergencyContactPhone: readString(record.emergencyContactPhone),
  };
}

function normalizeMedicalHistory(value: unknown): PatientPortalMedicalHistory {
  const record = readRecord(value) ?? {};

  return {
    sex: readString(record.sex),
    emergencyContactName: readString(record.emergencyContactName),
    emergencyContactPhone: readString(record.emergencyContactPhone),
    allergies: readString(record.allergies),
    medications: readString(record.medications),
    medicalConditions: readString(record.medicalConditions),
    surgeries: readString(record.surgeries),
    immunizations: readString(record.immunizations),
    currentVisitReason: readString(record.currentVisitReason),
  };
}

function normalizeVisit(value: unknown): PatientPortalVisit | null {
  const record = readRecord(value);
  if (!record || typeof record.id !== 'number') {
    return null;
  }

  return {
    id: record.id,
    status: readString(record.status),
    statusLabel: readString(record.statusLabel),
    reasonForVisit: readString(record.reasonForVisit),
    symptomDuration: readString(record.symptomDuration),
    symptomSeverity: readString(record.symptomSeverity),
    updatedAt: readString(record.updatedAt) || null,
  };
}

function normalizePortalSummary(value: unknown): PatientPortalSummary {
  const record = readRecord(value) ?? {};
  const account = readRecord(record.portalAccount) ?? {};

  return {
    patient: normalizePatient(record.patient),
    portalAccount: {
      id: readNumber(account.id) ?? 0,
      email: readString(account.email),
      lastLoginAt: readString(account.lastLoginAt) || null,
    },
    medicalHistory: normalizeMedicalHistory(record.medicalHistory),
    activeVisit: normalizeVisit(record.activeVisit),
    hasBlockingNonportalVisit: readBoolean(record.hasBlockingNonportalVisit),
    hasUnfinishedCheckIn: readBoolean(record.hasUnfinishedCheckIn),
  };
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function patientPortalLogin(form: PatientPortalLoginForm) {
  const response = await api.post<unknown>('/patient-portal/login', {
    email: form.email.trim(),
    dateOfBirth: form.dateOfBirth.trim(),
  });
  const record = readRecord(response) ?? {};

  return {
    message: readString(record.message),
    token: readString(record.token),
    portal: normalizePortalSummary(record.portal),
  };
}

export async function fetchPatientPortalSession(token: string) {
  const response = await api.get<unknown>('/patient-portal/session', {
    headers: authHeaders(token),
  });
  const record = readRecord(response) ?? {};

  return {
    message: readString(record.message),
    portal: normalizePortalSummary(record.portal),
  };
}

export async function logoutPatientPortal(token: string) {
  return api.post<unknown>('/patient-portal/logout', undefined, {
    headers: authHeaders(token),
  });
}

export async function updatePatientPortalProfile(
  token: string,
  payload: PatientPortalProfileUpdate,
) {
  const response = await api.put<unknown>('/patient-portal/profile', payload, {
    headers: authHeaders(token),
  });
  const record = readRecord(response) ?? {};

  return {
    message: readString(record.message),
    portal: normalizePortalSummary(record.portal),
  };
}

export async function uploadPatientPortalProfilePhoto(
  token: string,
  asset: PatientPortalPhotoAsset,
) {
  const formData = new FormData();
  formData.append('file', asset as unknown as Blob);

  const response = await api.post<unknown>('/patient-portal/profile/photo', formData, {
    headers: authHeaders(token),
  });
  const record = readRecord(response) ?? {};

  return {
    message: readString(record.message),
    portal: normalizePortalSummary(record.portal),
  };
}

export async function updatePatientPortalMedicalHistory(
  token: string,
  payload: PatientPortalMedicalHistory,
) {
  const response = await api.put<unknown>('/patient-portal/medical-history', payload, {
    headers: authHeaders(token),
  });
  const record = readRecord(response) ?? {};

  return {
    message: readString(record.message),
    portal: normalizePortalSummary(record.portal),
  };
}

export async function startPatientPortalCheckIn(token: string) {
  const response = await api.post<unknown>('/patient-portal/check-in/start', undefined, {
    headers: authHeaders(token),
  });
  const record = readRecord(response) ?? {};

  return {
    message: readString(record.message),
    portal: normalizePortalSummary(record.portal),
    visit: normalizeVisit(record.visit),
  };
}

export async function updatePatientPortalCheckIn(
  token: string,
  visitId: number,
  payload: PatientPortalCheckInUpdate,
) {
  const response = await api.put<unknown>(`/patient-portal/check-in/${visitId}`, payload, {
    headers: authHeaders(token),
  });
  const record = readRecord(response) ?? {};

  return {
    message: readString(record.message),
    portal: normalizePortalSummary(record.portal),
    visit: normalizeVisit(record.visit),
  };
}

export function buildPortalIntakePrefill(
  portal: PatientPortalSummary,
): Partial<IntakeFormData> {
  return {
    firstName: portal.patient.firstName,
    lastName: portal.patient.lastName,
    dateOfBirth: portal.patient.dateOfBirth,
    gender: portal.patient.sex,
    phoneNumber: portal.patient.phone,
    email: portal.patient.email,
    emergencyContactName: portal.patient.emergencyContactName,
    emergencyContactPhone: portal.patient.emergencyContactPhone,
    allergies: portal.medicalHistory.allergies,
    medications: portal.medicalHistory.medications,
    medicalConditions: portal.medicalHistory.medicalConditions,
    immunizations: portal.medicalHistory.immunizations,
    chiefConcern: portal.activeVisit?.reasonForVisit || portal.medicalHistory.currentVisitReason,
    symptomDuration: portal.activeVisit?.symptomDuration || '',
    painLevel: portal.activeVisit?.symptomSeverity || '',
  };
}
