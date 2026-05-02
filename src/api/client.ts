import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Em dev: IP da sua máquina na rede local. Em prod: URL do servidor.
export const API_BASE_URL = __DEV__
  ? 'https://memorizedireito.com/api/v1'  // Android emulator → localhost da máquina
  : 'https://memorizedireito.com/api/v1';

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

// Em 401: limpa token (logout silencioso — o RootNavigator vai reagir via store)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);
