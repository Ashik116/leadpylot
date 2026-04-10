import { create } from 'zustand';
import { apiGetStages, Stage } from '@/services/StagesService';

interface StagesState {
  stages: Stage[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

interface StagesActions {
  fetchStages: () => Promise<void>;
  setStages: (stages: Stage[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearStages: () => void;
  refreshStages: () => Promise<void>;
}

export const useStagesStore = create<StagesState & StagesActions>((set, get) => ({
  // State
  stages: [],
  isLoading: false,
  error: null,
  isInitialized: false,

  // Actions
  fetchStages: async () => {
    const { isInitialized, isLoading } = get();

    // Avoid fetching if already initialized or currently loading
    if (isInitialized || isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await apiGetStages();
      set({
        stages: response.data || [],
        isLoading: false,
        isInitialized: true,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch stages',
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  refreshStages: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiGetStages();
      set({
        stages: response.data || [],
        isLoading: false,
        isInitialized: true,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch stages',
        isLoading: false,
      });
    }
  },

  setStages: (stages) => {
    set({ stages, isInitialized: true });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearStages: () => {
    set({
      stages: [],
      isLoading: false,
      error: null,
      isInitialized: false,
    });
  },
}));

// Selectors for better performance and convenience
export const useStages = () => useStagesStore((state) => state.stages);
export const useStagesLoading = () => useStagesStore((state) => state.isLoading);
export const useStagesError = () => useStagesStore((state) => state.error);
export const useStagesInitialized = () => useStagesStore((state) => state.isInitialized);

// Computed selectors for specific stages
export const useNegativStage = () =>
  useStagesStore((state) => state.stages.find((stage) => stage.name === 'Negativ') || null);

export const usePositivStage = () =>
  useStagesStore((state) => state.stages.find((stage) => stage.name === 'Positiv') || null);

// Action selectors
export const useFetchStages = () => useStagesStore((state) => state.fetchStages);
export const useRefreshStages = () => useStagesStore((state) => state.refreshStages);
