import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';

// Em dev: IP da sua máquina na rede local. Em prod: URL do servidor.
export const API_BASE_URL = __DEV__
  ? 'https://memorizedireito.com/api/v1'  // Android emulator → localhost da máquina
  : 'https://memorizedireito.com/api/v1';

export const WEB_BASE_URL = 'https://memorizedireito.com';
export const WEB_SUBSCRIPTION_URL = `${WEB_BASE_URL}/subscription`;

export const TOKEN_KEY = 'sanctum_token';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Injeta token em toda requisição autenticada
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Em 401: limpa token e sincroniza os stores (sem bater na API para evitar loop)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      useAuthStore.setState({ token: null, user: null });
      useUserStore.getState().reset();
    }
    return Promise.reject(error);
  }
);
