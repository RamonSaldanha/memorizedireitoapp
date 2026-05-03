import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Heart, Gem, InfinityIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useUserStore } from '../../stores/userStore';
import { useAppearance } from '../../hooks/useAppearance';
import { Avatar } from '../ui/Avatar';

export function AppHeader() {
  const { lives, hasInfiniteLives, xp, name, avatar } = useUserStore();
  const { isDark, theme } = useAppearance();
  const insets = useSafeAreaInsets();
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
    <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      {/* Vidas */}
      <View style={[styles.pill, { backgroundColor: isDark ? colors.gray[900] : colors.pink[50] }]}>
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

      {/* XP badge-style */}
      <View style={styles.xpRow}>
        <View style={[styles.xpBadge, { backgroundColor: isDark ? colors.gray[800] : colors.purple[100] }]}>
          <Text style={[styles.xpBadgeText, { color: isDark ? colors.purple[400] : colors.purple[500] }]}>XP</Text>
        </View>
        <Text style={[styles.xpValue, { color: isDark ? colors.purple[400] : colors.purple[500] }]}>{xp.toLocaleString('pt-BR')}</Text>
      </View>

      {/* Gema (vidas infinitas) */}
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
    justifyContent: 'flex-start',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: { fontSize: 13, fontWeight: '700' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  xpBadgeText: { fontSize: 11, fontWeight: '700' },
  xpValue: { fontSize: 14, fontWeight: '700' },
  gemButton: { padding: 4 },
});
