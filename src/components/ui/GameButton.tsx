import React, { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors, familyTokens, type FamilyTokens } from '../../theme/colors';
import { useAppearance } from '../../hooks/useAppearance';

/**
 * Botão da família do site (docs/design/componentes.html no projeto web; as classes .mz-* de
 * resources/css/app.css). Mesmas variantes, tamanhos e bases do GameButton da web.
 * - De ação, afundam ao apertar: main (amarelo, um por tela), second (neutro), danger,
 *   success (só acerto) e premium (só Premium e Dia da prova).
 * - Calmos, não afundam: tonal, tonal-brand, tonal-danger, outline, dashed, ghost. Ao apertar
 *   escurecem e ganham uma faixa de 2 px por dentro, em cima ("aperta para dentro").
 * Os nomes antigos continuam valendo: green, purple e blue viram main, white vira second e red
 * vira danger.
 */
export type FamilyVariant =
  | 'main' | 'second' | 'danger' | 'success' | 'premium'
  | 'tonal' | 'tonal-brand' | 'tonal-danger' | 'outline' | 'dashed' | 'ghost';
type LegacyVariant = 'white' | 'green' | 'blue' | 'purple' | 'red';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const LEGACY: Record<LegacyVariant, FamilyVariant> = {
  white: 'second', green: 'main', blue: 'main', purple: 'main', red: 'danger',
};

/** Altura, base, letra, recuo e canto: os mesmos 32/40/48/56 da web. */
export const BUTTON_SIZES: Record<ButtonSize, { height: number; depth: number; fontSize: number; paddingH: number; radius: number }> = {
  xs: { height: 32, depth: 2, fontSize: 13, paddingH: 12, radius: 10 },
  sm: { height: 40, depth: 3, fontSize: 14, paddingH: 16, radius: 12 },
  md: { height: 48, depth: 4, fontSize: 16, paddingH: 20, radius: 12 },
  lg: { height: 56, depth: 4, fontSize: 18, paddingH: 24, radius: 12 },
};

type Look = { face: string; pressedFace?: string; ink: string; edge?: string; line?: string; dashed?: boolean };

export function buttonLook(variant: FamilyVariant, t: FamilyTokens, disabled: boolean): Look & { sinks: boolean } {
  const sinks = variant === 'main' || variant === 'second' || variant === 'danger' || variant === 'success' || variant === 'premium';
  if (disabled) {
    if (sinks) return { sinks, face: t.off, ink: t.offInk, edge: t.offEdge };
    if (variant === 'ghost') return { sinks, face: 'transparent', ink: t.offInk };
    return { sinks, face: t.off, ink: t.offInk };
  }
  const f = colors.family;
  switch (variant) {
    case 'main': return { sinks, face: f.brand, ink: f.brandInk, edge: f.brandEdge };
    case 'danger': return { sinks, face: f.danger, ink: '#ffffff', edge: f.dangerEdge };
    case 'success': return { sinks, face: f.success, ink: '#ffffff', edge: f.successEdge };
    case 'premium': return { sinks, face: f.premium, ink: '#ffffff', edge: f.premiumEdge };
    case 'second': return { sinks, face: t.face, ink: t.ink2, edge: t.edge, line: t.line };
    case 'tonal': return { sinks, face: t.tint, pressedFace: t.tint2, ink: t.ink };
    case 'tonal-brand': return { sinks, face: t.brandSoft, pressedFace: t.brandSoft2, ink: t.brandSoftInk };
    case 'tonal-danger': return { sinks, face: t.dangerSoft, pressedFace: t.dangerSoft2, ink: t.dangerSoftInk };
    case 'outline': return { sinks, face: 'transparent', pressedFace: t.tint2, ink: t.ink, line: t.line };
    case 'dashed': return { sinks, face: 'transparent', pressedFace: t.tint2, ink: t.muted, line: t.line, dashed: true };
    case 'ghost': return { sinks, face: 'transparent', pressedFace: t.tint2, ink: t.muted };
  }
}

type Props = {
  children: React.ReactNode;
  variant?: FamilyVariant | LegacyVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onPress?: () => void;
  /** Estilo da face (largura, alinhamento). Margens vão em containerStyle. */
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
  /** Só ícone: quadrado com a altura do tamanho. */
  square?: boolean;
  /** Canto redondo (chips e o flutuante do mapa). */
  pill?: boolean;
  /** Aceito por compatibilidade; o tema vem do useAppearance. */
  isDark?: boolean;
  accessibilityLabel?: string;
  hitSlop?: number;
};

export function GameButton({
  children, variant = 'second', size = 'md', disabled = false, onPress, style, containerStyle, textStyle,
  fullWidth = false, square = false, pill = false, isDark: isDarkProp, accessibilityLabel, hitSlop,
}: Props) {
  const { isDark: isDarkTheme } = useAppearance();
  const isDark = isDarkProp ?? isDarkTheme;
  const v: FamilyVariant = LEGACY[variant as LegacyVariant] ?? (variant as FamilyVariant);
  const s = BUTTON_SIZES[size];
  const look = buttonLook(v, familyTokens(isDark), disabled);
  const depth = look.sinks ? s.depth : 0;
  const radius = pill ? 999 : s.radius;

  const translateY = useRef(new Animated.Value(0)).current;
  const [pressed, setPressed] = useState(false);

  const pressIn = useCallback(() => {
    setPressed(true);
    if (depth) Animated.timing(translateY, { toValue: depth, duration: 80, useNativeDriver: true }).start();
  }, [depth]);
  const pressOut = useCallback(() => {
    setPressed(false);
    if (depth) Animated.timing(translateY, { toValue: 0, duration: 80, useNativeDriver: true }).start();
  }, [depth]);

  const t = familyTokens(isDark);
  const face = !look.sinks && pressed && look.pressedFace ? look.pressedFace : look.face;

  // Margem, posição e largura vindas em `style` são do bloco todo (face + base), não só da face:
  // senão a face sai de cima da base. O resto (alinhamento, recuo) fica na face.
  const { outer, inner } = splitStyle(style);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[{ paddingBottom: depth }, fullWidth && { width: '100%' }, outer, containerStyle]}
    >
      {depth ? <View style={[styles.base, { top: depth, borderRadius: radius, backgroundColor: look.edge }]} /> : null}
      <Animated.View
        style={[
          styles.face,
          {
            minHeight: s.height,
            paddingHorizontal: square ? 0 : s.paddingH,
            borderRadius: radius,
            backgroundColor: face,
            transform: [{ translateY }],
          },
          square && { width: s.height },
          look.line ? { borderWidth: 2, borderColor: look.line, borderStyle: look.dashed ? 'dashed' : 'solid' } : null,
          inner,
        ]}
      >
        {/* Calmo apertado: faixa escura de 2 px no alto, como uma tecla afundada */}
        {!look.sinks && pressed ? <View pointerEvents="none" style={[styles.press, { borderRadius: radius, borderTopColor: t.press }]} /> : null}
        {typeof children === 'string' ? (
          <Text style={[styles.text, { color: look.ink, fontSize: s.fontSize }, textStyle]}>{children}</Text>
        ) : (
          children
        )}
      </Animated.View>
    </Pressable>
  );
}

const OUTER_KEYS = new Set([
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'position', 'top', 'bottom', 'left', 'right', 'alignSelf', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'width', 'maxWidth', 'minWidth', 'zIndex',
]);

function splitStyle(style: StyleProp<ViewStyle>): { outer: ViewStyle; inner: ViewStyle } {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) (OUTER_KEYS.has(k) ? outer : inner)[k] = v;
  if ('width' in outer) inner.width = '100%';
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

const styles = StyleSheet.create({
  base: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  face: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, overflow: 'hidden' },
  press: { ...StyleSheet.absoluteFillObject, borderTopWidth: 2 },
  text: { fontWeight: '700', textAlign: 'center', letterSpacing: -0.1 },
});
