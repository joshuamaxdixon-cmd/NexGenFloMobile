import { useEffect, useRef, useState } from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

import { DevPreviewPanel } from '../components/DevPreviewPanel';
import { DevQaPanel } from '../components/DevQaPanel';
import { JanetAvatar } from '../components/JanetAvatar';
import { NexGenLogo } from '../components/NexGenLogo';
import { ScreenContainer } from '../components/ScreenContainer';
import type { RootTabParamList } from '../navigation/types';
import {
  buildPortalIntakePrefill,
  type IntakeFormData,
  useDraftStore,
  usePatientPortal,
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
  return {};
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
    pharmacy: 'CVS Main Street',
    phoneNumber: '5558675309',
    subscriberName: 'Jordan Miles',
    symptomDuration: '3 days',
    symptomNotes: 'Worse at night',
    weightLb: '142',
  };
}

function HomeActionCard({
  icon,
  onPress,
  subtitle,
  title,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        pressed ? styles.pressedCard : null,
      ]}
    >
      <View style={styles.actionIconShell}>
        <Feather color={colors.primaryDeep} name={icon} size={22} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.actionChevronShell}>
        <Feather color={colors.primaryDeep} name="chevron-right" size={20} />
      </View>
    </Pressable>
  );
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const {
    checkBackendHealth,
    clearBackendDebugState,
    clearDraft,
    openJanetMode,
    startNewIntake,
    state,
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

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <Pressable
        accessible={false}
        disabled={!__DEV__}
        onLongPress={() => setShowDeveloperTools((current) => !current)}
        style={styles.homeShell}
      >
        <View style={styles.topRow}>
          <NexGenLogo containerStyle={styles.brandRow} size={34} />
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.headingText}>Let&apos;s get you checked in.</Text>
          <Text style={styles.supportingText}>
            Type or speak with Janet without losing your place.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={openJanetAssistant}
          style={({ pressed }) => [
            styles.janetCard,
            pressed ? styles.pressedCard : null,
          ]}
        >
          <View style={styles.janetCardGlow} />
          <View style={styles.janetAvatarWrap}>
            <JanetAvatar containerStyle={styles.janetAvatarShell} size={132} />
          </View>
          <View style={styles.janetCardContent}>
            <View style={styles.badgeRow}>
              <View style={styles.voiceBadge}>
                <Feather color={colors.primaryDeep} name="activity" size={13} />
                <Text style={styles.voiceBadgeText}>VOICE ASSISTANT</Text>
              </View>
            </View>
            <Text style={styles.janetTitle}>Janet&apos;s Assistant</Text>
            <Text style={styles.janetSubtitle}>Voice-guided check-in</Text>
            <View style={styles.janetDivider} />
            <Text style={styles.janetBody}>Let Janet guide your check-in.</Text>
            <Text style={styles.janetStatus}>Ready</Text>
            <View style={styles.janetFooter}>
              <View style={styles.startTalkingButton}>
                <Ionicons color={colors.surface} name="mic" size={18} />
                <Text style={styles.startTalkingText}>Open Janet</Text>
              </View>
            </View>
          </View>
        </Pressable>

        <View style={styles.actionsSection}>
          <HomeActionCard
            icon="clipboard"
            onPress={openCheckIn}
            subtitle="Begin a new check-in for your visit today."
            title="Start Check-In"
          />
          <HomeActionCard
            icon="user"
            onPress={openPatientPortal}
            subtitle="Log in to your account to manage your profile, documents, and visit history."
            title="Patient Portal"
          />
        </View>
      </Pressable>

      {__DEV__ && showDeveloperTools ? (
        <View style={styles.devSection}>
          <Text style={styles.devLabel}>Development Tools</Text>
          <Text style={styles.devCopy}>
            Hidden from the normal patient experience. Long-press the home
            surface to show or hide this section.
          </Text>
          <DevPreviewPanel
            onOpenBasicInfo={() => openIntakePreview('basicInfo')}
            onOpenDocuments={() => openIntakePreview('documents')}
            onOpenMedicalInfo={() => openIntakePreview('symptoms')}
            onOpenPastMedicalHistory={() => openIntakePreview('pastMedicalHistory')}
            onOpenReset={() => clearDraft('all')}
            onOpenReview={() => openIntakePreview('review')}
          />
          <View style={styles.devActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void checkBackendHealth()}
              style={({ pressed }) => [
                styles.devActionButton,
                pressed ? styles.pressedCard : null,
              ]}
            >
              <Text style={styles.devActionText}>
                {state.backend.connectivity.status === 'checking'
                  ? 'Checking Backend...'
                  : 'Check Backend'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={clearBackendDebugState}
              style={({ pressed }) => [
                styles.devActionButton,
                pressed ? styles.pressedCard : null,
              ]}
            >
              <Text style={styles.devActionText}>Clear QA State</Text>
            </Pressable>
          </View>
          <DevQaPanel state={state} />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  homeShell: {
    gap: spacing.lg,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  brandRow: {
    minHeight: 34,
  },
  heroBlock: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.md,
  },
  welcomeText: {
    fontSize: 22,
    lineHeight: 27,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  headingText: {
    fontSize: 22,
    lineHeight: 27,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  supportingText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    maxWidth: '82%',
  },
  janetCard: {
    backgroundColor: '#F3EBDD',
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    position: 'relative',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  pressedCard: {
    opacity: 0.84,
  },
  janetCardGlow: {
    backgroundColor: '#FBF6EC',
    borderRadius: 140,
    height: 200,
    position: 'absolute',
    right: -56,
    top: -18,
    width: 200,
  },
  janetAvatarWrap: {
    justifyContent: 'flex-end',
    minWidth: 124,
    paddingTop: spacing.lg,
  },
  janetAvatarShell: {
    alignSelf: 'center',
    backgroundColor: '#EFE4D2',
    borderColor: '#E7D9C4',
  },
  janetCardContent: {
    flex: 1,
    gap: 6,
    paddingBottom: spacing.xxs,
    paddingTop: 10,
  },
  badgeRow: {
    alignItems: 'flex-start',
  },
  voiceBadge: {
    alignItems: 'center',
    backgroundColor: '#EEE4D6',
    borderColor: '#E1D2BF',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  voiceBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.primaryDeep,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  janetTitle: {
    fontSize: 22,
    lineHeight: 27,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  janetSubtitle: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.primaryDeep,
    fontWeight: '600',
  },
  janetDivider: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 3,
    marginVertical: 2,
    width: 42,
  },
  janetBody: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
    maxWidth: '94%',
  },
  janetStatus: {
    ...typography.label,
    color: colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
  janetFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  startTalkingButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: 18,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  startTalkingText: {
    ...typography.button,
    color: colors.surface,
    fontWeight: '700',
  },
  actionsSection: {
    gap: spacing.sm,
  },
  actionCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  actionIconShell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  actionCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  actionTitle: {
    fontSize: 19,
    lineHeight: 23,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  actionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 21,
    maxWidth: '92%',
  },
  actionChevronShell: {
    alignItems: 'center',
    borderColor: colors.divider,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  devSection: {
    marginTop: spacing.xl,
  },
  devLabel: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  devCopy: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  devActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  devActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  devActionText: {
    ...typography.label,
    color: colors.primaryDeep,
    fontWeight: '600',
    textAlign: 'center',
  },
});
