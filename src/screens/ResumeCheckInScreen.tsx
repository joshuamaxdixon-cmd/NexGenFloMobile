import { StyleSheet, Text, View } from 'react-native';

import { EmptyStateCard } from '../components/EmptyStateCard';
import { InfoCard } from '../components/InfoCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { formatLastSaved, intakeFlowSteps, type DraftStoreState } from '../services';
import { colors, spacing, typography } from '../theme';

type ResumeCheckInScreenProps = {
  hasSavedDraft: boolean;
  onContinue: () => void;
  onStartNew: () => void;
  state: DraftStoreState;
};

function readSummaryValue(value: string) {
  return value.trim().length > 0 ? value : 'Not provided';
}

export function ResumeCheckInScreen({
  hasSavedDraft,
  onContinue,
  onStartNew,
  state,
}: ResumeCheckInScreenProps) {
  if (!hasSavedDraft) {
    return (
      <View style={styles.container}>
        <EmptyStateCard
          icon="clipboard-outline"
          message="There is no unfinished saved check-in on this device right now."
          title="No saved check-in"
        />
        <PrimaryButton onPress={onStartNew} title="Start New Check-In" />
      </View>
    );
  }

  const fullName = [state.intake.form.firstName, state.intake.form.lastName]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');
  const currentStepTitle =
    intakeFlowSteps.find((step) => step.key === state.intake.currentStep)?.title ??
    'Patient Information';

  return (
    <View style={styles.container}>
      <InfoCard
        subtitle="Continue the unfinished visit draft saved on this device."
        title="Saved Check-In"
      >
        <View style={styles.summaryList}>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Patient</Text>
            <Text style={styles.value}>{fullName || 'Not provided'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Date of birth</Text>
            <Text style={styles.value}>
              {readSummaryValue(state.intake.form.dateOfBirth)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>
              {readSummaryValue(state.intake.form.email)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Current step</Text>
            <Text style={styles.value}>{currentStepTitle}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Last saved</Text>
            <Text style={styles.value}>
              {formatLastSaved(
                state.intake.lastUpdatedAt ?? state.backend.draft.lastSyncedAt,
              )}
            </Text>
          </View>
        </View>
      </InfoCard>

      <View style={styles.actions}>
        <PrimaryButton onPress={onContinue} title="Continue Saved Check-In" />
        <SecondaryButton onPress={onStartNew} title="Start New Instead" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
  container: {
    gap: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  summaryList: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
  },
  summaryRow: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    gap: spacing.xxs,
    paddingVertical: spacing.md,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
