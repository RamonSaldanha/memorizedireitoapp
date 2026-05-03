import { apiClient } from './client';

export type LegalReference = {
  id: number;
  uuid: string;
  title: string;
  total_blocks: number;
  completed_blocks: number;
  percentage: number;
  is_selected: boolean;
};

export const legalReferencesApi = {
  getAll: () =>
    apiClient.get<{
      legal_references: LegalReference[];
      selected_ids: number[];
    }>('/legal-references'),

  updateSelection: (ids: number[]) =>
    apiClient.put<{ message: string; selected_ids: number[] }>('/legal-references', { ids }),
};
