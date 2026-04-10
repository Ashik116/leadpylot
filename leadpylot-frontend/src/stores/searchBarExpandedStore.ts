import { create } from 'zustand';

interface SearchBarExpandedState {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  setExpanded: () => void;
  setCollapsed: () => void;
  toggle: () => void;
}

export const useSearchBarExpandedStore = create<SearchBarExpandedState>((set) => ({
  isExpanded: false,
  setIsExpanded: (expanded) => set({ isExpanded: expanded }),
  setExpanded: () => set({ isExpanded: true }),
  setCollapsed: () => set({ isExpanded: false }),
  toggle: () => set((s) => ({ isExpanded: !s.isExpanded })),
}));
