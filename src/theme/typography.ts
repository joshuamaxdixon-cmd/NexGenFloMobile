import { StyleSheet } from 'react-native';

import { colors } from './colors';

export const typography = StyleSheet.create({
  eyebrow: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.primaryDeep,
  },
  display: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.textPrimary,
  },
  headline: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  title: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bodyLarge: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    color: colors.textTertiary,
  },
  button: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  metric: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
