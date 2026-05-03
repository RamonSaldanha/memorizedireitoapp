import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, CheckSquare, Square } from 'lucide-react-native';
import { legalReferencesApi, LegalReference } from '../api/legalReferences';
import { GameButton } from '../components/ui/GameButton';
import { Badge } from '../components/ui/Badge';
import { colors } from '../theme/colors';
import { useAppearance } from '../hooks/useAppearance';

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Iniciante', 2: 'Básico', 3: 'Intermediário', 4: 'Avançado', 5: 'Especialista',
};

export function LegalReferencesScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [initialized, setInitialized] = useState(false);
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
      Alert.alert('Salvo!', 'Suas legislações foram atualizadas.');
    },
  });

  const references: LegalReference[] = data?.legal_references ?? [];

  const filtered = references.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
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

      {/* Busca */}
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
                    borderColor: isDark ? colors.blue[700] : colors.blue[400],
                    backgroundColor: isDark ? colors.blue[900] : colors.blue[50],
                  },
                ]}
                onPress={() => toggleId(item.id)}
              >
                <View style={styles.checkbox}>
                  {selected
                    ? <CheckSquare size={22} color={colors.blue[500]} />
                    : <Square size={22} color={isDark ? colors.gray[500] : colors.gray[400]} />
                  }
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.foreground }]}>{item.name}</Text>
                  <View style={styles.itemMeta}>
                    <Badge variant="secondary" isDark={isDark}>
                      {DIFFICULTY_LABELS[item.difficulty_level] ?? 'N/A'}
                    </Badge>
                    {item.description && (
                      <Text style={[styles.itemDesc, { color: theme.mutedForeground }]} numberOfLines={1}>{item.description}</Text>
                    )}
                  </View>
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
          {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
        </GameButton>
      </View>
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
  list: { paddingHorizontal: 16, paddingBottom: 80, gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkbox: { flexShrink: 0 },
  itemInfo: { flex: 1, gap: 6 },
  itemName: { fontSize: 14, fontWeight: '700' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemDesc: { fontSize: 12, flex: 1 },
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
