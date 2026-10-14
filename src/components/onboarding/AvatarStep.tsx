import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Glasses, Palette, Shirt, Sparkles } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { Avatar } from '../ui/Avatar';
import { DEMO_AVATARS } from '../../lib/onboarding/demoAvatars';
import { ChunkyView } from './ChunkyPressable';
import { Float, OVERSHOOT, Rise } from './motion';
import { opaqueTint, type ObTheme } from './palette';

type Props = {
  isDark: boolean;
  theme: ObTheme;
  reduce: boolean;
};

const AVATAR_NAMES = Object.keys(DEMO_AVATARS);
const STAGE = 192;
const AVATAR = STAGE - 16;

const PIECES: { icon: typeof Shirt; tint: string; position: ViewStyle }[] = [
  { icon: Shirt, tint: 'blue', position: { left: -24, top: 24 } },
  { icon: Glasses, tint: 'purple', position: { right: -28, top: 56 } },
  { icon: Palette, tint: 'orange', position: { left: -16, bottom: 16 } },
  { icon: Sparkles, tint: 'pink', position: { right: -12, bottom: 0 } },
];

/**
 * `.ob-swap`: os avatares ficam todos empilhados e só o da vez aparece. O que
 * sai gira para um lado (scale .85, 8°) e o que entra vem dele.
 */
function SwapAvatar({ name, current, reduce }: { name: string; current: boolean; reduce: boolean }) {
  const t = useRef(new Animated.Value(current ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) {
      t.setValue(current ? 1 : 0);
      return;
    }
    Animated.timing(t, { toValue: current ? 1 : 0, duration: 350, easing: OVERSHOOT, useNativeDriver: true }).start();
  }, [current, reduce]);

  return (
    <Animated.View
      accessibilityElementsHidden={!current}
      importantForAccessibility={current ? 'auto' : 'no-hide-descendants'}
      style={[
        styles.swap,
        {
          opacity: t.interpolate({ inputRange: [0, 0.57, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['8deg', '0deg'] }) },
          ],
        },
      ]}
    >
      <Avatar config={DEMO_AVATARS[name]} name={name} size={AVATAR} />
    </Animated.View>
  );
}

/** 7. O avatar: os personagens trocando de visual, e as peças do editor em volta. */
export function AvatarStep({ isDark, theme, reduce }: Props) {
  const [avatarIndex, setAvatarIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setAvatarIndex((i) => (i + 1) % AVATAR_NAMES.length), 1500);
    return () => clearInterval(timer);
  }, [reduce]);

  return (
    <View style={styles.section}>
      <View style={styles.stage}>
        <View style={[StyleSheet.absoluteFill, styles.disc, { backgroundColor: isDark ? colors.gray[800] : colors.gray[100] }]} />
        {AVATAR_NAMES.map((name, i) => (
          <SwapAvatar key={name} name={name} current={i === avatarIndex} reduce={reduce} />
        ))}
        {PIECES.map((piece, i) => {
          const t = opaqueTint(piece.tint, isDark);
          const Icon = piece.icon;
          return (
            <Float key={i} reduce={reduce} delay={200 + i * 150} style={[styles.piece, piece.position]}>
              <ChunkyView
                radius={16}
                shadowColor={theme.shadow}
                style={[styles.pieceFace, { backgroundColor: t.bg, borderColor: isDark ? colors.gray[900] : '#fff' }]}
              >
                <Icon size={20} color={t.fg} />
              </ChunkyView>
            </Float>
          );
        })}
      </View>

      <Rise index={1} reduce={reduce}>
        <Text style={[styles.title, { color: theme.text }]}>Seu avatar te espera</Text>
      </Rise>
      <Rise index={2} reduce={reduce}>
        <Text style={[styles.lead, { color: theme.muted }]}>
          Cabelo, roupa, óculos e cores. Monte o seu no perfil quando quiser e apareça no ranking com a sua cara.
        </Text>
      </Rise>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  stage: {
    width: STAGE,
    height: STAGE,
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    borderRadius: STAGE / 2,
  },
  swap: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  piece: {
    position: 'absolute',
  },
  pieceFace: {
    width: 44,
    height: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.75,
    textAlign: 'center',
  },
  lead: {
    marginTop: 12,
    maxWidth: 384,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
