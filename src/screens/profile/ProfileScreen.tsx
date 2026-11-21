import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Modal from 'react-native-modal';
import { User, Mail, Lock, LogOut, Sun, Moon, Monitor, Volume2, Gem, ChevronRight, Pencil, Quote, Eye, BellRing, Trash2 } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { profileApi } from '../../api/profile';
import { AvatarStage } from '../../components/avatar/AvatarStage';
import { GameButton } from '../../components/ui/GameButton';
import { Toast } from '../../components/ui/Toast';
import { useAppearance } from '../../hooks/useAppearance';
import { useSubscriptionCheckout } from '../../hooks/useSubscriptionCheckout';
import { colors } from '../../theme/colors';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProfileSettings } from '../../api/profile';
import { usePreferencesStore } from '../../stores/preferencesStore';
import type { ProfileStackParamList } from '../../navigation/AppTabs';
import { familyTokens } from '../../theme/colors';
import { AppHeader } from '../../components/layout/AppHeader';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, setUser, logout } = useAuthStore();
  const { name, avatarConfig, hasInfiniteLives } = useUserStore();
  const { appearance, setAppearance, isDark, theme } = useAppearance();
  const family = familyTokens(isDark);
  const { successSoundEnabled, setSuccessSoundEnabled } = usePreferencesStore();
  const queryClient = useQueryClient();

  const [editField, setEditField] = useState<'name' | 'email' | 'bio' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Descrição, conquistas no perfil público e e-mails de lembrete (como em Configurações da web)
  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ['profile-settings'],
    queryFn: async () => (await profileApi.settings()).data,
  });

  const setSettings = (next: ProfileSettings) => queryClient.setQueryData(['profile-settings'], next);

  const toggleAchievement = async (id: number, visible: boolean) => {
    if (!settings) return;
    const hidden = settings.achievements.filter((a) => (a.id === id ? !visible : a.hidden)).map((a) => a.id);
    setSettings({ ...settings, achievements: settings.achievements.map((a) => (a.id === id ? { ...a, hidden: !visible } : a)) });
    try {
      setSettings((await profileApi.updateAchievements(hidden)).data);
    } catch {
      refetchSettings();
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    }
  };

  const toggleEmails = async (receives: boolean) => {
    if (!settings) return;
    setSettings({ ...settings, receives_emails: receives });
    try {
      setSettings((await profileApi.updateEmails(receives)).data);
    } catch {
      refetchSettings();
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await profileApi.deleteAccount(deletePassword);
      setIsDeleteModalVisible(false);
      await logout();
      queryClient.clear();
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      setDeleteError(status === 422 ? 'Senha incorreta.' : 'Não foi possível excluir agora. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };
  const { openSubscription: handleOpenSubscription, isSyncing, toast, setToast } = useSubscriptionCheckout();

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string; bio?: string | null }) =>
      profileApi.updateProfile(data),
    onSuccess: (res) => {
      setUser(res.data);
      if (res.data.name !== undefined) {
        useUserStore.getState().setName(res.data.name);
      }
      queryClient.invalidateQueries({ queryKey: ['me'] });
      if (editField === 'bio') refetchSettings();
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
    // A descrição pode ficar vazia: apaga
    if (editField === 'bio') {
      updateMutation.mutate({ bio: editValue.trim() || null });
      return;
    }
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

  const openEdit = (field: 'name' | 'email' | 'bio') => {
    setEditValue(field === 'name' ? (name ?? '') : field === 'bio' ? (settings?.bio ?? '') : (user?.email ?? ''));
    setEditField(field);
  };

  const handleLogout = async () => {
    setIsLogoutModalVisible(false);
    await logout();
    queryClient.clear();
  };

  const appearanceOptions: { key: 'light' | 'dark' | 'system'; label: string; icon: React.ElementType }[] = [
    { key: 'light', label: 'Claro', icon: Sun },
    { key: 'dark', label: 'Escuro', icon: Moon },
    { key: 'system', label: 'Sistema', icon: Monitor },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <AppHeader />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <ScrollView style={{ backgroundColor: theme.background }}>
      {/* Card do usuário: o avatar no palco, como no perfil da web */}
      <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <AvatarStage config={avatarConfig} name={name ?? ''} style={styles.avatarStage}>
          <GameButton variant="second" size="xs" pill accessibilityLabel="Editar avatar" onPress={() => navigation.navigate('AvatarEditor')}>
            <Pencil size={14} color={family.ink2} />
            <Text style={[styles.editAvatarText, { color: family.ink2 }]}>Editar</Text>
          </GameButton>
        </AvatarStage>
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

      {/* Seção Perfil público */}
      {settings ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.gray[500] }]}>PERFIL PÚBLICO</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Pressable style={styles.row} onPress={() => openEdit('bio')}>
              <Quote size={20} color={colors.gray[500]} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: theme.foreground }]}>Descrição</Text>
                <Text style={[styles.rowValue, { color: colors.gray[500] }]} numberOfLines={2}>
                  {settings.bio ?? 'Uma frase para quem visitar seu perfil'}
                </Text>
              </View>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Pressable style={styles.row} onPress={() => navigation.navigate('PublicProfile', { uuid: settings.profile_uuid })}>
              <Eye size={20} color={colors.gray[500]} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: theme.foreground }]}>Ver meu perfil público</Text>
                <Text style={[styles.rowValue, { color: colors.gray[500] }]}>Como os outros veem você pelo ranking</Text>
              </View>
              <ChevronRight size={18} color={colors.gray[400]} />
            </Pressable>
            {settings.achievements.length > 0 ? (
              <>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <Text style={[styles.subheading, { color: colors.gray[500] }]}>Conquistas que aparecem no perfil</Text>
                {settings.achievements.map((achievement) => (
                  <View key={achievement.id} style={styles.row}>
                    <View style={styles.rowContent}>
                      <Text style={[styles.rowLabel, { color: theme.foreground }]}>{achievement.name}</Text>
                      <Text style={[styles.rowValue, { color: colors.gray[500] }]}>
                        {achievement.stars} {achievement.stars === 1 ? 'estrela' : 'estrelas'}
                      </Text>
                    </View>
                    <Switch
                      value={!achievement.hidden}
                      onValueChange={(visible) => toggleAchievement(achievement.id, visible)}
                      trackColor={{ false: colors.gray[300], true: colors.purple[300] }}
                      thumbColor={!achievement.hidden ? colors.purple[600] : colors.gray[400]}
                    />
                  </View>
                ))}
              </>
            ) : null}
          </View>
        </View>
      ) : null}

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
              const iconColor = isActive ? family.choiceInk : theme.foreground;
              const IconComponent = opt.icon;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.appearanceButton,
                    { borderColor: theme.border },
                    isActive && { backgroundColor: family.choiceSoft, borderColor: family.choice },
                  ]}
                  onPress={() => setAppearance(opt.key)}
                >
                  <IconComponent size={18} color={iconColor} />
                  <Text
                    style={[
                      styles.appearanceLabel,
                      { color: isActive ? family.choiceInk : theme.foreground },
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
                Toca um som quando você acerta um desafio
              </Text>
            </View>
            <Switch
              value={successSoundEnabled}
              onValueChange={setSuccessSoundEnabled}
              trackColor={{ false: colors.gray[300], true: family.choice }}
              thumbColor={successSoundEnabled ? family.choiceInk : colors.gray[400]}
            />
          </View>
          {settings ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.row}>
                <BellRing size={20} color={colors.gray[500]} />
                <View style={styles.rowContent}>
                  <Text style={[styles.rowLabel, { color: theme.foreground }]}>E-mails de lembrete</Text>
                  <Text style={[styles.rowValue, { color: colors.gray[500] }]}>
                    Um e-mail com presente quando você fica um tempo sem estudar
                  </Text>
                </View>
                <Switch
                  value={settings.receives_emails}
                  onValueChange={toggleEmails}
                  trackColor={{ false: colors.gray[300], true: colors.purple[300] }}
                  thumbColor={settings.receives_emails ? colors.purple[600] : colors.gray[400]}
                />
              </View>
            </>
          ) : null}
        </View>
      </View>

      {/* Sair */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        <GameButton variant="tonal-danger" size="md" fullWidth onPress={() => setIsLogoutModalVisible(true)}>
          <LogOut size={18} color={family.dangerSoftInk} />
          <Text style={{ color: family.dangerSoftInk, fontWeight: '700', fontSize: 16 }}>Sair</Text>
        </GameButton>

        <Pressable
          style={styles.deleteLink}
          onPress={() => {
            setDeletePassword('');
            setDeleteError(null);
            setIsDeleteModalVisible(true);
          }}
          accessibilityRole="button"
        >
          <Trash2 size={16} color={colors.red[500]} />
          <Text style={styles.deleteLinkText}>Excluir conta</Text>
        </Pressable>
      </View>

      {/* Modal de edição */}
      <Modal
        isVisible={editField !== null}
        onBackdropPress={() => setEditField(null)}
        onBackButtonPress={() => setEditField(null)}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.foreground }]}>
            {editField === 'name' ? 'Editar nome' : editField === 'bio' ? 'Descrição do perfil' : 'Editar e-mail'}
          </Text>
          {editField === 'bio' ? (
            <Text style={[styles.modalSubtitle, { color: colors.gray[500] }]}>
              Aparece no seu perfil público. Até 160 caracteres.
            </Text>
          ) : null}
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
            placeholder={editField === 'name' ? 'Seu nome' : editField === 'bio' ? 'Ex.: Estudo para a OAB' : 'seu@email.com'}
            placeholderTextColor={colors.gray[400]}
            autoCapitalize={editField === 'name' ? 'words' : editField === 'bio' ? 'sentences' : 'none'}
            keyboardType={editField === 'email' ? 'email-address' : 'default'}
            maxLength={editField === 'bio' ? 160 : undefined}
            multiline={editField === 'bio'}
          />
          {editField === 'bio' ? (
            <Text style={[styles.counter, { color: colors.gray[400] }]}>{editValue.length}/160</Text>
          ) : null}
          <View style={styles.modalActions}>
            <GameButton variant="ghost" size="sm" onPress={() => setEditField(null)}>
              Cancelar
            </GameButton>
            <GameButton variant="main" size="sm" onPress={handleSaveEdit}>
              Salvar
            </GameButton>
          </View>
        </View>
      </Modal>

      {/* Excluir conta: pede a senha e avisa que não tem volta */}
      <Modal
        isVisible={isDeleteModalVisible}
        onBackdropPress={() => setIsDeleteModalVisible(false)}
        onBackButtonPress={() => setIsDeleteModalVisible(false)}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.foreground }]}>Excluir conta</Text>
          <Text style={[styles.modalSubtitle, { color: colors.gray[500] }]}>
            Sua conta, seu progresso e seu XP serão apagados de vez. Isso não pode ser desfeito. Digite sua senha para confirmar.
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: isDark ? colors.gray[900] : colors.gray[100], color: theme.foreground, borderColor: theme.border },
            ]}
            value={deletePassword}
            onChangeText={setDeletePassword}
            placeholder="Sua senha"
            placeholderTextColor={colors.gray[400]}
            secureTextEntry
            autoCapitalize="none"
          />
          {deleteError ? <Text style={styles.deleteError}>{deleteError}</Text> : null}
          <View style={styles.modalActions}>
            <GameButton variant="ghost" size="sm" onPress={() => setIsDeleteModalVisible(false)}>
              Cancelar
            </GameButton>
            <GameButton variant="danger" size="sm" onPress={handleDeleteAccount} disabled={!deletePassword || deleting}>
              {deleting ? 'Excluindo...' : 'Excluir de vez'}
            </GameButton>
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
            <GameButton variant="ghost" size="sm" onPress={() => setIsLogoutModalVisible(false)}>
              Cancelar
            </GameButton>
            <GameButton variant="danger" size="sm" onPress={handleLogout}>
              Sair
            </GameButton>
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
    padding: 12,
    paddingBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatarStage: { alignSelf: 'stretch', marginBottom: 14 },
  editAvatarText: { fontSize: 12, fontWeight: '700' },
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
  subheading: { fontSize: 12, fontWeight: '700', paddingHorizontal: 16, paddingTop: 12 },
  counter: { fontSize: 12, textAlign: 'right', marginTop: -10, marginBottom: 12 },
  deleteLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, paddingVertical: 8 },
  deleteLinkText: { color: colors.red[500], fontWeight: '700', fontSize: 14 },
  deleteError: { color: colors.red[600], fontSize: 13, marginTop: -8, marginBottom: 12 },
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
