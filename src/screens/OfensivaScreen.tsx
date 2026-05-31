import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, StatusBar, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Flame, Trophy, Share2, ArrowLeft, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { streakApi, StreakMonthDay } from '../api/streak';
import { Logo } from '../components/Logo';
import { useUserStore } from '../stores/userStore';
import { colors } from '../theme/colors';
import { useAppearance } from '../hooks/useAppearance';

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const dayLabel = (n: number) => (n === 1 ? 'dia' : 'dias');

function subtitleText(current: number, playedToday: boolean): string {
  if (current === 0) return 'Conclua um exercício hoje para começar sua ofensiva!';
  if (!playedToday) return 'Estude hoje para não perder sua ofensiva!';
  if (current >= 30) return 'Você está imparável! 🚀';
  if (current >= 7) return 'Uma semana ou mais de foco. Continue assim!';
  return 'Todo dia conta. Vamos juntos!';
}

export function OfensivaScreen() {
  const navigation = useNavigation();
  const { isDark, theme } = useAppearance();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [month, setMonth] = useState<string | undefined>(undefined);

  const storeCurrent = useUserStore((s) => s.currentStreak);
  const storeLongest = useUserStore((s) => s.longestStreak);
  const updateFromApi = useUserStore((s) => s.updateFromApi);

  const { data, isLoading } = useQuery({
    queryKey: ['streak', month],
    queryFn: async () => {
      const res = await streakApi.getStats(month);
      updateFromApi({
        lives: useUserStore.getState().lives,
        has_infinite_lives: useUserStore.getState().hasInfiniteLives,
        xp: useUserStore.getState().xp,
        current_streak: res.data.current_streak,
        longest_streak: res.data.longest_streak,
      });
      return res.data;
    },
    staleTime: 30_000,
  });

  const current = data?.current_streak ?? storeCurrent;
  const longest = data?.longest_streak ?? storeLongest;
  const playedToday = data?.played_today ?? false;

  function intensityColors(count: number): { bg: string; fg: string } {
    if (count === 0) return { bg: isDark ? colors.gray[800] : colors.gray[100], fg: colors.gray[400] };
    if (count === 1) return { bg: colors.orange[200], fg: colors.orange[700] };
    if (count <= 3) return { bg: colors.orange[400], fg: '#ffffff' };
    return { bg: colors.orange[600], fg: '#ffffff' };
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Compartilhamento indisponível', 'Não foi possível abrir o compartilhamento neste dispositivo.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartilhar minha ofensiva',
        UTI: 'public.png',
      });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar a imagem da ofensiva.');
    } finally {
      setSharing(false);
    }
  }

  const leadingBlanks = data ? Array.from({ length: data.month.first_weekday - 1 }) : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.iconBtn}>
          <ArrowLeft size={24} color={theme.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: theme.foreground }]}>Ofensiva</Text>
        <View style={styles.iconBtn} />
      </View>

      {isLoading && !data ? (
        <ActivityIndicator style={styles.loader} color={colors.orange[500]} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Card de resumo (exibição) */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: isDark ? colors.gray[700] : colors.orange[100] }]}>
            <Text style={[styles.headline, { color: theme.foreground }]}>
              <Text style={{ color: colors.orange[500] }}>{current} {dayLabel(current)} </Text>
              seguidos de estudos
            </Text>
            <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
              {subtitleText(current, playedToday)}
            </Text>

            {/* Régua semanal */}
            <View style={styles.weekRow}>
              {(data?.week ?? []).map((d) => {
                const pillBg = d.studied
                  ? (isDark ? 'rgba(180,83,9,0.3)' : colors.orange[100])
                  : (isDark ? colors.gray[800] : colors.gray[100]);
                return (
                  <View
                    key={d.date}
                    style={[
                      styles.weekPill,
                      { backgroundColor: pillBg },
                      d.is_today && !d.studied && { borderWidth: 2, borderColor: colors.orange[300] },
                    ]}
                  >
                    <Text style={[styles.weekday, { color: d.studied ? colors.orange[600] : colors.gray[400] }]}>
                      {d.weekday}
                    </Text>
                    <View
                      style={[
                        styles.dayBadge,
                        d.studied
                          ? { backgroundColor: colors.yellow[400] }
                          : { borderWidth: 2, borderColor: isDark ? colors.gray[600] : colors.gray[300] },
                      ]}
                    >
                      {d.studied && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Estatísticas */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: isDark ? colors.gray[800] : colors.orange[50] }]}>
                <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>SEQUÊNCIA ATUAL</Text>
                <View style={styles.statValueRow}>
                  <Flame size={18} color={colors.orange[500]} fill={colors.orange[500]} />
                  <Text style={[styles.statValue, { color: colors.orange[500] }]}>{current} {dayLabel(current)}</Text>
                </View>
              </View>
              <View style={[styles.statBox, { backgroundColor: isDark ? colors.gray[800] : colors.orange[50] }]}>
                <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>SEU RECORDE</Text>
                <View style={styles.statValueRow}>
                  <Trophy size={18} color={colors.orange[600]} />
                  <Text style={[styles.statValue, { color: colors.orange[600] }]}>{longest} {dayLabel(longest)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Botão compartilhar */}
          <Pressable onPress={handleShare} disabled={sharing} style={[styles.shareBtn, sharing && { opacity: 0.6 }]}>
            {sharing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Share2 size={20} color="#ffffff" />
                <Text style={styles.shareText}>Compartilhar</Text>
              </>
            )}
          </Pressable>

          {/* Calendário mensal (heatmap) */}
          {data && (
            <View style={[styles.monthCard, { backgroundColor: theme.card, borderColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
              <View style={styles.monthHeader}>
                <Pressable onPress={() => setMonth(data.month.prev)} hitSlop={8} style={styles.iconBtn}>
                  <ChevronLeft size={20} color={theme.mutedForeground} />
                </Pressable>
                <Text style={[styles.monthLabel, { color: theme.foreground }]}>{data.month.label}</Text>
                <Pressable
                  onPress={() => data.month.next && setMonth(data.month.next)}
                  disabled={!data.month.next}
                  hitSlop={8}
                  style={[styles.iconBtn, !data.month.next && { opacity: 0.3 }]}
                >
                  <ChevronRight size={20} color={theme.mutedForeground} />
                </Pressable>
              </View>

              <View style={styles.weekHeaderRow}>
                {WEEKDAY_LABELS.map((label) => (
                  <Text key={label} style={[styles.gridHeader, { color: colors.gray[400] }]}>{label}</Text>
                ))}
              </View>

              <View style={styles.grid}>
                {leadingBlanks.map((_, i) => (
                  <View key={`blank-${i}`} style={styles.gridCell} />
                ))}

                {data.month.days.map((d: StreakMonthDay) => {
                  const { bg, fg } = intensityColors(d.count);
                  return (
                    <View key={d.date} style={styles.gridCell}>
                      <View
                        style={[
                          styles.daySquare,
                          { backgroundColor: bg },
                          d.is_today && { borderWidth: 2, borderColor: colors.orange[500] },
                          d.is_future && { opacity: 0.4 },
                        ]}
                      >
                        <Text style={[styles.dayNum, { color: fg }]}>{d.day}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Legenda */}
              <View style={styles.legend}>
                <Text style={[styles.legendText, { color: colors.gray[400] }]}>Menos</Text>
                {[colors.gray[100], colors.orange[200], colors.orange[400], colors.orange[600]].map((c, i) => (
                  <View key={i} style={[styles.legendSwatch, { backgroundColor: c }]} />
                ))}
                <Text style={[styles.legendText, { color: colors.gray[400] }]}>Mais</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Card vertical 9:16 para stories — fora da tela, só p/ captura */}
      {data && (
        <View ref={cardRef} collapsable={false} style={styles.shareCard}>
          <View style={styles.shareHeader}>
            <Logo width={150} />
          </View>

          <View style={styles.shareBody}>
            <Flame size={88} color={colors.orange[500]} fill={colors.orange[500]} />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.shareNum}>{current}</Text>
              <Text style={styles.shareLabel}>{dayLabel(current)} seguidos de estudos</Text>
            </View>

            <View style={styles.weekRow}>
              {data.week.map((d) => (
                <View
                  key={`s-${d.date}`}
                  style={[styles.weekPill, { backgroundColor: d.studied ? colors.orange[100] : colors.gray[100] }]}
                >
                  <Text style={[styles.weekday, { color: d.studied ? colors.orange[600] : colors.gray[400] }]}>{d.weekday}</Text>
                  <View
                    style={[
                      styles.dayBadge,
                      d.studied ? { backgroundColor: colors.yellow[400] } : { borderWidth: 2, borderColor: colors.gray[300] },
                    ]}
                  >
                    {d.studied && <Check size={14} color="#ffffff" strokeWidth={3} />}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: colors.orange[50] }]}>
                <Text style={[styles.statLabel, { color: colors.gray[500] }]}>SEQUÊNCIA ATUAL</Text>
                <View style={styles.statValueRow}>
                  <Flame size={18} color={colors.orange[500]} fill={colors.orange[500]} />
                  <Text style={[styles.statValue, { color: colors.orange[500] }]}>{current} {dayLabel(current)}</Text>
                </View>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.orange[50] }]}>
                <Text style={[styles.statLabel, { color: colors.gray[500] }]}>SEU RECORDE</Text>
                <View style={styles.statValueRow}>
                  <Trophy size={18} color={colors.orange[600]} />
                  <Text style={[styles.statValue, { color: colors.orange[600] }]}>{longest} {dayLabel(longest)}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.shareFooter}>
            <Text style={styles.shareSubtitle}>{subtitleText(current, playedToday)}</Text>
            <Text style={styles.shareUrl}>memorizedireito.com</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  loader: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },

  card: { borderRadius: 24, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 22, gap: 18 },
  headline: { fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: -8 },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  weekPill: { flex: 1, alignItems: 'center', gap: 6, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 2 },
  weekday: { fontSize: 11, fontWeight: '700' },
  dayBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, alignItems: 'center', gap: 4, borderRadius: 16, paddingVertical: 12 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 17, fontWeight: '800' },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    alignSelf: 'center', backgroundColor: colors.orange[500],
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999, minWidth: 200,
  },
  shareText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },

  monthCard: { borderRadius: 24, borderWidth: 1, padding: 16 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthLabel: { fontSize: 15, fontWeight: '800' },
  weekHeaderRow: { flexDirection: 'row', marginBottom: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  gridHeader: { flex: 1, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  daySquare: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 12, fontWeight: '700' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 10 },
  legendText: { fontSize: 11 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },

  // Card vertical 9:16 p/ stories (renderizado fora da tela)
  shareCard: {
    position: 'absolute', top: -10000, left: 0, width: 360, height: 640,
    backgroundColor: '#ffffff', overflow: 'hidden',
  },
  shareHeader: {
    backgroundColor: '#ffffff', paddingVertical: 16, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.gray[200],
  },
  shareBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 22 },
  shareNum: { color: colors.orange[500], fontSize: 76, fontWeight: '900', lineHeight: 80 },
  shareLabel: { color: colors.gray[700], fontSize: 17, fontWeight: '800', marginTop: 2 },
  shareFooter: { paddingHorizontal: 28, paddingVertical: 20, alignItems: 'center', gap: 2 },
  shareSubtitle: { color: colors.gray[500], fontSize: 13, fontWeight: '600', textAlign: 'center' },
  shareUrl: { color: colors.blue[500], fontSize: 13, fontWeight: '700' },
});
