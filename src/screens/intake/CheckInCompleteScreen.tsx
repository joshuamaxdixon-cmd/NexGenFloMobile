import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { InfoCard } from '../../components/InfoCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import type { IntakeFormData } from '../../services';
import { colors, spacing, typography } from '../../theme';

const NEXT_STEPS = [
  'Staff reviews your check-in.',
  'Staff may ask for documents or clarification if needed.',
  'You will be called when the care team is ready.',
] as const;

function formatSubmittedAt(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

type CheckInCompleteScreenProps = {
  form: IntakeFormData;
  submittedAt: string | null;
  onClose: () => void;
  onNewCheckIn: () => void;
};

export function CheckInCompleteScreen({
  form,
  submittedAt,
  onClose,
  onNewCheckIn,
}: CheckInCompleteScreenProps) {
  const fullName = [form.firstName.trim(), form.lastName.trim()]
    .filter(Boolean)
    .join(' ') || 'Patient';
  const formattedTime = submittedAt ? formatSubmittedAt(submittedAt) : null;
  const visitReason = form.chiefConcern.trim() || 'Visit reason not provided';

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconShell}>
          <Ionicons color={colors.success} name="checkmark-circle" size={52} />
        </View>
        <Text style={styles.heroTitle}>Check-In Complete</Text>
        <Text style={styles.heroSubtitle}>You are checked in.</Text>
        <Text style={styles.heroHelper}>
          Your information was received and added to the Smart Queue.
        </Text>
      </View>

      <InfoCard>
        <Text style={styles.cardSectionLabel}>Patient</Text>
        <Text style={styles.patientName}>{fullName}</Text>
        <View style={styles.metaList}>
          {form.dateOfBirth.trim() ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>DOB</Text>
              <Text style={styles.metaValue}>{form.dateOfBirth}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Visit</Text>
            <Text style={styles.metaValue}>{visitReason}</Text>
          </View>
          {formattedTime ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Submitted</Text>
              <Text style={styles.metaValue}>{formattedTime}</Text>
            </View>
          ) : null}
        </View>
      </InfoCard>

      <InfoCard>
        <Text style={styles.nextTitle}>What happens next</Text>
        <View style={styles.stepList}>
          {NEXT_STEPS.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </InfoCard>

      <View style={styles.actions}>
        <PrimaryButton onPress={onClose} title="Close" />
        <SecondaryButton onPress={onNewCheckIn} title="New Check-In" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  iconShell: {
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  heroHelper: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: '82%',
    marginTop: spacing.xxs,
  },
  cardSectionLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xxs,
  },
  patientName: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 24,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  metaList: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    gap: 0,
  },
  metaRow: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metaValue: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  nextTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  stepList: {
    gap: spacing.md,
  },
  stepRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDeep,
  },
  stepText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 20,
    paddingTop: 4,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
