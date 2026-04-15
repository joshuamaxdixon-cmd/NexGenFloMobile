import { View } from 'react-native';

import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import type { IntakeStepComponentProps } from './types';

export function MedicationsScreen({
  form,
  onChange,
}: IntakeStepComponentProps) {
  return (
    <View>
      <InfoCard
        subtitle="Review active medications, recent doses, and preferred pharmacy before the visit begins."
        title="Medication Review"
      >
        <InputField
          label="Current medications"
          multiline
          onChangeText={(value) => onChange('medications', value)}
          optional
          placeholder="Lisinopril 10mg, Albuterol inhaler..."
          value={form.medications}
        />
        <InputField
          label="Preferred pharmacy"
          onChangeText={(value) => onChange('pharmacy', value)}
          optional
          placeholder="CVS, Main Street"
          value={form.pharmacy}
        />
        <InputField
          label="Last dose or timing note"
          onChangeText={(value) => onChange('lastDose', value)}
          optional
          placeholder="Taken this morning at 8:00 AM"
          value={form.lastDose}
        />
      </InfoCard>
    </View>
  );
}
