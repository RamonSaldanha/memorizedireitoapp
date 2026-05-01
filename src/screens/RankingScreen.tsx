import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Pressable, SafeAreaView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Crown, Medal, Zap } from 'lucide-react-native';
import { rankingApi, RankingUser } from '../api/ranking';
import { Avatar } from '../components/ui/Avatar';
import { colors } from '../theme/colors';

type Period = 'daily' | 'weekly' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: '🔥 Hoje' },
  { key: 'weekly', label: '📈 Semana' },
  { key: 'all', label: '🏆 Geral' },
];

const MEDAL_COLORS: Record<number, { bg: string; text: string; ring: string }> = {
  1: { bg: colors.yellow[500], text: '#fff', ring: colors.yellow[400] },
  2: { bg: colors.blue[500], text: '#fff', ring: colors.blue[200] },
  3: { bg: colors.purple[500], text: '#fff', ring: colors.purple[400] },
};

export function RankingScreen() {
  const [period, setPeriod] = useState<Period>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['ranking', period],
    queryFn: () => rankingApi.getRanking(period),
    select: (res) => res.data,
    staleTime: 60_000,
  });

  const topUsers = data?.top_users ?? [];
  const currentUserData = data?.current_user_data;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Ranking</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            style={[styles.tab, period === p.key && styles.tabActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.tabText, period === p.key && styles.tabTextActive]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.purple[500]} />
      ) : (
        <FlatList
          data={topUsers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            currentUserData ? (
              <View style={styles.separator}>
                <Text style={styles.separatorText}>···</Text>
                <RankingRow user={currentUserData} isCurrentUser highlight />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <RankingRow user={item} isCurrentUser={item.is_current_user} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function RankingRow({ user, isCurrentUser, highlight }: {
  user: RankingUser;
  isCurrentUser: boolean;
  highlight?: boolean;
}) {
  const medalStyle = MEDAL_COLORS[user.position];
  const name = `${user.first_name} ${user.last_name}`.trim();

  return (
    <View style={[styles.row, (isCurrentUser || highlight) && styles.rowHighlight]}>
      {/* Posição */}
      <View style={[styles.positionBadge, medalStyle ? { backgroundColor: medalStyle.bg } : styles.positionBadgeDefault]}>
        {user.position === 1 ? (
          <Crown size={14} color="#fff" />
        ) : user.position <= 3 ? (
          <Medal size={14} color="#fff" />
        ) : (
          <Text style={styles.positionText}>{user.position}</Text>
        )}
      </View>

      {/* Avatar */}
      <Avatar
        name={name}
        size={40}
        style={medalStyle ? { borderWidth: 2, borderColor: medalStyle.ring } : undefined}
      />

      {/* Nome */}
      <View style={styles.nameWrap}>
        <Text style={styles.firstName}>{user.first_name}</Text>
        <Text style={styles.lastName} numberOfLines={1}>{user.last_name}</Text>
        {isCurrentUser && <Text style={styles.youBadge}>Você</Text>}
      </View>

      {/* XP */}
      <View style={styles.xpWrap}>
        <Zap size={14} color={colors.yellow[500]} />
        <Text style={styles.xpText}>{user.xp.toLocaleString('pt-BR')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '800', color: colors.foreground, padding: 16 },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.gray[100], alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.purple[100] },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.gray[500] },
  tabTextActive: { color: colors.purple[600] },
  loader: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  rowHighlight: { backgroundColor: colors.blue[50], borderColor: colors.blue[200] },
  positionBadge: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  positionBadgeDefault: { backgroundColor: colors.gray[200] },
  positionText: { fontSize: 12, fontWeight: '700', color: colors.gray[600] },
  nameWrap: { flex: 1, gap: 1 },
  firstName: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  lastName: { fontSize: 12, color: colors.mutedForeground },
  youBadge: {
    fontSize: 10, fontWeight: '700', color: colors.blue[600],
    backgroundColor: colors.blue[100], paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 4, alignSelf: 'flex-start',
  },
  xpWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  xpText: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  separator: { gap: 4, marginTop: 8 },
  separatorText: { textAlign: 'center', color: colors.gray[400], fontSize: 18, letterSpacing: 4 },
});
