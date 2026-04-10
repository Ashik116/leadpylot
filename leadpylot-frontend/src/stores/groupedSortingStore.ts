import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface GroupedSortingState {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  resetSorting: () => void;
}

export const useGroupedSortingStore = create<GroupedSortingState>()(
  devtools(
    (set) => ({
      sortBy: 'count',
      sortOrder: 'desc',
      setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
      resetSorting: () => set({ sortBy: 'count', sortOrder: 'desc' }),
    }),
    {
      name: 'grouped-sorting-store',
    }
  )
);
