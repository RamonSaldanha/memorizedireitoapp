import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X } from 'lucide-react-native';
import { PHASE_OPEN_ENERGY, trailApi } from '../../api/trail';
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

const ADSENSE_CLIENT_ID = 'ca-pub-2585274176504938';
const ADSENSE_SLOT_ID = '3465272448';
const COUNTDOWN_SECONDS = 30;

const AD_HTML = `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Anúncio</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; }
  body { display: flex; flex-direction: column; align-items: center; padding: 16px; }
  .ad-wrap { width: 100%; min-height: 300px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
  .info { font-size: 13px; color: #64748b; text-align: center; }
</style>
</head>
<body>
  <div class="ad-wrap">
    <ins class="adsbygoogle"
         style="display:block;width:100%;min-height:280px"
         data-ad-client="${ADSENSE_CLIENT_ID}"
         data-ad-slot="${ADSENSE_SLOT_ID}"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
  </div>
  <div id="info" class="info">Aguarde <span id="counter">${COUNTDOWN_SECONDS}</span>s para pegar a energia…</div>

  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}" crossorigin="anonymous"></script>
  <script>
    (adsbygoogle = window.adsbygoogle || []).push({});
    var remaining = ${COUNTDOWN_SECONDS};
    var counterEl = document.getElementById('counter');
    var infoEl = document.getElementById('info');
    var timer = setInterval(function () {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        infoEl.textContent = 'Pronto! Toque em Pegar a energia.';
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage('ready');
        }
      } else {
        counterEl.textContent = remaining;
      }
    }, 1000);
  </script>
</body>
</html>`;

/**
 * Sem energia, como a BetaPlay/NoEnergy.vue da web e no desenho do convite Premium do fim de
 * fase: o corredor cansado e a frase com marca-texto, quando volta o próximo +1, o anual
 * (energia infinita), o anúncio (+3) e esperar a recarga.
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
  const [adReady, setAdReady] = useState(false);
  const [collecting, setCollecting] = useState(false);

  const onAdMessage = (event: WebViewMessageEvent) => {
    if (event.nativeEvent.data === 'ready') setAdReady(true);
  };

  const collect = async () => {
    if (!adReady || collecting) return;
    setCollecting(true);
    try {
      const res = await trailApi.rewardEnergy();
      setEnergy(res.data.energy);
      setWatching(false);
      setAdReady(false);
      await refetch();
    } catch {
      setToast({ title: 'Não foi possível pegar a energia. Tente de novo.', variant: 'error' });
    } finally {
      setCollecting(false);
    }
  };

  const backToMap = () => {
    queryClient.invalidateQueries({ queryKey: ['trail-map'] });
    navigation.navigate('PlayMap');
  };

  const energy = data?.energy ?? storeEnergy;
  const adReward = data?.ad_reward ?? 3;
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

      {watching ? (
        <View style={styles.adContent}>
          <Text style={[styles.adTitle, { color: fg }]}>Assistindo anúncio…</Text>
          <View style={styles.webviewWrap}>
            <WebView
              originWhitelist={['*']}
              source={{ html: AD_HTML, baseUrl: 'https://memorizedireito.com' }}
              onMessage={onAdMessage}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              style={styles.webview}
            />
          </View>
          <GameButton variant="main" size="lg" fullWidth disabled={!adReady || collecting} onPress={collect} style={{ marginTop: 16 }}>
            {collecting ? <ActivityIndicator color={colors.family.brandInk} size="small" /> : `Pegar a energia (+${adReward})`}
          </GameButton>
          <GameButton variant="ghost" size="sm" fullWidth onPress={() => setWatching(false)} style={{ marginTop: 4 }}>
            Cancelar
          </GameButton>
        </View>
      ) : (
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
              <GameButton variant="second" size="lg" fullWidth onPress={() => setWatching(true)} style={{ marginTop: 12 }}>
                {`Assistir anúncio (+${adReward})`}
              </GameButton>
              <GameButton variant="ghost" size="sm" fullWidth onPress={backToMap} style={{ marginTop: 4 }}>
                Esperar a recarga
              </GameButton>
            </>
          )}
        </View>
      )}

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
  adContent: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  adTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  webviewWrap: { flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff' },
  webview: { flex: 1, backgroundColor: 'transparent' },
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
