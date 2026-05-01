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

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setToken, setUser } = useAuthStore();
  const { updateFromApi } = useUserStore();

  async function handleLogin() {
    if (!email || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      await setToken(res.data.token);
      setUser(res.data.user);
      updateFromApi({
        lives: res.data.user.lives,
        has_infinite_lives: res.data.user.has_infinite_lives,
        xp: res.data.user.xp,
      });
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Erro ao entrar. Tente novamente.';
      setError(msg);
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
        <View style={styles.header}>
          <Text style={styles.title}>Memorize</Text>
          <Text style={styles.subtitle}>Direito</Text>
          <Text style={styles.tagline}>Estude leis de forma gamificada</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Input
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
          />
          {!!error && <Text style={styles.error}>{error}</Text>}

          <GameButton
            variant="blue"
            size="lg"
            fullWidth
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </GameButton>

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.link}>Esqueceu a senha?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.footerText, styles.link]}>Cadastre-se</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 32 },
  header: { alignItems: 'center', gap: 4 },
  title: { fontSize: 40, fontWeight: '800', color: colors.foreground, lineHeight: 44 },
  subtitle: { fontSize: 32, fontWeight: '700', color: colors.purple[500], lineHeight: 38 },
  tagline: { fontSize: 14, color: colors.mutedForeground, marginTop: 8, textAlign: 'center' },
  form: { gap: 16 },
  error: { fontSize: 13, color: colors.red[500], textAlign: 'center' },
  link: { color: colors.blue[500], textAlign: 'center', fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: colors.mutedForeground },
});
