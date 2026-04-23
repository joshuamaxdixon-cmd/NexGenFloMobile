import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../ScreenContainer';
import { colors, spacing, typography } from '../../theme';

type PortalScreenLayoutProps = {
  children: ReactNode;
  subtitle: string;
  title: string;
  onBack?: () => void;
  scroll?: boolean;
};

export function PortalScreenLayout({
  children,
  subtitle,
  title,
  onBack,
  scroll = true,
}: PortalScreenLayoutProps) {
  return (
    <ScreenContainer contentContainerStyle={styles.content} scroll={scroll}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.backButtonPressed : null,
            ]}
          >
            <Ionicons
              color={colors.primaryDeep}
              name="chevron-back-outline"
              size={18}
            />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        ) : null}
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerCopy: {
    gap: spacing.xs,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.divider,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backButtonPressed: {
    opacity: 0.82,
  },
  backButtonText: {
    ...typography.label,
    color: colors.primaryDeep,
  },
});
