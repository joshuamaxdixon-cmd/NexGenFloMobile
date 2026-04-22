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
  startPatientPortalCheckIn,
  updatePatientPortalCheckIn,
  updatePatientPortalMedicalHistory,
  updatePatientPortalProfile,
  uploadPatientPortalProfilePhoto,
  type PatientPortalCheckInUpdate,
  type PatientPortalLoginForm,
  type PatientPortalMedicalHistory,
  type PatientPortalPhotoAsset,
  type PatientPortalSummary,
} from './patientPortal';

export type PatientPortalView =
  | 'checkIn'
  | 'home'
  | 'login'
  | 'medicalHistory'
  | 'profile';

type PatientPortalState = {
  active: boolean;
  busyAction: null | 'checkIn' | 'login' | 'logout' | 'medicalHistory' | 'photo' | 'profile' | 'refresh';
  hydrated: boolean;
  loginForm: PatientPortalLoginForm;
  message: string | null;
  token: string | null;
  portal: PatientPortalSummary | null;
  view: PatientPortalView;
};

type PersistedPatientPortalState = Omit<PatientPortalState, 'busyAction' | 'hydrated' | 'message'>;

type Action =
  | { type: 'hydrate'; payload: PersistedPatientPortalState | null }
  | { type: 'set_active'; payload: boolean }
  | { type: 'set_busy'; payload: PatientPortalState['busyAction'] }
  | { type: 'set_message'; payload: string | null }
  | { type: 'set_login_form'; payload: Partial<PatientPortalLoginForm> }
  | { type: 'set_portal'; payload: { portal: PatientPortalSummary; token?: string | null } }
  | { type: 'set_view'; payload: PatientPortalView }
  | { type: 'sign_out' };

type ContextValue = {
  openPortalLogin: () => void;
  state: PatientPortalState;
  updateLoginField: (field: keyof PatientPortalLoginForm, value: string) => void;
  login: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  goToHome: () => void;
  goToProfile: () => void;
  goToMedicalHistory: () => void;
  goToCheckIn: () => Promise<boolean>;
  saveProfile: (payload: {
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zipCode: string;
  }) => Promise<boolean>;
  saveMedicalHistory: (payload: PatientPortalMedicalHistory) => Promise<boolean>;
  uploadProfilePhoto: (asset: PatientPortalPhotoAsset) => Promise<boolean>;
  saveCheckIn: (payload: PatientPortalCheckInUpdate) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const PatientPortalContext = createContext<ContextValue | null>(null);

const portalDirectory = new Directory(Paths.document, 'nexgen-flo');
const portalFile = new File(portalDirectory, 'patient-portal.json');

function createInitialState(): PatientPortalState {
  return {
    active: false,
    busyAction: null,
    hydrated: false,
    loginForm: {
      email: '',
      dateOfBirth: '',
    },
    message: null,
    token: null,
    portal: null,
    view: 'login',
  };
}

function getPersistableState(state: PatientPortalState): PersistedPatientPortalState {
  return {
    active: state.active,
    loginForm: state.loginForm,
    token: state.token,
    portal: state.portal,
    view: state.view,
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
    case 'set_active':
      return {
        ...state,
        active: action.payload,
      };
    case 'set_busy':
      return {
        ...state,
        busyAction: action.payload,
      };
    case 'set_message':
      return {
        ...state,
        message: action.payload,
      };
    case 'set_login_form':
      return {
        ...state,
        loginForm: {
          ...state.loginForm,
          ...action.payload,
        },
      };
    case 'set_portal':
      return {
        ...state,
        active: true,
        message: null,
        portal: action.payload.portal,
        token: action.payload.token ?? state.token,
        view: 'home',
      };
    case 'set_view':
      return {
        ...state,
        active: true,
        view: action.payload,
      };
    case 'sign_out':
      return {
        ...createInitialState(),
        hydrated: state.hydrated,
        active: true,
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

  useEffect(() => {
    async function bootstrapSession() {
      const current = stateRef.current;
      if (!current.hydrated || !current.token) {
        return;
      }
      await refreshSessionInternal(false);
    }
    void bootstrapSession();
  }, [state.hydrated]);

  const refreshSessionInternal = async (showBusy = true) => {
    const token = stateRef.current.token;
    if (!token) {
      return false;
    }
    if (showBusy) {
      dispatch({ type: 'set_busy', payload: 'refresh' });
    }
    try {
      const response = await fetchPatientPortalSession(token);
      dispatch({
        type: 'set_portal',
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
      if (showBusy) {
        dispatch({ type: 'set_busy', payload: null });
      }
    }
  };

  const openPortalLogin = () => {
    dispatch({ type: 'set_active', payload: true });
    dispatch({ type: 'set_view', payload: 'login' });
    dispatch({ type: 'set_message', payload: null });
  };

  const updateLoginField = (
    field: keyof PatientPortalLoginForm,
    value: string,
  ) => {
    dispatch({ type: 'set_login_form', payload: { [field]: value } });
  };

  const login = async () => {
    dispatch({ type: 'set_busy', payload: 'login' });
    try {
      const response = await patientPortalLogin(stateRef.current.loginForm);
      dispatch({
        type: 'set_portal',
        payload: {
          portal: response.portal,
          token: response.token,
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

  const goToHome = () => dispatch({ type: 'set_view', payload: 'home' });
  const goToProfile = () => dispatch({ type: 'set_view', payload: 'profile' });
  const goToMedicalHistory = () =>
    dispatch({ type: 'set_view', payload: 'medicalHistory' });

  const goToCheckIn = async () => {
    const token = stateRef.current.token;
    if (!token) {
      return false;
    }
    dispatch({ type: 'set_busy', payload: 'checkIn' });
    try {
      const response = await startPatientPortalCheckIn(token);
      dispatch({
        type: 'set_portal',
        payload: {
          portal: response.portal,
        },
      });
      dispatch({ type: 'set_message', payload: response.message });
      dispatch({ type: 'set_view', payload: 'checkIn' });
      return true;
    } catch (error) {
      dispatch({
        type: 'set_message',
        payload: getErrorMessage(error, 'Portal check-in is unavailable right now.'),
      });
      return false;
    } finally {
      dispatch({ type: 'set_busy', payload: null });
    }
  };

  const saveProfile = async (
    payload: ContextValue extends { saveProfile: (payload: infer P) => Promise<boolean> } ? P : never,
  ) => {
    const token = stateRef.current.token;
    if (!token) {
      return false;
    }
    dispatch({ type: 'set_busy', payload: 'profile' });
    try {
      const response = await updatePatientPortalProfile(token, payload);
      dispatch({ type: 'set_portal', payload: { portal: response.portal } });
      dispatch({ type: 'set_message', payload: response.message });
      dispatch({ type: 'set_view', payload: 'home' });
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
    const token = stateRef.current.token;
    if (!token) {
      return false;
    }
    dispatch({ type: 'set_busy', payload: 'medicalHistory' });
    try {
      const response = await updatePatientPortalMedicalHistory(token, payload);
      dispatch({ type: 'set_portal', payload: { portal: response.portal } });
      dispatch({ type: 'set_message', payload: response.message });
      dispatch({ type: 'set_view', payload: 'home' });
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
    const token = stateRef.current.token;
    if (!token) {
      return false;
    }
    dispatch({ type: 'set_busy', payload: 'photo' });
    try {
      const response = await uploadPatientPortalProfilePhoto(token, asset);
      dispatch({ type: 'set_portal', payload: { portal: response.portal } });
      dispatch({ type: 'set_message', payload: response.message });
      dispatch({ type: 'set_view', payload: 'profile' });
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

  const saveCheckIn = async (payload: PatientPortalCheckInUpdate) => {
    const current = stateRef.current;
    if (!current.token || !current.portal?.activeVisit) {
      return false;
    }
    dispatch({ type: 'set_busy', payload: 'checkIn' });
    try {
      const response = await updatePatientPortalCheckIn(
        current.token,
        current.portal.activeVisit.id,
        payload,
      );
      dispatch({ type: 'set_portal', payload: { portal: response.portal } });
      dispatch({ type: 'set_message', payload: response.message });
      dispatch({ type: 'set_view', payload: 'home' });
      return true;
    } catch (error) {
      dispatch({
        type: 'set_message',
        payload: getErrorMessage(error, 'Check-in update failed.'),
      });
      return false;
    } finally {
      dispatch({ type: 'set_busy', payload: null });
    }
  };

  const signOut = async () => {
    const token = stateRef.current.token;
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
      dispatch({ type: 'set_message', payload: 'Signed out of the patient portal.' });
    }
  };

  return (
    <PatientPortalContext.Provider
      value={{
        openPortalLogin,
        state,
        updateLoginField,
        login,
        refreshSession: refreshSessionInternal,
        goToHome,
        goToProfile,
        goToMedicalHistory,
        goToCheckIn,
        saveProfile,
        saveMedicalHistory,
        uploadProfilePhoto,
        saveCheckIn,
        signOut,
      }}
    >
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
