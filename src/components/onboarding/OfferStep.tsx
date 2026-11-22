import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { familyTokens } from '../../theme/colors';
import { useCountdown } from '../../hooks/useCountdown';
import type { OnboardingData, WelcomeOffer } from '../../api/onboarding';
import { Marked, PerkList } from '../trail/PremiumPieces';
import { tw, type ObTheme } from './palette';

type Props = {
  percent: number;
  yearlyPlan: OnboardingData['yearly_plan'];
  welcomeOffer: WelcomeOffer | null;
  isDark: boolean;
  theme: ObTheme;
  reduce: boolean;
};

// A boneca recebendo o presente (427x627, com vazio em cima): a moldura corta 18,74% da largura
// e fica com a proporção 427:520, da mesma altura das ilustrações do convite Premium
const GIFT = require('../../../assets/img/presente.gif');
const HERO_H = 200;
const HERO_W = HERO_H * (427 / 520);

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

/**
 * 8. O presente de boas-vindas: 15% no anual por 24h. Mesmo desenho do web (Onboarding/Index.vue)
 * e do convite Premium: a boneca recebendo o presente, o desconto com marca-texto, o preço, o
 * relógio e as vantagens em etiquetas.
 */
export function OfferStep({ percent, yearlyPlan, welcomeOffer, isDark, theme }: Props) {
  const { text: remaining } = useCountdown(welcomeOffer?.expires_at);
  const discounted = yearlyPlan ? Math.round(yearlyPlan.price * (1 - percent / 100)) : null;
  const t = familyTokens(isDark);

  return (
    <View style={styles.section}>
      <View style={[styles.frame, { width: HERO_W, height: HERO_H }]}>
        <Image
          source={GIFT}
          style={{ width: HERO_W, height: HERO_W * (627 / 427), marginTop: -HERO_W * 0.1874 }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>

      <Text style={[styles.kicker, { color: isDark ? tw.pink300 : tw.pink500 }]}>Presente de boas-vindas</Text>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]}>{percent}% off no </Text>
        <Marked text="plano anual" fontSize={28} color={theme.text} delay={350} />
      </View>

      {yearlyPlan && discounted !== null ? (
        <View style={styles.prices}>
          <Text style={[styles.oldPrice, { color: theme.muted }]}>{formatCurrency(yearlyPlan.price)} por ano</Text>
          <Text style={[styles.price, { color: theme.text }]}>
            {formatCurrency(discounted)}
            <Text style={[styles.priceUnit, { color: theme.muted }]}> por ano</Text>
          </Text>
          <Text style={[styles.monthly, { color: theme.muted }]}>Sai por {formatCurrency(Math.round(discounted / 12))} por mês</Text>
        </View>
      ) : null}

      <View style={[styles.timer, { backgroundColor: t.brandSoft }]}>
        <Text style={[styles.timerText, { color: t.brandSoftInk }]}>
          {remaining ? (
            <>
              Termina em <Text style={styles.tabular}>{remaining}</Text>
            </>
          ) : (
            'Vale por 24 horas'
          )}
        </Text>
      </View>

      <View style={styles.perks}>
        <PerkList delay={500} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: 8, alignItems: 'center' },
  frame: { overflow: 'hidden', alignItems: 'center' },
  kicker: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  titleRow: { marginTop: 4, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', flexWrap: 'wrap' },
  title: { fontSize: 28, fontWeight: '800', lineHeight: 28 * 1.2 },
  prices: { marginTop: 12, alignItems: 'center' },
  oldPrice: { fontSize: 14, fontWeight: '700', textDecorationLine: 'line-through' },
  price: { fontSize: 36, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  priceUnit: { fontSize: 18, fontWeight: '700' },
  monthly: { fontSize: 14 },
  timer: { marginTop: 16, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6 },
  timerText: { fontSize: 14, fontWeight: '800' },
  tabular: { fontVariant: ['tabular-nums'] },
  perks: { marginTop: 20 },
});
