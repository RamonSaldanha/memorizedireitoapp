import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  Check, Lock, BookOpen, FileText, Bookmark, Star, RefreshCw, CheckCircle,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { Phase } from '../../api/play';

// Tamanhos idênticos à versão web
const SIZES = {
  current: 90,
  complete: 64,
  blocked: 58,
  default: 62,
} as const;

// Ícones rotativos por fase (igual ao web: Book, FileText, Bookmark, Star, CheckCircle)
const ROTATING_ICONS = [BookOpen, FileText, Bookmark, Star, CheckCircle];

function getPhaseSize(phase: Phase): keyof typeof SIZES {
  if (phase.is_current) return 'current';
  if (phase.is_complete) return 'complete';
  if (phase.is_blocked) return 'blocked';
  return 'default';
}

function getPhaseIcon(phaseId: number) {
  return ROTATING_ICONS[(phaseId - 1) % ROTATING_ICONS.length];
}

type Props = {
  phase: Phase;
  onPress?: () => void;
  isDark?: boolean;
};

export function PhaseCircle({ phase, onPress, isDark = false }: Props) {
  const sizeKey = getPhaseSize(phase);
  const outerSize = SIZES[sizeKey];
  const isClickable = !phase.is_blocked;

  // Para fase atual: anel de progresso
  const progressRadius = 44;
  const progressCircumference = 2 * Math.PI * progressRadius;
  const progressPercentage = phase.progress?.percentage ?? 0;
  const progressOffset = progressCircumference * (1 - progressPercentage / 100);

  const InnerIcon = phase.is_current
    ? null // Play é SVG custom
    : phase.is_complete
    ? Check
    : phase.is_blocked
    ? Lock
    : getPhaseIcon(phase.id);

  return (
    <Pressable onPress={onPress} disabled={!isClickable} style={styles.pressable}>
      <View style={[styles.container, { width: outerSize, height: outerSize }]}>
        {/* === FASE ATUAL === */}
        {phase.is_current && (
          <>
            {/* Anel de progresso SVG */}
            <Svg
              width={outerSize}
              height={outerSize}
              viewBox="0 0 100 100"
              style={styles.progressRing}
            >
              {/* Track cinza */}
              <Circle
                cx="50"
                cy="50"
                r={progressRadius}
                fill="none"
                stroke={isDark ? colors.gray[700] : colors.gray[200]}
                strokeWidth="7"
              />
              {/* Progresso azul */}
              <Circle
                cx="50"
                cy="50"
                r={progressRadius}
                fill="none"
                stroke={colors.blue[500]}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={progressCircumference}
                strokeDashoffset={progressOffset}
                transform="rotate(-90 50 50)"
              />
            </Svg>

            {/* Base 3D sólida abaixo do círculo */}
            <View
              style={[
                styles.currentBase,
                {
                  width: outerSize * 0.68,
                  height: outerSize * 0.68,
                  borderRadius: (outerSize * 0.68) / 2,
                },
              ]}
            />

            {/* Círculo azul interno */}
            <View
              style={[
                styles.currentInner,
                {
                  width: outerSize * 0.68,
                  height: outerSize * 0.68,
                  borderRadius: (outerSize * 0.68) / 2,
                },
              ]}
            >
              {/* Ícone play (triângulo) */}
              <Svg width={26} height={26} viewBox="0 0 24 24" style={{ marginLeft: 2 }}>
                <Path d="M8 5v14l11-7z" fill="#ffffff" />
              </Svg>
            </View>
          </>
        )}

        {/* === FASE COMPLETA === */}
        {phase.is_complete && (
          <>
            {/* Base 3D */}
            <View style={[styles.base3d, { backgroundColor: colors.green[700], top: 6 }]} />
            {/* Círculo principal */}
            <View style={[styles.circle, { backgroundColor: colors.green[500] }]}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          </>
        )}

        {/* === FASE BLOQUEADA === */}
        {phase.is_blocked && (
          <>
            {/* Base 3D */}
            <View style={[styles.base3d, { backgroundColor: colors.gray[400], top: 5 }]} />
            {/* Círculo principal */}
            <View style={[styles.circle, { backgroundColor: colors.gray[300] }]}>
              <Lock size={22} color={colors.gray[500]} />
            </View>
          </>
        )}

        {/* === FASE DE REVISÃO === */}
        {phase.is_review && !phase.is_current && !phase.is_complete && (
          <>
            {/* Base 3D */}
            <View style={[styles.base3d, { backgroundColor: colors.purple[700], top: 6 }]} />
            {/* Círculo principal */}
            <View style={[styles.circle, { backgroundColor: colors.purple[500] }]}>
              <RefreshCw size={22} color="#fff" />
            </View>
          </>
        )}

        {/* === FASE PADRÃO (pendente) === */}
        {!phase.is_current && !phase.is_complete && !phase.is_blocked && !phase.is_review && (
          <>
            {/* Base 3D */}
            <View style={[styles.base3d, { backgroundColor: colors.yellow[700], top: 6 }]} />
            {/* Círculo principal */}
            <View style={[styles.circle, { backgroundColor: colors.yellow[500] }]}>
              {InnerIcon && <InnerIcon size={22} color="#fff" />}
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    // Garante que o pressable ocupe só o espaço necessário
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  currentBase: {
    position: 'absolute',
    backgroundColor: '#1e40af', // blue-800 do web
    top: 16,
    zIndex: 0,
  },
  currentInner: {
    position: 'absolute',
    top: 11,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  base3d: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  circle: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
