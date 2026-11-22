import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Gem, Flame } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { colors } from '../../theme/colors';
import { useUserStore } from '../../stores/userStore';
import { useAppearance } from '../../hooks/useAppearance';
import { Avatar } from '../ui/Avatar';
import { EnergyPill } from '../ui/EnergyPill';
import type { PlayStackParamList, TabParamList } from '../../navigation/AppTabs';

// O topo aparece em todas as abas, como o cabeçalho da web: a ofensiva abre na pilha do Jogar e o avatar leva ao Perfil.
type Nav = CompositeNavigationProp<NativeStackNavigationProp<PlayStackParamList>, BottomTabNavigationProp<TabParamList>>;

export function AppHeader() {
  const { energy, hasInfiniteLives, xp, currentStreak, name, avatarConfig } = useUserStore();
  const { isDark, theme } = useAppearance();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      {/* Energia (o mapa novo usa energia no lugar das vidas) */}
      <EnergyPill energy={energy} pill />

      {/* Ofensiva (streak) */}
      <Pressable
        style={[styles.pill, { backgroundColor: isDark ? colors.gray[900] : colors.orange[50] }]}
        onPress={() => navigation.navigate('Jogar', { screen: 'Ofensiva' })}
      >
        <Flame
          size={20}
          color={currentStreak > 0 ? colors.orange[500] : colors.gray[400]}
          fill={currentStreak > 0 ? colors.orange[500] : 'transparent'}
        />
        <Text style={[styles.pillText, { color: currentStreak > 0 ? colors.orange[500] : colors.gray[400] }]}>
          {currentStreak}
        </Text>
      </Pressable>

      {/* XP badge-style */}
      <View style={styles.xpRow}>
        <View style={[styles.xpBadge, { backgroundColor: isDark ? colors.family.dark.brandSoft : colors.family.light.brandSoft }]}>
          <Text style={[styles.xpBadgeText, { color: isDark ? colors.family.dark.brandSoftInk : colors.family.light.brandSoftInk }]}>XP</Text>
        </View>
        <Text style={[styles.xpValue, { color: isDark ? colors.family.brand : colors.family.light.brandSoftInk }]}>{xp.toLocaleString('pt-BR')}</Text>
      </View>

      {/* Gema (energia infinita) */}
      {!hasInfiniteLives && (
        <Pressable style={styles.gemButton}>
          <Gem size={24} color={colors.blue[500]} />
        </Pressable>
      )}

      {/* Avatar, na ponta direita como no menu do topo da web; leva ao perfil */}
      <Pressable
        style={styles.avatarButton}
        onPress={() => navigation.navigate('Perfil')}
        accessibilityRole="button"
        accessibilityLabel="Abrir perfil"
      >
        <Avatar config={avatarConfig} name={name ?? ''} size={32} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pillText: { fontSize: 14, fontWeight: '700' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  xpBadgeText: { fontSize: 12, fontWeight: '700' },
  xpValue: { fontSize: 15, fontWeight: '700' },
  gemButton: { padding: 4 },
  avatarButton: { marginLeft: 'auto' },
});
