import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '../theme';

type JanetAssistantEntryProps = {
  onPress: () => void;
};

export function JanetAssistantEntry({
  onPress,
}: JanetAssistantEntryProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.iconWrap}>
        <Ionicons color={colors.primaryDeep} name="mic-outline" size={20} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Janet Assistant</Text>
        <Text style={styles.subtitle}>
          Continue this step with guided voice.
        </Text>
      </View>
      <Ionicons color={colors.textTertiary} name="chevron-forward-outline" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    width: '100%',
  },
  cardPressed: {
    opacity: 0.78,
  },
  copy: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.divider,
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
});
