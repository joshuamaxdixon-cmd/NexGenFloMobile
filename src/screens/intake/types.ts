import type { ReactNode } from 'react';

import type { IntakeFieldErrors, IntakeFormData } from '../../services';

export type IntakeInlineVoiceState =
  | 'confirming'
  | 'error'
  | 'idle'
  | 'listening'
  | 'processing';

export type IntakeVoiceFieldBinding = {
  footer: ReactNode | null;
  onVoicePress?: () => void;
  state: IntakeInlineVoiceState;
};

export type IntakeVoiceBindings = {
  bindField: (field: keyof IntakeFormData) => IntakeVoiceFieldBinding;
};

export type IntakeStepComponentProps = {
  fieldErrors?: IntakeFieldErrors;
  form: IntakeFormData;
  onChange: <K extends keyof IntakeFormData>(
    field: K,
    value: IntakeFormData[K],
  ) => void;
  voice?: IntakeVoiceBindings;
};
