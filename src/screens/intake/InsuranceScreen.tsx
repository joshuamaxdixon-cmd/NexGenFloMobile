import { View } from 'react-native';

import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import type { IntakeStepComponentProps } from './types';

export function InsuranceScreen({
  fieldErrors,
  form,
  onChange,
}: IntakeStepComponentProps) {
  return (
    <View>
      <InfoCard
        subtitle="Enter the same core coverage details the web intake uses before document capture and verification."
        title="Insurance & Subscriber"
      >
        <InputField
          errorText={fieldErrors?.insuranceProvider}
          label="Insurance provider"
          onChangeText={(value) => onChange('insuranceProvider', value)}
          placeholder="Blue Cross Blue Shield"
          value={form.insuranceProvider}
        />
        <InputField
          errorText={fieldErrors?.memberId}
          label="Member ID"
          onChangeText={(value) => onChange('memberId', value)}
          placeholder="XJH-449922"
          value={form.memberId}
        />
        <InputField
          label="Group number"
          onChangeText={(value) => onChange('groupNumber', value)}
          optional
          placeholder="GRP-2024"
          value={form.groupNumber}
        />
        <InputField
          label="Subscriber name"
          onChangeText={(value) => onChange('subscriberName', value)}
          optional
          placeholder="Ava Johnson"
          value={form.subscriberName}
        />
      </InfoCard>
    </View>
  );
}
