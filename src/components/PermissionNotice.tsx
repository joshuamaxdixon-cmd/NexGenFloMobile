import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '../theme';

type PermissionNoticeProps = {
  message: string;
  title: string;
};

export function PermissionNotice({
  message,
  title,
}: PermissionNoticeProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons color={colors.warning} name="alert-circle-outline" size={22} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accentGold,
    backgroundColor: '#FFF9EC',
    padding: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  copy: {
    flex: 1,
  },
  title: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
