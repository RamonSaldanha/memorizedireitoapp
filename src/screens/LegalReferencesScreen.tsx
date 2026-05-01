import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, CheckSquare, Square } from 'lucide-react-native';
import { legalReferencesApi, LegalReference } from '../api/legalReferences';
import { GameButton } from '../components/ui/GameButton';
import { Badge } from '../components/ui/Badge';
import { colors } from '../theme/colors';

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Iniciante', 2: 'Básico', 3: 'Intermediário', 4: 'Avançado', 5: 'Especialista',
};

export function LegalReferencesScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [initialized, setInitialized] = useState(false);

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
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Selecione as legislações{'\n'}que deseja estudar</Text>

      {/* Busca */}
      <View style={styles.searchBox}>
        <Search size={16} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar legislação..."
          placeholderTextColor={colors.mutedForeground}
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
                style={[styles.item, selected && styles.itemSelected]}
                onPress={() => toggleId(item.id)}
              >
                <View style={styles.checkbox}>
                  {selected
                    ? <CheckSquare size={22} color={colors.blue[500]} />
                    : <Square size={22} color={colors.gray[400]} />
                  }
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.itemMeta}>
                    <Badge variant="secondary">
                      {DIFFICULTY_LABELS[item.difficulty_level] ?? 'N/A'}
                    </Badge>
                    {item.description && (
                      <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.selectedCount}>{selectedIds.length} selecionadas</Text>
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
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: '800', color: colors.foreground, padding: 16, lineHeight: 28 },
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
    borderColor: colors.border,
    backgroundColor: colors.gray[50],
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.foreground },
  loader: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 80, gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  itemSelected: { borderColor: colors.blue[400], backgroundColor: colors.blue[50] },
  checkbox: { flexShrink: 0 },
  itemInfo: { flex: 1, gap: 6 },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemDesc: { fontSize: 12, color: colors.mutedForeground, flex: 1 },
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
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  selectedCount: { fontSize: 14, color: colors.mutedForeground, fontWeight: '500' },
});
