import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../theme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

type IntakeActionBarProps = {
  primaryTitle: string;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  backTitle?: string;
  onBackPress?: () => void;
  backDisabled?: boolean;
  tertiaryTitle?: string;
  onTertiaryPress?: () => void;
  tertiaryDisabled?: boolean;
};

export function IntakeActionBar({
  primaryTitle,
  onPrimaryPress,
  primaryDisabled = false,
  primaryLoading = false,
  backTitle = 'Back',
  onBackPress,
  backDisabled = false,
  tertiaryTitle,
  onTertiaryPress,
  tertiaryDisabled = false,
}: IntakeActionBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.shell, { paddingBottom: spacing.lg + insets.bottom }]}>
      <View style={styles.row}>
        {onBackPress ? (
          <SecondaryButton
            disabled={backDisabled}
            onPress={onBackPress}
            style={styles.backButton}
            title={backTitle}
          />
        ) : (
          <View style={styles.singleSpacer} />
        )}
        <PrimaryButton
          disabled={primaryDisabled}
          loading={primaryLoading}
          onPress={onPrimaryPress}
          style={onBackPress ? styles.primaryButton : styles.primaryButtonFull}
          title={primaryTitle}
        />
      </View>
      {tertiaryTitle && onTertiaryPress ? (
        <Pressable
          accessibilityRole="button"
          disabled={tertiaryDisabled}
          onPress={onTertiaryPress}
          style={({ pressed }) => [
            styles.tertiaryButton,
            tertiaryDisabled ? styles.tertiaryButtonDisabled : null,
            pressed && !tertiaryDisabled ? styles.tertiaryButtonPressed : null,
          ]}
        >
          <Text style={styles.tertiaryLabel}>{tertiaryTitle}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.background,
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingBottom: spacing.lg,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
  },
  backButton: {
    flex: 1,
  },
  primaryButton: {
    flex: 1,
  },
  primaryButtonFull: {
    flex: 1,
    width: '100%',
  },
  singleSpacer: {
    display: 'none',
  },
  tertiaryButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tertiaryButtonPressed: {
    opacity: 0.72,
  },
  tertiaryButtonDisabled: {
    opacity: 0.4,
  },
  tertiaryLabel: {
    ...typography.body,
    color: colors.primaryDeep,
    fontWeight: '500',
  },
});
