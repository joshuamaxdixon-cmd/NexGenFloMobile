import { useEffect } from 'react';
import type { ComponentProps } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyStateCard } from '../components/EmptyStateCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { HomeScreen } from '../screens/HomeScreen';
import { IntakeScreen } from '../screens/IntakeScreen';
import { PatientPortalCheckInStartScreen } from '../screens/PatientPortalCheckInStartScreen';
import { PatientPortalDocumentsScreen } from '../screens/PatientPortalDocumentsScreen';
import { PatientPortalHomeScreen } from '../screens/PatientPortalHomeScreen';
import { PatientPortalLoginScreen } from '../screens/PatientPortalLoginScreen';
import { PatientPortalMedicalHistoryScreen } from '../screens/PatientPortalMedicalHistoryScreen';
import { PatientPortalProfileScreen } from '../screens/PatientPortalProfileScreen';
import { PatientPortalVisitsScreen } from '../screens/PatientPortalVisitsScreen';
import {
  buildPortalIntakePrefill,
  usePatientPortal,
  useDraftStore,
  type PatientPortalMedicalHistory,
  type PatientPortalPhotoAsset,
  type PatientPortalProfileUpdate,
} from '../services';
import { colors, typography } from '../theme';
import type { RootStackParamList, RootTabParamList } from './types';

type IconName = ComponentProps<typeof Ionicons>['name'];

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const TAB_BAR_TOP_PADDING = 10;
const TAB_BAR_CONTENT_HEIGHT = 56;

const tabIcons: Record<
  keyof RootTabParamList,
  { active: IconName; inactive: IconName }
> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Intake: { active: 'clipboard', inactive: 'clipboard-outline' },
};

function MainTabsNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 12)
      : Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarActiveBackgroundColor: colors.surface,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarItemStyle: styles.tabBarItem,
        tabBarStyle: [
          styles.tabBar,
          {
            height:
              TAB_BAR_CONTENT_HEIGHT + TAB_BAR_TOP_PADDING + bottomPadding,
            paddingBottom: bottomPadding,
          },
        ],
        tabBarIconStyle: styles.tabBarIcon,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
        sceneStyle: styles.scene,
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons
            color={color}
            name={
              focused
                ? tabIcons[route.name].active
                : tabIcons[route.name].inactive
            }
            size={size}
          />
        ),
      })}
    >
      <Tab.Screen component={HomeScreen} name="Home" />
      <Tab.Screen
        component={IntakeScreen}
        name="Intake"
        options={{
          tabBarLabel: 'Check-In',
          title: 'Check-In',
        }}
      />
    </Tab.Navigator>
  );
}

function PortalLoginRoute() {
  const navigation = useNavigation();
  const patientPortal = usePatientPortal();

  useEffect(() => {
    if (patientPortal.state.hydrated && patientPortal.state.session) {
      navigation.reset({
        index: 1,
        routes: [{ name: 'Tabs' as never }, { name: 'PortalHome' as never }],
      });
    }
  }, [navigation, patientPortal.state.hydrated, patientPortal.state.session]);

  if (!patientPortal.state.hydrated) {
    return (
      <ScreenContainer>
        <EmptyStateCard
          icon="time-outline"
          message="Checking for a saved patient portal session."
          title="Loading"
        />
      </ScreenContainer>
    );
  }

  return (
    <PatientPortalLoginScreen
      busy={patientPortal.state.busyAction === 'login'}
      dateOfBirth={patientPortal.state.loginForm.dateOfBirth}
      email={patientPortal.state.loginForm.email}
      message={patientPortal.state.message}
      onBack={() => navigation.goBack()}
      onChangeDateOfBirth={(value) =>
        patientPortal.updateLoginField('dateOfBirth', value)
      }
      onChangeEmail={(value) => patientPortal.updateLoginField('email', value)}
      onContinue={async () => {
        const didLogin = await patientPortal.login();
        if (didLogin) {
          navigation.reset({
            index: 1,
            routes: [{ name: 'Tabs' as never }, { name: 'PortalHome' as never }],
          });
        }
      }}
    />
  );
}

function useRequirePortalSession() {
  const navigation = useNavigation();
  const patientPortal = usePatientPortal();

  useEffect(() => {
    if (patientPortal.state.hydrated && !patientPortal.state.session) {
      navigation.reset({
        index: 1,
        routes: [{ name: 'Tabs' as never }, { name: 'PortalLogin' as never }],
      });
    }
  }, [navigation, patientPortal.state.hydrated, patientPortal.state.session]);

  return patientPortal;
}

function PortalHomeRoute() {
  const navigation = useNavigation();
  const stackNavigation = navigation as unknown as {
    navigate: (name: string, params?: object) => void;
    reset: (state: { index: number; routes: { name: string }[] }) => void;
  };
  const patientPortal = useRequirePortalSession();
  const portal = patientPortal.state.portal;

  if (!portal || !patientPortal.state.session) {
    return null;
  }

  return (
    <PatientPortalHomeScreen
      busyAction={patientPortal.state.busyAction}
      message={patientPortal.state.message}
      onContinueCheckIn={() => stackNavigation.navigate('PortalCheckInStart')}
      onEditProfile={() => stackNavigation.navigate('PortalProfile')}
      onOpenDocuments={() => stackNavigation.navigate('PortalDocuments')}
      onOpenVisits={() => stackNavigation.navigate('PortalVisits')}
      onSignOut={async () => {
        await patientPortal.signOut();
        stackNavigation.reset({
          index: 0,
          routes: [{ name: 'Tabs' }],
        });
      }}
      onUpdateMedicalHistory={() =>
        stackNavigation.navigate('PortalMedicalHistory')
      }
      portal={portal}
      session={patientPortal.state.session}
    />
  );
}

function PortalCheckInStartRoute() {
  const navigation = useNavigation();
  const stackNavigation = navigation as unknown as {
    goBack: () => void;
    navigate: (name: string, params?: object) => void;
  };
  const patientPortal = useRequirePortalSession();
  const { clearDraft, startNewIntake } = useDraftStore();
  const portal = patientPortal.state.portal;

  if (!portal) {
    return null;
  }

  return (
    <PatientPortalCheckInStartScreen
      onBack={() => stackNavigation.goBack()}
      onContinue={() => {
        clearDraft('all');
        startNewIntake({
          prefill: buildPortalIntakePrefill(portal),
          source: 'resume',
          step: 'symptoms',
        });
        stackNavigation.navigate('Tabs', {
          screen: 'Intake',
          params: {
            launchSource: 'resume',
            mode: 'intake',
            resetKey: `portal-intake-${Date.now()}`,
            startStep: 'symptoms',
          },
        } as never);
      }}
      portal={portal}
    />
  );
}

function PortalProfileRoute() {
  const navigation = useNavigation();
  const patientPortal = useRequirePortalSession();
  const portal = patientPortal.state.portal;

  if (!portal || !patientPortal.state.session) {
    return null;
  }

  return (
    <PatientPortalProfileScreen
      busyAction={patientPortal.state.busyAction}
      message={patientPortal.state.message}
      onBack={() => navigation.goBack()}
      onSave={(payload: PatientPortalProfileUpdate) =>
        void patientPortal.saveProfile(payload)
      }
      onUploadPhoto={(asset: PatientPortalPhotoAsset) =>
        void patientPortal.uploadProfilePhoto(asset)
      }
      patient={portal.patient}
      profileImageVersion={patientPortal.state.session.avatarVersion}
    />
  );
}

function PortalMedicalHistoryRoute() {
  const navigation = useNavigation();
  const patientPortal = useRequirePortalSession();
  const portal = patientPortal.state.portal;

  if (!portal) {
    return null;
  }

  return (
    <PatientPortalMedicalHistoryScreen
      busyAction={patientPortal.state.busyAction}
      history={portal.medicalHistory}
      message={patientPortal.state.message}
      onBack={() => navigation.goBack()}
      onSave={(payload: PatientPortalMedicalHistory) =>
        void patientPortal.saveMedicalHistory(payload)
      }
    />
  );
}

function PortalDocumentsRoute() {
  const navigation = useNavigation();
  const patientPortal = useRequirePortalSession();
  const portal = patientPortal.state.portal;

  if (!portal || !patientPortal.state.session) {
    return null;
  }

  return (
    <PatientPortalDocumentsScreen
      busyAction={patientPortal.state.busyAction}
      message={patientPortal.state.message}
      onBack={() => navigation.goBack()}
      onUploadPhoto={(asset: PatientPortalPhotoAsset) =>
        void patientPortal.uploadProfilePhoto(asset)
      }
      patient={portal.patient}
      profileImageVersion={patientPortal.state.session.avatarVersion}
    />
  );
}

function PortalVisitsRoute() {
  const navigation = useNavigation();
  const patientPortal = useRequirePortalSession();
  const portal = patientPortal.state.portal;

  if (!portal) {
    return null;
  }

  return (
    <PatientPortalVisitsScreen
      onBack={() => navigation.goBack()}
      portal={portal}
    />
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Tabs"
      screenOptions={{
        headerShown: false,
        contentStyle: styles.scene,
      }}
    >
      <Stack.Screen component={MainTabsNavigator} name="Tabs" />
      <Stack.Screen component={PortalLoginRoute} name="PortalLogin" />
      <Stack.Screen component={PortalHomeRoute} name="PortalHome" />
      <Stack.Screen component={PortalCheckInStartRoute} name="PortalCheckInStart" />
      <Stack.Screen component={PortalProfileRoute} name="PortalProfile" />
      <Stack.Screen
        component={PortalMedicalHistoryRoute}
        name="PortalMedicalHistory"
      />
      <Stack.Screen component={PortalDocumentsRoute} name="PortalDocuments" />
      <Stack.Screen component={PortalVisitsRoute} name="PortalVisits" />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.background,
  },
  tabBar: {
    paddingTop: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surfaceSoft,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },
  tabBarIcon: {
    marginTop: 2,
  },
  tabBarItem: {
    borderRadius: 18,
    marginHorizontal: 4,
  },
  tabBarLabel: {
    ...typography.caption,
    fontWeight: '700',
  },
});
