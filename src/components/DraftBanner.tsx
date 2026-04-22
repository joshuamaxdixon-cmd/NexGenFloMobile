import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

type DraftBannerProps = {
  title: string;
  message: string;
  badgeLabel?: string;
  style?: StyleProp<ViewStyle>;
  tone?: 'info' | 'success' | 'warning';
};

export function DraftBanner({
  title,
  message,
  badgeLabel,
  style,
  tone = 'info',
}: DraftBannerProps) {
  return (
    <View
      style={[
        styles.banner,
        tone === 'success'
          ? styles.successBanner
          : tone === 'warning'
            ? styles.warningBanner
            : styles.infoBanner,
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {badgeLabel ? (
          <View
            style={[
              styles.badge,
              tone === 'success'
                ? styles.successBadge
                : tone === 'warning'
                  ? styles.warningBadge
                  : styles.infoBadge,
            ]}
          >
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.md,
  },
  infoBanner: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.divider,
  },
  successBanner: {
    backgroundColor: colors.accentMint,
    borderColor: colors.divider,
  },
  warningBanner: {
    backgroundColor: colors.accentGold,
    borderColor: colors.warning,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.label,
    color: colors.textPrimary,
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  infoBadge: {
    backgroundColor: colors.surface,
  },
  successBadge: {
    backgroundColor: colors.surface,
  },
  warningBadge: {
    backgroundColor: colors.surface,
  },
  badgeText: {
    ...typography.caption,
    color: colors.primaryDeep,
    fontWeight: '700',
  },
});
