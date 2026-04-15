import { View } from 'react-native';

import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import { formatDateInput } from '../../services/intake';
import type { IntakeStepComponentProps } from './types';

export function BasicInfoScreen({
  fieldErrors,
  form,
  onChange,
}: IntakeStepComponentProps) {
  return (
    <View>
      <InfoCard
        subtitle="Match the same core patient information staff expect in the NexGEN chart."
        title="Patient Information"
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
          helperText="Type numbers only and NexGen Flo will format the date for you."
          keyboardType="numbers-and-punctuation"
          label="Date of birth"
          onChangeText={(value) => onChange('dateOfBirth', formatDateInput(value))}
          placeholder="MM/DD/YYYY"
          value={form.dateOfBirth}
        />
      </InfoCard>

      <InfoCard
        subtitle="Capture the primary follow-up channels for reminders, results, and visit updates."
        title="Contact Details"
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

      <InfoCard
        subtitle="This helps staff and providers resolve urgent questions without restarting intake later in the visit."
        title="Emergency Contact"
      >
        <InputField
          autoCapitalize="words"
          errorText={fieldErrors?.emergencyContactName}
          label="Emergency contact name"
          onChangeText={(value) => onChange('emergencyContactName', value)}
          optional
          placeholder="Terry Cruise"
          value={form.emergencyContactName}
        />
        <InputField
          errorText={fieldErrors?.emergencyContactPhone}
          keyboardType="phone-pad"
          label="Emergency contact phone"
          onChangeText={(value) => onChange('emergencyContactPhone', value)}
          optional
          placeholder="(555) 555-1212"
          value={form.emergencyContactPhone}
        />
      </InfoCard>
    </View>
  );
}
