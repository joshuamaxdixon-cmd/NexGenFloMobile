import { api } from './api';
import type { JanetHandoff } from './janet';
import type { UploadDocumentType } from './uploads';

export type IntakeLaunchMode = 'intake' | 'returning';

export type IntakeStepKey =
  | 'basicInfo'
  | 'symptoms'
  | 'pastMedicalHistory'
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
  immunizations: string;
  medicalInfoHydrated: boolean;
  allergyMedicationSelections: string[];
  allergyMaterialSelections: string[];
  allergyFoodSelections: string[];
  allergyEnvironmentalSelections: string[];
  immunizationCoreSelections: string[];
  immunizationRoutineSelections: string[];
  immunizationTravelSelections: string[];
  immunizationUnknownSelections: string[];
  pastMedicalHistoryHydrated: boolean;
  pastMedicalHistoryChronicConditions: string[];
  pastMedicalHistorySurgicalHistory: string[];
  pastMedicalHistoryOtherRelevantHistory: string[];
  pastMedicalHistoryOtherMentalHealthCondition: string;
  pastMedicalHistoryOtherSurgery: string;
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
    title: 'Patient Information',
    subtitle: 'Enter the patient details to begin check-in.',
  },
  {
    key: 'symptoms',
    title: 'Medical Info',
    subtitle: 'Add the health details that matter for today.',
  },
  {
    key: 'pastMedicalHistory',
    title: 'Past Medical History',
    subtitle: 'Select any conditions or history that apply.',
  },
  {
    key: 'documents',
    title: 'Add Documents',
    subtitle: 'Upload documents now or skip and finish check-in.',
  },
  {
    key: 'review',
    title: 'Review & Confirm',
    subtitle: 'Confirm the information before you submit check-in.',
  },
] as const satisfies readonly {
  key: IntakeStepKey;
  title: string;
  subtitle: string;
}[];

export const janetStepFieldOrder = {
  basicInfo: [
    'firstName',
    'lastName',
    'dateOfBirth',
    'heightFt',
    'heightIn',
    'weightLb',
    'gender',
    'phoneNumber',
    'email',
    'emergencyContactName',
    'emergencyContactPhone',
  ],
  symptoms: [
    'allergyMedicationSelections',
    'allergyMaterialSelections',
    'allergyFoodSelections',
    'allergyEnvironmentalSelections',
    'medications',
    'pharmacy',
    'lastDose',
    'immunizationCoreSelections',
    'immunizationRoutineSelections',
    'immunizationTravelSelections',
    'chiefConcern',
    'symptomDuration',
    'painLevel',
    'symptomNotes',
  ],
  pastMedicalHistory: [
    'pastMedicalHistoryChronicConditions',
    'pastMedicalHistorySurgicalHistory',
    'pastMedicalHistoryOtherRelevantHistory',
  ],
  documents: [
    'insuranceProvider',
    'memberId',
    'groupNumber',
    'subscriberName',
  ],
  review: [],
} as const satisfies Record<
  (typeof intakeFlowSteps)[number]['key'],
  readonly (keyof IntakeFormData)[]
>;

export type JanetActiveFieldKey =
  (typeof janetStepFieldOrder)[keyof typeof janetStepFieldOrder][number];
type JanetConfigStepKey = keyof typeof janetStepFieldOrder;

const JANET_FIELD_METADATA = {
  firstName: {
    hints: ['first name', 'given name'],
    label: 'first name',
    prompt: {
      en: 'What is your first name?',
      es: '¿Cuál es tu nombre?',
    },
    title: 'First Name',
  },
  lastName: {
    hints: ['last name', 'family name'],
    label: 'last name',
    prompt: {
      en: 'What is your last name?',
      es: '¿Cuál es tu apellido?',
    },
    title: 'Last Name',
  },
  dateOfBirth: {
    hints: ['date of birth', 'birthday', 'month day year'],
    label: 'date of birth',
    prompt: {
      en: 'What is your date of birth?',
      es: '¿Cuál es tu fecha de nacimiento?',
    },
    title: 'Date of Birth',
  },
  heightFt: {
    hints: ['height', 'feet tall', 'how tall'],
    label: 'height in feet',
    prompt: {
      en: 'What is your height?',
      es: '¿Cuál es tu estatura?',
    },
    title: 'Height (ft)',
  },
  heightIn: {
    hints: ['height inches', 'remaining inches'],
    label: 'height in inches',
    prompt: {
      en: 'How many additional inches should I add?',
      es: '¿Cuántas pulgadas adicionales debo agregar?',
    },
    title: 'Height (in)',
  },
  weightLb: {
    hints: ['weight', 'pounds'],
    label: 'weight',
    prompt: {
      en: 'What is your weight?',
      es: '¿Cuál es tu peso?',
    },
    title: 'Weight',
  },
  gender: {
    hints: ['male', 'female', 'other', 'sex'],
    label: 'gender',
    prompt: {
      en: 'What is your gender?',
      es: '¿Cuál es tu género?',
    },
    title: 'Gender',
  },
  phoneNumber: {
    hints: ['phone number', 'cell phone', 'area code'],
    label: 'phone number',
    prompt: {
      en: 'What is your phone number?',
      es: '¿Cuál es tu número de teléfono?',
    },
    title: 'Phone Number',
  },
  email: {
    hints: ['email', 'email address'],
    label: 'email address',
    prompt: {
      en: 'What is your email address?',
      es: '¿Cuál es tu correo electrónico?',
    },
    title: 'Email',
  },
  emergencyContactName: {
    hints: ['emergency contact', 'contact name', 'spouse', 'parent', 'friend'],
    label: 'emergency contact name',
    prompt: {
      en: 'Who should we list as your emergency contact?',
      es: '¿A quién debemos poner como contacto de emergencia?',
    },
    title: 'Emergency Contact',
  },
  emergencyContactPhone: {
    hints: ['emergency contact phone', 'phone number', 'cell phone'],
    label: 'emergency contact phone',
    prompt: {
      en: 'What is your emergency contact’s phone number?',
      es: '¿Cuál es el número de teléfono de tu contacto de emergencia?',
    },
    title: 'Emergency Contact Phone',
  },
  allergyMedicationSelections: {
    hints: ['medication allergies', 'allergy medicine', 'penicillin', 'none'],
    label: 'medication allergies',
    prompt: {
      en: 'Do you have any medication allergies? You can say none.',
      es: '¿Tienes alguna alergia a medicamentos? Puedes decir ninguna.',
    },
    title: 'Medication Allergies',
  },
  allergyMaterialSelections: {
    hints: ['material allergies', 'contact allergies', 'latex', 'adhesive', 'none'],
    label: 'material or contact allergies',
    prompt: {
      en: 'Do you have any material or contact allergies? You can say none.',
      es: '¿Tienes alguna alergia a materiales o de contacto? Puedes decir ninguna.',
    },
    title: 'Material / Contact Allergies',
  },
  allergyFoodSelections: {
    hints: ['food allergies', 'peanut', 'shellfish', 'dairy', 'none'],
    label: 'food allergies',
    prompt: {
      en: 'Do you have any food allergies? You can say none.',
      es: '¿Tienes alguna alergia alimentaria? Puedes decir ninguna.',
    },
    title: 'Food Allergies',
  },
  allergyEnvironmentalSelections: {
    hints: ['environmental allergies', 'pollen', 'dust', 'pet dander', 'none'],
    label: 'environmental allergies',
    prompt: {
      en: 'Do you have any environmental allergies? You can say none.',
      es: '¿Tienes alguna alergia ambiental? Puedes decir ninguna.',
    },
    title: 'Environmental Allergies',
  },
  medications: {
    hints: ['medications', 'medicine', 'prescriptions'],
    label: 'medications',
    prompt: {
      en: 'What medications are you taking right now?',
      es: '¿Qué medicamentos estás tomando ahora mismo?',
    },
    title: 'Medications',
  },
  pharmacy: {
    hints: ['pharmacy', 'drugstore'],
    label: 'preferred pharmacy',
    prompt: {
      en: 'What is your preferred pharmacy?',
      es: '¿Cuál es tu farmacia preferida?',
    },
    title: 'Preferred Pharmacy',
  },
  lastDose: {
    hints: ['last dose', 'last time taken', 'today', 'yesterday'],
    label: 'last dose',
    prompt: {
      en: 'When was your last dose?',
      es: '¿Cuándo fue tu última dosis?',
    },
    title: 'Last Dose',
  },
  immunizationCoreSelections: {
    hints: ['core vaccines', 'immunizations', 'flu shot', 'covid vaccine', 'none', 'unsure'],
    label: 'core vaccines',
    prompt: {
      en: 'Which core vaccines should we note? You can say none or unsure.',
      es: '¿Qué vacunas principales debemos registrar? Puedes decir ninguna o no estoy seguro.',
    },
    title: 'Core Vaccines',
  },
  immunizationRoutineSelections: {
    hints: ['routine adult vaccines', 'tetanus', 'shingles', 'pneumonia', 'none', 'unsure'],
    label: 'routine adult vaccines',
    prompt: {
      en: 'Which routine adult vaccines should we note? You can say none or unsure.',
      es: '¿Qué vacunas rutinarias para adultos debemos registrar? Puedes decir ninguna o no estoy seguro.',
    },
    title: 'Routine Adult Vaccines',
  },
  immunizationTravelSelections: {
    hints: ['travel vaccines', 'risk-based vaccines', 'yellow fever', 'hepatitis', 'none', 'unsure'],
    label: 'travel or risk-based vaccines',
    prompt: {
      en: 'Which travel or risk-based vaccines should we note? You can say none or unsure.',
      es: '¿Qué vacunas de viaje o basadas en riesgo debemos registrar? Puedes decir ninguna o no estoy seguro.',
    },
    title: 'Travel / Risk-Based Vaccines',
  },
  chiefConcern: {
    hints: ['reason for visit', 'chief concern', 'symptoms'],
    label: 'reason for your visit',
    prompt: {
      en: 'What is the reason for your visit today?',
      es: '¿Cuál es el motivo de tu visita hoy?',
    },
    title: 'Reason for Visit',
  },
  symptomDuration: {
    hints: ['today', 'days', 'weeks', 'months', 'duration'],
    label: 'how long this has been going on',
    prompt: {
      en: 'How long has this been going on?',
      es: '¿Cuánto tiempo ha estado pasando esto?',
    },
    title: 'Duration',
  },
  painLevel: {
    hints: ['severity', 'pain level', 'one to ten'],
    label: 'severity',
    prompt: {
      en: 'How severe is it right now?',
      es: '¿Qué tan severo es ahora mismo?',
    },
    title: 'Severity',
  },
  symptomNotes: {
    hints: ['symptom notes', 'extra details', 'anything else'],
    label: 'symptom notes',
    prompt: {
      en: 'Anything else you want staff to know about your symptoms?',
      es: '¿Hay algo más que quieras que el personal sepa sobre tus síntomas?',
    },
    title: 'Symptom Notes',
  },
  pastMedicalHistoryChronicConditions: {
    hints: ['chronic conditions', 'asthma', 'diabetes', 'anxiety'],
    label: 'chronic conditions',
    prompt: {
      en: 'Tell me any chronic conditions or mental health history that apply. You can also say none.',
      es: 'Dime cualquier condición crónica o antecedente de salud mental que aplique. También puedes decir ninguna.',
    },
    title: 'Chronic Conditions',
  },
  pastMedicalHistorySurgicalHistory: {
    hints: ['surgical history', 'appendectomy', 'heart surgery'],
    label: 'surgical history',
    prompt: {
      en: 'Tell me any surgical history that applies. You can also say none.',
      es: 'Dime cualquier cirugía previa que aplique. También puedes decir ninguna.',
    },
    title: 'Surgical History',
  },
  pastMedicalHistoryOtherRelevantHistory: {
    hints: ['smoker', 'pregnant', 'breastfeeding', 'other relevant history'],
    label: 'other relevant history',
    prompt: {
      en: 'Tell me any other relevant history, like smoking or pregnancy. You can also say none.',
      es: 'Dime cualquier otro antecedente relevante, como fumar o embarazo. También puedes decir ninguna.',
    },
    title: 'Other Relevant History',
  },
  insuranceProvider: {
    hints: ['insurance provider', 'aetna', 'blue cross'],
    label: 'insurance provider',
    prompt: {
      en: 'What is your insurance provider?',
      es: '¿Cuál es tu proveedor de seguro?',
    },
    title: 'Insurance Provider',
  },
  memberId: {
    hints: ['member id', 'insurance number'],
    label: 'insurance member ID',
    prompt: {
      en: 'What is your insurance member ID?',
      es: '¿Cuál es tu número de miembro del seguro?',
    },
    title: 'Member ID',
  },
  groupNumber: {
    hints: ['group number', 'insurance group'],
    label: 'insurance group number',
    prompt: {
      en: 'What is your insurance group number?',
      es: '¿Cuál es tu número de grupo del seguro?',
    },
    title: 'Group Number',
  },
  subscriberName: {
    hints: ['subscriber name', 'policy holder'],
    label: 'insurance subscriber',
    prompt: {
      en: 'What is the subscriber name on the insurance card?',
      es: '¿Cuál es el nombre del suscriptor en la tarjeta del seguro?',
    },
    title: 'Subscriber Name',
  },
} as const satisfies Record<
  JanetActiveFieldKey,
  {
    hints: readonly string[];
    label: string;
    prompt: Record<'en' | 'es', string>;
    title: string;
  }
>;

export function getJanetFieldsForStep(step: IntakeStepKey) {
  if (!(step in janetStepFieldOrder)) {
    return [] as readonly JanetActiveFieldKey[];
  }

  return janetStepFieldOrder[step as JanetConfigStepKey];
}

export function isJanetFieldActiveForStep(
  step: IntakeStepKey,
  field: string | null | undefined,
): field is JanetActiveFieldKey {
  if (!field) {
    return false;
  }

  return getJanetFieldsForStep(step).includes(field as JanetActiveFieldKey);
}

export function getJanetFieldLabel(field: string | null | undefined) {
  if (!field) {
    return 'the next intake detail';
  }

  return JANET_FIELD_METADATA[field as JanetActiveFieldKey]?.label ?? field;
}

export function getJanetFieldTitle(field: string | null | undefined) {
  if (!field) {
    return 'Review';
  }

  return JANET_FIELD_METADATA[field as JanetActiveFieldKey]?.title ?? 'Review';
}

export function getJanetFieldPrompt(
  field: JanetActiveFieldKey,
  language: 'en' | 'es',
) {
  return JANET_FIELD_METADATA[field].prompt[language];
}

export function getJanetRecognitionHints(
  field: string | null | undefined,
  form: IntakeFormData,
) {
  const hints = field
    ? JANET_FIELD_METADATA[field as JanetActiveFieldKey]?.hints ?? []
    : [];

  return [
    ...hints,
    form.firstName,
    form.lastName,
    form.emergencyContactName,
  ].filter((value): value is string => Boolean(value && value.trim()));
}

function janetFieldHasValue(
  field: JanetActiveFieldKey,
  form: IntakeFormData,
) {
  const value = form[field];

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value === true;
}

export function getFirstIncompleteJanetField(
  step: IntakeStepKey,
  form: IntakeFormData,
) {
  return (
    getJanetFieldsForStep(step).find((field) => !janetFieldHasValue(field, form)) ??
    null
  );
}

export function resolveJanetFieldForStep(
  step: IntakeStepKey,
  form: IntakeFormData,
  proposedField: string | null | undefined,
) {
  const firstIncompleteField = getFirstIncompleteJanetField(step, form);

  if (firstIncompleteField) {
    return firstIncompleteField;
  }

  if (isJanetFieldActiveForStep(step, proposedField)) {
    return proposedField;
  }

  return null;
}

export const pastMedicalHistoryOptions = {
  chronicConditions: [
    'Hypertension',
    'Diabetes (Type 1 / Type 2)',
    'High cholesterol',
    'Thyroid disorder',
    'Asthma',
    'COPD',
    'Heart disease',
    'Congestive heart failure',
    'Atrial fibrillation',
    'Stroke / TIA',
    'Kidney disease',
    'Liver disease',
    'Autoimmune disorder',
    'Immunocompromised',
    'Cancer (current or past)',
    'Blood clot history (DVT/PE)',
    'Bleeding disorder',
    'Seizure disorder',
    'Migraines',
    'Anxiety',
    'Depression',
    'Other mental health condition',
  ],
  otherRelevantHistory: [
    'Smoker (current)',
    'Former smoker',
    'Alcohol use',
    'Recreational drug use',
    'Pregnant',
    'Breastfeeding',
    'None of the above',
  ],
  surgicalHistory: [
    'Appendectomy',
    'Gallbladder removal',
    'C-section',
    'Hysterectomy',
    'Hernia repair',
    'Joint replacement',
    'Heart surgery',
    'Other surgery',
  ],
} as const;

const MEDICAL_INFO_ALLERGY_OPTIONS = {
  medication: [
    'Penicillin',
    'Amoxicillin',
    'Cephalosporins',
    'Sulfa drugs (Bactrim)',
    'Macrolides (Azithromycin, etc.)',
    'Fluoroquinolones (Cipro, Levaquin)',
    'NSAIDs (Ibuprofen, Naproxen)',
    'Aspirin',
    'Opioids (Morphine, Codeine)',
    'Other medication allergies',
    'Unknown / Unsure',
  ],
  material: [
    'Latex',
    'Adhesive tape',
    'Nickel',
    'Fragrances / perfumes',
    'Cleaning products',
    'Other',
    'Unknown / Unsure',
  ],
  food: [
    'Shellfish',
    'Peanuts',
    'Tree nuts',
    'Eggs',
    'Milk / dairy',
    'Wheat / gluten',
    'Soy',
    'Other',
    'Unknown / Unsure',
  ],
  environmental: [
    'Pollen',
    'Dust mites',
    'Mold',
    'Pet dander',
    'Insect stings (bees/wasps)',
    'Other',
    'Unknown / Unsure',
  ],
} as const;

const MEDICAL_INFO_ALLERGY_ALIASES: Record<string, string[]> = {
  Penicillin: ['pen', 'penicillin allergy'],
  Amoxicillin: ['amox', 'amoxil'],
  Cephalosporins: ['cephalosporin', 'ceph'],
  'Sulfa drugs (Bactrim)': ['sulfer', 'sulfur', 'sulfa', 'sulfonamide', 'bactrim'],
  'Macrolides (Azithromycin, etc.)': ['macrolide', 'azithromycin', 'z-pack', 'zithromax'],
  'Fluoroquinolones (Cipro, Levaquin)': ['fluoroquinolone', 'cipro', 'levofloxacin', 'levaquin'],
  'NSAIDs (Ibuprofen, Naproxen)': [
    'nsaids',
    'ibuprofen',
    'naproxen',
    'advil',
    'aleve',
  ],
  Aspirin: ['asa'],
  'Opioids (Morphine, Codeine)': ['opioid', 'pain meds', 'morphine', 'codeine'],
  'Other medication allergies': ['other medication allergy', 'other drug allergy'],
  'Unknown / Unsure': ['unknown', 'unsure', 'not sure'],
  Latex: ['rubber'],
  'Adhesive tape': ['bandage adhesive', 'tape'],
  Nickel: ['metal allergy'],
  'Fragrances / perfumes': ['scent', 'fragrance', 'perfume', 'cologne'],
  'Cleaning products': ['cleaners', 'bleach'],
  Other: ['other'],
  Shellfish: ['shrimp', 'crab', 'lobster'],
  Peanuts: ['peanut', 'peanut allergy'],
  'Tree nuts': ['almond', 'walnut', 'cashew', 'nut allergy'],
  Eggs: ['egg'],
  'Milk / dairy': ['milk', 'dairy', 'lactose'],
  'Wheat / gluten': ['wheat', 'gluten'],
  Soy: ['soya'],
  Pollen: ['seasonal allergy', 'hay fever'],
  'Dust mites': ['dust'],
  Mold: ['mould'],
  'Pet dander': ['pet', 'cat', 'dog', 'animal dander'],
  'Insect stings (bees/wasps)': ['bee sting', 'wasp sting', 'sting allergy', 'insect sting'],
};

export const medicalInfoCategoryOptions = {
  allergyEnvironmental: MEDICAL_INFO_ALLERGY_OPTIONS.environmental,
  allergyFood: MEDICAL_INFO_ALLERGY_OPTIONS.food,
  allergyMaterial: MEDICAL_INFO_ALLERGY_OPTIONS.material,
  allergyMedication: MEDICAL_INFO_ALLERGY_OPTIONS.medication,
  immunizationCore: [
    'Tetanus / Tdap (within 10 years)',
    'MMR (Measles, Mumps, Rubella)',
    'Varicella (Chickenpox)',
    'Polio (IPV)',
    'Hepatitis B',
    'Hepatitis A',
    'HPV (Gardasil)',
    'Meningococcal ACWY (MenACWY)',
    'Meningococcal B (MenB)',
    'Unknown / Unsure',
  ],
  immunizationRoutine: [
    'Influenza (yearly)',
    'COVID-19 vaccine',
    'Pneumococcal',
    'Shingles',
    'Shingrix - age 50+',
    'Unknown / Unsure',
  ],
  immunizationTravel: [
    'Typhoid',
    'Yellow Fever',
    'Japanese Encephalitis',
    'Rabies (pre-exposure)',
    'Other travel vaccines',
    'Unknown / Unsure',
  ],
  immunizationUnknown: [
    'Unsure of immunization history',
    'No records available',
  ],
} as const;

const MEDICAL_INFO_IMMUNIZATION_ALIASES: Record<string, string[]> = {
  'Tetanus / Tdap (within 10 years)': ['tetanus', 'tdap', 'tetanus tdap'],
  'MMR (Measles, Mumps, Rubella)': ['mmr', 'measles mumps rubella'],
  'Varicella (Chickenpox)': ['varicella', 'chickenpox', 'chicken pox'],
  'Polio (IPV)': ['polio', 'ipv'],
  'Hepatitis B': ['hepatitis b', 'hep b'],
  'Hepatitis A': ['hepatitis a', 'hep a'],
  'HPV (Gardasil)': ['hpv', 'gardasil'],
  'Meningococcal ACWY (MenACWY)': ['meningococcal acwy', 'menacwy'],
  'Meningococcal B (MenB)': ['meningococcal b', 'menb'],
  'Influenza (yearly)': ['influenza', 'flu', 'flu shot'],
  'COVID-19 vaccine': ['covid', 'covid 19', 'covid vaccine'],
  Pneumococcal: ['pneumococcal', 'pneumonia shot'],
  Shingles: ['shingles'],
  'Shingrix - age 50+': ['shingrix'],
  Typhoid: ['typhoid'],
  'Yellow Fever': ['yellow fever'],
  'Japanese Encephalitis': ['japanese encephalitis'],
  'Rabies (pre-exposure)': ['rabies', 'rabies pre exposure'],
  'Other travel vaccines': ['other travel vaccine', 'travel vaccine other'],
  'Unsure of immunization history': ['unsure', 'not sure', 'unknown history'],
  'No records available': ['no records', 'no vaccine records'],
};

export const PAST_MEDICAL_HISTORY_NONE_OF_ABOVE = 'None of the above';
export const PAST_MEDICAL_HISTORY_OTHER_MENTAL_HEALTH =
  'Other mental health condition';
export const PAST_MEDICAL_HISTORY_OTHER_SURGERY = 'Other surgery';

type PastMedicalHistoryForm = Pick<
  IntakeFormData,
  | 'medicalConditions'
  | 'pastMedicalHistoryChronicConditions'
  | 'pastMedicalHistoryHydrated'
  | 'pastMedicalHistoryOtherMentalHealthCondition'
  | 'pastMedicalHistoryOtherRelevantHistory'
  | 'pastMedicalHistoryOtherSurgery'
  | 'pastMedicalHistorySurgicalHistory'
>;

type MedicalInfoForm = Pick<
  IntakeFormData,
  | 'allergies'
  | 'allergyEnvironmentalSelections'
  | 'allergyFoodSelections'
  | 'allergyMaterialSelections'
  | 'allergyMedicationSelections'
  | 'immunizations'
  | 'immunizationCoreSelections'
  | 'immunizationRoutineSelections'
  | 'immunizationTravelSelections'
  | 'immunizationUnknownSelections'
  | 'medicalInfoHydrated'
>;

function hasStructuredPastMedicalHistoryValues(
  values: Partial<IntakeFormData>,
) {
  return (
    Array.isArray(values.pastMedicalHistoryChronicConditions) &&
      values.pastMedicalHistoryChronicConditions.length > 0 ||
    Array.isArray(values.pastMedicalHistorySurgicalHistory) &&
      values.pastMedicalHistorySurgicalHistory.length > 0 ||
    Array.isArray(values.pastMedicalHistoryOtherRelevantHistory) &&
      values.pastMedicalHistoryOtherRelevantHistory.length > 0 ||
    typeof values.pastMedicalHistoryOtherMentalHealthCondition === 'string' &&
      values.pastMedicalHistoryOtherMentalHealthCondition.trim().length > 0 ||
    typeof values.pastMedicalHistoryOtherSurgery === 'string' &&
      values.pastMedicalHistoryOtherSurgery.trim().length > 0
  );
}

function normalizePastMedicalHistoryText(value: string) {
  return value
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[/:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePastMedicalHistorySelection(
  value: unknown,
  allowedValues: readonly string[],
) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  const normalized = value.filter(
    (entry): entry is string =>
      typeof entry === 'string' && allowedValues.includes(entry),
  );

  return Array.from(new Set(normalized));
}

function normalizePastMedicalHistoryOtherRelevantHistory(value: unknown) {
  const normalized = normalizePastMedicalHistorySelection(
    value,
    pastMedicalHistoryOptions.otherRelevantHistory,
  );

  if (
    normalized.includes(PAST_MEDICAL_HISTORY_NONE_OF_ABOVE) &&
    normalized.length > 1
  ) {
    return normalized.filter(
      (entry) => entry !== PAST_MEDICAL_HISTORY_NONE_OF_ABOVE,
    );
  }

  return normalized;
}

function splitPastMedicalHistoryNotes(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim().split(/\s+/).join(' '))
    .filter(Boolean);
}

function extractLabeledPastMedicalHistoryValue(
  rawEntry: string,
  prefixes: readonly string[],
) {
  const normalizedEntry = normalizePastMedicalHistoryText(rawEntry);

  for (const prefix of prefixes) {
    if (!normalizedEntry.startsWith(prefix)) {
      continue;
    }

    const detail = rawEntry
      .replace(new RegExp(`^${prefix}`, 'i'), '')
      .replace(/^[:\-–—\s]+/, '')
      .trim();

    return detail;
  }

  return '';
}

function matchesPastMedicalHistoryAlias(
  rawEntry: string,
  aliases: readonly string[],
) {
  const normalizedEntry = normalizePastMedicalHistoryText(rawEntry);
  return aliases.some((alias) => normalizedEntry === alias);
}

export function hydratePastMedicalHistoryFromLegacy(value: string) {
  const chronicConditions = new Set<string>();
  const surgicalHistory = new Set<string>();
  const otherRelevantHistory = new Set<string>();
  let otherMentalHealthCondition = '';
  let otherSurgery = '';
  const remainingNotes: string[] = [];

  for (const entry of splitPastMedicalHistoryNotes(value)) {
    if (
      matchesPastMedicalHistoryAlias(entry, ['hypertension', 'high blood pressure'])
    ) {
      chronicConditions.add('Hypertension');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, [
        'diabetes',
        'type 1 diabetes',
        'type 2 diabetes',
        'diabetes type 1',
        'diabetes type 2',
      ])
    ) {
      chronicConditions.add('Diabetes (Type 1 / Type 2)');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, ['high cholesterol', 'hyperlipidemia'])
    ) {
      chronicConditions.add('High cholesterol');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, [
        'thyroid disorder',
        'thyroid disease',
        'hypothyroid',
        'hyperthyroid',
      ])
    ) {
      chronicConditions.add('Thyroid disorder');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['asthma'])) {
      chronicConditions.add('Asthma');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['copd'])) {
      chronicConditions.add('COPD');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['heart disease'])) {
      chronicConditions.add('Heart disease');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, [
        'congestive heart failure',
        'chf',
      ])
    ) {
      chronicConditions.add('Congestive heart failure');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, [
        'atrial fibrillation',
        'afib',
        'a fib',
      ])
    ) {
      chronicConditions.add('Atrial fibrillation');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, ['stroke', 'tia', 'stroke tia'])
    ) {
      chronicConditions.add('Stroke / TIA');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, ['kidney disease', 'ckd'])
    ) {
      chronicConditions.add('Kidney disease');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['liver disease'])) {
      chronicConditions.add('Liver disease');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, [
        'autoimmune disorder',
        'autoimmune disease',
      ])
    ) {
      chronicConditions.add('Autoimmune disorder');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, [
        'immunocompromised',
        'immune compromised',
      ])
    ) {
      chronicConditions.add('Immunocompromised');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['cancer', 'cancer current or past'])) {
      chronicConditions.add('Cancer (current or past)');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, [
        'blood clot history',
        'blood clot',
        'dvt',
        'pe',
        'dvt pe',
      ])
    ) {
      chronicConditions.add('Blood clot history (DVT/PE)');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['bleeding disorder'])) {
      chronicConditions.add('Bleeding disorder');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['seizure disorder', 'seizures'])) {
      chronicConditions.add('Seizure disorder');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['migraines', 'migraine'])) {
      chronicConditions.add('Migraines');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['anxiety'])) {
      chronicConditions.add('Anxiety');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['depression'])) {
      chronicConditions.add('Depression');
      continue;
    }

    const mentalHealthDetail = extractLabeledPastMedicalHistoryValue(entry, [
      'other mental health condition',
    ]);
    if (mentalHealthDetail || normalizePastMedicalHistoryText(entry).includes('mental health')) {
      chronicConditions.add(PAST_MEDICAL_HISTORY_OTHER_MENTAL_HEALTH);
      otherMentalHealthCondition =
        mentalHealthDetail || otherMentalHealthCondition || entry.trim();
      continue;
    }

    if (
      matchesPastMedicalHistoryAlias(entry, [
        'appendectomy',
        'appendicectomy',
      ])
    ) {
      surgicalHistory.add('Appendectomy');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, [
        'gallbladder removal',
        'cholecystectomy',
      ])
    ) {
      surgicalHistory.add('Gallbladder removal');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, [
        'c section',
        'c-section',
        'cesarean',
      ])
    ) {
      surgicalHistory.add('C-section');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['hysterectomy'])) {
      surgicalHistory.add('Hysterectomy');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['hernia repair'])) {
      surgicalHistory.add('Hernia repair');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['joint replacement'])) {
      surgicalHistory.add('Joint replacement');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['heart surgery'])) {
      surgicalHistory.add('Heart surgery');
      continue;
    }

    const surgeryDetail = extractLabeledPastMedicalHistoryValue(entry, [
      'other surgery',
    ]);
    if (surgeryDetail) {
      surgicalHistory.add(PAST_MEDICAL_HISTORY_OTHER_SURGERY);
      otherSurgery = surgeryDetail;
      continue;
    }

    if (
      matchesPastMedicalHistoryAlias(entry, [
        'smoker current',
        'current smoker',
        'smoker',
      ])
    ) {
      otherRelevantHistory.add('Smoker (current)');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['former smoker'])) {
      otherRelevantHistory.add('Former smoker');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['alcohol use'])) {
      otherRelevantHistory.add('Alcohol use');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, [
        'recreational drug use',
        'drug use',
      ])
    ) {
      otherRelevantHistory.add('Recreational drug use');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['pregnant', 'pregnancy'])) {
      otherRelevantHistory.add('Pregnant');
      continue;
    }
    if (matchesPastMedicalHistoryAlias(entry, ['breastfeeding'])) {
      otherRelevantHistory.add('Breastfeeding');
      continue;
    }
    if (
      matchesPastMedicalHistoryAlias(entry, [
        'none of the above',
        'none',
      ])
    ) {
      otherRelevantHistory.clear();
      otherRelevantHistory.add(PAST_MEDICAL_HISTORY_NONE_OF_ABOVE);
      continue;
    }

    remainingNotes.push(entry.trim());
  }

  return {
    medicalConditions: remainingNotes.join(', '),
    pastMedicalHistoryChronicConditions: Array.from(chronicConditions),
    pastMedicalHistoryHydrated: true,
    pastMedicalHistoryOtherMentalHealthCondition:
      otherMentalHealthCondition,
    pastMedicalHistoryOtherRelevantHistory: Array.from(otherRelevantHistory),
    pastMedicalHistoryOtherSurgery: otherSurgery,
    pastMedicalHistorySurgicalHistory: Array.from(surgicalHistory),
  } satisfies Partial<IntakeFormData>;
}

function uniquePastMedicalHistoryItems(items: string[]) {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const item of items) {
    const normalized = normalizePastMedicalHistoryText(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    results.push(item);
  }

  return results;
}

export function buildPastMedicalHistoryEntries(form: PastMedicalHistoryForm) {
  const chronic = form.pastMedicalHistoryChronicConditions.map((value) =>
    value === PAST_MEDICAL_HISTORY_OTHER_MENTAL_HEALTH &&
    form.pastMedicalHistoryOtherMentalHealthCondition.trim()
      ? `${PAST_MEDICAL_HISTORY_OTHER_MENTAL_HEALTH}: ${form.pastMedicalHistoryOtherMentalHealthCondition.trim()}`
      : value,
  );
  const surgical = form.pastMedicalHistorySurgicalHistory.map((value) =>
    value === PAST_MEDICAL_HISTORY_OTHER_SURGERY &&
    form.pastMedicalHistoryOtherSurgery.trim()
      ? `${PAST_MEDICAL_HISTORY_OTHER_SURGERY}: ${form.pastMedicalHistoryOtherSurgery.trim()}`
      : value,
  );
  const otherRelevant = form.pastMedicalHistoryOtherRelevantHistory.filter(
    (value) =>
      value !== PAST_MEDICAL_HISTORY_NONE_OF_ABOVE ||
      form.pastMedicalHistoryOtherRelevantHistory.length === 1,
  );
  const additionalNotes = splitPastMedicalHistoryNotes(form.medicalConditions);

  return {
    additionalNotes: uniquePastMedicalHistoryItems(additionalNotes),
    chronic: uniquePastMedicalHistoryItems(chronic),
    otherRelevant: uniquePastMedicalHistoryItems(otherRelevant),
    surgical: uniquePastMedicalHistoryItems(surgical),
  };
}

export function serializeIntakeForm(form: IntakeFormData): IntakeFormData {
  const medicallyReconciledForm = reconcileMedicalInfoForm(form);
  const chronicConditions = normalizePastMedicalHistorySelection(
    medicallyReconciledForm.pastMedicalHistoryChronicConditions,
    pastMedicalHistoryOptions.chronicConditions,
  );
  const surgicalHistory = normalizePastMedicalHistorySelection(
    medicallyReconciledForm.pastMedicalHistorySurgicalHistory,
    pastMedicalHistoryOptions.surgicalHistory,
  );
  const otherRelevantHistory = normalizePastMedicalHistoryOtherRelevantHistory(
    medicallyReconciledForm.pastMedicalHistoryOtherRelevantHistory,
  );

  const normalizedForm: IntakeFormData = {
    ...medicallyReconciledForm,
    allergies: buildMedicalInfoAllergyEntries(medicallyReconciledForm).join(', '),
    immunizations:
      buildMedicalInfoImmunizationEntries(medicallyReconciledForm).join(', '),
    medicalConditions: typeof medicallyReconciledForm.medicalConditions === 'string'
      ? medicallyReconciledForm.medicalConditions.trim()
      : '',
    pastMedicalHistoryChronicConditions: chronicConditions,
    pastMedicalHistoryHydrated: true,
    pastMedicalHistoryOtherMentalHealthCondition:
      medicallyReconciledForm.pastMedicalHistoryOtherMentalHealthCondition.trim(),
    pastMedicalHistoryOtherRelevantHistory: otherRelevantHistory,
    pastMedicalHistoryOtherSurgery:
      medicallyReconciledForm.pastMedicalHistoryOtherSurgery.trim(),
    pastMedicalHistorySurgicalHistory: surgicalHistory,
  };

  const entries = buildPastMedicalHistoryEntries(normalizedForm);
  const medicalConditions = uniquePastMedicalHistoryItems([
    ...entries.chronic,
    ...entries.surgical,
    ...entries.otherRelevant,
    ...entries.additionalNotes,
  ]).join(', ');

  return {
    ...normalizedForm,
    medicalConditions,
  };
}

export function reconcilePastMedicalHistoryForm(
  form: IntakeFormData,
): IntakeFormData {
  const legacyValue = form.medicalConditions.trim();
  const hasStructuredSelections = hasStructuredPastMedicalHistoryValues(form);

  if (!legacyValue && !hasStructuredSelections) {
    return form;
  }

  const hydrated = legacyValue
    ? hydratePastMedicalHistoryFromLegacy(legacyValue)
    : null;

  if (!hydrated) {
    return {
      ...form,
      pastMedicalHistoryHydrated: true,
    };
  }

  return {
    ...form,
    medicalConditions: hydrated.medicalConditions ?? '',
    pastMedicalHistoryChronicConditions: uniquePastMedicalHistoryItems([
      ...form.pastMedicalHistoryChronicConditions,
      ...(hydrated.pastMedicalHistoryChronicConditions ?? []),
    ]),
    pastMedicalHistoryHydrated: true,
    pastMedicalHistoryOtherMentalHealthCondition:
      form.pastMedicalHistoryOtherMentalHealthCondition.trim() ||
      hydrated.pastMedicalHistoryOtherMentalHealthCondition ||
      '',
    pastMedicalHistoryOtherRelevantHistory: uniquePastMedicalHistoryItems([
      ...normalizePastMedicalHistoryOtherRelevantHistory(
        form.pastMedicalHistoryOtherRelevantHistory,
      ),
      ...(hydrated.pastMedicalHistoryOtherRelevantHistory ?? []),
    ]),
    pastMedicalHistoryOtherSurgery:
      form.pastMedicalHistoryOtherSurgery.trim() ||
      hydrated.pastMedicalHistoryOtherSurgery ||
      '',
    pastMedicalHistorySurgicalHistory: uniquePastMedicalHistoryItems([
      ...form.pastMedicalHistorySurgicalHistory,
      ...(hydrated.pastMedicalHistorySurgicalHistory ?? []),
    ]),
  };
}

export function formatPastMedicalHistorySummary(
  items: string[],
  emptyLabel = 'None selected',
) {
  return items.length > 0 ? items.join(', ') : emptyLabel;
}

function normalizeMedicalInfoSelection(
  value: unknown,
  allowedValues: readonly string[],
) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  const normalized = value.filter(
    (entry): entry is string =>
      typeof entry === 'string' && allowedValues.includes(entry),
  );

  return Array.from(new Set(normalized));
}

function normalizeMedicalInfoText(value: string) {
  return value
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[/:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitMedicalInfoEntries(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim().split(/\s+/).join(' '))
    .filter(Boolean);
}

function matchesMedicalInfoAlias(
  rawEntry: string,
  option: string,
  aliases: readonly string[] = [],
) {
  const normalizedEntry = normalizeMedicalInfoText(rawEntry);
  const normalizedOption = normalizeMedicalInfoText(option);

  if (normalizedEntry === normalizedOption) {
    return true;
  }

  return aliases.some((alias) => {
    const normalizedAlias = normalizeMedicalInfoText(alias);
    return (
      normalizedEntry === normalizedAlias ||
      normalizedEntry.includes(normalizedAlias)
    );
  });
}

function uniqueMedicalInfoItems(items: string[]) {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const item of items) {
    const normalized = normalizeMedicalInfoText(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    results.push(item);
  }

  return results;
}

function hasStructuredMedicalInfoSelections(values: Partial<IntakeFormData>) {
  return (
    Array.isArray(values.allergyMedicationSelections) &&
      values.allergyMedicationSelections.length > 0 ||
    Array.isArray(values.allergyMaterialSelections) &&
      values.allergyMaterialSelections.length > 0 ||
    Array.isArray(values.allergyFoodSelections) &&
      values.allergyFoodSelections.length > 0 ||
    Array.isArray(values.allergyEnvironmentalSelections) &&
      values.allergyEnvironmentalSelections.length > 0 ||
    Array.isArray(values.immunizationCoreSelections) &&
      values.immunizationCoreSelections.length > 0 ||
    Array.isArray(values.immunizationRoutineSelections) &&
      values.immunizationRoutineSelections.length > 0 ||
    Array.isArray(values.immunizationTravelSelections) &&
      values.immunizationTravelSelections.length > 0 ||
    Array.isArray(values.immunizationUnknownSelections) &&
      values.immunizationUnknownSelections.length > 0
  );
}

export function buildMedicalInfoAllergyEntries(form: MedicalInfoForm) {
  return uniqueMedicalInfoItems([
    ...form.allergyMedicationSelections,
    ...form.allergyMaterialSelections,
    ...form.allergyFoodSelections,
    ...form.allergyEnvironmentalSelections,
  ]);
}

export function buildMedicalInfoImmunizationEntries(form: MedicalInfoForm) {
  return uniqueMedicalInfoItems([
    ...form.immunizationCoreSelections,
    ...form.immunizationRoutineSelections,
    ...form.immunizationTravelSelections,
    ...form.immunizationUnknownSelections,
  ]);
}

export function formatCompactSelectionSummary(
  items: string[],
  emptyLabel = 'No selections yet',
) {
  if (items.length === 0) {
    return emptyLabel;
  }

  if (items.length <= 2) {
    return items.join(', ');
  }

  return `${items[0]}, ${items[1]} +${items.length - 2}`;
}

export function formatCompactTextSummary(
  value: string,
  emptyLabel = 'No selections yet',
) {
  const normalized = value.trim().replace(/\s+/g, ' ');

  if (!normalized) {
    return emptyLabel;
  }

  if (normalized.length <= 48) {
    return normalized;
  }

  return `${normalized.slice(0, 45).trimEnd()}...`;
}

export function hydrateMedicalInfoFromLegacy(allergies: string, immunizations: string) {
  const allergyMedicationSelections = new Set<string>();
  const allergyMaterialSelections = new Set<string>();
  const allergyFoodSelections = new Set<string>();
  const allergyEnvironmentalSelections = new Set<string>();
  const immunizationCoreSelections = new Set<string>();
  const immunizationRoutineSelections = new Set<string>();
  const immunizationTravelSelections = new Set<string>();
  const immunizationUnknownSelections = new Set<string>();

  for (const entry of splitMedicalInfoEntries(allergies)) {
    const medicationMatch = medicalInfoCategoryOptions.allergyMedication.find((option) =>
      matchesMedicalInfoAlias(entry, option, MEDICAL_INFO_ALLERGY_ALIASES[option]),
    );
    if (medicationMatch) {
      allergyMedicationSelections.add(medicationMatch);
      continue;
    }

    const materialMatch = medicalInfoCategoryOptions.allergyMaterial.find((option) =>
      matchesMedicalInfoAlias(entry, option, MEDICAL_INFO_ALLERGY_ALIASES[option]),
    );
    if (materialMatch) {
      allergyMaterialSelections.add(materialMatch);
      continue;
    }

    const foodMatch = medicalInfoCategoryOptions.allergyFood.find((option) =>
      matchesMedicalInfoAlias(entry, option, MEDICAL_INFO_ALLERGY_ALIASES[option]),
    );
    if (foodMatch) {
      allergyFoodSelections.add(foodMatch);
      continue;
    }

    const environmentalMatch = medicalInfoCategoryOptions.allergyEnvironmental.find((option) =>
      matchesMedicalInfoAlias(entry, option, MEDICAL_INFO_ALLERGY_ALIASES[option]),
    );
    if (environmentalMatch) {
      allergyEnvironmentalSelections.add(environmentalMatch);
    }
  }

  for (const entry of splitMedicalInfoEntries(immunizations)) {
    const coreMatch = medicalInfoCategoryOptions.immunizationCore.find((option) =>
      matchesMedicalInfoAlias(entry, option, MEDICAL_INFO_IMMUNIZATION_ALIASES[option]),
    );
    if (coreMatch) {
      immunizationCoreSelections.add(coreMatch);
      continue;
    }

    const routineMatch = medicalInfoCategoryOptions.immunizationRoutine.find((option) =>
      matchesMedicalInfoAlias(entry, option, MEDICAL_INFO_IMMUNIZATION_ALIASES[option]),
    );
    if (routineMatch) {
      immunizationRoutineSelections.add(routineMatch);
      continue;
    }

    const travelMatch = medicalInfoCategoryOptions.immunizationTravel.find((option) =>
      matchesMedicalInfoAlias(entry, option, MEDICAL_INFO_IMMUNIZATION_ALIASES[option]),
    );
    if (travelMatch) {
      immunizationTravelSelections.add(travelMatch);
      continue;
    }

    const unknownMatch = medicalInfoCategoryOptions.immunizationUnknown.find((option) =>
      matchesMedicalInfoAlias(entry, option, MEDICAL_INFO_IMMUNIZATION_ALIASES[option]),
    );
    if (unknownMatch) {
      immunizationUnknownSelections.add(unknownMatch);
    }
  }

  return {
    allergyEnvironmentalSelections: Array.from(allergyEnvironmentalSelections),
    allergyFoodSelections: Array.from(allergyFoodSelections),
    allergyMaterialSelections: Array.from(allergyMaterialSelections),
    allergyMedicationSelections: Array.from(allergyMedicationSelections),
    immunizationCoreSelections: Array.from(immunizationCoreSelections),
    immunizationRoutineSelections: Array.from(immunizationRoutineSelections),
    immunizationTravelSelections: Array.from(immunizationTravelSelections),
    immunizationUnknownSelections: Array.from(immunizationUnknownSelections),
    medicalInfoHydrated: true,
  } satisfies Partial<IntakeFormData>;
}

export function reconcileMedicalInfoForm(form: IntakeFormData): IntakeFormData {
  const normalizedForm: IntakeFormData = {
    ...form,
    allergyEnvironmentalSelections: normalizeMedicalInfoSelection(
      form.allergyEnvironmentalSelections,
      medicalInfoCategoryOptions.allergyEnvironmental,
    ),
    allergyFoodSelections: normalizeMedicalInfoSelection(
      form.allergyFoodSelections,
      medicalInfoCategoryOptions.allergyFood,
    ),
    allergyMaterialSelections: normalizeMedicalInfoSelection(
      form.allergyMaterialSelections,
      medicalInfoCategoryOptions.allergyMaterial,
    ),
    allergyMedicationSelections: normalizeMedicalInfoSelection(
      form.allergyMedicationSelections,
      medicalInfoCategoryOptions.allergyMedication,
    ),
    immunizationCoreSelections: normalizeMedicalInfoSelection(
      form.immunizationCoreSelections,
      medicalInfoCategoryOptions.immunizationCore,
    ),
    immunizationRoutineSelections: normalizeMedicalInfoSelection(
      form.immunizationRoutineSelections,
      medicalInfoCategoryOptions.immunizationRoutine,
    ),
    immunizationTravelSelections: normalizeMedicalInfoSelection(
      form.immunizationTravelSelections,
      medicalInfoCategoryOptions.immunizationTravel,
    ),
    immunizationUnknownSelections: normalizeMedicalInfoSelection(
      form.immunizationUnknownSelections,
      medicalInfoCategoryOptions.immunizationUnknown,
    ),
    medicalInfoHydrated: form.medicalInfoHydrated === true,
  };

  if (hasStructuredMedicalInfoSelections(normalizedForm)) {
    return {
      ...normalizedForm,
      allergies: buildMedicalInfoAllergyEntries(normalizedForm).join(', '),
      immunizations: buildMedicalInfoImmunizationEntries(normalizedForm).join(', '),
      medicalInfoHydrated: true,
    };
  }

  if (!normalizedForm.allergies.trim() && !normalizedForm.immunizations.trim()) {
    return {
      ...normalizedForm,
      medicalInfoHydrated: true,
    };
  }

  const hydrated = hydrateMedicalInfoFromLegacy(
    normalizedForm.allergies,
    normalizedForm.immunizations,
  );
  const hydratedForm = {
    ...normalizedForm,
    ...hydrated,
  } satisfies IntakeFormData;
  const hydratedAllergies = buildMedicalInfoAllergyEntries(hydratedForm).join(', ');
  const hydratedImmunizations =
    buildMedicalInfoImmunizationEntries(hydratedForm).join(', ');

  return {
    ...hydratedForm,
    allergies: hydratedAllergies || normalizedForm.allergies,
    immunizations: hydratedImmunizations || normalizedForm.immunizations,
    medicalInfoHydrated: true,
  };
}

export function reconcileStructuredIntakeForm(form: IntakeFormData): IntakeFormData {
  return reconcilePastMedicalHistoryForm(reconcileMedicalInfoForm(form));
}

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
      normalizedGender === 'male' ||
      normalizedGender === 'female' ||
      normalizedGender === 'other'
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
  if ('medicalInfoHydrated' in nextValues) {
    nextValues.medicalInfoHydrated = nextValues.medicalInfoHydrated === true;
  }
  if ('allergyMedicationSelections' in nextValues) {
    nextValues.allergyMedicationSelections = normalizeMedicalInfoSelection(
      nextValues.allergyMedicationSelections,
      medicalInfoCategoryOptions.allergyMedication,
    );
  }
  if ('allergyMaterialSelections' in nextValues) {
    nextValues.allergyMaterialSelections = normalizeMedicalInfoSelection(
      nextValues.allergyMaterialSelections,
      medicalInfoCategoryOptions.allergyMaterial,
    );
  }
  if ('allergyFoodSelections' in nextValues) {
    nextValues.allergyFoodSelections = normalizeMedicalInfoSelection(
      nextValues.allergyFoodSelections,
      medicalInfoCategoryOptions.allergyFood,
    );
  }
  if ('allergyEnvironmentalSelections' in nextValues) {
    nextValues.allergyEnvironmentalSelections = normalizeMedicalInfoSelection(
      nextValues.allergyEnvironmentalSelections,
      medicalInfoCategoryOptions.allergyEnvironmental,
    );
  }
  if ('immunizationCoreSelections' in nextValues) {
    nextValues.immunizationCoreSelections = normalizeMedicalInfoSelection(
      nextValues.immunizationCoreSelections,
      medicalInfoCategoryOptions.immunizationCore,
    );
  }
  if ('immunizationRoutineSelections' in nextValues) {
    nextValues.immunizationRoutineSelections = normalizeMedicalInfoSelection(
      nextValues.immunizationRoutineSelections,
      medicalInfoCategoryOptions.immunizationRoutine,
    );
  }
  if ('immunizationTravelSelections' in nextValues) {
    nextValues.immunizationTravelSelections = normalizeMedicalInfoSelection(
      nextValues.immunizationTravelSelections,
      medicalInfoCategoryOptions.immunizationTravel,
    );
  }
  if ('immunizationUnknownSelections' in nextValues) {
    nextValues.immunizationUnknownSelections = normalizeMedicalInfoSelection(
      nextValues.immunizationUnknownSelections,
      medicalInfoCategoryOptions.immunizationUnknown,
    );
  }
  if ('pastMedicalHistoryHydrated' in nextValues) {
    nextValues.pastMedicalHistoryHydrated =
      nextValues.pastMedicalHistoryHydrated === true;
  }
  if ('pastMedicalHistoryChronicConditions' in nextValues) {
    nextValues.pastMedicalHistoryChronicConditions =
      normalizePastMedicalHistorySelection(
        nextValues.pastMedicalHistoryChronicConditions,
        pastMedicalHistoryOptions.chronicConditions,
      );
  }
  if ('pastMedicalHistorySurgicalHistory' in nextValues) {
    nextValues.pastMedicalHistorySurgicalHistory =
      normalizePastMedicalHistorySelection(
        nextValues.pastMedicalHistorySurgicalHistory,
        pastMedicalHistoryOptions.surgicalHistory,
      );
  }
  if ('pastMedicalHistoryOtherRelevantHistory' in nextValues) {
    nextValues.pastMedicalHistoryOtherRelevantHistory =
      normalizePastMedicalHistoryOtherRelevantHistory(
        nextValues.pastMedicalHistoryOtherRelevantHistory,
      );
  }
  if (typeof nextValues.pastMedicalHistoryOtherMentalHealthCondition === 'string') {
    nextValues.pastMedicalHistoryOtherMentalHealthCondition =
      nextValues.pastMedicalHistoryOtherMentalHealthCondition.trim();
  }
  if (typeof nextValues.pastMedicalHistoryOtherSurgery === 'string') {
    nextValues.pastMedicalHistoryOtherSurgery =
      nextValues.pastMedicalHistoryOtherSurgery.trim();
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
    immunizations: '',
    medicalInfoHydrated: false,
    allergyMedicationSelections: [],
    allergyMaterialSelections: [],
    allergyFoodSelections: [],
    allergyEnvironmentalSelections: [],
    immunizationCoreSelections: [],
    immunizationRoutineSelections: [],
    immunizationTravelSelections: [],
    immunizationUnknownSelections: [],
    pastMedicalHistoryHydrated: false,
    pastMedicalHistoryChronicConditions: [],
    pastMedicalHistorySurgicalHistory: [],
    pastMedicalHistoryOtherRelevantHistory: [],
    pastMedicalHistoryOtherMentalHealthCondition: '',
    pastMedicalHistoryOtherSurgery: '',
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
    form: serializeIntakeForm(payload.form),
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
    form: serializeIntakeForm(payload.form),
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
