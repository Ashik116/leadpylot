import { create } from 'zustand';

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
  | 'confirmations'
  | 'payments'
  | 'payment vouchers'
  | 'payment-terms'
  | 'mailservers'
  | 'lead-projects'
  | 'lead-offers'
  | 'lead-out-offers'
  | 'lead-openings';

interface SelectedItemsState {
  selectedItems: Record<string, any>[]; // Changed from string[] to Record<string, any>[]
  currentPage: PageType | null;
  setSelectedItems: (items: Record<string, any>[], page: PageType) => void;
  addSelectedItem: (item: Record<string, any>, page: PageType) => void;
  removeSelectedItem: (itemId: string, page: PageType) => void;
  clearSelectedItems: () => void;
  getSelectedItems: (page: PageType) => Record<string, any>[];
  getSelectedIds: (page: PageType) => string[]; // Helper method to get just IDs
  getCurrentPage: () => PageType | null;
}

export const useSelectedItemsStore = create<SelectedItemsState>((set, get) => ({
  selectedItems: [],
  currentPage: null,

  setSelectedItems: (items: Record<string, any>[], page: PageType) => {
    set({ selectedItems: items, currentPage: page });
  },

  addSelectedItem: (item: Record<string, any>, page: PageType) => {
    const { selectedItems, currentPage } = get();
    if (currentPage === page) {
      // Check if item already exists by ID
      const itemExists = selectedItems.some((selectedItem) => selectedItem._id === item._id);
      if (!itemExists) {
        set({ selectedItems: [...selectedItems, item] });
      }
    } else {
      // If page changed, start fresh with this item
      set({ selectedItems: [item], currentPage: page });
    }
  },

  removeSelectedItem: (itemId: string, page: PageType) => {
    const { selectedItems, currentPage } = get();
    if (currentPage === page) {
      set({ selectedItems: selectedItems.filter((item) => item._id !== itemId) });
    }
  },

  clearSelectedItems: () => {
    set({ selectedItems: [], currentPage: null });
  },

  getSelectedItems: (page: PageType) => {
    const { selectedItems, currentPage } = get();
    return currentPage === page ? selectedItems : [];
  },

  getSelectedIds: (page: PageType) => {
    const { selectedItems, currentPage } = get();
    return currentPage === page ? selectedItems.map((item) => item._id) : [];
  },

  getCurrentPage: () => {
    return get().currentPage;
  },
}));
