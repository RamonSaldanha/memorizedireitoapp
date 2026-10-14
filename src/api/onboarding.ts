import { apiClient } from './client';
import type { UserData } from './auth';
import type { Area, Goal, LegislationOption, Minutes } from '../lib/onboarding/quiz';

/** Oferta de boas-vindas (15% no anual) enquanto as 24h valem. */
export type WelcomeOffer = { percent_off: number; expires_at: string };

export type OnboardingData = {
  /** Já concluído (em outro aparelho, ou pulado): o app só vai para o mapa. */
  completed: boolean;
  legislations: LegislationOption[];
  challenge_done: boolean;
  /** Preço do anual em centavos. Nulo se o Stripe não respondeu. */
  yearly_plan: { price: number; monthly_price: number } | null;
  welcome_offer: WelcomeOffer | null;
};

export type TrailPayload = {
  goal: Goal;
  area: Area;
  minutes: Minutes;
  legislation_ids: number[];
};

/**
 * Onboarding de quem se cadastrou pelo app: as mesmas telas e regras do site.
 * Os POSTs respondem 409 se o onboarding já foi concluído.
 */
export const onboardingApi = {
  get: () => apiClient.get<OnboardingData>('/onboarding'),

  saveTrail: (payload: TrailPayload) => apiClient.post<{ success: boolean }>('/onboarding/trail', payload),

  completeChallenge: () =>
    apiClient.post<{ xp_gained: number; user: UserData }>('/onboarding/challenge'),

  startOffer: () => apiClient.post<{ welcome_offer: WelcomeOffer | null }>('/onboarding/offer'),

  finish: () => apiClient.post<{ user: UserData }>('/onboarding/finish'),
};
