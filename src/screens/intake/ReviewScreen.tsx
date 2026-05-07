import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { InfoCard } from '../../components/InfoCard';
import {
  buildPastMedicalHistoryEntries,
  buildMedicalInfoImmunizationEntries,
  formatMedicationAllergySummary,
  getReviewReadiness,
  type IntakeFormData,
} from '../../services';
import { colors, spacing, typography } from '../../theme';

type ReviewSection = {
  title: string;
  items: [string, string][];
};

type ReviewScreenProps = {
  form: IntakeFormData;
  hasGovernmentIdUpload: boolean;
  hasInsuranceUpload: boolean;
  onEditStep?: (
    step: 'basicInfo' | 'documents' | 'pastMedicalHistory' | 'symptoms',
  ) => void;
  onToggleReviewConfirmed: () => void;
  reviewConfirmed: boolean;
};

function valueOrFallback(value: string) {
  return value.trim().length > 0 ? value : 'Not provided';
}

function formatGender(value: string) {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === 'male' ||
    normalized === 'female' ||
    normalized === 'other'
  ) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return '';
}

function formatName(firstName: string, lastName: string) {
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName.length > 0 ? fullName : 'Not provided';
}

function formatSelectionList(values: string[]) {
  if (values.length === 0) {
    return 'Not provided';
  }

  const realValues = values.filter(
    (value) =>
      value !== 'None known' &&
      value !== 'None of the above' &&
      value !== 'Unknown / Unsure' &&
      value !== 'Unsure' &&
      value !== 'Unsure of immunization history',
  );

  if (realValues.length > 0) {
    return realValues.join(', ');
  }

  if (
    values.some((value) =>
      ['Unknown / Unsure', 'Unsure', 'Unsure of immunization history'].includes(value),
    )
  ) {
    return 'Unknown';
  }

  return 'None';
}

function formatHeight(heightFt: string, heightIn: string) {
  const feet = heightFt.trim();
  const inches = heightIn.trim();

  if (!feet && !inches) {
    return 'Not provided';
  }

  if (!feet) {
    return `${inches} in`;
  }

  if (!inches) {
    return `${feet} ft`;
  }

  return `${feet} ft ${inches} in`;
}

function buildPatientInfoItems(form: IntakeFormData): [string, string][] {
  const items: [string, string][] = [
    ['Full name', formatName(form.firstName, form.lastName)],
    ['Date of birth', valueOrFallback(form.dateOfBirth)],
  ];

  if (form.heightFt.trim() || form.heightIn.trim()) {
    items.push(['Height', formatHeight(form.heightFt, form.heightIn)]);
  }
  if (form.weightLb.trim()) {
    items.push(['Weight', `${form.weightLb} lb`]);
  }

  items.push(['Sex', valueOrFallback(formatGender(form.gender))]);
  items.push(['Phone number', valueOrFallback(form.phoneNumber)]);

  if (form.email.trim()) {
    items.push(['Email', form.email]);
  }

  const hasEmergencyContact =
    form.emergencyContactName.trim().length > 0 ||
    form.emergencyContactPhone.trim().length > 0;
  if (hasEmergencyContact) {
    const parts = [
      form.emergencyContactName.trim(),
      form.emergencyContactPhone.trim(),
    ].filter(Boolean);
    items.push(['Emergency contact', parts.join(' · ')]);
  }

  return items;
}

function buildAllergyItems(form: IntakeFormData): [string, string][] {
  const items: [string, string][] = [
    [
      'Medication Allergies',
      formatMedicationAllergySummary(form, 'Not provided')
        .replace('Unsure', 'Unknown')
        .replace('None known', 'None'),
    ],
  ];

  const otherGroups: [string, string][] = [];
  if (form.allergyMaterialSelections.length > 0) {
    otherGroups.push(['Material / Contact', formatSelectionList(form.allergyMaterialSelections)]);
  }
  if (form.allergyFoodSelections.length > 0) {
    otherGroups.push(['Food Allergies', formatSelectionList(form.allergyFoodSelections)]);
  }
  if (form.allergyEnvironmentalSelections.length > 0) {
    otherGroups.push(['Environmental', formatSelectionList(form.allergyEnvironmentalSelections)]);
  }

  if (otherGroups.length > 0) {
    items.push(...otherGroups);
  } else {
    items.push(['Other allergies', 'Not provided']);
  }

  return items;
}

function buildPastHistoryItems(
  pastMedicalHistory: ReturnType<typeof buildPastMedicalHistoryEntries>,
): [string, string][] {
  const items: [string, string][] = [];

  if (pastMedicalHistory.chronic.length > 0) {
    items.push(['Chronic conditions', formatSelectionList(pastMedicalHistory.chronic)]);
  }
  if (pastMedicalHistory.surgical.length > 0) {
    items.push(['Surgical history', formatSelectionList(pastMedicalHistory.surgical)]);
  }
  if (pastMedicalHistory.otherRelevant.length > 0) {
    items.push(['Other relevant history', formatSelectionList(pastMedicalHistory.otherRelevant)]);
  }

  if (items.length === 0) {
    items.push(['', 'Not provided']);
  }

  return items;
}

function buildImmunizationItems(
  form: IntakeFormData,
  immunizations: string[],
): [string, string][] {
  if (immunizations.length === 0) {
    return [['', 'Not provided']];
  }

  const items: [string, string][] = [];

  if (form.immunizationCoreSelections.length > 0) {
    items.push(['Core Vaccines', formatSelectionList(form.immunizationCoreSelections)]);
  }
  if (form.immunizationRoutineSelections.length > 0) {
    items.push(['Routine Adult Vaccines', formatSelectionList(form.immunizationRoutineSelections)]);
  }
  if (form.immunizationTravelSelections.length > 0) {
    items.push(['Travel / Risk-Based', formatSelectionList(form.immunizationTravelSelections)]);
  }
  if (form.immunizationUnknownSelections.length > 0) {
    items.push(['Unknown / Unsure', formatSelectionList(form.immunizationUnknownSelections)]);
  }

  return items;
}

function buildDocumentItems(
  form: IntakeFormData,
  hasGovernmentIdUpload: boolean,
  hasInsuranceUpload: boolean,
): [string, string][] {
  const items: [string, string][] = [
    ['Photo ID', hasGovernmentIdUpload ? 'On file' : 'Not uploaded'],
    ['Insurance Card', hasInsuranceUpload ? 'On file' : 'Not uploaded'],
  ];

  const hasInsuranceDetails =
    form.insuranceProvider.trim().length > 0 ||
    form.memberId.trim().length > 0 ||
    form.groupNumber.trim().length > 0 ||
    form.subscriberName.trim().length > 0;

  if (hasInsuranceDetails) {
    if (form.insuranceProvider.trim()) {
      items.push(['Insurance provider', form.insuranceProvider]);
    }
    if (form.memberId.trim()) {
      items.push(['Member ID', form.memberId]);
    }
    if (form.groupNumber.trim()) {
      items.push(['Group number', form.groupNumber]);
    }
    if (form.subscriberName.trim()) {
      items.push(['Subscriber name', form.subscriberName]);
    }
  } else {
    items.push(['Insurance details', 'Not provided']);
  }

  return items;
}

export function ReviewScreen({
  form,
  hasGovernmentIdUpload,
  hasInsuranceUpload,
  onToggleReviewConfirmed,
  reviewConfirmed,
}: ReviewScreenProps) {
  const reviewReadiness = getReviewReadiness({
    backendDraftStatus: 'synced',
    form,
    hasGovernmentIdUpload,
    hasInsuranceUpload,
  });
  const pastMedicalHistory = buildPastMedicalHistoryEntries(form);
  const immunizations = buildMedicalInfoImmunizationEntries(form);

  const sections: ReviewSection[] = [
    {
      title: 'Patient Info',
      items: buildPatientInfoItems(form),
    },
    {
      title: 'Allergies',
      items: buildAllergyItems(form),
    },
    {
      title: 'Medications',
      items: [['Current Medications', valueOrFallback(form.medications)]],
    },
    {
      title: 'Past Medical History',
      items: buildPastHistoryItems(pastMedicalHistory),
    },
    {
      title: 'Immunizations',
      items: buildImmunizationItems(form, immunizations),
    },
    {
      title: 'Visit Details',
      items: [
        ['Reason for visit', valueOrFallback(form.chiefConcern)],
        ['Duration', valueOrFallback(form.symptomDuration)],
        ['Severity', valueOrFallback(form.painLevel)],
        ['Symptom notes', valueOrFallback(form.symptomNotes)],
      ],
    },
    {
      title: 'Documents / Insurance',
      items: buildDocumentItems(form, hasGovernmentIdUpload, hasInsuranceUpload),
    },
  ];

  return (
    <View>
      <InfoCard>
        {reviewReadiness.blockers.length > 0 ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>Update before submitting</Text>
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
            </View>
            <View style={styles.summaryList}>
              {section.items.map(([label, value]) => (
                <View key={label || value} style={styles.summaryRow}>
                  {label ? <Text style={styles.label}>{label}</Text> : null}
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
            I confirm this check-in information is accurate.
          </Text>
        </Pressable>
        <Text style={styles.confirmationHelp}>
          This information will be shared with clinic staff for today&apos;s visit.
        </Text>
        {!reviewReadiness.isReady ? (
          <Text style={styles.checkboxHint}>
            Required items above need to be completed before you submit.
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
  confirmationHelp: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  checkboxHint: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
});
