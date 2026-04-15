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
        subtitle="Capture the main reason for today’s visit before the staff review begins."
        title="Visit Reason"
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
        title="Clinical Notes"
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

      <InfoCard
        subtitle="These match the same optional measurements shown in the web intake’s medical step."
        title="Measurements"
      >
        <InputField
          errorText={fieldErrors?.heightFt}
          helperText="Use feet and inches just like the web intake."
          keyboardType="number-pad"
          label="Height (ft)"
          onChangeText={(value) => onChange('heightFt', value)}
          optional
          placeholder="5"
          value={form.heightFt}
        />
        <InputField
          errorText={fieldErrors?.heightIn}
          keyboardType="number-pad"
          label="Height (in)"
          onChangeText={(value) => onChange('heightIn', value)}
          optional
          placeholder="6"
          value={form.heightIn}
        />
        <InputField
          errorText={fieldErrors?.weightLb}
          keyboardType="decimal-pad"
          label="Weight (lb)"
          onChangeText={(value) => onChange('weightLb', value)}
          optional
          placeholder="140"
          value={form.weightLb}
        />
      </InfoCard>
    </View>
  );
}
