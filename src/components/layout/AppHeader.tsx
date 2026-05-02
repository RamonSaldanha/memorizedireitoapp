import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Image } from 'react-native';
import { Heart, Gem, InfinityIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useUserStore } from '../../stores/userStore';

function getInitial(name: string | null): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

export function AppHeader() {
  const { lives, hasInfiniteLives, xp, name, avatar } = useUserStore();
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
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
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

      {/* XP badge-style */}
      <View style={styles.xpRow}>
        <View style={styles.xpBadge}>
          <Text style={styles.xpBadgeText}>XP</Text>
        </View>
        <Text style={styles.xpValue}>{xp.toLocaleString('pt-BR')}</Text>
      </View>

      {/* Gema (vidas infinitas) */}
      {!hasInfiniteLives && (
        <Pressable style={styles.gemButton}>
          <Gem size={22} color={colors.blue[500]} />
        </Pressable>
      )}

      {/* Avatar */}
      <View style={styles.avatar}>
        {avatar
          ? <Image source={{ uri: avatar }} style={styles.avatarImage} />
          : <Text style={styles.avatarInitial}>{getInitial(name)}</Text>
        }
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 10,
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
  pillText: { fontSize: 13, fontWeight: '700' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpBadge: {
    backgroundColor: colors.purple[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  xpBadgeText: { color: colors.purple[500], fontSize: 11, fontWeight: '700' },
  xpValue: { color: colors.purple[500], fontSize: 14, fontWeight: '700' },
  gemButton: { padding: 4 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: colors.gray[200],
    backgroundColor: colors.gray[100],
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 18 },
  avatarInitial: { fontSize: 14, fontWeight: '700', color: colors.gray[800] },
});
