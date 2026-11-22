import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Flame, Plus, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { colors, familyTokens } from '../../theme/colors';
import { useUserStore } from '../../stores/userStore';
import { useAppearance } from '../../hooks/useAppearance';
import { useSubscriptionCheckout } from '../../hooks/useSubscriptionCheckout';
import { EnergyPill } from '../ui/EnergyPill';
import type { PlayStackParamList, TabParamList } from '../../navigation/AppTabs';

/**
 * O topo de todas as abas, sem caixas (igual à web; docs/design/plus-barra-combo.html, B4):
 * energia, ofensiva, XP em azul e o Plus em magenta, espalhados de ponta a ponta. A ofensiva
 * abre na pilha do Jogar; o Plus abre a página de assinatura do site ("Seja Plus" para quem não
 * assina, o selo "Plus" para quem assina). Sem avatar: o Perfil já está na barra de baixo.
 */
type Nav = CompositeNavigationProp<NativeStackNavigationProp<PlayStackParamList>, BottomTabNavigationProp<TabParamList>>;

export function AppHeader() {
  const { energy, hasInfiniteLives, xp, currentStreak } = useUserStore();
  const { isDark, theme } = useAppearance();
  const t = familyTokens(isDark);
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { openSubscription } = useSubscriptionCheckout();
  const streakColor = currentStreak > 0 ? colors.orange[500] : colors.gray[400];

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      {/* Energia (o mapa novo usa energia no lugar das vidas) */}
      <EnergyPill energy={energy} />

      {/* Ofensiva */}
      <Pressable
        style={styles.item}
        onPress={() => navigation.navigate('Jogar', { screen: 'Ofensiva' })}
        accessibilityRole="button"
        accessibilityLabel={`Ofensiva: ${currentStreak} ${currentStreak === 1 ? 'dia' : 'dias'}`}
        hitSlop={8}
      >
        <Flame size={20} color={streakColor} fill={currentStreak > 0 ? colors.orange[500] : 'transparent'} />
        <Text style={[styles.value, { color: streakColor }]}>{currentStreak}</Text>
      </Pressable>

      {/* XP */}
      <View style={styles.item} accessibilityLabel={`${xp.toLocaleString('pt-BR')} de XP`}>
        <Zap size={20} color={colors.family.xp} fill={colors.family.xp} />
        <Text style={[styles.value, { color: t.xpInk }]}>{xp.toLocaleString('pt-BR')}</Text>
      </View>

      {/* Plus */}
      <Pressable style={styles.item} onPress={openSubscription} accessibilityRole="button" hitSlop={8}>
        <Plus size={17} color={t.plusInk} strokeWidth={3.2} />
        <Text style={[styles.plus, { color: t.plusInk }]}>{hasInfiniteLives ? 'Plus' : 'Seja Plus'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  value: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  plus: { fontSize: 15, fontWeight: '800' },
});
