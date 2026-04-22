import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { DraftBanner } from '../components/DraftBanner';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { SecondaryButton } from '../components/SecondaryButton';
import { SectionHeader } from '../components/SectionHeader';
import {
  formatLastSaved,
  intakeFlowSteps,
  mapApiFieldErrorsToIntakeFields,
  mapApiFieldErrorsToReturningPatientFields,
  type IntakeFieldErrors,
  getReviewReadiness,
  useDraftStore,
  validateIntakeStep,
  validateReturningPatientForm,
} from '../services';
import { ReturningPatientScreen } from './ReturningPatientScreen';
import { BasicInfoScreen } from './intake/BasicInfoScreen';
import { DocumentsScreen } from './intake/DocumentsScreen';
import { ReviewScreen } from './intake/ReviewScreen';
import { SymptomsScreen } from './intake/SymptomsScreen';
import { useUnifiedJanetFieldVoice } from './intake/useUnifiedJanetFieldVoice';
import { colors, spacing, typography } from '../theme';

function hasFieldErrors(fieldErrors: IntakeFieldErrors) {
  return Object.values(fieldErrors).some(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
}

export function IntakeScreen() {
  const {
    clearDraft,
    fetchRemoteDraft,
    lookupReturningPatient,
    setUploadAsset,
    setIntakeStep,
    setVoiceListening,
    setVoiceTranscript,
    state,
    submitCurrentIntake,
    syncCurrentDraft,
    updateIntakeField,
    updateIntakeFields,
    updateReturningPatientField,
  } = useDraftStore();
  const fetchRemoteDraftRef = useRef(fetchRemoteDraft);
  const [showStepValidation, setShowStepValidation] = useState(false);
  const [showReturningValidation, setShowReturningValidation] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  useEffect(() => {
    fetchRemoteDraftRef.current = fetchRemoteDraft;
  }, [fetchRemoteDraft]);

  useEffect(() => {
    if (
      state.hydrated &&
      state.backend.draft.draftId &&
      !state.backend.draft.lastFetchedAt
    ) {
      void fetchRemoteDraftRef.current();
    }
  }, [
    state.backend.draft.draftId,
    state.backend.draft.lastFetchedAt,
    state.hydrated,
  ]);

  useEffect(() => {
    setShowStepValidation(false);
  }, [state.intake.currentStep]);

  useEffect(() => {
    if (state.activeFlowMode === 'returning') {
      setShowStepValidation(false);
    } else {
      setShowReturningValidation(false);
    }
  }, [state.activeFlowMode]);

  useEffect(() => {
    if (state.intake.currentStep !== 'review' && reviewConfirmed) {
      setReviewConfirmed(false);
    }
  }, [reviewConfirmed, state.intake.currentStep]);

  const currentStepIndex = Math.max(
    0,
    intakeFlowSteps.findIndex((step) => step.key === state.intake.currentStep),
  );
  const currentConfig = intakeFlowSteps[currentStepIndex];
  const isDocumentsStep = currentConfig.key === 'documents';
  const inlineVoice = useUnifiedJanetFieldVoice({
    currentStep: currentConfig.key,
    draftId: state.backend.draft.draftId,
    form: state.intake.form,
    patientId: state.backend.draft.patientId,
    returningPatient: state.returningPatient.form,
    setVoiceListening,
    setVoiceTranscript,
    syncCurrentDraft: async () => {
      await syncCurrentDraft();
    },
    updateIntakeFields,
    visitId: state.backend.draft.visitId,
  });

  if (!state.hydrated) {
    return (
      <ScreenContainer>
        <SectionHeader
          eyebrow="Patient Intake"
          subtitle="Loading saved draft details for this device."
          title="Preparing NexGen Flo"
        />
        <EmptyStateCard
          icon="time-outline"
          message="We are restoring local intake progress so the patient can continue without losing their place."
          title="Restoring draft"
        />
      </ScreenContainer>
    );
  }

  const isLastStep = currentStepIndex === intakeFlowSteps.length - 1;
  const localStepErrors = validateIntakeStep(currentConfig.key, state.intake.form);
  const backendStepErrors = mapApiFieldErrorsToIntakeFields(
    state.backend.submit.fieldErrors ?? state.backend.draft.fieldErrors,
  );
  const visibleStepErrors =
    showStepValidation || currentConfig.key === 'review'
      ? {
          ...localStepErrors,
          ...backendStepErrors,
        }
      : backendStepErrors;
  const returningFieldErrors = {
    ...(showReturningValidation
      ? validateReturningPatientForm(state.returningPatient.form)
      : {}),
    ...mapApiFieldErrorsToReturningPatientFields(
      state.backend.lookup.fieldErrors,
    ),
  };
  const reviewReadiness = getReviewReadiness({
    backendDraftStatus: state.backend.draft.status,
    form: state.intake.form,
    hasGovernmentIdUpload:
      Boolean(state.uploads.id) || state.backend.uploads.id.status === 'uploaded',
    hasInsuranceUpload:
      Boolean(state.uploads.insurance) ||
      state.backend.uploads.insurance.status === 'uploaded',
  });

  const handleNext = async () => {
    setShowStepValidation(true);

    if (currentConfig.key === 'review' && !reviewReadiness.isReady) {
      if (hasFieldErrors(localStepErrors)) {
        if (
          localStepErrors.patientType ||
          localStepErrors.firstName ||
          localStepErrors.lastName ||
          localStepErrors.dateOfBirth ||
          localStepErrors.phoneNumber ||
          localStepErrors.email ||
          localStepErrors.emergencyContactName ||
          localStepErrors.emergencyContactPhone
        ) {
          setIntakeStep('basicInfo');
          return;
        }

        if (localStepErrors.chiefConcern || localStepErrors.symptomDuration) {
          setIntakeStep('symptoms');
          return;
        }
      }
      return;
    }

    if (currentConfig.key === 'review' && !reviewConfirmed) {
      return;
    }

    if (currentConfig.key !== 'documents' && hasFieldErrors(localStepErrors)) {
      return;
    }

    if (isLastStep) {
      const didSubmit = await submitCurrentIntake();

      if (didSubmit) {
        Alert.alert(
          'Check-in complete',
          'Your visit is now in NexGEN and ready for staff review.',
        );
      }
      return;
    }

    setShowStepValidation(false);
    await syncCurrentDraft();
    setIntakeStep(intakeFlowSteps[currentStepIndex + 1].key);
  };

  const handleBack = () => {
    if (currentStepIndex === 0) {
      return;
    }

    setIntakeStep(intakeFlowSteps[currentStepIndex - 1].key);
  };

  const handleSkipDocumentsForNow = async () => {
    if (!isDocumentsStep) {
      return;
    }

    if (state.backend.uploads.insurance.status !== 'uploaded') {
      setUploadAsset('insurance', null);
    }
    if (state.backend.uploads.id.status !== 'uploaded') {
      setUploadAsset('id', null);
    }

    await handleNext();
  };

  const renderCurrentStep = () => {
    switch (currentConfig.key) {
      case 'basicInfo':
        return (
          <BasicInfoScreen
            fieldErrors={visibleStepErrors}
            form={state.intake.form}
            onChange={updateIntakeField}
            voice={inlineVoice ?? undefined}
          />
        );
      case 'symptoms':
        return (
          <SymptomsScreen
            fieldErrors={visibleStepErrors}
            form={state.intake.form}
            onChange={updateIntakeField}
            voice={inlineVoice ?? undefined}
          />
        );
      case 'review':
        return (
          <ReviewScreen
            form={state.intake.form}
            hasGovernmentIdUpload={
              Boolean(state.uploads.id) ||
              state.backend.uploads.id.status === 'uploaded'
            }
            hasInsuranceUpload={
              Boolean(state.uploads.insurance) ||
              state.backend.uploads.insurance.status === 'uploaded'
            }
            onEditStep={setIntakeStep}
            onToggleReviewConfirmed={() =>
              setReviewConfirmed((current) => !current)
            }
            reviewConfirmed={reviewConfirmed}
          />
        );
      case 'documents':
        return (
          <DocumentsScreen
            fieldErrors={visibleStepErrors}
            form={state.intake.form}
            onChange={updateIntakeField}
          />
        );
      default:
        return null;
    }
  };

  const handleReturningContinue = async () => {
    const localErrors = validateReturningPatientForm(state.returningPatient.form);
    setShowReturningValidation(true);

    if (Object.keys(localErrors).length > 0) {
      return;
    }

    const didMatch = await lookupReturningPatient();

    if (!didMatch) {
      return;
    }
  };

  const isSaving = state.backend.draft.status === 'syncing';
  const isSubmitting = state.backend.submit.status === 'submitting';
  const isSubmitted = state.backend.submit.status === 'submitted';
  const stepActionTitles: Record<
    (typeof intakeFlowSteps)[number]['key'],
    string
  > = {
    basicInfo: 'Continue',
    symptoms: 'Continue to Review',
    review: 'Continue to Uploads',
    documents: 'Finish Check-In',
  };
  const nextButtonTitle = isLastStep
    ? isSubmitting
      ? 'Submitting...'
      : state.backend.submit.status === 'submitted'
        ? 'Submitted'
        : state.backend.submit.status === 'error'
          ? 'Retry Submit'
          : stepActionTitles[currentConfig.key]
      : isSaving
        ? 'Saving...'
        : stepActionTitles[currentConfig.key];
  const canAdvance =
    !isSubmitted &&
    !isSubmitting &&
    !isSaving &&
    (isLastStep
      ? true
      : currentConfig.key === 'review'
        ? reviewReadiness.isReady && reviewConfirmed
        : !hasFieldErrors(localStepErrors));
  const lookupStatusTone =
    state.backend.lookup.status === 'matched'
      ? 'success'
      : state.backend.lookup.status === 'ambiguous' ||
          state.backend.lookup.status === 'error'
        ? 'warning'
        : 'info';

  return (
    <ScreenContainer>
      {state.activeFlowMode === 'returning' ? (
        <>
          <DraftBanner
            badgeLabel="Saved"
            message={formatLastSaved(state.returningPatient.lastUpdatedAt)}
            style={styles.banner}
            title="Returning patient lookup draft"
          />
          <SectionHeader
            eyebrow="Returning Patient"
            subtitle="Use a clean recognition screen to locate an existing patient before moving into the symptom step."
            title="Find an existing patient"
          />
          <ReturningPatientScreen
            busy={state.backend.lookup.status === 'loading'}
            buttonTitle={
              state.backend.lookup.status === 'error'
                ? 'Retry Lookup'
                : state.backend.lookup.status === 'ambiguous'
                  ? 'Retry Lookup'
                  : 'Continue'
            }
            data={state.returningPatient.form}
            fieldErrors={returningFieldErrors}
            onChange={updateReturningPatientField}
            onContinue={() => void handleReturningContinue()}
            statusMessage={state.backend.lookup.message}
            statusTone={lookupStatusTone}
          />
          <SecondaryButton
            disabled={state.backend.lookup.status === 'loading'}
            onPress={() => clearDraft('all')}
            style={styles.resetButton}
            title="Reset Draft"
          />
        </>
      ) : (
        <>
          <ProgressBar
            currentStep={currentStepIndex + 1}
            totalSteps={intakeFlowSteps.length}
          />
          <SectionHeader
            subtitle={currentConfig.subtitle}
            title={currentConfig.title}
          />
          {renderCurrentStep()}

          <View
            style={[
              styles.navRow,
              currentConfig.key === 'basicInfo' ? styles.navColumn : null,
            ]}
          >
            <SecondaryButton
              disabled={currentStepIndex === 0 || isSubmitting || isSaving}
              onPress={handleBack}
              style={[
                styles.navButton,
                currentConfig.key === 'basicInfo'
                  ? styles.navButtonStacked
                  : styles.navButtonLeft,
              ]}
              title="Back"
            />
            <PrimaryButton
              disabled={!canAdvance}
              loading={isSubmitting || (!isLastStep && isSaving)}
              onPress={handleNext}
              style={[
                styles.navButton,
                currentConfig.key === 'basicInfo'
                  ? styles.navButtonStacked
                  : styles.navButtonRight,
              ]}
              title={nextButtonTitle}
            />
          </View>
          {isDocumentsStep ? (
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting || isSaving}
              onPress={() => void handleSkipDocumentsForNow()}
              style={({ pressed }) => [
                styles.skipForNowButton,
                (isSubmitting || isSaving) && styles.skipForNowButtonDisabled,
                pressed && !isSubmitting && !isSaving
                  ? styles.skipForNowButtonPressed
                  : null,
              ]}
            >
              <Text style={styles.skipForNowLabel}>Skip for now</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  navColumn: {
    gap: spacing.sm,
    flexDirection: 'column',
  },
  navButton: {
    flex: 1,
  },
  navButtonStacked: {
    width: '100%',
  },
  navButtonLeft: {
    marginRight: spacing.xs,
  },
  navButtonRight: {
    marginLeft: spacing.xs,
  },
  resetButton: {
    marginTop: spacing.md,
  },
  skipForNowButton: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipForNowButtonPressed: {
    opacity: 0.7,
  },
  skipForNowButtonDisabled: {
    opacity: 0.4,
  },
  skipForNowLabel: {
    ...typography.body,
    color: colors.primaryDeep,
    fontWeight: '600',
  },
});
