import { apiClient } from './client';

export type SubscriptionPlan = {
  price_id: string;
  price: number;
  monthly_price: number;
  interval: 'month' | 'year';
  interval_count: number;
  currency: string;
};

export type SubscriptionStatus = {
  has_active_subscription: boolean;
  ends_at: string | null;
  cancelled: boolean;
  next_billing_date: string | null;
  plans: {
    monthly?: SubscriptionPlan;
    quarterly?: SubscriptionPlan;
    yearly?: SubscriptionPlan;
  };
};

export const subscriptionApi = {
  status: () => apiClient.get<SubscriptionStatus>('/subscription/status'),

  createCheckoutSession: (price_id: string, success_url?: string, cancel_url?: string) =>
    apiClient.post<{ url: string }>('/subscription/checkout-session', {
      price_id,
      success_url,
      cancel_url,
    }),

  cancel: () =>
    apiClient.post<{ success: boolean; ends_at: string | null }>('/subscription/cancel'),

  resume: () => apiClient.post<{ success: boolean }>('/subscription/resume'),
};
