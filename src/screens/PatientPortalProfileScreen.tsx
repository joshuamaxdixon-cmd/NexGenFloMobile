import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { InfoCard } from '../components/InfoCard';
import { InputField } from '../components/InputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { PortalScreenLayout } from '../components/portal/PortalScreenLayout';
import type { PatientPortalPatient } from '../services/patientPortal';
import { colors, spacing, typography } from '../theme';

type Props = {
  busyAction?: string | null;
  message?: string | null;
  onBack: () => void;
  onSave: (payload: {
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zipCode: string;
  }) => void;
  onUploadPhoto: (asset: { name: string; type: string; uri: string }) => void;
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

export function PatientPortalProfileScreen({
  busyAction,
  message,
  onBack,
  onSave,
  onUploadPhoto,
  patient,
  profileImageVersion,
}: Props) {
  const [phone, setPhone] = useState(patient.phone);
  const [email, setEmail] = useState(patient.email);
  const [addressLine1, setAddressLine1] = useState(patient.addressLine1);
  const [addressLine2, setAddressLine2] = useState(patient.addressLine2);
  const [city, setCity] = useState(patient.city);
  const [stateValue, setStateValue] = useState(patient.state);
  const [zipCode, setZipCode] = useState(patient.zipCode);
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
      subtitle="Update the patient profile used across your portal and check-in."
      title="Edit Profile"
    >
      <View style={styles.content}>
        <InfoCard>
          <View style={styles.identityRow}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>
                  {patient.avatarInitials || 'PT'}
                </Text>
              </View>
            )}
            <View style={styles.identityCopy}>
              <Text style={styles.identityName}>
                {patient.fullName || 'Patient'}
              </Text>
              <Text style={styles.identityMeta}>
                Keep your portal profile current.
              </Text>
            </View>
          </View>
          <SecondaryButton
            loading={busyAction === 'photo'}
            onPress={() => void pickPhoto()}
            title="Add / Change Profile Picture"
          />
        </InfoCard>

        <InfoCard title="Contact Details">
          <View style={styles.form}>
            <InputField label="Phone" onChangeText={setPhone} value={phone} />
            <InputField
              autoCapitalize="none"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              value={email}
            />
            <InputField
              label="Address line 1"
              onChangeText={setAddressLine1}
              value={addressLine1}
            />
            <InputField
              label="Address line 2"
              onChangeText={setAddressLine2}
              optional
              value={addressLine2}
            />
            <InputField label="City" onChangeText={setCity} value={city} />
            <InputField label="State" onChangeText={setStateValue} value={stateValue} />
            <InputField label="ZIP code" onChangeText={setZipCode} value={zipCode} />
          </View>
        </InfoCard>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <PrimaryButton
          loading={busyAction === 'profile'}
          onPress={() =>
            onSave({
              phone,
              email,
              addressLine1,
              addressLine2,
              city,
              state: stateValue,
              zipCode,
            })
          }
          title="Save Profile"
        />
      </View>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  avatarImage: {
    borderRadius: 30,
    height: 60,
    width: 60,
  },
  avatarInitials: {
    ...typography.headline,
    color: colors.primaryDeep,
    fontWeight: '700',
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  identityName: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  identityMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.sm,
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
