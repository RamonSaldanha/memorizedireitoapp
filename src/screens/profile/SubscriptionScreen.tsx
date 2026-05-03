import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Modal from 'react-native-modal';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Heart, Zap, BookOpen, Shield, CheckCircle, Gem } from 'lucide-react-native';
import { AppHeader } from '../../components/layout/AppHeader';
import { GameButton } from '../../components/ui/GameButton';
import { colors } from '../../theme/colors';
import { useAppearance } from '../../hooks/useAppearance';
import { subscriptionApi, SubscriptionPlan } from '../../api/subscription';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';

type PlanKey = 'monthly' | 'quarterly' | 'yearly';

const PLAN_LABELS: Record<PlanKey, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

function formatCurrency(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert('', message);
  }
}

function getDiscount(plan: SubscriptionPlan, monthly: SubscriptionPlan | undefined): string | null {
  if (!monthly) return null;
  const ratio = plan.monthly_price / monthly.price;
  if (ratio >= 1) return null;
  const percent = Math.round((1 - ratio) * 100);
  return percent > 0 ? `-${percent}%` : null;
}

export function SubscriptionScreen() {
  const queryClient = useQueryClient();
  const { isDark, theme } = useAppearance();
  const { hasInfiniteLives } = useUserStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('quarterly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'resume' | null>(null);

  const statusQuery = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => subscriptionApi.status().then((res) => res.data),
    staleTime: 10_000,
  });

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionApi.cancel(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      await refreshUser();
      setConfirmAction(null);
    },
    onError: () => {
      setConfirmAction(null);
      showToast('Não foi possível cancelar. Tente novamente.');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => subscriptionApi.resume(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      await refreshUser();
      setConfirmAction(null);
    },
    onError: () => {
      setConfirmAction(null);
      showToast('Não foi possível retomar. Tente novamente.');
    },
  });

  const refreshUser = async () => {
    try {
      const res = await authApi.me();
      useAuthStore.getState().setUser(res.data);
      useUserStore.getState().updateFromApi(res.data);
    } catch {
      // ignore — UI vai depender do próximo /me
    }
  };

  const handleSubscribe = async () => {
    const plan = statusQuery.data?.plans?.[selectedPlan];
    if (!plan) {
      showToast('Plano indisponível no momento. Tente novamente em instantes.');
      return;
    }
    setIsProcessing(true);
    try {
      const { data } = await subscriptionApi.createCheckoutSession(plan.price_id);
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        'memorize://subscription/return'
      );
      if (result.type === 'success') {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['subscription-status'] }),
          refreshUser(),
        ]);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Erro ao iniciar checkout.';
      showToast(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  if (statusQuery.isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <AppHeader />
        <ActivityIndicator size="large" color={colors.purple[500]} style={{ marginTop: 80 }} />
      </View>
    );
  }

  const status = statusQuery.data;
  const plans = status?.plans ?? {};

  const currentPlanKey: PlanKey | null = (() => {
    if (!status?.has_active_subscription) return null;
    if (!plans) return null;
    // Não temos diretamente o price_id da subscription ativa; o status do backend
    // só sinaliza que está ativa. Como a flag has_infinite_lives é o que importa
    // pro app, não exibimos qual plano específico aqui.
    return null;
  })();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero / título */}
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.foreground }]}>
            Seja Premium e estude sem limites
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.gray[500] }]}>
            Desbloqueie todos os recursos e acelere seus estudos
          </Text>
        </View>

        {/* Benefícios */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <BenefitRow
            icon={Heart}
            title="Vidas infinitas"
            description="Estude sem interrupções"
            theme={theme}
          />
          <BenefitRow
            icon={Zap}
            title="Sem anúncios"
            description="Experiência limpa e focada"
            theme={theme}
          />
          <BenefitRow
            icon={BookOpen}
            title="Todas as legislações"
            description="Acesso completo ao conteúdo"
            theme={theme}
          />
          <BenefitRow
            icon={Shield}
            title="Garantia de 7 dias"
            description="Reembolso total se não gostar"
            theme={theme}
            isLast
          />
        </View>

        {/* Estado: assinatura ativa */}
        {status?.has_active_subscription ? (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 18 }]}>
            <View style={styles.activeHeader}>
              <Gem size={22} color={colors.blue[500]} />
              <Text style={[styles.activeTitle, { color: theme.foreground }]}>
                Assinatura Premium ativa
              </Text>
            </View>
            {status.cancelled && status.ends_at && (
              <Text style={[styles.activeRow, { color: colors.gray[500] }]}>
                Será cancelada em {status.ends_at}
              </Text>
            )}
            {!status.cancelled && status.next_billing_date && (
              <Text style={[styles.activeRow, { color: colors.gray[500] }]}>
                Próxima cobrança em {status.next_billing_date}
              </Text>
            )}
            <View style={{ height: 16 }} />
            {status.cancelled ? (
              <GameButton
                variant="purple"
                size="md"
                fullWidth
                isDark={isDark}
                disabled={resumeMutation.isPending}
                onPress={() => setConfirmAction('resume')}
              >
                {resumeMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  'Retomar assinatura'
                )}
              </GameButton>
            ) : (
              <GameButton
                variant="white"
                size="md"
                fullWidth
                isDark={isDark}
                disabled={cancelMutation.isPending}
                onPress={() => setConfirmAction('cancel')}
              >
                {cancelMutation.isPending ? (
                  <ActivityIndicator color={colors.gray[700]} />
                ) : (
                  'Cancelar assinatura'
                )}
              </GameButton>
            )}
          </View>
        ) : (
          <>
            {/* Plan picker */}
            <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Escolher plano</Text>
            <View style={styles.planGrid}>
              {(['monthly', 'quarterly', 'yearly'] as PlanKey[]).map((key) => {
                const plan = plans[key];
                if (!plan) return null;
                const isActive = selectedPlan === key;
                const discount = key === 'monthly' ? null : getDiscount(plan, plans.monthly);
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedPlan(key)}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: isActive ? colors.purple[500] : theme.border,
                      },
                      isActive && {
                        backgroundColor: isDark ? colors.purple[900] : colors.purple[50],
                      },
                    ]}
                  >
                    {discount && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{discount}</Text>
                      </View>
                    )}
                    <Text style={[styles.planLabel, { color: theme.foreground }]}>
                      {PLAN_LABELS[key]}
                    </Text>
                    <Text style={[styles.planPrice, { color: theme.foreground }]}>
                      {formatCurrency(plan.price)}
                    </Text>
                    <Text style={[styles.planMonthly, { color: colors.gray[500] }]}>
                      {key === 'monthly'
                        ? '/mês'
                        : `${formatCurrency(plan.monthly_price)}/mês`}
                    </Text>
                    {isActive && (
                      <View style={styles.checkIcon}>
                        <CheckCircle size={16} color={colors.purple[500]} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Resumo + CTA */}
            <View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border, padding: 18 },
              ]}
            >
              <Text style={[styles.summaryTitle, { color: theme.foreground }]}>
                Resumo do faturamento
              </Text>
              <View style={styles.summaryRow}>
                <Text style={{ color: colors.gray[500] }}>{PLAN_LABELS[selectedPlan]}</Text>
                <Text style={{ color: theme.foreground, fontWeight: '600' }}>
                  {plans[selectedPlan] ? formatCurrency(plans[selectedPlan]!.price) : '—'}
                </Text>
              </View>
              <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.totalLabel, { color: theme.foreground }]}>Total</Text>
                <Text style={[styles.totalValue, { color: theme.foreground }]}>
                  {plans[selectedPlan] ? formatCurrency(plans[selectedPlan]!.price) : '—'}
                </Text>
              </View>

              <View style={{ height: 16 }} />

              <GameButton
                variant="purple"
                size="lg"
                fullWidth
                disabled={isProcessing || !plans[selectedPlan]}
                onPress={handleSubscribe}
              >
                {isProcessing ? <ActivityIndicator color="#fff" /> : 'Assinar agora'}
              </GameButton>

              <Text style={[styles.disclaimer, { color: colors.gray[500] }]}>
                Pagamento seguro pelo Stripe. Cupom de desconto disponível no checkout.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal de confirmação */}
      <Modal
        isVisible={confirmAction !== null}
        onBackdropPress={() => setConfirmAction(null)}
        onBackButtonPress={() => setConfirmAction(null)}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.foreground }]}>
            {confirmAction === 'cancel' ? 'Cancelar assinatura' : 'Retomar assinatura'}
          </Text>
          <Text style={[styles.modalSubtitle, { color: colors.gray[500] }]}>
            {confirmAction === 'cancel'
              ? 'Você manterá os benefícios até o fim do período já pago.'
              : 'Sua assinatura voltará a renovar normalmente.'}
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              style={styles.modalButtonSecondary}
              onPress={() => setConfirmAction(null)}
            >
              <Text style={{ color: colors.gray[500] }}>Voltar</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalButtonPrimary,
                {
                  backgroundColor:
                    confirmAction === 'cancel' ? colors.red[600] : colors.purple[600],
                },
              ]}
              onPress={() => {
                if (confirmAction === 'cancel') cancelMutation.mutate();
                else if (confirmAction === 'resume') resumeMutation.mutate();
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {confirmAction === 'cancel' ? 'Cancelar' : 'Retomar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type BenefitRowProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  theme: { foreground: string; border: string };
  isLast?: boolean;
};

function BenefitRow({ icon: Icon, title, description, theme, isLast }: BenefitRowProps) {
  return (
    <View
      style={[
        styles.benefitRow,
        !isLast && { borderBottomColor: theme.border, borderBottomWidth: 1 },
      ]}
    >
      <Icon size={20} color={colors.gray[600]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.benefitTitle, { color: theme.foreground }]}>{title}</Text>
        <Text style={[styles.benefitDescription, { color: colors.gray[500] }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'flex-start' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  hero: { marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  heroSubtitle: { fontSize: 14, textAlign: 'center', marginTop: 4 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  benefitTitle: { fontSize: 14, fontWeight: '600' },
  benefitDescription: { fontSize: 12, marginTop: 2 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 4,
  },
  planGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  planCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    paddingTop: 14,
    minHeight: 100,
    position: 'relative',
  },
  discountBadge: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    backgroundColor: colors.green[500],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    zIndex: 1,
  },
  discountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  planLabel: { fontSize: 13, fontWeight: '700' },
  planPrice: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  planMonthly: { fontSize: 11, marginTop: 2 },
  checkIcon: { position: 'absolute', top: 6, right: 6 },
  summaryTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  disclaimer: { fontSize: 11, textAlign: 'center', marginTop: 12 },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  activeTitle: { fontSize: 16, fontWeight: '700' },
  activeRow: { fontSize: 13, marginTop: 4 },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButtonSecondary: { paddingHorizontal: 16, paddingVertical: 10 },
  modalButtonPrimary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
