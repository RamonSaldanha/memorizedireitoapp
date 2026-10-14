import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Lock, Shuffle } from 'lucide-react-native';
import {
  EDITOR_TABS,
  hasAvatar,
  normalizeAvatarConfig,
  previewWith,
  randomAvatarConfig,
  type AvatarColorKey,
  type AvatarConfig,
  type AvatarShapeKey,
  type ShapeOption,
} from '../../lib/avatar';
import { profileApi } from '../../api/profile';
import { AvatarStage } from '../../components/avatar/AvatarStage';
import { ColorSwatches } from '../../components/avatar/ColorSwatches';
import { OptionTile } from '../../components/avatar/OptionTile';
import { GameButton } from '../../components/ui/GameButton';
import { Toast } from '../../components/ui/Toast';
import { useAppearance } from '../../hooks/useAppearance';
import { useSubscriptionCheckout } from '../../hooks/useSubscriptionCheckout';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { colors } from '../../theme/colors';

const SIDE = 16;
const GAP = 10;

/**
 * Editor de avatar, porte de `pages/settings/Avatar.vue` da web.
 *
 * As abas, os grupos e os recortes das miniaturas vêm de `EDITOR_TABS`, da lib,
 * então os dois editores mostram sempre as mesmas peças. O palco fica fixo no
 * topo, reagindo a cada troca, e só as peças da aba aberta são desenhadas.
 */
export function AvatarEditorScreen() {
  const navigation = useNavigation();
  const { isDark, theme } = useAppearance();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const { name, avatarConfig, hasInfiniteLives } = useUserStore();
  const { openSubscription, isSyncing, toast, setToast } = useSubscriptionCheckout();

  // Sem avatar salvo, o editor começa num sorteio — bem mais convidativo que
  // abrir sempre no mesmo boneco padrão.
  const [draft, setDraft] = useState<AvatarConfig>(() =>
    hasAvatar(avatarConfig) ? normalizeAvatarConfig(avatarConfig) : randomAvatarConfig(),
  );
  const [tabId, setTabId] = useState(EDITOR_TABS[0].id);
  // Opção exclusiva que a pessoa tentou escolher sem assinar; abre o convite.
  const [lockedPick, setLockedPick] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tab = EDITOR_TABS.find((t) => t.id === tabId) ?? EDITOR_TABS[0];
  const tileWidth = (width - 2 * SIDE - 2 * GAP) / 3;

  // Assinatura ativa. É só para a interface: o servidor recusa sozinho uma peça
  // exclusiva salva por quem não assina.
  const isLocked = (option: ShapeOption<string>) => !!option.premium && !hasInfiniteLives;

  // Escolher o que já está escolhido não muda nada — nem anima, como na web.
  const change = (key: AvatarShapeKey | AvatarColorKey, value: string) =>
    setDraft((current) => (current[key] === value ? current : ({ ...current, [key]: value } as AvatarConfig)));

  const select = (key: AvatarShapeKey, option: ShapeOption<string>) => {
    if (isLocked(option)) {
      setLockedPick(option.label);
      return;
    }

    setLockedPick(null);
    change(key, option.id);
  };

  // O sorteio troca o personagem, mas mantém a fantasia: ela é escolha de
  // assinante, não algo para sair e entrar ao acaso.
  const shuffle = () => setDraft((current) => ({ ...randomAvatarConfig(), outfit: current.outfit }));

  const saveMutation = useMutation({
    mutationFn: () => profileApi.updateAvatar(draft),
    onSuccess: (res) => {
      setUser(res.data);
      useUserStore.getState().setAvatarConfig(res.data.avatar_config ?? draft);
      // O ranking mostra o avatar de cada um, inclusive o seu.
      queryClient.invalidateQueries({ queryKey: ['ranking'] });
      setError(null);
      setToast({ title: 'Avatar salvo!', variant: 'success' });
    },
    onError: (e: any) => {
      const errors = e?.response?.data?.errors as Record<string, string[]> | undefined;
      const first = errors ? Object.values(errors).flat()[0] : undefined;
      setError(first ?? 'Não foi possível salvar o avatar. Tente novamente.');
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Voltar">
          <ChevronLeft size={26} color={theme.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: theme.foreground }]}>Meu avatar</Text>
      </View>

      <AvatarStage config={draft} name={name ?? ''} animateChanges style={styles.stage}>
        <Pressable
          onPress={shuffle}
          accessibilityRole="button"
          style={[
            styles.shuffle,
            { backgroundColor: isDark ? colors.gray[800] : '#ffffff', borderColor: isDark ? colors.gray[700] : colors.gray[200] },
          ]}
        >
          <Shuffle size={16} color={isDark ? colors.gray[300] : colors.gray[600]} />
          <Text style={[styles.shuffleText, { color: isDark ? colors.gray[300] : colors.gray[600] }]}>Sortear</Text>
        </Pressable>
      </AvatarStage>

      {/* Abas: rolam de lado em celular estreito, onde as cinco não cabem. */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <View style={[styles.tabs, { backgroundColor: theme.muted }]}>
            {EDITOR_TABS.map((t) => {
              const active = t.id === tab.id;

              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTabId(t.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.tab, active && [styles.tabActive, { backgroundColor: isDark ? colors.gray[700] : colors.background }]]}
                >
                  <Text style={[styles.tabText, { color: active ? theme.foreground : theme.mutedForeground }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {tab.groups.map((group) => (
          <View key={group.key} style={styles.group}>
            <Text style={[styles.groupTitle, { color: theme.foreground }]}>{group.label}</Text>

            {group.kind === 'color' ? (
              <ColorSwatches
                colors={group.colors}
                label={group.label}
                value={draft[group.key]}
                onChange={(color) => change(group.key, color)}
              />
            ) : (
              <View style={styles.grid}>
                {group.options.map((option) => (
                  <OptionTile
                    key={option.id}
                    label={option.label}
                    crop={group.crop}
                    uid={`${group.key}-${option.id}`}
                    width={tileWidth}
                    preview={previewWith(draft, group.key, option.id, group.crop)}
                    selected={draft[group.key] === option.id}
                    locked={isLocked(option)}
                    onPress={() => select(group.key, option)}
                  />
                ))}
              </View>
            )}

            {group.kind === 'shape' && lockedPick && !hasInfiniteLives && group.options.some((o) => o.premium) && (
              <View
                style={[
                  styles.lockedNotice,
                  {
                    borderColor: isDark ? 'rgba(245,158,11,0.4)' : colors.amber[200],
                    backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : colors.amber[50],
                  },
                ]}
              >
                <Lock size={16} color={isDark ? colors.amber[400] : colors.amber[600]} />
                <Text style={[styles.lockedText, { color: isDark ? colors.amber[100] : colors.amber[900] }]}>
                  “{lockedPick}” é exclusiva para assinantes.{' '}
                  <Text style={styles.lockedLink} onPress={openSubscription} accessibilityRole="link">
                    Assinar para desbloquear
                  </Text>
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Fora das abas de propósito: erro dentro de uma aba fechada some da tela. */}
      <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
        {error && <Text style={styles.error}>{error}</Text>}
        <GameButton
          variant="purple"
          size="lg"
          fullWidth
          isDark={isDark}
          disabled={saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? 'Salvando…' : 'Salvar avatar'}
        </GameButton>
      </View>

      {/* Sincronização ao voltar do site de assinatura */}
      {isSyncing && (
        <View style={styles.syncOverlay}>
          <View style={[styles.syncCard, { backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color={colors.purple[600]} />
            <Text style={[styles.syncText, { color: theme.foreground }]}>Atualizando…</Text>
          </View>
        </View>
      )}

      <Toast visible={!!toast} title={toast?.title ?? ''} variant={toast?.variant} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' },
  stage: { marginHorizontal: SIDE },
  shuffle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
  },
  shuffleText: { fontSize: 12, fontWeight: '700' },
  tabsScroll: { paddingHorizontal: SIDE, paddingVertical: 12, flexGrow: 1, justifyContent: 'center' },
  tabs: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    gap: 2,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: SIDE, paddingBottom: 24, gap: 24 },
  group: {},
  groupTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  lockedNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
  },
  lockedText: { flex: 1, fontSize: 14, lineHeight: 20 },
  lockedLink: { fontWeight: '700', textDecorationLine: 'underline' },
  footer: {
    paddingHorizontal: SIDE,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  error: { color: colors.red[600], fontSize: 14, fontWeight: '500' },
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
