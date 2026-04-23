import { StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '../components/InfoCard';
import { InputField } from '../components/InputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { formatDateInput } from '../services';
import { colors, spacing, typography } from '../theme';

type Props = {
  busy?: boolean;
  email: string;
  dateOfBirth: string;
  message?: string | null;
  onChangeDateOfBirth: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onContinue: () => void;
};

export function PatientPortalLoginScreen({
  busy = false,
  email,
  dateOfBirth,
  message,
  onChangeDateOfBirth,
  onChangeEmail,
  onContinue,
}: Props) {
  const canContinue = email.trim().length > 0 && dateOfBirth.trim().length > 0;

  return (
    <View>
      <InfoCard
        subtitle="Sign in to manage your profile, documents, medical history, and visits."
        title="Patient Portal Login"
      >
        <InputField
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email"
          onChangeText={onChangeEmail}
          placeholder="you@example.com"
          value={email}
        />
        <InputField
          keyboardType="numbers-and-punctuation"
          label="Date of Birth"
          onChangeText={(value) => onChangeDateOfBirth(formatDateInput(value))}
          placeholder="MM/DD/YYYY"
          value={dateOfBirth}
        />
      </InfoCard>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <PrimaryButton
        disabled={!canContinue || busy}
        loading={busy}
        onPress={onContinue}
        style={styles.button}
        title="Sign In"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: spacing.lg,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
