import type { ComponentProps } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeScreen } from '../screens/HomeScreen';
import { IntakeScreen } from '../screens/IntakeScreen';
import { colors, typography } from '../theme';
import type { RootTabParamList } from './types';

type IconName = ComponentProps<typeof Ionicons>['name'];

const Tab = createBottomTabNavigator<RootTabParamList>();
const TAB_BAR_TOP_PADDING = 10;
const TAB_BAR_CONTENT_HEIGHT = 56;

const tabIcons: Record<
  keyof RootTabParamList,
  { active: IconName; inactive: IconName }
> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Intake: { active: 'clipboard', inactive: 'clipboard-outline' },
};

export function AppNavigator() {
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
