import { useMemo, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CompactSummaryRow } from '../../components/CompactSummaryRow';
import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import { SearchableCheckboxPicker } from '../../components/SearchableCheckboxPicker';
import {
  buildMedicalInfoAllergyEntries,
  buildMedicalInfoImmunizationEntries,
  formatCompactSelectionSummary,
  formatCompactTextSummary,
  medicalInfoCategoryOptions,
  type IntakeFormData,
} from '../../services';
import { colors, spacing, typography } from '../../theme';
import type { IntakeStepComponentProps, IntakeVoiceFieldBinding } from './types';

type CheckboxEditorKey =
  | 'allergyEnvironmentalSelections'
  | 'allergyFoodSelections'
  | 'allergyMaterialSelections'
  | 'allergyMedicationSelections'
  | 'immunizationCoreSelections'
  | 'immunizationRoutineSelections'
  | 'immunizationTravelSelections';

type TextEditorKey =
  | 'allergyNotes'
  | 'allergyReaction'
  | 'chiefConcern'
  | 'lastDose'
  | 'medications'
  | 'painLevel'
  | 'pharmacy'
  | 'symptomDuration'
  | 'symptomNotes';

type MedicalInfoEditorKey = CheckboxEditorKey | TextEditorKey;

const checkboxEditorOrder: CheckboxEditorKey[] = [
  'allergyMedicationSelections',
  'allergyMaterialSelections',
  'allergyFoodSelections',
  'allergyEnvironmentalSelections',
  'immunizationCoreSelections',
  'immunizationRoutineSelections',
  'immunizationTravelSelections',
];

const searchEnabledEditors = new Set<CheckboxEditorKey>(checkboxEditorOrder);

const editorTitles: Record<MedicalInfoEditorKey, string> = {
  allergyEnvironmentalSelections: 'Environmental Allergies',
  allergyFoodSelections: 'Food Allergies',
  allergyMaterialSelections: 'Material / Contact Allergies',
  allergyMedicationSelections: 'Medication Allergies',
  allergyNotes: 'Allergy Safety Notes',
  allergyReaction: 'Allergy Reaction Details',
  chiefConcern: 'Reason for Visit',
  immunizationCoreSelections: 'Core Vaccines',
  immunizationRoutineSelections: 'Routine Adult Vaccines',
  immunizationTravelSelections: 'Travel / Risk-Based Vaccines',
  lastDose: 'Last Dose',
  medications: 'Medications',
  painLevel: 'Severity',
  pharmacy: 'Preferred Pharmacy',
  symptomDuration: 'Duration',
  symptomNotes: 'Symptom Notes',
};

function arraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function EditorSheet({
  children,
  onClose,
  subtitle,
  title,
  visible,
}: {
  children: ReactNode;
  onClose: () => void;
  subtitle: string;
  title: string;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View style={styles.modalFrame}>
        <Pressable onPress={onClose} style={styles.modalBackdrop} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKeyboardWrap}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalTitle}>{title}</Text>
                <Text style={styles.modalSubtitle}>{subtitle}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.modalClose,
                  pressed ? styles.modalClosePressed : null,
                ]}
              >
                <Ionicons
                  color={colors.textSecondary}
                  name="close-outline"
                  size={22}
                />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function SymptomsScreen({
  fieldErrors,
  form,
  onChange,
  voice,
}: IntakeStepComponentProps) {
  const [activeEditor, setActiveEditor] = useState<MedicalInfoEditorKey | null>(
    null,
  );
  const [searchValues, setSearchValues] = useState<
    Record<CheckboxEditorKey, string>
  >({
    allergyEnvironmentalSelections: '',
    allergyFoodSelections: '',
    allergyMaterialSelections: '',
    allergyMedicationSelections: '',
    immunizationCoreSelections: '',
    immunizationRoutineSelections: '',
    immunizationTravelSelections: '',
  });

  const medicationsVoice = voice?.bindField('medications');
  const pharmacyVoice = voice?.bindField('pharmacy');
  const lastDoseVoice = voice?.bindField('lastDose');
  const allergyReactionVoice = voice?.bindField('allergyReaction');
  const allergyNotesVoice = voice?.bindField('allergyNotes');
  const chiefConcernVoice = voice?.bindField('chiefConcern');
  const symptomDurationVoice = voice?.bindField('symptomDuration');
  const painLevelVoice = voice?.bindField('painLevel');
  const symptomNotesVoice = voice?.bindField('symptomNotes');

  const selectedAllergies = useMemo(
    () => buildMedicalInfoAllergyEntries(form),
    [form],
  );

  const applyUpdates = (updates: Partial<IntakeFormData>) => {
    (
      Object.entries(updates) as [
        keyof IntakeFormData,
        IntakeFormData[keyof IntakeFormData],
      ][]
    ).forEach(([field, value]) => {
      const currentValue = form[field];

      if (
        Array.isArray(currentValue) &&
        Array.isArray(value) &&
        arraysEqual(currentValue, value)
      ) {
        return;
      }

      if (!Array.isArray(currentValue) && currentValue === value) {
        return;
      }

      onChange(field, value);
    });
  };

  const updateAllergySelections = (
    field: Extract<
      CheckboxEditorKey,
      | 'allergyEnvironmentalSelections'
      | 'allergyFoodSelections'
      | 'allergyMaterialSelections'
      | 'allergyMedicationSelections'
    >,
    nextSelections: string[],
  ) => {
    const nextForm: IntakeFormData = {
      ...form,
      [field]: nextSelections,
    };

    applyUpdates({
      allergyEnvironmentalSelections: nextForm.allergyEnvironmentalSelections,
      allergyFoodSelections: nextForm.allergyFoodSelections,
      allergyMaterialSelections: nextForm.allergyMaterialSelections,
      allergyMedicationSelections: nextForm.allergyMedicationSelections,
      allergies: buildMedicalInfoAllergyEntries(nextForm).join(', '),
      allergyNotes: nextForm.allergyNotes,
      allergyReaction: nextForm.allergyReaction,
      medicalInfoHydrated: true,
    });
  };

  const updateImmunizationSelections = (
    field: Extract<
      CheckboxEditorKey,
      | 'immunizationCoreSelections'
      | 'immunizationRoutineSelections'
      | 'immunizationTravelSelections'
    >,
    nextSelections: string[],
  ) => {
    const nextForm: IntakeFormData = {
      ...form,
      [field]: nextSelections,
    };

    applyUpdates({
      immunizationCoreSelections: nextForm.immunizationCoreSelections,
      immunizationRoutineSelections: nextForm.immunizationRoutineSelections,
      immunizationTravelSelections: nextForm.immunizationTravelSelections,
      immunizationUnknownSelections: nextForm.immunizationUnknownSelections,
      immunizations: buildMedicalInfoImmunizationEntries(nextForm).join(', '),
      medicalInfoHydrated: true,
    });
  };

  const toggleSelection = (
    field: CheckboxEditorKey,
    value: string,
  ) => {
    const currentSelections = form[field];
    const nextSelections = currentSelections.includes(value)
      ? currentSelections.filter((entry) => entry !== value)
      : [...currentSelections, value];

    if (field.startsWith('allergy')) {
      updateAllergySelections(
        field as Extract<
          CheckboxEditorKey,
          | 'allergyEnvironmentalSelections'
          | 'allergyFoodSelections'
          | 'allergyMaterialSelections'
          | 'allergyMedicationSelections'
        >,
        nextSelections,
      );
      return;
    }

    updateImmunizationSelections(
      field as Extract<
        CheckboxEditorKey,
        | 'immunizationCoreSelections'
        | 'immunizationRoutineSelections'
        | 'immunizationTravelSelections'
      >,
      nextSelections,
    );
  };

  const updateSearch = (field: CheckboxEditorKey, value: string) => {
    setSearchValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const renderTextEditor = (
    field: TextEditorKey,
    options?: {
      keyboardType?:
        | 'default'
        | 'email-address'
        | 'numeric'
        | 'number-pad'
        | 'phone-pad'
        | 'decimal-pad'
        | 'numbers-and-punctuation';
      multiline?: boolean;
      onChangeText?: (value: string) => void;
      optional?: boolean;
      placeholder: string;
      voiceBinding?: IntakeVoiceFieldBinding;
    },
  ) =>
    options ? (
    <InputField
      footer={options?.voiceBinding?.footer}
      keyboardType={options?.keyboardType}
      label={editorTitles[field]}
      multiline={options?.multiline}
      onChangeText={(value) => {
        if (options?.onChangeText) {
          options.onChangeText(value);
          return;
        }
        onChange(field, value as IntakeFormData[typeof field]);
      }}
      onVoicePress={options?.voiceBinding?.onVoicePress}
      optional={options?.optional}
      placeholder={options.placeholder}
      value={form[field]}
      voiceState={options?.voiceBinding?.state}
    />
    ) : null;

  const renderActiveEditor = () => {
    if (!activeEditor) {
      return null;
    }

    if (searchEnabledEditors.has(activeEditor as CheckboxEditorKey)) {
      const checkboxField = activeEditor as CheckboxEditorKey;
      const selectedValues = form[checkboxField];
      const options = medicalInfoCategoryOptions[
        checkboxField.replace('Selections', '') as keyof typeof medicalInfoCategoryOptions
      ];
      const showAllergyDetails =
        checkboxField.startsWith('allergy') &&
        (selectedAllergies.length > 0 ||
          form.allergyReaction.trim().length > 0 ||
          form.allergyNotes.trim().length > 0);

      return (
        <EditorSheet
          onClose={() => setActiveEditor(null)}
          subtitle="Select any that apply."
          title={editorTitles[checkboxField]}
          visible
        >
          <SearchableCheckboxPicker
            onChangeSearch={(value) => updateSearch(checkboxField, value)}
            onToggleValue={(value) => toggleSelection(checkboxField, value)}
            options={options}
            searchValue={searchValues[checkboxField]}
            selectedValues={selectedValues}
          />

          {showAllergyDetails ? (
            <View style={styles.editorGroup}>
              {renderTextEditor('allergyReaction', {
                optional: true,
                placeholder: 'Rash, swelling, shortness of breath',
                voiceBinding: allergyReactionVoice,
              })}
              {renderTextEditor('allergyNotes', {
                multiline: true,
                optional: true,
                placeholder: 'Carries EpiPen, prior severe reaction',
                voiceBinding: allergyNotesVoice,
              })}
            </View>
          ) : null}
        </EditorSheet>
      );
    }

    switch (activeEditor) {
      case 'medications':
        return (
          <EditorSheet
            onClose={() => setActiveEditor(null)}
            subtitle="Add the medications the patient is taking now."
            title={editorTitles.medications}
            visible
          >
            {renderTextEditor('medications', {
              multiline: true,
              optional: true,
              placeholder: 'Enter current medications',
              voiceBinding: medicationsVoice,
            })}
          </EditorSheet>
        );
      case 'pharmacy':
        return (
          <EditorSheet
            onClose={() => setActiveEditor(null)}
            subtitle="Add the preferred pharmacy if the patient has one."
            title={editorTitles.pharmacy}
            visible
          >
            {renderTextEditor('pharmacy', {
              optional: true,
              placeholder: 'Enter preferred pharmacy',
              voiceBinding: pharmacyVoice,
            })}
          </EditorSheet>
        );
      case 'lastDose':
        return (
          <EditorSheet
            onClose={() => setActiveEditor(null)}
            subtitle="Capture when the patient last took their medication."
            title={editorTitles.lastDose}
            visible
          >
            {renderTextEditor('lastDose', {
              optional: true,
              placeholder: 'Enter last dose',
              voiceBinding: lastDoseVoice,
            })}
          </EditorSheet>
        );
      case 'chiefConcern':
        return (
          <EditorSheet
            onClose={() => setActiveEditor(null)}
            subtitle="Add the main reason for today’s visit."
            title={editorTitles.chiefConcern}
            visible
          >
            {renderTextEditor('chiefConcern', {
              multiline: true,
              placeholder: 'Enter reason for visit',
              voiceBinding: chiefConcernVoice,
            })}
          </EditorSheet>
        );
      case 'symptomDuration':
        return (
          <EditorSheet
            onClose={() => setActiveEditor(null)}
            subtitle="Add how long the symptoms have been present."
            title={editorTitles.symptomDuration}
            visible
          >
            {renderTextEditor('symptomDuration', {
              placeholder: 'Enter duration',
              voiceBinding: symptomDurationVoice,
            })}
          </EditorSheet>
        );
      case 'painLevel':
        return (
          <EditorSheet
            onClose={() => setActiveEditor(null)}
            subtitle="Add the current severity if the patient can rate it."
            title={editorTitles.painLevel}
            visible
          >
            {renderTextEditor('painLevel', {
              optional: true,
              placeholder: 'Enter severity',
              voiceBinding: painLevelVoice,
            })}
          </EditorSheet>
        );
      case 'symptomNotes':
        return (
          <EditorSheet
            onClose={() => setActiveEditor(null)}
            subtitle="Add any extra symptom details that matter for today."
            title={editorTitles.symptomNotes}
            visible
          >
            {renderTextEditor('symptomNotes', {
              multiline: true,
              optional: true,
              placeholder: 'Add symptom notes',
              voiceBinding: symptomNotesVoice,
            })}
          </EditorSheet>
        );
      default:
        return null;
    }
  };

  return (
    <View>
      <InfoCard>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          <CompactSummaryRow
            errorText={fieldErrors?.allergies}
            onPress={() => setActiveEditor('allergyMedicationSelections')}
            summary={formatCompactSelectionSummary(
              form.allergyMedicationSelections,
            )}
            title="Medication Allergies"
          />
          <CompactSummaryRow
            onPress={() => setActiveEditor('allergyMaterialSelections')}
            summary={formatCompactSelectionSummary(form.allergyMaterialSelections)}
            title="Material / Contact Allergies"
          />
          <CompactSummaryRow
            onPress={() => setActiveEditor('allergyFoodSelections')}
            summary={formatCompactSelectionSummary(form.allergyFoodSelections)}
            title="Food Allergies"
          />
          <CompactSummaryRow
            onPress={() => setActiveEditor('allergyEnvironmentalSelections')}
            summary={formatCompactSelectionSummary(
              form.allergyEnvironmentalSelections,
            )}
            title="Environmental Allergies"
          />
        </View>

        <View style={[styles.section, styles.sectionSpaced]}>
          <Text style={styles.sectionTitle}>Current Medications & History</Text>
          <CompactSummaryRow
            onPress={() => setActiveEditor('medications')}
            summary={formatCompactTextSummary(form.medications)}
            title="Medications"
          />
          <CompactSummaryRow
            onPress={() => setActiveEditor('pharmacy')}
            summary={formatCompactTextSummary(form.pharmacy)}
            title="Preferred Pharmacy"
          />
          <CompactSummaryRow
            onPress={() => setActiveEditor('lastDose')}
            summary={formatCompactTextSummary(form.lastDose)}
            title="Last Dose"
          />
        </View>

        <View style={[styles.section, styles.sectionSpaced]}>
          <Text style={styles.sectionTitle}>Immunizations</Text>
          <CompactSummaryRow
            onPress={() => setActiveEditor('immunizationCoreSelections')}
            summary={formatCompactSelectionSummary(
              form.immunizationCoreSelections,
            )}
            title="Core Vaccines"
          />
          <CompactSummaryRow
            onPress={() => setActiveEditor('immunizationRoutineSelections')}
            summary={formatCompactSelectionSummary(
              form.immunizationRoutineSelections,
            )}
            title="Routine Adult Vaccines"
          />
          <CompactSummaryRow
            onPress={() => setActiveEditor('immunizationTravelSelections')}
            summary={formatCompactSelectionSummary(
              form.immunizationTravelSelections,
            )}
            title="Travel / Risk-Based Vaccines"
          />
        </View>

        <View style={[styles.section, styles.sectionSpaced]}>
          <Text style={styles.sectionTitle}>Visit Details</Text>
          <CompactSummaryRow
            errorText={fieldErrors?.chiefConcern}
            onPress={() => setActiveEditor('chiefConcern')}
            summary={formatCompactTextSummary(form.chiefConcern)}
            title="Reason for visit"
          />
          <CompactSummaryRow
            errorText={fieldErrors?.symptomDuration}
            onPress={() => setActiveEditor('symptomDuration')}
            summary={formatCompactTextSummary(form.symptomDuration)}
            title="Duration"
          />
          <CompactSummaryRow
            errorText={fieldErrors?.painLevel}
            onPress={() => setActiveEditor('painLevel')}
            summary={formatCompactTextSummary(form.painLevel)}
            title="Severity"
          />
          <CompactSummaryRow
            onPress={() => setActiveEditor('symptomNotes')}
            summary={formatCompactTextSummary(form.symptomNotes)}
            title="Symptom notes"
          />
        </View>
      </InfoCard>

      {renderActiveEditor()}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  sectionSpaced: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalFrame: {
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalKeyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.divider,
    maxHeight: '92%',
    minHeight: '58%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  modalTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalClose: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.divider,
    borderRadius: 16,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  modalClosePressed: {
    opacity: 0.8,
  },
  modalBody: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  editorGroup: {
    gap: spacing.sm,
  },
});
