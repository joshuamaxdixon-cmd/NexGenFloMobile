import type { IntakeFormData, IntakeStepKey } from './intake';
import {
  getFirstIncompleteJanetField,
  getJanetFieldPrompt,
  resolveJanetFieldForStep,
} from './intake';

export type JanetFlowMode =
  | 'field_question'
  | 'step_transition_confirmation'
  | 'review_summary'
  | 'final_submit_confirmation';

export type PastMedicalHistoryVoiceField =
  | 'pastMedicalHistoryChronicConditions'
  | 'pastMedicalHistoryOtherRelevantHistory'
  | 'pastMedicalHistorySurgicalHistory';

export function getNextPastMedicalHistoryField(
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

export function getPastMedicalHistoryFieldAfter(
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

export function buildPastMedicalHistoryPrompt(
  field: PastMedicalHistoryVoiceField | null,
  language: 'en' | 'es',
) {
  if (language === 'es') {
    switch (field) {
      case 'pastMedicalHistoryChronicConditions':
        return 'Dime cualquier condición crónica, como asma o diabetes. Puedes decir ninguna o no estoy seguro.';
      case 'pastMedicalHistorySurgicalHistory':
        return 'Dime cualquier cirugía previa, como apéndice o vesícula. Puedes decir ninguna o no estoy seguro.';
      case 'pastMedicalHistoryOtherRelevantHistory':
        return 'Dime cualquier otro antecedente relevante, como fumar o embarazo. Puedes decir ninguna o no estoy seguro.';
      default:
        return 'Vamos a revisar los antecedentes médicos pasados.';
    }
  }

  switch (field) {
    case 'pastMedicalHistoryChronicConditions':
      return 'Tell me any chronic conditions, like asthma or diabetes. You can say none or unsure.';
    case 'pastMedicalHistorySurgicalHistory':
      return 'Tell me any past surgeries, like appendix or gallbladder surgery. You can say none or unsure.';
    case 'pastMedicalHistoryOtherRelevantHistory':
      return 'Tell me any other relevant history, like smoking or pregnancy. You can say none or unsure.';
    default:
      return 'Let’s review past medical history.';
  }
}

export function getCanonicalJanetPrompt(options: {
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

export function resolveJanetVoiceFieldState(options: {
  form: IntakeFormData;
  pastMedicalHistoryField: PastMedicalHistoryVoiceField | null;
  proposedField: string | null;
  step: IntakeStepKey;
}) {
  const { form, pastMedicalHistoryField, proposedField, step } = options;

  if (step === 'review') {
    return {
      activeField: null,
      firstIncompleteField: null,
      isStepComplete: true,
    } as const;
  }

  if (step === 'pastMedicalHistory') {
    const activeField = pastMedicalHistoryField ?? getNextPastMedicalHistoryField(form);
    return {
      activeField,
      firstIncompleteField: activeField,
      isStepComplete: activeField === null,
    } as const;
  }

  const firstIncompleteField = getFirstIncompleteJanetField(step, form);
  const activeField = resolveJanetFieldForStep(step, form, proposedField);

  return {
    activeField,
    firstIncompleteField,
    isStepComplete: firstIncompleteField === null && activeField === null,
  } as const;
}

export function getNextVoiceStep(step: IntakeStepKey) {
  const flow: IntakeStepKey[] = [
    'basicInfo',
    'symptoms',
    'pastMedicalHistory',
    'documents',
    'review',
  ];

  const index = flow.indexOf(step);
  return index >= 0 ? flow[index + 1] ?? null : null;
}

export function coerceJanetProgressStep(
  currentStep: IntakeStepKey,
  proposedStep: IntakeStepKey,
) {
  const flow: IntakeStepKey[] = [
    'basicInfo',
    'symptoms',
    'pastMedicalHistory',
    'documents',
    'review',
  ];

  const currentIndex = flow.indexOf(currentStep);
  const proposedIndex = flow.indexOf(proposedStep);

  if (currentIndex < 0 || proposedIndex < 0) {
    return currentStep;
  }

  return proposedIndex < currentIndex ? currentStep : proposedStep;
}

export function getStepTransitionPrompt(
  currentStep: IntakeStepKey,
  language: 'en' | 'es',
) {
  const nextStep = getNextVoiceStep(currentStep);

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

export function getStepTransitionDeclinedPrompt(language: 'en' | 'es') {
  return language === 'es'
    ? 'Está bien. ¿Quieres revisar este paso, editar manualmente o repetir el último campo?'
    : 'Okay. Would you like to review this step, edit manually, or repeat the last field?';
}

export function buildNoSpeechRetryPrompt(options: {
  fallbackPrompt: string;
  language: 'en' | 'es';
}) {
  const trimmedPrompt = options.fallbackPrompt.trim();

  if (!trimmedPrompt) {
    return options.language === 'es'
      ? 'Sigo escuchando. Tómate tu tiempo y responde cuando estés listo.'
      : "I'm still listening. Take your time and answer when you're ready.";
  }

  return options.language === 'es'
    ? `Sigo escuchando. Tómate tu tiempo y responde cuando estés listo. ${trimmedPrompt}`
    : `I'm still listening. Take your time and answer when you're ready. ${trimmedPrompt}`;
}

export function buildLocalConfirmationPrompt(options: {
  language: 'en' | 'es';
  value: string;
}) {
  const { language, value } = options;
  if (language === 'es') {
    return `Escuché ${value}. ¿Es correcto?`;
  }

  return `I heard ${value}. Is that right?`;
}

export function buildLocalRetryPrompt(options: {
  field: string;
  language: 'en' | 'es';
}) {
  const fieldPrompt = getCanonicalJanetPrompt({
    field: options.field,
    language: options.language,
    pastMedicalHistoryField: null,
    step: 'basicInfo',
  });

  if (options.language === 'es') {
    return `No pude confirmar ese detalle. Intentémoslo otra vez. ${fieldPrompt}`;
  }

  return `I could not confirm that detail. Let's try again. ${fieldPrompt}`;
}
