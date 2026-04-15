import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { InfoCard } from '../../components/InfoCard';
import { patientTypeOptions } from '../../services';
import { colors, spacing, typography } from '../../theme';
import type { IntakeStepComponentProps } from './types';

export function PatientTypeScreen({
  fieldErrors,
  form,
  onChange,
}: IntakeStepComponentProps) {
  return (
    <InfoCard
      subtitle="Start by choosing the patient profile that best matches this visit."
      title="Visit Profile"
    >
      {patientTypeOptions.map((option) => {
        const selected = form.patientType === option.value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onChange('patientType', option.value)}
            style={({ pressed }) => [
              styles.optionCard,
              selected && styles.optionCardSelected,
              pressed && styles.optionCardPressed,
            ]}
          >
            <View style={styles.copy}>
              <Text style={styles.optionTitle}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <Ionicons
              color={selected ? colors.primaryDeep : colors.textTertiary}
              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
            />
          </Pressable>
        );
      })}
      {fieldErrors?.patientType ? (
        <Text style={styles.errorText}>{fieldErrors.patientType}</Text>
      ) : null}
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionCardPressed: {
    transform: [{ scale: 0.995 }],
  },
  copy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  optionTitle: {
    ...typography.sectionTitle,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    ...typography.body,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
