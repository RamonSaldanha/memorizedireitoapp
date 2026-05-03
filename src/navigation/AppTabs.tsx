import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Gamepad2, GraduationCap, Trophy, BookOpen, User } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAppearance } from '../hooks/useAppearance';
import { PlayMapScreen } from '../screens/play/PlayMapScreen';
import { PlayPhaseScreen } from '../screens/play/PlayPhaseScreen';
import { NoLivesScreen } from '../screens/play/NoLivesScreen';
import { DisciplinesScreen } from '../screens/DisciplinesScreen';
import { RankingScreen } from '../screens/RankingScreen';
import { LegalReferencesScreen } from '../screens/LegalReferencesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen';
import { SubscriptionScreen } from '../screens/profile/SubscriptionScreen';

export type PlayStackParamList = {
  PlayMap: undefined;
  PlayPhase: { phaseId: number };
  NoLives: undefined;
  Subscription: undefined;
};

const PlayStack = createNativeStackNavigator<PlayStackParamList>();

function PlayStackNavigator() {
  return (
    <PlayStack.Navigator screenOptions={{ headerShown: false }}>
      <PlayStack.Screen name="PlayMap" component={PlayMapScreen} />
      <PlayStack.Screen name="PlayPhase" component={PlayPhaseScreen} />
      <PlayStack.Screen name="NoLives" component={NoLivesScreen} />
      <PlayStack.Screen name="Subscription" component={SubscriptionScreen} />
    </PlayStack.Navigator>
  );
}

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ChangePassword: undefined;
  Subscription: undefined;
};

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <ProfileStack.Screen name="Subscription" component={SubscriptionScreen} />
    </ProfileStack.Navigator>
  );
}

export type TabParamList = {
  Jogar: undefined;
  Conquistas: undefined;
  Ranking: undefined;
  Leis: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export function AppTabs() {
  const { isDark, theme } = useAppearance();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 64,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.background,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.purple[600],
        tabBarInactiveTintColor: isDark ? colors.gray[500] : colors.gray[400],
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="Jogar"
        component={PlayStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Gamepad2 size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Conquistas"
        component={DisciplinesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <GraduationCap size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Ranking"
        component={RankingScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Leis"
        component={LegalReferencesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
