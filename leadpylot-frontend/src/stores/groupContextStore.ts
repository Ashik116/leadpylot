import { create } from 'zustand';

interface GroupContextStoreState {
  groupFilterState: any | null;
  groupPaginationMeta: any | null;
  setGroupContext: (filterState: any, paginationMeta: any) => void;
  clearGroupContext: () => void;
}

export const useGroupContextStore = create<GroupContextStoreState>((set) => ({
  groupFilterState: null,
  groupPaginationMeta: null,
  setGroupContext: (filterState, paginationMeta) => set({
    groupFilterState: filterState,
    groupPaginationMeta: paginationMeta,
  }),
  clearGroupContext: () => set({
    groupFilterState: null,
    groupPaginationMeta: null,
  }),
}));

