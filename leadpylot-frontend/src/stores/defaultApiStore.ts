import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface DefaultApiState {
  defaultApiParams: any | null;
  setDefaultApiParams: (params: any | null) => void;
  clearDefaultApiParams: () => void;
}

export const useDefaultApiStore = create<DefaultApiState>()(
  persist(
    (set) => ({
      defaultApiParams: null,
      setDefaultApiParams: (params) => set({ defaultApiParams: params }),
      clearDefaultApiParams: () => set({ defaultApiParams: null }),
    }),
    {
      name: 'default-api',
      storage:
        typeof window !== 'undefined'
          ? createJSONStorage(() => localStorage)
          : (undefined as unknown as ReturnType<typeof createJSONStorage>),
      partialize: (state) => ({ defaultApiParams: state.defaultApiParams }),
    }
  )
);
