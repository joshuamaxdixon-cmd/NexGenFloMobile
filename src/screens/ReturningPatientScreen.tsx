import { StyleSheet, Text, View } from 'react-native';

import { DraftBanner } from '../components/DraftBanner';
import { InfoCard } from '../components/InfoCard';
import { InputField } from '../components/InputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { formatDateInput } from '../services/intake';
import type {
  ReturningPatientFieldErrors,
  ReturningPatientFormData,
} from '../services';
import { colors, spacing, typography } from '../theme';

type ReturningPatientScreenProps = {
  data: ReturningPatientFormData;
  onChange: (
    field: keyof ReturningPatientFormData,
    value: ReturningPatientFormData[keyof ReturningPatientFormData],
  ) => void;
  onContinue: () => void;
  busy?: boolean;
  buttonTitle?: string;
  fieldErrors?: ReturningPatientFieldErrors;
  statusMessage?: string | null;
  statusTone?: 'info' | 'success' | 'warning';
};

export function ReturningPatientScreen({
  busy = false,
  buttonTitle = 'Continue',
  data,
  fieldErrors,
  onChange,
  onContinue,
  statusMessage,
  statusTone = 'info',
}: ReturningPatientScreenProps) {
  const canContinue =
    data.firstName.trim().length > 0 &&
    data.lastName.trim().length > 0 &&
    data.dateOfBirth.trim().length > 0;

  return (
    <View>
      {statusMessage ? (
        <DraftBanner
          badgeLabel={busy ? 'Looking Up' : statusTone === 'success' ? 'Matched' : 'Saved'}
          message={statusMessage}
          style={styles.statusBanner}
          title={
            statusTone === 'success'
              ? 'Returning patient matched'
              : 'Lookup status'
          }
          tone={statusTone}
        />
      ) : null}

      <InfoCard
        subtitle="Enter the core identity details below so NexGen Flo can recognize the patient and continue with a shorter intake."
        title="Recognition Lookup"
      >
        <InputField
          autoCapitalize="words"
          errorText={fieldErrors?.firstName}
          label="First name"
          onChangeText={(value) => onChange('firstName', value)}
          placeholder="Ava"
          value={data.firstName}
        />
        <InputField
          autoCapitalize="words"
          errorText={fieldErrors?.lastName}
          label="Last name"
          onChangeText={(value) => onChange('lastName', value)}
          placeholder="Johnson"
          value={data.lastName}
        />
        <InputField
          errorText={fieldErrors?.dateOfBirth}
          keyboardType="numbers-and-punctuation"
          label="Date of birth"
          onChangeText={(value) => onChange('dateOfBirth', formatDateInput(value))}
          placeholder="MM/DD/YYYY"
          value={data.dateOfBirth}
        />
        <InputField
          errorText={fieldErrors?.phoneNumber}
          keyboardType="phone-pad"
          label="Phone number"
          onChangeText={(value) => onChange('phoneNumber', value)}
          optional
          placeholder="555-555-5555"
          value={data.phoneNumber}
        />
      </InfoCard>

      <InfoCard
        style={styles.supportCard}
        subtitle="Optional phone number improves match confidence when multiple records have similar names."
        title="Lookup Notes"
      >
        <Text style={typography.body}>
          After continuing, the patient is routed directly into the symptom step
          so staff can move quickly without repeating baseline details.
        </Text>
      </InfoCard>

      <PrimaryButton
        disabled={!canContinue || busy}
        loading={busy}
        onPress={onContinue}
        style={styles.button}
        title={busy ? 'Looking Up...' : buttonTitle}
      />
      {!canContinue ? (
        <Text style={styles.helperText}>
          Add first name, last name, and date of birth to continue.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statusBanner: {
    marginBottom: spacing.md,
  },
  supportCard: {
    marginTop: spacing.lg,
  },
  button: {
    marginTop: spacing.lg,
  },
  helperText: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
