import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '../../theme';

type PortalAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
};

type Props = {
  actions: PortalAction[];
};

export function PortalActionList({ actions }: Props) {
  return (
    <View style={styles.list}>
      {actions.map((action) => (
        <Pressable
          accessibilityRole="button"
          key={action.label}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.row,
            pressed ? styles.rowPressed : null,
          ]}
        >
          <View
            style={[
              styles.iconShell,
              action.tone === 'danger' ? styles.iconShellDanger : null,
            ]}
          >
            <Ionicons
              color={action.tone === 'danger' ? colors.error : colors.primaryDeep}
              name={action.icon}
              size={18}
            />
          </View>
          <Text
            style={[
              styles.label,
              action.tone === 'danger' ? styles.labelDanger : null,
            ]}
          >
            {action.label}
          </Text>
          <Ionicons
            color={colors.textTertiary}
            name="chevron-forward-outline"
            size={18}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  iconShell: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  iconShellDanger: {
    backgroundColor: '#F8E6E6',
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  labelDanger: {
    color: colors.error,
  },
});
