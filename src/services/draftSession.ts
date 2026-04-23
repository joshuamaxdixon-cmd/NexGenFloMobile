import { Directory, File, Paths } from 'expo-file-system';

import type { IntakeFormData } from './intake';

const draftSessionDirectory = new Directory(Paths.document, 'nexgen-flo');
const draftSessionFile = new File(draftSessionDirectory, 'intake-draft-session.json');

export const INTAKE_DRAFT_SESSION_TTL_MS = 5 * 60 * 1000;

export type IntakeDraftSession = {
  createdAt: string;
  currentStep: number;
  draftId: string;
  formData: Partial<IntakeFormData>;
  janetContext?: {
    currentQuestionKey?: string;
    enabled?: boolean;
    lastPrompt?: string;
  };
  updatedAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

function createSessionId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDraftSession(
  payload: Omit<IntakeDraftSession, 'createdAt' | 'draftId' | 'updatedAt'>,
): IntakeDraftSession {
  const timestamp = nowIso();

  return {
    createdAt: timestamp,
    draftId: createSessionId(),
    updatedAt: timestamp,
    ...payload,
  };
}

export function isDraftExpired(
  draft: Pick<IntakeDraftSession, 'updatedAt'> | null | undefined,
) {
  if (!draft?.updatedAt) {
    return true;
  }

  const updatedAtMs = new Date(draft.updatedAt).getTime();
  if (Number.isNaN(updatedAtMs)) {
    return true;
  }

  return Date.now() - updatedAtMs > INTAKE_DRAFT_SESSION_TTL_MS;
}

async function ensureDraftSessionFile() {
  if (!draftSessionDirectory.exists) {
    draftSessionDirectory.create({
      idempotent: true,
      intermediates: true,
    });
  }

  if (!draftSessionFile.exists) {
    draftSessionFile.create({
      intermediates: true,
      overwrite: true,
    });
  }
}

export async function loadDraftSession() {
  try {
    if (!draftSessionFile.exists) {
      return null;
    }

    const raw = await draftSessionFile.text();
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as IntakeDraftSession;
    if (isDraftExpired(parsed)) {
      await clearDraftSession();
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function saveDraftSession(
  partialUpdate: Partial<IntakeDraftSession> &
    Pick<IntakeDraftSession, 'currentStep' | 'formData'>,
) {
  const existing = await loadDraftSession();
  const nextDraft: IntakeDraftSession = {
    ...(existing ??
      createDraftSession({
        currentStep: partialUpdate.currentStep,
        formData: partialUpdate.formData,
        janetContext: partialUpdate.janetContext,
      })),
    ...partialUpdate,
    updatedAt: nowIso(),
  };

  await ensureDraftSessionFile();
  await draftSessionFile.write(JSON.stringify(nextDraft));
  return nextDraft;
}

export async function clearDraftSession() {
  try {
    if (draftSessionFile.exists) {
      await draftSessionFile.delete();
    }
  } catch {
    // ignore local cleanup errors
  }
}
