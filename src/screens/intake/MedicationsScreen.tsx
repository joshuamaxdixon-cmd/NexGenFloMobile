import { View } from 'react-native';

import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import type { IntakeStepComponentProps } from './types';

export function MedicationsScreen({
  fieldErrors,
  form,
  onChange,
}: IntakeStepComponentProps) {
  return (
    <View>
      <InfoCard
        subtitle="Match the medication review staff and providers expect to see during the web intake."
        title="Medications"
      >
        <InputField
          errorText={fieldErrors?.medications}
          helperText="Add one per line or separate entries with commas."
          label="Current medications"
          multiline
          onChangeText={(value) => onChange('medications', value)}
          optional
          placeholder="Lisinopril 10mg, Albuterol inhaler..."
          value={form.medications}
        />
        <InputField
          errorText={fieldErrors?.pharmacy}
          label="Preferred pharmacy"
          onChangeText={(value) => onChange('pharmacy', value)}
          optional
          placeholder="CVS, Main Street"
          value={form.pharmacy}
        />
        <InputField
          errorText={fieldErrors?.lastDose}
          label="Last dose or timing note"
          onChangeText={(value) => onChange('lastDose', value)}
          optional
          placeholder="Taken this morning at 8:00 AM"
          value={form.lastDose}
        />
      </InfoCard>

      <InfoCard
        subtitle="A short medical history summary helps the care team avoid re-asking the same background questions later."
        title="Medical History"
      >
        <InputField
          errorText={fieldErrors?.medicalConditions}
          helperText="Keep this concise: diagnoses, chronic conditions, or recent history that matters for today."
          label="Conditions / history"
          multiline
          onChangeText={(value) => onChange('medicalConditions', value)}
          optional
          placeholder="Asthma, diabetes, prior surgery, recent hospitalization..."
          value={form.medicalConditions}
        />
      </InfoCard>
    </View>
  );
}
