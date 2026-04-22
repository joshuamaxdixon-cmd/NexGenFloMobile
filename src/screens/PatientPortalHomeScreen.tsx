import { StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '../components/InfoCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import type { PatientPortalSummary } from '../services/patientPortal';
import { colors, spacing, typography } from '../theme';

type Props = {
  busyAction?: string | null;
  message?: string | null;
  portal: PatientPortalSummary;
  onContinueCheckIn: () => void;
  onEditProfile: () => void;
  onUpdateMedicalHistory: () => void;
  onUpdateProfilePicture: () => void;
  onSignOut: () => void;
};

export function PatientPortalHomeScreen({
  busyAction,
  message,
  portal,
  onContinueCheckIn,
  onEditProfile,
  onUpdateMedicalHistory,
  onUpdateProfilePicture,
  onSignOut,
}: Props) {
  return (
    <View style={styles.container}>
      <InfoCard
        subtitle="You are signed in with your patient account."
        title={portal.patient.fullName || 'Patient Portal'}
      >
        <View style={styles.summaryList}>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{portal.patient.email || 'Not provided'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Date of birth</Text>
            <Text style={styles.value}>
              {portal.patient.dateOfBirth || 'Not provided'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{portal.patient.phone || 'Not provided'}</Text>
          </View>
        </View>
      </InfoCard>

      <InfoCard style={styles.actionsCard} title="Patient Portal">
        <PrimaryButton
          loading={busyAction === 'checkIn'}
          onPress={onContinueCheckIn}
          title="Continue Check-In"
        />
        <SecondaryButton
          onPress={onEditProfile}
          style={styles.actionButton}
          title="Edit Profile"
        />
        <SecondaryButton
          onPress={onUpdateMedicalHistory}
          style={styles.actionButton}
          title="Update Medical History"
        />
        <SecondaryButton
          onPress={onUpdateProfilePicture}
          style={styles.actionButton}
          title="Add / Change Profile Picture"
        />
        <SecondaryButton
          onPress={onSignOut}
          style={styles.actionButton}
          title="Sign Out"
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </InfoCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  actionsCard: {
    gap: spacing.sm,
  },
  actionButton: {
    marginTop: spacing.sm,
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
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
  label: {
    ...typography.caption,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
