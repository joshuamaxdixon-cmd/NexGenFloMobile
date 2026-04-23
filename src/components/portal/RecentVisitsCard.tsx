import { StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '../InfoCard';
import type { PatientPortalSummary } from '../../services';
import { colors, spacing, typography } from '../../theme';

type Props = {
  portal: PatientPortalSummary;
};

function valueOrFallback(value: string) {
  return value.trim().length > 0 ? value : 'Not provided';
}

export function RecentVisitsCard({ portal }: Props) {
  return (
    <InfoCard subtitle="A quick look at your recent visit activity." title="Recent Visits">
      {portal.activeVisit ? (
        <View style={styles.list}>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>
              {valueOrFallback(portal.activeVisit.statusLabel)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Reason</Text>
            <Text style={styles.value}>
              {valueOrFallback(portal.activeVisit.reasonForVisit)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Updated</Text>
            <Text style={styles.value}>
              {valueOrFallback(portal.activeVisit.updatedAt ?? '')}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.emptyCopy}>No recent visits are available yet.</Text>
      )}
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  list: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
  },
  row: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
  emptyCopy: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
