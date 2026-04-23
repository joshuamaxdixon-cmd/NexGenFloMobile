import { Image, StyleSheet, Text, View } from 'react-native';

import type { PatientPortalPatient } from '../../services/patientPortal';
import type { PatientPortalSession } from '../../services/patientPortalStore';
import { InfoCard } from '../InfoCard';
import { colors, spacing, typography } from '../../theme';

type Props = {
  patient: PatientPortalPatient;
  session: PatientPortalSession;
};

function buildAvatarUri(uri: string, version: string | null) {
  if (!uri) {
    return null;
  }
  const suffix = version ? `${uri.includes('?') ? '&' : '?'}v=${version}` : '';
  return `${uri}${suffix}`;
}

function valueOrFallback(value: string, fallback = 'Not provided') {
  return value.trim().length > 0 ? value : fallback;
}

export function PatientIdentityCard({ patient, session }: Props) {
  const avatarUri = buildAvatarUri(
    patient.profileImageUrl,
    session.avatarVersion,
  );

  return (
    <InfoCard style={styles.card}>
      <View style={styles.topRow}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>
              {patient.avatarInitials || 'PT'}
            </Text>
          </View>
        )}
        <View style={styles.copy}>
          <Text style={styles.name}>{patient.fullName || 'Patient'}</Text>
          <Text style={styles.meta}>Patient ID {patient.id || session.patientId}</Text>
        </View>
      </View>
      <View style={styles.summaryList}>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{valueOrFallback(patient.email)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Date of birth</Text>
          <Text style={styles.value}>{valueOrFallback(patient.dateOfBirth)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{valueOrFallback(patient.phone)}</Text>
        </View>
      </View>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarImage: {
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  avatarInitials: {
    ...typography.headline,
    color: colors.primaryDeep,
    fontWeight: '700',
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  name: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
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
    color: colors.textTertiary,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
