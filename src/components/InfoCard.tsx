import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

type InfoCardProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
};

export function InfoCard({
  children,
  title,
  subtitle,
  style,
}: InfoCardProps) {
  return (
    <View style={[styles.card, style]}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title ? <Text style={typography.sectionTitle}>{title}</Text> : null}
          {subtitle ? <Text style={typography.body}>{subtitle}</Text> : null}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 5,
  },
  header: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
});
