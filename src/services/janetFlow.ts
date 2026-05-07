import type { IntakeFormData, IntakeStepKey } from './intake';
import {
  buildMedicalInfoAllergyEntries,
  buildMedicalInfoImmunizationEntries,
  buildPastMedicalHistoryEntries,
  formatMedicationAllergySummary,
  getFirstIncompleteJanetField,
  getJanetFieldPrompt,
  resolveJanetFieldForStep,
} from './intake';

export type JanetFlowMode =
  | 'field_question'
  | 'step_transition_confirmation'
  | 'review_summary'
  | 'review_section_detail'
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

// ---------------------------------------------------------------------------
// Phase 5: Review section helpers
// ---------------------------------------------------------------------------

/**
 * Returns a voice-friendly summary for a single review section.
 * Keeps language simple so the TTS output sounds natural.
 */
export function buildReviewSectionSummary(
  section: 'patient' | 'visit' | 'medical' | 'history',
  form: IntakeFormData,
  language: 'en' | 'es',
): string {
  const patientName = [form.firstName, form.lastName].filter(Boolean).join(' ').trim();
  const height =
    form.heightFt || form.heightIn
      ? `${form.heightFt || '0'} foot ${form.heightIn || '0'}`
      : '';

  if (language === 'es') {
    switch (section) {
      case 'patient': {
        const parts: string[] = [];
        if (patientName) parts.push(`Nombre: ${patientName}.`);
        if (form.dateOfBirth) parts.push(`Fecha de nacimiento: ${form.dateOfBirth}.`);
        if (height || form.weightLb)
          parts.push(
            `Altura y peso: ${[height, form.weightLb ? `${form.weightLb} libras` : ''].filter(Boolean).join(', ')}.`,
          );
        if (form.gender) parts.push(`Género: ${form.gender}.`);
        if (form.phoneNumber) parts.push(`Teléfono: ${form.phoneNumber}.`);
        if (form.email) parts.push(`Correo: ${form.email}.`);
        if (form.emergencyContactName)
          parts.push(`Contacto de emergencia: ${form.emergencyContactName}.`);
        return parts.length > 0
          ? `Información del paciente. ${parts.join(' ')}`
          : 'No se capturó información del paciente todavía.';
      }
      case 'visit': {
        const parts: string[] = [];
        if (form.chiefConcern) parts.push(`Motivo: ${form.chiefConcern}.`);
        if (form.symptomDuration) parts.push(`Duración: ${form.symptomDuration}.`);
        if (form.painLevel) parts.push(`Severidad: ${form.painLevel}.`);
        if (form.symptomNotes) parts.push(`Notas: ${form.symptomNotes}.`);
        return parts.length > 0
          ? `Detalles de la visita. ${parts.join(' ')}`
          : 'No se capturó información de la visita todavía.';
      }
      case 'medical': {
        const allergies = buildMedicalInfoAllergyEntries(form);
        const allergyLabel = formatMedicationAllergySummary(form, '');
        const parts: string[] = [];
        if (allergyLabel) parts.push(`Alergias a medicamentos: ${allergyLabel}.`);
        else if (allergies.length > 0) parts.push(`Alergias: ${allergies.join(', ')}.`);
        if (form.medications) parts.push(`Medicamentos: ${form.medications}.`);
        return parts.length > 0
          ? `Información médica. ${parts.join(' ')}`
          : 'No se capturó información médica todavía.';
      }
      case 'history': {
        const pmh = buildPastMedicalHistoryEntries(form);
        const immunizations = buildMedicalInfoImmunizationEntries(form);
        const parts: string[] = [];
        if (pmh.chronic.length > 0)
          parts.push(`Condiciones crónicas: ${pmh.chronic.join(', ')}.`);
        if (pmh.surgical.length > 0)
          parts.push(`Cirugías: ${pmh.surgical.join(', ')}.`);
        if (pmh.otherRelevant.length > 0)
          parts.push(`Otros antecedentes: ${pmh.otherRelevant.join(', ')}.`);
        if (immunizations.length > 0)
          parts.push(`Vacunas: ${immunizations.join(', ')}.`);
        return parts.length > 0
          ? `Antecedentes médicos. ${parts.join(' ')}`
          : 'No se capturaron antecedentes médicos todavía.';
      }
    }
  }

  switch (section) {
    case 'patient': {
      const parts: string[] = [];
      if (patientName) parts.push(`Name: ${patientName}.`);
      if (form.dateOfBirth) parts.push(`Date of birth: ${form.dateOfBirth}.`);
      if (height || form.weightLb)
        parts.push(
          `Height and weight: ${[height, form.weightLb ? `${form.weightLb} pounds` : ''].filter(Boolean).join(', ')}.`,
        );
      if (form.gender) parts.push(`Gender: ${form.gender}.`);
      if (form.phoneNumber) parts.push(`Phone: ${form.phoneNumber}.`);
      if (form.email) parts.push(`Email: ${form.email}.`);
      if (form.emergencyContactName)
        parts.push(`Emergency contact: ${form.emergencyContactName}.`);
      return parts.length > 0
        ? `Patient info. ${parts.join(' ')}`
        : 'No patient info captured yet.';
    }
    case 'visit': {
      const parts: string[] = [];
      if (form.chiefConcern) parts.push(`Reason: ${form.chiefConcern}.`);
      if (form.symptomDuration) parts.push(`Duration: ${form.symptomDuration}.`);
      if (form.painLevel) parts.push(`Severity: ${form.painLevel}.`);
      if (form.symptomNotes) parts.push(`Notes: ${form.symptomNotes}.`);
      return parts.length > 0
        ? `Visit details. ${parts.join(' ')}`
        : 'No visit details captured yet.';
    }
    case 'medical': {
      const allergies = buildMedicalInfoAllergyEntries(form);
      const allergyLabel = formatMedicationAllergySummary(form, '');
      const parts: string[] = [];
      if (allergyLabel) parts.push(`Medication allergies: ${allergyLabel}.`);
      else if (allergies.length > 0) parts.push(`Allergies: ${allergies.join(', ')}.`);
      if (form.medications) parts.push(`Medications: ${form.medications}.`);
      return parts.length > 0
        ? `Medical info. ${parts.join(' ')}`
        : 'No medical info captured yet.';
    }
    case 'history': {
      const pmh = buildPastMedicalHistoryEntries(form);
      const immunizations = buildMedicalInfoImmunizationEntries(form);
      const parts: string[] = [];
      if (pmh.chronic.length > 0)
        parts.push(`Chronic conditions: ${pmh.chronic.join(', ')}.`);
      if (pmh.surgical.length > 0)
        parts.push(`Surgical history: ${pmh.surgical.join(', ')}.`);
      if (pmh.otherRelevant.length > 0)
        parts.push(`Other history: ${pmh.otherRelevant.join(', ')}.`);
      if (immunizations.length > 0)
        parts.push(`Immunizations: ${immunizations.join(', ')}.`);
      return parts.length > 0
        ? `Past history. ${parts.join(' ')}`
        : 'No past history captured yet.';
    }
  }
}

/**
 * Returns the 3 critical spot-check fields (name, DOB, chief concern)
 * as an array of { fieldKey, label, value } so the caller can speak them.
 */
export function getCriticalSpotCheckFields(
  form: IntakeFormData,
): { fieldKey: string; label: string; value: string }[] {
  const patientName = [form.firstName, form.lastName].filter(Boolean).join(' ').trim();
  return [
    { fieldKey: 'firstName', label: 'name', value: patientName || 'not provided' },
    { fieldKey: 'dateOfBirth', label: 'date of birth', value: form.dateOfBirth || 'not provided' },
    { fieldKey: 'chiefConcern', label: 'chief concern', value: form.chiefConcern || 'not provided' },
  ];
}

/**
 * Maps a voice-spoken field reference to { fieldKey, section }.
 * E.g. "phone number" → { fieldKey: 'phoneNumber', section: 'patient' }
 * Returns null if no match found.
 */
export function resolveVoiceFieldReference(
  utterance: string,
): { fieldKey: string; section: 'patient' | 'visit' | 'medical' | 'history' } | null {
  const t = utterance.toLowerCase().trim();

  // Patient section fields
  if (t.includes('first name') || t.includes('nombre')) return { fieldKey: 'firstName', section: 'patient' };
  if (t.includes('last name') || t.includes('apellido')) return { fieldKey: 'lastName', section: 'patient' };
  if (
    t.includes('date of birth') ||
    t.includes('birthday') ||
    t.includes('fecha de nacimiento') ||
    t.includes('dob')
  )
    return { fieldKey: 'dateOfBirth', section: 'patient' };
  if (t.includes('height') || t.includes('estatura') || t.includes('tall'))
    return { fieldKey: 'heightFt', section: 'patient' };
  if (t.includes('weight') || t.includes('peso')) return { fieldKey: 'weightLb', section: 'patient' };
  if (t.includes('gender') || t.includes('sex') || t.includes('género'))
    return { fieldKey: 'gender', section: 'patient' };
  if (
    (t.includes('phone') || t.includes('teléfono') || t.includes('telefono')) &&
    !t.includes('emergency')
  )
    return { fieldKey: 'phoneNumber', section: 'patient' };
  if (t.includes('email') || t.includes('correo')) return { fieldKey: 'email', section: 'patient' };
  if (t.includes('emergency') || t.includes('emergencia'))
    return { fieldKey: 'emergencyContactName', section: 'patient' };

  // Visit section fields
  if (
    t.includes('chief concern') ||
    t.includes('reason') ||
    t.includes('motivo') ||
    t.includes('concern')
  )
    return { fieldKey: 'chiefConcern', section: 'visit' };
  if (t.includes('duration') || t.includes('long') || t.includes('duración'))
    return { fieldKey: 'symptomDuration', section: 'visit' };
  if (
    t.includes('severity') ||
    t.includes('pain level') ||
    t.includes('pain') ||
    t.includes('severidad')
  )
    return { fieldKey: 'painLevel', section: 'visit' };
  if (t.includes('symptom note') || t.includes('nota') || t.includes('notes'))
    return { fieldKey: 'symptomNotes', section: 'visit' };

  // Medical section fields
  if (t.includes('allerg') || t.includes('alergi'))
    return { fieldKey: 'allergyMedicationSelections', section: 'medical' };
  if (t.includes('medication') || t.includes('medicine') || t.includes('medicamento'))
    return { fieldKey: 'medications', section: 'medical' };

  // History section fields
  if (
    t.includes('chronic') ||
    t.includes('condition') ||
    t.includes('crónica') ||
    t.includes('cronica')
  )
    return { fieldKey: 'pastMedicalHistoryChronicConditions', section: 'history' };
  if (t.includes('surger') || t.includes('cirugía') || t.includes('cirugia'))
    return { fieldKey: 'pastMedicalHistorySurgicalHistory', section: 'history' };
  if (
    t.includes('other history') ||
    t.includes('relevant') ||
    t.includes('antecedente')
  )
    return { fieldKey: 'pastMedicalHistoryOtherRelevantHistory', section: 'history' };
  if (
    t.includes('immuniz') ||
    t.includes('vaccine') ||
    t.includes('vacuna')
  )
    return { fieldKey: 'immunizationCoreSelections', section: 'history' };

  return null;
}
