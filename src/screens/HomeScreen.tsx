import { useEffect, useRef, useState } from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DevPreviewPanel } from '../components/DevPreviewPanel';
import { DevQaPanel } from '../components/DevQaPanel';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SecondaryButton } from '../components/SecondaryButton';
import type { RootTabParamList } from '../navigation/types';
import {
  buildPortalIntakePrefill,
  type IntakeFormData,
  usePatientPortal,
  useDraftStore,
} from '../services';
import { colors, spacing, typography } from '../theme';

type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;

function createFreshIntakePrefill(): Partial<IntakeFormData> {
  return {
    allergies: '',
    allergyEnvironmentalSelections: [],
    allergyFoodSelections: [],
    allergyMaterialSelections: [],
    allergyMedicationSelections: [],
    allergyNotes: '',
    allergyReaction: '',
    chiefConcern: '',
    immunizations: '',
    immunizationCoreSelections: [],
    immunizationRoutineSelections: [],
    immunizationTravelSelections: [],
    immunizationUnknownSelections: [],
    lastDose: '',
    medicalConditions: '',
    medicalInfoHydrated: false,
    medications: '',
    painLevel: '',
    pastMedicalHistoryChronicConditions: [],
    pastMedicalHistoryHydrated: false,
    pastMedicalHistoryOtherMentalHealthCondition: '',
    pastMedicalHistoryOtherRelevantHistory: [],
    pastMedicalHistoryOtherSurgery: '',
    pastMedicalHistorySurgicalHistory: [],
    pharmacy: '',
    symptomDuration: '',
    symptomNotes: '',
  };
}

function createDevPreviewBasicPrefill(): Partial<IntakeFormData> {
  return {
    patientType: 'New patient',
  };
}

function createDevPreviewFullPrefill(): Partial<IntakeFormData> {
  return {
    allergies: 'Penicillin',
    allergyNotes: 'Avoid penicillin products',
    allergyReaction: 'Rash',
    chiefConcern: 'Persistent cough',
    dateOfBirth: '02/14/1989',
    email: 'jordan.miles@example.com',
    emergencyContactName: 'Taylor Miles',
    emergencyContactPhone: '5552221212',
    firstName: 'Jordan',
    gender: 'female',
    groupNumber: 'ABC-1234',
    heightFt: '5',
    heightIn: '6',
    insuranceProvider: 'Aetna',
    lastDose: 'Today at 8:00 AM',
    lastName: 'Miles',
    medicalConditions: '',
    medications: 'Albuterol inhaler',
    memberId: 'XZY998822',
    painLevel: '4',
    pastMedicalHistoryChronicConditions: ['Asthma', 'Anxiety'],
    pastMedicalHistoryHydrated: true,
    pastMedicalHistoryOtherRelevantHistory: ['Former smoker'],
    pastMedicalHistorySurgicalHistory: ['Appendectomy'],
    patientType: 'New patient',
    pharmacy: 'CVS Main Street',
    phoneNumber: '5558675309',
    subscriberName: 'Jordan Miles',
    symptomDuration: '3 days',
    symptomNotes: 'Worse at night',
    weightLb: '142',
  };
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const {
    checkBackendHealth,
    clearBackendDebugState,
    clearDraft,
    openJanetMode,
    openReturningFlow,
    startNewIntake,
    state,
    updateReturningPatientField,
  } = useDraftStore();
  const patientPortal = usePatientPortal();
  const checkBackendHealthRef = useRef(checkBackendHealth);
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);

  useEffect(() => {
    checkBackendHealthRef.current = checkBackendHealth;
  }, [checkBackendHealth]);

  useEffect(() => {
    if (state.hydrated && state.backend.connectivity.status === 'idle') {
      void checkBackendHealthRef.current();
    }
  }, [state.backend.connectivity.status, state.hydrated]);

  const openCheckIn = () => {
    clearDraft('all');
    const portalPrefill =
      patientPortal.state.session && patientPortal.state.portal
        ? buildPortalIntakePrefill(patientPortal.state.portal)
        : null;
    startNewIntake({
      prefill: portalPrefill
        ? { ...createFreshIntakePrefill(), ...portalPrefill }
        : createFreshIntakePrefill(),
      source: 'home',
      step: portalPrefill ? 'symptoms' : 'basicInfo',
    });
    navigation.navigate('Intake', {
      mode: 'intake',
      resetKey: `home-intake-${Date.now()}`,
      startStep: portalPrefill ? 'symptoms' : 'basicInfo',
    });
  };

  const openJanetAssistant = () => {
    clearDraft('all');
    const portalPrefill =
      patientPortal.state.session && patientPortal.state.portal
        ? buildPortalIntakePrefill(patientPortal.state.portal)
        : null;
    startNewIntake({
      prefill: portalPrefill
        ? { ...createFreshIntakePrefill(), ...portalPrefill }
        : createFreshIntakePrefill(),
      source: 'voice',
      step: portalPrefill ? 'symptoms' : 'basicInfo',
    });
    openJanetMode({
      step: portalPrefill ? 'symptoms' : 'basicInfo',
    });
    navigation.navigate('Intake', {
      launchSource: 'voice',
      mode: 'intake',
      resetKey: `voice-intake-${Date.now()}`,
      startStep: portalPrefill ? 'symptoms' : 'basicInfo',
    });
  };

  const openResumeCheckIn = () => {
    clearDraft('returning');
    openReturningFlow(true);
    navigation.navigate('Intake', {
      launchSource: 'returning',
      mode: 'returning',
      resetKey: `returning-${Date.now()}`,
    });
  };

  const openPatientPortal = () => {
    patientPortal.openPortalLogin();
    navigation
      .getParent()
      ?.navigate(
        (patientPortal.state.session ? 'PortalHome' : 'PortalLogin') as never,
      );
  };

  const openIntakePreview = (
    step:
      | 'basicInfo'
      | 'documents'
      | 'pastMedicalHistory'
      | 'review'
      | 'symptoms',
  ) => {
    clearDraft('all');
    startNewIntake({
      prefill:
        step === 'basicInfo'
          ? createDevPreviewBasicPrefill()
          : createDevPreviewFullPrefill(),
      source: 'preview',
      step,
    });
    navigation.navigate('Intake', {
      launchSource: 'manual',
      mode: 'intake',
      resetKey: `dev-${step}-${Date.now()}`,
      startStep: step,
    });
  };

  const openReturningPreview = () => {
    clearDraft('all');
    openReturningFlow(true);
    updateReturningPatientField('firstName', 'Jordan');
    updateReturningPatientField('lastName', 'Miles');
    updateReturningPatientField('dateOfBirth', '02/14/1989');
    updateReturningPatientField('phoneNumber', '5558675309');
    navigation.navigate('Intake', {
      launchSource: 'manual',
      mode: 'returning',
      resetKey: `dev-returning-${Date.now()}`,
    });
  };

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <Pressable
        accessible={false}
        disabled={!__DEV__}
        onLongPress={() => setShowDeveloperTools((current) => !current)}
        style={styles.heroCard}
      >
        <View style={styles.heroAccent} />
        <Text style={styles.heroTitleLead}>Welcome</Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.88}
          numberOfLines={1}
          style={styles.heroTitleLine}
        >
          Let&apos;s get you checked in.
        </Text>
        <Text style={styles.heroSubtitle}>
          Type or speak with Janet without losing your place.
        </Text>
      </Pressable>

      <View style={styles.actionsSection}>
        <SecondaryButton
          onPress={openJanetAssistant}
          style={styles.secondaryAction}
          title="Janet's Assistant"
        />
        <PrimaryButton
          onPress={openCheckIn}
          style={styles.primaryAction}
          title="Start Check-In"
        />
        <View style={styles.resumeSection}>
          <SecondaryButton
            onPress={openResumeCheckIn}
            style={styles.secondaryAction}
            title="Resume Check-In"
          />
          <Text style={styles.resumeHelper}>Returning patient access</Text>
        </View>
        <SecondaryButton
          onPress={openPatientPortal}
          style={styles.secondaryAction}
          title={patientPortal.state.session ? 'Open Patient Portal' : 'Patient Portal'}
        />
      </View>

      {__DEV__ && showDeveloperTools ? (
        <View style={styles.devSection}>
          <Text style={styles.devLabel}>Development Tools</Text>
          <Text style={styles.devCopy}>
            Hidden from the normal patient experience. Long-press the welcome
            card to show or hide this section.
          </Text>
          <DevPreviewPanel
            onOpenBasicInfo={() => openIntakePreview('basicInfo')}
            onOpenDocuments={() => openIntakePreview('documents')}
            onOpenMedicalInfo={() => openIntakePreview('symptoms')}
            onOpenPastMedicalHistory={() => openIntakePreview('pastMedicalHistory')}
            onOpenReset={() => clearDraft('all')}
            onOpenReturningPatient={openReturningPreview}
            onOpenReview={() => openIntakePreview('review')}
          />
          <View style={styles.devActions}>
            <SecondaryButton
              loading={state.backend.connectivity.status === 'checking'}
              onPress={() => void checkBackendHealth()}
              style={styles.devButton}
              title={
                state.backend.connectivity.status === 'checking'
                  ? 'Checking Backend...'
                  : 'Check Backend'
              }
            />
            <SecondaryButton
              onPress={clearBackendDebugState}
              style={styles.devButton}
              title="Clear QA State"
            />
          </View>
          <DevQaPanel state={state} />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.jumbo,
  },
  heroCard: {
    overflow: 'hidden',
    borderRadius: 30,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + spacing.xs,
    paddingBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 3,
    alignItems: 'center',
  },
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: colors.primary,
  },
  heroTitleLead: {
    ...typography.display,
    fontSize: 32,
    lineHeight: 36,
    textAlign: 'center',
  },
  heroTitleLine: {
    ...typography.display,
    fontSize: 27,
    lineHeight: 31,
    marginTop: 2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.bodyLarge,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionsSection: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  primaryAction: {
    minHeight: 60,
    borderRadius: 22,
  },
  secondaryAction: {
    minHeight: 56,
  },
  resumeSection: {
    gap: spacing.xs,
  },
  resumeHelper: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  devSection: {
    marginTop: spacing.xxl,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  devLabel: {
    ...typography.sectionTitle,
    marginBottom: spacing.xs,
  },
  devCopy: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  devActions: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  devButton: {
    minHeight: 52,
  },
});
