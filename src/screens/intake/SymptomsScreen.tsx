import { View } from 'react-native';

import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import type { IntakeStepComponentProps } from './types';

export function SymptomsScreen({
  fieldErrors,
  form,
  onChange,
}: IntakeStepComponentProps) {
  return (
    <View>
      <InfoCard
        subtitle="Capture the reason for visit with enough detail to support triage and staff review."
        title="Presenting Concern"
      >
        <InputField
          errorText={fieldErrors?.chiefConcern}
          label="Chief concern"
          multiline
          onChangeText={(value) => onChange('chiefConcern', value)}
          placeholder="Chest pain, shortness of breath, migraine, medication refill..."
          value={form.chiefConcern}
        />
        <InputField
          errorText={fieldErrors?.symptomDuration}
          label="How long has this been happening?"
          onChangeText={(value) => onChange('symptomDuration', value)}
          placeholder="2 days"
          value={form.symptomDuration}
        />
        <InputField
          label="Pain or severity level"
          onChangeText={(value) => onChange('painLevel', value)}
          optional
          placeholder="6/10"
          value={form.painLevel}
        />
      </InfoCard>

      <InfoCard
        subtitle="Use this space for anything the care team should see before the visit starts."
        title="Additional Notes"
      >
        <InputField
          label="Symptom notes"
          multiline
          onChangeText={(value) => onChange('symptomNotes', value)}
          optional
          placeholder="Worse while walking upstairs, started after exercise..."
          value={form.symptomNotes}
        />
      </InfoCard>
    </View>
  );
}
