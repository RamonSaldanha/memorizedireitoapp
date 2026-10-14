import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/colors';
import { ChunkyPressable } from './ChunkyPressable';
import { tw } from './palette';

type Props = {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** `.ob-cta-pulse`: respira devagar para chamar atenção (botão da oferta). */
  pulse?: boolean;
  isDark: boolean;
  reduce: boolean;
};

/**
 * O botão principal do onboarding (`.ob-cta` da web): verde "chunky", largura
 * toda, borda de 4px e sombra de 4px no mesmo verde escuro. Desabilitado, fica
 * cinza.
 */
export function OnboardingCta({ children, onPress, disabled = false, loading = false, pulse = false, isDark, reduce }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse || disabled || reduce) {
      scale.setValue(1);
      return;
    }
    const ease = Easing.bezier(0.42, 0, 0.58, 1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.02, duration: 1200, easing: ease, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1200, easing: ease, useNativeDriver: true }),
      ]),
    );
    const timer = setTimeout(() => loop.start(), 1200);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [pulse, disabled, reduce]);

  const off = isDark
    ? { border: colors.gray[600], bg: colors.gray[700], text: colors.gray[500], shadow: tw.shadowDark }
    : { border: colors.gray[300], bg: colors.gray[200], text: colors.gray[400], shadow: colors.gray[300] };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <ChunkyPressable
        onPress={onPress}
        disabled={disabled}
        radius={8}
        shadowColor={disabled ? off.shadow : tw.green700}
        accessibilityState={{ disabled, busy: loading }}
        style={[
          styles.face,
          disabled
            ? { backgroundColor: off.bg, borderColor: off.border }
            : { backgroundColor: tw.green500, borderColor: tw.green700 },
        ]}
      >
        {loading && <ActivityIndicator size="small" color={disabled ? off.text : '#fff'} />}
        <Text style={[styles.label, { color: disabled ? off.text : '#fff' }]}>{children}</Text>
      </ChunkyPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
  },
});
