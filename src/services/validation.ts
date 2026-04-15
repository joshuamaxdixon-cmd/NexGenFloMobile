import type { ApiFieldErrors } from './api';
import type {
  IntakeFormData,
  IntakeStepKey,
  ReturningPatientFormData,
} from './intake';

export type IntakeFieldErrors = Partial<Record<keyof IntakeFormData, string>>;
export type ReturningPatientFieldErrors = Partial<
  Record<keyof ReturningPatientFormData, string>
>;

export type ReviewReadiness = {
  blockers: string[];
  isReady: boolean;
  recommendations: string[];
};

function hasText(value: string) {
  return value.trim().length > 0;
}

function looksLikeDate(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  return (
    /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue) ||
    /^\d{2}\/\d{2}\/\d{4}$/.test(trimmedValue)
  );
}

function looksLikeEmail(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue);
}

function looksLikePhone(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return true;
  }

  const digitsOnly = trimmedValue.replace(/\D/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

function firstFieldError(
  fieldErrors: ApiFieldErrors | null,
  ...keys: string[]
): string | undefined {
  if (!fieldErrors) {
    return undefined;
  }

  for (const key of keys) {
    const message = fieldErrors[key]?.[0];
    if (message) {
      return message;
    }
  }

  return undefined;
}

export function validateReturningPatientForm(
  form: ReturningPatientFormData,
): ReturningPatientFieldErrors {
  const errors: ReturningPatientFieldErrors = {};

  if (!hasText(form.firstName)) {
    errors.firstName = 'First name is required.';
  }
  if (!hasText(form.lastName)) {
    errors.lastName = 'Last name is required.';
  }
  if (!hasText(form.dateOfBirth)) {
    errors.dateOfBirth = 'Date of birth is required.';
  } else if (!looksLikeDate(form.dateOfBirth)) {
    errors.dateOfBirth = 'Use MM/DD/YYYY or YYYY-MM-DD.';
  }
  if (hasText(form.phoneNumber) && !looksLikePhone(form.phoneNumber)) {
    errors.phoneNumber = 'Enter a valid phone number.';
  }

  return errors;
}

export function validateIntakeStep(
  step: IntakeStepKey,
  form: IntakeFormData,
): IntakeFieldErrors {
  const errors: IntakeFieldErrors = {};

  if (step === 'patientType' && !hasText(form.patientType)) {
    errors.patientType = 'Choose the patient profile for this visit.';
  }

  if (step === 'basicInfo' || step === 'review') {
    if (!hasText(form.firstName)) {
      errors.firstName = 'First name is required.';
    }
    if (!hasText(form.lastName)) {
      errors.lastName = 'Last name is required.';
    }
    if (!hasText(form.dateOfBirth)) {
      errors.dateOfBirth = 'Date of birth is required.';
    } else if (!looksLikeDate(form.dateOfBirth)) {
      errors.dateOfBirth = 'Use MM/DD/YYYY or YYYY-MM-DD.';
    }
    if (hasText(form.phoneNumber) && !looksLikePhone(form.phoneNumber)) {
      errors.phoneNumber = 'Enter a valid phone number.';
    }
    if (!looksLikeEmail(form.email)) {
      errors.email = 'Enter a valid email address.';
    }
  }

  if (step === 'symptoms' || step === 'review') {
    if (!hasText(form.chiefConcern)) {
      errors.chiefConcern = 'Chief concern is required.';
    }
    if (!hasText(form.symptomDuration)) {
      errors.symptomDuration = 'Symptom duration is required.';
    }
  }

  if (step === 'insurance' || step === 'review') {
    if (!hasText(form.insuranceProvider)) {
      errors.insuranceProvider = 'Insurance provider is required.';
    }
    if (!hasText(form.memberId)) {
      errors.memberId = 'Member ID is required.';
    }
  }

  return errors;
}

export function mapApiFieldErrorsToReturningPatientFields(
  fieldErrors: ApiFieldErrors | null,
): ReturningPatientFieldErrors {
  return {
    firstName: firstFieldError(fieldErrors, 'first_name', 'firstName'),
    lastName: firstFieldError(fieldErrors, 'last_name', 'lastName'),
    dateOfBirth: firstFieldError(
      fieldErrors,
      'date_of_birth',
      'dateOfBirth',
    ),
    phoneNumber: firstFieldError(
      fieldErrors,
      'phone_number',
      'phoneNumber',
      'phone',
    ),
  };
}

export function mapApiFieldErrorsToIntakeFields(
  fieldErrors: ApiFieldErrors | null,
): IntakeFieldErrors {
  return {
    patientType: firstFieldError(fieldErrors, 'patient_type', 'patientType'),
    firstName: firstFieldError(fieldErrors, 'first_name', 'firstName'),
    lastName: firstFieldError(fieldErrors, 'last_name', 'lastName'),
    dateOfBirth: firstFieldError(
      fieldErrors,
      'date_of_birth',
      'dateOfBirth',
    ),
    phoneNumber: firstFieldError(
      fieldErrors,
      'phone_number',
      'phoneNumber',
      'phone',
    ),
    email: firstFieldError(fieldErrors, 'email'),
    chiefConcern: firstFieldError(
      fieldErrors,
      'chief_concern',
      'chiefConcern',
      'reason_for_visit',
    ),
    symptomDuration: firstFieldError(
      fieldErrors,
      'symptom_duration',
      'symptomDuration',
      'duration',
    ),
    painLevel: firstFieldError(fieldErrors, 'pain_level', 'painLevel'),
    insuranceProvider: firstFieldError(
      fieldErrors,
      'insurance_provider',
      'insuranceProvider',
      'provider_name',
    ),
    memberId: firstFieldError(fieldErrors, 'member_id', 'memberId'),
    groupNumber: firstFieldError(fieldErrors, 'group_number', 'groupNumber'),
    subscriberName: firstFieldError(
      fieldErrors,
      'subscriber_name',
      'subscriberName',
      'policy_holder_name',
    ),
  };
}

export function getReviewReadiness(options: {
  backendDraftStatus: 'error' | 'local-only' | 'synced' | 'syncing';
  form: IntakeFormData;
  hasGovernmentIdUpload: boolean;
  hasInsuranceUpload: boolean;
}) {
  const fieldErrors = validateIntakeStep('review', options.form);
  const blockers = Object.values(fieldErrors).filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  const recommendations: string[] = [];

  if (!options.hasInsuranceUpload) {
    recommendations.push(
      'Insurance card image is still missing from the document workflow.',
    );
  }
  if (!options.hasGovernmentIdUpload) {
    recommendations.push(
      'Government ID image is not attached yet for identity review.',
    );
  }
  if (options.backendDraftStatus === 'local-only') {
    recommendations.push(
      'Draft is stored locally only. Submitting will try to create or refresh the backend draft first.',
    );
  }
  if (options.backendDraftStatus === 'error') {
    recommendations.push(
      'Backend draft sync needs attention. Review the sync message before submitting again.',
    );
  }

  return {
    blockers,
    isReady: blockers.length === 0,
    recommendations,
  } satisfies ReviewReadiness;
}
