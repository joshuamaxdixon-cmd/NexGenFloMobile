import { Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { InfoCard } from '../components/InfoCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { PortalScreenLayout } from '../components/portal/PortalScreenLayout';
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
    <PortalScreenLayout
      onBack={onBack}
      subtitle="Manage the documents currently connected to your patient portal."
      title="Documents"
    >
      <View style={styles.content}>
        <InfoCard
          subtitle="Your current document support is centered on the profile image saved to your patient account."
          title="Profile Image"
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
            title="Add / Change Profile Picture"
          />
        </InfoCard>

        <InfoCard
          subtitle="This area is ready for future patient document types without changing the portal structure."
          title="Additional Documents"
        >
          <Text style={styles.detailLabel}>Current support</Text>
          <Text style={styles.detailValue}>Profile image only</Text>
          <Text style={styles.detailLabel}>Patient ID</Text>
          <Text style={styles.detailValue}>{patient.id || 'Not available'}</Text>
        </InfoCard>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  detailValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  previewShell: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  previewFallback: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  previewImage: {
    borderRadius: 40,
    height: 80,
    width: 80,
  },
  previewInitials: {
    ...typography.headline,
    color: colors.primaryDeep,
    fontWeight: '700',
  },
});
