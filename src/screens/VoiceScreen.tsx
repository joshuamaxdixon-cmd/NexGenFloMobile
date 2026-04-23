import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

import { DraftBanner } from '../components/DraftBanner';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { JanetAvatar } from '../components/JanetAvatar';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SecondaryButton } from '../components/SecondaryButton';
import type { RootTabParamList } from '../navigation/types';
import {
  addJanetLiveSpeechListener,
  abortJanetLiveSpeech,
  bootstrapJanetSession,
  buildPastMedicalHistoryEntries,
  buildJanetHandoffFromDraft,
  buildJanetSpeechText,
  buildMedicalInfoAllergyEntries,
  buildMedicalInfoImmunizationEntries,
  configureJanetPlaybackAudioMode,
  configureJanetRecordingAudioMode,
  getJanetFieldLabel,
  getFirstIncompleteJanetField,
  getJanetFieldPrompt,
  getJanetFieldTitle,
  getJanetRecognitionHints,
  hydratePastMedicalHistoryFromLegacy,
  normalizeIntakeFormFields,
  formatJanetConfirmation,
  getJanetLiveSpeechAvailability,
  inferJanetConversationStep,
  isJanetFieldActiveForStep,
  intakeFlowSteps,
  pickDocumentFromSource,
  requestJanetLiveSpeechPermissions,
  playJanetReplyAudio,
  requestJanetResponse,
  resolveJanetFieldForStep,
  scanDocumentWithTextract,
  startJanetLiveSpeech,
  stopJanetLiveSpeech,
  stopJanetReplyAudio,
  transcribeJanetAudio,
  useDraftStore,
  type DocumentScanResult,
  type IntakeFormData,
  type IntakeStepKey,
  type JanetConfirmationState,
  type JanetConversationStep,
  type JanetSessionState,
  type JanetSpeechPlaybackState,
} from '../services';
import { colors, spacing, typography } from '../theme';

type VoiceExperienceProps = {
  embedded?: boolean;
  onClose?: () => void;
  onSwitchToTyping?: () => void;
};

type JanetRecordingStatus = {
  durationMillis: number;
  isRecording: boolean;
  metering?: number;
};

type PendingScanResult = DocumentScanResult & {
  promptText: string;
};

const LOCAL_CONFIRMATION_FIELDS = [
  'firstName',
  'lastName',
  'phoneNumber',
  'email',
  'emergencyContactName',
  'emergencyContactPhone',
] as const;

type LocalConfirmationField = (typeof LOCAL_CONFIRMATION_FIELDS)[number];
type LocalConfirmationState = {
  field: LocalConfirmationField;
  value: string;
};

type JanetFlowMode =
  | 'field_question'
  | 'step_transition_confirmation'
  | 'review_summary'
  | 'final_submit_confirmation';

const CONTINUE_INTENTS = [
  'yes',
  'yeah',
  'sure',
  'okay',
  'ok',
  'continue',
  'next',
  'move on',
  'lets go',
  "let's go",
  'go ahead',
] as const;

const PAUSE_INTENTS = ['no', 'not yet', 'wait', 'hold on', 'stop'] as const;

type PastMedicalHistoryVoiceField =
  | 'pastMedicalHistoryChronicConditions'
  | 'pastMedicalHistoryOtherRelevantHistory'
  | 'pastMedicalHistorySurgicalHistory';

const JANET_UI_COPY = {
  en: {
    currentQuestion: 'CURRENT QUESTION',
    editManually: 'Edit manually',
    greetingTitle: 'Janet Guided Check-In',
    greetingSubtitle:
      'Janet asks one question at a time and writes answers back into this same check-in.',
    janetVoiceMode: 'Janet Voice Mode',
    language: 'English',
    listening: 'Listening…',
    noisyRoom: 'Noisy Room',
    processing: 'Processing your answer…',
    repeat: 'Repeat',
    soundOff: 'Sound: Off',
    soundOn: 'Sound: On',
    spanish: 'Español',
    stopAudio: 'Stop audio',
    switchToTyping: 'Edit manually',
    tapOrSpeak: 'Tap or speak when ready.',
  },
  es: {
    currentQuestion: 'PREGUNTA ACTUAL',
    editManually: 'Editar manualmente',
    greetingTitle: 'Registro guiado con Janet',
    greetingSubtitle:
      'Janet hace una pregunta a la vez y guarda las respuestas en este mismo check-in.',
    janetVoiceMode: 'Modo de voz de Janet',
    language: 'Español',
    listening: 'Escuchando…',
    noisyRoom: 'Lugar ruidoso',
    processing: 'Procesando tu respuesta…',
    repeat: 'Repetir',
    soundOff: 'Sound: Off',
    soundOn: 'Sound: On',
    spanish: 'Español',
    stopAudio: 'Detener audio',
    switchToTyping: 'Editar manualmente',
    tapOrSpeak: 'Toca o habla cuando estés listo.',
  },
} as const;

const SCAN_LOW_CONFIDENCE_THRESHOLD = 0.8;
const JANET_TIMING = {
  // How long Janet waits after speaking before auto-listening starts again.
  autoListenDelayMs: 420,
  // How much quiet audio must pass before an answer auto-stops.
  silenceDurationMs: 850,
  // Minimum capture duration before metering counts as real speech.
  minimumSpeechDurationMs: 320,
  // Metering level that marks the start of speech.
  speechStartThresholdDb: -40,
  // Metering level that marks a return to silence.
  silenceThresholdDb: -50,
  // Short pause before playback so Janet feels deliberate instead of abrupt.
  preSpeakDelayMs: 120,
  // Small post-processing pause before Janet replies.
  postResponseDelayMs: 90,
} as const;

const EMPTY_CONFIRMATION: JanetConfirmationState = {
  choices: [],
  field: null,
  prompt: null,
  required: false,
};

const EMPTY_MEDICAL_AND_PMH_PREFILL: Partial<IntakeFormData> = {
  allergies: '',
  allergyEnvironmentalSelections: [],
  allergyFoodSelections: [],
  allergyMaterialSelections: [],
  allergyMedicationSelections: [],
  allergyNotes: '',
  allergyReaction: '',
  chiefConcern: '',
  immunizations: '',
  immunizationCoreSelections: [],
  immunizationRoutineSelections: [],
  immunizationTravelSelections: [],
  immunizationUnknownSelections: [],
  lastDose: '',
  medicalConditions: '',
  medicalInfoHydrated: false,
  medications: '',
  painLevel: '',
  pastMedicalHistoryChronicConditions: [],
  pastMedicalHistoryHydrated: false,
  pastMedicalHistoryOtherMentalHealthCondition: '',
  pastMedicalHistoryOtherRelevantHistory: [],
  pastMedicalHistoryOtherSurgery: '',
  pastMedicalHistorySurgicalHistory: [],
  pharmacy: '',
  symptomDuration: '',
  symptomNotes: '',
};

function getDocumentTypeLabel(documentType: DocumentScanResult['documentType']) {
  return documentType === 'insurance' ? 'insurance card' : 'ID';
}

function getScanAssistCopy(options: {
  canOfferIdScan: boolean;
  canOfferInsuranceScan: boolean;
}) {
  if (options.canOfferIdScan && options.canOfferInsuranceScan) {
    return {
      title: 'Scan to fill this faster',
      subtitle:
        'Janet can read your ID or insurance card and ask you to confirm the details before saving them.',
    };
  }

  if (options.canOfferInsuranceScan) {
    return {
      title: 'Scan your insurance card',
      subtitle:
        'Janet can pull your payer, member ID, group number, and subscriber details for review.',
    };
  }

  return {
    title: 'Scan your ID',
    subtitle:
      'Janet can read your name and date of birth from your ID so you do not need to type them.',
  };
}

function buildScanPreviewRows(
  extractedFields: Partial<IntakeFormData>,
  confidence: Partial<Record<keyof IntakeFormData, number>>,
) {
  return Object.entries(extractedFields)
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[1].trim().length > 0,
    )
    .map(([fieldName, value]) => {
      const fieldConfidence = confidence[fieldName as keyof IntakeFormData] ?? null;

      return {
        confidence: fieldConfidence,
        confidenceLabel:
          typeof fieldConfidence === 'number'
            ? `${Math.round(fieldConfidence * 100)}% confidence`
            : null,
        isLowConfidence:
          typeof fieldConfidence === 'number' &&
          fieldConfidence < SCAN_LOW_CONFIDENCE_THRESHOLD,
        label: getJanetFieldLabel(fieldName),
        value: value.trim(),
      };
    });
}

function hasIntakeProgressValue(value: IntakeFormData[keyof IntakeFormData]) {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value === true;
}

function normalizeTranscriptText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isMeaningfulTranscript(value: string) {
  const normalized = normalizeTranscriptText(value);
  if (!normalized) {
    return false;
  }

  return /[A-Za-z0-9]/.test(normalized);
}

function getLivePillLabel(args: {
  isBootstrapping: boolean;
  isProcessing: boolean;
  isRecording: boolean;
  speechState: JanetSpeechPlaybackState;
}) {
  if (args.isBootstrapping) {
    return 'JANET STARTING';
  }
  if (args.isProcessing) {
    return 'JANET THINKING';
  }
  if (args.isRecording) {
    return 'JANET LISTENING';
  }
  if (args.speechState === 'speaking' || args.speechState === 'processing') {
    return 'JANET TALKING';
  }
  return 'JANET READY';
}

function buildPreviewRows(
  step: IntakeStepKey,
  form: ReturnType<typeof useDraftStore>['state']['intake']['form'],
) {
  if (step === 'basicInfo') {
    return [
      ['Name', [form.firstName, form.lastName].filter(Boolean).join(' ').trim()],
      ['Date of birth', form.dateOfBirth],
      [
        'Height',
        form.heightFt || form.heightIn
          ? `${form.heightFt || '0'} ft ${form.heightIn || '0'} in`
          : '',
      ],
      ['Weight', form.weightLb ? `${form.weightLb} lb` : ''],
      ['Sex', form.gender],
      ['Phone', form.phoneNumber],
      ['Email', form.email],
      ['Emergency contact', [form.emergencyContactName, form.emergencyContactPhone].filter(Boolean).join(' · ').trim()],
    ] as const;
  }

  if (step === 'symptoms') {
    return [
      ['Allergies', buildMedicalInfoAllergyEntries(form).join(', ')],
      ['Medications', form.medications],
      ['Preferred pharmacy', form.pharmacy],
      ['Last dose', form.lastDose],
      ['Immunizations', buildMedicalInfoImmunizationEntries(form).join(', ')],
      ['Chief concern', form.chiefConcern],
      ['Duration', form.symptomDuration],
      ['Severity', form.painLevel],
      ['Symptom notes', form.symptomNotes],
    ] as const;
  }

  if (step === 'documents') {
    return [
      ['Insurance provider', form.insuranceProvider],
      ['Member ID', form.memberId],
      ['Subscriber', form.subscriberName],
    ] as const;
  }

  if (step === 'pastMedicalHistory') {
    const entries = buildPastMedicalHistoryEntries(form);

    return [
      ['Chronic conditions', entries.chronic.join(', ')],
      ['Surgical history', entries.surgical.join(', ')],
      ['Other relevant history', entries.otherRelevant.join(', ')],
    ] as const;
  }

  return [
    ['Name', [form.firstName, form.lastName].filter(Boolean).join(' ').trim()],
    ['Chief concern', form.chiefConcern],
    ['Medications', form.medications],
  ] as const;
}

function isBackendManagedJanetStep(step: IntakeStepKey) {
  return (
    step === 'basicInfo' ||
    step === 'symptoms' ||
    step === 'documents' ||
    step === 'review'
  );
}

function getNextPastMedicalHistoryField(
  form: IntakeFormData,
): PastMedicalHistoryVoiceField | null {
  if (
    form.pastMedicalHistoryChronicConditions.length === 0 &&
    form.pastMedicalHistoryOtherMentalHealthCondition.trim().length === 0
  ) {
    return 'pastMedicalHistoryChronicConditions';
  }

  if (
    form.pastMedicalHistorySurgicalHistory.length === 0 &&
    form.pastMedicalHistoryOtherSurgery.trim().length === 0
  ) {
    return 'pastMedicalHistorySurgicalHistory';
  }

  if (form.pastMedicalHistoryOtherRelevantHistory.length === 0) {
    return 'pastMedicalHistoryOtherRelevantHistory';
  }

  return null;
}

function getPastMedicalHistoryFieldAfter(
  field: PastMedicalHistoryVoiceField,
): PastMedicalHistoryVoiceField | null {
  const fieldOrder: PastMedicalHistoryVoiceField[] = [
    'pastMedicalHistoryChronicConditions',
    'pastMedicalHistorySurgicalHistory',
    'pastMedicalHistoryOtherRelevantHistory',
  ];
  const currentIndex = fieldOrder.indexOf(field);
  return currentIndex >= 0 ? fieldOrder[currentIndex + 1] ?? null : null;
}

function buildPastMedicalHistoryPrompt(
  field: PastMedicalHistoryVoiceField | null,
  language: 'en' | 'es',
) {
  if (language === 'es') {
    switch (field) {
      case 'pastMedicalHistoryChronicConditions':
        return 'Dime cualquier condición crónica o antecedente de salud mental que aplique. También puedes decir ninguna.';
      case 'pastMedicalHistorySurgicalHistory':
        return 'Dime cualquier cirugía previa que aplique. También puedes decir ninguna.';
      case 'pastMedicalHistoryOtherRelevantHistory':
        return 'Dime cualquier otro antecedente relevante, como fumar o embarazo. También puedes decir ninguna.';
      default:
        return 'Vamos a revisar los antecedentes médicos pasados.';
    }
  }

  switch (field) {
    case 'pastMedicalHistoryChronicConditions':
      return 'Tell me any chronic conditions or mental health history that apply. You can also say none.';
    case 'pastMedicalHistorySurgicalHistory':
      return 'Tell me any surgical history that applies. You can also say none.';
    case 'pastMedicalHistoryOtherRelevantHistory':
      return 'Tell me any other relevant history, like smoking or pregnancy. You can also say none.';
    default:
      return 'Let’s review past medical history.';
  }
}

function transcriptMeansNone(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized === 'none' ||
    normalized === 'no' ||
    normalized.includes('none of the above') ||
    normalized.includes('ninguna') ||
    normalized.includes('ninguno')
  );
}

function getJanetStepTitle(step: IntakeStepKey, field: string | null) {
  if (step === 'pastMedicalHistory') {
    return 'Past Medical History';
  }

  return getJanetFieldTitle(field);
}

function buildRecognitionContext(
  field: string | null,
  form: ReturnType<typeof useDraftStore>['state']['intake']['form'],
) {
  return getJanetRecognitionHints(field, form);
}

function isLocalConfirmationField(
  field: string | null | undefined,
): field is LocalConfirmationField {
  return LOCAL_CONFIRMATION_FIELDS.includes(field as LocalConfirmationField);
}

function normalizeLocalConfirmationValue(
  field: LocalConfirmationField,
  transcript: string,
) {
  const normalized = normalizeTranscriptText(transcript);

  if (!normalized) {
    return '';
  }

  if (field === 'email') {
    return normalized
      .toLowerCase()
      .replace(/\s+at\s+/gi, '@')
      .replace(/\s+dot\s+/gi, '.')
      .replace(/\s+/g, '');
  }

  if (field === 'phoneNumber' || field === 'emergencyContactPhone') {
    const normalizedField = normalizeIntakeFormFields({
      [field]: normalized,
    } as Partial<IntakeFormData>)[field];

    return typeof normalizedField === 'string' ? normalizedField : '';
  }

  return normalized;
}

function buildLocalConfirmationPrompt(options: {
  field: LocalConfirmationField;
  language: 'en' | 'es';
  value: string;
}) {
  const { language, value } = options;
  if (language === 'es') {
    return `Escuché ${value}. ¿Es correcto?`;
  }

  return `I heard ${value}. Is that right?`;
}

function transcriptIsAffirmative(value: string, language: 'en' | 'es') {
  const normalized = normalizeTranscriptText(value).toLowerCase();
  if (!normalized) {
    return false;
  }

  if (language === 'es') {
    return ['si', 'sí', 'correcto', 'correcta', 'claro', 'seguro'].some(
      (intent) => normalized === intent || normalized.includes(intent),
    );
  }

  return [
    'yes',
    'yeah',
    'yep',
    'correct',
    'right',
    'sure',
    'that is right',
    "that's right",
  ].some((intent) => normalized === intent || normalized.includes(intent));
}

function transcriptIsNegative(value: string, language: 'en' | 'es') {
  const normalized = normalizeTranscriptText(value).toLowerCase();
  if (!normalized) {
    return false;
  }

  if (language === 'es') {
    return ['no', 'incorrecto', 'incorrecta'].some(
      (intent) => normalized === intent || normalized.includes(intent),
    );
  }

  return ['no', 'nope', 'incorrect', 'not right', 'wrong'].some(
    (intent) => normalized === intent || normalized.includes(intent),
  );
}

function transcriptMatchesIntent(value: string, intents: readonly string[]) {
  const normalized = normalizeTranscriptText(value).toLowerCase();
  if (!normalized) {
    return false;
  }

  return intents.some((intent) => normalized === intent || normalized.includes(intent));
}

function getNextStep(step: IntakeStepKey) {
  const index = intakeFlowSteps.findIndex((entry) => entry.key === step);
  if (index < 0) {
    return null;
  }

  return intakeFlowSteps[index + 1]?.key ?? null;
}

function getStepTransitionPrompt(
  currentStep: IntakeStepKey,
  language: 'en' | 'es',
) {
  const nextStep = getNextStep(currentStep);

  if (!nextStep) {
    return '';
  }

  if (language === 'es') {
    if (currentStep === 'basicInfo') {
      return 'Hemos completado la información del paciente. ¿Pasamos a la información médica?';
    }
    if (currentStep === 'symptoms') {
      return 'Hemos completado la información médica. ¿Pasamos a los antecedentes médicos?';
    }
    if (currentStep === 'pastMedicalHistory') {
      return 'Hemos completado los antecedentes médicos. ¿Pasamos a los documentos?';
    }
    if (currentStep === 'documents') {
      return 'Hemos completado los documentos. ¿Pasamos a revisar y confirmar?';
    }
    return '¿Quieres continuar al siguiente paso?';
  }

  if (currentStep === 'basicInfo') {
    return 'We’ve completed patient information. Shall we move on to medical info?';
  }
  if (currentStep === 'symptoms') {
    return 'We’ve completed medical info. Shall we move on to past medical history?';
  }
  if (currentStep === 'pastMedicalHistory') {
    return 'We’ve completed past medical history. Shall we move on to documents?';
  }
  if (currentStep === 'documents') {
    return 'We’ve completed documents. Shall we move on to review and confirm?';
  }
  return 'Would you like to continue to the next step?';
}

function getStepTransitionDeclinedPrompt(language: 'en' | 'es') {
  return language === 'es'
    ? 'Está bien. ¿Quieres revisar este paso, editar manualmente o repetir el último campo?'
    : 'Okay. Would you like to review this step, edit manually, or repeat the last field?';
}

function buildStepReviewPrompt(options: {
  language: 'en' | 'es';
  previewRows: readonly (readonly [string, string])[];
  step: IntakeStepKey;
}) {
  const { language, previewRows, step } = options;
  const visibleRows = previewRows.filter(([, value]) => value.trim().length > 0);

  if (visibleRows.length === 0) {
    return language === 'es'
      ? `Todavía no hay detalles guardados para ${step}.`
      : `There are no saved details for ${step} yet.`;
  }

  const summary = visibleRows
    .map(([label, value]) => `${label}: ${value}.`)
    .join(' ');

  return language === 'es'
    ? `Esto es lo que tengo para este paso. ${summary}`
    : `Here is what I have for this step. ${summary}`;
}

function formatVoiceList(values: string[]) {
  if (values.length === 0) {
    return '';
  }

  if (values.length === 1) {
    return values[0];
  }

  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function buildReviewSummaryPrompt(options: {
  form: IntakeFormData;
  hasGovernmentIdUpload: boolean;
  hasInsuranceUpload: boolean;
  language: 'en' | 'es';
}) {
  const { form, hasGovernmentIdUpload, hasInsuranceUpload, language } = options;
  const patientName = [form.firstName, form.lastName].filter(Boolean).join(' ').trim();
  const height = form.heightFt || form.heightIn
    ? `${form.heightFt || '0'} foot ${form.heightIn || '0'}`
    : '';
  const allergies = formatVoiceList(buildMedicalInfoAllergyEntries(form));
  const immunizations = formatVoiceList(buildMedicalInfoImmunizationEntries(form));
  const pmh = buildPastMedicalHistoryEntries(form);
  const pmhValues = formatVoiceList([
    ...pmh.chronic,
    ...pmh.surgical,
    ...pmh.otherRelevant,
  ]);

  if (language === 'es') {
    return [
      'Vamos a revisar tu registro antes de enviarlo.',
      patientName
        ? `La información del paciente dice ${patientName}.`
        : 'No tengo un nombre completo todavía.',
      form.dateOfBirth ? `La fecha de nacimiento es ${form.dateOfBirth}.` : '',
      height ? `La altura registrada es ${height}.` : '',
      form.weightLb ? `El peso registrado es ${form.weightLb} libras.` : '',
      form.chiefConcern
        ? `La razón de la visita es ${form.chiefConcern}${form.symptomDuration ? ` por ${form.symptomDuration}` : ''}${form.painLevel ? `, severidad ${form.painLevel}` : ''}.`
        : 'No se registró un motivo de visita.',
      allergies ? `Las alergias registradas son ${allergies}.` : '',
      form.medications ? `Los medicamentos son ${form.medications}.` : '',
      immunizations ? `Las inmunizaciones registradas son ${immunizations}.` : '',
      pmhValues
        ? `Los antecedentes médicos registrados son ${pmhValues}.`
        : 'No se proporcionaron antecedentes médicos.',
      hasInsuranceUpload || hasGovernmentIdUpload
        ? `Documentos: tarjeta de seguro ${hasInsuranceUpload ? 'agregada' : 'no agregada'} y identificación ${hasGovernmentIdUpload ? 'agregada' : 'no agregada'}.`
        : 'No se agregaron documentos todavía.',
      '¿Todo suena correcto?',
    ]
      .filter(Boolean)
      .join(' ');
  }

  return [
    'Let’s review your check-in before submitting.',
    patientName ? `Your name is ${patientName}.` : 'I do not have your full name yet.',
    form.dateOfBirth ? `Your date of birth is ${form.dateOfBirth}.` : '',
    height ? `Your height is ${height}.` : '',
    form.weightLb ? `Your weight is ${form.weightLb} pounds.` : '',
    form.chiefConcern
      ? `Your reason for visit is ${form.chiefConcern}${form.symptomDuration ? ` for ${form.symptomDuration}` : ''}${form.painLevel ? `, severity ${form.painLevel}` : ''}.`
      : 'No reason for visit was provided.',
    allergies ? `Your allergies are ${allergies}.` : '',
    form.medications ? `Your medications are ${form.medications}.` : '',
    immunizations ? `Your immunizations are ${immunizations}.` : '',
    pmhValues
      ? `Your past medical history includes ${pmhValues}.`
      : 'No past medical history was provided.',
    hasInsuranceUpload || hasGovernmentIdUpload
      ? `Documents: insurance card ${hasInsuranceUpload ? 'added' : 'not added'} and photo ID ${hasGovernmentIdUpload ? 'added' : 'not added'}.`
      : 'No documents were added yet.',
    'Does everything sound correct?',
  ]
    .filter(Boolean)
    .join(' ');
}

function getSubmitConfirmationPrompt(language: 'en' | 'es') {
  return language === 'es'
    ? 'Perfecto. ¿Quieres que envíe tu registro ahora?'
    : 'Great. Shall I submit your check-in?';
}

function getReviewSectionChoicePrompt(language: 'en' | 'es') {
  return language === 'es'
    ? 'Está bien. ¿Qué sección quieres cambiar: información del paciente, información médica, antecedentes médicos o documentos?'
    : 'Okay. Which section would you like to change: patient information, medical info, past medical history, or documents?';
}

function getSubmitSuccessPrompt(language: 'en' | 'es') {
  return language === 'es'
    ? 'Tu registro se envió correctamente.'
    : 'Your check-in was submitted successfully.';
}

function getSubmitCancelledPrompt(language: 'en' | 'es') {
  return language === 'es'
    ? 'Está bien. Puedes revisar los detalles antes de enviarlo.'
    : 'Okay. You can review the details before submitting.';
}

function resolveReviewSectionStep(
  transcript: string,
  language: 'en' | 'es',
): IntakeStepKey | null {
  const normalized = normalizeTranscriptText(transcript).toLowerCase();

  if (
    normalized.includes('patient') ||
    normalized.includes('basic') ||
    normalized.includes('paciente')
  ) {
    return 'basicInfo';
  }
  if (
    normalized.includes('medical info') ||
    normalized.includes('medical') ||
    normalized.includes('symptom') ||
    normalized.includes('médica')
  ) {
    return 'symptoms';
  }
  if (
    normalized.includes('past medical') ||
    normalized.includes('history') ||
    normalized.includes('antecedentes')
  ) {
    return 'pastMedicalHistory';
  }
  if (
    normalized.includes('document') ||
    normalized.includes('insurance') ||
    normalized.includes('id')
  ) {
    return 'documents';
  }

  return null;
}

function isVoiceStepComplete(options: {
  activeField: string | null;
  form: IntakeFormData;
  pastMedicalHistoryField: PastMedicalHistoryVoiceField | null;
  step: IntakeStepKey;
}) {
  const { activeField, form, pastMedicalHistoryField, step } = options;

  if (step === 'pastMedicalHistory') {
    return pastMedicalHistoryField === null;
  }

  if (step === 'review') {
    return true;
  }

  return getFirstIncompleteJanetField(step, form) === null && activeField === null;
}

function getCanonicalVoicePrompt(options: {
  field: string | null;
  language: 'en' | 'es';
  pastMedicalHistoryField: PastMedicalHistoryVoiceField | null;
  step: IntakeStepKey;
}) {
  const { field, language, pastMedicalHistoryField, step } = options;

  if (step === 'pastMedicalHistory') {
    return buildPastMedicalHistoryPrompt(pastMedicalHistoryField, language);
  }

  if (!field) {
    return '';
  }

  return getJanetFieldPrompt(
    field as Parameters<typeof getJanetFieldPrompt>[0],
    language,
  );
}

export function VoiceExperience({
  embedded = false,
  onClose,
  onSwitchToTyping,
}: VoiceExperienceProps) {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const {
    closeJanetMode,
    setJanetLanguage,
    setJanetModeStep,
    setIntakeStep,
    setVoiceEditing,
    setVoiceHandoff,
    setVoiceListening,
    setVoiceSpellMode,
    setVoiceTranscript,
    startNewIntake,
    state,
    submitCurrentIntake,
    syncCurrentDraft,
    syncVoiceHandoff,
    updateIntakeFields,
  } = useDraftStore();

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const bootstrapKeyRef = useRef('');
  const lastSpokenTextRef = useRef('');
  const autoPlayedSessionRef = useRef('');
  const autoListenRef = useRef('');
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectedSpeechRef = useRef(false);
  const stopRecordingAndProcessRef = useRef<(() => Promise<void>) | null>(null);
  const handleJanetTurnRef = useRef<
    ((
      transcript: string,
      confidence: number | null,
      interactionMode?: 'correction' | 'normal' | 'spell',
    ) => Promise<void>) | null
  >(null);
  const liveSpeechTranscriptRef = useRef('');
  const liveSpeechConfidenceRef = useRef<number | null>(null);
  const liveSpeechAudioUriRef = useRef<string | null>(null);
  const liveSpeechActiveRef = useRef(false);
  const liveSpeechFinalizingRef = useRef(false);
  const [session, setSession] = useState<JanetSessionState | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [confirmation, setConfirmation] =
    useState<JanetConfirmationState>(EMPTY_CONFIRMATION);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [speechState, setSpeechState] =
    useState<JanetSpeechPlaybackState>('ready');
  const [autoListenEnabled] = useState(true);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [liveMeterLevel, setLiveMeterLevel] = useState(0);
  const [pendingAutoListenToken, setPendingAutoListenToken] = useState<string | null>(
    null,
  );
  const [pendingScanResult, setPendingScanResult] = useState<PendingScanResult | null>(
    null,
  );
  const [localConfirmation, setLocalConfirmation] =
    useState<LocalConfirmationState | null>(null);
  const [janetFlowMode, setJanetFlowMode] =
    useState<JanetFlowMode>('field_question');
  const [pendingNextStep, setPendingNextStep] = useState<IntakeStepKey | null>(null);
  const [awaitingReviewSectionChoice, setAwaitingReviewSectionChoice] =
    useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningDocumentType, setScanningDocumentType] = useState<
    DocumentScanResult['documentType'] | null
  >(null);
  const [pastMedicalHistoryField, setPastMedicalHistoryField] =
    useState<PastMedicalHistoryVoiceField | null>(null);
  const hasDraftProgress = useMemo(
    () => Object.values(state.intake.form).some((value) => hasIntakeProgressValue(value)),
    [state.intake.form],
  );
  const liveSpeechAvailability = useMemo(
    () => getJanetLiveSpeechAvailability(),
    [],
  );

  const janetStep = state.janetMode.active
    ? state.janetMode.currentStep
    : state.intake.currentStep;
  const janetCopy = JANET_UI_COPY[state.janetMode.language];
  const backendJanetStep = isBackendManagedJanetStep(janetStep)
    ? inferJanetConversationStep(janetStep)
    : 'symptoms';
  const activeManagedField =
    janetStep === 'pastMedicalHistory'
      ? pastMedicalHistoryField
      : resolveJanetFieldForStep(
          janetStep,
          state.intake.form,
          session?.currentField ?? null,
        );
  const currentFieldLabel = janetStep === 'pastMedicalHistory'
    ? getJanetFieldLabel(pastMedicalHistoryField)
    : getJanetFieldLabel(activeManagedField);
  const currentStepTitle = getJanetStepTitle(
    janetStep,
    janetStep === 'pastMedicalHistory' ? pastMedicalHistoryField : activeManagedField,
  );
  const canonicalVoicePrompt = getCanonicalVoicePrompt({
    field: activeManagedField,
    language: state.janetMode.language,
    pastMedicalHistoryField,
    step: janetStep,
  });
  const currentSpeechText = buildJanetSpeechText({
    confirmation,
    handoff: state.voice.handoff,
    replyText,
    spellModeEnabled: state.voice.spellModeEnabled,
  });
  const resolvedSpeechText =
    !confirmation.required && canonicalVoicePrompt.trim().length > 0
      ? canonicalVoicePrompt
      : currentSpeechText;
  const previewRows = useMemo(
    () =>
      buildPreviewRows(janetStep, state.intake.form).filter(
        ([, value]) => value.trim().length > 0,
      ),
    [janetStep, state.intake.form],
  );
  const hasInsuranceUpload =
    Boolean(state.uploads.insurance) ||
    state.backend.uploads.insurance.status === 'uploaded';
  const hasGovernmentIdUpload =
    Boolean(state.uploads.id) || state.backend.uploads.id.status === 'uploaded';
  const livePillLabel = getLivePillLabel({
    isBootstrapping,
    isProcessing,
    isRecording,
    speechState,
  });
  const transcriptPreview = useMemo(() => {
    if (partialTranscript.trim()) {
      return partialTranscript;
    }
    if (finalTranscript.trim()) {
      return finalTranscript;
    }
    if (isRecording) {
      return janetCopy.listening;
    }
    if (isProcessing) {
      return janetCopy.processing;
    }
    return janetCopy.tapOrSpeak;
  }, [
    finalTranscript,
    isProcessing,
    isRecording,
    janetCopy.listening,
    janetCopy.processing,
    janetCopy.tapOrSpeak,
    partialTranscript,
  ]);

  const stopPlayback = useCallback(async () => {
    await stopJanetReplyAudio(soundRef.current);
    soundRef.current = null;
    setSpeechState(lastSpokenTextRef.current.trim() ? 'paused' : 'ready');
  }, []);

  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  const bootstrapSession = useCallback(
    async (options?: {
      currentStepOverride?: JanetConversationStep | null;
      force?: boolean;
      formOverride?: IntakeFormData;
    }) => {
      if (!isBackendManagedJanetStep(janetStep)) {
        const nextPastMedicalHistoryField = getNextPastMedicalHistoryField(
          options?.formOverride ?? state.intake.form,
        );
        setPastMedicalHistoryField(nextPastMedicalHistoryField);
        setReplyText(
          buildPastMedicalHistoryPrompt(
            nextPastMedicalHistoryField,
            state.janetMode.language,
          ),
        );
        setSession(null);
        setConfirmation(EMPTY_CONFIRMATION);
        setPartialTranscript('');
        setFinalTranscript('');
        return null;
      }

      const nextBootstrapKey = [
        state.backend.draft.draftId ?? '',
        state.backend.draft.patientId ?? '',
        state.backend.draft.visitId ?? '',
        options?.currentStepOverride ?? janetStep,
        options?.formOverride?.firstName ?? state.intake.form.firstName,
        options?.formOverride?.lastName ?? state.intake.form.lastName,
        options?.formOverride?.dateOfBirth ?? state.intake.form.dateOfBirth,
        state.janetMode.language,
      ].join(':');

      if (!options?.force && bootstrapKeyRef.current === nextBootstrapKey) {
        return session;
      }

      if (isBootstrapping) {
        return session;
      }

      bootstrapKeyRef.current = nextBootstrapKey;
      setIsBootstrapping(true);
      setMicError(null);

      try {
        const nextSession = await bootstrapJanetSession({
          currentStep: options?.currentStepOverride ?? backendJanetStep,
          draftId: state.backend.draft.draftId,
          form: options?.formOverride ?? state.intake.form,
          language: state.janetMode.language,
          patientId: state.backend.draft.patientId,
          returningPatient: state.returningPatient.form,
          visitId: state.backend.draft.visitId,
        });
        const mergedForm = {
          ...(options?.formOverride ?? state.intake.form),
          ...nextSession.draftPatch,
        };
        const resolvedField = resolveJanetFieldForStep(
          nextSession.currentStep,
          mergedForm,
          nextSession.currentField,
        );
        const useFallbackPrompt =
          !isJanetFieldActiveForStep(nextSession.currentStep, nextSession.currentField) &&
          Boolean(resolvedField);

        const canonicalPrompt = getCanonicalVoicePrompt({
          field: resolvedField,
          language: state.janetMode.language,
          pastMedicalHistoryField: null,
          step: nextSession.currentStep,
        });
        setSession({
          ...nextSession,
          currentField: resolvedField,
          firstPrompt: canonicalPrompt || nextSession.firstPrompt,
        });
        setConfirmation(nextSession.confirmation);
        setReplyText(
          useFallbackPrompt && resolvedField
            ? getJanetFieldPrompt(resolvedField, state.janetMode.language)
            : canonicalPrompt || nextSession.firstPrompt,
        );

        if (Object.keys(nextSession.draftPatch).length > 0) {
          updateIntakeFields(nextSession.draftPatch);
        }

        setPartialTranscript('');
        setFinalTranscript('');

        return nextSession;
      } catch (error) {
        setMicError(
          error instanceof Error && error.message
            ? error.message
            : 'Janet could not start right now.',
        );
        return null;
      } finally {
        setIsBootstrapping(false);
      }
    },
    [
      isBootstrapping,
      session,
      state.backend.draft.draftId,
      state.backend.draft.patientId,
      state.backend.draft.visitId,
      janetStep,
      state.intake.form,
      state.janetMode.language,
      state.returningPatient.form,
      updateIntakeFields,
      backendJanetStep,
    ],
  );

  const handleRecordingStatusUpdate = useCallback(
    (status: JanetRecordingStatus) => {
      if (!status.isRecording) {
        setLiveMeterLevel(0);
        clearSilenceTimeout();
        return;
      }

      const metering = typeof status.metering === 'number' ? status.metering : null;
      if (metering === null) {
        setLiveMeterLevel(0);
        return;
      }

      const normalizedMeter = Math.max(
        0,
        Math.min(1, (metering - JANET_TIMING.silenceThresholdDb) / 24),
      );
      setLiveMeterLevel(normalizedMeter);

      const hasSpeechNow =
        metering > JANET_TIMING.speechStartThresholdDb &&
        status.durationMillis > JANET_TIMING.minimumSpeechDurationMs;
      const isQuietNow = metering < JANET_TIMING.silenceThresholdDb;

      if (hasSpeechNow) {
        detectedSpeechRef.current = true;
        clearSilenceTimeout();
        return;
      }

      if (
        isQuietNow &&
        detectedSpeechRef.current &&
        !silenceTimeoutRef.current &&
        status.durationMillis > 900
      ) {
        silenceTimeoutRef.current = setTimeout(() => {
          silenceTimeoutRef.current = null;
          void stopRecordingAndProcessRef.current?.();
        }, JANET_TIMING.silenceDurationMs);
      }
    },
    [clearSilenceTimeout],
  );

  const resetLiveSpeechCapture = useCallback(() => {
    liveSpeechTranscriptRef.current = '';
    liveSpeechConfidenceRef.current = null;
    liveSpeechAudioUriRef.current = null;
    liveSpeechActiveRef.current = false;
    liveSpeechFinalizingRef.current = false;
    setLiveMeterLevel(0);
  }, []);

  const finalizeLiveSpeechCapture = useCallback(async () => {
    if (liveSpeechFinalizingRef.current) {
      return;
    }

    liveSpeechFinalizingRef.current = true;
    liveSpeechActiveRef.current = false;
    setIsRecording(false);
    setVoiceListening(false);
    setIsProcessing(true);
    setLiveMeterLevel(0);

    try {
      let transcript = normalizeTranscriptText(liveSpeechTranscriptRef.current);
      let confidence = liveSpeechConfidenceRef.current;
      const audioUri = liveSpeechAudioUriRef.current;

      if (audioUri) {
        try {
          const transcription = await transcribeJanetAudio({
            currentStep: backendJanetStep,
            language: state.janetMode.language,
            sessionId: session?.sessionId ?? '',
            uri: audioUri,
          });
          const backendTranscript = normalizeTranscriptText(transcription.text);
          if (isMeaningfulTranscript(backendTranscript)) {
            transcript = backendTranscript;
            confidence = transcription.confidence ?? confidence;
            setWarnings(transcription.warnings);
            setPartialTranscript('');
            setFinalTranscript(backendTranscript);
            setVoiceTranscript(backendTranscript);
          }
        } catch (error) {
          if (!isMeaningfulTranscript(transcript)) {
            throw error;
          }
        }
      }

      if (!isMeaningfulTranscript(transcript)) {
        setWarnings((currentWarnings) =>
          currentWarnings.length > 0
            ? currentWarnings
            : ['Janet did not catch a clear answer.'],
        );
        setMicError('Janet did not catch a clear answer. Please try again.');
        return;
      }

      await handleJanetTurnRef.current?.(
        transcript,
        confidence,
        state.voice.spellModeEnabled ? 'spell' : 'normal',
      );
    } catch (error) {
      setMicError(
        error instanceof Error && error.message
          ? error.message
          : 'We could not finish the voice capture.',
      );
    } finally {
      setIsProcessing(false);
      resetLiveSpeechCapture();
    }
  }, [
    backendJanetStep,
    resetLiveSpeechCapture,
    session?.sessionId,
    setVoiceListening,
    setVoiceTranscript,
    state.janetMode.language,
    state.voice.spellModeEnabled,
  ]);

  const startRecording = useCallback(async () => {
    setMicError(null);
    setWarnings([]);

    try {
      if (!session?.sessionId) {
        if (isBackendManagedJanetStep(janetStep)) {
          const nextSession = await bootstrapSession({ force: true });
          if (!nextSession?.sessionId) {
            throw new Error('Janet is still getting ready. Please try again.');
          }
        } else {
          const transcriptionSession = await bootstrapJanetSession({
            currentStep: 'symptoms',
            draftId: state.backend.draft.draftId,
            form: state.intake.form,
            language: state.janetMode.language,
            patientId: state.backend.draft.patientId,
            returningPatient: state.returningPatient.form,
            visitId: state.backend.draft.visitId,
          });
          setSession(transcriptionSession);
        }
      }

      if (
        liveSpeechAvailability.moduleAvailable &&
        liveSpeechAvailability.recognitionAvailable
      ) {
        const permission = await requestJanetLiveSpeechPermissions();
        if (!permission.granted) {
          throw new Error(
            'Speech recognition permission is required for live Janet voice intake.',
          );
        }

        await stopPlayback();
        liveSpeechTranscriptRef.current = '';
        liveSpeechConfidenceRef.current = null;
        liveSpeechAudioUriRef.current = null;
        liveSpeechActiveRef.current = true;
        liveSpeechFinalizingRef.current = false;
        setPartialTranscript('');
        setFinalTranscript('');
        setIsRecording(true);
        setVoiceEditing(false);
        setVoiceListening(true);
        setSpeechState('ready');
        setVoiceTranscript('Listening for the next answer...');
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        startJanetLiveSpeech({
          contextualStrings: buildRecognitionContext(
            activeManagedField,
            state.intake.form,
          ),
          language: state.janetMode.language === 'es' ? 'es-US' : 'en-US',
        });
        return;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission is required for Janet voice intake.');
      }

      await stopPlayback();
      await configureJanetRecordingAudioMode();

      const recording = new Audio.Recording();
      detectedSpeechRef.current = false;
      clearSilenceTimeout();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recording.setOnRecordingStatusUpdate(handleRecordingStatusUpdate);
      recording.setProgressUpdateInterval(250);
      await recording.startAsync();
      recordingRef.current = recording;
      setPartialTranscript('');
      setFinalTranscript('');
      setIsRecording(true);
      setVoiceEditing(false);
      setVoiceListening(true);
      setSpeechState('ready');
      setVoiceTranscript(
        state.voice.spellModeEnabled
          ? 'Spell mode is on. Janet is listening carefully for one detail at a time.'
          : 'Listening for the next answer...',
      );
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      setMicError(
        error instanceof Error && error.message
          ? error.message
          : 'Janet could not start the microphone.',
      );
      setIsRecording(false);
      setVoiceListening(false);
    }
  }, [
    activeManagedField,
    bootstrapSession,
    clearSilenceTimeout,
    handleRecordingStatusUpdate,
    janetStep,
    liveSpeechAvailability.moduleAvailable,
    liveSpeechAvailability.recognitionAvailable,
    session?.sessionId,
    setVoiceEditing,
    setVoiceListening,
    setVoiceTranscript,
    state.backend.draft.draftId,
    state.backend.draft.patientId,
    state.backend.draft.visitId,
    state.voice.spellModeEnabled,
    state.intake.form,
    state.janetMode.language,
    state.returningPatient.form,
    stopPlayback,
  ]);

  const playPrompt = useCallback(
    async (text: string, options?: { autoListenAfter?: boolean }) => {
      const trimmedText = text.trim();
      if (!trimmedText) {
        return;
      }

      const shouldAutoListenAfter = options?.autoListenAfter ?? autoListenEnabled;
      setMicError(null);
      setSpeechState('processing');
      lastSpokenTextRef.current = trimmedText;

      try {
        if (!voiceOutputEnabled) {
          setSpeechState('replay');
          if (shouldAutoListenAfter) {
            setPendingAutoListenToken(
              `${session?.sessionId ?? 'local'}:${Date.now()}:${trimmedText}`,
            );
          }
          return;
        }

        await stopJanetReplyAudio(soundRef.current);
        await configureJanetPlaybackAudioMode();
        await wait(JANET_TIMING.preSpeakDelayMs);
        soundRef.current = await playJanetReplyAudio({
          cacheSafe: false,
          fallbackToDeviceSpeech: true,
          language: state.janetMode.language,
          onComplete: () => {
            setSpeechState('replay');
            if (shouldAutoListenAfter) {
              setPendingAutoListenToken(
                `${session?.sessionId ?? 'local'}:${Date.now()}:${trimmedText}`,
              );
            }
          },
          onStart: () => {
            setSpeechState('speaking');
          },
          sessionId: session?.sessionId ?? null,
          text: trimmedText,
        });
      } catch (error) {
        setMicError(
          error instanceof Error && error.message
            ? error.message
            : 'Janet voice guidance is unavailable right now.',
        );
        setSpeechState(lastSpokenTextRef.current.trim() ? 'replay' : 'ready');
      }
    },
    [autoListenEnabled, session?.sessionId, state.janetMode.language, voiceOutputEnabled],
  );

  const queuePrompt = useCallback(
    async (prompt: string, options?: { autoListenAfter?: boolean }) => {
      setReplyText(prompt);
      await playPrompt(prompt, options);
    },
    [playPrompt],
  );

  const beginVoiceStep = useCallback(
    async (step: IntakeStepKey) => {
      bootstrapKeyRef.current = '';
      autoPlayedSessionRef.current = '';
      autoListenRef.current = '';
      setPendingNextStep(null);
      setAwaitingReviewSectionChoice(false);
      setJanetFlowMode(step === 'review' ? 'review_summary' : 'field_question');
      setConfirmation(EMPTY_CONFIRMATION);
      setLocalConfirmation(null);
      setSession(null);
      setIntakeStep(step);
      setJanetModeStep(step);

      if (step === 'review') {
        const reviewPrompt = buildReviewSummaryPrompt({
          form: state.intake.form,
          hasGovernmentIdUpload,
          hasInsuranceUpload,
          language: state.janetMode.language,
        });
        setConfirmation({
          choices: [],
          field: null,
          prompt: reviewPrompt,
          required: true,
        });
        await queuePrompt(reviewPrompt, { autoListenAfter: false });
        return;
      }

      if (step === 'pastMedicalHistory') {
        const nextField = getNextPastMedicalHistoryField(state.intake.form);
        setPastMedicalHistoryField(nextField);
        const prompt = buildPastMedicalHistoryPrompt(
          nextField,
          state.janetMode.language,
        );
        await queuePrompt(prompt);
        return;
      }

      const prompt = getCanonicalVoicePrompt({
        field: getFirstIncompleteJanetField(step, state.intake.form),
        language: state.janetMode.language,
        pastMedicalHistoryField: null,
        step,
      });
      if (prompt.trim()) {
        await queuePrompt(prompt);
      }
    },
    [
      hasGovernmentIdUpload,
      hasInsuranceUpload,
      queuePrompt,
      setIntakeStep,
      setJanetModeStep,
      state.intake.form,
      state.janetMode.language,
    ],
  );

  const queueStepTransitionPrompt = useCallback(
    async (step: IntakeStepKey) => {
      const nextStep = getNextStep(step);
      if (!nextStep) {
        return;
      }

      const prompt = getStepTransitionPrompt(step, state.janetMode.language);
      setPendingNextStep(nextStep);
      setJanetFlowMode('step_transition_confirmation');
      setAwaitingReviewSectionChoice(false);
      setConfirmation({
        choices: [],
        field: null,
        prompt,
        required: true,
      });
      await queuePrompt(prompt);
    },
    [queuePrompt, state.janetMode.language],
  );

  const handleJanetTurn = useCallback(
    async (
      transcript: string,
      confidence: number | null,
      interactionMode: 'correction' | 'normal' | 'spell' = 'normal',
    ) => {
      const normalizedTranscript = normalizeTranscriptText(transcript).toLowerCase();

      if (janetFlowMode === 'step_transition_confirmation') {
        if (pendingNextStep && transcriptMatchesIntent(transcript, CONTINUE_INTENTS)) {
          await beginVoiceStep(pendingNextStep);
          return;
        }

        if (transcriptMatchesIntent(transcript, PAUSE_INTENTS)) {
          const prompt = getStepTransitionDeclinedPrompt(state.janetMode.language);
          setAwaitingReviewSectionChoice(false);
          setConfirmation(EMPTY_CONFIRMATION);
          await queuePrompt(prompt);
          return;
        }

        if (
          normalizedTranscript.includes('edit') ||
          normalizedTranscript.includes('manual') ||
          normalizedTranscript.includes('editar')
        ) {
          await queuePrompt(
            state.janetMode.language === 'es'
              ? 'Está bien. Usa editar manualmente para hacer cambios en este paso.'
              : 'Okay. Use edit manually to make changes in this step.',
            { autoListenAfter: false },
          );
          return;
        }

        if (
          normalizedTranscript.includes('review') ||
          normalizedTranscript.includes('revis')
        ) {
          await queuePrompt(
            buildStepReviewPrompt({
              language: state.janetMode.language,
              previewRows,
              step: janetStep,
            }),
            { autoListenAfter: false },
          );
          return;
        }

        if (
          normalizedTranscript.includes('repeat') ||
          normalizedTranscript.includes('repet')
        ) {
          const repeatPrompt = getCanonicalVoicePrompt({
            field: activeManagedField,
            language: state.janetMode.language,
            pastMedicalHistoryField,
            step: janetStep,
          });
          if (repeatPrompt.trim()) {
            await queuePrompt(repeatPrompt);
          }
          return;
        }
      }

      if (janetFlowMode === 'review_summary') {
        if (awaitingReviewSectionChoice) {
          const targetStep = resolveReviewSectionStep(
            transcript,
            state.janetMode.language,
          );
          if (targetStep) {
            await beginVoiceStep(targetStep);
            return;
          }

          await queuePrompt(getReviewSectionChoicePrompt(state.janetMode.language), {
            autoListenAfter: true,
          });
          return;
        }

        if (transcriptMatchesIntent(transcript, CONTINUE_INTENTS)) {
          const prompt = getSubmitConfirmationPrompt(state.janetMode.language);
          setJanetFlowMode('final_submit_confirmation');
          setConfirmation({
            choices: [],
            field: null,
            prompt,
            required: true,
          });
          await queuePrompt(prompt);
          return;
        }

        if (transcriptMatchesIntent(transcript, PAUSE_INTENTS)) {
          const prompt = getReviewSectionChoicePrompt(state.janetMode.language);
          setAwaitingReviewSectionChoice(true);
          setConfirmation(EMPTY_CONFIRMATION);
          await queuePrompt(prompt);
          return;
        }
      }

      if (janetFlowMode === 'final_submit_confirmation') {
        if (transcriptMatchesIntent(transcript, CONTINUE_INTENTS)) {
          setIsProcessing(true);
          const didSubmit = await submitCurrentIntake();
          setIsProcessing(false);
          setConfirmation(EMPTY_CONFIRMATION);
          await queuePrompt(
            didSubmit
              ? getSubmitSuccessPrompt(state.janetMode.language)
              : state.janetMode.language === 'es'
                ? 'No pude enviar el registro todavía.'
                : 'I could not submit the check-in yet.',
            { autoListenAfter: false },
          );
          return;
        }

        if (transcriptMatchesIntent(transcript, PAUSE_INTENTS)) {
          setJanetFlowMode('review_summary');
          setConfirmation(EMPTY_CONFIRMATION);
          await queuePrompt(getSubmitCancelledPrompt(state.janetMode.language), {
            autoListenAfter: false,
          });
          return;
        }
      }

      if (localConfirmation) {
        if (
          interactionMode === 'correction' ||
          transcriptIsNegative(transcript, state.janetMode.language)
        ) {
          const retryPrompt = getCanonicalVoicePrompt({
            field: localConfirmation.field,
            language: state.janetMode.language,
            pastMedicalHistoryField: null,
            step: 'basicInfo',
          });
          setLocalConfirmation(null);
          setConfirmation(EMPTY_CONFIRMATION);
          setReplyText(retryPrompt);
          setFinalTranscript('');
          setVoiceTranscript('');
          await playPrompt(retryPrompt);
          return;
        }

        const correctedValue = normalizeLocalConfirmationValue(
          localConfirmation.field,
          transcript,
        );
        const shouldApplyCurrentValue =
          interactionMode === 'normal' &&
          transcriptIsAffirmative(transcript, state.janetMode.language);

        const confirmedValue = shouldApplyCurrentValue
          ? localConfirmation.value
          : correctedValue;

        if (!confirmedValue) {
          const retryPrompt = getCanonicalVoicePrompt({
            field: localConfirmation.field,
            language: state.janetMode.language,
            pastMedicalHistoryField: null,
            step: 'basicInfo',
          });
          setConfirmation(EMPTY_CONFIRMATION);
          setLocalConfirmation(null);
          setReplyText(retryPrompt);
          await playPrompt(retryPrompt);
          return;
        }

        const updates = normalizeIntakeFormFields({
          [localConfirmation.field]: confirmedValue,
        } as Partial<IntakeFormData>);
        const mergedForm = {
          ...state.intake.form,
          ...updates,
        };
        updateIntakeFields(updates);
        setConfirmation(EMPTY_CONFIRMATION);
        setLocalConfirmation(null);
        setWarnings([]);
        setLowConfidence(false);
        setFinalTranscript(confirmedValue);
        setVoiceTranscript(confirmedValue);

        const nextBasicField = getFirstIncompleteJanetField('basicInfo', mergedForm);
        const nextField = nextBasicField;
        const nextPrompt = getCanonicalVoicePrompt({
          field: nextField,
          language: state.janetMode.language,
          pastMedicalHistoryField: null,
          step: 'basicInfo',
        });

        setSession((currentSession) =>
          currentSession
            ? {
                ...currentSession,
                currentField: nextField,
                currentStep: 'basicInfo',
                draftPatch: {
                  ...currentSession.draftPatch,
                  ...updates,
                },
                firstPrompt: nextPrompt || currentSession.firstPrompt,
              }
            : currentSession,
        );
        setJanetModeStep('basicInfo');
        setTimeout(() => {
          void syncCurrentDraft();
        }, 0);
        if (!nextBasicField) {
          await queueStepTransitionPrompt('basicInfo');
          return;
        }
        setReplyText(nextPrompt);
        if (nextPrompt.trim()) {
          await playPrompt(nextPrompt);
        }
        return;
      }

      if (
        janetStep === 'basicInfo' &&
        isLocalConfirmationField(activeManagedField) &&
        interactionMode !== 'correction'
      ) {
        const normalizedValue = normalizeLocalConfirmationValue(
          activeManagedField,
          transcript,
        );

        if (!normalizedValue) {
          setMicError(
            state.janetMode.language === 'es'
              ? 'Janet no pudo confirmar ese detalle. Inténtalo otra vez.'
              : 'Janet could not confirm that detail. Please try again.',
          );
          return;
        }

        setLocalConfirmation({
          field: activeManagedField,
          value: normalizedValue,
        });
        setConfirmation({
          choices: [],
          field: activeManagedField,
          prompt: buildLocalConfirmationPrompt({
            field: activeManagedField,
            language: state.janetMode.language,
            value: normalizedValue,
          }),
          required: true,
        });
        setWarnings([]);
        setLowConfidence(false);
        setFinalTranscript(normalizedValue);
        setVoiceTranscript(normalizedValue);
        await playPrompt(
          buildLocalConfirmationPrompt({
            field: activeManagedField,
            language: state.janetMode.language,
            value: normalizedValue,
          }),
        );
        return;
      }

      if (janetStep === 'pastMedicalHistory') {
        setIsProcessing(true);
        setMicError(null);

        try {
          const targetField =
            pastMedicalHistoryField ??
            getNextPastMedicalHistoryField(state.intake.form);

          if (!targetField) {
            await queueStepTransitionPrompt('pastMedicalHistory');
            return;
          }

          const normalizedTranscript = normalizeTranscriptText(transcript);
          const hydrated = hydratePastMedicalHistoryFromLegacy(normalizedTranscript);
          const explicitNone = transcriptMeansNone(normalizedTranscript);
          const nextUpdates: Partial<IntakeFormData> = {
            pastMedicalHistoryHydrated: true,
          };

          if (targetField === 'pastMedicalHistoryChronicConditions') {
            nextUpdates.pastMedicalHistoryChronicConditions = explicitNone
              ? []
              : hydrated.pastMedicalHistoryChronicConditions ?? [];
            nextUpdates.pastMedicalHistoryOtherMentalHealthCondition =
              hydrated.pastMedicalHistoryOtherMentalHealthCondition ?? '';
          }

          if (targetField === 'pastMedicalHistorySurgicalHistory') {
            nextUpdates.pastMedicalHistorySurgicalHistory = explicitNone
              ? []
              : hydrated.pastMedicalHistorySurgicalHistory ?? [];
            nextUpdates.pastMedicalHistoryOtherSurgery =
              hydrated.pastMedicalHistoryOtherSurgery ?? '';
          }

          if (targetField === 'pastMedicalHistoryOtherRelevantHistory') {
            nextUpdates.pastMedicalHistoryOtherRelevantHistory = explicitNone
              ? []
              : hydrated.pastMedicalHistoryOtherRelevantHistory ?? [];
          }

          const hasStructuredValue = Object.values(nextUpdates).some((value) =>
            Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? value.trim().length > 0 : value === true,
          );

          if (!hasStructuredValue && !explicitNone) {
            setMicError(
              state.janetMode.language === 'es'
                ? 'Janet no pudo encontrar un antecedente claro. Inténtalo otra vez o edítalo manualmente.'
                : 'Janet could not find a clear history item. Try again or edit it manually.',
            );
            return;
          }

          updateIntakeFields(nextUpdates);
          setFinalTranscript(normalizedTranscript);
          setVoiceTranscript(normalizedTranscript);
          setWarnings([]);
          setLowConfidence(false);

          const mergedForm = {
            ...state.intake.form,
            ...nextUpdates,
          };
          const nextField = explicitNone
            ? getPastMedicalHistoryFieldAfter(targetField)
            : getNextPastMedicalHistoryField(mergedForm);
          setPastMedicalHistoryField(nextField);

          if (nextField) {
            setReplyText(
              buildPastMedicalHistoryPrompt(
                nextField,
                state.janetMode.language,
              ),
            );
            await playPrompt(
              buildPastMedicalHistoryPrompt(
                nextField,
                state.janetMode.language,
              ),
            );
          } else {
            await queueStepTransitionPrompt('pastMedicalHistory');
          }
        } catch (error) {
          setMicError(
            error instanceof Error && error.message
              ? error.message
              : 'Janet could not process that history answer.',
          );
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      if (!session?.sessionId) {
        return;
      }

      setIsProcessing(true);
      setMicError(null);

      try {
        const result = await requestJanetResponse({
          currentStep: backendJanetStep,
          form: state.intake.form,
          interaction: {
            mode:
              interactionMode === 'normal' && state.voice.spellModeEnabled
                ? 'spell'
                : interactionMode,
            targetField: activeManagedField,
          },
          returningPatient: state.returningPatient.form,
          sessionId: session.sessionId,
          transcript,
          transcriptConfidence: confidence,
        });

        const mergedForm = {
          ...state.intake.form,
          ...result.extraction.draftPatch,
        };

        updateIntakeFields(result.extraction.draftPatch);
        const shouldKeepTranscriptVisible =
          result.confirmation.required || result.lowConfidence;
        setPartialTranscript('');
        setFinalTranscript(shouldKeepTranscriptVisible ? transcript : '');
        setVoiceTranscript(shouldKeepTranscriptVisible ? transcript : '');

        const nextHandoff = buildJanetHandoffFromDraft({
          existing: state.voice.handoff,
          form: mergedForm,
          interpretedAt: new Date().toISOString(),
          transcript,
        });
        setVoiceHandoff(nextHandoff);
        const resolvedField = resolveJanetFieldForStep(
          result.extraction.updatedStep,
          mergedForm,
          result.extraction.currentField,
        );
        const backendAdvancedStep = result.extraction.updatedStep !== janetStep;
        const shouldOfferStepTransition =
          janetStep !== 'review' &&
          !result.confirmation.required &&
          !result.lowConfidence &&
          (backendAdvancedStep ||
            isVoiceStepComplete({
              activeField: backendAdvancedStep ? null : resolvedField,
              form: mergedForm,
              pastMedicalHistoryField,
              step: janetStep,
            }));

        if (shouldOfferStepTransition) {
          setSession((currentSession) =>
            currentSession
              ? {
                ...currentSession,
                confirmation: EMPTY_CONFIRMATION,
                currentField: null,
                currentStep: currentSession.currentStep,
                draftPatch: result.extraction.draftPatch,
                missingFields: result.extraction.missingFields,
              }
              : currentSession,
          );
          setConfirmation(EMPTY_CONFIRMATION);
          setWarnings(result.warnings);
          setLowConfidence(result.lowConfidence);
          setTimeout(() => {
            void syncCurrentDraft();
            void syncVoiceHandoff();
          }, 0);
          await queueStepTransitionPrompt(janetStep);
          setIsProcessing(false);
          return;
        }

        setSession((currentSession) =>
          currentSession
            ? {
                ...currentSession,
                confirmation: result.confirmation,
                currentField: resolvedField,
                currentStep: result.extraction.updatedStep,
                draftPatch: result.extraction.draftPatch,
                firstPrompt:
                  !result.confirmation.required
                    ? getCanonicalVoicePrompt({
                        field: resolvedField,
                        language: state.janetMode.language,
                        pastMedicalHistoryField: null,
                        step: result.extraction.updatedStep,
                      }) || currentSession.firstPrompt
                    : currentSession.firstPrompt,
                missingFields: result.extraction.missingFields,
              }
            : currentSession,
        );
        setConfirmation(result.confirmation);
        setReplyText(() => {
          const canonicalPrompt = getCanonicalVoicePrompt({
            field: resolvedField,
            language: state.janetMode.language,
            pastMedicalHistoryField: null,
            step: result.extraction.updatedStep,
          });

          if (!result.confirmation.required && canonicalPrompt.trim().length > 0) {
            return canonicalPrompt;
          }

          return result.janet.text;
        });
        setWarnings(result.warnings);
        setLowConfidence(result.lowConfidence);
        setJanetModeStep(result.extraction.updatedStep);

        setTimeout(() => {
          void syncCurrentDraft();
          void syncVoiceHandoff();
        }, 0);

        if (result.janet.shouldSpeak) {
          const canonicalPrompt =
            !result.confirmation.required
              ? getCanonicalVoicePrompt({
                  field: resolvedField,
                  language: state.janetMode.language,
                  pastMedicalHistoryField: null,
                  step: result.extraction.updatedStep,
                })
              : '';
          await wait(JANET_TIMING.postResponseDelayMs);
          await playPrompt(canonicalPrompt || result.janet.speakText);
        }
      } catch (error) {
        setMicError(
          error instanceof Error && error.message
            ? error.message
            : 'Janet could not process that answer.',
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [
      backendJanetStep,
      activeManagedField,
      awaitingReviewSectionChoice,
      beginVoiceStep,
      janetStep,
      janetFlowMode,
      localConfirmation,
      pastMedicalHistoryField,
      pendingNextStep,
      playPrompt,
      previewRows,
      queuePrompt,
      queueStepTransitionPrompt,
      session,
      setJanetModeStep,
      setVoiceHandoff,
      setVoiceTranscript,
      state.intake.form,
      state.janetMode.language,
      state.returningPatient.form,
      state.voice.handoff,
      state.voice.spellModeEnabled,
      submitCurrentIntake,
      syncCurrentDraft,
      syncVoiceHandoff,
      updateIntakeFields,
    ],
  );

  const stopRecordingAndProcess = useCallback(async () => {
    const activeRecording = recordingRef.current;
    if (!activeRecording) {
      return;
    }

    clearSilenceTimeout();
    detectedSpeechRef.current = false;
    setLiveMeterLevel(0);
    recordingRef.current = null;
    setIsRecording(false);
    setVoiceListening(false);
    setIsProcessing(true);

    try {
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      if (!uri) {
        throw new Error('No voice capture was saved. Please try again.');
      }

      const transcription = await transcribeJanetAudio({
        currentStep: backendJanetStep,
        language: state.janetMode.language,
        sessionId: session?.sessionId ?? '',
        uri,
      });

      const normalizedTranscript = normalizeTranscriptText(transcription.text);
      setPartialTranscript('');
      setFinalTranscript(normalizedTranscript);
      setVoiceTranscript(normalizedTranscript);
      setWarnings(transcription.warnings);

      if (!isMeaningfulTranscript(normalizedTranscript)) {
        setWarnings((currentWarnings) =>
          currentWarnings.length > 0
            ? currentWarnings
            : ['Janet did not catch a clear answer.'],
        );
        setMicError('Janet did not catch a clear answer. Please try again.');
        setIsProcessing(false);
        return;
      }

      await handleJanetTurn(
        normalizedTranscript,
        transcription.confidence,
        state.voice.spellModeEnabled ? 'spell' : 'normal',
      );
    } catch (error) {
      setMicError(
        error instanceof Error && error.message
          ? error.message
          : 'We could not finish the voice capture.',
      );
    } finally {
      setIsProcessing(false);
    }
  }, [
    handleJanetTurn,
    backendJanetStep,
    session?.sessionId,
    clearSilenceTimeout,
    setVoiceListening,
    setVoiceTranscript,
    state.janetMode.language,
    state.voice.spellModeEnabled,
  ]);

  const handleScan = useCallback(
    async (documentType: DocumentScanResult['documentType']) => {
      setMicError(null);
      setWarnings([]);
      setLowConfidence(false);
      setPendingAutoListenToken(null);

      try {
        await stopPlayback();

        const pickerResult = await pickDocumentFromSource('camera');
        if (pickerResult.status === 'cancelled') {
          return;
        }
        if (pickerResult.status === 'permission_denied') {
          throw new Error('Camera permission is required to scan a document.');
        }

        setScanningDocumentType(documentType);
        setIsScanning(true);
        const scanResult = await scanDocumentWithTextract(
          documentType,
          pickerResult.asset,
        );
        const normalizedFields = normalizeIntakeFormFields(
          scanResult.extractedFields,
        );

        if (Object.keys(normalizedFields).length === 0) {
          throw new Error(
            'We could not read details from that document. Please retake the photo or type the details manually.',
          );
        }

        const promptText =
          documentType === 'insurance'
            ? 'I found some insurance details. Please confirm them before I save them.'
            : 'I found some details from your ID. Please confirm them before I save them.';

        setPendingScanResult({
          ...scanResult,
          extractedFields: normalizedFields,
          promptText,
        });
        setConfirmation(EMPTY_CONFIRMATION);
        setFinalTranscript('');
        setPartialTranscript('');
        setVoiceTranscript('');
        setReplyText(promptText);
        setWarnings(scanResult.warnings);
        setSpeechState('ready');
        void playPrompt(promptText, { autoListenAfter: false });
      } catch (error) {
        const errorMessage =
          error instanceof Error && error.message
            ? error.message
            : 'Janet could not scan that document right now.';

        const isUnreadableDocumentError =
          /No readable details were detected|could not read details from that document/i.test(
            errorMessage,
          );
        setMicError(
          isUnreadableDocumentError
            ? 'We could not read that document. Retake it in bright light, keep it flat, and fill the frame, or type the details manually.'
            : errorMessage,
        );
      } finally {
        setIsScanning(false);
        setScanningDocumentType(null);
      }
    },
    [playPrompt, setVoiceTranscript, stopPlayback],
  );

  const handleConfirmScannedFields = useCallback(async () => {
    if (!pendingScanResult) {
      return;
    }

    const mergedForm = normalizeIntakeFormFields({
      ...state.intake.form,
      ...pendingScanResult.extractedFields,
    }) as IntakeFormData;

    updateIntakeFields(pendingScanResult.extractedFields);
    setPendingScanResult(null);
    setWarnings([]);
    setLowConfidence(false);
    setPartialTranscript('');
    setFinalTranscript('');
    setVoiceTranscript('');

    setTimeout(() => {
      void syncCurrentDraft();
    }, 0);

    await bootstrapSession({
      currentStepOverride: backendJanetStep,
      force: true,
      formOverride: mergedForm,
    });
  }, [
    backendJanetStep,
    bootstrapSession,
    pendingScanResult,
    setVoiceTranscript,
    state.intake.form,
    syncCurrentDraft,
    updateIntakeFields,
  ]);


  const handleMicPress = useCallback(async () => {
    if (isBootstrapping || isProcessing) {
      setMicError('Janet is getting ready. Please try again in a moment.');
      return;
    }

    if (isRecording) {
      void Haptics.selectionAsync();
      if (liveSpeechActiveRef.current) {
        stopJanetLiveSpeech();
        return;
      }
      await stopRecordingAndProcess();
      return;
    }

    await startRecording();
  }, [
    isBootstrapping,
    isProcessing,
    isRecording,
    startRecording,
    stopRecordingAndProcess,
  ]);

  const continueInTypedIntake = useCallback(() => {
    setPendingScanResult(null);
    const manualTargetStep = janetStep;

    if (onSwitchToTyping) {
      onSwitchToTyping();
      return;
    }

    if (!state.intake.form.firstName && !state.intake.form.chiefConcern) {
      startNewIntake({
        prefill: EMPTY_MEDICAL_AND_PMH_PREFILL,
        source: 'voice',
        step: manualTargetStep,
      });
    }

    navigation.navigate('Intake', {
      mode: 'intake',
      startStep: manualTargetStep,
      launchSource: 'voice',
      resetKey: `voice-inline-${janetStep}-${Date.now()}`,
    });
  }, [
    janetStep,
    navigation,
    onSwitchToTyping,
    startNewIntake,
    state.intake.form.chiefConcern,
    state.intake.form.firstName,
  ]);

  useEffect(() => {
    stopRecordingAndProcessRef.current = stopRecordingAndProcess;
  }, [stopRecordingAndProcess]);

  useEffect(() => {
    handleJanetTurnRef.current = handleJanetTurn;
  }, [handleJanetTurn]);

  useEffect(() => {
    if (!liveSpeechAvailability.moduleAvailable) {
      return;
    }

    const startSubscription = addJanetLiveSpeechListener('start', () => {
      setIsRecording(true);
      setVoiceListening(true);
      setMicError(null);
      setIsProcessing(false);
    });

    const resultSubscription = addJanetLiveSpeechListener('result', (event) => {
      const transcript = normalizeTranscriptText(
        event.results[0]?.transcript ?? '',
      );
      if (!transcript) {
        return;
      }

      liveSpeechTranscriptRef.current = transcript;
      const confidence = event.results[0]?.confidence;
      if (typeof confidence === 'number' && confidence >= 0) {
        liveSpeechConfidenceRef.current = confidence;
      }
      if (event.isFinal) {
        setFinalTranscript(transcript);
        setPartialTranscript('');
      } else {
        setPartialTranscript(transcript);
      }
      setVoiceTranscript(transcript);
    });

    const audioEndSubscription = addJanetLiveSpeechListener('audioend', (event) => {
      liveSpeechAudioUriRef.current = event.uri;
    });

    const volumeSubscription = addJanetLiveSpeechListener('volumechange', (event) => {
      const normalizedVolume = Math.max(
        0,
        Math.min(1, (event.value + 2) / 12),
      );
      setLiveMeterLevel(normalizedVolume);
    });

    const errorSubscription = addJanetLiveSpeechListener('error', (event) => {
      if (!liveSpeechActiveRef.current) {
        return;
      }

      resetLiveSpeechCapture();
      setIsRecording(false);
      setVoiceListening(false);
      setIsProcessing(false);
      setMicError(
        event.message || 'Janet live listening is unavailable right now.',
      );
    });

    const endSubscription = addJanetLiveSpeechListener('end', () => {
      if (!liveSpeechActiveRef.current) {
        return;
      }

      void finalizeLiveSpeechCapture();
    });

    return () => {
      startSubscription.remove();
      resultSubscription.remove();
      audioEndSubscription.remove();
      volumeSubscription.remove();
      errorSubscription.remove();
      endSubscription.remove();
    };
  }, [
    finalizeLiveSpeechCapture,
    liveSpeechAvailability.moduleAvailable,
    resetLiveSpeechCapture,
    setVoiceListening,
    setVoiceTranscript,
  ]);

  useEffect(() => {
    return () => {
      clearSilenceTimeout();
      abortJanetLiveSpeech();
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      setIsRecording(false);
      void stopPlayback();
    };
  }, [clearSilenceTimeout, stopPlayback]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (janetFlowMode !== 'field_question') {
        return;
      }
      const nextSession = await bootstrapSession();
      if (cancelled || !nextSession?.sessionId) {
        return;
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [bootstrapSession, janetFlowMode]);

  useEffect(() => {
    if (
      janetFlowMode !== 'field_question' ||
      !session?.sessionId ||
      !resolvedSpeechText.trim() ||
      state.voice.isListening ||
      isBootstrapping ||
      isProcessing
    ) {
      return;
    }

    if (autoPlayedSessionRef.current === session.sessionId) {
      return;
    }

    autoPlayedSessionRef.current = session.sessionId;
    void playPrompt(resolvedSpeechText);
  }, [
    isBootstrapping,
    isProcessing,
    janetFlowMode,
    playPrompt,
    resolvedSpeechText,
    session?.sessionId,
    state.voice.isListening,
  ]);

  useEffect(() => {
    if (
      janetFlowMode !== 'field_question' ||
      janetStep !== 'pastMedicalHistory' ||
      !replyText.trim() ||
      isBootstrapping ||
      isProcessing ||
      isRecording
    ) {
      return;
    }

    const autoPlayKey = `pmh:${replyText}`;
    if (autoPlayedSessionRef.current === autoPlayKey) {
      return;
    }

    autoPlayedSessionRef.current = autoPlayKey;
    void playPrompt(replyText, { autoListenAfter: false });
  }, [
    isBootstrapping,
    isProcessing,
    isRecording,
    janetFlowMode,
    janetStep,
    playPrompt,
    replyText,
  ]);

  useEffect(() => {
    const nextBootstrapKey = [
      state.backend.draft.draftId ?? '',
      state.backend.draft.patientId ?? '',
      state.backend.draft.visitId ?? '',
      janetStep,
      state.intake.form.firstName,
      state.intake.form.lastName,
      state.intake.form.dateOfBirth,
      state.janetMode.language,
    ].join(':');

    if (
      janetFlowMode !== 'field_question' ||
      bootstrapKeyRef.current === nextBootstrapKey ||
      isBootstrapping
    ) {
      return;
    }

    void bootstrapSession({ force: true });
  }, [
    bootstrapSession,
    isBootstrapping,
    janetFlowMode,
    state.backend.draft.draftId,
    state.backend.draft.patientId,
    state.backend.draft.visitId,
    state.intake.form,
    state.janetMode.language,
    janetStep,
  ]);

  useEffect(() => {
    if (
      !pendingAutoListenToken ||
      !autoListenEnabled ||
      isBootstrapping ||
      isProcessing ||
      isRecording ||
      state.voice.isListening
    ) {
      return;
    }

    if (autoListenRef.current === pendingAutoListenToken) {
      return;
    }

    autoListenRef.current = pendingAutoListenToken;
    const timeout = setTimeout(() => {
      setPendingAutoListenToken(null);
      void startRecording();
    }, JANET_TIMING.autoListenDelayMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [
    autoListenEnabled,
    isBootstrapping,
    isProcessing,
    isRecording,
    pendingAutoListenToken,
    startRecording,
    state.voice.isListening,
  ]);

  const scanPreviewRows = useMemo(
    () =>
      pendingScanResult
        ? buildScanPreviewRows(
            pendingScanResult.extractedFields,
            pendingScanResult.confidence,
          )
        : [],
    [pendingScanResult],
  );
  const shouldShowScanConfirmation = Boolean(pendingScanResult);
  const showListeningState = isRecording;
  const canOfferIdScan =
    !shouldShowScanConfirmation &&
    janetStep === 'basicInfo' &&
    !showListeningState &&
    !isProcessing &&
    !isScanning;
  const canOfferInsuranceScan =
    !shouldShowScanConfirmation &&
    (janetStep === 'documents' ||
      ['insuranceProvider', 'memberId', 'groupNumber', 'subscriberName'].includes(
        activeManagedField ?? '',
      )) &&
    !showListeningState &&
    !isProcessing &&
    !isScanning;
  const scanAssistCopy = getScanAssistCopy({
    canOfferIdScan,
    canOfferInsuranceScan,
  });
  const currentQuestionText = shouldShowScanConfirmation
    ? pendingScanResult?.promptText ?? 'Please confirm these scanned details before saving them.'
    : janetStep === 'pastMedicalHistory'
      ? replyText.trim() ||
        buildPastMedicalHistoryPrompt(
          pastMedicalHistoryField,
          state.janetMode.language,
        )
    : isScanning
      ? `Janet is reading your ${getDocumentTypeLabel(scanningDocumentType ?? 'id')}.`
    : resolvedSpeechText.trim()
      ? resolvedSpeechText
      : `Janet is working on ${currentFieldLabel}.`;
  const canReplay = resolvedSpeechText.trim().length > 0;
  const displayTranscript = transcriptPreview;
  const shouldShowConfirmationActions =
    !shouldShowScanConfirmation &&
    confirmation.required &&
    !showListeningState &&
    !isProcessing;
  const shouldShowAnswerCard =
    showListeningState ||
    (!shouldShowConfirmationActions &&
      !shouldShowScanConfirmation &&
      (finalTranscript.trim().length > 0 ||
        partialTranscript.trim().length > 0 ||
        lowConfidence ||
        confirmation.required));
  const confirmationTranscript = normalizeTranscriptText(
    finalTranscript || partialTranscript || state.voice.transcriptDraft || '',
  );
  const meterBarStyles = [
    styles.meterBar1,
    styles.meterBar2,
    styles.meterBar3,
    styles.meterBar4,
    styles.meterBar5,
  ];

  const startFreshVoiceCheckIn = useCallback(() => {
    void stopPlayback();
    clearSilenceTimeout();
    bootstrapKeyRef.current = '';
    autoPlayedSessionRef.current = '';
    autoListenRef.current = '';
    lastSpokenTextRef.current = '';
    setPendingAutoListenToken(null);
    setPendingScanResult(null);
    setScanningDocumentType(null);
    setSession(null);
    setReplyText('');
    setLocalConfirmation(null);
    setJanetFlowMode('field_question');
    setPendingNextStep(null);
    setAwaitingReviewSectionChoice(false);
    setConfirmation(EMPTY_CONFIRMATION);
    setWarnings([]);
    setLowConfidence(false);
    setMicError(null);
    setSpeechState('ready');
    setPartialTranscript('');
    setFinalTranscript('');
    setVoiceTranscript('');
    setVoiceHandoff(null);
    setVoiceListening(false);
    setVoiceSpellMode(false);
    setJanetModeStep('basicInfo');
    startNewIntake({
      prefill: EMPTY_MEDICAL_AND_PMH_PREFILL,
      source: 'voice',
      step: 'basicInfo',
    });
  }, [
    clearSilenceTimeout,
    setJanetModeStep,
    setVoiceHandoff,
    setVoiceListening,
    setVoiceSpellMode,
    setVoiceTranscript,
    startNewIntake,
    stopPlayback,
  ]);

  useEffect(() => {
    if (janetStep === 'review' && janetFlowMode === 'field_question') {
      void beginVoiceStep('review');
    }
  }, [beginVoiceStep, janetFlowMode, janetStep]);

  const content = (
    <>
      {!embedded ? (
        <>
          <View style={styles.topbar}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void Haptics.selectionAsync();
                if (onClose) {
                  onClose();
                  return;
                }
                closeJanetMode();
              }}
              style={styles.topbarBackButton}
            >
              <Ionicons
                color={colors.textPrimary}
                name="chevron-back"
                size={22}
              />
            </Pressable>
            <Text style={styles.topbarLabel}>{janetCopy.janetVoiceMode}</Text>
            <View style={styles.topbarActions}>
              <View style={styles.languageToggle}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (state.janetMode.language === 'en') {
                      return;
                    }
                    void Haptics.selectionAsync();
                    setJanetLanguage('en');
                  }}
                  style={[
                    styles.languageOption,
                    state.janetMode.language === 'en'
                      ? styles.languageOptionActive
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      state.janetMode.language === 'en'
                        ? styles.languageOptionTextActive
                        : null,
                    ]}
                  >
                    {JANET_UI_COPY.en.language}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (state.janetMode.language === 'es') {
                      return;
                    }
                    void Haptics.selectionAsync();
                    setJanetLanguage('es');
                  }}
                  style={[
                    styles.languageOption,
                    state.janetMode.language === 'es'
                      ? styles.languageOptionActive
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      state.janetMode.language === 'es'
                        ? styles.languageOptionTextActive
                        : null,
                    ]}
                  >
                    {JANET_UI_COPY.en.spanish}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.soundRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void Haptics.selectionAsync();
                setVoiceOutputEnabled((current) => !current);
              }}
              style={styles.soundButton}
            >
              <Ionicons
                color={colors.primaryDeep}
                name={voiceOutputEnabled ? 'volume-high-outline' : 'volume-mute-outline'}
                size={18}
              />
              <Text style={styles.soundButtonText}>
                {voiceOutputEnabled ? janetCopy.soundOn : janetCopy.soundOff}
              </Text>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <JanetAvatar containerStyle={styles.avatarWrap} size="lg" />
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{janetCopy.greetingTitle}</Text>
              <Text style={styles.heroSubtitle}>
                {janetCopy.greetingSubtitle}
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    Math.round(
                      (Math.max(
                        1,
                        intakeFlowSteps.findIndex((step) => step.key === janetStep) + 1,
                      ) /
                        intakeFlowSteps.length) *
                        100,
                    )
                  }%`,
                },
              ]}
            />
          </View>
        </>
      ) : null}

      {micError ? (
        <DraftBanner
          badgeLabel="Voice"
          message={micError}
          style={styles.banner}
          title="Janet needs attention"
          tone="warning"
        />
      ) : null}

      {lowConfidence && !shouldShowConfirmationActions ? (
        <DraftBanner
          badgeLabel="Confirm"
          message="Janet heard something uncertain. Please confirm the value or try again."
          style={styles.banner}
          title="Low confidence capture"
          tone="warning"
        />
      ) : null}

      {hasDraftProgress && !isRecording && !isProcessing && !embedded ? (
        <SecondaryButton
          onPress={startFreshVoiceCheckIn}
          style={styles.freshStartButton}
          title="Start new check-in"
        />
      ) : null}

      {!embedded ? (
        <View style={styles.stepPanel}>
          <View>
            <Text style={styles.stepKicker}>
              JANET STEP {Math.max(1, intakeFlowSteps.findIndex((step) => step.key === janetStep) + 1)} OF {intakeFlowSteps.length}
            </Text>
            <Text style={styles.stepTitle}>{currentStepTitle}</Text>
          </View>
          <View style={styles.livePill}>
            <Text style={styles.livePillText}>{livePillLabel}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.embeddedHeader}>
          <Text style={styles.embeddedHeaderLabel}>Speaking with Janet</Text>
          <View style={styles.livePill}>
            <Text style={styles.livePillText}>{livePillLabel}</Text>
          </View>
        </View>
      )}

        <View style={styles.questionCard}>
        <Text style={styles.questionKicker}>{janetCopy.currentQuestion}</Text>
        <Text style={styles.questionText}>{currentQuestionText}</Text>
      </View>

      {canOfferIdScan || canOfferInsuranceScan ? (
        <View style={styles.scanAssistCard}>
          <View style={styles.scanAssistHeader}>
            <View style={styles.scanAssistIconWrap}>
              <Ionicons
                color={colors.primaryDeep}
                name={
                  canOfferInsuranceScan && !canOfferIdScan
                    ? 'card-outline'
                    : 'scan-outline'
                }
                size={18}
              />
            </View>
            <View style={styles.scanAssistCopy}>
              <Text style={styles.scanAssistTitle}>{scanAssistCopy.title}</Text>
              <Text style={styles.scanAssistSubtitle}>
                {scanAssistCopy.subtitle}
              </Text>
            </View>
          </View>
          <View style={styles.inlineActions}>
            {canOfferIdScan ? (
              <SecondaryButton
                disabled={isBootstrapping || isProcessing || isScanning}
                icon="scan-outline"
                loading={isScanning && scanningDocumentType === 'id'}
                onPress={() => {
                  void handleScan('id');
                }}
                style={[styles.inlineButton, styles.inlineButtonLeft]}
                title="Scan ID"
              />
            ) : (
              <View style={[styles.inlineButton, styles.inlineButtonLeft]} />
            )}
            {canOfferInsuranceScan ? (
              <SecondaryButton
                disabled={isBootstrapping || isProcessing || isScanning}
                icon="card-outline"
                loading={isScanning && scanningDocumentType === 'insurance'}
                onPress={() => {
                  void handleScan('insurance');
                }}
                style={[
                  styles.inlineButton,
                  canOfferIdScan ? styles.inlineButtonRight : styles.skipButton,
                ]}
                title="Scan Insurance"
              />
            ) : null}
          </View>
          <Text style={styles.scanAssistHint}>
            Janet will ask you to confirm every scanned detail before saving anything.
          </Text>
        </View>
      ) : null}

      {isScanning ? (
        <View style={styles.scanningCard}>
          <Text style={styles.scanningTitle}>Reading document</Text>
          <Text style={styles.scanningText}>
            Janet is checking your {getDocumentTypeLabel(scanningDocumentType ?? 'id')}. This usually takes a few seconds.
          </Text>
        </View>
      ) : null}

      {showListeningState ? (
        <View style={styles.listeningCard}>
          <Text style={styles.listeningTitle}>Janet is listening</Text>
          <Text style={styles.listeningText}>
            Speak naturally and pause when you are done. Janet will capture the answer automatically.
          </Text>
          <View style={styles.meterRow}>
            {meterBarStyles.map((meterBarStyle, index) => {
              const threshold = (index + 1) / 5;
              const isActive = liveMeterLevel >= threshold;
              return (
                <View
                  key={index}
                  style={[
                    styles.meterBar,
                    meterBarStyle,
                    isActive ? styles.meterBarActive : null,
                  ]}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {shouldShowAnswerCard ? (
        <View style={styles.answerCard}>
          <Text style={styles.answerTitle}>I heard</Text>
          <Text style={styles.answerSubtitle}>
            {showListeningState
              ? partialTranscript.trim()
                ? 'Janet is hearing your answer in real time.'
                : 'Janet is listening now.'
              : lowConfidence
                ? 'Janet is less certain and will ask to confirm.'
                : confirmation.required
                  ? 'Janet is ready for your confirmation.'
                  : 'Janet will keep the intake moving one answer at a time.'}
          </Text>
          <Text style={styles.answerTranscript}>
            {displayTranscript || 'Listening for the next answer…'}
          </Text>
        </View>
      ) : null}

      {showListeningState ? (
        <SecondaryButton
          disabled={isProcessing}
          onPress={() => {
            void handleMicPress();
          }}
          style={styles.finishButton}
          title="Stop now"
        />
      ) : shouldShowConfirmationActions || shouldShowScanConfirmation ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void handleMicPress();
          }}
          style={({ pressed }) => [
            styles.micButton,
            pressed ? styles.micButtonPressed : null,
            isProcessing ? styles.micButtonMuted : null,
          ]}
        >
          <Ionicons
            color={colors.surface}
            name={isProcessing ? 'sync' : 'mic'}
            size={42}
          />
          <Text style={styles.micButtonText}>
            {isProcessing || isScanning ? 'Janet is processing…' : 'Start speaking'}
          </Text>
          </Pressable>
      )}

      {shouldShowScanConfirmation ? (
        <View style={styles.confirmationCard}>
          <Text style={styles.confirmationTitle}>Review scanned details</Text>
          <Text style={styles.confirmationSubtitle}>
            Janet found details from your {getDocumentTypeLabel(pendingScanResult?.documentType ?? 'id')}. Review them before saving.
          </Text>
          <View style={styles.previewList}>
            {scanPreviewRows.map((row) => (
              <View key={`${row.label}:${row.value}`} style={styles.previewRow}>
                <View style={styles.previewRowHeader}>
                  <Text style={styles.previewLabel}>{row.label}</Text>
                  {row.confidenceLabel ? (
                    <Text
                      style={[
                        styles.previewMeta,
                        row.isLowConfidence ? styles.previewMetaWarning : null,
                      ]}
                    >
                      {row.confidenceLabel}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.previewValue}>{row.value}</Text>
                {row.isLowConfidence ? (
                  <Text style={styles.previewSupport}>
                    Review this field closely before saving.
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
          {warnings.length > 0 ? (
            <Text style={styles.confirmationHelp}>{warnings[0]}</Text>
          ) : scanPreviewRows.some((row) => row.isLowConfidence) ? (
            <Text style={styles.confirmationHelp}>
              Some scanned fields are less certain and should be reviewed before saving.
            </Text>
          ) : null}
          <Text style={styles.scanAssistHint}>
            Nothing is saved until you confirm these details.
          </Text>
          <View style={styles.inlineActions}>
            <PrimaryButton
              disabled={isProcessing || isScanning}
              onPress={() => {
                void handleConfirmScannedFields();
              }}
              style={[styles.inlineButton, styles.inlineButtonLeft]}
              title="Confirm and save"
            />
            <SecondaryButton
              disabled={isProcessing || isScanning}
              onPress={() => {
                void handleScan(pendingScanResult?.documentType ?? 'id');
              }}
              style={[styles.inlineButton, styles.inlineButtonRight]}
              title="Retake scan"
            />
          </View>
        </View>
      ) : shouldShowConfirmationActions ? (
        <View style={styles.confirmationCard}>
          <Text style={styles.confirmationTitle}>Confirm this answer</Text>
          <Text style={styles.confirmationSubtitle}>
            Janet is waiting for a quick yes or no before moving on.
          </Text>
          {confirmationTranscript ? (
            <View style={styles.confirmationTranscriptWrap}>
              <Text style={styles.confirmationTranscriptLabel}>Current answer</Text>
              <Text style={styles.confirmationTranscriptText}>
                {confirmationTranscript}
              </Text>
            </View>
          ) : null}
          {warnings.length > 0 ? (
            <Text style={styles.confirmationHelp}>
              {warnings[0]}
            </Text>
          ) : lowConfidence ? (
            <Text style={styles.confirmationHelp}>
              Janet heard something uncertain and needs a quick confirmation.
            </Text>
          ) : null}
          <View style={styles.inlineActions}>
            <PrimaryButton
              disabled={isProcessing}
              onPress={() => {
                void handleJanetTurn('yes', 1, 'normal');
              }}
              style={[styles.inlineButton, styles.inlineButtonLeft]}
              title="Yes, that's right"
            />
            <SecondaryButton
              disabled={isProcessing}
              onPress={() => {
                void handleJanetTurn('no', 1, 'correction');
              }}
              style={[styles.inlineButton, styles.inlineButtonRight]}
              title="Try again"
            />
          </View>
        </View>
      ) : null}

      {!shouldShowConfirmationActions && !embedded && !state.voice.transcriptDraft && !state.voice.handoff ? (
        <View style={styles.emptyWrap}>
          <EmptyStateCard
            icon="mic-circle-outline"
            message="Janet uses the same intake draft as typed intake, so you can switch to manual entry without losing progress."
            title="One shared intake draft"
          />
        </View>
      ) : !shouldShowConfirmationActions && state.voice.handoff ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewCardTitle}>Structured intake preview</Text>
          <Text style={styles.previewCardSubtitle}>
            Janet turns your latest answer into the same fields staff and providers will review later.
          </Text>

          <Text style={styles.heardLabel}>
            {formatJanetConfirmation(state.voice.handoff)}
          </Text>

          {previewRows.length > 0 ? (
            <View style={styles.previewList}>
              {previewRows.map(([label, value]) => (
                <View key={label} style={styles.previewRow}>
                  <Text style={styles.previewLabel}>{label}</Text>
                  <Text style={styles.previewValue}>{value}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.previewEmpty}>
              Janet will show structured intake values here after each confirmed answer.
            </Text>
          )}
        </View>
      ) : null}

      {!shouldShowConfirmationActions && warnings.length > 0 ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewCardTitle}>Clarifications</Text>
          <Text style={styles.previewCardSubtitle}>
            Janet is asking for a little extra care before moving on.
          </Text>
          {warnings.map((warning) => (
            <Text key={warning} style={styles.warningText}>
              • {warning}
            </Text>
          ))}
        </View>
      ) : null}

      {shouldShowScanConfirmation ? (
        <View style={styles.utilityRow}>
            <SecondaryButton
              disabled={isProcessing || isScanning}
              icon="create-outline"
              onPress={continueInTypedIntake}
              style={styles.skipButton}
              title={embedded ? 'Type it myself' : janetCopy.editManually}
            />
        </View>
      ) : shouldShowConfirmationActions ? (
        <View style={styles.utilityRow}>
            <SecondaryButton
              disabled={!canReplay || isBootstrapping || isProcessing}
              onPress={() => {
                void playPrompt(resolvedSpeechText);
              }}
              style={[styles.utilityButton, styles.inlineButtonLeft]}
              title={janetCopy.repeat}
            />
            <SecondaryButton
              disabled={isProcessing || isBootstrapping}
              icon="create-outline"
              onPress={continueInTypedIntake}
              style={[styles.utilityButton, styles.inlineButtonRight]}
              title={embedded ? 'Switch to typing' : janetCopy.switchToTyping}
            />
        </View>
      ) : (
        <>
          <View style={styles.utilityRow}>
            <SecondaryButton
              disabled={!canReplay || isBootstrapping || isProcessing || isScanning || showListeningState}
              onPress={() => {
                void playPrompt(resolvedSpeechText);
              }}
              style={[styles.utilityButton, styles.inlineButtonLeft]}
              title={janetCopy.repeat}
            />
            <SecondaryButton
              disabled={isProcessing || isBootstrapping || isScanning}
              icon="create-outline"
              onPress={continueInTypedIntake}
              style={[styles.utilityButton, styles.inlineButtonRight]}
              title={embedded ? 'Switch to typing' : janetCopy.switchToTyping}
            />
          </View>

          <View style={styles.utilityRow}>
            <SecondaryButton
              disabled={isProcessing || isBootstrapping || isScanning}
              icon="text-outline"
              onPress={() => {
                void Haptics.selectionAsync();
                setVoiceSpellMode(!state.voice.spellModeEnabled);
              }}
              style={[styles.utilityButton, styles.inlineButtonLeft]}
              title={state.voice.spellModeEnabled ? 'Spell Mode On' : 'Spell Mode'}
            />
            <SecondaryButton
              disabled={isProcessing || isBootstrapping || isScanning || !activeManagedField}
              onPress={() => {
                void handleJanetTurn('skip', 1, 'normal');
              }}
              style={[styles.utilityButton, styles.inlineButtonRight]}
              title="Skip for now"
            />
          </View>

          {!embedded && (speechState === 'speaking' || speechState === 'processing') ? (
          <View style={styles.utilityRow}>
            <SecondaryButton
              disabled={speechState !== 'speaking' && speechState !== 'processing'}
              onPress={() => {
                void stopPlayback();
              }}
              style={styles.skipButton}
              title={janetCopy.stopAudio}
            />
          </View>
          ) : null}
        </>
      )}
    </>
  );

  if (embedded) {
    return <View style={styles.embeddedContent}>{content}</View>;
  }

  return (
    <ScreenContainer contentContainerStyle={styles.content} style={styles.screen}>
      {content}
    </ScreenContainer>
  );
}

export function VoiceScreen() {
  return <VoiceExperience />;
}

const styles = StyleSheet.create({
  answerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: '100%',
  },
  answerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  answerTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  answerTranscript: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  avatarWrap: {
    flexShrink: 0,
  },
  banner: {
    marginTop: spacing.sm,
  },
  content: {
    alignItems: 'stretch',
    paddingBottom: spacing.xxxl,
  },
  embeddedContent: {
    paddingBottom: spacing.xxxl,
  },
  embeddedHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  embeddedHeaderLabel: {
    ...typography.label,
    color: colors.primaryText,
  },
  confirmationCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  confirmationSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  confirmationTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  confirmationTranscriptLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  confirmationTranscriptText: {
    ...typography.bodyLarge,
    color: colors.primaryText,
    fontWeight: '700',
    lineHeight: 28,
  },
  confirmationTranscriptWrap: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.divider,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  confirmationHelp: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyWrap: {
    marginTop: spacing.md,
  },
  finishButton: {
    marginTop: spacing.md,
  },
  freshStartButton: {
    marginTop: spacing.md,
  },
  heardLabel: {
    ...typography.body,
    color: colors.primaryDeep,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  hero: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  heroCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  heroTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    fontSize: 24,
  },
  inlineActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  inlineButton: {
    flex: 1,
  },
  inlineButtonLeft: {
    marginRight: spacing.xs,
  },
  inlineButtonRight: {
    marginLeft: spacing.xs,
  },
  listeningCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.divider,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  listeningText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  listeningTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  meterBar: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    flex: 1,
    opacity: 0.45,
  },
  meterBar1: {
    height: 8,
  },
  meterBar2: {
    height: 12,
  },
  meterBar3: {
    height: 16,
  },
  meterBar4: {
    height: 12,
  },
  meterBar5: {
    height: 8,
  },
  meterBarActive: {
    backgroundColor: colors.primaryDeep,
    opacity: 1,
  },
  meterRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  livePill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primarySoft,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  livePillText: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  micButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: 20,
    elevation: 8,
    height: 96,
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: {
      height: 12,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: '100%',
  },
  micButtonMuted: {
    opacity: 0.7,
  },
  micButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  micButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
    width: '100%',
  },
  previewCardSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  previewCardTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  previewEmpty: {
    ...typography.body,
    color: colors.textSecondary,
  },
  previewLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  previewMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  previewMetaWarning: {
    color: colors.warning,
  },
  previewList: {
    gap: spacing.sm,
  },
  previewRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  previewRowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewSupport: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  previewValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  primaryActionButton: {
    marginTop: spacing.md,
    minHeight: 56,
  },
  progressFill: {
    backgroundColor: colors.primaryDeep,
    borderRadius: 999,
    height: 10,
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 10,
    marginTop: spacing.lg,
    overflow: 'hidden',
    width: '100%',
  },
  questionCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.divider,
    marginTop: spacing.lg,
    padding: spacing.md,
    width: '100%',
  },
  questionKicker: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  questionText: {
    ...typography.title,
    color: colors.primaryDeep,
    fontSize: 20,
    lineHeight: 28,
    marginTop: spacing.sm,
  },
  screen: {
    backgroundColor: colors.background,
  },
  scanAssistCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  scanAssistCopy: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  scanAssistHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  scanAssistHint: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  scanAssistIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.divider,
    borderRadius: 14,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  scanAssistSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scanAssistTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  scanningCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.divider,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  scanningText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scanningTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  skipButton: {
    flex: 1,
  },
  stepKicker: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stepPanel: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.divider,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    padding: spacing.sm + 2,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    width: '100%',
  },
  stepTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  topbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  topbarActions: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  topbarBackButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderWidth: 1,
    borderRadius: 999,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  topbarLabel: {
    ...typography.title,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: '700',
    marginLeft: spacing.md,
  },
  languageToggle: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 3,
  },
  languageOption: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  languageOptionActive: {
    backgroundColor: colors.surfaceSoft,
  },
  languageOptionText: {
    ...typography.label,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  languageOptionTextActive: {
    color: colors.primaryDeep,
  },
  soundRow: {
    alignItems: 'flex-end',
    marginTop: spacing.sm,
    width: '100%',
  },
  soundButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  soundButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  utilityButton: {
    flex: 1,
  },
  utilityRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  warningText: {
    ...typography.body,
    color: colors.warning,
    marginTop: spacing.sm,
  },
});
