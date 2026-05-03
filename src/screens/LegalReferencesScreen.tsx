import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, FileSearch } from 'lucide-react-native';
import { legalReferencesApi, LegalReference } from '../api/legalReferences';
import { GameButton } from '../components/ui/GameButton';
import { Toast } from '../components/ui/Toast';
import { colors } from '../theme/colors';
import { useAppearance } from '../hooks/useAppearance';

export function LegalReferencesScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [toast, setToast] = useState<{ title: string; message?: string; variant: 'success' | 'error' } | null>(null);
  const { isDark, theme } = useAppearance();

  const { data, isLoading } = useQuery({
    queryKey: ['legal-references'],
    queryFn: () => legalReferencesApi.getAll(),
    select: (res) => res.data,
  });

  React.useEffect(() => {
    if (data && !initialized) {
      setSelectedIds(data.selected_ids);
      setInitialized(true);
    }
  }, [data, initialized]);

  const saveMutation = useMutation({
    mutationFn: () => legalReferencesApi.updateSelection(selectedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['play-map'] });
      setToast({ title: 'Sucesso!', message: 'Suas preferências foram salvas.', variant: 'success' });
    },
    onError: () => {
      setToast({ title: 'Erro', message: 'Não foi possível salvar. Tente novamente.', variant: 'error' });
    },
  });

  const references: LegalReference[] = data?.legal_references ?? [];

  const filtered = references.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleId = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Text style={[styles.title, { color: theme.foreground }]}>Selecione as legislações{'\n'}que deseja estudar</Text>

      <View style={[
        styles.searchBox,
        {
          backgroundColor: isDark ? colors.gray[900] : colors.gray[50],
          borderColor: theme.border,
        },
      ]}>
        <Search size={16} color={theme.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: theme.foreground }]}
          placeholder="Pesquisar legislação..."
          placeholderTextColor={theme.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.purple[500]} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <FileSearch size={48} color={theme.mutedForeground} />
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
            {search
              ? `Nenhuma legislação encontrada para "${search}"`
              : 'Nenhuma legislação encontrada'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const selected = selectedIds.includes(item.id);
            return (
              <Pressable
                style={[
                  styles.item,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  selected && {
                    borderColor: isDark ? colors.blue[500] : colors.blue[400],
                  },
                ]}
                onPress={() => toggleId(item.id)}
              >
                <Text style={[styles.itemName, { color: theme.foreground }]}>{item.title}</Text>

                <View style={styles.progressMeta}>
                  <Text style={[styles.progressText, { color: theme.mutedForeground }]}>
                    {item.completed_blocks} de {item.total_blocks} blocos
                  </Text>
                  <Text style={[
                    styles.progressPercent,
                    { color: item.percentage === 100 ? colors.green[600] : theme.mutedForeground },
                  ]}>
                    {item.percentage}%
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
                  <View style={[
                    styles.progressFill,
                    {
                      width: `${item.percentage}%`,
                      backgroundColor: item.percentage === 100 ? colors.green[500] : colors.blue[500],
                    },
                  ]} />
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <Text style={[styles.selectedCount, { color: theme.mutedForeground }]}>{selectedIds.length} selecionadas</Text>
        <GameButton
          variant="blue"
          size="md"
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Salvando...' : 'Salvar preferências'}
        </GameButton>
      </View>

      <Toast
        visible={toast !== null}
        title={toast?.title ?? ''}
        message={toast?.message}
        variant={toast?.variant ?? 'default'}
        onHide={() => setToast(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', padding: 16, lineHeight: 28 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  loader: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 80, gap: 8 },
  item: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  itemName: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 4 },
  progressText: { fontSize: 11 },
  progressPercent: { fontSize: 11, fontWeight: '600' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  selectedCount: { fontSize: 14, fontWeight: '500' },
});
