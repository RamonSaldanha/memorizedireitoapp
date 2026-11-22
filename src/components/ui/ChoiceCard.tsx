import React, { useCallback, useRef } from 'react';
import {
  Animated, Pressable, StyleSheet, View,
  type AccessibilityRole, type AccessibilityState, type StyleProp, type ViewStyle,
} from 'react-native';
import { colors, familyTokens, type FamilyTokens } from '../../theme/colors';
import { useAppearance } from '../../hooks/useAppearance';

export type ChoiceState = 'open' | 'selected' | 'right' | 'wrong' | 'dim' | 'premium';

/**
 * Cores do cartão de escolha (.mz-choice do site): contorno e base da mesma cor, que é o que
 * muda com o estado. Neutro, azul escolhido, verde e vermelho na correção, roxo no Premium.
 */
export function choiceLook(state: ChoiceState, t: FamilyTokens) {
  switch (state) {
    case 'selected': return { line: t.choice, bg: t.choiceSoft, key: t.choiceInk, opacity: 1 };
    case 'right': return { line: t.ok, bg: t.okSoft, key: t.okInk, opacity: 1 };
    case 'wrong': return { line: t.bad, bg: t.badSoft, key: t.badInk, opacity: 1 };
    case 'premium': return { line: colors.family.premium, bg: t.tint, key: colors.family.premium, opacity: 1 };
    case 'dim': return { line: t.line, bg: t.face, key: t.muted, opacity: 0.6 };
    default: return { line: t.line, bg: t.face, key: t.muted, opacity: 1 };
  }
}

type Props = {
  children: React.ReactNode;
  state?: ChoiceState;
  onPress?: () => void;
  /** Apertar e segurar (riscar a alternativa, por exemplo). Com ele, soltar depois não conta como toque. */
  onLongPress?: () => void;
  disabled?: boolean;
  radius?: number;
  /** Estilo da face (recuo, direção, alinhamento). */
  style?: StyleProp<ViewStyle>;
  /** Estilo do bloco todo (margens, largura). */
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityLabel?: string;
};

/**
 * Cartão de escolha da família: alternativa, opção do onboarding, plano, item do avatar.
 * Canto de 16, contorno de 2 e base de 4 px na mesma cor; apertar afunda igual em qualquer
 * estado. Sem onPress, é só o desenho (a alternativa corrigida, por exemplo).
 */
export function ChoiceCard({
  children, state = 'open', onPress, onLongPress, disabled, radius = 16, style, containerStyle,
  accessibilityRole = 'button', accessibilityState, accessibilityLabel,
}: Props) {
  const { isDark } = useAppearance();
  const look = choiceLook(state, familyTokens(isDark));
  const translateY = useRef(new Animated.Value(0)).current;
  const depth = 4;

  const pressIn = useCallback(() => {
    Animated.timing(translateY, { toValue: depth, duration: 80, useNativeDriver: true }).start();
  }, []);
  const pressOut = useCallback(() => {
    Animated.timing(translateY, { toValue: 0, duration: 120, useNativeDriver: true }).start();
  }, []);

  const interactive = !!onPress && !disabled;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      onPressIn={interactive ? pressIn : undefined}
      onPressOut={interactive ? pressOut : undefined}
      disabled={!onPress || disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      style={[{ paddingBottom: depth, opacity: look.opacity }, containerStyle]}
    >
      <View style={[styles.base, { top: depth, borderRadius: radius, backgroundColor: look.line }]} />
      <Animated.View
        style={[
          styles.face,
          { borderRadius: radius, borderColor: look.line, backgroundColor: look.bg, transform: [{ translateY }] },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** A letra da alternativa (A, B, C...) num quadradinho com o contorno da cor do estado. */
export function ChoiceKey({ state = 'open', children }: { state?: ChoiceState; children: React.ReactNode }) {
  const { isDark } = useAppearance();
  const look = choiceLook(state, familyTokens(isDark));
  return (
    <View style={[styles.key, { borderColor: look.line }]}>
      <Animated.Text style={[styles.keyText, { color: look.key }]}>{children}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  face: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, paddingHorizontal: 16, paddingVertical: 14 },
  key: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 14, fontWeight: '700' },
});
