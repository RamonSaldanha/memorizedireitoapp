import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { DisciplineBadge } from '../ui/DisciplineBadge';
import { colors } from '../../theme/colors';
import type { DisciplineLevelUp } from '../../api/play';

type Props = {
  levelUp: DisciplineLevelUp | null;
  onDone?: () => void;
  isDark?: boolean;
};

/**
 * Overlay auto-dismiss de "VOCÊ SUBIU DE NÍVEL!" exibido quando o usuário cruza
 * um nível de especialista numa disciplina. Aparece, segura ~2.2s e some sozinho
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
      Animated.delay(2200),
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
        <Text style={[styles.title, { color: isDark ? colors.gray[100] : colors.gray[800] }]}>
          Você subiu de nível!
        </Text>

        <View style={styles.badgeWrap}>
          <DisciplineBadge
            icon={levelUp.icon}
            color={levelUp.color}
            level={levelUp.new_level}
            isDark={isDark}
          />
        </View>

        <Text style={[styles.subtitle, { color: isDark ? colors.gray[200] : colors.gray[800] }]}>
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
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeWrap: {
    marginTop: 18,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
});
