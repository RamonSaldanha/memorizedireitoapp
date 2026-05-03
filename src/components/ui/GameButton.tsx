import React, { useRef, useCallback } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, Animated, View } from 'react-native';
import { colors } from '../../theme/colors';

type Variant = 'white' | 'green' | 'blue' | 'purple' | 'red';
type Size = 'sm' | 'md' | 'lg';

const VARIANT_STYLES: Record<Variant, { bg: string; border: string; text: string; shadow: string }> = {
  white:  { bg: '#ffffff',          border: colors.gray[300],   text: colors.gray[800], shadow: colors.gray[300] },
  green:  { bg: colors.green[500],  border: colors.green[700],  text: '#ffffff',         shadow: colors.green[700] },
  blue:   { bg: colors.blue[500],   border: colors.blue[700],   text: '#ffffff',         shadow: colors.blue[700] },
  purple: { bg: colors.purple[500], border: colors.purple[700], text: '#ffffff',         shadow: colors.purple[700] },
  red:    { bg: colors.red[500],    border: colors.red[700],    text: '#ffffff',         shadow: colors.red[700] },
};

const SIZE_STYLES: Record<Size, { paddingH: number; paddingV: number; fontSize: number }> = {
  sm: { paddingH: 12, paddingV: 6,  fontSize: 13 },
  md: { paddingH: 16, paddingV: 10, fontSize: 15 },
  lg: { paddingH: 24, paddingV: 14, fontSize: 17 },
};

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  isDark?: boolean;
};

export function GameButton({
  children, variant = 'white', size = 'md', disabled = false,
  onPress, style, textStyle, fullWidth = false, isDark = false,
}: Props) {
  const translateY = useRef(new Animated.Value(0)).current;
  const baseVariant = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  // Ajusta o variant "white" para dark mode
  let v = baseVariant;
  if (isDark && variant === 'white') {
    v = {
      bg: colors.gray[800],
      border: colors.gray[600],
      text: colors.gray[200],
      shadow: colors.gray[600],
    };
  }

  const pressIn = useCallback(() => {
    Animated.timing(translateY, { toValue: 5, duration: 80, useNativeDriver: true }).start();
  }, []);

  const pressOut = useCallback(() => {
    Animated.timing(translateY, { toValue: 0, duration: 80, useNativeDriver: true }).start();
  }, []);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      style={fullWidth ? { width: '100%' } : undefined}
    >
      {/* Sombra 3D: View estática abaixo do botão (box-shadow: 0 6px 0 color) */}
      <View style={[
        styles.shadow,
        { backgroundColor: disabled ? colors.gray[600] : v.shadow },
        style,
      ]} />

      {/* Botão principal animado */}
      <Animated.View style={[
        styles.btn,
        {
          backgroundColor: disabled ? colors.gray[400] : v.bg,
          borderColor: disabled ? colors.gray[600] : v.border,
          paddingHorizontal: s.paddingH,
          paddingVertical: s.paddingV,
          transform: [{ translateY }],
        },
        style,
      ]}>
        {typeof children === 'string' ? (
          <Text style={[styles.text, { color: disabled ? '#ffffff' : v.text, fontSize: s.fontSize }, textStyle]}>
            {children}
          </Text>
        ) : (
          children
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    top: 6,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 8,
  },
  btn: {
    borderRadius: 8,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6, // box-shadow: 0 6px 0 color (espaço sólido inferior)
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
