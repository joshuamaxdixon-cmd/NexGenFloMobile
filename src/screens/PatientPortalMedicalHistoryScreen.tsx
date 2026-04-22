import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '../components/InfoCard';
import { InputField } from '../components/InputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
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
    <View style={styles.container}>
      <InfoCard
        subtitle="Keep your chart details current before today’s visit."
        title="Update Medical History"
      >
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
          label="Medical Conditions / History"
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
        <InputField
          label="Current visit reason"
          multiline
          onChangeText={(value) => update('currentVisitReason', value)}
          value={form.currentVisitReason}
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </InfoCard>

      <View style={styles.actions}>
        <SecondaryButton onPress={onBack} style={styles.action} title="Back" />
        <PrimaryButton
          loading={busyAction === 'medicalHistory'}
          onPress={() => onSave(form)}
          style={styles.action}
          title="Save Medical History"
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
  message: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
