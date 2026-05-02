import { apiClient } from './client';

export type UserData = {
  id: number;
  name: string;
  email: string;
  lives: number;
  has_infinite_lives: boolean;
  xp: number;
  is_admin: boolean;
  email_verified_at: string | null;
  avatar: string | null;
};

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ token: string; user: UserData }>('/auth/login', { email, password }),

  register: (name: string, email: string, password: string, password_confirmation: string) =>
    apiClient.post<{ token: string; user: UserData }>('/auth/register', {
      name, email, password, password_confirmation,
    }),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get<UserData>('/me'),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, email: string, password: string, password_confirmation: string) =>
    apiClient.post('/auth/reset-password', { token, email, password, password_confirmation }),

  resendVerification: () => apiClient.post('/auth/email/resend-verification'),
};
