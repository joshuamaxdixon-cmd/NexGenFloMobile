import { StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '../components/InfoCard';
import { InputField } from '../components/InputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { PortalScreenLayout } from '../components/portal/PortalScreenLayout';
import { formatDateInput } from '../services';
import { colors, spacing, typography } from '../theme';

type Props = {
  busy?: boolean;
  dateOfBirth: string;
  email: string;
  message?: string | null;
  onBack?: () => void;
  onChangeDateOfBirth: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onContinue: () => void;
};

export function PatientPortalLoginScreen({
  busy = false,
  dateOfBirth,
  email,
  message,
  onBack,
  onChangeDateOfBirth,
  onChangeEmail,
  onContinue,
}: Props) {
  const canContinue = email.trim().length > 0 && dateOfBirth.trim().length > 0;

  return (
    <PortalScreenLayout
      onBack={onBack}
      subtitle="Sign in to manage your profile, documents, medical history, and visits."
      title="Patient Portal Login"
    >
      <View style={styles.content}>
        <InfoCard
          subtitle="Use the same patient identity you use on the web portal."
          title="Sign In"
        >
          <View style={styles.form}>
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
          </View>
        </InfoCard>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <PrimaryButton
          disabled={!canContinue || busy}
          loading={busy}
          onPress={onContinue}
          title="Sign In"
        />
      </View>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  form: {
    gap: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
