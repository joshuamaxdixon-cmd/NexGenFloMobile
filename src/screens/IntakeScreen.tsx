import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { DraftBanner } from '../components/DraftBanner';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { IntakeActionBar } from '../components/IntakeActionBar';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { SecondaryButton } from '../components/SecondaryButton';
import { SectionHeader } from '../components/SectionHeader';
import {
  formatLastSaved,
  intakeFlowSteps,
  mapApiFieldErrorsToIntakeFields,
  mapApiFieldErrorsToReturningPatientFields,
  usePatientPortal,
  type IntakeFieldErrors,
  getReviewReadiness,
  useDraftStore,
  validateIntakeStep,
  validateReturningPatientForm,
} from '../services';
import { PatientPortalCheckInScreen } from './PatientPortalCheckInScreen';
import { PatientPortalHomeScreen } from './PatientPortalHomeScreen';
import { PatientPortalLoginScreen } from './PatientPortalLoginScreen';
import { PatientPortalMedicalHistoryScreen } from './PatientPortalMedicalHistoryScreen';
import { PatientPortalProfileScreen } from './PatientPortalProfileScreen';
import { ReturningPatientScreen } from './ReturningPatientScreen';
import { BasicInfoScreen } from './intake/BasicInfoScreen';
import { DocumentsScreen } from './intake/DocumentsScreen';
import { PastMedicalHistoryScreen } from './intake/PastMedicalHistoryScreen';
import { ReviewScreen } from './intake/ReviewScreen';
import { SymptomsScreen } from './intake/SymptomsScreen';
import { useUnifiedJanetFieldVoice } from './intake/useUnifiedJanetFieldVoice';
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
  const patientPortal = usePatientPortal();
  const fetchRemoteDraftRef = useRef(fetchRemoteDraft);
  const [showStepValidation, setShowStepValidation] = useState(false);
  const [showReturningValidation, setShowReturningValidation] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [returnToReviewStep, setReturnToReviewStep] = useState<
    (typeof intakeFlowSteps)[number]['key'] | null
  >(null);

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

  useEffect(() => {
    if (state.intake.currentStep === 'review' && returnToReviewStep) {
      setReturnToReviewStep(null);
    }
  }, [returnToReviewStep, state.intake.currentStep]);

  const currentStepIndex = Math.max(
    0,
    intakeFlowSteps.findIndex((step) => step.key === state.intake.currentStep),
  );
  const currentConfig = intakeFlowSteps[currentStepIndex];
  const isDocumentsStep = currentConfig.key === 'documents';
  const isEditingFromReview =
    returnToReviewStep !== null && state.intake.currentStep !== 'review';
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

    if (returnToReviewStep) {
      setIntakeStep('review');
      setReturnToReviewStep(null);
      return;
    }

    setIntakeStep(intakeFlowSteps[currentStepIndex + 1].key);
  };

  const handleBack = () => {
    if (isEditingFromReview) {
      setIntakeStep('review');
      setReturnToReviewStep(null);
      return;
    }

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

  const handleEditFromReview = (
    step: 'basicInfo' | 'documents' | 'pastMedicalHistory' | 'symptoms',
  ) => {
    setReturnToReviewStep(step);
    setShowStepValidation(false);
    setIntakeStep(step);
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
            onEditStep={handleEditFromReview}
            onToggleReviewConfirmed={() =>
              setReviewConfirmed((current) => !current)
            }
            reviewConfirmed={reviewConfirmed}
          />
        );
      case 'pastMedicalHistory':
        return (
          <PastMedicalHistoryScreen
            fieldErrors={visibleStepErrors}
            form={state.intake.form}
            onChange={updateIntakeField}
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
    symptoms: 'Continue',
    pastMedicalHistory: 'Continue',
    documents: 'Continue',
    review: 'Submit Check-In',
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
    (currentConfig.key === 'review'
      ? reviewReadiness.isReady && reviewConfirmed
      : currentConfig.key === 'documents' || currentConfig.key === 'pastMedicalHistory'
        ? true
        : !hasFieldErrors(localStepErrors));
  const showBackAction = currentStepIndex > 0 || isEditingFromReview;
  const lookupStatusTone =
    state.backend.lookup.status === 'matched'
      ? 'success'
      : state.backend.lookup.status === 'ambiguous' ||
          state.backend.lookup.status === 'error'
        ? 'warning'
        : 'info';

  const isPortalActive = patientPortal.state.active;
  const portalBusy = patientPortal.state.busyAction;
  const portalSummary = patientPortal.state.portal;

  return (
    <ScreenContainer>
      {isPortalActive ? (
        <>
          {patientPortal.state.view === 'login' ? (
            <>
              <SectionHeader
                subtitle="Enter your email and date of birth to continue."
                title="Continue Check-In"
              />
              <PatientPortalLoginScreen
                busy={portalBusy === 'login'}
                dateOfBirth={patientPortal.state.loginForm.dateOfBirth}
                email={patientPortal.state.loginForm.email}
                message={patientPortal.state.message}
                onChangeDateOfBirth={(value) =>
                  patientPortal.updateLoginField('dateOfBirth', value)
                }
                onChangeEmail={(value) =>
                  patientPortal.updateLoginField('email', value)
                }
                onContinue={() => void patientPortal.login()}
              />
            </>
          ) : patientPortal.state.view === 'profile' && portalSummary ? (
            <>
              <SectionHeader
                subtitle="Update the patient profile used by the shared portal account."
                title="Edit Profile"
              />
              <PatientPortalProfileScreen
                busyAction={portalBusy}
                message={patientPortal.state.message}
                onBack={patientPortal.goToHome}
                onSave={(payload) => void patientPortal.saveProfile(payload)}
                onUploadPhoto={(asset) => void patientPortal.uploadProfilePhoto(asset)}
                patient={portalSummary.patient}
              />
            </>
          ) : patientPortal.state.view === 'medicalHistory' && portalSummary ? (
            <>
              <SectionHeader
                subtitle="Keep the chart details current before today’s visit."
                title="Update Medical History"
              />
              <PatientPortalMedicalHistoryScreen
                busyAction={portalBusy}
                history={portalSummary.medicalHistory}
                message={patientPortal.state.message}
                onBack={patientPortal.goToHome}
                onSave={(payload) => void patientPortal.saveMedicalHistory(payload)}
              />
            </>
          ) : patientPortal.state.view === 'checkIn' && portalSummary ? (
            <>
              <SectionHeader
                subtitle="Complete the current patient portal visit."
                title="Continue Check-In"
              />
              <PatientPortalCheckInScreen
                busyAction={portalBusy}
                message={patientPortal.state.message}
                onBack={patientPortal.goToHome}
                onSave={(payload) => void patientPortal.saveCheckIn(payload)}
                visit={portalSummary.activeVisit}
              />
            </>
          ) : portalSummary ? (
            <>
              <SectionHeader
                subtitle="Continue check-in or update your portal details."
                title="Patient Portal"
              />
              <PatientPortalHomeScreen
                busyAction={portalBusy}
                message={patientPortal.state.message}
                onContinueCheckIn={() => void patientPortal.goToCheckIn()}
                onEditProfile={patientPortal.goToProfile}
                onSignOut={() => void patientPortal.signOut()}
                onUpdateMedicalHistory={patientPortal.goToMedicalHistory}
                onUpdateProfilePicture={patientPortal.goToProfile}
                portal={portalSummary}
              />
            </>
          ) : (
            <>
              <SectionHeader
                subtitle="Reload your patient portal session."
                title="Patient Portal"
              />
              <EmptyStateCard
                icon="person-circle-outline"
                message={patientPortal.state.message || 'Please sign in again to continue.'}
                title="Portal session unavailable"
              />
              <SecondaryButton
                onPress={patientPortal.openPortalLogin}
                style={styles.resetButton}
                title="Return to Login"
              />
            </>
          )}
        </>
      ) : state.activeFlowMode === 'returning' ? (
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
          <IntakeActionBar
            backDisabled={isSubmitting || isSaving}
            onBackPress={showBackAction ? handleBack : undefined}
            onPrimaryPress={() => void handleNext()}
            onTertiaryPress={
              isDocumentsStep
                ? () => {
                    void handleSkipDocumentsForNow();
                  }
                : undefined
            }
            primaryDisabled={!canAdvance}
            primaryLoading={isSubmitting || (!isLastStep && isSaving)}
            primaryTitle={nextButtonTitle}
            tertiaryDisabled={isSubmitting || isSaving}
            tertiaryTitle={isDocumentsStep ? 'Skip and finish' : undefined}
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
  resetButton: {
    marginTop: spacing.md,
  },
});
