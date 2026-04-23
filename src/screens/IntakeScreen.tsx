import { useCallback, useEffect, useRef, useState } from 'react';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Alert, BackHandler, StyleSheet } from 'react-native';

import { EmptyStateCard } from '../components/EmptyStateCard';
import { IntakeActionBar } from '../components/IntakeActionBar';
import { JanetAssistantEntry } from '../components/JanetAssistantEntry';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import type { RootTabParamList } from '../navigation/types';
import {
  intakeFlowSteps,
  mapApiFieldErrorsToIntakeFields,
  type IntakeFieldErrors,
  getReviewReadiness,
  useDraftStore,
  validateIntakeStep,
} from '../services';
import { BasicInfoScreen } from './intake/BasicInfoScreen';
import { DocumentsScreen } from './intake/DocumentsScreen';
import { PastMedicalHistoryScreen } from './intake/PastMedicalHistoryScreen';
import { ReviewScreen } from './intake/ReviewScreen';
import { SymptomsScreen } from './intake/SymptomsScreen';
import { VoiceExperience } from './VoiceScreen';
import { spacing } from '../theme';

function hasFieldErrors(fieldErrors: IntakeFieldErrors) {
  return Object.values(fieldErrors).some(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
}

export function IntakeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const {
    closeJanetMode,
    fetchRemoteDraft,
    openJanetMode,
    setUploadAsset,
    setIntakeStep,
    state,
    submitCurrentIntake,
    syncCurrentDraft,
    updateIntakeField,
  } = useDraftStore();
  const fetchRemoteDraftRef = useRef(fetchRemoteDraft);
  const [showStepValidation, setShowStepValidation] = useState(false);
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
    if (state.intake.currentStep !== 'review' && reviewConfirmed) {
      setReviewConfirmed(false);
    }
  }, [reviewConfirmed, state.intake.currentStep]);

  useEffect(() => {
    if (state.intake.currentStep === 'review' && returnToReviewStep) {
      setReturnToReviewStep(null);
    }
  }, [returnToReviewStep, state.intake.currentStep]);

  const handleHardwareBack = useCallback(() => {
    Alert.alert(
      'Leave check-in?',
      'Your progress will be saved for 5 minutes.',
      [
        {
          text: 'Stay',
          style: 'cancel',
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            void syncCurrentDraft();
            if (state.janetMode.active) {
              closeJanetMode();
            }
            navigation.navigate('Home');
          },
        },
      ],
    );
    return true;
  }, [closeJanetMode, navigation, state.janetMode.active, syncCurrentDraft]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        handleHardwareBack,
      );

      return () => {
        subscription.remove();
      };
    }, [handleHardwareBack]),
  );

  const currentStepIndex = Math.max(
    0,
    intakeFlowSteps.findIndex((step) => step.key === state.intake.currentStep),
  );
  const currentConfig = intakeFlowSteps[currentStepIndex];
  const isDocumentsStep = currentConfig.key === 'documents';
  const isEditingFromReview =
    returnToReviewStep !== null && state.intake.currentStep !== 'review';

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
  const shouldShowJanetVoiceMode = state.janetMode.active;

  if (shouldShowJanetVoiceMode) {
    return (
      <VoiceExperience
        onClose={closeJanetMode}
        onSwitchToTyping={closeJanetMode}
      />
    );
  }

  return (
    <ScreenContainer>
      <>
        <ProgressBar
          currentStep={currentStepIndex + 1}
          totalSteps={intakeFlowSteps.length}
        />
        <SectionHeader
          subtitle={currentConfig.subtitle}
          title={currentConfig.title}
        />
        <JanetAssistantEntry
          onPress={() => {
            openJanetMode({
              step: state.intake.currentStep,
            });
          }}
          style={styles.janetEntry}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  janetEntry: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
