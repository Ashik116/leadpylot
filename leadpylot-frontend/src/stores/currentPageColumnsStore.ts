import { create } from 'zustand';
import { ColumnDef } from '@tanstack/react-table';

export type PageType =
  | 'leads'
  | 'projects'
  | 'reclamations'
  | 'users'
  | 'banks'
  | 'voip-servers'
  | 'sources'
  | 'offers'
  | 'openings'
  | 'accepted-offers'
  | 'payment-vouchers'
  | 'payment-terms'
  | 'lead-projects';

interface CurrentPageColumnsState {
  currentPageColumns: ColumnDef<any, any>[];
  currentPageType: PageType | null;
  setCurrentPageColumns: (columns: ColumnDef<any, any>[], pageType: PageType) => void;
  getCurrentPageColumns: () => ColumnDef<any, any>[];
  getCurrentPageType: () => PageType | null;
  clearCurrentPageColumns: () => void;
}

export const useCurrentPageColumnsStore = create<CurrentPageColumnsState>((set, get) => ({
  currentPageColumns: [],
  currentPageType: null,

  setCurrentPageColumns: (columns: ColumnDef<any, any>[], pageType: PageType) => {
    const current = get();

    // Safety check: don't update with undefined/empty columns
    if (!columns || columns.length === 0) {
      return;
    }

    // Only update if the page type is different
    // This prevents infinite loops while still allowing necessary updates
    if (current.currentPageType !== pageType) {
      set({ currentPageColumns: columns, currentPageType: pageType });
    }
  },

  getCurrentPageColumns: () => {
    return get().currentPageColumns;
  },

  getCurrentPageType: () => {
    return get().currentPageType;
  },

  clearCurrentPageColumns: () => {
    set({ currentPageColumns: [], currentPageType: null });
  },
}));
