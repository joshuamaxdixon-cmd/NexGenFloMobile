import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import { SecondaryButton } from '../../components/SecondaryButton';
import { formatDateInput } from '../../services/intake';
import { colors, spacing, typography } from '../../theme';
import type { IntakeStepComponentProps } from './types';

type PatientTypeChoice = 'myself' | 'someone_else';

const REQUIRED_VOICE_FIELDS: (keyof IntakeStepComponentProps['form'])[] = [
  'patientType',
  'firstName',
  'lastName',
  'dateOfBirth',
  'phoneNumber',
];

function derivePatientTypeChoice(patientType: string): PatientTypeChoice {
  return patientType.trim() === 'Dependent / family member'
    ? 'someone_else'
    : 'myself';
}

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
  const phoneVoice = voice?.bindField('phoneNumber');
  const patientTypeVoice = voice?.bindField('patientType');

  useEffect(() => {
    if (!form.patientType.trim()) {
      onChange('patientType', 'New patient');
    }
  }, [form.patientType, onChange]);

  const patientTypeChoice = derivePatientTypeChoice(form.patientType);
  const preferredVoiceField = useMemo(() => {
    if (patientTypeChoice === 'someone_else') {
      return 'firstName' as const;
    }

    return (
      REQUIRED_VOICE_FIELDS.find((field) => {
        const value = form[field];
        return typeof value === 'string' && value.trim().length === 0;
      }) ?? 'firstName'
    );
  }, [form, patientTypeChoice]);

  const preferredVoiceBinding =
    preferredVoiceField === 'patientType'
      ? patientTypeVoice
      : preferredVoiceField === 'firstName'
        ? firstNameVoice
        : preferredVoiceField === 'lastName'
          ? lastNameVoice
          : preferredVoiceField === 'dateOfBirth'
            ? dateOfBirthVoice
            : phoneVoice;

  return (
    <View>
      <InfoCard>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient type</Text>
          <View style={styles.selectionRow}>
            <SelectionChip
              label="Myself"
              onPress={() => onChange('patientType', 'New patient')}
              selected={patientTypeChoice === 'myself'}
            />
            <SelectionChip
              label="Someone else"
              onPress={() => onChange('patientType', 'Dependent / family member')}
              selected={patientTypeChoice === 'someone_else'}
            />
          </View>
          {fieldErrors?.patientType ? (
            <Text style={styles.errorText}>{fieldErrors.patientType}</Text>
          ) : null}
        </View>

        <View style={styles.voiceAssistRow}>
          <View style={styles.voiceAssistCopy}>
            <Text style={styles.voiceAssistTitle}>
              Need help? Use Janet to fill this faster
            </Text>
          </View>
          <SecondaryButton
            onPress={preferredVoiceBinding?.onVoicePress ?? (() => undefined)}
            style={styles.voiceAssistButton}
            title="Use voice instead"
          />
        </View>
        {preferredVoiceBinding?.footer ? (
          <View style={styles.voiceAssistFooter}>{preferredVoiceBinding.footer}</View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic info</Text>
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
            onChangeText={(value) => onChange('dateOfBirth', formatDateInput(value))}
            placeholder="MM/DD/YYYY"
            value={form.dateOfBirth}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact info</Text>
          <InputField
            errorText={fieldErrors?.phoneNumber}
            keyboardType="phone-pad"
            label="Phone number"
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
        </View>

        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setEmergencyExpanded((current) => !current)}
            style={({ pressed }) => [
              styles.accordionHeader,
              pressed ? styles.accordionHeaderPressed : null,
            ]}
          >
            <Text style={styles.sectionTitle}>Emergency contact</Text>
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
                label="Name"
                onChangeText={(value) => onChange('emergencyContactName', value)}
                optional
                placeholder="Terry Cruise"
                value={form.emergencyContactName}
              />
              <InputField
                errorText={fieldErrors?.emergencyContactPhone}
                keyboardType="phone-pad"
                label="Phone"
                onChangeText={(value) => onChange('emergencyContactPhone', value)}
                optional
                placeholder="555-555-1212"
                value={form.emergencyContactPhone}
              />
            </View>
          ) : null}
        </View>
      </InfoCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.sectionTitle,
  },
  selectionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  voiceAssistRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.divider,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  voiceAssistCopy: {
    width: '100%',
  },
  voiceAssistTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  voiceAssistButton: {
    width: '100%',
  },
  voiceAssistFooter: {
    marginTop: spacing.md,
  },
  accordionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  accordionHeaderPressed: {
    opacity: 0.75,
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
