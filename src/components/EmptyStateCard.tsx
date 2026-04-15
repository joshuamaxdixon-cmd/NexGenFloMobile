import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { InfoCard } from './InfoCard';
import { colors, spacing, typography } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type EmptyStateCardProps = {
  icon: IconName;
  message: string;
  title: string;
};

export function EmptyStateCard({
  icon,
  message,
  title,
}: EmptyStateCardProps) {
  return (
    <InfoCard>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons color={colors.primaryDeep} name={icon} size={28} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.sectionTitle,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
});
