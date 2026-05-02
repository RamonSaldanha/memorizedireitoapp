import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { Input } from '../../components/ui/Input';
import { GameButton } from '../../components/ui/GameButton';
import { colors } from '../../theme/colors';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setToken, setUser } = useAuthStore();
  const { updateFromApi } = useUserStore();

  async function handleRegister() {
    if (!name || !email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('As senhas não coincidem.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register(name, email, password, passwordConfirmation);
      await setToken(res.data.token);
      setUser(res.data.user);
      updateFromApi({
        lives: res.data.user.lives,
        has_infinite_lives: res.data.user.has_infinite_lives,
        xp: res.data.user.xp,
        name: res.data.user.name,
        avatar: res.data.user.avatar,
      });
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      if (errors) {
        const first = Object.values(errors)[0] as string[];
        setError(first[0]);
      } else {
        setError(err.response?.data?.message ?? 'Erro ao cadastrar.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Comece a estudar hoje</Text>
        </View>

        <View style={styles.form}>
          <Input label="Nome" value={name} onChangeText={setName} placeholder="Seu nome completo" autoCapitalize="words" />
          <Input label="E-mail" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Senha" value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres" secureTextEntry />
          <Input label="Confirmar senha" value={passwordConfirmation} onChangeText={setPasswordConfirmation} placeholder="Repita a senha" secureTextEntry />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <GameButton variant="green" size="lg" fullWidth onPress={handleRegister} disabled={loading}>
            {loading ? 'Cadastrando...' : 'Criar conta'}
          </GameButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 24, gap: 24 },
  back: { paddingTop: 16 },
  backText: { fontSize: 15, color: colors.blue[500], fontWeight: '600' },
  header: { gap: 4 },
  title: { fontSize: 28, fontWeight: '800', color: colors.foreground },
  subtitle: { fontSize: 15, color: colors.mutedForeground },
  form: { gap: 16 },
  error: { fontSize: 13, color: colors.red[500], textAlign: 'center' },
});
