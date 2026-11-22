import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BatteryCharging, BatteryLow, RotateCcw } from 'lucide-react-native';
import { PHASE_OPEN_ENERGY, trailApi } from '../../api/trail';
import { AppHeader } from '../../components/layout/AppHeader';
import { GameButton } from '../../components/ui/GameButton';
import { Toast } from '../../components/ui/Toast';
import { useSubscriptionCheckout } from '../../hooks/useSubscriptionCheckout';
import { useAppearance } from '../../hooks/useAppearance';
import { useUserStore } from '../../stores/userStore';
import { colors, familyTokens } from '../../theme/colors';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Props = NativeStackScreenProps<PlayStackParamList, 'NoEnergy'>;

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
 * Sem energia, como a BetaPlay/NoEnergy.vue da web: quanto falta para o próximo +1, a revisão
 * sugerida (a fase concluída mais esquecida, que abre sem energia e cujo combo recarrega), o
 * anúncio (+5) e o Premium, que tem energia infinita.
 */
export function NoEnergyScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { isDark, theme } = useAppearance();
  const t = familyTokens(isDark);
  const setEnergy = useUserStore((s) => s.setEnergy);
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

  if (!data) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.family.brandEdge} />
      </SafeAreaView>
    );
  }

  const { energy, review, ad_reward } = data;
  const canPlay = energy.infinite || energy.value >= PHASE_OPEN_ENERGY;
  const minutes = energy.next_at ? Math.ceil((Date.parse(energy.next_at) - now) / 60_000) : null;
  const muted = isDark ? colors.gray[400] : colors.gray[500];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <AppHeader />

      {watching ? (
        <View style={styles.adContent}>
          <Text style={[styles.adTitle, { color: theme.foreground }]}>Assistindo anúncio…</Text>
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
            {collecting ? <ActivityIndicator color={colors.family.brandInk} size="small" /> : `Pegar a energia (+${ad_reward})`}
          </GameButton>
          <GameButton variant="ghost" size="sm" fullWidth onPress={() => setWatching(false)} style={{ marginTop: 4 }}>
            Cancelar
          </GameButton>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.battery, { backgroundColor: canPlay ? t.brandSoft : t.tint }]}>
            {canPlay ? <BatteryCharging size={56} color={t.brandSoftInk} strokeWidth={1.75} /> : <BatteryLow size={56} color={muted} strokeWidth={1.75} />}
          </View>

          <Text style={[styles.title, { color: theme.foreground }]}>
            {energy.infinite ? 'Sua energia é infinita' : canPlay ? 'Energia de volta!' : 'Sua energia acabou'}
          </Text>
          {!energy.infinite ? (
            <Text style={[styles.subtitle, { color: muted }]}>
              {canPlay
                ? 'Você já pode abrir uma fase nova.'
                : `Uma fase nova precisa de ${PHASE_OPEN_ENERGY} de energia.${minutes !== null ? ` Mais 1 em ${minutes > 0 ? `${minutes} min` : 'instantes'}.` : ''}`}
            </Text>
          ) : null}

          {!energy.infinite ? (
            <View style={styles.barBlock}>
              <View style={[styles.bar, { backgroundColor: t.tint }]}>
                <View style={[styles.barFill, { width: `${Math.min(100, (energy.value / energy.max) * 100)}%` }]} />
              </View>
              <Text style={[styles.barText, { color: muted }]}>
                {energy.value} de {energy.max}
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {canPlay ? (
              <GameButton variant="main" size="lg" fullWidth onPress={backToMap}>
                Voltar ao mapa
              </GameButton>
            ) : (
              <>
                {review ? (
                  <>
                    <GameButton variant="main" size="lg" fullWidth onPress={() => navigation.replace('TrailPhase', { phaseId: review.id })}>
                      <RotateCcw size={20} color={colors.family.brandInk} />
                      <Text style={[styles.buttonLabel, { color: colors.family.brandInk }]}>Revisar uma fase</Text>
                    </GameButton>
                    <Text style={[styles.hint, { color: muted }]}>
                      {review.legislation_title}. A revisão abre sem energia e 5 acertos seguidos devolvem 2.
                    </Text>
                  </>
                ) : null}
                <GameButton variant="second" size="lg" fullWidth onPress={() => setWatching(true)}>
                  {`Assistir anúncio (+${ad_reward})`}
                </GameButton>
                <GameButton variant="tonal-brand" size="md" fullWidth onPress={openSubscription}>
                  Energia infinita com o Premium
                </GameButton>
                <GameButton variant="ghost" size="sm" fullWidth onPress={backToMap}>
                  Voltar ao mapa
                </GameButton>
              </>
            )}
          </View>
        </ScrollView>
      )}

      {isSyncing ? (
        <View style={styles.syncOverlay}>
          <View style={[styles.syncCard, { backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color={colors.family.brandEdge} />
            <Text style={[styles.syncText, { color: theme.foreground }]}>Atualizando…</Text>
          </View>
        </View>
      ) : null}

      <Toast visible={!!toast} title={toast?.title ?? ''} variant={toast?.variant} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 32, alignItems: 'center' },
  battery: { width: 104, height: 104, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 16, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  barBlock: { marginTop: 20, width: '100%' },
  bar: { height: 16, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: colors.family.brand },
  barText: { marginTop: 6, textAlign: 'right', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  actions: { marginTop: 24, width: '100%', gap: 12 },
  buttonLabel: { fontSize: 17, fontWeight: '700' },
  hint: { marginTop: -4, fontSize: 13, lineHeight: 18, textAlign: 'center' },
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
