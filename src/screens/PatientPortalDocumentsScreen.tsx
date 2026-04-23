import { Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { InfoCard } from '../components/InfoCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import type { PatientPortalPatient, PatientPortalPhotoAsset } from '../services';
import { colors, spacing, typography } from '../theme';

type Props = {
  busyAction?: string | null;
  message?: string | null;
  onBack: () => void;
  onUploadPhoto: (asset: PatientPortalPhotoAsset) => void;
  patient: PatientPortalPatient;
  profileImageVersion?: string | null;
};

function buildAvatarUri(uri: string, version?: string | null) {
  if (!uri) {
    return null;
  }
  const suffix = version ? `${uri.includes('?') ? '&' : '?'}v=${version}` : '';
  return `${uri}${suffix}`;
}

export function PatientPortalDocumentsScreen({
  busyAction,
  message,
  onBack,
  onUploadPhoto,
  patient,
  profileImageVersion,
}: Props) {
  const avatarUri = buildAvatarUri(patient.profileImageUrl, profileImageVersion);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled) {
      return;
    }
    const asset = result.assets[0];
    onUploadPhoto({
      name: asset.fileName ?? 'profile.jpg',
      type: asset.mimeType ?? 'image/jpeg',
      uri: asset.uri,
    });
  };

  return (
    <View style={styles.container}>
      <InfoCard
        subtitle="Manage the saved image attached to your patient account."
        title="Profile Photo"
      >
        <View style={styles.previewShell}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewFallback}>
              <Text style={styles.previewInitials}>
                {patient.avatarInitials || 'PT'}
              </Text>
            </View>
          )}
        </View>
        <PrimaryButton
          loading={busyAction === 'photo'}
          onPress={() => void pickPhoto()}
          style={styles.primaryAction}
          title="Add / Change Profile Picture"
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </InfoCard>

      <InfoCard
        subtitle="Portal document support is ready for additional document types later."
        title="Account Documents"
      >
        <Text style={styles.detailLabel}>Current saved image</Text>
        <Text style={styles.detailValue}>
          {patient.profileImageUrl ? 'Saved to patient profile' : 'No image saved'}
        </Text>
        <Text style={styles.detailLabel}>Patient ID</Text>
        <Text style={styles.detailValue}>{patient.id || 'Not available'}</Text>
      </InfoCard>

      <SecondaryButton onPress={onBack} title="Back" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  detailLabel: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  detailValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  previewFallback: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  previewImage: {
    borderRadius: 48,
    height: 96,
    width: 96,
  },
  previewInitials: {
    ...typography.headline,
    color: colors.primary,
    fontWeight: '700',
  },
  previewShell: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryAction: {
    marginTop: spacing.sm,
  },
});
