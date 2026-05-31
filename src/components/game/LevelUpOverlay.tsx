import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { DisciplineBadge } from '../ui/DisciplineBadge';
import type { DisciplineLevelUp } from '../../api/play';

type Props = {
  levelUp: DisciplineLevelUp | null;
  onDone?: () => void;
  isDark?: boolean;
};

/**
 * Overlay auto-dismiss de "VOCÊ SUBIU DE NÍVEL!" exibido quando o usuário cruza
 * um nível de especialista numa disciplina. Aparece, segura ~4.3s e some sozinho
 * (não exige toque). Reutiliza o DisciplineBadge para mostrar o novo nível.
 */
export function LevelUpOverlay({ levelUp, onDone, isDark = false }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!levelUp) return;

    opacity.setValue(0);
    scale.setValue(0.7);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]),
      Animated.delay(4300),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 380, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.92, duration: 380, useNativeDriver: true }),
      ]),
    ]).start(() => {
      onDone?.();
    });
  }, [levelUp]);

  if (!levelUp) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity }]}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Text style={styles.title}>Você subiu de nível!</Text>

        <View style={styles.badgeWrap}>
          <DisciplineBadge
            icon={levelUp.icon}
            color={levelUp.color}
            level={levelUp.new_level}
            isDark={isDark}
          />
        </View>

        <Text style={styles.subtitle}>
          Especialista nível {levelUp.new_level} em {levelUp.discipline_name}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    // Abaixo do confete (zIndex 200) para que ele caia visível sobre o card,
    // mas acima do conteúdo da fase.
    zIndex: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  card: {
    width: '82%',
    maxWidth: 360,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  badgeWrap: {
    marginTop: 18,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
