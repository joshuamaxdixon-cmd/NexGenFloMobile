import type { NavigatorScreenParams } from '@react-navigation/native';

import type { DraftSource, IntakeLaunchMode, IntakeStepKey } from '../services';

export type RootTabParamList = {
  Home: undefined;
  Intake:
    | {
        mode?: IntakeLaunchMode;
        startStep?: IntakeStepKey;
        prefillSymptoms?: string;
        resetKey?: string;
        launchSource?: DraftSource;
      }
    | undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList> | undefined;
  ResumeCheckIn: undefined;
  PortalLogin: undefined;
  PortalHome: undefined;
  PortalProfile: undefined;
  PortalMedicalHistory: undefined;
  PortalDocuments: undefined;
  PortalVisits: undefined;
};
