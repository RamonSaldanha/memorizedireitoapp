import { apiClient } from './client';
import type { UserData } from './auth';
import type { AvatarConfig } from '../lib/avatar';

/** Conquista com estrela, como sai no perfil público. */
export type PublicAchievement = {
  uuid: string;
  name: string;
  stars: number;
  badge_url: string | null;
  icon: string;
  color: string;
};

/** O que um usuário vê de outro (os campos são escolhidos um a um no servidor). */
export type PublicProfile = {
  profile: {
    first_name: string;
    last_name: string;
    avatar_config: Partial<AvatarConfig> | null;
    bio: string | null;
    streak: number;
    is_self: boolean;
  };
  achievements: PublicAchievement[];
};

/** Configurações do Perfil além do usuário: descrição, conquistas no perfil público e e-mails. */
export type ProfileSettings = {
  bio: string | null;
  profile_uuid: string;
  receives_emails: boolean;
  achievements: { id: number; name: string; stars: number; badge_url: string | null; hidden: boolean }[];
};

export const profileApi = {
  // `bio`: a descrição do perfil público, até 160 caracteres, em uma linha
  updateProfile: (data: { name?: string; email?: string; bio?: string | null }) =>
    apiClient.patch<UserData>('/profile', data),

  publicProfile: (uuid: string) => apiClient.get<PublicProfile>(`/profiles/${uuid}`),

  settings: () => apiClient.get<ProfileSettings>('/settings'),
  // As disciplinas que não aparecem no perfil público
  updateAchievements: (hidden: number[]) => apiClient.put<ProfileSettings>('/settings/achievements', { hidden }),
  updateEmails: (receivesEmails: boolean) => apiClient.put<ProfileSettings>('/settings/emails', { receives_emails: receivesEmails }),

  // Apaga a conta de vez; exige a senha
  deleteAccount: (password: string) => apiClient.delete<{ message: string }>('/profile', { data: { password } }),

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
