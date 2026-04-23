import { StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '../components/InfoCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { PortalScreenLayout } from '../components/portal/PortalScreenLayout';
import type { PatientPortalSummary } from '../services';
import { colors, spacing, typography } from '../theme';

type Props = {
  onBack: () => void;
  onContinue: () => void;
  portal: PatientPortalSummary;
};

function valueOrFallback(value: string) {
  return value.trim().length > 0 ? value : 'Not provided';
}

export function PatientPortalCheckInStartScreen({
  onBack,
  onContinue,
  portal,
}: Props) {
  return (
    <PortalScreenLayout
      onBack={onBack}
      subtitle="We’ll use your portal profile to start today’s check-in."
      title="Start Today's Check-In"
    >
      <View style={styles.content}>
        <InfoCard
          subtitle="The patient details below will be carried into the check-in flow."
          title="Profile Ready"
        >
          <View style={styles.list}>
            <View style={styles.row}>
              <Text style={styles.label}>Patient</Text>
              <Text style={styles.value}>
                {valueOrFallback(portal.patient.fullName)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date of birth</Text>
              <Text style={styles.value}>
                {valueOrFallback(portal.patient.dateOfBirth)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>
                {valueOrFallback(portal.patient.email)}
              </Text>
            </View>
          </View>
        </InfoCard>
        <PrimaryButton onPress={onContinue} title="Continue to Check-In" />
      </View>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
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
});
