import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gift, Timer } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useCountdown } from '../../hooks/useCountdown';
import type { OnboardingData, WelcomeOffer } from '../../api/onboarding';
import { ChunkyView } from './ChunkyPressable';
import { Rise, Stamp, Wiggle } from './motion';
import { tw, type ObTheme } from './palette';

type Props = {
  percent: number;
  yearlyPlan: OnboardingData['yearly_plan'];
  welcomeOffer: WelcomeOffer | null;
  isDark: boolean;
  theme: ObTheme;
  reduce: boolean;
};

const BENEFITS = [
  { title: 'Vidas infinitas', text: 'Erre à vontade e siga jogando' },
  { title: 'Fantasias exclusivas', text: 'Toga e astronauta para o seu avatar' },
  { title: 'Sem anúncios', text: 'Só você e a lei seca' },
  { title: 'Todas as legislações', text: 'A trilha que quiser, sem limite' },
  { title: 'Garantia de 7 dias', text: 'Não gostou, devolvemos tudo' },
];

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

/** 8. O presente de boas-vindas: 15% no anual por 24h. */
export function OfferStep({ percent, yearlyPlan, welcomeOffer, isDark, theme, reduce }: Props) {
  const { text: remaining } = useCountdown(welcomeOffer?.expires_at);
  const discounted = yearlyPlan ? Math.round(yearlyPlan.price * (1 - percent / 100)) : null;

  return (
    <View style={styles.section}>
      <Rise index={0} reduce={reduce}>
        <ChunkyView
          radius={24}
          depth={8}
          shadowColor={theme.shadow}
          style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}
        >
          <Stamp reduce={reduce} style={styles.stamp}>
            <Text style={[styles.stampPercent, { color: isDark ? tw.green400 : tw.green600 }]}>-{percent}%</Text>
            <Text style={[styles.stampLabel, { color: isDark ? tw.green400 : tw.green600 }]}>ANUAL</Text>
          </Stamp>

          <Wiggle reduce={reduce} style={[styles.gift, { backgroundColor: isDark ? tw.pink950_60 : tw.pink100 }]}>
            <Gift size={36} color={isDark ? tw.pink300 : tw.pink500} />
          </Wiggle>
          <Text style={[styles.kicker, { color: isDark ? tw.pink300 : tw.pink500 }]}>Presente de boas-vindas</Text>
          <Text style={[styles.title, { color: theme.text }]}>{percent}% off no plano anual</Text>

          {yearlyPlan && discounted !== null && (
            <View style={styles.prices}>
              <Text style={styles.oldPrice}>{formatCurrency(yearlyPlan.price)} por ano</Text>
              <Text style={[styles.price, { color: isDark ? '#fff' : colors.gray[900] }]}>
                {formatCurrency(discounted)}
                <Text style={[styles.priceUnit, { color: theme.muted }]}> por ano</Text>
              </Text>
              <Text style={[styles.monthly, { color: theme.muted }]}>
                Sai por {formatCurrency(Math.round(discounted / 12))} por mês
              </Text>
            </View>
          )}

          <View style={[styles.timer, { backgroundColor: isDark ? tw.orange950_50 : tw.orange50 }]}>
            <Timer size={16} color={isDark ? tw.orange300 : tw.orange600} />
            <Text style={[styles.timerText, { color: isDark ? tw.orange300 : tw.orange600 }]}>
              {remaining ? (
                <>
                  Termina em <Text style={styles.tabular}>{remaining}</Text>
                </>
              ) : (
                'Válida por 24 horas'
              )}
            </Text>
          </View>

          <View style={[styles.benefits, { borderTopColor: theme.hairline }]}>
            {BENEFITS.map((b, i) => (
              <Rise
                key={b.title}
                index={i + 2}
                reduce={reduce}
                style={[styles.benefit, i > 0 && { borderTopWidth: 2, borderTopColor: theme.hairline }]}
              >
                <Text style={[styles.benefitTitle, { color: theme.text }]}>{b.title}</Text>
                <Text style={[styles.benefitText, { color: theme.muted }]}>{b.text}</Text>
              </Rise>
            ))}
          </View>
        </ChunkyView>
      </Rise>

      <Text style={[styles.note, { color: theme.muted }]}>
        Esse desconto só aparece agora, no seu cadastro. Ele fica guardado por 24 horas e depois some.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 16,
  },
  card: {
    overflow: 'hidden',
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  stamp: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderStyle: 'dashed',
    borderColor: tw.green500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampPercent: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '800',
  },
  stampLabel: {
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '800',
    letterSpacing: 0.25,
  },
  gift: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  title: {
    marginTop: 4,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.75,
    textAlign: 'center',
  },
  prices: {
    marginTop: 20,
    alignItems: 'center',
  },
  oldPrice: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.gray[400],
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  priceUnit: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  monthly: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  timer: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  timerText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  benefits: {
    marginTop: 24,
    alignSelf: 'stretch',
    borderTopWidth: 2,
  },
  benefit: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  benefitTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  benefitText: {
    fontSize: 12,
    lineHeight: 16,
  },
  note: {
    marginTop: 20,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
