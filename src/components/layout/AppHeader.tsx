import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Heart, Gem, InfinityIcon, Flame } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { useUserStore } from '../../stores/userStore';
import { useAppearance } from '../../hooks/useAppearance';
import { Avatar } from '../ui/Avatar';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Nav = NativeStackNavigationProp<PlayStackParamList>;

export function AppHeader() {
  const { lives, hasInfiniteLives, xp, currentStreak, name, avatar } = useUserStore();
  const { isDark, theme } = useAppearance();
  const navigation = useNavigation<Nav>();
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
    <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      {/* Vidas */}
      <View style={[styles.pill, { backgroundColor: isDark ? colors.gray[900] : colors.pink[50] }]}>
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <Heart
            size={20}
            color={hasInfiniteLives ? colors.blue[500] : lives > 0 ? colors.red[500] : colors.gray[400]}
          />
        </Animated.View>
        {hasInfiniteLives ? (
          <InfinityIcon size={16} color={colors.blue[500]} />
        ) : (
          <Text style={[styles.pillText, { color: lives > 0 ? colors.red[500] : colors.gray[400] }]}>
            {lives}
          </Text>
        )}
      </View>

      {/* Ofensiva (streak) */}
      <Pressable
        style={[styles.pill, { backgroundColor: isDark ? colors.gray[900] : colors.orange[50] }]}
        onPress={() => navigation.navigate('Ofensiva')}
      >
        <Flame
          size={20}
          color={currentStreak > 0 ? colors.orange[500] : colors.gray[400]}
          fill={currentStreak > 0 ? colors.orange[500] : 'transparent'}
        />
        <Text style={[styles.pillText, { color: currentStreak > 0 ? colors.orange[500] : colors.gray[400] }]}>
          {currentStreak}
        </Text>
      </Pressable>

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
          <Gem size={24} color={colors.blue[500]} />
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
    gap: 10,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pillText: { fontSize: 14, fontWeight: '700' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  xpBadgeText: { fontSize: 12, fontWeight: '700' },
  xpValue: { fontSize: 15, fontWeight: '700' },
  gemButton: { padding: 4 },
});
