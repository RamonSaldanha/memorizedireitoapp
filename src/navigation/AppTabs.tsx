import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { PlayMapScreen } from '../screens/play/PlayMapScreen';
import { PlayPhaseScreen } from '../screens/play/PlayPhaseScreen';
import { DisciplinesScreen } from '../screens/DisciplinesScreen';
import { RankingScreen } from '../screens/RankingScreen';
import { LegalReferencesScreen } from '../screens/LegalReferencesScreen';

export type PlayStackParamList = {
  PlayMap: undefined;
  PlayPhase: { phaseId: number };
};

const PlayStack = createNativeStackNavigator<PlayStackParamList>();

function PlayStackNavigator() {
  return (
    <PlayStack.Navigator screenOptions={{ headerShown: false }}>
      <PlayStack.Screen name="PlayMap" component={PlayMapScreen} />
      <PlayStack.Screen name="PlayPhase" component={PlayPhaseScreen} />
    </PlayStack.Navigator>
  );
}

export type TabParamList = {
  Jogar: undefined;
  Conquistas: undefined;
  Ranking: undefined;
  Leis: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 64,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.purple[600],
        tabBarInactiveTintColor: colors.gray[400],
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tab.Screen name="Jogar" component={PlayStackNavigator} />
      <Tab.Screen name="Conquistas" component={DisciplinesScreen} />
      <Tab.Screen name="Ranking" component={RankingScreen} />
      <Tab.Screen name="Leis" component={LegalReferencesScreen} />
    </Tab.Navigator>
  );
}
