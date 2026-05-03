import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Image, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from './src/stores/authStore';
import { useUserStore } from './src/stores/userStore';
import { authApi } from './src/api/auth';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppearance } from './src/hooks/useAppearance';
import { usePreferencesStore } from './src/stores/preferencesStore';
import { Logo } from './src/components/Logo';

SplashScreen.preventAutoHideAsync();

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
  const [splashVisible, setSplashVisible] = useState(true);

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

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
      const timer = setTimeout(() => setSplashVisible(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  if (splashVisible) {
    return (
      <View style={splashStyles.container}>
        <Image
          source={require('./assets/icon.jpg')}
          style={splashStyles.icon}
          resizeMode="contain"
        />
        <Logo width={240} />
      </View>
    );
  }

  return <RootNavigator />;
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 32,
  },
  icon: {
    width: 160,
    height: 160,
  },
});

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
