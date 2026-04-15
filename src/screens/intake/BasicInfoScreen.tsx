import { View } from 'react-native';

import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import type { IntakeStepComponentProps } from './types';

export function BasicInfoScreen({
  fieldErrors,
  form,
  onChange,
}: IntakeStepComponentProps) {
  return (
    <View>
      <InfoCard
        subtitle="Collect the core identity fields needed for patient registration and chart matching."
        title="Identity"
      >
        <InputField
          autoCapitalize="words"
          errorText={fieldErrors?.firstName}
          label="First name"
          onChangeText={(value) => onChange('firstName', value)}
          placeholder="Ava"
          value={form.firstName}
        />
        <InputField
          autoCapitalize="words"
          errorText={fieldErrors?.lastName}
          label="Last name"
          onChangeText={(value) => onChange('lastName', value)}
          placeholder="Johnson"
          value={form.lastName}
        />
        <InputField
          errorText={fieldErrors?.dateOfBirth}
          keyboardType="numbers-and-punctuation"
          label="Date of birth"
          onChangeText={(value) => onChange('dateOfBirth', value)}
          placeholder="MM/DD/YYYY"
          value={form.dateOfBirth}
        />
      </InfoCard>

      <InfoCard
        subtitle="Add the best contact channels for appointment reminders and follow-up."
        title="Contact"
      >
        <InputField
          errorText={fieldErrors?.phoneNumber}
          keyboardType="phone-pad"
          label="Phone number"
          onChangeText={(value) => onChange('phoneNumber', value)}
          placeholder="(555) 555-5555"
          value={form.phoneNumber}
        />
        <InputField
          autoCapitalize="none"
          errorText={fieldErrors?.email}
          keyboardType="email-address"
          label="Email address"
          onChangeText={(value) => onChange('email', value)}
          optional
          placeholder="patient@example.com"
          value={form.email}
        />
      </InfoCard>
    </View>
  );
}
