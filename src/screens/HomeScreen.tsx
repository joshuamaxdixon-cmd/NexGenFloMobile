import { useEffect, useRef, useState } from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';

import { ActionCard } from '../components/ActionCard';
import { DevQaPanel } from '../components/DevQaPanel';
import { DraftBanner } from '../components/DraftBanner';
import { InfoCard } from '../components/InfoCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SecondaryButton } from '../components/SecondaryButton';
import { SectionHeader } from '../components/SectionHeader';
import type { RootTabParamList } from '../navigation/types';
import {
  formatDraftSyncStatus,
  getResumeDraftDescription,
  hasResumeableDraft,
  janetAssistant,
  useDraftStore,
} from '../services';
import { colors, spacing, typography } from '../theme';

type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;

const metrics = [
  { label: 'Patient start', value: '4 min' },
  { label: 'Coverage ready', value: '92%' },
  { label: 'Voice assisted', value: 'Janet' },
];

export function HomeScreen({ navigation }: HomeScreenProps) {
  const {
    checkBackendHealth,
    clearBackendDebugState,
    clearDraft,
    openReturningFlow,
    startNewIntake,
    state,
  } = useDraftStore();
  const checkBackendHealthRef = useRef(checkBackendHealth);
  const canResume = state.hydrated && hasResumeableDraft(state);
  const [showConnectivityDebug, setShowConnectivityDebug] = useState(false);
  const [showQaDiagnostics, setShowQaDiagnostics] = useState(false);
  const connectivityDebugRows = [
    {
      label: 'Config source',
      value: state.backend.connectivity.configSource,
    },
    {
      label: 'Resolved base URL',
      value: state.backend.connectivity.baseUrl,
    },
    {
      label: 'Resolved API URL',
      value: state.backend.connectivity.apiBaseUrl,
    },
    {
      label: 'Health URL',
      value: state.backend.connectivity.healthUrl,
    },
    {
      label: 'EXPO_PUBLIC_NEXGEN_API_BASE_URL',
      value:
        state.backend.connectivity.envBaseUrl ??
        'Not set in the current Expo runtime bundle',
    },
    {
      label: 'EXPO_PUBLIC_API_BASE_URL',
      value:
        state.backend.connectivity.legacyEnvBaseUrl ??
        'Not set in the current Expo runtime bundle',
    },
    {
      label: 'Raw health status',
      value: state.backend.connectivity.rawStatus ?? 'Pending',
    },
    {
      label: 'Raw error',
      value: state.backend.connectivity.errorMessage ?? 'None',
    },
  ];
  const showConnectivityDetails = __DEV__ && showConnectivityDebug;

  useEffect(() => {
    checkBackendHealthRef.current = checkBackendHealth;
  }, [checkBackendHealth]);

  useEffect(() => {
    if (state.hydrated && state.backend.connectivity.status === 'idle') {
      void checkBackendHealthRef.current();
    }
  }, [state.backend.connectivity.status, state.hydrated]);

  const openIntake = (mode: 'intake' | 'returning') => {
    if (mode === 'intake') {
      startNewIntake({
        source: 'home',
        step: 'patientType',
      });
      navigation.navigate('Intake', {
        mode: 'intake',
        startStep: 'patientType',
      });
      return;
    }

    openReturningFlow(true);
    navigation.navigate('Intake', {
      mode: 'returning',
    });
  };

  const resumeDraft = () => {
    navigation.navigate('Intake', {
      mode: state.activeFlowMode,
      startStep:
        state.activeFlowMode === 'intake' ? state.intake.currentStep : undefined,
      launchSource: 'resume',
    });
  };

  return (
    <ScreenContainer>
      <SectionHeader
        eyebrow="NexGen Flo"
        subtitle="Calm, structured onboarding for new patients, returning visits, voice capture, and clean document intake."
        title="A premium mobile front door for modern care teams."
        titleVariant="display"
      />

      {canResume ? (
        <InfoCard
          style={styles.resumeCard}
          subtitle={getResumeDraftDescription(state)}
          title="Resume Intake"
        >
          <DraftBanner
            badgeLabel="Resume"
            message={formatDraftSyncStatus(state)}
            title={
              state.activeFlowMode === 'returning'
                ? 'Returning patient draft detected'
                : 'Draft intake in progress'
            }
          />
          <View style={styles.resumeActions}>
            <PrimaryButton
              onPress={resumeDraft}
              style={[styles.resumeButton, styles.resumeButtonLeft]}
              title="Resume Intake"
            />
            <SecondaryButton
              onPress={() => clearDraft('all')}
              style={[styles.resumeButton, styles.resumeButtonRight]}
              title="Clear Draft"
            />
          </View>
        </InfoCard>
      ) : null}

      <InfoCard
        style={styles.connectivityCard}
        subtitle="Mobile-safe JSON APIs power lookup, draft save, uploads, Janet handoff, and final intake submission."
        title="Backend Connectivity"
      >
        <View style={styles.connectivityRow}>
          <View
            style={[
              styles.connectivityDot,
              state.backend.connectivity.status === 'ready'
                ? styles.connectivityDotReady
                : state.backend.connectivity.status === 'checking'
                  ? styles.connectivityDotChecking
                  : styles.connectivityDotError,
            ]}
          />
          <Text style={styles.connectivityText}>
            {state.backend.connectivity.message ??
              'Check backend connectivity before the first lookup or draft sync.'}
          </Text>
        </View>
        <Text style={styles.endpointText}>
          {state.backend.connectivity.status === 'ready'
            ? `Connected to ${state.backend.connectivity.baseUrl}`
            : 'Reconnect before lookup, upload sync, or final submit.'}
        </Text>
        {state.backend.connectivity.status === 'ready' &&
        state.backend.connectivity.serverVersion ? (
          <Text style={styles.endpointMetaText}>
            Server version {state.backend.connectivity.serverVersion}
          </Text>
        ) : null}
        {showConnectivityDetails ? (
          <View style={styles.debugPanel}>
            {connectivityDebugRows.map((row) => (
              <View key={row.label} style={styles.debugRow}>
                <Text style={styles.debugLabel}>{row.label}</Text>
                <Text style={styles.debugValue}>{row.value}</Text>
              </View>
            ))}
            {state.backend.connectivity.requestId ? (
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Request ID</Text>
                <Text style={styles.debugValue}>
                  {state.backend.connectivity.requestId}
                </Text>
              </View>
            ) : null}
            {state.backend.connectivity.serverVersion ? (
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Server version</Text>
                <Text style={styles.debugValue}>
                  {state.backend.connectivity.serverVersion}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <SecondaryButton
          loading={state.backend.connectivity.status === 'checking'}
          onPress={() => void checkBackendHealth()}
          style={styles.connectivityButton}
          title={
            state.backend.connectivity.status === 'checking'
              ? 'Checking Backend...'
              : 'Retry Connection'
          }
        />
        {__DEV__ ? (
          <SecondaryButton
            onPress={() => setShowConnectivityDebug((current) => !current)}
            style={styles.debugToggleButton}
            title={
              showConnectivityDetails
                ? 'Hide Development Details'
                : 'Show Development Details'
            }
          />
        ) : null}
      </InfoCard>

      {__DEV__ ? (
        <>
          <SecondaryButton
            onPress={() => setShowQaDiagnostics((current) => !current)}
            style={styles.qaToggleButton}
            title={
              showQaDiagnostics
                ? 'Hide QA Diagnostics'
                : 'Show QA Diagnostics'
            }
          />
          {showQaDiagnostics ? (
            <>
              <SecondaryButton
                onPress={clearBackendDebugState}
                style={styles.qaClearButton}
                title="Clear Persisted QA State"
              />
              <DevQaPanel state={state} />
            </>
          ) : null}
        </>
      ) : null}

      <InfoCard
        subtitle="Built to feel polished for patients and operationally clear for staff."
        title="Care Operations Snapshot"
      >
        <View style={styles.metricsRow}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.metricCard}>
              <Text style={typography.metric}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>
      </InfoCard>

      <Text style={styles.sectionLabel}>Primary Actions</Text>

      <View style={styles.actionsGrid}>
        <View style={styles.actionSlot}>
          <ActionCard
            accentColor={colors.primarySoft}
            icon="clipboard-outline"
            onPress={() => openIntake('intake')}
            subtitle="Open the full intake flow for a fresh patient visit."
            title="Start Intake"
          />
        </View>
        <View style={styles.actionSlot}>
          <ActionCard
            accentColor={colors.surfaceMuted}
            icon="refresh-circle-outline"
            onPress={() => openIntake('returning')}
            subtitle="Open a streamlined recognition screen for existing patients."
            title="Returning Patient"
          />
        </View>
        <View style={styles.actionSlot}>
          <ActionCard
            accentColor={colors.accentMint}
            icon="mic-outline"
            onPress={() => navigation.navigate('Voice')}
            subtitle="Open Janet for conversational intake support."
            title="Use Voice (Janet)"
          />
        </View>
        <View style={styles.actionSlot}>
          <ActionCard
            accentColor={colors.accentGold}
            icon="cloud-upload-outline"
            onPress={() => navigation.navigate('Upload')}
            subtitle="Capture insurance and supporting documents."
            title="Upload Insurance"
          />
        </View>
      </View>

      <InfoCard
        subtitle={janetAssistant.description}
        title={`${janetAssistant.name} Voice Concierge`}
      >
        <View style={styles.voiceStatusRow}>
          <View style={styles.voiceStatusDot} />
          <Text style={styles.voiceStatusText}>
            Ready for medication review, symptom capture, and natural-language
            intake prompts.
          </Text>
        </View>
        <Text style={styles.voiceTranscriptPreview}>
          Live prompt preview: {janetAssistant.confirmationText}
        </Text>
      </InfoCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  resumeCard: {
    marginBottom: spacing.xl,
  },
  connectivityCard: {
    marginBottom: spacing.xl,
  },
  resumeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  resumeButton: {
    flex: 1,
  },
  resumeButtonLeft: {
    marginRight: spacing.xs,
  },
  resumeButtonRight: {
    marginLeft: spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  connectivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectivityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  connectivityDotReady: {
    backgroundColor: colors.success,
  },
  connectivityDotChecking: {
    backgroundColor: colors.accentGold,
  },
  connectivityDotError: {
    backgroundColor: colors.warning,
  },
  connectivityText: {
    ...typography.body,
    flex: 1,
    color: colors.textSecondary,
  },
  endpointText: {
    ...typography.caption,
    color: colors.primaryText,
    marginTop: spacing.md,
  },
  endpointMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  debugPanel: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
  },
  debugRow: {
    marginBottom: spacing.sm,
  },
  debugLabel: {
    ...typography.label,
    color: colors.primaryDeep,
    marginBottom: 2,
  },
  debugValue: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  connectivityButton: {
    marginTop: spacing.md,
  },
  debugToggleButton: {
    marginTop: spacing.sm,
  },
  qaToggleButton: {
    marginBottom: spacing.lg,
  },
  qaClearButton: {
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  metricLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sectionLabel: {
    ...typography.sectionTitle,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  actionSlot: {
    width: '48%',
    marginBottom: spacing.md,
  },
  voiceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
    backgroundColor: colors.success,
  },
  voiceStatusText: {
    ...typography.body,
    flex: 1,
    color: colors.textSecondary,
  },
  voiceTranscriptPreview: {
    ...typography.caption,
    color: colors.primaryText,
    marginTop: spacing.md,
  },
});
