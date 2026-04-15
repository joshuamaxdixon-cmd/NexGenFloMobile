import { StyleSheet, Text, View } from 'react-native';

import type { DraftStoreState } from '../services';
import {
  formatDraftSyncStatus,
  formatLastSaved,
  getLastApiExchange,
} from '../services';
import { colors, spacing, typography } from '../theme';
import { InfoCard } from './InfoCard';

type DevQaPanelProps = {
  state: DraftStoreState;
};

function valueOrFallback(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }

  return String(value);
}

function debugValue(value: string | null | undefined) {
  if (!value || !value.trim().length) {
    return 'Not available';
  }

  return value.length > 280 ? `${value.slice(0, 280)}...` : value;
}

function DevQaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function DevQaPanel({ state }: DevQaPanelProps) {
  const qaState = state.backend.qa;
  const lastExchange = getLastApiExchange();

  return (
    <InfoCard
      style={styles.card}
      subtitle="Development-only QA support for live device testing against the connected NexGEN backend."
      title="QA Diagnostics"
    >
      <DevQaRow
        label="Draft sync"
        value={formatDraftSyncStatus(state)}
      />
      <DevQaRow
        label="Draft reference"
        value={valueOrFallback(state.backend.draft.draftId)}
      />
      <DevQaRow
        label="Patient reference"
        value={valueOrFallback(state.backend.draft.patientId)}
      />
      <DevQaRow
        label="Visit reference"
        value={valueOrFallback(state.backend.draft.visitId)}
      />
      <DevQaRow
        label="Last API action"
        value={valueOrFallback(qaState.lastAction)}
      />
      <DevQaRow
        label="Last API result"
        value={valueOrFallback(qaState.lastResult)}
      />
      <DevQaRow
        label="Last API error"
        value={valueOrFallback(qaState.lastError)}
      />
      <DevQaRow
        label="Last API update"
        value={
          qaState.lastUpdatedAt
            ? formatLastSaved(qaState.lastUpdatedAt)
            : 'No API actions captured yet'
        }
      />
      <DevQaRow
        label="Lookup state"
        value={valueOrFallback(state.backend.lookup.status)}
      />
      <DevQaRow
        label="Janet sync"
        value={valueOrFallback(state.backend.janet.status)}
      />
      <DevQaRow
        label="Insurance upload sync"
        value={valueOrFallback(state.backend.uploads.insurance.status)}
      />
      <DevQaRow
        label="ID upload sync"
        value={valueOrFallback(state.backend.uploads.id.status)}
      />
      <DevQaRow
        label="Last request method"
        value={valueOrFallback(lastExchange?.method)}
      />
      <DevQaRow
        label="Last request URL"
        value={valueOrFallback(lastExchange?.url)}
      />
      <DevQaRow
        label="Last request payload"
        value={debugValue(lastExchange?.requestBody)}
      />
      <DevQaRow
        label="Last response status"
        value={valueOrFallback(lastExchange?.responseStatus)}
      />
      <DevQaRow
        label="Last response body"
        value={debugValue(lastExchange?.responseBody)}
      />
      <DevQaRow
        label="Last exchange error"
        value={debugValue(lastExchange?.errorMessage)}
      />
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xl,
  },
  row: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.primaryDeep,
    marginBottom: spacing.xxs,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
