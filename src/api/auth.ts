import { apiClient } from './client';
import type { AvatarConfig } from '../lib/avatar';
import type { WelcomeOffer } from './onboarding';

export type UserData = {
  id: number;
  name: string;
  email: string;
  lives: number;
  has_infinite_lives: boolean;
  xp: number;
  current_streak: number;
  longest_streak: number;
  is_admin: boolean;
  email_verified_at: string | null;
  // Nulo para quem nunca montou o avatar (o app mostra as iniciais). Opcional
  // porque servidor sem o campo também tem de funcionar.
  avatar_config?: Partial<AvatarConfig> | null;
  // Onboarding: pendente só para quem se cadastrou por esta versão do app.
  // Opcionais pelo mesmo motivo do avatar.
  needs_onboarding?: boolean;
  // Oferta de boas-vindas (15% no anual) enquanto valem as 24h; vira o banner do mapa.
  welcome_offer?: WelcomeOffer | null;
};

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ token: string; user: UserData }>('/auth/login', { email, password }),

  // `onboarding: true` avisa o servidor que este app sabe mostrar o onboarding;
  // sem ele, a conta já nasce com o onboarding concluído (versões antigas).
  register: (name: string, email: string, password: string, password_confirmation: string) =>
    apiClient.post<{ token: string; user: UserData }>('/auth/register', {
      name, email, password, password_confirmation, onboarding: true,
    }),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get<UserData>('/me'),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, email: string, password: string, password_confirmation: string) =>
    apiClient.post('/auth/reset-password', { token, email, password, password_confirmation }),

  resendVerification: () => apiClient.post('/auth/email/resend-verification'),
};
