export type DevQaAction =
  | 'draft_resume'
  | 'draft_save'
  | 'final_submit'
  | 'janet_handoff'
  | 'returning_lookup'
  | 'upload_id'
  | 'upload_insurance';

export function logDevQaEvent(
  action: DevQaAction,
  outcome: 'error' | 'success',
  message: string,
  details?: Record<string, unknown>,
) {
  if (!__DEV__) {
    return;
  }

  const payload = {
    action,
    details: details ?? {},
    message,
    outcome,
    timestamp: new Date().toISOString(),
  };

  if (outcome === 'error') {
    console.warn(`[NexGen Flo QA] ${action}: ${message}`, payload);
    return;
  }

  console.info(`[NexGen Flo QA] ${action}: ${message}`, payload);
}
