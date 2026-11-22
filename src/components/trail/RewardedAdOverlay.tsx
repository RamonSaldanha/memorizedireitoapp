import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, Easing, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import Svg, { Path } from 'react-native-svg';
import { Volume2, X } from 'lucide-react-native';
import { isAxiosError } from 'axios';
import { trailApi, type RewardAd, type RewardAdResponse } from '../../api/trail';
import { GameButton } from '../ui/GameButton';
import { useAppearance } from '../../hooks/useAppearance';
import { colors, familyTokens } from '../../theme/colors';

const ADSENSE_CLIENT_ID = 'ca-pub-2585274176504938';
const ADSENSE_SLOT_ID = '3465272448';
const PREMIUM_GIF = require('../../../assets/img/premium-nomeado.gif');
// Se o vídeo travar sem acabar nem dar erro, a energia sai assim mesmo
const VIDEO_WATCHDOG_MS = 90_000;

const GOOGLE_HTML = `<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; height: 100%; background: transparent; }
  body { display: flex; align-items: center; justify-content: center; padding: 72px 16px 24px; box-sizing: border-box; }
  .ad { width: 100%; min-height: 280px; }
</style></head>
<body>
  <ins class="adsbygoogle ad" style="display:block" data-ad-client="${ADSENSE_CLIENT_ID}" data-ad-slot="${ADSENSE_SLOT_ID}" data-ad-format="auto" data-full-width-responsive="true"></ins>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}" crossorigin="anonymous"></script>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</body></html>`;

// O nosso anúncio: o vídeo do Premium, que conta o tempo e avisa quando acaba
const houseHtml = (url: string) => `<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden; } video { width: 100%; height: 100%; object-fit: contain; background: #000; }</style>
</head><body>
<video id="v" src="${url}" autoplay playsinline webkit-playsinline preload="auto"></video>
<script>
  var v = document.getElementById('v');
  function post(m) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m); }
  v.addEventListener('timeupdate', function () { if (v.duration) post('t:' + v.currentTime + ':' + v.duration); });
  v.addEventListener('ended', function () { post('ended'); });
  v.addEventListener('error', function () { post('error'); });
  var p = v.play();
  if (p && p.catch) p.catch(function () { v.muted = true; post('muted'); v.play().catch(function () { post('error'); }); });
  window.unmute = function () { v.muted = false; };
</script>
</body></html>`;

type Stage = 'playing' | 'claiming' | 'done' | 'error';

/**
 * O anúncio da tela sem energia, em tela cheia: o nosso (o vídeo do Premium) ou o do Google,
 * como o servidor mandar (eles se revezam). Não tem botão de pegar o prêmio nem de fechar
 * enquanto passa: quando o vídeo acaba (ou a contagem do Google chega a zero) a energia é
 * creditada sozinha e só então aparecem o "Você ganhou" e o fechar. Igual à web
 * (resources/js/components/beta-play/RewardedAd.vue).
 */
export function RewardedAdOverlay({ ad, onClose }: { ad: RewardAd; onClose: (result: RewardAdResponse | null) => void }) {
  const insets = useSafeAreaInsets();
  const { isDark, theme } = useAppearance();
  const t = familyTokens(isDark);
  const fg = isDark ? colors.dark.foreground : colors.foreground;
  const muted = isDark ? colors.dark.mutedForeground : colors.mutedForeground;

  const [stage, setStage] = useState<Stage>('playing');
  const stageRef = useRef<Stage>('playing');
  const [result, setResult] = useState<RewardAdResponse | null>(null);
  const [errorText, setErrorText] = useState('');
  const [fallback, setFallback] = useState(ad.kind === 'house' && !ad.video_url);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoLeft, setVideoLeft] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(ad.seconds);
  const web = useRef<WebView>(null);
  const card = useRef(new Animated.Value(0)).current;

  const counting = ad.kind === 'google' || fallback;
  const left = counting ? countdown : videoLeft;

  const finish = async () => {
    if (stageRef.current !== 'playing') return;
    stageRef.current = 'claiming';
    setStage('claiming');
    setProgress(1);
    try {
      const res = await trailApi.rewardEnergy();
      setResult(res.data);
      stageRef.current = 'done';
      setStage('done');
    } catch (error) {
      const message = isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message : undefined;
      setErrorText(message ?? 'Não foi possível dar a energia. Tente de novo.');
      stageRef.current = 'error';
      setStage('error');
    }
  };

  // A contagem do Google (e a do vídeo que falhou), que para com o app em segundo plano
  useEffect(() => {
    if (!counting) return;
    let active = AppState.currentState === 'active';
    const sub = AppState.addEventListener('change', (s) => (active = s === 'active'));
    const id = setInterval(() => {
      if (!active || stageRef.current !== 'playing') return;
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [counting]);
  useEffect(() => {
    if (!counting) return;
    setProgress(1 - countdown / ad.seconds);
    if (countdown <= 0) finish();
  }, [countdown, counting]);

  useEffect(() => {
    if (ad.kind !== 'house' || fallback) return;
    const id = setTimeout(finish, VIDEO_WATCHDOG_MS);
    return () => clearTimeout(id);
  }, [fallback]);

  useEffect(() => {
    if (stage === 'done' || stage === 'error') {
      Animated.timing(card, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [stage]);

  const onMessage = (event: WebViewMessageEvent) => {
    const msg = event.nativeEvent.data;
    if (msg === 'ended') finish();
    else if (msg === 'muted') setIsMuted(true);
    else if (msg === 'error') {
      if (stageRef.current === 'playing') setFallback(true);
    } else if (msg.startsWith('t:')) {
      const [, cur, dur] = msg.split(':').map(Number);
      if (dur > 0) {
        setProgress(cur / dur);
        setVideoLeft(Math.max(0, Math.ceil(dur - cur)));
      }
    }
  };

  const unmute = () => {
    web.current?.injectJavaScript('window.unmute && window.unmute(); true;');
    setIsMuted(false);
  };

  const finished = stage === 'done' || stage === 'error';
  const close = () => {
    if (finished) onClose(result);
  };

  const video = ad.kind === 'house' && !fallback;
  const gained = result?.gained ?? 0;

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={[styles.root, { backgroundColor: video ? '#000' : theme.background }]}>
        {video ? (
          <WebView
            ref={web}
            originWhitelist={['*']}
            source={{ html: houseHtml(ad.video_url ?? ''), baseUrl: 'https://memorizedireito.com' }}
            onMessage={onMessage}
            javaScriptEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            scrollEnabled={false}
            style={styles.web}
          />
        ) : ad.kind === 'house' ? (
          <View style={styles.still}>
            <Image source={PREMIUM_GIF} style={styles.gif} resizeMode="contain" />
            <Text style={[styles.stillTitle, { color: fg }]}>Memorize Direito Premium</Text>
            <Text style={[styles.stillText, { color: muted }]}>Energia infinita, todas as leis, fantasias exclusivas e sem anúncios.</Text>
          </View>
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html: GOOGLE_HTML, baseUrl: 'https://memorizedireito.com' }}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            style={styles.web}
          />
        )}

        {/* O andamento e o tempo que falta; o fechar só no fim */}
        <View style={[styles.bar, { top: insets.top }]}>
          <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <View style={[styles.top, { top: insets.top + 12 }]} pointerEvents="box-none">
          <Text style={styles.tag}>Anúncio</Text>
          <View style={styles.topRight}>
            {isMuted && stage === 'playing' ? (
              <Pressable onPress={unmute} style={styles.chip} accessibilityRole="button" accessibilityLabel="Ligar o som">
                <Volume2 size={16} color="#fff" />
                <Text style={styles.chipText}>Ligar o som</Text>
              </Pressable>
            ) : null}
            {stage === 'playing' && left !== null ? <Text style={[styles.chip, styles.chipText]}>{`Recompensa em ${left}s`}</Text> : null}
            {stage === 'claiming' ? <ActivityIndicator color="#fff" /> : null}
            {finished ? (
              <Pressable onPress={close} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Fechar o anúncio">
                <X size={20} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* O prêmio, dado sozinho no fim */}
        {finished ? (
          <Animated.View
            style={[
              styles.cardWrap,
              { paddingBottom: insets.bottom + 16, opacity: card, transform: [{ translateY: card.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] },
            ]}
          >
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              {stage === 'done' ? (
                <View style={styles.prizeRow}>
                  <View style={[styles.prizeIcon, { backgroundColor: t.brandSoft }]}>
                    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={t.brandSoftInk} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="m11 7-3 5h4l-3 5" />
                      <Path d="M14.856 6H16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.935" />
                      <Path d="M5.14 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.936" />
                      <Path d="M22 14v-4" />
                    </Svg>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.prizeTitle, { color: fg }]}>{gained > 0 ? 'Você ganhou!' : 'Pronto!'}</Text>
                    <Text style={[styles.prizeText, { color: muted }]}>{gained > 0 ? `+${gained} de energia` : 'Sua energia já está cheia'}</Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.prizeTitle, { color: fg, fontSize: 16 }]}>{errorText}</Text>
              )}
              <GameButton variant="main" size="lg" fullWidth onPress={close} style={{ marginTop: 14 }}>
                Fechar
              </GameButton>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  web: { flex: 1, backgroundColor: 'transparent' },
  still: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  gif: { width: 192, height: 192 },
  stillTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  stillText: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  bar: { position: 'absolute', left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  barFill: { height: '100%', backgroundColor: colors.family.brand },
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  cardWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  card: { borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  prizeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prizeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  prizeTitle: { fontSize: 18, fontWeight: '800' },
  prizeText: { fontSize: 14, fontWeight: '600', marginTop: 2 },
});
