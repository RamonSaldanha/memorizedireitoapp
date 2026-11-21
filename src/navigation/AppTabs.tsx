import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Gamepad2, GraduationCap, Trophy, BookOpen, User } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAppearance } from '../hooks/useAppearance';
import { useUserStore } from '../stores/userStore';
import { hasAvatar } from '../lib/avatar';
import { Avatar } from '../components/ui/Avatar';
import { TrailMapScreen } from '../screens/trail/TrailMapScreen';
import { TrailPhaseScreen } from '../screens/trail/TrailPhaseScreen';
import { TrailChallengeScreen } from '../screens/trail/TrailChallengeScreen';
import { TrailExamScreen } from '../screens/trail/TrailExamScreen';
import { NoLivesScreen } from '../screens/play/NoLivesScreen';
import { OfensivaScreen } from '../screens/OfensivaScreen';
import { DisciplinesScreen } from '../screens/DisciplinesScreen';
import { RankingScreen } from '../screens/RankingScreen';
import { PublicProfileScreen } from '../screens/PublicProfileScreen';
import { LegalReferencesScreen } from '../screens/LegalReferencesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen';
import { AvatarEditorScreen } from '../screens/profile/AvatarEditorScreen';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type PlayStackParamList = {
  // O mapa de quadrados (o mesmo do beta da web) e os passos dele: a fase, o desafio do
  // quadrado e o Dia da prova
  PlayMap: undefined;
  NoLives: undefined;
  Ofensiva: undefined;
  TrailPhase: { phaseId: number };
  TrailChallenge: { key: string };
  TrailExam: { key: string };
};

const PlayStack = createNativeStackNavigator<PlayStackParamList>();

function PlayStackNavigator() {
  return (
    <PlayStack.Navigator screenOptions={{ headerShown: false }}>
      <PlayStack.Screen name="PlayMap" component={TrailMapScreen} />
      <PlayStack.Screen name="NoLives" component={NoLivesScreen} />
      <PlayStack.Screen name="Ofensiva" component={OfensivaScreen} />
      <PlayStack.Screen name="TrailPhase" component={TrailPhaseScreen} />
      <PlayStack.Screen name="TrailChallenge" component={TrailChallengeScreen} />
      <PlayStack.Screen name="TrailExam" component={TrailExamScreen} />
    </PlayStack.Navigator>
  );
}

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ChangePassword: undefined;
  AvatarEditor: undefined;
  // O próprio perfil público, como os outros o veem
  PublicProfile: { uuid: string };
};

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <ProfileStack.Screen name="AvatarEditor" component={AvatarEditorScreen} />
      <ProfileStack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </ProfileStack.Navigator>
  );
}

export type RankingStackParamList = {
  RankingMain: undefined;
  PublicProfile: { uuid: string };
};

const RankingStack = createNativeStackNavigator<RankingStackParamList>();

/** Ranking e o perfil público de quem está nele. */
function RankingStackNavigator() {
  return (
    <RankingStack.Navigator screenOptions={{ headerShown: false }}>
      <RankingStack.Screen name="RankingMain" component={RankingScreen} />
      <RankingStack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </RankingStack.Navigator>
  );
}

/**
 * Ícone da aba Perfil: o avatar da pessoa, com anel roxo quando a aba está
 * ativa (transparente fora dela, para o ícone não pular). Quem nunca montou o
 * avatar continua vendo o ícone genérico.
 *
 * A barra desenha o ícone duas vezes, ativo e inativo, e troca uma pela outra
 * com fade — então o anel entra e sai suave.
 */
function ProfileTabIcon({ focused, color }: { focused: boolean; color: string }) {
  const avatarConfig = useUserStore((s) => s.avatarConfig);
  const name = useUserStore((s) => s.name);

  if (!hasAvatar(avatarConfig)) {
    return <User size={26} color={color} />;
  }

  return (
    <View style={{ padding: 1, borderRadius: 999, borderWidth: 2, borderColor: focused ? colors.family.brand : 'transparent' }}>
      <Avatar config={avatarConfig} name={name ?? ''} size={24} />
    </View>
  );
}

export type TabParamList = {
  // A ofensiva fica na pilha do Jogar; o topo de qualquer aba chega nela por aqui
  Jogar: NavigatorScreenParams<PlayStackParamList> | undefined;
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
          height: 72,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.background,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: isDark ? colors.family.brand : colors.family.light.brandSoftInk,
        tabBarInactiveTintColor: isDark ? colors.gray[500] : colors.gray[400],
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="Jogar"
        component={PlayStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <Gamepad2 size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="Conquistas"
        component={DisciplinesScreen}
        options={{
          tabBarIcon: ({ color }) => <GraduationCap size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="Ranking"
        component={RankingStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <Trophy size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="Leis"
        component={LegalReferencesScreen}
        options={{
          tabBarIcon: ({ color }) => <BookOpen size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <ProfileTabIcon focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
