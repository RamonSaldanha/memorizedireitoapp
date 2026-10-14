import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle, type AccessibilityRole, type AccessibilityState } from 'react-native';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Cor da sombra sólida (`shadow-[0_Npx_0_cor]`). */
  shadowColor: string;
  /** Altura da sombra em px. Pressionado, o cartão afunda e a cobre. */
  depth?: number;
  radius: number;
  /** Estilo da face: fundo, borda, padding, layout. */
  style?: StyleProp<ViewStyle>;
  /** Estilo do bloco todo (margens, largura, animação de quem está por fora). */
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityLabel?: string;
};

/**
 * Cartão/botão "chunky" do onboarding: a sombra sólida deslocada para baixo
 * (`shadow-[0_4px_0_...]`) e o `active:translate-y-1 active:shadow-none` da web.
 * Mesmo truque do GameButton: a sombra é uma View parada atrás da face.
 */
export function ChunkyPressable({
  children, onPress, disabled, shadowColor, depth = 4, radius, style, containerStyle,
  accessibilityRole = 'button', accessibilityState, accessibilityLabel,
}: Props) {
  const translateY = useRef(new Animated.Value(0)).current;

  const pressIn = useCallback(() => {
    Animated.timing(translateY, { toValue: depth, duration: 80, useNativeDriver: true }).start();
  }, [depth]);

  const pressOut = useCallback(() => {
    Animated.timing(translateY, { toValue: 0, duration: 120, useNativeDriver: true }).start();
  }, []);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      style={[{ paddingBottom: depth }, containerStyle]}
    >
      <View style={[styles.shadow, { top: depth, borderRadius: radius, backgroundColor: shadowColor }]} />
      <Animated.View style={[{ borderRadius: radius, transform: [{ translateY }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

type ViewProps = {
  children?: React.ReactNode;
  shadowColor: string;
  depth?: number;
  radius: number;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

/** A mesma sombra sólida, para o que não é clicável (pílulas, peças, a carta da oferta). */
export function ChunkyView({ children, shadowColor, depth = 4, radius, style, containerStyle }: ViewProps) {
  return (
    <View style={[{ paddingBottom: depth }, containerStyle]}>
      <View style={[styles.shadow, { top: depth, borderRadius: radius, backgroundColor: shadowColor }]} />
      <View style={[{ borderRadius: radius }, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
