import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { Directory, File, Paths } from 'expo-file-system';

import { ApiError, getApiFieldErrors } from './api';
import {
  fetchPatientPortalSession,
  logoutPatientPortal,
  patientPortalLogin,
  updatePatientPortalMedicalHistory,
  updatePatientPortalProfile,
  uploadPatientPortalProfilePhoto,
  type PatientPortalLoginForm,
  type PatientPortalMedicalHistory,
  type PatientPortalPatient,
  type PatientPortalPhotoAsset,
  type PatientPortalProfileUpdate,
  type PatientPortalSummary,
} from './patientPortal';

export type PatientPortalSession = {
  avatarVersion: string | null;
  patientId: number;
  profile: PatientPortalPatient;
  token: string;
};

type PatientPortalState = {
  busyAction:
    | null
    | 'login'
    | 'logout'
    | 'medicalHistory'
    | 'photo'
    | 'profile'
    | 'refresh';
  hydrated: boolean;
  loginForm: PatientPortalLoginForm;
  message: string | null;
  portal: PatientPortalSummary | null;
  session: PatientPortalSession | null;
};

type PersistedPatientPortalState = Omit<
  PatientPortalState,
  'busyAction' | 'hydrated' | 'message'
>;

type Action =
  | { type: 'hydrate'; payload: PersistedPatientPortalState | null }
  | { type: 'set_busy'; payload: PatientPortalState['busyAction'] }
  | { type: 'set_login_form'; payload: Partial<PatientPortalLoginForm> }
  | { type: 'set_message'; payload: string | null }
  | {
      type: 'set_portal_session';
      payload: {
        portal: PatientPortalSummary;
        token?: string;
        touchAvatarVersion?: boolean;
      };
    }
  | { type: 'sign_out' };

type ContextValue = {
  clearMessage: () => void;
  login: () => Promise<boolean>;
  openPortalLogin: () => void;
  refreshSession: () => Promise<boolean>;
  saveMedicalHistory: (payload: PatientPortalMedicalHistory) => Promise<boolean>;
  saveProfile: (payload: PatientPortalProfileUpdate) => Promise<boolean>;
  signOut: () => Promise<void>;
  state: PatientPortalState;
  updateLoginField: (field: keyof PatientPortalLoginForm, value: string) => void;
  uploadProfilePhoto: (asset: PatientPortalPhotoAsset) => Promise<boolean>;
};

const PatientPortalContext = createContext<ContextValue | null>(null);

const portalDirectory = new Directory(Paths.document, 'nexgen-flo');
const portalFile = new File(portalDirectory, 'patient-portal.json');

function nowIso() {
  return new Date().toISOString();
}

function createSession(
  portal: PatientPortalSummary,
  token: string,
  existingAvatarVersion?: string | null,
) {
  return {
    avatarVersion: existingAvatarVersion ?? nowIso(),
    patientId: portal.patient.id,
    profile: portal.patient,
    token,
  } satisfies PatientPortalSession;
}

function createInitialState(): PatientPortalState {
  return {
    busyAction: null,
    hydrated: false,
    loginForm: {
      dateOfBirth: '',
      email: '',
    },
    message: null,
    portal: null,
    session: null,
  };
}

function getPersistableState(
  state: PatientPortalState,
): PersistedPatientPortalState {
  return {
    loginForm: state.loginForm,
    portal: state.portal,
    session: state.session,
  };
}

function reducer(state: PatientPortalState, action: Action): PatientPortalState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...createInitialState(),
        ...action.payload,
        hydrated: true,
      };
    case 'set_busy':
      return {
        ...state,
        busyAction: action.payload,
      };
    case 'set_login_form':
      return {
        ...state,
        loginForm: {
          ...state.loginForm,
          ...action.payload,
        },
      };
    case 'set_message':
      return {
        ...state,
        message: action.payload,
      };
    case 'set_portal_session': {
      const token = action.payload.token ?? state.session?.token ?? '';
      return {
        ...state,
        message: null,
        portal: action.payload.portal,
        session: token
          ? createSession(
              action.payload.portal,
              token,
              action.payload.touchAvatarVersion
                ? nowIso()
                : state.session?.avatarVersion ?? null,
            )
          : state.session,
      };
    }
    case 'sign_out':
      return {
        ...createInitialState(),
        hydrated: state.hydrated,
      };
    default:
      return state;
  }
}

async function readPersistedState(): Promise<PersistedPatientPortalState | null> {
  try {
    if (!portalFile.exists) {
      return null;
    }
    const raw = await portalFile.text();
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PersistedPatientPortalState;
  } catch {
    return null;
  }
}

function writePersistedState(state: PersistedPatientPortalState) {
  try {
    if (!portalDirectory.exists) {
      portalDirectory.create({ idempotent: true, intermediates: true });
    }
    if (!portalFile.exists) {
      portalFile.create({ intermediates: true, overwrite: true });
    }
    portalFile.write(JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to save patient portal state locally.', error);
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.message.trim().length > 0) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

export function PatientPortalProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const persisted = await readPersistedState();
      if (!mounted) {
        return;
      }
      startTransition(() => {
        dispatch({ type: 'hydrate', payload: persisted });
      });
    }

    void hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!state.hydrated) {
      return;
    }

    const timeoutId = setTimeout(() => {
      writePersistedState(getPersistableState(state));
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [state]);

  const refreshSession = async () => {
    const token = stateRef.current.session?.token;
    if (!token) {
      return false;
    }

    dispatch({ type: 'set_busy', payload: 'refresh' });
    try {
      const response = await fetchPatientPortalSession(token);
      dispatch({
        type: 'set_portal_session',
        payload: {
          portal: response.portal,
        },
      });
      dispatch({ type: 'set_message', payload: response.message });
      return true;
    } catch (error) {
      dispatch({ type: 'sign_out' });
      dispatch({
        type: 'set_message',
        payload: getErrorMessage(error, 'Please sign in again to continue.'),
      });
      return false;
    } finally {
      dispatch({ type: 'set_busy', payload: null });
    }
  };

  useEffect(() => {
    if (!state.hydrated || !state.session?.token) {
      return;
    }

    void refreshSession();
  }, [state.hydrated, state.session?.token]);

  const openPortalLogin = () => {
    dispatch({ type: 'set_message', payload: null });
  };

  const updateLoginField = (
    field: keyof PatientPortalLoginForm,
    value: string,
  ) => {
    dispatch({
      type: 'set_login_form',
      payload: {
        [field]: value,
      },
    });
  };

  const login = async () => {
    dispatch({ type: 'set_busy', payload: 'login' });
    try {
      const response = await patientPortalLogin(stateRef.current.loginForm);
      dispatch({
        type: 'set_portal_session',
        payload: {
          portal: response.portal,
          token: response.token,
          touchAvatarVersion: true,
        },
      });
      dispatch({ type: 'set_message', payload: response.message });
      return true;
    } catch (error) {
      const message = getErrorMessage(
        error,
        'We could not verify that patient account.',
      );
      const fieldErrors = getApiFieldErrors(error);
      dispatch({
        type: 'set_message',
        payload:
          fieldErrors?.email?.[0] ||
          fieldErrors?.date_of_birth?.[0] ||
          message,
      });
      return false;
    } finally {
      dispatch({ type: 'set_busy', payload: null });
    }
  };

  const saveProfile = async (payload: PatientPortalProfileUpdate) => {
    const token = stateRef.current.session?.token;
    if (!token) {
      return false;
    }

    dispatch({ type: 'set_busy', payload: 'profile' });
    try {
      const response = await updatePatientPortalProfile(token, payload);
      dispatch({
        type: 'set_portal_session',
        payload: {
          portal: response.portal,
        },
      });
      dispatch({ type: 'set_message', payload: response.message });
      return true;
    } catch (error) {
      dispatch({
        type: 'set_message',
        payload: getErrorMessage(error, 'Profile update failed.'),
      });
      return false;
    } finally {
      dispatch({ type: 'set_busy', payload: null });
    }
  };

  const saveMedicalHistory = async (payload: PatientPortalMedicalHistory) => {
    const token = stateRef.current.session?.token;
    if (!token) {
      return false;
    }

    dispatch({ type: 'set_busy', payload: 'medicalHistory' });
    try {
      const response = await updatePatientPortalMedicalHistory(token, payload);
      dispatch({
        type: 'set_portal_session',
        payload: {
          portal: response.portal,
        },
      });
      dispatch({ type: 'set_message', payload: response.message });
      return true;
    } catch (error) {
      dispatch({
        type: 'set_message',
        payload: getErrorMessage(error, 'Medical history update failed.'),
      });
      return false;
    } finally {
      dispatch({ type: 'set_busy', payload: null });
    }
  };

  const uploadProfilePhoto = async (asset: PatientPortalPhotoAsset) => {
    const token = stateRef.current.session?.token;
    if (!token) {
      return false;
    }

    dispatch({ type: 'set_busy', payload: 'photo' });
    try {
      const response = await uploadPatientPortalProfilePhoto(token, asset);
      dispatch({
        type: 'set_portal_session',
        payload: {
          portal: response.portal,
          touchAvatarVersion: true,
        },
      });
      dispatch({ type: 'set_message', payload: response.message });
      return true;
    } catch (error) {
      dispatch({
        type: 'set_message',
        payload: getErrorMessage(error, 'Profile photo update failed.'),
      });
      return false;
    } finally {
      dispatch({ type: 'set_busy', payload: null });
    }
  };

  const signOut = async () => {
    const token = stateRef.current.session?.token;
    dispatch({ type: 'set_busy', payload: 'logout' });
    try {
      if (token) {
        await logoutPatientPortal(token);
      }
    } catch {
      // best effort
    } finally {
      dispatch({ type: 'sign_out' });
      dispatch({ type: 'set_busy', payload: null });
      dispatch({
        type: 'set_message',
        payload: 'Signed out of the patient portal.',
      });
    }
  };

  const value: ContextValue = {
    clearMessage: () => dispatch({ type: 'set_message', payload: null }),
    login,
    openPortalLogin,
    refreshSession,
    saveMedicalHistory,
    saveProfile,
    signOut,
    state,
    updateLoginField,
    uploadProfilePhoto,
  };

  return (
    <PatientPortalContext.Provider value={value}>
      {children}
    </PatientPortalContext.Provider>
  );
}

export function usePatientPortal() {
  const value = useContext(PatientPortalContext);
  if (!value) {
    throw new Error('usePatientPortal must be used within a PatientPortalProvider.');
  }
  return value;
}
