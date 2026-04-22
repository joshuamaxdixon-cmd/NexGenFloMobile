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
