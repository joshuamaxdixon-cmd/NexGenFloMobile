import { StyleSheet } from 'react-native';

import { colors } from './colors';

export const typography = StyleSheet.create({
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.primaryDeep,
  },
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: colors.textPrimary,
  },
  headline: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metric: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
