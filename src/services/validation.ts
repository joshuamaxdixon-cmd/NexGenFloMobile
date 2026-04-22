import type { ApiFieldErrors } from './api';
import type {
  IntakeFormData,
  IntakeStepKey,
  ReturningPatientFormData,
} from './intake';
import { buildPastMedicalHistoryEntries } from './intake';

export type IntakeFieldErrors = Partial<Record<keyof IntakeFormData, string>>;
export type ReturningPatientFieldErrors = Partial<
  Record<keyof ReturningPatientFormData, string>
>;

export type ReviewReadiness = {
  blockers: string[];
  isReady: boolean;
  recommendations: {
    action: 'basicInfo' | 'documents' | 'pastMedicalHistory' | 'symptoms';
    message: string;
  }[];
};

function hasText(value: string) {
  return value.trim().length > 0;
}

function hasCompletePatientType(value: string) {
  return [
    'New patient',
    'Returning patient',
    'Dependent / family member',
    'Self pay',
  ].includes(value.trim());
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

  if (
    (step === 'patientType' || step === 'basicInfo' || step === 'review') &&
    !hasCompletePatientType(form.patientType)
  ) {
    errors.patientType = 'Choose who this visit is for and how they are checking in.';
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
    if (
      hasText(form.emergencyContactName) &&
      !hasText(form.emergencyContactPhone)
    ) {
      errors.emergencyContactPhone =
        'Add an emergency contact phone number or clear the contact.';
    }
    if (
      hasText(form.emergencyContactPhone) &&
      !hasText(form.emergencyContactName)
    ) {
      errors.emergencyContactName =
        'Add an emergency contact name or clear the phone number.';
    }
    if (
      hasText(form.emergencyContactPhone) &&
      !looksLikePhone(form.emergencyContactPhone)
    ) {
      errors.emergencyContactPhone = 'Enter a valid emergency contact phone number.';
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
    gender: firstFieldError(fieldErrors, 'gender', 'sex'),
    emergencyContactName: firstFieldError(
      fieldErrors,
      'emergency_contact_name',
      'emergencyContactName',
    ),
    emergencyContactPhone: firstFieldError(
      fieldErrors,
      'emergency_contact_phone',
      'emergencyContactPhone',
    ),
    heightFt: firstFieldError(fieldErrors, 'height_ft', 'heightFt'),
    heightIn: firstFieldError(fieldErrors, 'height_in', 'heightIn'),
    weightLb: firstFieldError(fieldErrors, 'weight_lb', 'weightLb'),
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
    medicalConditions: firstFieldError(
      fieldErrors,
      'conditions',
      'medical_conditions',
      'medicalConditions',
    ),
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
  const pastMedicalHistory = buildPastMedicalHistoryEntries(options.form);
  const blockers = Object.values(fieldErrors).filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  const recommendations: ReviewReadiness['recommendations'] = [];
  const pushRecommendation = (
    action: 'basicInfo' | 'documents' | 'pastMedicalHistory' | 'symptoms',
    message: string,
  ) => {
    if (recommendations.some((item) => item.message === message)) {
      return;
    }
    recommendations.push({ action, message });
  };

  if (!options.hasInsuranceUpload) {
    pushRecommendation(
      'documents',
      'Insurance card has not been added.',
    );
  }
  if (!options.hasGovernmentIdUpload) {
    pushRecommendation(
      'documents',
      'Photo ID has not been added.',
    );
  }
  if (
    !hasText(options.form.emergencyContactName) ||
    !hasText(options.form.emergencyContactPhone)
  ) {
    pushRecommendation(
      'basicInfo',
      'Emergency contact is still missing. Adding it now reduces provider completion delays later.',
    );
  }
  if (!hasText(options.form.heightFt) && !hasText(options.form.heightIn)) {
    pushRecommendation(
      'basicInfo',
      'Height is still blank. Add it now if staff will need vitals from intake.',
    );
  }
  if (!hasText(options.form.weightLb)) {
    pushRecommendation(
      'basicInfo',
      'Weight is still blank. Add it now if staff will need vitals from intake.',
    );
  }
  if (!hasText(options.form.medications)) {
    pushRecommendation(
      'symptoms',
      'No medications have been entered yet. Add them now if the patient knows what they take.',
    );
  }
  if (hasText(options.form.medications) && !hasText(options.form.pharmacy)) {
    pushRecommendation(
      'symptoms',
      'Preferred pharmacy is still missing.',
    );
  }
  if (hasText(options.form.medications) && !hasText(options.form.lastDose)) {
    pushRecommendation(
      'symptoms',
      'Last dose is still missing.',
    );
  }
  if (!hasText(options.form.allergies)) {
    pushRecommendation(
      'symptoms',
      'No allergies are listed yet. If there are none, staff can confirm that during review.',
    );
  }
  if (hasText(options.form.allergies) && !hasText(options.form.allergyReaction)) {
    pushRecommendation(
      'symptoms',
      'Reaction details are still missing for the listed allergies.',
    );
  }
  if (hasText(options.form.allergies) && !hasText(options.form.allergyNotes)) {
    pushRecommendation(
      'symptoms',
      'Safety notes are still missing for the listed allergies.',
    );
  }
  if (
    pastMedicalHistory.chronic.length === 0 &&
    pastMedicalHistory.surgical.length === 0 &&
    pastMedicalHistory.otherRelevant.length === 0 &&
    pastMedicalHistory.additionalNotes.length === 0
  ) {
    pushRecommendation(
      'pastMedicalHistory',
      'Medical history or conditions are still blank. A short summary here can prevent provider follow-up questions.',
    );
  }
  if (!hasText(options.form.painLevel)) {
    pushRecommendation(
      'symptoms',
      'Severity is still blank.',
    );
  }

  return {
    blockers,
    isReady: blockers.length === 0,
    recommendations,
  } satisfies ReviewReadiness;
}
