import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppearance } from '../../hooks/useAppearance';
import { colors, familyTokens } from '../../theme/colors';

/**
 * Peças das telas que oferecem o Premium no jogo (o convite do fim de fase e a tela sem
 * energia), iguais às do web (components/beta-preview/PremiumYearly.vue e o marca-texto do
 * título).
 */

// Preço do anual: R$ 107,91 (R$ 8,99/mês, 25% abaixo de 12x o mensal de R$ 11,99). Igual ao
// web (resources/js/lib/premium.ts).
export const YEARLY = 'R$ 107,91';
export const YEARLY_PER_MONTH = 'R$ 8,99';
export const DISCOUNT = '-25%';

// Azul do Premium: o do mapa (blue-500), com a base no blue-700
const BLUE = '#3b82f6';
const BLUE_EDGE = '#1d4ed8';

/** O anual como cartão escolhido: azul, com base, e a etiqueta do desconto suspensa na borda. */
export function YearlyPlan({ line }: { line?: string }) {
  const { isDark } = useAppearance();
  const t = familyTokens(isDark);
  const fg = isDark ? colors.dark.foreground : colors.foreground;
  const muted = isDark ? colors.dark.mutedForeground : colors.mutedForeground;

  return (
    <View style={[styles.planBase, { backgroundColor: BLUE }]}>
      <View style={[styles.plan, { borderColor: BLUE, backgroundColor: t.choiceSoft }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.planName, { color: fg }]}>Premium anual</Text>
          <Text style={[styles.planLine, { color: muted }]}>{line ?? `${YEARLY_PER_MONTH} por mês`}</Text>
        </View>
        <Text style={[styles.planPrice, { color: fg }]}>{YEARLY}</Text>
      </View>
      <View style={[styles.tag, { backgroundColor: BLUE }]}>
        <Text style={styles.tagText}>{DISCOUNT}</Text>
      </View>
    </View>
  );
}

/** Botão azul do Premium: face no azul do mapa e base no azul escuro, afunda ao tocar */
export function BlueButton({ label, onPress }: { label: string; onPress: () => void }) {
  const depth = 4;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ marginTop: 16 }}>
      {({ pressed }) => (
        <View style={[styles.blueBase, { backgroundColor: BLUE_EDGE, paddingBottom: pressed ? 0 : depth, marginTop: pressed ? depth : 0 }]}>
          <View style={[styles.blueFace, { backgroundColor: pressed ? '#2563eb' : BLUE }]}>
            <Text style={styles.blueText}>{label}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

/** Palavra com o traço de marca-texto embaixo, que passa da esquerda para a direita */
export function Marked({ text, fontSize, color, delay, fadeIn = false }: { text: string; fontSize: number; color: string; delay: number; fadeIn?: boolean }) {
  const { isDark } = useAppearance();
  const swipe = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(fadeIn ? 0 : 1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) {
        swipe.setValue(1);
        enter.setValue(1);
        return;
      }
      Animated.timing(enter, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(swipe, { toValue: 1, duration: 420, delay, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
    });
  }, []);

  return (
    <Animated.View
      style={{
        alignSelf: 'center',
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: -4,
          right: -4,
          bottom: fontSize * 0.12,
          height: fontSize * 0.42,
          borderRadius: 3,
          backgroundColor: familyTokens(isDark).brandMark,
          transformOrigin: 'left',
          transform: [{ scaleX: swipe }],
        }}
      />
      <Text style={{ fontSize, fontWeight: '800', color, lineHeight: fontSize * 1.2 }}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  planBase: { borderRadius: 16, paddingBottom: 4 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, borderWidth: 2 },
  planName: { fontSize: 16, fontWeight: '800' },
  planLine: { fontSize: 14 },
  planPrice: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tag: { position: 'absolute', top: -10, right: 16, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  tagText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  blueBase: { borderRadius: 12 },
  blueFace: { height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  blueText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
