import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface BackNavigationState {
  backUrl: string | null;
  setBackUrl: (url: string) => void;
  clearBackUrl: () => void;
}

export const useBackNavigationStore = create<BackNavigationState>()(
  persist(
    (set) => ({
      backUrl: null,
      setBackUrl: (url: string) => {
        // Always set the back URL - we want to store the dashboard page URL
        set({ backUrl: url });
      },
      clearBackUrl: () => {
        set({ backUrl: null });
      },
    }),
    {
      name: 'back-navigation-storage',
      storage:
        typeof window !== 'undefined'
          ? createJSONStorage(() => sessionStorage)
          : (undefined as unknown as ReturnType<typeof createJSONStorage>),
      partialize: (state) => ({ backUrl: state.backUrl }),
    }
  )
);
