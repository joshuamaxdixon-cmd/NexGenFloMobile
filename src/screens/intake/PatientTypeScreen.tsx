import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  patientHistoryOptions,
  patientTypeOptions,
} from '../../services';
import { VoiceTriggerButton } from '../../components/VoiceTriggerButton';
import { colors, spacing, typography } from '../../theme';
import type { IntakeStepComponentProps } from './types';

type VisitOwner = 'myself' | 'someone_else' | null;
type VisitHistory = 'new' | 'returning' | 'self_pay' | null;

function deriveSelections(patientType: string): {
  history: VisitHistory;
  owner: VisitOwner;
} {
  switch (patientType) {
    case 'myself':
      return { history: null, owner: 'myself' };
    case 'New patient':
      return { history: 'new', owner: 'myself' };
    case 'Returning patient':
      return { history: 'returning', owner: 'myself' };
    case 'Self pay':
      return { history: 'self_pay', owner: 'myself' };
    case 'Dependent / family member':
      return { history: null, owner: 'someone_else' };
    default:
      return { history: null, owner: null };
  }
}

function mapSelectionToPatientType(
  owner: VisitOwner,
  history: VisitHistory,
): string {
  if (owner === 'someone_else') {
    return 'Dependent / family member';
  }

  if (owner === 'myself') {
    if (history === 'returning') {
      return 'Returning patient';
    }
    if (history === 'self_pay') {
      return 'Self pay';
    }
    return 'New patient';
  }

  return '';
}

function SelectionCard({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        selected && styles.optionCardSelected,
        pressed && styles.optionCardPressed,
      ]}
    >
      <Text style={styles.optionTitle}>{label}</Text>
      <Ionicons
        color={selected ? colors.primaryDeep : colors.textTertiary}
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
      />
    </Pressable>
  );
}

export function PatientTypeScreen({
  fieldErrors,
  form,
  onChange,
  voice,
}: IntakeStepComponentProps) {
  const { history, owner } = deriveSelections(form.patientType);
  const patientTypeVoice = voice?.bindField('patientType');

  const handleOwnerSelect = (value: VisitOwner) => {
    if (value === 'someone_else') {
      onChange('patientType', 'Dependent / family member');
      return;
    }

    onChange(
      'patientType',
      history ? mapSelectionToPatientType('myself', history) : 'myself',
    );
  };

  const handleHistorySelect = (value: VisitHistory) => {
    onChange('patientType', mapSelectionToPatientType('myself', value));
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Who is this visit for?</Text>
          <VoiceTriggerButton
            onPress={patientTypeVoice?.onVoicePress}
            state={patientTypeVoice?.state}
          />
        </View>
        {patientTypeOptions.map((option) => (
          <SelectionCard
            key={option.value}
            label={option.label}
            onPress={() => handleOwnerSelect(option.value)}
            selected={owner === option.value}
          />
        ))}
        {patientTypeVoice?.footer}
      </View>

      {owner === 'myself' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visit type</Text>
          {patientHistoryOptions.map((option) => (
            <SelectionCard
              key={option.value}
              label={option.label}
              onPress={() => handleHistorySelect(option.value)}
              selected={history === option.value}
            />
          ))}
        </View>
      ) : null}

      {fieldErrors?.patientType ? (
        <Text style={styles.errorText}>{fieldErrors.patientType}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
  },
  optionCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  optionCardSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionCardPressed: {
    transform: [{ scale: 0.995 }],
  },
  optionTitle: {
    ...typography.sectionTitle,
    marginBottom: 0,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
});
