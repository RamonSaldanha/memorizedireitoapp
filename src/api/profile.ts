import { apiClient } from './client';
import type { UserData } from './auth';
import type { AvatarConfig } from '../lib/avatar';

export const profileApi = {
  updateProfile: (data: { name?: string; email?: string }) =>
    apiClient.patch<UserData>('/profile', data),

  updatePassword: (data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => apiClient.put<{ message: string }>('/profile/password', data),

  // Mesma validação do editor da web: peça fora da lista, cor fora de #rrggbb
  // ou fantasia sem assinatura voltam 422.
  updateAvatar: (avatar: AvatarConfig) =>
    apiClient.put<UserData>('/profile/avatar', { avatar }),

  logout: () => apiClient.post('/auth/logout'),
};
