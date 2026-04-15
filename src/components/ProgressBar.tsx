import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

type ProgressBarProps = {
  currentStep: number;
  totalSteps: number;
  title?: string;
};

export function ProgressBar({
  currentStep,
  totalSteps,
  title,
}: ProgressBarProps) {
  const progress = totalSteps === 0 ? 0 : currentStep / totalSteps;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={typography.eyebrow}>
          Step {currentStep} of {totalSteps}
        </Text>
        {title ? <Text style={styles.title}>{title}</Text> : null}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.caption,
    color: colors.primaryText,
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.backgroundAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
});
