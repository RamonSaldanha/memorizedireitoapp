import { apiClient } from './client';
import type { UserData } from './auth';

export const profileApi = {
  updateProfile: (data: { name?: string; email?: string }) =>
    apiClient.patch<UserData>('/profile', data),

  updatePassword: (data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => apiClient.put<{ message: string }>('/profile/password', data),

  logout: () => apiClient.post('/auth/logout'),
};
