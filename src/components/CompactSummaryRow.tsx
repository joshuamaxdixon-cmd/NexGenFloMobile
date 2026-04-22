import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '../theme';

type CompactSummaryRowProps = {
  title: string;
  summary: string;
  onPress: () => void;
  errorText?: string;
};

export function CompactSummaryRow({
  title,
  summary,
  onPress,
  errorText,
}: CompactSummaryRowProps) {
  const displaySummary = errorText?.trim() ? errorText : summary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed ? styles.rowPressed : null,
      ]}
    >
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text
          style={[
            styles.summary,
            errorText?.trim() ? styles.summaryError : null,
          ]}
        >
          {displaySummary}
        </Text>
      </View>
      <Ionicons
        color={errorText?.trim() ? colors.error : colors.textTertiary}
        name="chevron-forward-outline"
        size={20}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    opacity: 0.8,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.label,
    color: colors.textPrimary,
  },
  summary: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryError: {
    color: colors.error,
  },
});
