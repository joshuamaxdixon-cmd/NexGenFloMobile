import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import { SecondaryButton } from '../../components/SecondaryButton';
import { formatDateInput } from '../../services/intake';
import { colors, spacing, typography } from '../../theme';
import type { IntakeStepComponentProps } from './types';

const REQUIRED_VOICE_FIELDS: (keyof IntakeStepComponentProps['form'])[] = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'gender',
  'phoneNumber',
  'heightFt',
  'weightLb',
];

const sexOptions = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
] as const;

function SelectionChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectionChip,
        selected ? styles.selectionChipSelected : null,
        pressed ? styles.selectionChipPressed : null,
      ]}
    >
      <Text
        style={[
          styles.selectionChipLabel,
          selected ? styles.selectionChipLabelSelected : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function BasicInfoScreen({
  fieldErrors,
  form,
  onChange,
  voice,
}: IntakeStepComponentProps) {
  const [emergencyExpanded, setEmergencyExpanded] = useState(false);
  const firstNameVoice = voice?.bindField('firstName');
  const lastNameVoice = voice?.bindField('lastName');
  const dateOfBirthVoice = voice?.bindField('dateOfBirth');
  const genderVoice = voice?.bindField('gender');
  const phoneVoice = voice?.bindField('phoneNumber');
  const heightVoice = voice?.bindField('heightFt');
  const weightVoice = voice?.bindField('weightLb');

  useEffect(() => {
    if (!form.patientType.trim()) {
      onChange('patientType', 'New patient');
    }
  }, [form.patientType, onChange]);

  const preferredVoiceField = useMemo(
    () =>
      REQUIRED_VOICE_FIELDS.find((field) => {
        const value = form[field];
        return typeof value === 'string' && value.trim().length === 0;
      }) ?? 'firstName',
    [form],
  );

  const preferredVoiceBinding =
    preferredVoiceField === 'firstName'
      ? firstNameVoice
      : preferredVoiceField === 'lastName'
        ? lastNameVoice
        : preferredVoiceField === 'dateOfBirth'
          ? dateOfBirthVoice
          : preferredVoiceField === 'gender'
            ? genderVoice
            : preferredVoiceField === 'phoneNumber'
              ? phoneVoice
              : preferredVoiceField === 'heightFt'
                ? heightVoice
                : weightVoice;

  return (
    <View>
      <InfoCard>
        <View style={styles.voiceAssistRow}>
          <Text style={styles.voiceAssistText}>
            Need help? Use Janet to fill this faster
          </Text>
          <SecondaryButton
            onPress={preferredVoiceBinding?.onVoicePress ?? (() => undefined)}
            style={styles.voiceAssistButton}
            title="Use voice instead"
          />
        </View>
        {preferredVoiceBinding?.footer ? (
          <View style={styles.voiceAssistFooter}>{preferredVoiceBinding.footer}</View>
        ) : null}

        <View style={styles.formStack}>
          <InputField
            autoCapitalize="words"
            errorText={fieldErrors?.firstName}
            label="First Name"
            onChangeText={(value) => onChange('firstName', value)}
            placeholder="Ava"
            value={form.firstName}
          />
          <InputField
            autoCapitalize="words"
            errorText={fieldErrors?.lastName}
            label="Last Name"
            onChangeText={(value) => onChange('lastName', value)}
            placeholder="Johnson"
            value={form.lastName}
          />
          <InputField
            errorText={fieldErrors?.dateOfBirth}
            keyboardType="numbers-and-punctuation"
            label="Date of Birth"
            onChangeText={(value) => onChange('dateOfBirth', formatDateInput(value))}
            placeholder="MM/DD/YYYY"
            value={form.dateOfBirth}
          />

          <View style={styles.measurementsRow}>
            <View style={styles.measurementField}>
              <InputField
                errorText={fieldErrors?.heightFt}
                keyboardType="number-pad"
                label="Height (ft)"
                onChangeText={(value) => onChange('heightFt', value)}
                optional
                placeholder="5"
                value={form.heightFt}
              />
            </View>
            <View style={styles.measurementField}>
              <InputField
                errorText={fieldErrors?.heightIn}
                keyboardType="number-pad"
                label="Height (in)"
                onChangeText={(value) => onChange('heightIn', value)}
                optional
                placeholder="6"
                value={form.heightIn}
              />
            </View>
          </View>
          <InputField
            errorText={fieldErrors?.weightLb}
            keyboardType="decimal-pad"
            label="Weight (lb)"
            onChangeText={(value) => onChange('weightLb', value)}
            optional
            placeholder="140"
            value={form.weightLb}
          />

          <View style={styles.fieldGroup}>
            <Text style={typography.label}>Sex</Text>
            <View style={styles.selectionRow}>
              {sexOptions.map((option) => (
                <SelectionChip
                  key={option.value}
                  label={option.label}
                  onPress={() =>
                    onChange('gender', form.gender === option.value ? '' : option.value)
                  }
                  selected={form.gender === option.value}
                />
              ))}
            </View>
            {fieldErrors?.gender ? (
              <Text style={styles.errorText}>{fieldErrors.gender}</Text>
            ) : null}
          </View>

          <InputField
            errorText={fieldErrors?.phoneNumber}
            keyboardType="phone-pad"
            label="Phone Number"
            onChangeText={(value) => onChange('phoneNumber', value)}
            placeholder="555-555-5555"
            value={form.phoneNumber}
          />
          <InputField
            autoCapitalize="none"
            errorText={fieldErrors?.email}
            keyboardType="email-address"
            label="Email"
            onChangeText={(value) => onChange('email', value)}
            optional
            placeholder="patient@example.com"
            value={form.email}
          />

          <View style={styles.fieldGroup}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setEmergencyExpanded((current) => !current)}
              style={({ pressed }) => [
                styles.accordionHeader,
                pressed ? styles.accordionHeaderPressed : null,
              ]}
            >
              <Text style={styles.accordionLabel}>Emergency Contact (optional)</Text>
              <Ionicons
                color={colors.textSecondary}
                name={emergencyExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={20}
              />
            </Pressable>
            {emergencyExpanded ? (
              <View style={styles.accordionContent}>
                <InputField
                  autoCapitalize="words"
                  errorText={fieldErrors?.emergencyContactName}
                  label="Full Name"
                  onChangeText={(value) => onChange('emergencyContactName', value)}
                  optional
                  placeholder="Terry Cruise"
                  value={form.emergencyContactName}
                />
                <InputField
                  errorText={fieldErrors?.emergencyContactPhone}
                  keyboardType="phone-pad"
                  label="Phone Number"
                  onChangeText={(value) => onChange('emergencyContactPhone', value)}
                  optional
                  placeholder="555-555-1212"
                  value={form.emergencyContactPhone}
                />
              </View>
            ) : null}
          </View>
        </View>
      </InfoCard>
    </View>
  );
}

const styles = StyleSheet.create({
  voiceAssistRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  voiceAssistText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  voiceAssistButton: {
    minWidth: 160,
  },
  voiceAssistFooter: {
    marginBottom: spacing.md,
  },
  formStack: {
    gap: spacing.sm,
  },
  fieldGroup: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  selectionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  measurementsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  measurementField: {
    flex: 1,
  },
  selectionChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  selectionChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  selectionChipPressed: {
    transform: [{ scale: 0.99 }],
  },
  selectionChipLabel: {
    ...typography.button,
    color: colors.primaryDeep,
  },
  selectionChipLabelSelected: {
    color: colors.primaryDeep,
  },
  accordionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  accordionHeaderPressed: {
    opacity: 0.75,
  },
  accordionLabel: {
    ...typography.sectionTitle,
  },
  accordionContent: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
});
