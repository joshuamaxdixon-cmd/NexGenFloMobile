import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import { SearchableCheckboxAccordionSection } from '../../components/SearchableCheckboxAccordionSection';
import {
  hydratePastMedicalHistoryFromLegacy,
  PAST_MEDICAL_HISTORY_NONE_OF_ABOVE,
  PAST_MEDICAL_HISTORY_OTHER_MENTAL_HEALTH,
  PAST_MEDICAL_HISTORY_OTHER_SURGERY,
  pastMedicalHistoryOptions,
} from '../../services';
import type { IntakeStepComponentProps } from './types';

type PastMedicalHistorySectionKey =
  | 'chronicConditions'
  | 'otherRelevantHistory'
  | 'surgicalHistory';

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
  const [openSection, setOpenSection] =
    useState<PastMedicalHistorySectionKey | null>(null);
  const [searchValues, setSearchValues] = useState<
    Record<PastMedicalHistorySectionKey, string>
  >({
    chronicConditions: '',
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

  const toggleSection = (section: PastMedicalHistorySectionKey) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const toggleChronicCondition = (value: string) => {
    const current = form.pastMedicalHistoryChronicConditions;
    const nextValues = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];

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
    const nextValues = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];

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

  return (
    <View>
      <InfoCard>
        <SearchableCheckboxAccordionSection
          isOpen={openSection === 'chronicConditions'}
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
          onChangeSearch={(value) => setSectionSearch('otherRelevantHistory', value)}
          onToggleOpen={() => toggleSection('otherRelevantHistory')}
          onToggleValue={toggleOtherRelevantHistory}
          options={pastMedicalHistoryOptions.otherRelevantHistory}
          searchValue={searchValues.otherRelevantHistory}
          selectedValues={form.pastMedicalHistoryOtherRelevantHistory}
          title="Other Relevant History"
        />
      </InfoCard>
    </View>
  );
}
