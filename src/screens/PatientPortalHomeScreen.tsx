import { StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '../components/InfoCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { PortalActionList } from '../components/portal/PortalActionList';
import { PatientIdentityCard } from '../components/portal/PatientIdentityCard';
import { PortalScreenLayout } from '../components/portal/PortalScreenLayout';
import { RecentVisitsCard } from '../components/portal/RecentVisitsCard';
import type { PatientPortalSession } from '../services/patientPortalStore';
import type { PatientPortalSummary } from '../services/patientPortal';
import { colors, spacing, typography } from '../theme';

type Props = {
  busyAction?: string | null;
  message?: string | null;
  onContinueCheckIn: () => void;
  onEditProfile: () => void;
  onOpenDocuments: () => void;
  onOpenVisits: () => void;
  onUpdateMedicalHistory: () => void;
  onSignOut: () => void;
  portal: PatientPortalSummary;
  session: PatientPortalSession;
};

export function PatientPortalHomeScreen({
  busyAction,
  message,
  onContinueCheckIn,
  onEditProfile,
  onOpenDocuments,
  onOpenVisits,
  onSignOut,
  onUpdateMedicalHistory,
  portal,
  session,
}: Props) {
  return (
    <PortalScreenLayout
      subtitle="Manage your profile and today&apos;s visit."
      title="Patient Portal"
    >
      <View style={styles.content}>
        <PatientIdentityCard patient={portal.patient} session={session} />

        <InfoCard style={styles.primaryActionCard}>
          <Text style={styles.primaryActionTitle}>Today&apos;s Visit</Text>
          <Text style={styles.primaryActionCopy}>
            Start today&apos;s check-in with your saved patient details.
          </Text>
          <PrimaryButton
            loading={busyAction === 'refresh'}
            onPress={onContinueCheckIn}
            title="Start Today's Check-In"
          />
        </InfoCard>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <PortalActionList
            actions={[
              {
                icon: 'person-circle-outline',
                label: 'Edit Profile',
                onPress: onEditProfile,
              },
              {
                icon: 'medkit-outline',
                label: 'Update Medical History',
                onPress: onUpdateMedicalHistory,
              },
              {
                icon: 'document-text-outline',
                label: 'Documents',
                onPress: onOpenDocuments,
              },
              {
                icon: 'time-outline',
                label: 'Recent Visits',
                onPress: onOpenVisits,
              },
              {
                icon: 'log-out-outline',
                label: 'Sign Out',
                onPress: onSignOut,
                tone: 'danger',
              },
            ]}
          />
        </View>

        <RecentVisitsCard portal={portal} />

        {message ? (
          <Text style={styles.message}>{message}</Text>
        ) : null}
      </View>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  primaryActionCard: {
    gap: spacing.sm,
  },
  primaryActionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  primaryActionCopy: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
