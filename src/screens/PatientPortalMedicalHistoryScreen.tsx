import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '../components/InfoCard';
import { InputField } from '../components/InputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { PortalScreenLayout } from '../components/portal/PortalScreenLayout';
import type { PatientPortalMedicalHistory } from '../services/patientPortal';
import { colors, spacing, typography } from '../theme';

type Props = {
  busyAction?: string | null;
  history: PatientPortalMedicalHistory;
  message?: string | null;
  onBack: () => void;
  onSave: (payload: PatientPortalMedicalHistory) => void;
};

export function PatientPortalMedicalHistoryScreen({
  busyAction,
  history,
  message,
  onBack,
  onSave,
}: Props) {
  const [form, setForm] = useState(history);

  const update = <K extends keyof PatientPortalMedicalHistory>(
    key: K,
    value: PatientPortalMedicalHistory[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <PortalScreenLayout
      onBack={onBack}
      subtitle="Update the medical details tied to your portal profile."
      title="Medical History"
    >
      <View style={styles.content}>
        <InfoCard title="Current Medical Information">
          <View style={styles.form}>
            <InputField label="Sex" onChangeText={(value) => update('sex', value)} value={form.sex} />
            <InputField
              label="Emergency contact name"
              onChangeText={(value) => update('emergencyContactName', value)}
              value={form.emergencyContactName}
            />
            <InputField
              label="Emergency contact phone"
              onChangeText={(value) => update('emergencyContactPhone', value)}
              value={form.emergencyContactPhone}
            />
            <InputField
              label="Allergies"
              multiline
              onChangeText={(value) => update('allergies', value)}
              value={form.allergies}
            />
            <InputField
              label="Medications"
              multiline
              onChangeText={(value) => update('medications', value)}
              value={form.medications}
            />
            <InputField
              label="Medical conditions / history"
              multiline
              onChangeText={(value) => update('medicalConditions', value)}
              value={form.medicalConditions}
            />
            <InputField
              label="Surgeries"
              multiline
              onChangeText={(value) => update('surgeries', value)}
              value={form.surgeries}
            />
            <InputField
              label="Immunizations"
              multiline
              onChangeText={(value) => update('immunizations', value)}
              value={form.immunizations}
            />
          </View>
        </InfoCard>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <PrimaryButton
          loading={busyAction === 'medicalHistory'}
          onPress={() => onSave(form)}
          title="Save Medical History"
        />
      </View>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
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
