import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { InfoCard } from './InfoCard';
import { SecondaryButton } from './SecondaryButton';

type DevPreviewPanelProps = {
  onOpenBasicInfo: () => void;
  onOpenDocuments: () => void;
  onOpenMedicalInfo: () => void;
  onOpenPastMedicalHistory: () => void;
  onOpenReset: () => void;
  onOpenReview: () => void;
};

export function DevPreviewPanel({
  onOpenBasicInfo,
  onOpenDocuments,
  onOpenMedicalInfo,
  onOpenPastMedicalHistory,
  onOpenReset,
  onOpenReview,
}: DevPreviewPanelProps) {
  return (
    <InfoCard
      style={styles.card}
      subtitle="Development-only preview shortcuts for jumping straight to mobile intake screens with seeded sample data."
      title="UI Preview Mode"
    >
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Check-In Steps</Text>
        <View style={styles.actions}>
          <SecondaryButton
            onPress={onOpenBasicInfo}
            style={styles.button}
            title="Open Step 1"
          />
          <SecondaryButton
            onPress={onOpenMedicalInfo}
            style={styles.button}
            title="Open Step 2"
          />
          <SecondaryButton
            onPress={onOpenPastMedicalHistory}
            style={styles.button}
            title="Open Step 3"
          />
          <SecondaryButton
            onPress={onOpenDocuments}
            style={styles.button}
            title="Open Step 4"
          />
          <SecondaryButton
            onPress={onOpenReview}
            style={styles.button}
            title="Open Step 5"
          />
        </View>
      </View>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Other Tools</Text>
        <View style={styles.actions}>
          <SecondaryButton
            onPress={onOpenReset}
            style={styles.button}
            title="Reset Preview Draft"
          />
        </View>
      </View>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xl,
  },
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.sm,
  },
  button: {
    width: '100%',
  },
});
