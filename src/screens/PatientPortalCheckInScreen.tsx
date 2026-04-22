import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InfoCard } from '../components/InfoCard';
import { InputField } from '../components/InputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import type { PatientPortalVisit } from '../services/patientPortal';
import { colors, spacing, typography } from '../theme';

type Props = {
  busyAction?: string | null;
  message?: string | null;
  onBack: () => void;
  onSave: (payload: {
    reasonForVisit: string;
    symptomDuration: string;
    symptomSeverity: string;
  }) => void;
  visit: PatientPortalVisit | null;
};

export function PatientPortalCheckInScreen({
  busyAction,
  message,
  onBack,
  onSave,
  visit,
}: Props) {
  const [reasonForVisit, setReasonForVisit] = useState(visit?.reasonForVisit ?? '');
  const [symptomDuration, setSymptomDuration] = useState(visit?.symptomDuration ?? '');
  const [symptomSeverity, setSymptomSeverity] = useState(visit?.symptomSeverity ?? '');

  useEffect(() => {
    setReasonForVisit(visit?.reasonForVisit ?? '');
    setSymptomDuration(visit?.symptomDuration ?? '');
    setSymptomSeverity(visit?.symptomSeverity ?? '');
  }, [visit]);

  return (
    <View style={styles.container}>
      <InfoCard
        subtitle="Update the details for today’s visit."
        title="Continue Check-In"
      >
        <InputField
          label="Reason for visit"
          multiline
          onChangeText={setReasonForVisit}
          value={reasonForVisit}
        />
        <InputField
          label="Duration"
          onChangeText={setSymptomDuration}
          value={symptomDuration}
        />
        <InputField
          label="Severity"
          onChangeText={setSymptomSeverity}
          placeholder="mild, moderate, or severe"
          value={symptomSeverity}
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </InfoCard>

      <View style={styles.actions}>
        <SecondaryButton onPress={onBack} style={styles.action} title="Back" />
        <PrimaryButton
          loading={busyAction === 'checkIn'}
          onPress={() =>
            onSave({
              reasonForVisit,
              symptomDuration,
              symptomSeverity,
            })
          }
          style={styles.action}
          title="Save Check-In"
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
