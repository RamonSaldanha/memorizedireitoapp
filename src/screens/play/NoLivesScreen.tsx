import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
  ToastAndroid,
} from 'react-native';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Heart, Play } from 'lucide-react-native';
import { playApi } from '../../api/play';
import { useUserStore } from '../../stores/userStore';
import { AppHeader } from '../../components/layout/AppHeader';
import { colors } from '../../theme/colors';
import { useAppearance } from '../../hooks/useAppearance';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Props = NativeStackScreenProps<PlayStackParamList, 'NoLives'>;

const adUnitId = __DEV__
  ? TestIds.REWARDED
  : 'ca-app-pub-2585274176504938/4636040733';

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

  const rewardedRef = useRef<RewardedAd | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const ad = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    rewardedRef.current = ad;

    const unsubLoaded = ad.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => setIsLoaded(true),
    );

    const unsubEarned = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async () => {
        setIsProcessing(true);
        try {
          const res = await playApi.rewardLife();
          if (res.data.success) {
            updateFromApi({ ...res.data.user, xp: currentXp });
            queryClient.invalidateQueries({ queryKey: ['play-map'] });
            navigation.navigate('PlayMap');
          } else {
            showToast('Não foi possível resgatar a vida. Tente novamente.');
          }
        } catch {
          showToast('Erro ao processar recompensa. Tente novamente.');
        } finally {
          setIsProcessing(false);
        }
      },
    );

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      showToast('Anúncio indisponível. Tente novamente em instantes.');
    });

    ad.load();

    return () => {
      unsubLoaded();
      unsubEarned();
      unsubError();
    };
  }, []);

  const handleWatchAd = () => {
    if (!isLoaded || isProcessing) return;
    rewardedRef.current?.show();
  };

  const ctaDisabled = !isLoaded || isProcessing;

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

        <View style={styles.spacer} />

        <Pressable
          style={[styles.cta, ctaDisabled && styles.ctaDisabled]}
          onPress={handleWatchAd}
          disabled={ctaDisabled}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Play size={20} color="#fff" fill="#fff" />
              <Text style={styles.ctaText}>
                {isLoaded ? 'Assistir anúncio e ganhar 1 vida' : 'Carregando anúncio…'}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={styles.premiumLink}
          onPress={() => Linking.openURL('https://memorizedireito.com/subscription')}
        >
          <Text style={[styles.premiumText, { color: colors.purple[500] }]}>
            ⭐ Assinar Premium
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  spacer: { flex: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.red[500],
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  premiumLink: {
    marginTop: 16,
    paddingVertical: 8,
  },
  premiumText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
