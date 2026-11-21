import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Text } from 'react-native';
import { colors } from '../../theme/colors';
import { GameButton } from '../ui/GameButton';

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
 * O botão principal do onboarding: o principal amarelo grande da família, na largura toda.
 * A pulsação mexe só na escala do bloco, então o afundar ao apertar continua valendo.
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

  const ink = disabled ? (isDark ? colors.family.dark.offInk : colors.family.light.offInk) : colors.family.brandInk;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <GameButton variant="main" size="lg" fullWidth disabled={disabled} onPress={onPress}>
        {loading && <ActivityIndicator size="small" color={ink} />}
        <Text style={{ color: ink, fontSize: 18, fontWeight: '700' }}>{children}</Text>
      </GameButton>
    </Animated.View>
  );
}
