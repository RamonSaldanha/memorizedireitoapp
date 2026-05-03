import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Alert,
  ToastAndroid,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Heart, Gem } from 'lucide-react-native';
import { playApi } from '../../api/play';
import { useUserStore } from '../../stores/userStore';
import { AppHeader } from '../../components/layout/AppHeader';
import { GameButton } from '../../components/ui/GameButton';
import { colors } from '../../theme/colors';
import { useAppearance } from '../../hooks/useAppearance';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Props = NativeStackScreenProps<PlayStackParamList, 'NoLives'>;

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
  .ad-wrap { width: 100%; min-height: 360px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
  .info { font-size: 13px; color: #64748b; text-align: center; }
</style>
</head>
<body>
  <div class="ad-wrap">
    <ins class="adsbygoogle"
         style="display:block;width:100%;min-height:330px"
         data-ad-client="${ADSENSE_CLIENT_ID}"
         data-ad-slot="${ADSENSE_SLOT_ID}"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
  </div>
  <div id="info" class="info">Aguarde <span id="counter">${COUNTDOWN_SECONDS}</span>s para coletar sua vida…</div>

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
        infoEl.textContent = 'Pronto! Toque em Coletar vida.';
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

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert('', message);
  }
}

export function NoLivesScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { updateFromApi, xp: currentXp } = useUserStore();
  const { theme } = useAppearance();
  const webViewRef = useRef<WebView | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (event.nativeEvent.data === 'ready') {
      setIsReady(true);
    }
  };

  const handleCollect = async () => {
    if (!isReady || isProcessing) return;
    setIsProcessing(true);
    try {
      const res = await playApi.rewardLife();
      if (res.data.success) {
        updateFromApi({ ...res.data.user, xp: currentXp });
        queryClient.invalidateQueries({ queryKey: ['play-map'] });
        queryClient.invalidateQueries({ queryKey: ['disciplines'] });
        navigation.navigate('PlayMap');
      } else {
        showToast('Não foi possível resgatar a vida. Tente novamente.');
        setIsProcessing(false);
      }
    } catch {
      showToast('Erro ao processar recompensa. Tente novamente.');
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Heart size={26} color={colors.red[500]} />
          <Text style={[styles.title, { color: theme.foreground }]}>
            Você ficou sem vidas
          </Text>
        </View>

        <View style={styles.webviewWrap}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: AD_HTML, baseUrl: 'https://memorizedireito.com' }}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            style={styles.webview}
          />
        </View>

        <View style={styles.actions}>
          <GameButton
            variant="red"
            size="lg"
            fullWidth
            disabled={!isReady || isProcessing}
            onPress={handleCollect}
          >
            {isProcessing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              'Coletar vida'
            )}
          </GameButton>

          <View style={styles.actionSpacer} />

          <GameButton
            variant="blue"
            size="md"
            fullWidth
            onPress={() => navigation.navigate('Subscription')}
          >
            <Gem size={18} color="#ffffff" />
            <Text style={styles.premiumLabel}>Assinar Premium</Text>
          </GameButton>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  webviewWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  actions: {
    marginTop: 16,
  },
  actionSpacer: {
    height: 12,
  },
  premiumLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
