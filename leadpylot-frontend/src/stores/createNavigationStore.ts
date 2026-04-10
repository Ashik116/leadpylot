import { create, StoreApi, UseBoundStore } from 'zustand';

export interface ItemWithId {
  _id: string;
}

export const navigationUtils = {
  getCurrentPosition: (currentIndex: number): number => {
    return currentIndex >= 0 ? currentIndex + 1 : 0;
  },

  hasPreviousItem: (currentIndex: number): boolean => {
    return currentIndex > 0;
  },

  hasNextItem: (currentIndex: number, itemsLength: number): boolean => {
    return currentIndex >= 0 && currentIndex < itemsLength - 1;
  },

  getPreviousItem: <T>(items: T[], currentIndex: number): T | null => {
    if (currentIndex > 0) {
      return items[currentIndex - 1];
    }
    return null;
  },

  getNextItem: <T>(items: T[], currentIndex: number): T | null => {
    if (currentIndex >= 0 && currentIndex < items.length - 1) {
      return items[currentIndex + 1];
    }
    return null;
  },

  addItemsWithoutDuplicates: <T extends ItemWithId>(existingItems: T[], newItems: T[]): T[] => {
    const existingItemsMap = new Map(existingItems.map((item) => [item._id, item]));

    newItems?.forEach((item) => {
      existingItemsMap.set(item._id, item);
    });

    return Array.from(existingItemsMap.values());
  },

  updateItemById: <T extends ItemWithId>(items: T[], updatedItem: T): T[] => {
    const itemIndex = items.findIndex((item) => item._id === updatedItem._id);

    if (itemIndex !== -1) {
      const updatedItems = [...items];
      updatedItems[itemIndex] = updatedItem;
      return updatedItems;
    }

    return items;
  },

  removeItemById: <T extends ItemWithId>(
    items: T[],
    itemId: string,
    currentIndex: number
  ): { items: T[]; currentIndex: number } => {
    const itemIndex = items.findIndex((item) => item._id === itemId);

    if (itemIndex !== -1) {
      // Create a new array without the removed item
      const updatedItems = items.filter((item) => item._id !== itemId);

      // Adjust current index if needed
      const adjustedIndex = itemIndex < currentIndex ? currentIndex - 1 : currentIndex;

      return {
        items: updatedItems,
        currentIndex: adjustedIndex,
      };
    }

    return { items, currentIndex };
  },

  findItemIndexById: <T extends ItemWithId>(items: T[], itemId: string): number => {
    return items.findIndex((item) => item._id === itemId);
  },

  getTotalItems: <T>(items: T[], total?: number): number => {
    return total && total > 0 ? total : items.length;
  },
};

/**
 * Generic interface for navigation store state
 */
export interface NavigationState<T extends ItemWithId> {
  // Basic properties
  currentIndex: number;
  items: T[];
  totalItems: number;

  // Basic methods
  setCurrentIndex: (index: number) => void;
  getCurrentPosition: () => number;

  // Item-specific methods
  setItems: (items: T[]) => void;
  addItems: (newItems: T[]) => void;
  updateItem: (item: T) => void;
  removeItem: (itemId: string) => void;
  findItemIndexById: (itemId: string) => number;
  getPreviousItem: () => T | null;
  getNextItem: () => T | null;
  hasPreviousItem: () => boolean;
  hasNextItem: () => boolean;
  getTotalItems: () => number;
  setTotalItems: (total: number) => void;
}

/**
 * Creates a generic navigation store
 * @param initialState Partial initial state for the store
 */
export function createGenericNavigationStore<T extends ItemWithId>() {
  return create<NavigationState<T>>((set, get) => ({
    // Basic properties
    currentIndex: -1,
    items: [],
    totalItems: 0,

    // Basic methods
    setCurrentIndex: (index: number) => set({ currentIndex: index }),
    getCurrentPosition: () => {
      const { currentIndex } = get();
      return navigationUtils.getCurrentPosition(currentIndex);
    },

    // Item-specific methods
    setItems: (newItems: T[]) => set({ items: newItems }),

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

    removeItem: (itemId: string) => {
      const { items, currentIndex, totalItems } = get();
      const result = navigationUtils.removeItemById(items, itemId, currentIndex);

      const updates: Partial<NavigationState<T>> = {
        items: result.items,
        currentIndex: result.currentIndex,
      };

      // Update total count if available
      if (totalItems > 0) {
        updates.totalItems = totalItems - 1;
      }

      set(updates);
    },

    setTotalItems: (total: number) => set({ totalItems: total }),

    findItemIndexById: (itemId: string) => {
      const { items } = get();
      return navigationUtils.findItemIndexById(items, itemId);
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
}

// Type alias for the store created by createGenericNavigationStore
export type GenericNavigationStore<T extends ItemWithId> = UseBoundStore<
  StoreApi<NavigationState<T>>
>;
