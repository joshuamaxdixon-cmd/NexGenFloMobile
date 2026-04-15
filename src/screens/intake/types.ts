import type { IntakeFieldErrors, IntakeFormData } from '../../services';

export type IntakeStepComponentProps = {
  fieldErrors?: IntakeFieldErrors;
  form: IntakeFormData;
  onChange: (field: keyof IntakeFormData, value: string) => void;
};
