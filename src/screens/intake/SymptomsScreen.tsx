import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import { VoiceTriggerButton } from '../../components/VoiceTriggerButton';
import { colors, spacing, typography } from '../../theme';
import type { IntakeStepComponentProps } from './types';

const genderOptions = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
] as const;

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
        size={22}
      />
    </Pressable>
  );
}

export function SymptomsScreen({
  fieldErrors,
  form,
  onChange,
  voice,
}: IntakeStepComponentProps) {
  const allergiesVoice = voice?.bindField('allergies');
  const medicationsVoice = voice?.bindField('medications');
  const medicalConditionsVoice = voice?.bindField('medicalConditions');
  const pharmacyVoice = voice?.bindField('pharmacy');
  const lastDoseVoice = voice?.bindField('lastDose');
  const allergyReactionVoice = voice?.bindField('allergyReaction');
  const allergyNotesVoice = voice?.bindField('allergyNotes');
  const genderVoice = voice?.bindField('gender');
  const heightVoice = voice?.bindField('heightFt');
  const weightVoice = voice?.bindField('weightLb');
  const chiefConcernVoice = voice?.bindField('chiefConcern');
  const symptomDurationVoice = voice?.bindField('symptomDuration');
  const painLevelVoice = voice?.bindField('painLevel');
  const symptomNotesVoice = voice?.bindField('symptomNotes');

  return (
    <View>
      <InfoCard>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          <InputField
            errorText={fieldErrors?.allergies}
            footer={allergiesVoice?.footer}
            label="Allergies"
            multiline
            onChangeText={(value) => onChange('allergies', value)}
            onVoicePress={allergiesVoice?.onVoicePress}
            optional
            placeholder="Penicillin, peanuts, latex"
            value={form.allergies}
            voiceState={allergiesVoice?.state}
          />
          <InputField
            errorText={fieldErrors?.allergyReaction}
            footer={allergyReactionVoice?.footer}
            label="Reaction details"
            onChangeText={(value) => onChange('allergyReaction', value)}
            onVoicePress={allergyReactionVoice?.onVoicePress}
            optional
            placeholder="Rash, swelling, shortness of breath"
            value={form.allergyReaction}
            voiceState={allergyReactionVoice?.state}
          />
          <InputField
            errorText={fieldErrors?.allergyNotes}
            footer={allergyNotesVoice?.footer}
            label="Safety notes"
            multiline
            onChangeText={(value) => onChange('allergyNotes', value)}
            onVoicePress={allergyNotesVoice?.onVoicePress}
            optional
            placeholder="Carries EpiPen, prior severe reaction"
            value={form.allergyNotes}
            voiceState={allergyNotesVoice?.state}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medications</Text>
          <InputField
            errorText={fieldErrors?.medications}
            footer={medicationsVoice?.footer}
            label="Medications"
            multiline
            onChangeText={(value) => onChange('medications', value)}
            onVoicePress={medicationsVoice?.onVoicePress}
            optional
            placeholder="Lisinopril 10 mg, Albuterol inhaler"
            value={form.medications}
            voiceState={medicationsVoice?.state}
          />
          <InputField
            errorText={fieldErrors?.pharmacy}
            footer={pharmacyVoice?.footer}
            label="Preferred pharmacy"
            onChangeText={(value) => onChange('pharmacy', value)}
            onVoicePress={pharmacyVoice?.onVoicePress}
            optional
            placeholder="CVS, Main Street"
            value={form.pharmacy}
            voiceState={pharmacyVoice?.state}
          />
          <InputField
            errorText={fieldErrors?.lastDose}
            footer={lastDoseVoice?.footer}
            label="Last dose"
            onChangeText={(value) => onChange('lastDose', value)}
            onVoicePress={lastDoseVoice?.onVoicePress}
            optional
            placeholder="Today at 8:00 AM"
            value={form.lastDose}
            voiceState={lastDoseVoice?.state}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conditions / history</Text>
          <InputField
            errorText={fieldErrors?.medicalConditions}
            footer={medicalConditionsVoice?.footer}
            label="Conditions or history"
            multiline
            onChangeText={(value) => onChange('medicalConditions', value)}
            onVoicePress={medicalConditionsVoice?.onVoicePress}
            optional
            placeholder="Asthma, diabetes, recent hospitalization"
            value={form.medicalConditions}
            voiceState={medicalConditionsVoice?.state}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Visit details</Text>
            <VoiceTriggerButton
              onPress={genderVoice?.onVoicePress}
              state={genderVoice?.state}
            />
          </View>
          <View style={styles.choiceGroup}>
            {genderOptions.map((option) => (
              <SelectionCard
                key={option.value}
                label={option.label}
                onPress={() =>
                  onChange('gender', form.gender === option.value ? '' : option.value)
                }
                selected={form.gender === option.value}
              />
            ))}
          </View>
          {fieldErrors?.gender ? (
            <Text style={styles.errorText}>{fieldErrors.gender}</Text>
          ) : null}
          {genderVoice?.footer}
          <InputField
            errorText={fieldErrors?.heightFt}
            footer={heightVoice?.footer}
            keyboardType="number-pad"
            label="Height (ft)"
            onChangeText={(value) => onChange('heightFt', value)}
            onVoicePress={heightVoice?.onVoicePress}
            optional
            placeholder="5"
            value={form.heightFt}
            voiceState={heightVoice?.state}
          />
          <InputField
            errorText={fieldErrors?.heightIn}
            keyboardType="number-pad"
            label="Height (in)"
            onChangeText={(value) => onChange('heightIn', value)}
            optional
            placeholder="6"
            value={form.heightIn}
          />
          <InputField
            errorText={fieldErrors?.weightLb}
            footer={weightVoice?.footer}
            keyboardType="decimal-pad"
            label="Weight (lb)"
            onChangeText={(value) => onChange('weightLb', value)}
            onVoicePress={weightVoice?.onVoicePress}
            optional
            placeholder="140"
            value={form.weightLb}
            voiceState={weightVoice?.state}
          />
          <InputField
            errorText={fieldErrors?.chiefConcern}
            footer={chiefConcernVoice?.footer}
            label="Reason for visit"
            multiline
            onChangeText={(value) => onChange('chiefConcern', value)}
            onVoicePress={chiefConcernVoice?.onVoicePress}
            placeholder="Describe the main reason for today’s visit"
            value={form.chiefConcern}
            voiceState={chiefConcernVoice?.state}
          />
          <InputField
            errorText={fieldErrors?.symptomDuration}
            footer={symptomDurationVoice?.footer}
            label="Duration"
            onChangeText={(value) => onChange('symptomDuration', value)}
            onVoicePress={symptomDurationVoice?.onVoicePress}
            placeholder="2 days"
            value={form.symptomDuration}
            voiceState={symptomDurationVoice?.state}
          />
          <InputField
            footer={painLevelVoice?.footer}
            label="Severity"
            onChangeText={(value) => onChange('painLevel', value)}
            onVoicePress={painLevelVoice?.onVoicePress}
            optional
            placeholder="6/10"
            value={form.painLevel}
            voiceState={painLevelVoice?.state}
          />
          <InputField
            footer={symptomNotesVoice?.footer}
            label="Symptom notes"
            multiline
            onChangeText={(value) => onChange('symptomNotes', value)}
            onVoicePress={symptomNotesVoice?.onVoicePress}
            optional
            placeholder="Worse while walking upstairs"
            value={form.symptomNotes}
            voiceState={symptomNotesVoice?.state}
          />
        </View>
      </InfoCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    marginTop: spacing.xl,
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
  choiceGroup: {
    gap: spacing.sm,
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
