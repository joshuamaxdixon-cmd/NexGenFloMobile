import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type ActionCardProps = {
  title: string;
  subtitle: string;
  icon: IconName;
  accentColor: string;
  onPress: () => void;
};

export function ActionCard({
  title,
  subtitle,
  icon,
  accentColor,
  onPress,
}: ActionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accentColor }]}>
        <Ionicons color={colors.primaryDeep} name={icon} size={24} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.footerRow}>
        <Text style={styles.linkLabel}>Open flow</Text>
        <Ionicons color={colors.primaryDeep} name="arrow-forward" size={18} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 188,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.sectionTitle,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
  },
  footerRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
  },
  linkLabel: {
    ...typography.caption,
    color: colors.primaryDeep,
    fontWeight: '700',
  },
});
