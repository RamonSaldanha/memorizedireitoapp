import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gift, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAppearance } from '../hooks/useAppearance';
import { useCountdown } from '../hooks/useCountdown';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useSubscriptionCheckout } from '../hooks/useSubscriptionCheckout';
import { useAuthStore } from '../stores/authStore';
import { ChunkyPressable, ChunkyView } from './onboarding/ChunkyPressable';
import { OVERSHOOT } from './onboarding/motion';
import { tw } from './onboarding/palette';

// Fechar esconde só até o app ser fechado (na web, até a próxima sessão do navegador).
let dismissedThisSession = false;

/**
 * Lembrete da oferta de boas-vindas do onboarding (15% no anual) durante as
 * 24h em que ela vale. Fica logo abaixo do cabeçalho do mapa.
 *
 * Fica sempre montado, mesmo escondido: é ele quem sincroniza o `/me` quando a
 * pessoa volta da página de assinatura aberta pelo fim do onboarding.
 */
export function WelcomeOfferBanner() {
  const { isDark } = useAppearance();
  const reduce = useReduceMotion();
  const offer = useAuthStore((s) => s.user?.welcome_offer ?? null);
  const { openSubscription } = useSubscriptionCheckout();
  const { msLeft, text: countdown } = useCountdown(offer?.expires_at);
  const [dismissed, setDismissed] = useState(dismissedThisSession);

  const visible = !!offer && !dismissed && msLeft > 0;

  // Entrada (`offer-banner-enter`): desce 16px e cresce de .96, com quique.
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    if (reduce) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 500, easing: OVERSHOOT, useNativeDriver: true }).start();
  }, [visible, reduce]);

  // `.offer-gift`: o presente chacoalha a cada 3s.
  const wiggle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible || reduce) return;
    const loop = Animated.loop(
      Animated.timing(wiggle, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
    );
    const timer = setTimeout(() => loop.start(), 1000);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [visible, reduce]);

  const dismiss = () => {
    dismissedThisSession = true;
    if (reduce) {
      setDismissed(true);
      return;
    }
    Animated.timing(enter, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setDismissed(true));
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateRight: 'clamp' }),
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}
    >
      <ChunkyView
        radius={16}
        shadowColor={isDark ? tw.shadowDark : tw.pink200}
        style={[
          styles.card,
          isDark
            ? { borderColor: tw.pink900, backgroundColor: colors.gray[800] }
            : { borderColor: tw.pink200, backgroundColor: '#fff' },
        ]}
      >
        <Animated.View
          style={[
            styles.gift,
            { backgroundColor: isDark ? tw.pink950_60 : tw.pink100 },
            {
              transform: [
                {
                  rotate: wiggle.interpolate({
                    inputRange: [0, 0.82, 0.86, 0.92, 1],
                    outputRange: ['0deg', '0deg', '-10deg', '8deg', '0deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Gift size={20} color={isDark ? tw.pink300 : tw.pink500} />
        </Animated.View>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: isDark ? '#fff' : colors.gray[900] }]}>
            {offer?.percent_off}% off no plano anual
          </Text>
          <Text style={[styles.sub, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
            Termina em{' '}
            <Text style={[styles.countdown, { color: isDark ? tw.pink300 : tw.pink600 }]}>{countdown}</Text>
          </Text>
        </View>
        <ChunkyPressable
          onPress={openSubscription}
          radius={12}
          depth={3}
          shadowColor={tw.green700}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>GARANTIR</Text>
        </ChunkyPressable>
        <Pressable
          onPress={dismiss}
          accessibilityLabel="Fechar lembrete da oferta"
          hitSlop={6}
          style={({ pressed }) => [
            styles.close,
            pressed && { backgroundColor: isDark ? colors.gray[700] : colors.gray[100] },
          ]}
        >
          <X size={16} color={colors.gray[400]} />
        </Pressable>
      </ChunkyView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 8,
  },
  gift: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  sub: {
    fontSize: 14,
    lineHeight: 18,
  },
  countdown: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cta: {
    borderWidth: 2,
    borderColor: tw.green600,
    backgroundColor: tw.green500,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
