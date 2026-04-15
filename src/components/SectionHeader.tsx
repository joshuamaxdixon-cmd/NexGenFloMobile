import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../theme';

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  titleVariant?: 'display' | 'title';
};

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  titleVariant = 'title',
}: SectionHeaderProps) {
  const centered = align === 'center';
  const titleStyle =
    titleVariant === 'display' ? typography.display : typography.title;

  return (
    <View style={[styles.container, centered && styles.centered]}>
      {eyebrow ? (
        <Text style={[typography.eyebrow, centered && styles.centerText]}>
          {eyebrow}
        </Text>
      ) : null}
      <Text style={[titleStyle, centered && styles.centerText]}>{title}</Text>
      {subtitle ? (
        <Text
          style={[
            titleVariant === 'display' ? typography.bodyLarge : typography.body,
            centered && styles.centerText,
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  centered: {
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
});
