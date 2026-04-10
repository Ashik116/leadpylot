import { create } from 'zustand';

interface PageInfo {
  title?: string;
  total?: number;
  subtitle?: string;
}

interface PageInfoStore {
  pageInfo: PageInfo;
  setPageInfo: (info: PageInfo) => void;
  clearPageInfo: () => void;
}

export const usePageInfoStore = create<PageInfoStore>((set) => ({
  pageInfo: {},
  setPageInfo: (info) => set({ pageInfo: info }),
  clearPageInfo: () => set({ pageInfo: {} }),
}));
