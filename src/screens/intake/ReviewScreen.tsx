import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { InfoCard } from '../../components/InfoCard';
import { SecondaryButton } from '../../components/SecondaryButton';
import {
  getReviewReadiness,
  type IntakeFormData,
} from '../../services';
import { colors, spacing, typography } from '../../theme';

type ReviewScreenProps = {
  form: IntakeFormData;
  hasGovernmentIdUpload: boolean;
  hasInsuranceUpload: boolean;
  onEditStep?: (step: 'basicInfo' | 'documents' | 'symptoms') => void;
  onToggleReviewConfirmed: () => void;
  reviewConfirmed: boolean;
};

function valueOrFallback(value: string) {
  return value.trim().length > 0 ? value : 'Not provided yet';
}

function formatGender(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'male' || normalized === 'female') {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return '';
}

function formatName(firstName: string, lastName: string) {
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName.length > 0 ? fullName : 'Not provided yet';
}

function formatHeight(heightFt: string, heightIn: string) {
  const feet = heightFt.trim();
  const inches = heightIn.trim();

  if (!feet && !inches) {
    return 'Not provided yet';
  }

  if (!feet) {
    return `${inches} in`;
  }

  if (!inches) {
    return `${feet} ft`;
  }

  return `${feet} ft ${inches} in`;
}

export function ReviewScreen({
  form,
  hasGovernmentIdUpload,
  hasInsuranceUpload,
  onEditStep,
  onToggleReviewConfirmed,
  reviewConfirmed,
}: ReviewScreenProps) {
  const reviewReadiness = getReviewReadiness({
    backendDraftStatus: 'synced',
    form,
    hasGovernmentIdUpload,
    hasInsuranceUpload,
  });

  const sections = [
    {
      title: 'Patient Info',
      actionLabel: 'Edit',
      actionStep: 'basicInfo' as const,
      items: [
        ['Patient type', valueOrFallback(form.patientType)],
        ['Name', formatName(form.firstName, form.lastName)],
        ['Date of birth', valueOrFallback(form.dateOfBirth)],
        ['Phone', valueOrFallback(form.phoneNumber)],
        ['Email', valueOrFallback(form.email)],
        ['Emergency contact', valueOrFallback(form.emergencyContactName)],
        ['Emergency phone', valueOrFallback(form.emergencyContactPhone)],
      ],
    },
    {
      title: 'Medical Info',
      actionLabel: 'Edit',
      actionStep: 'symptoms' as const,
      items: [
        ['Gender', valueOrFallback(formatGender(form.gender))],
        ['Height', formatHeight(form.heightFt, form.heightIn)],
        ['Weight', valueOrFallback(form.weightLb ? `${form.weightLb} lb` : '')],
        ['Reason for visit', valueOrFallback(form.chiefConcern)],
        ['Duration', valueOrFallback(form.symptomDuration)],
        ['Severity', valueOrFallback(form.painLevel)],
        ['Symptom notes', valueOrFallback(form.symptomNotes)],
        ['Allergies', valueOrFallback(form.allergies)],
        ['Reaction details', valueOrFallback(form.allergyReaction)],
        ['Safety notes', valueOrFallback(form.allergyNotes)],
        ['Medications', valueOrFallback(form.medications)],
        ['Preferred pharmacy', valueOrFallback(form.pharmacy)],
        ['Last dose', valueOrFallback(form.lastDose)],
        ['Conditions / history', valueOrFallback(form.medicalConditions)],
      ],
    },
    {
      title: 'Insurance Details',
      items: [
        ['Insurance card', hasInsuranceUpload ? 'On file' : 'Add on the next step'],
        ['Photo ID', hasGovernmentIdUpload ? 'On file' : 'Add on the next step'],
        ['Insurance provider', valueOrFallback(form.insuranceProvider)],
        ['Member ID', valueOrFallback(form.memberId)],
        ['Group number', valueOrFallback(form.groupNumber)],
        ['Subscriber', valueOrFallback(form.subscriberName)],
      ],
    },
  ] as const;

  return (
    <View>
      <InfoCard>
        {reviewReadiness.blockers.length > 0 ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>Update before continuing</Text>
            {reviewReadiness.blockers.map((blocker) => (
              <Text key={blocker} style={styles.noticeItem}>
                • {blocker}
              </Text>
            ))}
          </View>
        ) : null}

        {sections.map((section, index) => (
          <View
            key={section.title}
            style={[
              styles.summarySection,
              index > 0 ? styles.summarySectionSpaced : null,
            ]}
          >
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>{section.title}</Text>
              {'actionStep' in section ? (
                <SecondaryButton
                  onPress={() => onEditStep?.(section.actionStep)}
                  style={styles.editButton}
                  title={section.actionLabel}
                />
              ) : null}
            </View>
            <View style={styles.summaryList}>
              {section.items.map(([label, value]) => (
                <View key={label} style={styles.summaryRow}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.value}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: reviewConfirmed }}
          onPress={onToggleReviewConfirmed}
          style={[
            styles.checkboxRow,
            reviewConfirmed ? styles.checkboxRowChecked : null,
          ]}
        >
          <Ionicons
            color={reviewConfirmed ? colors.primaryDeep : colors.textTertiary}
            name={reviewConfirmed ? 'checkbox' : 'square-outline'}
            size={22}
          />
          <Text style={styles.checkboxLabel}>
            I confirm this information is ready for the final documents step.
          </Text>
        </Pressable>
        {!reviewReadiness.isReady ? (
          <Text style={styles.checkboxHint}>
            Required items above need to be completed before you continue.
          </Text>
        ) : null}
      </InfoCard>
    </View>
  );
}

const styles = StyleSheet.create({
  noticeBox: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.xs,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  noticeTitle: {
    ...typography.sectionTitle,
  },
  noticeItem: {
    ...typography.body,
    color: colors.textPrimary,
  },
  summarySection: {
    gap: spacing.md,
  },
  summarySectionSpaced: {
    marginTop: spacing.xl,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  summaryTitle: {
    ...typography.sectionTitle,
  },
  editButton: {
    minWidth: 88,
  },
  summaryList: {
    borderColor: colors.divider,
    borderTopWidth: 1,
  },
  summaryRow: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    gap: spacing.xxs,
    paddingVertical: spacing.md,
  },
  label: {
    ...typography.caption,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
  checkboxRow: {
    alignItems: 'flex-start',
    borderColor: colors.divider,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  checkboxRowChecked: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  checkboxHint: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
});
