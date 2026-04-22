import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme';
import type { IntakeInlineVoiceState } from '../screens/intake/types';

type VoiceTriggerButtonProps = {
  disabled?: boolean;
  onPress?: () => void;
  state?: IntakeInlineVoiceState;
};

function getVoiceIconName(state: IntakeInlineVoiceState) {
  switch (state) {
    case 'processing':
      return 'sync';
    case 'confirming':
      return 'checkmark-circle-outline';
    case 'error':
      return 'alert-circle-outline';
    default:
      return 'mic';
  }
}

export function VoiceTriggerButton({
  disabled = false,
  onPress,
  state = 'idle',
}: VoiceTriggerButtonProps) {
  const listening = state === 'listening';

  return (
    <Pressable
      accessibilityLabel="Use Janet voice input"
      accessibilityRole="button"
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        listening ? styles.buttonListening : null,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <Ionicons
        color={listening ? colors.surface : colors.primaryDeep}
        name={getVoiceIconName(state)}
        size={18}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.divider,
    borderRadius: 14,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonListening: {
    backgroundColor: colors.primaryDeep,
    borderColor: colors.primaryDeep,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
  },
});
