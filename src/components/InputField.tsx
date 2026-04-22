import { useState, type ReactNode } from 'react';
import type { TextInputProps } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { IntakeInlineVoiceState } from '../screens/intake/types';
import { colors, spacing, typography } from '../theme';
import { VoiceTriggerButton } from './VoiceTriggerButton';

type InputFieldProps = Omit<
  TextInputProps,
  'style' | 'value' | 'onChangeText'
> & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  errorText?: string;
  footer?: ReactNode;
  helperText?: string;
  onVoicePress?: () => void;
  optional?: boolean;
  voiceState?: IntakeInlineVoiceState;
};

export function InputField({
  label,
  value,
  onChangeText,
  errorText,
  footer,
  helperText,
  onVoicePress,
  optional = false,
  voiceState = 'idle',
  multiline = false,
  ...rest
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasVoiceTrigger = Boolean(onVoicePress);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={typography.label}>{label}</Text>
        {optional ? <Text style={styles.optional}>Optional</Text> : null}
      </View>
      <View
        style={[
          styles.inputShell,
          multiline && styles.inputShellMultiline,
          isFocused && styles.inputFocused,
          errorText ? styles.inputError : null,
        ]}
      >
        <TextInput
          multiline={multiline}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.input,
            multiline && styles.multilineInput,
            hasVoiceTrigger ? styles.inputWithVoice : null,
          ]}
          textAlignVertical={multiline ? 'top' : 'center'}
          value={value}
          {...rest}
        />
        {hasVoiceTrigger ? (
          <View style={[styles.voiceWrap, multiline ? styles.voiceWrapTop : null]}>
            <VoiceTriggerButton
              onPress={onVoicePress}
              state={voiceState}
            />
          </View>
        ) : null}
      </View>
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      {!errorText && helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
      {footer}
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
  inputShell: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
  },
  inputShellMultiline: {
    alignItems: 'flex-start',
    minHeight: 112,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 56,
  },
  multilineInput: {
    minHeight: 112,
  },
  inputWithVoice: {
    paddingRight: spacing.sm,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
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
  voiceWrap: {
    justifyContent: 'center',
  },
  voiceWrapTop: {
    marginTop: spacing.sm,
  },
});
