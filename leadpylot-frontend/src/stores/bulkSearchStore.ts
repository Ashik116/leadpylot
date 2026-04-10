import { create } from 'zustand';
import { Lead } from '@/services/LeadsService';
import { apiSearchLeadsByPartnerIds } from '@/services/LeadsService';

interface BulkSearchState {
  isBulkSearchMode: boolean;
  bulkSearchResults: Lead[];
  bulkSearchQuery: string[];
  isLoading: boolean;
}

interface BulkSearchActions {
  setBulkSearchMode: (mode: boolean) => void;
  setBulkSearchResults: (results: Lead[]) => void;
  setBulkSearchQuery: (query: string[]) => void;
  setLoading: (loading: boolean) => void;
  performBulkSearch: (values: string[]) => Promise<void>;
  refetchBulkSearch: () => Promise<void>;
  clearBulkSearch: () => void;
}

export const useBulkSearchStore = create<BulkSearchState & BulkSearchActions>((set, get) => ({
  // State
  isBulkSearchMode: false,
  bulkSearchResults: [],
  bulkSearchQuery: [],
  isLoading: false,

  // Actions
  setBulkSearchMode: (mode) => set({ isBulkSearchMode: mode }),
  setBulkSearchResults: (results) => set({ bulkSearchResults: results }),
  setBulkSearchQuery: (query) => set({ bulkSearchQuery: query }),
  setLoading: (loading) => set({ isLoading: loading }),

  // Perform bulk search with API call
  performBulkSearch: async (values: string[]) => {
    const { setLoading, setBulkSearchResults, setBulkSearchQuery, setBulkSearchMode } = get();

    try {
      setLoading(true);
      setBulkSearchQuery(values);
      setBulkSearchMode(true);

      const response = await apiSearchLeadsByPartnerIds(values);
      setBulkSearchResults(response.data || []);
    } catch {
      setBulkSearchResults([]);
    } finally {
      setLoading(false);
    }
  },

  // Refetch current bulk search
  refetchBulkSearch: async () => {
    const { bulkSearchQuery, performBulkSearch, isBulkSearchMode } = get();

    if (isBulkSearchMode && bulkSearchQuery.length > 0) {
      await performBulkSearch(bulkSearchQuery);
    }
  },

  clearBulkSearch: () =>
    set({
      isBulkSearchMode: false,
      bulkSearchResults: [],
      bulkSearchQuery: [],
      isLoading: false,
    }),
}));
