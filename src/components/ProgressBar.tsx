import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

type ProgressBarProps = {
  currentStep: number;
  totalSteps: number;
};

export function ProgressBar({
  currentStep,
  totalSteps,
}: ProgressBarProps) {
  const progress = totalSteps === 0 ? 0 : currentStep / totalSteps;

  return (
    <View style={styles.container}>
      <Text style={typography.eyebrow}>
        STEP {currentStep} OF {totalSteps}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primaryDeep,
  },
});
