import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Modal from 'react-native-modal';
import { User, Mail, Lock, LogOut, Sun, Moon, Monitor } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { profileApi } from '../../api/profile';
import { Avatar } from '../../components/ui/Avatar';
import { useAppearance } from '../../hooks/useAppearance';
import { colors } from '../../theme/colors';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ChangePassword: undefined;
};

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, setUser, logout } = useAuthStore();
  const { name, avatar } = useUserStore();
  const { appearance, setAppearance, isDark, theme } = useAppearance();
  const queryClient = useQueryClient();

  const [editField, setEditField] = useState<'name' | 'email' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

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

  const appearanceOptions: { key: 'light' | 'dark' | 'system'; label: string; icon: React.ReactNode }[] = [
    { key: 'light', label: 'Claro', icon: <Sun size={18} color={theme.foreground} /> },
    { key: 'dark', label: 'Escuro', icon: <Moon size={18} color={theme.foreground} /> },
    { key: 'system', label: 'Sistema', icon: <Monitor size={18} color={theme.foreground} /> },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
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

      {/* Seção Aparência */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gray[500] }]}>APARÊNCIA</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.appearanceRow}>
            {appearanceOptions.map((opt) => (
              <Pressable
                key={opt.key}
                style={[
                  styles.appearanceButton,
                  appearance === opt.key && {
                    backgroundColor: colors.purple[100],
                    borderColor: colors.purple[500],
                  },
                  { borderColor: theme.border },
                ]}
                onPress={() => setAppearance(opt.key)}
              >
                {opt.icon}
                <Text
                  style={[
                    styles.appearanceLabel,
                    { color: theme.foreground },
                    appearance === opt.key && { color: colors.purple[600], fontWeight: '700' },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Sair */}
      <View style={styles.section}>
        <Pressable
          style={[styles.logoutButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => setIsLogoutModalVisible(true)}
        >
          <LogOut size={20} color={colors.red[500]} />
          <Text style={[styles.logoutText, { color: colors.red[500] }]}>Sair</Text>
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: { fontSize: 15, fontWeight: '600' },
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
});
