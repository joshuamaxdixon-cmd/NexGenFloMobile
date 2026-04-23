import { StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '../components/InfoCard';
import { SecondaryButton } from '../components/SecondaryButton';
import type { PatientPortalSummary } from '../services';
import { colors, spacing, typography } from '../theme';

type Props = {
  onBack: () => void;
  portal: PatientPortalSummary;
};

export function PatientPortalVisitsScreen({ onBack, portal }: Props) {
  return (
    <View style={styles.container}>
      <InfoCard
        subtitle="Review the visit tied to your patient account."
        title="Recent Visits"
      >
        {portal.activeVisit ? (
          <View style={styles.summaryList}>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Visit ID</Text>
              <Text style={styles.value}>{portal.activeVisit.id}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>{portal.activeVisit.statusLabel}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Reason</Text>
              <Text style={styles.value}>
                {portal.activeVisit.reasonForVisit || 'Not provided'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Duration</Text>
              <Text style={styles.value}>
                {portal.activeVisit.symptomDuration || 'Not provided'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Severity</Text>
              <Text style={styles.value}>
                {portal.activeVisit.symptomSeverity || 'Not provided'}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyCopy}>
            No recent visits are available for this patient account yet.
          </Text>
        )}
      </InfoCard>

      <SecondaryButton onPress={onBack} title="Back" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  emptyCopy: {
    ...typography.body,
    color: colors.textSecondary,
  },
  label: {
    ...typography.caption,
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
