import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text } from 'react-native';
import { BatteryCharging, InfinityIcon } from 'lucide-react-native';
import type { EnergyState } from '../../api/trail';
import { colors, familyTokens } from '../../theme/colors';
import { useAppearance } from '../../hooks/useAppearance';

// Energia do mapa novo, como o EnergyMeter.vue da web: a bateria com raio (o raio sozinho é
// o XP) e o número. Quem assina vê o infinito; acima da barra cheia (supercarga do Dia da
// prova) fica dourado; zerada fica cinza. `pill` desenha o fundo, como no topo das abas.
// Pulsa quando o valor muda.
export function EnergyPill({ energy, pill = false }: { energy: EnergyState; pill?: boolean }) {
  const { isDark, theme } = useAppearance();
  const t = familyTokens(isDark);
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(energy.value);

  useEffect(() => {
    if (previous.current === energy.value) return;
    previous.current = energy.value;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return;
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 140, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  }, [energy.value]);

  const isSuper = !energy.infinite && energy.value > energy.max;
  const isEmpty = !energy.infinite && energy.value === 0;
  const tone = isEmpty ? colors.gray[400] : isSuper ? '#d97706' : pill ? t.brandSoftInk : theme.foreground;
  const icon = isEmpty || isSuper ? tone : pill ? t.brandSoftInk : colors.family.brandEdge;

  return (
    <Animated.View
      style={[styles.row, pill && [styles.pill, { backgroundColor: isEmpty ? (isDark ? colors.gray[900] : t.tint) : t.brandSoft }], { transform: [{ scale }] }]}
      accessibilityRole="text"
      accessibilityLabel={energy.infinite ? 'Energia infinita' : `${energy.value} de energia`}
    >
      <BatteryCharging size={20} color={icon} />
      {energy.infinite ? (
        <InfinityIcon size={18} color={tone} />
      ) : (
        <Text style={[styles.value, { color: tone }]}>{energy.value}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  value: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
