import { useEffect, useRef, useState } from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DevQaPanel } from '../components/DevQaPanel';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SecondaryButton } from '../components/SecondaryButton';
import type { RootTabParamList } from '../navigation/types';
import {
  hasResumeableDraft,
  useDraftStore,
} from '../services';
import { colors, spacing, typography } from '../theme';

type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;

export function HomeScreen({ navigation }: HomeScreenProps) {
  const {
    checkBackendHealth,
    clearBackendDebugState,
    clearDraft,
    startNewIntake,
    state,
  } = useDraftStore();
  const checkBackendHealthRef = useRef(checkBackendHealth);
  const canResume = state.hydrated && hasResumeableDraft(state);
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
    startNewIntake({
      source: 'home',
      step: 'basicInfo',
    });
    navigation.navigate('Intake', {
      mode: 'intake',
      startStep: 'basicInfo',
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

  const startFreshVisit = () => {
    clearDraft('all');
    openCheckIn();
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
        <Text style={styles.heroEyebrow}>NexGEN Care</Text>
        <Text style={styles.heroTitleLead}>Welcome</Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.92}
          numberOfLines={1}
          style={styles.heroTitleLine}
        >
          Let&apos;s get you checked in
        </Text>
        <Text style={styles.heroSubtitle}>
          Type or speak with Janet without losing your place.
        </Text>
      </Pressable>

      <View style={styles.primarySection}>
        <PrimaryButton
          onPress={openCheckIn}
          style={styles.primaryAction}
          title="Start Check-In"
        />
      </View>

      {canResume ? (
        <View style={styles.continueSection}>
          <Text style={styles.continueEyebrow}>Resume previous visit</Text>
          <Text style={styles.continueTitle}>Continue your check-in</Text>
          <Text style={styles.continueText}>
            Your progress is saved in the same visit flow.
          </Text>
          <PrimaryButton
            onPress={resumeDraft}
            style={styles.continueButton}
            title="Continue My Visit"
          />
          <Pressable
            accessibilityRole="button"
            onPress={startFreshVisit}
            style={({ pressed }) => [
              styles.subtleAction,
              pressed ? styles.subtleActionPressed : null,
            ]}
          >
            <Text style={styles.subtleActionLabel}>Start New Visit</Text>
          </Pressable>
        </View>
      ) : null}

      {__DEV__ && showDeveloperTools ? (
        <View style={styles.devSection}>
          <Text style={styles.devLabel}>Development Tools</Text>
          <Text style={styles.devCopy}>
            Hidden from the normal patient experience. Long-press the welcome
            card to show or hide this section.
          </Text>
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
  },
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: colors.primary,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    marginBottom: spacing.sm,
  },
  heroTitleLead: {
    ...typography.display,
    fontSize: 32,
    lineHeight: 36,
  },
  heroTitleLine: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 32,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.bodyLarge,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  primarySection: {
    marginTop: spacing.md,
  },
  primaryAction: {
    minHeight: 60,
    borderRadius: 22,
  },
  continueSection: {
    marginTop: spacing.lg + spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  continueEyebrow: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  continueTitle: {
    ...typography.sectionTitle,
    marginBottom: spacing.xs,
  },
  continueText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  continueButton: {
    minHeight: 56,
  },
  subtleAction: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  subtleActionPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  subtleActionLabel: {
    ...typography.label,
    color: colors.primaryText,
  },
  supportCard: {
    marginTop: spacing.lg,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 3,
  },
  supportLabel: {
    ...typography.sectionTitle,
    marginBottom: spacing.xs,
  },
  supportCopy: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: colors.textSecondary,
  },
  secondaryAction: {
    minHeight: 56,
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
