import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { InfoCard } from '../components/InfoCard';
import { InputField } from '../components/InputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import type { PatientPortalPatient } from '../services/patientPortal';
import { spacing, typography, colors } from '../theme';

type Props = {
  busyAction?: string | null;
  message?: string | null;
  patient: PatientPortalPatient;
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
};

export function PatientPortalProfileScreen({
  busyAction,
  message,
  patient,
  onBack,
  onSave,
  onUploadPhoto,
}: Props) {
  const [phone, setPhone] = useState(patient.phone);
  const [email, setEmail] = useState(patient.email);
  const [addressLine1, setAddressLine1] = useState(patient.addressLine1);
  const [addressLine2, setAddressLine2] = useState(patient.addressLine2);
  const [city, setCity] = useState(patient.city);
  const [stateValue, setStateValue] = useState(patient.state);
  const [zipCode, setZipCode] = useState(patient.zipCode);

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
      <InfoCard subtitle="Update the contact details used for your patient portal." title="Edit Profile">
        <InputField label="Phone" onChangeText={setPhone} value={phone} />
        <InputField
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          value={email}
        />
        <InputField label="Address line 1" onChangeText={setAddressLine1} value={addressLine1} />
        <InputField label="Address line 2" onChangeText={setAddressLine2} optional value={addressLine2} />
        <InputField label="City" onChangeText={setCity} value={city} />
        <InputField label="State" onChangeText={setStateValue} value={stateValue} />
        <InputField label="ZIP code" onChangeText={setZipCode} value={zipCode} />

        <SecondaryButton
          loading={busyAction === 'photo'}
          onPress={() => void pickPhoto()}
          style={styles.photoButton}
          title="Add / Change Profile Picture"
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </InfoCard>

      <View style={styles.actions}>
        <SecondaryButton onPress={onBack} style={styles.action} title="Back" />
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
          style={styles.action}
          title="Save Profile"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
  photoButton: {
    marginTop: spacing.sm,
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
