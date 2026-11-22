import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X } from 'lucide-react-native';
import { PHASE_OPEN_ENERGY, trailApi, type RewardAdResponse } from '../../api/trail';
import { RewardedAdOverlay } from '../../components/trail/RewardedAdOverlay';
import { BlueButton, Marked, YEARLY, YEARLY_PER_MONTH, YearlyPlan } from '../../components/trail/PremiumPieces';
import { EnergyPill } from '../../components/ui/EnergyPill';
import { GameButton } from '../../components/ui/GameButton';
import { Toast } from '../../components/ui/Toast';
import { useSubscriptionCheckout } from '../../hooks/useSubscriptionCheckout';
import { useAppearance } from '../../hooks/useAppearance';
import { useUserStore } from '../../stores/userStore';
import { colors } from '../../theme/colors';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Props = NativeStackScreenProps<PlayStackParamList, 'NoEnergy'>;

// O corredor cansado (418x627, com o vazio em cima): a moldura corta 17,94% da largura em cima
// e fica com a proporção 418:540, da mesma altura das ilustrações do fim de fase
const TIRED = require('../../../assets/img/sem-energia.gif');
const HERO_MAX = 240;
const HERO_RATIO = 418 / 540;

/**
 * Sem energia, como a BetaPlay/NoEnergy.vue da web e no desenho do convite Premium do fim de
 * fase: o corredor cansado e a frase com marca-texto, quando volta o próximo +1, o anual
 * (energia infinita), o anúncio (+3, até 3 por dia, em tela cheia: o nosso e o do Google se
 * revezam, ver RewardedAdOverlay) e esperar a recarga.
 */
export function NoEnergyScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { isDark, theme } = useAppearance();
  const fg = isDark ? colors.dark.foreground : colors.foreground;
  const muted = isDark ? colors.dark.mutedForeground : colors.mutedForeground;
  const setEnergy = useUserStore((s) => s.setEnergy);
  const storeEnergy = useUserStore((s) => s.energy);
  const { openSubscription, isSyncing, toast, setToast } = useSubscriptionCheckout();

  const { data, refetch } = useQuery({
    queryKey: ['trail-energy'],
    queryFn: async () => (await trailApi.energy()).data,
    gcTime: 0,
  });
  useEffect(() => {
    if (data) setEnergy(data.energy);
  }, [data]);

  // Atualiza a contagem a cada meio minuto (e a energia, quando chega o próximo +1)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (data?.energy.next_at && Date.parse(data.energy.next_at) <= now) refetch();
  }, [now]);

  const [room, setRoom] = useState(0);
  const [watching, setWatching] = useState(false);

  // Depois do anúncio, a tela pega de novo a energia e o próximo anúncio
  const adClosed = (result: RewardAdResponse | null) => {
    setWatching(false);
    if (result) setEnergy(result.energy);
    refetch();
  };

  const backToMap = () => {
    queryClient.invalidateQueries({ queryKey: ['trail-map'] });
    navigation.navigate('PlayMap');
  };

  const energy = data?.energy ?? storeEnergy;
  const adReward = data?.ad_reward ?? 3;
  const adsLeft = data?.ads_left ?? 3;
  const ad = data?.ad ?? { kind: 'google' as const, video_url: null, seconds: 30 };
  const canPlay = energy.infinite || energy.value >= PHASE_OPEN_ENERGY;
  const minutes = energy.next_at ? Math.ceil((Date.parse(energy.next_at) - now) / 60_000) : null;

  // O corredor encolhe descontando a frase e a linha da recarga (cerca de 84 px)
  const heroH = room > 0 ? Math.max(96, Math.min(HERO_MAX, room - 84)) : HERO_MAX;
  const heroW = heroH * HERO_RATIO;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.top}>
        <Pressable onPress={backToMap} hitSlop={12} accessibilityRole="button" accessibilityLabel="Voltar ao mapa">
          <X size={26} color={muted} />
        </Pressable>
        <EnergyPill energy={energy} pill />
      </View>

      <View style={styles.wrap}>
        <View style={styles.room} onLayout={(e: LayoutChangeEvent) => setRoom(e.nativeEvent.layout.height)}>
          <View style={[styles.frame, { width: heroW, height: heroH }]}>
            <Image
              source={TIRED}
              style={{ width: heroW, height: heroW * (627 / 418), marginTop: -heroW * 0.1794 }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: fg }]}>Sua energia </Text>
            <Marked key={canPlay ? 'back' : 'out'} text={canPlay ? 'voltou!' : 'acabou.'} fontSize={22} color={fg} delay={300} />
          </View>
          <Text style={[styles.subtitle, { color: muted }]}>
            {canPlay
              ? 'Já dá para abrir uma fase nova.'
              : `Ela volta sozinha, 1 por hora${minutes !== null ? ` (a próxima em ${minutes > 0 ? `${minutes} min` : 'instantes'})` : ''}.`}
          </Text>
        </View>

        {canPlay ? (
          <GameButton variant="main" size="lg" fullWidth onPress={backToMap} style={{ marginTop: 16 }}>
            Voltar ao mapa
          </GameButton>
        ) : (
          <>
            <View style={{ marginTop: 16 }}>
              <YearlyPlan line={`Energia infinita · ${YEARLY_PER_MONTH} por mês`} />
            </View>
            <BlueButton label={`Assinar por ${YEARLY}/ano`} onPress={openSubscription} />
            {adsLeft > 0 ? (
              <GameButton variant="second" size="lg" fullWidth onPress={() => setWatching(true)} style={{ marginTop: 12 }}>
                {`Assistir anúncio (+${adReward})`}
              </GameButton>
            ) : null}
            <Text style={[styles.adsLeft, { color: muted }]}>
              {adsLeft > 0
                ? `${adsLeft === 1 ? 'Resta 1 anúncio' : `Restam ${adsLeft} anúncios`} hoje`
                : 'Os anúncios de hoje acabaram. Volte amanhã.'}
            </Text>
            <GameButton variant="ghost" size="sm" fullWidth onPress={backToMap} style={{ marginTop: 4 }}>
              Esperar a recarga
            </GameButton>
          </>
        )}
      </View>

      {watching ? <RewardedAdOverlay ad={ad} onClose={adClosed} /> : null}

      {isSyncing ? (
        <View style={styles.syncOverlay}>
          <View style={[styles.syncCard, { backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color={colors.family.brandEdge} />
            <Text style={[styles.syncText, { color: fg }]}>Atualizando…</Text>
          </View>
        </View>
      ) : null}

      <Toast visible={!!toast} title={toast?.title ?? ''} variant={toast?.variant} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
  wrap: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  room: { flex: 1, minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  frame: { overflow: 'hidden', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', flexWrap: 'wrap' },
  title: { fontSize: 22, fontWeight: '800', lineHeight: 22 * 1.2 },
  subtitle: { marginTop: 4, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  adsLeft: { marginTop: 8, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  syncOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  syncCard: { paddingVertical: 24, paddingHorizontal: 36, borderRadius: 16, alignItems: 'center', gap: 12 },
  syncText: { fontSize: 15, fontWeight: '600' },
});
