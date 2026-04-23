import { StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '../components/InfoCard';
import { PortalScreenLayout } from '../components/portal/PortalScreenLayout';
import type { PatientPortalSummary } from '../services';
import { colors, spacing, typography } from '../theme';

type Props = {
  onBack: () => void;
  portal: PatientPortalSummary;
};

function valueOrFallback(value: string) {
  return value.trim().length > 0 ? value : 'Not provided';
}

export function PatientPortalVisitsScreen({ onBack, portal }: Props) {
  return (
    <PortalScreenLayout
      onBack={onBack}
      subtitle="Review the recent visit activity connected to your portal account."
      title="Recent Visits"
    >
      <View style={styles.content}>
        <InfoCard>
          {portal.activeVisit ? (
            <View style={styles.summaryList}>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Visit ID</Text>
                <Text style={styles.value}>{portal.activeVisit.id}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Status</Text>
                <Text style={styles.value}>
                  {valueOrFallback(portal.activeVisit.statusLabel)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Reason</Text>
                <Text style={styles.value}>
                  {valueOrFallback(portal.activeVisit.reasonForVisit)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Duration</Text>
                <Text style={styles.value}>
                  {valueOrFallback(portal.activeVisit.symptomDuration)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Severity</Text>
                <Text style={styles.value}>
                  {valueOrFallback(portal.activeVisit.symptomSeverity)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyCopy}>No recent visits are available yet.</Text>
          )}
        </InfoCard>
      </View>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  emptyCopy: {
    ...typography.body,
    color: colors.textSecondary,
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
    paddingVertical: spacing.sm,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
