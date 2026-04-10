import { create } from 'zustand';

interface GroupSortingState {
  groupSorting: Record<
    string,
    { sortBy: string; sortOrder: 'asc' | 'desc'; sortClickCount: number }
  >;
  setGroupSorting: (
    groupId: string,
    sortBy: string,
    sortOrder: 'asc' | 'desc',
    sortClickCount: number
  ) => void;
  getGroupSorting: (groupId: string) => {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    sortClickCount: number;
  };
  resetGroup: (groupId: string) => void;
  resetAll: () => void;
}

export const useGroupSortingStore = create<GroupSortingState>((set, get) => ({
  groupSorting: {},
  setGroupSorting: (groupId, sortBy, sortOrder, sortClickCount) =>
    set((state) => ({
      groupSorting: {
        ...state.groupSorting,
        [groupId]: { sortBy, sortOrder, sortClickCount },
      },
    })),
  getGroupSorting: (groupId) => {
    const state = get();
    return state.groupSorting[groupId] || { sortBy: '', sortOrder: 'asc', sortClickCount: 0 };
  },
  resetGroup: (groupId) =>
    set((state) => {
      const newState = { ...state.groupSorting };
      delete newState[groupId];
      return { groupSorting: newState };
    }),
  resetAll: () => set({ groupSorting: {} }),
}));
