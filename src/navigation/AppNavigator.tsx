import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { HomeScreen } from '../screens/HomeScreen';
import { IntakeScreen } from '../screens/IntakeScreen';
import { UploadScreen } from '../screens/UploadScreen';
import { VoiceScreen } from '../screens/VoiceScreen';
import { colors, typography } from '../theme';
import type { RootTabParamList } from './types';

type IconName = ComponentProps<typeof Ionicons>['name'];

const Tab = createBottomTabNavigator<RootTabParamList>();

const tabIcons: Record<
  keyof RootTabParamList,
  { active: IconName; inactive: IconName }
> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Voice: { active: 'mic', inactive: 'mic-outline' },
  Intake: { active: 'clipboard', inactive: 'clipboard-outline' },
  Upload: { active: 'cloud-upload', inactive: 'cloud-upload-outline' },
};

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDeep,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: styles.tabBar,
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
      <Tab.Screen component={VoiceScreen} name="Voice" />
      <Tab.Screen component={IntakeScreen} name="Intake" />
      <Tab.Screen component={UploadScreen} name="Upload" />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.background,
  },
  tabBar: {
    height: 82,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: -6,
    },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 10,
  },
  tabBarLabel: {
    ...typography.caption,
    fontWeight: '700',
  },
});
