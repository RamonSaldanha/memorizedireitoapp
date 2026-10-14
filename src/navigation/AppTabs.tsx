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
import { PlayMapScreen } from '../screens/play/PlayMapScreen';
import { PlayPhaseScreen } from '../screens/play/PlayPhaseScreen';
import { NoLivesScreen } from '../screens/play/NoLivesScreen';
import { OfensivaScreen } from '../screens/OfensivaScreen';
import { DisciplinesScreen } from '../screens/DisciplinesScreen';
import { RankingScreen } from '../screens/RankingScreen';
import { LegalReferencesScreen } from '../screens/LegalReferencesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen';
import { AvatarEditorScreen } from '../screens/profile/AvatarEditorScreen';

export type PlayStackParamList = {
  PlayMap: undefined;
  PlayPhase: { phaseId: number };
  NoLives: undefined;
  Ofensiva: undefined;
};

const PlayStack = createNativeStackNavigator<PlayStackParamList>();

function PlayStackNavigator() {
  return (
    <PlayStack.Navigator screenOptions={{ headerShown: false }}>
      <PlayStack.Screen name="PlayMap" component={PlayMapScreen} />
      <PlayStack.Screen name="PlayPhase" component={PlayPhaseScreen} />
      <PlayStack.Screen name="NoLives" component={NoLivesScreen} />
      <PlayStack.Screen name="Ofensiva" component={OfensivaScreen} />
    </PlayStack.Navigator>
  );
}

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ChangePassword: undefined;
  AvatarEditor: undefined;
};

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <ProfileStack.Screen name="AvatarEditor" component={AvatarEditorScreen} />
    </ProfileStack.Navigator>
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
    <View style={{ padding: 1, borderRadius: 999, borderWidth: 2, borderColor: focused ? colors.purple[600] : 'transparent' }}>
      <Avatar config={avatarConfig} name={name ?? ''} size={24} />
    </View>
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
          height: 72,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.background,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.purple[600],
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
        component={RankingScreen}
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
