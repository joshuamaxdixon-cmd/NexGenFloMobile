import { useState } from 'react';
import type { TextInputProps } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

type InputFieldProps = Omit<
  TextInputProps,
  'style' | 'value' | 'onChangeText'
> & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  errorText?: string;
  helperText?: string;
  optional?: boolean;
};

export function InputField({
  label,
  value,
  onChangeText,
  errorText,
  helperText,
  optional = false,
  multiline = false,
  ...rest
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={typography.label}>{label}</Text>
        {optional ? <Text style={styles.optional}>Optional</Text> : null}
      </View>
      <TextInput
        multiline={multiline}
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          isFocused && styles.inputFocused,
          errorText ? styles.inputError : null,
        ]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
        {...rest}
      />
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      {!errorText && helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  optional: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  multilineInput: {
    minHeight: 112,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.surface,
  },
  helperText: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.error,
  },
});
