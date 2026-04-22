import {
  requireOptionalNativeModule,
  type EventSubscription,
} from 'expo-modules-core';

import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionModuleType,
  ExpoSpeechRecognitionNativeEventMap,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition/build/ExpoSpeechRecognitionModule.types';

type JanetLiveSpeechEventMap = ExpoSpeechRecognitionNativeEventMap;

const liveSpeechModule =
  requireOptionalNativeModule<ExpoSpeechRecognitionModuleType>(
    'ExpoSpeechRecognition',
  );

function createNoopSubscription(): EventSubscription {
  return {
    remove() {
      // no-op fallback subscription
    },
  };
}

function canUseLiveSpeechModule() {
  if (!liveSpeechModule) {
    return false;
  }

  try {
    return Boolean(liveSpeechModule.isRecognitionAvailable());
  } catch {
    return false;
  }
}

export type JanetLiveSpeechAvailability = {
  moduleAvailable: boolean;
  recognitionAvailable: boolean;
  supportsRecording: boolean;
};

export type JanetLiveSpeechOptions = {
  contextualStrings?: string[];
  language?: string;
};

export function getJanetLiveSpeechAvailability(): JanetLiveSpeechAvailability {
  return {
    moduleAvailable: Boolean(liveSpeechModule),
    recognitionAvailable: canUseLiveSpeechModule(),
    supportsRecording: Boolean(liveSpeechModule?.supportsRecording?.()),
  };
}

export async function requestJanetLiveSpeechPermissions() {
  if (!liveSpeechModule) {
    return {
      canAskAgain: false,
      expires: 'never',
      granted: false,
      status: 'unavailable',
    };
  }

  return liveSpeechModule.requestPermissionsAsync();
}

export function addJanetLiveSpeechListener<
  EventName extends keyof JanetLiveSpeechEventMap,
>(
  eventName: EventName,
  listener:
    JanetLiveSpeechEventMap[EventName] extends null
      ? () => void
      : (event: JanetLiveSpeechEventMap[EventName]) => void,
) {
  if (!liveSpeechModule) {
    return createNoopSubscription();
  }

  return liveSpeechModule.addListener(eventName, listener as never);
}

export function startJanetLiveSpeech(options: JanetLiveSpeechOptions = {}) {
  if (!liveSpeechModule || !canUseLiveSpeechModule()) {
    throw new Error('Live speech recognition is not available in this build.');
  }

  const availability = getJanetLiveSpeechAvailability();

  liveSpeechModule.start({
    addsPunctuation: true,
    androidIntentOptions: {
      EXTRA_LANGUAGE_MODEL: 'web_search',
    },
    contextualStrings: options.contextualStrings ?? [],
    continuous: false,
    interimResults: true,
    lang: options.language ?? 'en-US',
    maxAlternatives: 1,
    recordingOptions: availability.supportsRecording
      ? {
          persist: true,
        }
      : undefined,
    volumeChangeEventOptions: {
      enabled: true,
      intervalMillis: 140,
    },
  });
}

export function stopJanetLiveSpeech() {
  liveSpeechModule?.stop();
}

export function abortJanetLiveSpeech() {
  liveSpeechModule?.abort();
}

export type JanetLiveSpeechResultEvent = ExpoSpeechRecognitionResultEvent;
export type JanetLiveSpeechErrorEvent = ExpoSpeechRecognitionErrorEvent;
