import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ApiUrlState {
  apiUrl: string | null;
  setApiUrl: (apiUrl: string | null) => void;
  clearApiUrl: () => void;
}

export const useApiUrlStore = create<ApiUrlState>()(
  persist(
    (set) => ({
      apiUrl: null,
      setApiUrl: (apiUrl) => set({ apiUrl }),
      clearApiUrl: () => set({ apiUrl: null }),
    }),
    {
      name: 'api-url-storage',
      storage:
        typeof window !== 'undefined'
          ? createJSONStorage(() => sessionStorage)
          : (undefined as unknown as ReturnType<typeof createJSONStorage>),
      partialize: (state) => ({ apiUrl: state.apiUrl }),
    }
  )
);
