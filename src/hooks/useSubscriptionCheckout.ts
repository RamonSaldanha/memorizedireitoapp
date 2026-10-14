import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { authApi } from '../api/auth';
import { WEB_SUBSCRIPTION_URL } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';

export type SubscriptionToast = { title: string; variant: 'success' | 'error' | 'default' };

/**
 * Abre a página de assinatura do site e, quando a pessoa volta para o app,
 * ressincroniza `/me` — é o que faz o status premium (e o cadeado das
 * fantasias do avatar) mudar sem reabrir o app.
 *
 * Quem usa desenha o overlay de `isSyncing` e o `toast`: o perfil e o editor de
 * avatar.
 */
export function useSubscriptionCheckout() {
  const setUser = useAuthStore((s) => s.setUser);
  const [isSyncing, setIsSyncing] = useState(false);
  const pendingSyncRef = useRef(false);
  const [toast, setToast] = useState<SubscriptionToast | null>(null);

  const log = (msg: string) => console.log('[SUB]', new Date().toLocaleTimeString(), msg);

  const syncStatus = async () => {
    log('sync: buscando /me…');
    setIsSyncing(true);
    try {
      const res = await authApi.me();
      setUser(res.data);
      useUserStore.getState().updateFromApi(res.data);
      const ativo = res.data.has_infinite_lives;
      log(`sync OK: premium=${ativo} lives=${res.data.lives}`);
      setToast({
        title: ativo ? 'Sua assinatura está ativa' : 'Sem assinatura ativa',
        variant: 'default',
      });
    } catch (e: any) {
      log(`sync ERRO: ${e?.message ?? 'desconhecido'}`);
      setToast({ title: 'Não foi possível atualizar o status', variant: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Quando o app volta ao primeiro plano após abrir o site de assinatura,
  // re-sincroniza o status. Só dispara numa transição real background → active
  // (evita um 'active' espúrio que o Android emite ao abrir o Custom Tab).
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      const voltouAoApp = /inactive|background/.test(prev) && next === 'active';
      log(`AppState ${prev}→${next} pending=${pendingSyncRef.current} voltou=${voltouAoApp}`);
      if (voltouAoApp && pendingSyncRef.current) {
        pendingSyncRef.current = false;
        log('AppState disparou sync');
        syncStatus();
      }
    });
    return () => sub.remove();
  }, []);

  const openSubscription = async () => {
    log('clicou Premium → abrindo navegador');
    pendingSyncRef.current = true;
    let result: WebBrowser.WebBrowserResult | undefined;
    try {
      result = await WebBrowser.openBrowserAsync(WEB_SUBSCRIPTION_URL);
    } catch (e: any) {
      pendingSyncRef.current = false;
      log(`ERRO ao abrir navegador: ${e?.message ?? 'desconhecido'}`);
      setToast({ title: 'Não foi possível abrir a página de assinatura', variant: 'error' });
      return;
    }
    log(`navegador retornou (Promise): ${JSON.stringify(result)} pending=${pendingSyncRef.current}`);
    // 'opened': no Android a aba abre num task separado e o app não sabe quando ela fecha.
    // Mantemos pending=true e deixamos o AppState (background → active) disparar o sync.
    // Em 'dismiss'/'cancel' (iOS, ou quando a Promise reflete o fechamento) sincronizamos aqui.
    if (result?.type !== 'opened' && pendingSyncRef.current) {
      pendingSyncRef.current = false;
      log('fallback Promise → sync');
      await syncStatus();
    }
  };

  return { openSubscription, isSyncing, toast, setToast };
}
