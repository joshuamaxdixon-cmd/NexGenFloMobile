import { useEffect, useMemo, useRef, useState } from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { DraftBanner } from '../components/DraftBanner';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { InfoCard } from '../components/InfoCard';
import { InputField } from '../components/InputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SecondaryButton } from '../components/SecondaryButton';
import { SectionHeader } from '../components/SectionHeader';
import type { RootTabParamList } from '../navigation/types';
import {
  buildJanetSpeechText,
  buildSimulatedJanetHandoff,
  formatJanetConfirmation,
  formatLastSaved,
  getJanetSpeechProvider,
  janetAssistant,
  speakWithJanet,
  stopJanetSpeech,
  useDraftStore,
  type JanetSpeechPlaybackState,
} from '../services';
import { colors, spacing, typography } from '../theme';

const wavePatterns = [
  [18, 26, 14, 34, 22, 40, 24, 30, 18, 26, 16],
  [22, 34, 18, 40, 24, 32, 18, 36, 24, 28, 18],
  [16, 24, 12, 28, 18, 44, 22, 32, 16, 22, 14],
  [24, 30, 18, 38, 26, 34, 22, 28, 20, 34, 18],
] as const;

type VoiceScreenProps = BottomTabScreenProps<RootTabParamList, 'Voice'>;

function getSpeechPresentation(options: {
  hasReplay: boolean;
  isListening: boolean;
  isSpeechLoading: boolean;
  speechState: JanetSpeechPlaybackState;
}) {
  const { hasReplay, isListening, isSpeechLoading, speechState } = options;

  if (isListening) {
    return {
      color: colors.primary,
      detail:
        'Janet is listening for the patient story and preparing a structured summary.',
      label: 'Listening',
    };
  }

  if (isSpeechLoading) {
    return {
      color: colors.primaryDeep,
      detail: 'Preparing Janet voice guidance for playback.',
      label: 'Preparing voice',
    };
  }

  if (speechState === 'speaking') {
    return {
      color: colors.primaryDeep,
      detail: 'Janet is speaking the current guidance aloud.',
      label: 'Speaking',
    };
  }

  if (speechState === 'paused') {
    return {
      color: colors.textTertiary,
      detail: 'Playback stopped. Tap Play to hear the latest guidance again.',
      label: 'Paused',
    };
  }

  if (speechState === 'replay' || hasReplay) {
    return {
      color: colors.success,
      detail: 'Janet guidance is ready to replay whenever you need it.',
      label: 'Replay available',
    };
  }

  return {
    color: colors.primaryDeep,
    detail: 'Janet is ready with calm voice guidance for the intake conversation.',
    label: 'Ready',
  };
}

export function VoiceScreen({ navigation }: VoiceScreenProps) {
  const {
    applyVoiceToIntake,
    setVoiceEditing,
    setVoiceHandoff,
    setVoiceListening,
    setVoiceSpellMode,
    setVoiceTranscript,
    syncVoiceHandoff,
    startNewIntake,
    state,
    updateVoiceHandoff,
  } = useDraftStore();
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenTextRef = useRef('');
  const speechProviderRef = useRef(getJanetSpeechProvider());
  const speechRunIdRef = useRef(0);
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechState, setSpeechState] =
    useState<JanetSpeechPlaybackState>('ready');
  const [wavePatternIndex, setWavePatternIndex] = useState(0);

  useEffect(() => {
    lastSpokenTextRef.current = lastSpokenText;
  }, [lastSpokenText]);

  useEffect(() => {
    const speechProvider = speechProviderRef.current;

    return () => {
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }

      speechRunIdRef.current += 1;
      void stopJanetSpeech(speechProvider);
    };
  }, []);

  const shouldAnimateWaveform =
    state.voice.isListening || isSpeechLoading || speechState === 'speaking';

  useEffect(() => {
    if (!shouldAnimateWaveform) {
      setWavePatternIndex(0);
      return;
    }

    const intervalId = setInterval(() => {
      setWavePatternIndex((current) => (current + 1) % wavePatterns.length);
    }, 240);

    return () => clearInterval(intervalId);
  }, [shouldAnimateWaveform]);

  const speechText = useMemo(
    () =>
      buildJanetSpeechText({
        handoff: state.voice.handoff,
        spellModeEnabled: state.voice.spellModeEnabled,
      }),
    [state.voice.handoff, state.voice.spellModeEnabled],
  );
  const hasReplay = lastSpokenText.trim().length > 0;
  const speechPresentation = getSpeechPresentation({
    hasReplay,
    isListening: state.voice.isListening,
    isSpeechLoading,
    speechState,
  });
  const activeWavePattern = shouldAnimateWaveform
    ? wavePatterns[wavePatternIndex]
    : wavePatterns[0];

  const stopPlayback = async (nextState: JanetSpeechPlaybackState = 'paused') => {
    speechRunIdRef.current += 1;
    setIsSpeechLoading(false);

    try {
      await stopJanetSpeech(speechProviderRef.current);
    } catch {
      // Stopping local device TTS should fail quietly.
    }

    setSpeechState(
      lastSpokenTextRef.current.trim().length > 0 ? nextState : 'ready',
    );
  };

  const playSpeech = async (text: string) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    const runId = speechRunIdRef.current + 1;

    speechRunIdRef.current = runId;
    setSpeechError(null);
    setIsSpeechLoading(true);

    try {
      await speakWithJanet(
        {
          onComplete: () => {
            if (speechRunIdRef.current !== runId) {
              return;
            }

            setIsSpeechLoading(false);
            setSpeechState('replay');
          },
          onError: (message) => {
            if (speechRunIdRef.current !== runId) {
              return;
            }

            setIsSpeechLoading(false);
            setSpeechError(message);
            setSpeechState(
              lastSpokenTextRef.current.trim().length > 0 ? 'replay' : 'ready',
            );
          },
          onPause: () => {
            if (speechRunIdRef.current !== runId) {
              return;
            }

            setIsSpeechLoading(false);
            setSpeechState(
              lastSpokenTextRef.current.trim().length > 0 ? 'paused' : 'ready',
            );
          },
          onStart: () => {
            if (speechRunIdRef.current !== runId) {
              return;
            }

            setLastSpokenText(trimmedText);
            setIsSpeechLoading(false);
            setSpeechState('speaking');
          },
          text: trimmedText,
        },
        speechProviderRef.current,
      );
    } catch (error) {
      if (speechRunIdRef.current !== runId) {
        return;
      }

      setIsSpeechLoading(false);
      setSpeechError(
        error instanceof Error && error.message
          ? error.message
          : 'Janet voice playback is unavailable right now.',
      );
      setSpeechState(
        lastSpokenTextRef.current.trim().length > 0 ? 'replay' : 'ready',
      );
    }
  };

  const playCurrentGuidance = async () => {
    void Haptics.selectionAsync();
    await playSpeech(speechText);
  };

  const replayGuidance = async () => {
    if (!lastSpokenTextRef.current.trim()) {
      return;
    }

    void Haptics.selectionAsync();
    await playSpeech(lastSpokenTextRef.current);
  };

  const openManualFallback = () => {
    void stopPlayback('paused');
    startNewIntake({
      prefill: {
        chiefConcern: state.voice.handoff?.symptomSummary ?? '',
        patientType: 'New patient',
      },
      source: 'manual',
      step: 'basicInfo',
    });
    void Haptics.selectionAsync();
    navigation.navigate('Intake', {
      mode: 'intake',
      startStep: 'basicInfo',
    });
  };

  const sendToIntake = async () => {
    if (!state.voice.handoff) {
      return;
    }

    await stopPlayback('replay');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    applyVoiceToIntake();
    await syncVoiceHandoff();
    navigation.navigate('Intake', {
      mode: 'intake',
      startStep: 'symptoms',
    });
  };

  const handleMicPress = () => {
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
      captureTimeoutRef.current = null;
    }

    if (state.voice.isListening) {
      void Haptics.selectionAsync();
      setVoiceListening(false);
      return;
    }

    if (speechState === 'speaking' || isSpeechLoading) {
      void stopPlayback('paused');
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSpeechError(null);
    setVoiceEditing(false);
    setVoiceListening(true);
    setVoiceTranscript(
      state.voice.spellModeEnabled
        ? 'Spell mode enabled. Listening for letter-by-letter capture...'
        : 'Listening for patient symptoms and care details...',
    );
    captureTimeoutRef.current = setTimeout(() => {
      const simulatedHandoff = buildSimulatedJanetHandoff(
        state.voice.spellModeEnabled,
      );

      setVoiceHandoff(simulatedHandoff);
      captureTimeoutRef.current = null;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void playSpeech(
        buildJanetSpeechText({
          handoff: simulatedHandoff,
          spellModeEnabled: state.voice.spellModeEnabled,
        }),
      );
    }, 1400);
  };

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <SectionHeader
        align="center"
        eyebrow={janetAssistant.role}
        subtitle="Start a guided conversation, capture patient context, and hand structured details into intake."
        title="Voice intake with Janet"
      />

      <DraftBanner
        badgeLabel={state.voice.appliedToIntakeAt ? 'Applied' : 'Saved'}
        message={
          state.voice.appliedToIntakeAt
            ? `Voice details were applied to the intake draft. ${formatLastSaved(
                state.voice.appliedToIntakeAt,
              )}`
            : formatLastSaved(state.voice.lastUpdatedAt)
        }
        style={styles.banner}
        title={
          state.voice.appliedToIntakeAt
            ? 'Voice imported into intake'
            : 'Janet draft ready'
        }
        tone={state.voice.appliedToIntakeAt ? 'success' : 'info'}
      />

      {state.backend.janet.message ? (
        <DraftBanner
          badgeLabel={
            state.backend.janet.status === 'sending'
              ? 'Syncing'
              : state.backend.janet.status === 'sent'
                ? 'Sent'
                : state.backend.janet.status === 'error'
                  ? 'Retry'
                  : 'Local'
          }
          message={state.backend.janet.message}
          style={styles.banner}
          title="Janet backend handoff"
          tone={
            state.backend.janet.status === 'sent'
              ? 'success'
              : state.backend.janet.status === 'error'
                ? 'warning'
                : 'info'
          }
        />
      ) : null}

      {speechError ? (
        <DraftBanner
          badgeLabel="Audio"
          message={`${speechError} Text guidance is still available below.`}
          style={styles.banner}
          title="Janet voice playback unavailable"
          tone="warning"
        />
      ) : null}

      <InfoCard
        style={styles.waveCard}
        subtitle={speechPresentation.detail}
        title="Listening & Audible Guidance"
      >
        <View style={styles.waveStatusRow}>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: speechPresentation.color },
              ]}
            />
            <Text style={styles.statusLabel}>{speechPresentation.label}</Text>
          </View>
          <Text style={styles.providerText}>
            Voice provider: {speechProviderRef.current.label}
          </Text>
        </View>

        <View style={styles.waveform}>
          {activeWavePattern.map((height, index) => (
            <View
              key={`${height}-${index}`}
              style={[
                styles.waveBar,
                {
                  backgroundColor:
                    speechState === 'speaking' || isSpeechLoading
                      ? colors.primaryDeep
                      : state.voice.isListening
                        ? colors.primary
                        : colors.primary,
                  height,
                  opacity: shouldAnimateWaveform ? 1 : 0.72,
                },
              ]}
            />
          ))}
        </View>

        <Text style={styles.waveDescription}>{speechPresentation.detail}</Text>

        <View style={styles.actionRow}>
          <PrimaryButton
            disabled={state.voice.isListening || speechState === 'speaking'}
            icon="play"
            loading={isSpeechLoading}
            onPress={() => {
              void playCurrentGuidance();
            }}
            style={[styles.inlineButton, styles.inlineButtonLeft]}
            title={speechState === 'speaking' ? 'Speaking...' : 'Play'}
          />
          <SecondaryButton
            disabled={
              state.voice.isListening ||
              speechState === 'speaking' ||
              !hasReplay
            }
            icon="refresh"
            onPress={() => {
              void replayGuidance();
            }}
            style={[styles.inlineButton, styles.inlineButtonRight]}
            title="Replay"
          />
        </View>

        <SecondaryButton
          disabled={speechState !== 'speaking' && !isSpeechLoading}
          icon="stop-circle-outline"
          onPress={() => {
            void Haptics.selectionAsync();
            void stopPlayback('paused');
          }}
          style={styles.stopButton}
          title="Stop"
        />
      </InfoCard>

      <Pressable
        accessibilityRole="button"
        onPress={handleMicPress}
        style={({ pressed }) => [styles.micButton, pressed && styles.pressed]}
      >
        <Ionicons
          color={colors.surface}
          name={state.voice.isListening ? 'pause' : 'mic'}
          size={42}
        />
      </Pressable>

      <Text style={styles.promptTitle}>Tap to start speaking</Text>
      <Text style={[typography.body, styles.centerText]}>
        {state.voice.isListening
          ? 'Janet is capturing the patient narrative and preparing a structured summary.'
          : 'Janet will guide the conversation, speak calm prompts aloud, and convert natural speech into a structured patient intake.'}
      </Text>

      {!state.voice.transcriptDraft && !state.voice.handoff ? (
        <View style={styles.emptyStateWrap}>
          <EmptyStateCard
            icon="mic-circle-outline"
            message="Tap the microphone to simulate Janet capture, then use Play if you want Janet to read the current guidance aloud."
            title="Janet is ready"
          />
        </View>
      ) : (
        <>
          <InfoCard
            style={styles.transcriptCard}
            subtitle="Live transcript placeholder for real-time speech-to-text output."
            title="Live Transcript"
          >
            {state.voice.isEditing ? (
              <InputField
                label="Transcript"
                multiline
                onChangeText={(value) => {
                  setVoiceTranscript(value);
                  updateVoiceHandoff({
                    transcript: value,
                  });
                }}
                value={state.voice.transcriptDraft}
              />
            ) : (
              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptText}>
                  {state.voice.transcriptDraft}
                </Text>
              </View>
            )}
          </InfoCard>

          <InfoCard
            subtitle="Quickly confirm or adjust the interpreted fields before handing them into intake."
            title="Janet Interpretation"
          >
            {state.voice.isEditing ? (
              <>
                <InputField
                  helperText="This becomes the chief concern field in intake."
                  label="Symptom summary"
                  onChangeText={(value) =>
                    updateVoiceHandoff({
                      symptomSummary: value,
                    })
                  }
                  value={state.voice.handoff?.symptomSummary ?? ''}
                />
                <InputField
                  label="Duration"
                  onChangeText={(value) =>
                    updateVoiceHandoff({
                      duration: value,
                    })
                  }
                  value={state.voice.handoff?.duration ?? ''}
                />
                <InputField
                  label="Medication notes"
                  multiline
                  onChangeText={(value) =>
                    updateVoiceHandoff({
                      medicationNotes: value,
                    })
                  }
                  value={state.voice.handoff?.medicationNotes ?? ''}
                />
                <InputField
                  label="Allergy notes"
                  multiline
                  onChangeText={(value) =>
                    updateVoiceHandoff({
                      allergyNotes: value,
                    })
                  }
                  value={state.voice.handoff?.allergyNotes ?? ''}
                />
              </>
            ) : (
              <>
                <Text style={styles.heardLabel}>
                  I heard: {formatJanetConfirmation(state.voice.handoff)}
                </Text>
                <View style={styles.interpretedRow}>
                  <Text style={styles.interpretedLabel}>Medication notes</Text>
                  <Text style={styles.interpretedValue}>
                    {state.voice.handoff?.medicationNotes || 'Not captured yet'}
                  </Text>
                </View>
                <View style={styles.interpretedRow}>
                  <Text style={styles.interpretedLabel}>Allergy notes</Text>
                  <Text style={styles.interpretedValue}>
                    {state.voice.handoff?.allergyNotes || 'Not captured yet'}
                  </Text>
                </View>
              </>
            )}
            <View style={styles.actionRow}>
              <PrimaryButton
                disabled={
                  !state.voice.handoff?.symptomSummary ||
                  state.backend.janet.status === 'sending'
                }
                loading={state.backend.janet.status === 'sending'}
                onPress={() => {
                  void sendToIntake();
                }}
                style={[styles.inlineButton, styles.inlineButtonLeft]}
                title={
                  state.backend.janet.status === 'sending'
                    ? 'Sending...'
                    : state.backend.janet.status === 'error'
                      ? 'Retry Send to Intake'
                      : 'Send to Intake'
                }
              />
              <SecondaryButton
                disabled={state.backend.janet.status === 'sending'}
                onPress={() => setVoiceEditing(!state.voice.isEditing)}
                style={[styles.inlineButton, styles.inlineButtonRight]}
                title={state.voice.isEditing ? 'Done' : 'Edit'}
              />
            </View>
          </InfoCard>
        </>
      )}

      <View style={styles.utilityRow}>
        <SecondaryButton
          disabled={state.backend.janet.status === 'sending'}
          icon="text-outline"
          onPress={() => {
            void Haptics.selectionAsync();
            setVoiceSpellMode(!state.voice.spellModeEnabled);
          }}
          style={[styles.utilityButton, styles.inlineButtonLeft]}
          title={state.voice.spellModeEnabled ? 'Spell Mode On' : 'Spell Mode'}
        />
        <SecondaryButton
          disabled={state.backend.janet.status === 'sending'}
          icon="create-outline"
          onPress={openManualFallback}
          style={[styles.utilityButton, styles.inlineButtonRight]}
          title="Manual Fallback"
        />
      </View>

      <View style={styles.promptList}>
        {janetAssistant.prompts.map((prompt) => (
          <View key={prompt} style={styles.promptChip}>
            <Text style={styles.promptChipText}>{prompt}</Text>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'stretch',
  },
  banner: {
    marginBottom: spacing.md,
  },
  waveCard: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  waveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: spacing.sm,
  },
  statusLabel: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  providerText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  waveform: {
    height: 120,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: spacing.md,
  },
  waveBar: {
    width: 10,
    borderRadius: 999,
  },
  waveDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  micButton: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDeep,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  promptTitle: {
    ...typography.title,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  centerText: {
    textAlign: 'center',
  },
  emptyStateWrap: {
    marginTop: spacing.xl,
  },
  transcriptCard: {
    marginTop: spacing.xl,
  },
  transcriptBox: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.lg,
  },
  transcriptText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  heardLabel: {
    ...typography.headline,
    marginBottom: spacing.md,
  },
  interpretedRow: {
    marginBottom: spacing.md,
  },
  interpretedLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  interpretedValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inlineButton: {
    flex: 1,
  },
  inlineButtonLeft: {
    marginRight: spacing.xs,
  },
  inlineButtonRight: {
    marginLeft: spacing.xs,
  },
  stopButton: {
    marginTop: spacing.sm,
  },
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  utilityButton: {
    flex: 1,
  },
  promptList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  promptChip: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  promptChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
