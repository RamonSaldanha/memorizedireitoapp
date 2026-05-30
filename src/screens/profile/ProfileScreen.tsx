import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Switch,
  StatusBar,
  ActivityIndicator,
  AppState,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Modal from 'react-native-modal';
import { User, Mail, Lock, LogOut, Sun, Moon, Monitor, Volume2, Gem, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { profileApi } from '../../api/profile';
import { Avatar } from '../../components/ui/Avatar';
import { GameButton } from '../../components/ui/GameButton';
import { Toast } from '../../components/ui/Toast';
import { useAppearance } from '../../hooks/useAppearance';
import { colors } from '../../theme/colors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { authApi } from '../../api/auth';
import { WEB_SUBSCRIPTION_URL } from '../../api/client';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ChangePassword: undefined;
};

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, setUser, logout } = useAuthStore();
  const { name, avatar, hasInfiniteLives } = useUserStore();
  const { appearance, setAppearance, isDark, theme } = useAppearance();
  const { successSoundEnabled, setSuccessSoundEnabled } = usePreferencesStore();
  const queryClient = useQueryClient();

  const [editField, setEditField] = useState<'name' | 'email' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string }) =>
      profileApi.updateProfile(data),
    onSuccess: (res) => {
      setUser(res.data);
      if (res.data.name !== undefined) {
        useUserStore.getState().setName(res.data.name);
      }
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setEditField(null);
      if (editField === 'email') {
        Alert.alert('E-mail atualizado', 'Seu endereço de e-mail foi alterado.');
      }
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível atualizar os dados. Tente novamente.');
    },
  });

  const handleSaveEdit = () => {
    if (!editValue.trim()) {
      Alert.alert('Erro', 'O campo não pode ficar vazio.');
      return;
    }
    if (editField === 'name') {
      updateMutation.mutate({ name: editValue.trim() });
    } else if (editField === 'email') {
      updateMutation.mutate({ email: editValue.trim() });
    }
  };

  const openEdit = (field: 'name' | 'email') => {
    setEditValue(field === 'name' ? (name ?? '') : (user?.email ?? ''));
    setEditField(field);
  };

  const handleLogout = async () => {
    setIsLogoutModalVisible(false);
    await logout();
    queryClient.clear();
  };

  const pendingSyncRef = useRef(false);
  const [toast, setToast] = useState<{ title: string; variant: 'success' | 'error' | 'default' } | null>(null);

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

  const handleOpenSubscription = async () => {
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

  const appearanceOptions: { key: 'light' | 'dark' | 'system'; label: string; icon: React.ElementType }[] = [
    { key: 'light', label: 'Claro', icon: Sun },
    { key: 'dark', label: 'Escuro', icon: Moon },
    { key: 'system', label: 'Sistema', icon: Monitor },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <ScrollView style={{ backgroundColor: theme.background }}>
      {/* Card do usuário */}
      <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Avatar name={name ?? ''} uri={avatar ?? undefined} size={80} style={styles.avatarLarge} />
        <Text style={[styles.userName, { color: theme.foreground }]}>{name ?? 'Usuário'}</Text>
        <Text style={[styles.userEmail, { color: colors.gray[500] }]}>{user?.email}</Text>
      </View>

      {/* Seção Conta */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gray[500] }]}>CONTA</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable style={styles.row} onPress={() => openEdit('name')}>
            <User size={20} color={colors.gray[500]} />
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: theme.foreground }]}>Nome</Text>
              <Text style={[styles.rowValue, { color: colors.gray[500] }]}>{name ?? '—'}</Text>
            </View>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable style={styles.row} onPress={() => openEdit('email')}>
            <Mail size={20} color={colors.gray[500]} />
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: theme.foreground }]}>E-mail</Text>
              <Text style={[styles.rowValue, { color: colors.gray[500] }]}>{user?.email ?? '—'}</Text>
            </View>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable style={styles.row} onPress={() => navigation.navigate('ChangePassword')}>
            <Lock size={20} color={colors.gray[500]} />
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: theme.foreground }]}>Alterar senha</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Seção Assinatura */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gray[500] }]}>ASSINATURA</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable style={styles.row} onPress={handleOpenSubscription}>
            <Gem size={20} color={colors.blue[500]} />
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: theme.foreground }]}>Premium</Text>
              <Text style={[styles.rowValue, { color: colors.gray[500] }]}>
                {hasInfiniteLives ? 'Assinatura ativa' : 'Assine para vidas infinitas'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.gray[400]} />
          </Pressable>
        </View>
      </View>

      {/* Seção Aparência */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gray[500] }]}>APARÊNCIA</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.appearanceRow}>
            {appearanceOptions.map((opt) => {
              const isActive = appearance === opt.key;
              const iconColor = isActive ? colors.purple[600] : theme.foreground;
              const IconComponent = opt.icon;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.appearanceButton,
                    isActive && {
                      backgroundColor: colors.purple[100],
                      borderColor: colors.purple[500],
                    },
                    { borderColor: theme.border },
                  ]}
                  onPress={() => setAppearance(opt.key)}
                >
                  <IconComponent size={18} color={iconColor} />
                  <Text
                    style={[
                      styles.appearanceLabel,
                      { color: isActive ? colors.purple[600] : theme.foreground },
                      isActive && { fontWeight: '700' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Seção Preferências */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gray[500] }]}>PREFERÊNCIAS</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.row}>
            <Volume2 size={20} color={colors.gray[500]} />
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: theme.foreground }]}>Som ao acertar</Text>
              <Text style={[styles.rowValue, { color: colors.gray[500] }]}>
                Toca um sino quando você acerta um desafio
              </Text>
            </View>
            <Switch
              value={successSoundEnabled}
              onValueChange={setSuccessSoundEnabled}
              trackColor={{ false: colors.gray[300], true: colors.purple[300] }}
              thumbColor={successSoundEnabled ? colors.purple[600] : colors.gray[400]}
            />
          </View>
        </View>
      </View>

      {/* Sair */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        <GameButton
          variant="red"
          size="md"
          fullWidth
          isDark={isDark}
          onPress={() => setIsLogoutModalVisible(true)}
        >
          <LogOut size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Sair</Text>
        </GameButton>
      </View>

      {/* Modal de edição */}
      <Modal
        isVisible={editField !== null}
        onBackdropPress={() => setEditField(null)}
        onBackButtonPress={() => setEditField(null)}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.foreground }]}>
            {editField === 'name' ? 'Editar nome' : 'Editar e-mail'}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? colors.gray[900] : colors.gray[100],
                color: theme.foreground,
                borderColor: theme.border,
              },
            ]}
            value={editValue}
            onChangeText={setEditValue}
            placeholder={editField === 'name' ? 'Seu nome' : 'seu@email.com'}
            placeholderTextColor={colors.gray[400]}
            autoCapitalize={editField === 'name' ? 'words' : 'none'}
            keyboardType={editField === 'email' ? 'email-address' : 'default'}
          />
          <View style={styles.modalActions}>
            <Pressable style={styles.modalButtonSecondary} onPress={() => setEditField(null)}>
              <Text style={{ color: colors.gray[500] }}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButtonPrimary, { backgroundColor: colors.purple[600] }]}
              onPress={handleSaveEdit}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmação de logout */}
      <Modal
        isVisible={isLogoutModalVisible}
        onBackdropPress={() => setIsLogoutModalVisible(false)}
        onBackButtonPress={() => setIsLogoutModalVisible(false)}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.foreground }]}>Sair da conta</Text>
          <Text style={[styles.modalSubtitle, { color: colors.gray[500] }]}>
            Tem certeza que deseja sair?
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              style={styles.modalButtonSecondary}
              onPress={() => setIsLogoutModalVisible(false)}
            >
              <Text style={{ color: colors.gray[500] }}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButtonPrimary, { backgroundColor: colors.red[600] }]}
              onPress={handleLogout}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Sair</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>

      {/* Overlay de sincronização ao voltar do navegador */}
      {isSyncing && (
        <View style={styles.syncOverlay}>
          <View style={[styles.syncCard, { backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color={colors.purple[600]} />
            <Text style={[styles.syncText, { color: theme.foreground }]}>Atualizando…</Text>
          </View>
        </View>
      )}

      <Toast
        visible={!!toast}
        title={toast?.title ?? ''}
        variant={toast?.variant}
        onHide={() => setToast(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  userCard: {
    alignItems: 'center',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatarLarge: { marginBottom: 12 },
  userName: { fontSize: 20, fontWeight: '700' },
  userEmail: { fontSize: 14, marginTop: 4 },
  section: { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 13, marginTop: 2 },
  divider: { height: 1, marginLeft: 48 },
  appearanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    gap: 8,
  },
  appearanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  appearanceLabel: { fontSize: 13 },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButtonSecondary: { paddingHorizontal: 16, paddingVertical: 10 },
  modalButtonPrimary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  syncOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  syncCard: {
    paddingVertical: 24,
    paddingHorizontal: 36,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  syncText: { fontSize: 15, fontWeight: '600' },
});
