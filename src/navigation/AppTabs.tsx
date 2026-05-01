import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';

export type PlayStackParamList = {
  PlayMap: undefined;
  PlayPhase: { phaseId: number };
};

const PlayStack = createNativeStackNavigator<PlayStackParamList>();

function PlaceholderScreen({ title }: { title: string }) {
  const { logout } = useAuthStore();
  const { lives, xp, hasInfiniteLives } = useUserStore();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '800' }}>{title}</Text>
      <Text>Vidas: {hasInfiniteLives ? '∞' : lives} | XP: {xp}</Text>
      <Pressable
        onPress={logout}
        style={{ backgroundColor: '#ef4444', padding: 12, borderRadius: 8, marginTop: 24 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Sair</Text>
      </Pressable>
    </View>
  );
}

function PlayStackNavigator() {
  return (
    <PlayStack.Navigator screenOptions={{ headerShown: false }}>
      <PlayStack.Screen name="PlayMap">
        {() => <PlaceholderScreen title="Jogar" />}
      </PlayStack.Screen>
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
      <Tab.Screen name="Conquistas">
        {() => <PlaceholderScreen title="Conquistas" />}
      </Tab.Screen>
      <Tab.Screen name="Ranking">
        {() => <PlaceholderScreen title="Ranking" />}
      </Tab.Screen>
      <Tab.Screen name="Leis">
        {() => <PlaceholderScreen title="Leis" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
