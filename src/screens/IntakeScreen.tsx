import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { DraftBanner } from '../components/DraftBanner';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { SecondaryButton } from '../components/SecondaryButton';
import { SectionHeader } from '../components/SectionHeader';
import {
  formatDraftSyncStatus,
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
import { AllergiesScreen } from './intake/AllergiesScreen';
import { BasicInfoScreen } from './intake/BasicInfoScreen';
import { InsuranceScreen } from './intake/InsuranceScreen';
import { MedicationsScreen } from './intake/MedicationsScreen';
import { PatientTypeScreen } from './intake/PatientTypeScreen';
import { ReviewScreen } from './intake/ReviewScreen';
import { SymptomsScreen } from './intake/SymptomsScreen';
import { spacing } from '../theme';

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
    setIntakeStep,
    state,
    submitCurrentIntake,
    syncCurrentDraft,
    updateIntakeField,
    updateReturningPatientField,
  } = useDraftStore();
  const fetchRemoteDraftRef = useRef(fetchRemoteDraft);
  const [showStepValidation, setShowStepValidation] = useState(false);
  const [showReturningValidation, setShowReturningValidation] = useState(false);

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

  const currentStepIndex = Math.max(
    0,
    intakeFlowSteps.findIndex((step) => step.key === state.intake.currentStep),
  );
  const currentConfig = intakeFlowSteps[currentStepIndex];
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

    if (isLastStep && !reviewReadiness.isReady) {
      return;
    }

    if (!isLastStep && hasFieldErrors(localStepErrors)) {
      return;
    }

    if (isLastStep) {
      const didSubmit = await submitCurrentIntake();

      if (didSubmit) {
        Alert.alert(
          'Intake submitted successfully',
          'The patient intake is now in NexGEN and ready for staff review.',
        );
      }
      return;
    }

    setShowStepValidation(false);

    if (currentConfig.key !== 'patientType') {
      await syncCurrentDraft();
    }

    setIntakeStep(intakeFlowSteps[currentStepIndex + 1].key);
  };

  const handleBack = () => {
    if (currentStepIndex === 0) {
      return;
    }

    setIntakeStep(intakeFlowSteps[currentStepIndex - 1].key);
  };

  const renderCurrentStep = () => {
    switch (currentConfig.key) {
      case 'patientType':
        return (
          <PatientTypeScreen
            fieldErrors={visibleStepErrors}
            form={state.intake.form}
            onChange={updateIntakeField}
          />
        );
      case 'basicInfo':
        return (
          <BasicInfoScreen
            fieldErrors={visibleStepErrors}
            form={state.intake.form}
            onChange={updateIntakeField}
          />
        );
      case 'symptoms':
        return (
          <SymptomsScreen
            fieldErrors={visibleStepErrors}
            form={state.intake.form}
            onChange={updateIntakeField}
          />
        );
      case 'medications':
        return (
          <MedicationsScreen
            form={state.intake.form}
            onChange={updateIntakeField}
          />
        );
      case 'allergies':
        return (
          <AllergiesScreen
            form={state.intake.form}
            onChange={updateIntakeField}
          />
        );
      case 'insurance':
        return (
          <InsuranceScreen
            fieldErrors={visibleStepErrors}
            form={state.intake.form}
            onChange={updateIntakeField}
          />
        );
      case 'review':
        return (
          <ReviewScreen
            confirmationCode={state.backend.submit.confirmationCode}
            draftState={state}
            form={state.intake.form}
            hasGovernmentIdUpload={
              Boolean(state.uploads.id) ||
              state.backend.uploads.id.status === 'uploaded'
            }
            hasInsuranceUpload={
              Boolean(state.uploads.insurance) ||
              state.backend.uploads.insurance.status === 'uploaded'
            }
            submitMessage={state.backend.submit.message}
            submitStatus={state.backend.submit.status}
            voiceImportedAt={state.intake.voiceImportedAt}
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
  const nextButtonTitle = isLastStep
    ? isSubmitting
      ? 'Submitting...'
      : state.backend.submit.status === 'submitted'
        ? 'Submitted'
        : state.backend.submit.status === 'error'
          ? 'Retry Submit'
          : !reviewReadiness.isReady
            ? 'Complete Required Fields'
            : 'Submit Intake'
      : isSaving
        ? 'Saving...'
        : state.backend.draft.status === 'error'
          ? 'Retry Save'
          : 'Next';
  const canAdvance =
    !isSubmitted &&
    !isSubmitting &&
    !isSaving &&
    (isLastStep ? reviewReadiness.isReady : !hasFieldErrors(localStepErrors));
  const draftBannerTone =
    state.backend.submit.status === 'submitted' ||
    state.intake.voiceImportedAt ||
    state.backend.draft.status === 'synced'
      ? 'success'
      : state.backend.draft.status === 'error'
        ? 'warning'
        : 'info';
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
            title={currentConfig.title}
            totalSteps={intakeFlowSteps.length}
          />
          <DraftBanner
            badgeLabel={
              state.backend.submit.status === 'submitted'
                ? 'Submitted'
                : state.backend.draft.status === 'error'
                  ? 'Needs Retry'
                : state.intake.voiceImportedAt
                  ? 'Voice Imported'
                  : state.backend.draft.status === 'synced'
                    ? 'Synced'
                    : 'Local'
            }
            message={formatDraftSyncStatus(state)}
            style={styles.banner}
            title={
              state.backend.submit.status === 'submitted'
                ? 'Backend submission complete'
                : state.intake.voiceImportedAt
                ? 'Voice data applied to intake'
                : 'Draft intake in progress'
            }
            tone={
              draftBannerTone
            }
          />
          <SectionHeader
            eyebrow="Patient Intake"
            subtitle={currentConfig.subtitle}
            title={currentConfig.title}
          />

          {renderCurrentStep()}

          <View style={styles.navRow}>
            <SecondaryButton
              disabled={currentStepIndex === 0 || isSubmitting || isSaving}
              onPress={handleBack}
              style={[styles.navButton, styles.navButtonLeft]}
              title="Back"
            />
            <PrimaryButton
              disabled={!canAdvance}
              loading={isSubmitting || (!isLastStep && isSaving)}
              onPress={handleNext}
              style={[styles.navButton, styles.navButtonRight]}
              title={nextButtonTitle}
            />
          </View>
          <SecondaryButton
            disabled={isSubmitting || isSaving}
            onPress={() => clearDraft('all')}
            style={styles.resetButton}
            title="Reset Draft"
          />
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
  navButton: {
    flex: 1,
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
});
