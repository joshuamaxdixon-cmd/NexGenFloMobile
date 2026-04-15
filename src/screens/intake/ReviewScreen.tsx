import { StyleSheet, Text, View } from 'react-native';

import { DraftBanner } from '../../components/DraftBanner';
import { InfoCard } from '../../components/InfoCard';
import {
  formatDraftSyncStatus,
  formatLastSaved,
  getReviewReadiness,
  type BackendUploadEntryState,
  type DraftStoreState,
  type IntakeFormData,
} from '../../services';
import { colors, spacing, typography } from '../../theme';

type ReviewScreenProps = {
  confirmationCode: string | null;
  draftState: DraftStoreState;
  form: IntakeFormData;
  hasGovernmentIdUpload: boolean;
  hasInsuranceUpload: boolean;
  submitMessage: string | null;
  submitStatus: DraftStoreState['backend']['submit']['status'];
  voiceImportedAt: string | null;
};

function valueOrFallback(value: string) {
  return value.trim().length > 0 ? value : 'Not provided yet';
}

function formatName(firstName: string, lastName: string) {
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName.length > 0 ? fullName : 'Not provided yet';
}

function formatAttachmentStatus(
  hasLocalUpload: boolean,
  remoteStatus: BackendUploadEntryState['status'],
) {
  if (!hasLocalUpload) {
    return 'Not uploaded yet';
  }

  if (remoteStatus === 'uploaded') {
    return 'Uploaded to backend';
  }

  if (remoteStatus === 'uploading') {
    return 'Uploading to backend';
  }

  if (remoteStatus === 'error') {
    return 'Saved locally, upload retry needed';
  }

  return 'Saved to local draft';
}

export function ReviewScreen({
  confirmationCode,
  draftState,
  form,
  hasGovernmentIdUpload,
  hasInsuranceUpload,
  submitMessage,
  submitStatus,
  voiceImportedAt,
}: ReviewScreenProps) {
  const reviewReadiness = getReviewReadiness({
    backendDraftStatus: draftState.backend.draft.status,
    form,
    hasGovernmentIdUpload,
    hasInsuranceUpload,
  });
  const sections = [
    {
      title: 'Patient Snapshot',
      items: [
        ['Patient type', valueOrFallback(form.patientType)],
        ['Name', formatName(form.firstName, form.lastName)],
        ['Date of birth', valueOrFallback(form.dateOfBirth)],
        ['Phone', valueOrFallback(form.phoneNumber)],
        ['Email', valueOrFallback(form.email)],
      ],
    },
    {
      title: 'Symptoms',
      items: [
        ['Chief concern', valueOrFallback(form.chiefConcern)],
        ['Duration', valueOrFallback(form.symptomDuration)],
        ['Severity', valueOrFallback(form.painLevel)],
        ['Symptom notes', valueOrFallback(form.symptomNotes)],
      ],
    },
    {
      title: 'Clinical Details',
      items: [
        ['Medications', valueOrFallback(form.medications)],
        ['Preferred pharmacy', valueOrFallback(form.pharmacy)],
        ['Last dose', valueOrFallback(form.lastDose)],
        ['Allergies', valueOrFallback(form.allergies)],
        ['Reaction details', valueOrFallback(form.allergyReaction)],
        ['Allergy notes', valueOrFallback(form.allergyNotes)],
      ],
    },
    {
      title: 'Coverage',
      items: [
        ['Insurance provider', valueOrFallback(form.insuranceProvider)],
        ['Member ID', valueOrFallback(form.memberId)],
        ['Group number', valueOrFallback(form.groupNumber)],
        ['Subscriber', valueOrFallback(form.subscriberName)],
      ],
    },
  ] as const;
  const draftReferenceSummary = [
    draftState.backend.draft.draftId
      ? `Draft #${draftState.backend.draft.draftId}`
      : 'Local-only draft',
    draftState.backend.draft.patientId
      ? `Patient #${draftState.backend.draft.patientId}`
      : null,
    draftState.backend.draft.visitId
      ? `Visit #${draftState.backend.draft.visitId}`
      : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');

  return (
    <View>
      <DraftBanner
        badgeLabel={
          draftState.backend.draft.status === 'synced' ? 'Synced' : 'Local'
        }
        message={formatDraftSyncStatus(draftState)}
        style={styles.banner}
        title="Draft sync status"
        tone={
          draftState.backend.draft.status === 'synced'
            ? 'success'
            : draftState.backend.draft.status === 'error'
              ? 'warning'
              : 'info'
        }
      />

      {voiceImportedAt ? (
        <DraftBanner
          badgeLabel="Voice Imported"
          message={`Janet data was applied to this intake. ${formatLastSaved(
            voiceImportedAt,
          )}`}
          style={styles.banner}
          title="Voice handoff detected"
          tone="success"
        />
      ) : null}

      {submitStatus === 'submitted' ? (
        <DraftBanner
          badgeLabel="Submitted"
          message={
            confirmationCode
              ? `${submitMessage ?? 'Submission accepted.'} Confirmation ${confirmationCode}.`
              : submitMessage ?? 'Submission accepted by the backend.'
          }
          style={styles.banner}
          title="Backend submission complete"
          tone="success"
        />
      ) : null}

      {submitStatus === 'error' && submitMessage ? (
        <InfoCard style={styles.sectionCard} title="Submit Retry Needed">
          <Text style={typography.body}>{submitMessage}</Text>
        </InfoCard>
      ) : null}

      <InfoCard
        subtitle="Review readiness, sync state, and document completeness before the intake is sent for staff review."
        title="Submission Readiness"
      >
        <View style={styles.readinessRow}>
          <Text style={styles.label}>Status</Text>
          <Text
            style={[
              styles.value,
              reviewReadiness.isReady
                ? styles.valueSuccess
                : styles.valueWarning,
            ]}
          >
            {reviewReadiness.isReady
              ? 'Ready for live submission'
              : 'Needs attention before submit'}
          </Text>
        </View>
        {reviewReadiness.blockers.map((blocker) => (
          <View key={blocker} style={styles.readinessRow}>
            <Text style={styles.label}>Required</Text>
            <Text style={styles.value}>{blocker}</Text>
          </View>
        ))}
        {reviewReadiness.recommendations.map((recommendation) => (
          <View key={recommendation} style={styles.readinessRow}>
            <Text style={styles.label}>Recommended</Text>
            <Text style={styles.value}>{recommendation}</Text>
          </View>
        ))}
        {!reviewReadiness.blockers.length &&
        !reviewReadiness.recommendations.length ? (
          <Text style={typography.body}>
            This intake has the required clinical and coverage fields filled in
            and is ready for backend submission.
          </Text>
        ) : null}
      </InfoCard>

      <InfoCard
        style={styles.sectionCard}
        subtitle="Local continuity stays intact even if the backend draft needs to be recreated."
        title="Draft Lifecycle"
      >
        <View style={styles.row}>
          <Text style={styles.label}>Draft mode</Text>
          <Text style={styles.value}>{draftReferenceSummary}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Sync state</Text>
          <Text style={styles.value}>{formatDraftSyncStatus(draftState)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Last updated</Text>
          <Text style={styles.value}>
            {formatLastSaved(draftState.intake.lastUpdatedAt)}
          </Text>
        </View>
      </InfoCard>

      <InfoCard style={styles.sectionCard} title="Attachments">
        <View style={styles.row}>
          <Text style={styles.label}>Insurance image</Text>
          <Text style={styles.value}>
            {formatAttachmentStatus(
              hasInsuranceUpload,
              draftState.backend.uploads.insurance.status,
            )}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Insurance backend state</Text>
          <Text style={styles.value}>
            {draftState.backend.uploads.insurance.message ??
              'Waiting for an insurance upload.'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Government ID image</Text>
          <Text style={styles.value}>
            {formatAttachmentStatus(
              hasGovernmentIdUpload,
              draftState.backend.uploads.id.status,
            )}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>ID backend state</Text>
          <Text style={styles.value}>
            {draftState.backend.uploads.id.message ??
              'Waiting for a government ID upload.'}
          </Text>
        </View>
      </InfoCard>

      {sections.map((section) => (
        <InfoCard
          key={section.title}
          style={styles.sectionCard}
          title={section.title}
        >
          {section.items.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </InfoCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: spacing.lg,
  },
  sectionCard: {
    marginTop: spacing.lg,
  },
  row: {
    marginBottom: spacing.md,
  },
  readinessRow: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
  valueSuccess: {
    color: colors.success,
  },
  valueWarning: {
    color: colors.warning,
  },
});
