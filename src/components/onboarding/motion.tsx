import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

/**
 * As animações do onboarding da web (`<style>` do `Onboarding/Index.vue`),
 * com o `Animated` do RN. Mesmas curvas, durações e atrasos. Com "reduzir
 * movimento" ligado, tudo já nasce no estado final, como o
 * `prefers-reduced-motion` da web.
 */

/** cubic-bezier(0.34, 1.56, 0.64, 1): a curva com "quique" de quase tudo. */
export const OVERSHOOT = Easing.bezier(0.34, 1.56, 0.64, 1);
/** cubic-bezier(0.34, 1.8, 0.64, 1): o pop mais forte (check, peças flutuando). */
export const OVERSHOOT_STRONG = Easing.bezier(0.34, 1.8, 0.64, 1);
/** cubic-bezier(0.34, 1.2, 0.64, 1): a troca de tela. */
export const OVERSHOOT_SOFT = Easing.bezier(0.34, 1.2, 0.64, 1);
const EASE_IN_OUT = Easing.bezier(0.42, 0, 0.58, 1);

/** Um valor que vai de 0 a 1 ao montar, depois de `delay` (o `backwards` do CSS). */
export function useEntrance(duration: number, delay: number, easing: (t: number) => number, reduce: boolean) {
  const value = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) {
      value.setValue(1);
      return;
    }
    const anim = Animated.timing(value, { toValue: 1, duration, delay, easing, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [reduce]);

  return value;
}

/** Um vai e volta sem fim (`ease-in-out infinite`), começando depois de `delay`. */
export function useLoop(duration: number, delay: number, reduce: boolean) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: duration / 2, easing: EASE_IN_OUT, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: duration / 2, easing: EASE_IN_OUT, useNativeDriver: true }),
      ]),
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [reduce]);

  return value;
}

type WrapperProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  reduce: boolean;
};

/** `.ob-rise`: sobe 18px e cresce de .97, em cascata (70ms por item + 120ms). */
export function Rise({ children, style, reduce, index = 0 }: WrapperProps & { index?: number }) {
  const t = useEntrance(500, index * 70 + 120, OVERSHOOT, reduce);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateRight: 'clamp' }),
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** `.ob-bubble`: o balão do guia abre a partir do canto de baixo à esquerda. */
export function Bubble({ children, style, reduce }: WrapperProps) {
  const t = useEntrance(450, 50, OVERSHOOT, reduce);
  return (
    <Animated.View
      style={[
        style,
        {
          transformOrigin: 'left bottom',
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateRight: 'clamp' }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** `.ob-drop`: as leis da trilha caem no lugar, uma depois da outra. */
export function Drop({ children, style, reduce, index = 0 }: WrapperProps & { index?: number }) {
  const t = useEntrance(550, index * 90 + 200, OVERSHOOT, reduce);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateRight: 'clamp' }),
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** `.ob-bob`: o guia flutuando devagar na tela de boas-vindas. */
export function Bob({ children, style, reduce }: WrapperProps) {
  const t = useLoop(3200, 0, reduce);
  return (
    <Animated.View
      style={[style, { transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

/** `.ob-float`: aparece com um pop e fica pairando, levemente inclinado. */
export function Float({ children, style, reduce, delay = 0 }: WrapperProps & { delay?: number }) {
  const pop = useEntrance(500, delay, OVERSHOOT_STRONG, reduce);
  const hover = useLoop(3000, delay + 500, reduce);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: pop.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateRight: 'clamp' }),
          transform: [
            { translateY: hover.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
            { rotate: hover.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-3deg'] }) },
            { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** `.ob-gift`: o presente aparece e de tempos em tempos dá uma chacoalhada. */
export function Wiggle({ children, style, reduce, popDelay = 200, wiggleDelay = 1200, period = 2800 }: WrapperProps & {
  popDelay?: number;
  wiggleDelay?: number;
  period?: number;
}) {
  const pop = useEntrance(500, popDelay, OVERSHOOT_STRONG, reduce);
  const wiggle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.timing(wiggle, { toValue: 1, duration: period, easing: Easing.linear, useNativeDriver: true }),
    );
    const timer = setTimeout(() => loop.start(), wiggleDelay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [reduce]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: pop.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateRight: 'clamp' }),
          transform: [
            { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
            {
              rotate: wiggle.interpolate({
                inputRange: [0, 0.8, 0.85, 0.9, 0.95, 1],
                outputRange: ['0deg', '0deg', '-10deg', '8deg', '-4deg', '0deg'],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** `.ob-check`: o check da alternativa escolhida gira e cresce do nada. */
export function CheckPop({ children, style, reduce }: WrapperProps) {
  const t = useEntrance(400, 0, OVERSHOOT_STRONG, reduce);
  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { scale: t },
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-45deg', '0deg'] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** `.ob-stamp`: o carimbo do desconto cai na carta já torto (-12°). */
export function Stamp({ children, style, reduce }: WrapperProps) {
  const t = useEntrance(600, 600, OVERSHOOT, reduce);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateRight: 'clamp' }),
          transform: [
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) },
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '-12deg'] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * `.ob-option[aria-checked='true']`: a alternativa marcada dá um "pulo" (1.03)
 * no momento em que é escolhida.
 */
export function usePicked(picked: boolean, reduce: boolean) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!picked || reduce) return;
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.03, duration: 140, easing: OVERSHOOT, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 210, easing: OVERSHOOT, useNativeDriver: true }),
    ]).start();
  }, [picked, reduce]);

  return scale;
}
