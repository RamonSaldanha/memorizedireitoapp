import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Heart, Zap, Gem, InfinityIcon } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useUserStore } from '../../stores/userStore';

export function AppHeader() {
  const { lives, hasInfiniteLives, xp } = useUserStore();
  const prevLives = useRef(lives);
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (prevLives.current !== lives) {
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      prevLives.current = lives;
    }
  }, [lives]);

  return (
    <View style={styles.header}>
      {/* Vidas */}
      <View style={styles.pill}>
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <Heart
            size={18}
            color={hasInfiniteLives ? colors.blue[500] : lives > 0 ? colors.red[500] : colors.gray[400]}
          />
        </Animated.View>
        {hasInfiniteLives ? (
          <InfinityIcon size={14} color={colors.blue[500]} />
        ) : (
          <Text style={[styles.pillText, { color: lives > 0 ? colors.red[500] : colors.gray[400] }]}>
            {lives}
          </Text>
        )}
      </View>

      {/* XP */}
      <View style={[styles.pill, styles.xpPill]}>
        <Zap size={14} color={colors.purple[500]} />
        <Text style={[styles.pillText, { color: colors.purple[500] }]}>
          {xp.toLocaleString('pt-BR')}
        </Text>
      </View>

      {!hasInfiniteLives && (
        <Pressable style={styles.gemButton}>
          <Gem size={22} color={colors.blue[500]} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.pink[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  xpPill: { backgroundColor: colors.purple[100] },
  pillText: { fontSize: 13, fontWeight: '700' },
  gemButton: { padding: 4 },
});
