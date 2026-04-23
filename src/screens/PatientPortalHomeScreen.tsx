import { Image, StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '../components/InfoCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import type {
  PatientPortalSession,
} from '../services/patientPortalStore';
import type { PatientPortalSummary } from '../services/patientPortal';
import { colors, spacing, typography } from '../theme';

type Props = {
  busyAction?: string | null;
  message?: string | null;
  onContinueCheckIn: () => void;
  onEditProfile: () => void;
  onOpenAppHome: () => void;
  onOpenDocuments: () => void;
  onOpenVisits: () => void;
  onUpdateMedicalHistory: () => void;
  onSignOut: () => void;
  portal: PatientPortalSummary;
  session: PatientPortalSession;
};

function buildAvatarUri(uri: string, version: string | null) {
  if (!uri) {
    return null;
  }
  const suffix = version ? `${uri.includes('?') ? '&' : '?'}v=${version}` : '';
  return `${uri}${suffix}`;
}

export function PatientPortalHomeScreen({
  busyAction,
  message,
  onContinueCheckIn,
  onEditProfile,
  onOpenAppHome,
  onOpenDocuments,
  onOpenVisits,
  onUpdateMedicalHistory,
  onSignOut,
  portal,
  session,
}: Props) {
  const avatarUri = buildAvatarUri(
    portal.patient.profileImageUrl,
    session.avatarVersion,
  );

  return (
    <View style={styles.container}>
      <InfoCard
        subtitle="You are signed in with your patient account."
        title={portal.patient.fullName || 'Patient Portal'}
      >
        <View style={styles.identityRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>
                {portal.patient.avatarInitials || 'PT'}
              </Text>
            </View>
          )}
          <View style={styles.identityText}>
            <Text style={styles.identityName}>
              {portal.patient.fullName || 'Patient'}
            </Text>
            <Text style={styles.identityMeta}>
              Patient ID {portal.patient.id || session.patientId}
            </Text>
          </View>
        </View>
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
          loading={busyAction === 'refresh'}
          onPress={onContinueCheckIn}
          title="Start Today's Check-In"
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
          onPress={onOpenDocuments}
          style={styles.actionButton}
          title="Documents"
        />
        <SecondaryButton
          onPress={onOpenVisits}
          style={styles.actionButton}
          title="Recent Visits"
        />
        <SecondaryButton
          onPress={onOpenAppHome}
          style={styles.actionButton}
          title="Back to App Home"
        />
        <SecondaryButton
          onPress={onSignOut}
          style={styles.actionButton}
          title="Sign Out"
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </InfoCard>

      <InfoCard
        subtitle="Your latest visit activity appears here."
        title="Recent Visit"
      >
        {portal.activeVisit ? (
          <View style={styles.summaryList}>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>{portal.activeVisit.statusLabel}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Reason for visit</Text>
              <Text style={styles.value}>
                {portal.activeVisit.reasonForVisit || 'Not provided'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Last updated</Text>
              <Text style={styles.value}>
                {portal.activeVisit.updatedAt || 'Not provided'}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.message}>No recent visits are available yet.</Text>
        )}
      </InfoCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  avatarImage: {
    borderRadius: 26,
    height: 52,
    width: 52,
  },
  avatarInitials: {
    ...typography.headline,
    color: colors.primary,
    fontWeight: '700',
  },
  actionsCard: {
    gap: spacing.sm,
  },
  actionButton: {
    marginTop: spacing.sm,
  },
  identityMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  identityName: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  identityText: {
    flex: 1,
    gap: spacing.xxs,
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
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.caption,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
