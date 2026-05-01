import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Keyboard,
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
  buildMedicalInfoLegacyAllergyText,
  formatCompactSelectionSummary,
  formatMedicationAllergySummary,
  formatCompactTextSummary,
  medicalInfoCategoryOptions,
  type IntakeFormData,
} from '../../services';
import { colors, spacing, typography } from '../../theme';
import type { IntakeStepComponentProps } from './types';

type CheckboxEditorKey =
  | 'allergyEnvironmentalSelections'
  | 'allergyFoodSelections'
  | 'allergyMaterialSelections'
  | 'allergyMedicationSelections';

type TextEditorKey =
  | 'allergyNotes'
  | 'allergyReaction'
  | 'chiefConcern'
  | 'medications'
  | 'painLevel'
  | 'symptomDuration'
  | 'symptomNotes';

type MedicalInfoEditorKey = CheckboxEditorKey | TextEditorKey;

const checkboxEditorOrder: CheckboxEditorKey[] = [
  'allergyMedicationSelections',
  'allergyMaterialSelections',
  'allergyFoodSelections',
  'allergyEnvironmentalSelections',
];

const searchEnabledEditors = new Set<CheckboxEditorKey>(checkboxEditorOrder);
const commonMedicationOptions = [
  'Aspirin',
  'Ibuprofen',
  'Acetaminophen',
  'Albuterol inhaler',
  'Lisinopril',
  'Metformin',
  'Levothyroxine',
  'Atorvastatin',
] as const;
const editorTitles: Record<MedicalInfoEditorKey, string> = {
  allergyEnvironmentalSelections: 'Environmental Allergies',
  allergyFoodSelections: 'Food Allergies',
  allergyMaterialSelections: 'Material / Contact Allergies',
  allergyMedicationSelections: 'Medication Allergies',
  allergyNotes: 'Allergy Safety Notes',
  allergyReaction: 'Allergy Reaction Details',
  chiefConcern: 'Reason for Visit',
  medications: 'Medications',
  painLevel: 'Severity',
  symptomDuration: 'Duration',
  symptomNotes: 'Symptom Notes',
};

function normalizeSelectionLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeSelectionKey(value: string) {
  return normalizeSelectionLabel(value).toLowerCase();
}

function arraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function parseCommaSeparatedValues(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
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
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      setKeyboardInset(0);
      return;
    }

    const handleKeyboardShow = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardInset(Math.max(0, event.endCoordinates.height));
    });
    const handleKeyboardHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardInset(0);
    });

    return () => {
      handleKeyboardShow.remove();
      handleKeyboardHide.remove();
    };
  }, []);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent={Platform.OS === 'android'}
      transparent
      visible={visible}
    >
      <View style={styles.modalFrame}>
        <Pressable onPress={onClose} style={styles.modalBackdrop} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? spacing.lg : 0}
          style={[
            styles.modalKeyboardWrap,
            Platform.OS === 'android' && keyboardInset > 0
              ? { paddingBottom: keyboardInset }
              : null,
          ]}
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
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
  });

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
    const normalizedMedicationSelections =
      field === 'allergyMedicationSelections'
        ? nextSelections.filter((value) => value !== 'Unknown / Unsure')
        : form.allergyMedicationSelections;
    const medicationAllergyStatus =
      field === 'allergyMedicationSelections'
        ? nextSelections.includes('Unknown / Unsure') &&
          normalizedMedicationSelections.length === 0
          ? 'unsure'
          : normalizedMedicationSelections.length > 0
            ? 'has_allergies'
            : ''
        : form.allergyMedicationStatus;
    const nextForm: IntakeFormData = {
      ...form,
      allergyMedicationStatus: medicationAllergyStatus,
      [field]: nextSelections,
    };
    nextForm.allergyMedicationSelections = normalizedMedicationSelections;

    applyUpdates({
      allergyEnvironmentalSelections: nextForm.allergyEnvironmentalSelections,
      allergyFoodSelections: nextForm.allergyFoodSelections,
      allergyMaterialSelections: nextForm.allergyMaterialSelections,
      allergyMedicationSelections: nextForm.allergyMedicationSelections,
      allergyMedicationStatus: nextForm.allergyMedicationStatus,
      allergies: buildMedicalInfoLegacyAllergyText(nextForm),
      allergyNotes: nextForm.allergyNotes,
      allergyReaction: nextForm.allergyReaction,
      medicalInfoHydrated: true,
    });
  };

  const toggleSelection = (
    field: CheckboxEditorKey,
    value: string,
  ) => {
    const currentSelections =
      field === 'allergyMedicationSelections' && form.allergyMedicationStatus === 'unsure'
        ? ['Unknown / Unsure']
        : form[field];
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
  };

  const updateSearch = (field: CheckboxEditorKey, value: string) => {
    setSearchValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const addMedicationOption = (value: string) => {
    const currentValues = parseCommaSeparatedValues(form.medications);

    if (
      currentValues.some(
        (entry) => entry.toLowerCase() === value.trim().toLowerCase(),
      )
    ) {
      return;
    }

    onChange(
      'medications',
      [...currentValues, value].join(', ') as IntakeFormData['medications'],
    );
  };

  const addCustomSelection = (field: CheckboxEditorKey, rawValue: string) => {
    const normalizedValue = normalizeSelectionLabel(rawValue);
    if (!normalizedValue) {
      return;
    }

    const optionKey = field.replace(
      'Selections',
      '',
    ) as keyof typeof medicalInfoCategoryOptions;
    const options = medicalInfoCategoryOptions[optionKey];
    const canonicalValue =
      options.find(
        (option) => normalizeSelectionKey(option) === normalizeSelectionKey(normalizedValue),
      ) ?? normalizedValue;
    const currentSelections = form[field];

    if (
      currentSelections.some(
        (entry) => normalizeSelectionKey(entry) === normalizeSelectionKey(canonicalValue),
      )
    ) {
      updateSearch(field, '');
      return;
    }

    const nextSelections = [...currentSelections, canonicalValue];

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
    }

    updateSearch(field, '');
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
    },
  ) =>
    options ? (
    <InputField
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
      optional={options?.optional}
      placeholder={options.placeholder}
      value={form[field]}
    />
    ) : null;

  const renderActiveEditor = () => {
    if (!activeEditor) {
      return null;
    }

    if (searchEnabledEditors.has(activeEditor as CheckboxEditorKey)) {
      const checkboxField = activeEditor as CheckboxEditorKey;
      const selectedValues =
        checkboxField === 'allergyMedicationSelections' &&
        form.allergyMedicationStatus === 'unsure'
          ? ['Unknown / Unsure']
          : form[checkboxField];
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
            onAddCustomValue={(value) => addCustomSelection(checkboxField, value)}
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
              })}
              {renderTextEditor('allergyNotes', {
                multiline: true,
                optional: true,
                placeholder: 'Carries EpiPen, prior severe reaction',
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
            })}
            <View style={styles.editorGroup}>
              <Text style={styles.quickPickLabel}>Common choices</Text>
              <View style={styles.quickPickWrap}>
                {commonMedicationOptions.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => addMedicationOption(option)}
                    style={({ pressed }) => [
                      styles.quickPickChip,
                      pressed ? styles.quickPickChipPressed : null,
                    ]}
                  >
                    <Text style={styles.quickPickChipLabel}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
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
            summary={formatMedicationAllergySummary(form)}
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
          <Text style={styles.sectionTitle}>Current Medications</Text>
          <CompactSummaryRow
            onPress={() => setActiveEditor('medications')}
            summary={formatCompactTextSummary(form.medications)}
            title="Medications"
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
  quickPickLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  quickPickWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickPickChip: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickPickChipPressed: {
    opacity: 0.78,
  },
  quickPickChipLabel: {
    ...typography.label,
    color: colors.primaryDeep,
    fontWeight: '600',
  },
});
