import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi } from '../../api/auth';
import { Input } from '../../components/ui/Input';
import { GameButton } from '../../components/ui/GameButton';
import { colors } from '../../theme/colors';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!email) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Recuperar senha</Text>

      {sent ? (
        <View style={styles.sentBox}>
          <Text style={styles.sentText}>
            Se o e-mail existir em nossa base, você receberá um link de redefinição em breve.
          </Text>
          <GameButton variant="blue" onPress={() => navigation.navigate('Login')}>
            Voltar ao login
          </GameButton>
        </View>
      ) : (
        <View style={styles.form}>
          <Input
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <GameButton variant="blue" size="lg" fullWidth onPress={handleSend} disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link'}
          </GameButton>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 24, backgroundColor: colors.background },
  back: { fontSize: 15, color: colors.blue[500], fontWeight: '600', paddingTop: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.foreground },
  form: { gap: 16 },
  sentBox: { gap: 16 },
  sentText: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
});
