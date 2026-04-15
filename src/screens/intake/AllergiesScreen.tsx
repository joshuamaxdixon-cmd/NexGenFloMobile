import { View } from 'react-native';

import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import type { IntakeStepComponentProps } from './types';

export function AllergiesScreen({
  form,
  onChange,
}: IntakeStepComponentProps) {
  return (
    <View>
      <InfoCard
        subtitle="Surface allergy details and reactions early so clinicians see them before treatment."
        title="Allergy Profile"
      >
        <InputField
          label="Known allergies"
          multiline
          onChangeText={(value) => onChange('allergies', value)}
          optional
          placeholder="Penicillin, peanuts, latex..."
          value={form.allergies}
        />
        <InputField
          label="Reaction details"
          onChangeText={(value) => onChange('allergyReaction', value)}
          optional
          placeholder="Rash, swelling, shortness of breath..."
          value={form.allergyReaction}
        />
        <InputField
          label="Additional safety notes"
          multiline
          onChangeText={(value) => onChange('allergyNotes', value)}
          optional
          placeholder="Carries EpiPen, prior severe reaction, family notes..."
          value={form.allergyNotes}
        />
      </InfoCard>
    </View>
  );
}
