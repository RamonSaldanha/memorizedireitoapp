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
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { profileApi } from '../../api/profile';
import { useAppearance } from '../../hooks/useAppearance';
import { colors } from '../../theme/colors';

export function ChangePasswordScreen() {
  const navigation = useNavigation();
  const { isDark, theme } = useAppearance();

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordMutation = useMutation({
    mutationFn: (data: {
      current_password: string;
      password: string;
      password_confirmation: string;
    }) => profileApi.updatePassword(data),
    onSuccess: () => {
      Alert.alert('Senha alterada', 'Sua senha foi atualizada com sucesso.');
      navigation.goBack();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        'Não foi possível alterar a senha. Verifique se a senha atual está correta.';
      Alert.alert('Erro', message);
    },
  });

  const handleSubmit = () => {
    if (!currentPassword || !password || !passwordConfirmation) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Erro', 'A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== passwordConfirmation) {
      Alert.alert('Erro', 'A confirmação da senha não coincide.');
      return;
    }
    passwordMutation.mutate({
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    });
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    show: boolean,
    toggle: () => void,
    placeholder: string
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.foreground }]}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isDark ? colors.gray[900] : colors.gray[100],
            borderColor: theme.border,
          },
        ]}
      >
        <Lock size={18} color={colors.gray[400]} />
        <TextInput
          style={[styles.input, { color: theme.foreground }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.gray[400]}
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <Pressable onPress={toggle} hitSlop={8}>
          {show ? (
            <EyeOff size={18} color={colors.gray[400]} />
          ) : (
            <Eye size={18} color={colors.gray[400]} />
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.foreground }]}>Alterar senha</Text>
        <Text style={[styles.subtitle, { color: colors.gray[500] }]}>
          Informe sua senha atual e a nova senha desejada.
        </Text>

        {renderInput(
          'Senha atual',
          currentPassword,
          setCurrentPassword,
          showCurrent,
          () => setShowCurrent((s) => !s),
          '••••••••'
        )}
        {renderInput(
          'Nova senha',
          password,
          setPassword,
          showNew,
          () => setShowNew((s) => !s),
          '••••••••'
        )}
        {renderInput(
          'Confirmar nova senha',
          passwordConfirmation,
          setPasswordConfirmation,
          showConfirm,
          () => setShowConfirm((s) => !s),
          '••••••••'
        )}

        <Pressable
          style={[styles.button, { backgroundColor: colors.purple[600] }]}
          onPress={handleSubmit}
          disabled={passwordMutation.isPending}
        >
          <Text style={styles.buttonText}>
            {passwordMutation.isPending ? 'Salvando...' : 'Salvar nova senha'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15 },
  button: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
