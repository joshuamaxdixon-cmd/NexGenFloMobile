import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { JanetAvatar } from './JanetAvatar';
import { colors, spacing, typography } from '../theme';

type JanetHelperCardProps = {
  actionLabel: string;
  avatarSize?: 'sm' | 'md' | 'lg';
  statusLabel?: string | null;
  style?: StyleProp<ViewStyle>;
  subtitle: string;
  title: string;
  onPress: () => void;
};

export function JanetHelperCard({
  actionLabel,
  avatarSize = 'md',
  statusLabel,
  style,
  subtitle,
  title,
  onPress,
}: JanetHelperCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed ? styles.cardPressed : null,
        style,
      ]}
    >
      <JanetAvatar size={avatarSize} />
      <View style={styles.copy}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          {statusLabel ? (
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.actionRow}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <Ionicons
            color={colors.primaryDeep}
            name="chevron-forward-outline"
            size={18}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionLabel: {
    ...typography.label,
    color: colors.primaryDeep,
    fontWeight: '700',
  },
  actionRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xxs,
    marginTop: spacing.sm,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: '100%',
  },
  cardPressed: {
    opacity: 0.82,
  },
  copy: {
    flex: 1,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  statusPill: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusText: {
    ...typography.caption,
    color: colors.primaryDeep,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    flex: 1,
  },
});
