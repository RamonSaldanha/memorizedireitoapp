import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './src/stores/authStore';
import { useUserStore } from './src/stores/userStore';
import { authApi } from './src/api/auth';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppearance } from './src/hooks/useAppearance';
import { usePreferencesStore } from './src/stores/preferencesStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ThemedStatusBar() {
  const { isDark } = useAppearance();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function AppBootstrap() {
  const { initialize, token, setUser } = useAuthStore();
  const { updateFromApi } = useUserStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      initialize(),
      usePreferencesStore.getState().initialize(),
    ]).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (token) {
      authApi.me()
        .then((res) => {
          setUser(res.data);
          updateFromApi({
            lives: res.data.lives,
            has_infinite_lives: res.data.has_infinite_lives,
            xp: res.data.xp,
            name: res.data.name,
            avatar: res.data.avatar,
          });
        })
        .catch(() => {});
    }
  }, [token]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return <RootNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemedStatusBar />
        <AppBootstrap />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
