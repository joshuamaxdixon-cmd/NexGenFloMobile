import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import { SearchableCheckboxAccordionSection } from '../../components/SearchableCheckboxAccordionSection';
import {
  buildMedicalInfoImmunizationEntries,
  hydratePastMedicalHistoryFromLegacy,
  medicalInfoCategoryOptions,
  PAST_MEDICAL_HISTORY_NONE_OF_ABOVE,
  PAST_MEDICAL_HISTORY_OTHER_MENTAL_HEALTH,
  PAST_MEDICAL_HISTORY_OTHER_SURGERY,
  pastMedicalHistoryOptions,
} from '../../services';
import { colors, spacing, typography } from '../../theme';
import type { IntakeStepComponentProps } from './types';

type PastMedicalHistorySectionKey =
  | 'chronicConditions'
  | 'immunizationCore'
  | 'immunizationRoutine'
  | 'immunizationTravel'
  | 'immunizationUnknown'
  | 'otherRelevantHistory'
  | 'surgicalHistory';

type HistoryStatus = 'none' | 'unsure' | 'has_history';

const historyStatusOptions: { value: HistoryStatus; label: string }[] = [
  { value: 'none', label: 'No known history' },
  { value: 'unsure', label: "I'm not sure" },
  { value: 'has_history', label: 'I have history to report' },
];

const PAST_MEDICAL_HISTORY_STATUS_VALUES = ['None known', 'Unsure'] as const;

function normalizeSelectionLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeSelectionKey(value: string) {
  return normalizeSelectionLabel(value).toLowerCase();
}

function isPastMedicalHistoryStatusValue(value: string) {
  return PAST_MEDICAL_HISTORY_STATUS_VALUES.includes(
    value as (typeof PAST_MEDICAL_HISTORY_STATUS_VALUES)[number],
  );
}

function hasStructuredPastMedicalHistory(
  form: IntakeStepComponentProps['form'],
) {
  return (
    form.pastMedicalHistoryChronicConditions.length > 0 ||
    form.pastMedicalHistorySurgicalHistory.length > 0 ||
    form.pastMedicalHistoryOtherRelevantHistory.length > 0 ||
    form.pastMedicalHistoryOtherMentalHealthCondition.trim().length > 0 ||
    form.pastMedicalHistoryOtherSurgery.trim().length > 0
  );
}

export function PastMedicalHistoryScreen({
  form,
  onChange,
}: IntakeStepComponentProps) {
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus | null>(
    () => (hasStructuredPastMedicalHistory(form) ? 'has_history' : null),
  );
  const [openSection, setOpenSection] =
    useState<PastMedicalHistorySectionKey | null>(null);
  const [searchValues, setSearchValues] = useState<
    Record<PastMedicalHistorySectionKey, string>
  >({
    chronicConditions: '',
    immunizationCore: '',
    immunizationRoutine: '',
    immunizationTravel: '',
    immunizationUnknown: '',
    otherRelevantHistory: '',
    surgicalHistory: '',
  });

  useEffect(() => {
    if (form.pastMedicalHistoryHydrated) {
      return;
    }

    if (hasStructuredPastMedicalHistory(form)) {
      onChange('pastMedicalHistoryHydrated', true);
      return;
    }

    if (!form.medicalConditions.trim()) {
      onChange('pastMedicalHistoryHydrated', true);
      return;
    }

    const hydrated = hydratePastMedicalHistoryFromLegacy(form.medicalConditions);
    onChange('pastMedicalHistoryChronicConditions', hydrated.pastMedicalHistoryChronicConditions ?? []);
    onChange('pastMedicalHistorySurgicalHistory', hydrated.pastMedicalHistorySurgicalHistory ?? []);
    onChange(
      'pastMedicalHistoryOtherRelevantHistory',
      hydrated.pastMedicalHistoryOtherRelevantHistory ?? [],
    );
    onChange(
      'pastMedicalHistoryOtherMentalHealthCondition',
      hydrated.pastMedicalHistoryOtherMentalHealthCondition ?? '',
    );
    onChange('pastMedicalHistoryOtherSurgery', hydrated.pastMedicalHistoryOtherSurgery ?? '');
    onChange('medicalConditions', hydrated.medicalConditions ?? '');
    onChange('pastMedicalHistoryHydrated', true);
  }, [form, onChange]);

  const handleHistoryStatusChange = (status: HistoryStatus) => {
    if (historyStatus === status) {
      setHistoryStatus(null);
      return;
    }
    setHistoryStatus(status);
    if (status === 'none' || status === 'unsure') {
      onChange('pastMedicalHistoryChronicConditions', []);
      onChange('pastMedicalHistorySurgicalHistory', []);
      onChange('pastMedicalHistoryOtherRelevantHistory', []);
      onChange('pastMedicalHistoryOtherMentalHealthCondition', '');
      onChange('pastMedicalHistoryOtherSurgery', '');
      setOpenSection(null);
    }
  };

  const toggleSection = (section: PastMedicalHistorySectionKey) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const toggleChronicCondition = (value: string) => {
    const current = form.pastMedicalHistoryChronicConditions;
    if (isPastMedicalHistoryStatusValue(value)) {
      const nextValues = current.includes(value) ? [] : [value];
      onChange('pastMedicalHistoryChronicConditions', nextValues);
      if (!nextValues.includes(PAST_MEDICAL_HISTORY_OTHER_MENTAL_HEALTH)) {
        onChange('pastMedicalHistoryOtherMentalHealthCondition', '');
      }
      return;
    }

    const withoutStatus = current.filter((entry) => !isPastMedicalHistoryStatusValue(entry));
    const nextValues = current.includes(value)
      ? withoutStatus.filter((entry) => entry !== value)
      : [...withoutStatus, value];

    onChange('pastMedicalHistoryChronicConditions', nextValues);

    if (
      value === PAST_MEDICAL_HISTORY_OTHER_MENTAL_HEALTH &&
      !nextValues.includes(PAST_MEDICAL_HISTORY_OTHER_MENTAL_HEALTH)
    ) {
      onChange('pastMedicalHistoryOtherMentalHealthCondition', '');
    }
  };

  const toggleSurgicalHistory = (value: string) => {
    const current = form.pastMedicalHistorySurgicalHistory;
    if (isPastMedicalHistoryStatusValue(value)) {
      const nextValues = current.includes(value) ? [] : [value];
      onChange('pastMedicalHistorySurgicalHistory', nextValues);
      if (!nextValues.includes(PAST_MEDICAL_HISTORY_OTHER_SURGERY)) {
        onChange('pastMedicalHistoryOtherSurgery', '');
      }
      return;
    }

    const withoutStatus = current.filter((entry) => !isPastMedicalHistoryStatusValue(entry));
    const nextValues = current.includes(value)
      ? withoutStatus.filter((entry) => entry !== value)
      : [...withoutStatus, value];

    onChange('pastMedicalHistorySurgicalHistory', nextValues);

    if (
      value === PAST_MEDICAL_HISTORY_OTHER_SURGERY &&
      !nextValues.includes(PAST_MEDICAL_HISTORY_OTHER_SURGERY)
    ) {
      onChange('pastMedicalHistoryOtherSurgery', '');
    }
  };

  const toggleOtherRelevantHistory = (value: string) => {
    const current = form.pastMedicalHistoryOtherRelevantHistory;

    if (value === PAST_MEDICAL_HISTORY_NONE_OF_ABOVE) {
      const nextValues = current.includes(PAST_MEDICAL_HISTORY_NONE_OF_ABOVE)
        ? []
        : [PAST_MEDICAL_HISTORY_NONE_OF_ABOVE];
      onChange('pastMedicalHistoryOtherRelevantHistory', nextValues);
      return;
    }

    const withoutNone = current.filter(
      (entry) => entry !== PAST_MEDICAL_HISTORY_NONE_OF_ABOVE,
    );
    const nextValues = withoutNone.includes(value)
      ? withoutNone.filter((entry) => entry !== value)
      : [...withoutNone, value];

    onChange('pastMedicalHistoryOtherRelevantHistory', nextValues);
  };

  const setSectionSearch = (
    section: PastMedicalHistorySectionKey,
    value: string,
  ) => {
    setSearchValues((current) => ({
      ...current,
      [section]: value,
    }));
  };

  const applyImmunizationSelections = (
    updates: Pick<
      IntakeStepComponentProps['form'],
      | 'immunizationCoreSelections'
      | 'immunizationRoutineSelections'
      | 'immunizationTravelSelections'
      | 'immunizationUnknownSelections'
    >,
  ) => {
    const nextForm = {
      ...form,
      ...updates,
    };

    onChange('immunizationCoreSelections', updates.immunizationCoreSelections);
    onChange('immunizationRoutineSelections', updates.immunizationRoutineSelections);
    onChange('immunizationTravelSelections', updates.immunizationTravelSelections);
    onChange('immunizationUnknownSelections', updates.immunizationUnknownSelections);
    onChange('immunizations', buildMedicalInfoImmunizationEntries(nextForm).join(', '));
    onChange('medicalInfoHydrated', true);
  };

  const toggleImmunizationSelection = (
    field:
      | 'immunizationCoreSelections'
      | 'immunizationRoutineSelections'
      | 'immunizationTravelSelections'
      | 'immunizationUnknownSelections',
    value: string,
  ) => {
    const currentValues = form[field];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((entry) => entry !== value)
      : [...currentValues, value];

    const baseValues = {
      immunizationCoreSelections: form.immunizationCoreSelections,
      immunizationRoutineSelections: form.immunizationRoutineSelections,
      immunizationTravelSelections: form.immunizationTravelSelections,
      immunizationUnknownSelections: form.immunizationUnknownSelections,
    };

    if (field === 'immunizationUnknownSelections') {
      applyImmunizationSelections({
        immunizationCoreSelections: nextValues.length > 0 ? [] : baseValues.immunizationCoreSelections,
        immunizationRoutineSelections: nextValues.length > 0 ? [] : baseValues.immunizationRoutineSelections,
        immunizationTravelSelections: nextValues.length > 0 ? [] : baseValues.immunizationTravelSelections,
        immunizationUnknownSelections: nextValues,
      });
      return;
    }

    applyImmunizationSelections({
      ...baseValues,
      [field]: nextValues.filter(
        (entry) => entry !== 'None known' && entry !== 'Unsure',
      ),
      immunizationUnknownSelections: [],
    });
  };

  const addCustomImmunization = (
    field:
      | 'immunizationCoreSelections'
      | 'immunizationRoutineSelections'
      | 'immunizationTravelSelections',
    searchKey: PastMedicalHistorySectionKey,
    rawValue: string,
  ) => {
    const normalizedValue = normalizeSelectionLabel(rawValue);
    if (!normalizedValue) {
      return;
    }

    const optionKey =
      field === 'immunizationCoreSelections'
        ? 'immunizationCore'
        : field === 'immunizationRoutineSelections'
          ? 'immunizationRoutine'
          : 'immunizationTravel';
    const canonicalValue =
      medicalInfoCategoryOptions[optionKey].find(
        (option) => normalizeSelectionKey(option) === normalizeSelectionKey(normalizedValue),
      ) ?? normalizedValue;

    if (
      form[field].some(
        (entry) => normalizeSelectionKey(entry) === normalizeSelectionKey(canonicalValue),
      )
    ) {
      setSectionSearch(searchKey, '');
      return;
    }

    applyImmunizationSelections({
      immunizationCoreSelections:
        field === 'immunizationCoreSelections'
          ? [...form.immunizationCoreSelections, canonicalValue]
          : form.immunizationCoreSelections,
      immunizationRoutineSelections:
        field === 'immunizationRoutineSelections'
          ? [...form.immunizationRoutineSelections, canonicalValue]
          : form.immunizationRoutineSelections,
      immunizationTravelSelections:
        field === 'immunizationTravelSelections'
          ? [...form.immunizationTravelSelections, canonicalValue]
          : form.immunizationTravelSelections,
      immunizationUnknownSelections: [],
    });
    setSectionSearch(searchKey, '');
  };

  const addCustomChronicCondition = (rawValue: string) => {
    const normalizedValue = normalizeSelectionLabel(rawValue);
    if (!normalizedValue) {
      return;
    }

    const canonicalValue =
      pastMedicalHistoryOptions.chronicConditions.find(
        (option) => normalizeSelectionKey(option) === normalizeSelectionKey(normalizedValue),
      ) ?? normalizedValue;

    if (
      form.pastMedicalHistoryChronicConditions.some(
        (entry) => normalizeSelectionKey(entry) === normalizeSelectionKey(canonicalValue),
      )
    ) {
      setSectionSearch('chronicConditions', '');
      return;
    }

    onChange('pastMedicalHistoryChronicConditions', [
      ...form.pastMedicalHistoryChronicConditions.filter(
        (entry) => !isPastMedicalHistoryStatusValue(entry),
      ),
      canonicalValue,
    ]);
    setSectionSearch('chronicConditions', '');
  };

  const addCustomSurgicalHistory = (rawValue: string) => {
    const normalizedValue = normalizeSelectionLabel(rawValue);
    if (!normalizedValue) {
      return;
    }

    const canonicalValue =
      pastMedicalHistoryOptions.surgicalHistory.find(
        (option) => normalizeSelectionKey(option) === normalizeSelectionKey(normalizedValue),
      ) ?? normalizedValue;

    if (
      form.pastMedicalHistorySurgicalHistory.some(
        (entry) => normalizeSelectionKey(entry) === normalizeSelectionKey(canonicalValue),
      )
    ) {
      setSectionSearch('surgicalHistory', '');
      return;
    }

    onChange('pastMedicalHistorySurgicalHistory', [
      ...form.pastMedicalHistorySurgicalHistory.filter(
        (entry) => !isPastMedicalHistoryStatusValue(entry),
      ),
      canonicalValue,
    ]);
    setSectionSearch('surgicalHistory', '');
  };

  const addCustomOtherRelevantHistory = (rawValue: string) => {
    const normalizedValue = normalizeSelectionLabel(rawValue);
    if (!normalizedValue) {
      return;
    }

    const canonicalValue =
      pastMedicalHistoryOptions.otherRelevantHistory.find(
        (option) => normalizeSelectionKey(option) === normalizeSelectionKey(normalizedValue),
      ) ?? normalizedValue;
    const currentValues = form.pastMedicalHistoryOtherRelevantHistory.filter(
      (entry) => entry !== PAST_MEDICAL_HISTORY_NONE_OF_ABOVE,
    );

    if (
      currentValues.some(
        (entry) => normalizeSelectionKey(entry) === normalizeSelectionKey(canonicalValue),
      )
    ) {
      setSectionSearch('otherRelevantHistory', '');
      return;
    }

    onChange('pastMedicalHistoryOtherRelevantHistory', [
      ...currentValues,
      canonicalValue,
    ]);
    setSectionSearch('otherRelevantHistory', '');
  };

  return (
    <View style={styles.container}>
      <InfoCard>
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>History Status</Text>
          <Text style={styles.helperText}>
            Choose one if it applies, then add details if needed.
          </Text>
          <View style={styles.statusChipRow}>
            {historyStatusOptions.map(({ value, label }) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                onPress={() => handleHistoryStatusChange(value)}
                style={({ pressed }) => [
                  styles.statusChip,
                  historyStatus === value ? styles.statusChipSelected : null,
                  pressed ? styles.statusChipPressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.statusChipLabel,
                    historyStatus === value ? styles.statusChipLabelSelected : null,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {historyStatus === 'none' ? (
          <View style={styles.statusNote}>
            <Text style={styles.statusNoteText}>No known history selected.</Text>
          </View>
        ) : historyStatus === 'unsure' ? (
          <View style={styles.statusNote}>
            <Text style={styles.statusNoteText}>Staff can follow up if needed.</Text>
          </View>
        ) : null}

        {historyStatus === 'has_history' ? (
          <>
            <SearchableCheckboxAccordionSection
              isOpen={openSection === 'chronicConditions'}
              onAddCustomValue={addCustomChronicCondition}
              onChangeSearch={(value) => setSectionSearch('chronicConditions', value)}
              onToggleOpen={() => toggleSection('chronicConditions')}
              onToggleValue={toggleChronicCondition}
              options={pastMedicalHistoryOptions.chronicConditions}
              renderOptionFooter={(value) =>
                value === PAST_MEDICAL_HISTORY_OTHER_MENTAL_HEALTH ? (
                  <InputField
                    label="Describe other mental health condition"
                    onChangeText={(nextValue) =>
                      onChange('pastMedicalHistoryOtherMentalHealthCondition', nextValue)
                    }
                    placeholder="Add details"
                    value={form.pastMedicalHistoryOtherMentalHealthCondition}
                  />
                ) : null
              }
              searchValue={searchValues.chronicConditions}
              selectedValues={form.pastMedicalHistoryChronicConditions}
              title="Chronic Conditions"
            />

            <SearchableCheckboxAccordionSection
              isOpen={openSection === 'surgicalHistory'}
              onAddCustomValue={addCustomSurgicalHistory}
              onChangeSearch={(value) => setSectionSearch('surgicalHistory', value)}
              onToggleOpen={() => toggleSection('surgicalHistory')}
              onToggleValue={toggleSurgicalHistory}
              options={pastMedicalHistoryOptions.surgicalHistory}
              renderOptionFooter={(value) =>
                value === PAST_MEDICAL_HISTORY_OTHER_SURGERY ? (
                  <InputField
                    label="Describe other surgery"
                    onChangeText={(nextValue) =>
                      onChange('pastMedicalHistoryOtherSurgery', nextValue)
                    }
                    placeholder="Add details"
                    value={form.pastMedicalHistoryOtherSurgery}
                  />
                ) : null
              }
              searchValue={searchValues.surgicalHistory}
              selectedValues={form.pastMedicalHistorySurgicalHistory}
              title="Surgical History"
            />

            <SearchableCheckboxAccordionSection
              isOpen={openSection === 'otherRelevantHistory'}
              onAddCustomValue={addCustomOtherRelevantHistory}
              onChangeSearch={(value) => setSectionSearch('otherRelevantHistory', value)}
              onToggleOpen={() => toggleSection('otherRelevantHistory')}
              onToggleValue={toggleOtherRelevantHistory}
              options={pastMedicalHistoryOptions.otherRelevantHistory}
              searchValue={searchValues.otherRelevantHistory}
              selectedValues={form.pastMedicalHistoryOtherRelevantHistory}
              title="Other Relevant History"
            />
          </>
        ) : null}
      </InfoCard>

      <InfoCard style={styles.immunizationCard}>
        <View style={styles.immunizationHeader}>
          <Text style={styles.sectionTitle}>Immunizations (optional)</Text>
          <Text style={styles.helperText}>
            Select known vaccines, or choose unknown/unsure if records are not available.
          </Text>
        </View>

        <SearchableCheckboxAccordionSection
          isOpen={openSection === 'immunizationCore'}
          onAddCustomValue={(value) =>
            addCustomImmunization('immunizationCoreSelections', 'immunizationCore', value)
          }
          onChangeSearch={(value) => setSectionSearch('immunizationCore', value)}
          onToggleOpen={() => toggleSection('immunizationCore')}
          onToggleValue={(value) =>
            toggleImmunizationSelection('immunizationCoreSelections', value)
          }
          options={medicalInfoCategoryOptions.immunizationCore}
          searchValue={searchValues.immunizationCore}
          selectedValues={form.immunizationCoreSelections}
          title="Core Vaccines"
        />

        <SearchableCheckboxAccordionSection
          isOpen={openSection === 'immunizationRoutine'}
          onAddCustomValue={(value) =>
            addCustomImmunization('immunizationRoutineSelections', 'immunizationRoutine', value)
          }
          onChangeSearch={(value) => setSectionSearch('immunizationRoutine', value)}
          onToggleOpen={() => toggleSection('immunizationRoutine')}
          onToggleValue={(value) =>
            toggleImmunizationSelection('immunizationRoutineSelections', value)
          }
          options={medicalInfoCategoryOptions.immunizationRoutine}
          searchValue={searchValues.immunizationRoutine}
          selectedValues={form.immunizationRoutineSelections}
          title="Routine Adult Vaccines"
        />

        <SearchableCheckboxAccordionSection
          isOpen={openSection === 'immunizationTravel'}
          onAddCustomValue={(value) =>
            addCustomImmunization('immunizationTravelSelections', 'immunizationTravel', value)
          }
          onChangeSearch={(value) => setSectionSearch('immunizationTravel', value)}
          onToggleOpen={() => toggleSection('immunizationTravel')}
          onToggleValue={(value) =>
            toggleImmunizationSelection('immunizationTravelSelections', value)
          }
          options={medicalInfoCategoryOptions.immunizationTravel}
          searchValue={searchValues.immunizationTravel}
          selectedValues={form.immunizationTravelSelections}
          title="Travel / Risk-Based Vaccines"
        />

        <SearchableCheckboxAccordionSection
          isOpen={openSection === 'immunizationUnknown'}
          onChangeSearch={(value) => setSectionSearch('immunizationUnknown', value)}
          onToggleOpen={() => toggleSection('immunizationUnknown')}
          onToggleValue={(value) =>
            toggleImmunizationSelection('immunizationUnknownSelections', value)
          }
          options={medicalInfoCategoryOptions.immunizationUnknown}
          searchValue={searchValues.immunizationUnknown}
          selectedValues={form.immunizationUnknownSelections}
          title="Unknown / Unsure"
        />
      </InfoCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  statusSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  helperText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statusChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  statusChipPressed: {
    transform: [{ scale: 0.99 }],
  },
  statusChipLabel: {
    ...typography.button,
    color: colors.primaryDeep,
  },
  statusChipLabelSelected: {
    color: colors.primaryDeep,
  },
  statusNote: {
    backgroundColor: colors.accentMint,
    borderRadius: 12,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusNoteText: {
    ...typography.body,
    color: colors.success,
  },
  immunizationCard: {
    // gap handled by container
  },
  immunizationHeader: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
});
