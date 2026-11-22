import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BatteryCharging, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { EnergyCombo } from '../../api/trail';
import { useAppearance } from '../../hooks/useAppearance';
import { familyTokens } from '../../theme/colors';

/**
 * A festa do combo (acertos seguidos na fase e no desafio): a tela pisca, raios cruzam a tela,
 * "COMBO x3" salta no meio com a energia ganha e um raiozinho voa até a bateria do topo; quando
 * ele chega, `onArrive` (a tela credita a energia, e a pílula pula). Cresce com a sequência:
 * x3 amarelo, x6 laranja ("Pegando fogo!"), x9 laranja forte ("Imparável!"). Igual ao web
 * (components/beta-play/ComboBurst.vue). Com "reduzir movimento", só credita.
 */

const AnimatedPath = Animated.createAnimatedComponent(Path);

const BOLT = '#f7d84a';
const TIERS = [
  { c: '#efc12f', e: '#b38c17', bolts: 2, sparks: 0, kick: null },
  { c: '#f59e0b', e: '#b45309', bolts: 3, sparks: 10, kick: 'Pegando fogo!' },
  { c: '#f97316', e: '#c2410c', bolts: 5, sparks: 16, kick: 'Imparável!' },
] as const;
type Tier = (typeof TIERS)[number];
const tierOf = (streak: number): Tier => TIERS[streak >= 9 ? 2 : streak >= 6 ? 1 : 0];

type Bolt = { d: string; len: number };
type Spark = { dx: number; dy: number; rot: number; color: string };
type Run = { id: number; combo: EnergyCombo; tier: Tier; bolts: Bolt[]; sparks: Spark[] };

// Um raio em zigue-zague de cima a baixo da tela
function zigzag(w: number, h: number, i: number, n: number): Bolt {
  const x0 = w * (0.12 + 0.76 * ((i + 0.5) / n)) + (Math.random() - 0.5) * 30;
  const drift = (i % 2 ? -1 : 1) * w * 0.3;
  const segs = 6;
  let prev = { x: x0, y: -30 };
  let d = `M ${x0.toFixed(1)} -30`;
  let len = 0;
  for (let k = 1; k <= segs; k++) {
    const y = -30 + ((h + 60) * k) / segs;
    const x = x0 + (drift * k) / segs + (k % 2 ? 1 : -1) * (20 + Math.random() * 24);
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    len += Math.hypot(x - prev.x, y - prev.y);
    prev = { x, y };
  }
  return { d, len };
}

/** Texto grosso com contorno só por fora (cópias deslocadas atrás) e a base 3D embaixo */
function OutlinedWord({ text, size, c, e }: { text: string; size: number; c: string; e: string }) {
  const d = Math.max(2, Math.round(size * 0.07));
  const depth = Math.round(size * 0.08);
  const k = d * 0.7;
  const ring = [[-d, 0], [d, 0], [0, -d], [0, d], [-k, -k], [k, -k], [-k, k], [k, k]];
  const base = { fontSize: size, fontWeight: '900' as const, letterSpacing: 1, lineHeight: Math.round(size * 1.15) };
  const copies = [...ring.map(([x, y]) => [x, y + depth]), ...ring];
  return (
    <View>
      {copies.map(([x, y], i) => (
        <Text key={i} style={[base, styles.copy, { color: e, transform: [{ translateX: x }, { translateY: y }] }]}>
          {text}
        </Text>
      ))}
      <Text style={[base, { color: c }]}>{text}</Text>
    </View>
  );
}

export function ComboBurst({ combo, onArrive }: { combo: EnergyCombo | null; onArrive?: () => void }) {
  const { isDark } = useAppearance();
  const t = familyTokens(isDark);
  const insets = useSafeAreaInsets();
  const ref = useRef<View>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const originY = useRef(0);
  const [run, setRun] = useState<Run | null>(null);
  const arrive = useRef(onArrive);
  arrive.current = onArrive;

  const flash = useRef(new Animated.Value(0)).current;
  const draw = useRef(new Animated.Value(0)).current;
  const boltFade = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;
  const fly = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!combo) return;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive) return;
      if (reduce || !size.w) {
        arrive.current?.();
        return;
      }
      const tier = tierOf(combo.streak);
      const bolts = Array.from({ length: tier.bolts }, (_, i) => zigzag(size.w, size.h, i, tier.bolts));
      const sparks = Array.from({ length: tier.sparks }, (_, i) => {
        const a = (Math.PI * 2 * i) / tier.sparks + Math.random() * 0.5;
        const dist = 120 * (0.6 + Math.random() * 0.6);
        return { dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, rot: 180 + Math.random() * 180, color: i % 3 === 0 ? '#2b8a52' : i % 2 ? tier.c : BOLT };
      });
      [flash, draw, pop, out, fly, burst].forEach((v) => v.setValue(0));
      boltFade.setValue(1);
      setRun({ id: Date.now(), combo, tier, bolts, sparks });

      Animated.parallel([
        Animated.sequence([
          Animated.timing(flash, { toValue: 0.9, duration: 130, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 390, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.timing(draw, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(boltFade, { toValue: 0, duration: 600, delay: 380, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 1, duration: 900, easing: Easing.bezier(0.2, 0.8, 0.3, 1), useNativeDriver: true }),
        Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ]).start(() => {
        if (!alive) return;
        Animated.sequence([
          Animated.delay(450),
          Animated.parallel([
            Animated.timing(out, { toValue: 1, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            Animated.timing(fly, { toValue: 1, duration: 620, easing: Easing.bezier(0.5, 0, 0.3, 1), useNativeDriver: true }),
          ]),
        ]).start(({ finished }) => {
          if (!alive) return;
          if (finished) arrive.current?.();
          setRun(null);
        });
      });
    });
    return () => {
      alive = false;
    };
  }, [combo]);

  const { w, h } = size;
  const cy = h * 0.42;
  // De onde o raiozinho sai (o ganho de energia, no meio) e para onde vai (a bateria do topo,
  // à direita da barra de progresso: TrailTopBar)
  const from = { x: w / 2, y: cy + 40 };
  const to = { x: w - 36, y: insets.top + 32 - originY.current };
  const mid = { x: (from.x + to.x) / 2 + 30, y: to.y + (from.y - to.y) * 0.25 };

  return (
    <View
      ref={ref}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => {
        setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
        ref.current?.measureInWindow((_x, y) => {
          originY.current = y;
        });
      }}
    >
      {run ? (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#4a4019' : '#fff4c2', opacity: flash }]} />

          <Animated.View style={[StyleSheet.absoluteFill, { opacity: boltFade }]}>
            <Svg width={w} height={h}>
              {run.bolts.map((bolt, i) => {
                const start = (i * 0.12) / Math.max(1, run.bolts.length - 1);
                const offset = draw.interpolate({ inputRange: [start, Math.min(1, start + 0.55)], outputRange: [bolt.len, 0], extrapolate: 'clamp' });
                return (
                  <React.Fragment key={i}>
                    <AnimatedPath d={bolt.d} fill="none" stroke={run.tier.e} strokeOpacity={0.3} strokeWidth={22} strokeLinejoin="miter" strokeDasharray={[bolt.len, bolt.len]} strokeDashoffset={offset} />
                    <AnimatedPath d={bolt.d} fill="none" stroke={BOLT} strokeOpacity={0.95} strokeWidth={14} strokeLinejoin="miter" strokeDasharray={[bolt.len, bolt.len]} strokeDashoffset={offset} />
                  </React.Fragment>
                );
              })}
            </Svg>
          </Animated.View>

          {run.sparks.map((s, i) => (
            <Animated.View
              key={i}
              style={[
                styles.spark,
                {
                  left: w / 2 - 4,
                  top: cy - 4,
                  backgroundColor: s.color,
                  opacity: burst.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                  transform: [
                    { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, s.dx] }) },
                    { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, s.dy] }) },
                    { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${s.rot}deg`] }) },
                    { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) },
                  ],
                },
              ]}
            />
          ))}

          <Animated.View
            style={[
              styles.center,
              {
                top: cy - 70,
                opacity: Animated.multiply(
                  pop.interpolate({ inputRange: [0, 0.5], outputRange: [0, 1], extrapolate: 'clamp' }),
                  out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                ),
                transform: [
                  { translateY: out.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
                  { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                  { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '0deg'] }) },
                ],
              },
            ]}
          >
            {run.tier.kick ? <Text style={[styles.kick, { color: run.tier.e }]}>{run.tier.kick}</Text> : null}
            <OutlinedWord text={`COMBO x${run.combo.streak}`} size={run.combo.streak >= 9 ? 48 : 44} c={run.tier.c} e={run.tier.e} />
            {run.combo.gained > 0 ? (
              <View style={[styles.gain, { backgroundColor: t.brandSoft }]}>
                <BatteryCharging size={18} color={t.brandSoftInk} />
                <Text style={[styles.gainText, { color: t.brandSoftInk }]}>+{run.combo.gained} de energia</Text>
              </View>
            ) : null}
          </Animated.View>

          <Animated.View
            style={[
              styles.flyer,
              {
                opacity: fly.interpolate({ inputRange: [0, 0.01, 0.9, 1], outputRange: [0, 1, 1, 0.2] }),
                transform: [
                  { translateX: fly.interpolate({ inputRange: [0, 0.5, 1], outputRange: [from.x - 15, mid.x - 15, to.x - 15] }) },
                  { translateY: fly.interpolate({ inputRange: [0, 0.5, 1], outputRange: [from.y - 15, mid.y - 15, to.y - 15] }) },
                  { scale: fly.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1.5, 1.1, 0.5] }) },
                ],
              },
            ]}
          >
            <Zap size={30} color="#b38c17" fill="#efc12f" />
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { position: 'absolute', left: 0, top: 0 },
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 10 },
  kick: { fontSize: 18, fontWeight: '900' },
  gain: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingLeft: 8, paddingRight: 12, paddingVertical: 4 },
  gainText: { fontSize: 15, fontWeight: '900' },
  spark: { position: 'absolute', width: 9, height: 9, borderRadius: 2 },
  flyer: { position: 'absolute', left: 0, top: 0, width: 30, height: 30 },
});
