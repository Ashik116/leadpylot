import { create } from 'zustand';
import { navigationUtils } from './createNavigationStore';

export interface NavigationState<T extends { _id: string }> {
  currentIndex: number;
  items: T[];
  totalItems: number;

  setCurrentIndex: (index: number) => void;
  getCurrentPosition: () => number;

  setItems: (items: T[]) => void;
  addItems: (items: T[]) => void;
  updateItem: (item: T) => void;
  removeItem: (id: string) => void;
  findIndexById: (id: string) => number;

  getPreviousItem: () => T | null;
  getNextItem: () => T | null;
  hasPreviousItem: () => boolean;
  hasNextItem: () => boolean;

  getTotalItems: () => number;
  setTotalItems: (total: number) => void;
}

export const createNavigationStore = <T extends { _id: string }>() =>
  create<NavigationState<T>>((set, get) => ({
    currentIndex: -1,
    items: [],
    totalItems: 0,

    setCurrentIndex: (index: number) => set({ currentIndex: index }),
    getCurrentPosition: () => {
      const { currentIndex } = get();
      return navigationUtils.getCurrentPosition(currentIndex);
    },

    setItems: (items: T[]) => set({ items }),

    addItems: (newItems: T[]) => {
      const { items } = get();
      const updatedItems = navigationUtils.addItemsWithoutDuplicates(items, newItems);
      set({ items: updatedItems });
    },

    updateItem: (updatedItem: T) => {
      const { items } = get();
      const updatedItems = navigationUtils.updateItemById(items, updatedItem);
      set({ items: updatedItems });
    },

    removeItem: (id: string) => {
      const { items, currentIndex, totalItems } = get();
      const result = navigationUtils.removeItemById(items, id, currentIndex);

      const updates: Partial<NavigationState<T>> = {
        items: result.items,
        currentIndex: result.currentIndex,
      };

      if (totalItems > 0) {
        updates.totalItems = totalItems - 1;
      }

      set(updates);
    },

    setTotalItems: (total: number) => set({ totalItems: total }),

    findIndexById: (id: string) => {
      const { items } = get();
      return navigationUtils.findItemIndexById(items, id);
    },

    getPreviousItem: () => {
      const { items, currentIndex } = get();
      return navigationUtils.getPreviousItem(items, currentIndex);
    },

    getNextItem: () => {
      const { items, currentIndex } = get();
      return navigationUtils.getNextItem(items, currentIndex);
    },

    hasPreviousItem: () => {
      const { currentIndex } = get();
      return navigationUtils.hasPreviousItem(currentIndex);
    },

    hasNextItem: () => {
      const { items, currentIndex } = get();
      return navigationUtils.hasNextItem(currentIndex, items.length);
    },

    getTotalItems: () => {
      const { items, totalItems } = get();
      return navigationUtils.getTotalItems(items, totalItems);
    },
  }));
