import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { IntakeInlineVoiceState } from '../screens/intake/types';
import { colors, spacing, typography } from '../theme';

type InlineJanetPanelProps = {
  error?: string | null;
  onConfirm?: () => void;
  onEdit?: () => void;
  onRepeat?: () => void;
  onRetry?: () => void;
  prompt: string;
  state: IntakeInlineVoiceState;
  transcript?: string;
  warnings?: string[];
};

function ActionChip({
  onPress,
  primary = false,
  title,
}: {
  onPress?: () => void;
  primary?: boolean;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionChip,
        primary ? styles.actionChipPrimary : null,
        pressed && onPress ? styles.actionChipPressed : null,
      ]}
    >
      <Text
        style={[
          styles.actionChipText,
          primary ? styles.actionChipTextPrimary : null,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function InlineJanetPanel({
  error,
  onConfirm,
  onEdit,
  onRepeat,
  onRetry,
  prompt,
  state,
  transcript,
  warnings = [],
}: InlineJanetPanelProps) {
  const warningText = warnings[0];

  return (
    <View style={styles.panel}>
      {state === 'confirming' ? (
        <>
          <Text style={styles.kicker}>You said</Text>
          <Text style={styles.primaryText}>{transcript?.trim() || 'Waiting for confirmation'}</Text>
          {warningText ? <Text style={styles.supportText}>{warningText}</Text> : null}
          <View style={styles.actionRow}>
            <ActionChip onPress={onConfirm} primary title="Confirm" />
            <ActionChip onPress={onEdit} title="Edit" />
            {onRepeat ? <ActionChip onPress={onRepeat} title="Repeat" /> : null}
          </View>
        </>
      ) : state === 'error' ? (
        <>
          <Text style={styles.kicker}>Janet needs attention</Text>
          <Text style={styles.supportText}>{error || 'Voice input is unavailable right now.'}</Text>
          <View style={styles.actionRow}>
            {onRetry ? <ActionChip onPress={onRetry} primary title="Try again" /> : null}
            {onEdit ? <ActionChip onPress={onEdit} title="Edit" /> : null}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.kicker}>
            {state === 'processing' ? 'Janet is processing' : 'Janet is listening'}
          </Text>
          <Text style={styles.promptText}>{prompt}</Text>
          <Text style={styles.primaryText}>
            {transcript?.trim()
              ? transcript
              : state === 'processing'
                ? 'Finishing your answer…'
                : 'Speak naturally and pause when you are done.'}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.divider,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  kicker: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  promptText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  primaryText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  supportText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  actionChip: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actionChipPressed: {
    transform: [{ scale: 0.97 }],
  },
  actionChipPrimary: {
    backgroundColor: colors.primaryDeep,
    borderColor: colors.primaryDeep,
  },
  actionChipText: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: '700',
  },
  actionChipTextPrimary: {
    color: colors.surface,
  },
});
