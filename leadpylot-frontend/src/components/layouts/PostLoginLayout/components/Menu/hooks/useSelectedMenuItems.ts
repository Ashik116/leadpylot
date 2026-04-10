import { useState, useEffect, useCallback } from 'react';
import type { NavigationTree } from '@/@types/navigation';

const STORAGE_KEY = 'selected-menu-items';

interface SelectedChildItem extends NavigationTree {
  parentKey: string;
}

/**
 * Hook to manage selected child items that replace parent dropdowns
 * Maps parentKey -> selected child item
 * Persists to localStorage
 */
export const useSelectedMenuItems = () => {
  const [selectedItemsMap, setSelectedItemsMap] = useState<Map<string, SelectedChildItem>>(() => {
    if (typeof window === 'undefined') return new Map();
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert array to Map
        const map = new Map<string, SelectedChildItem>();
        if (Array.isArray(parsed)) {
          parsed.forEach((item: SelectedChildItem) => {
            map.set(item.parentKey, item);
          });
        } else if (typeof parsed === 'object') {
          // Handle object format
          Object.entries(parsed).forEach(([parentKey, item]) => {
            map.set(parentKey, item as SelectedChildItem);
          });
        }
        return map;
      }
    } catch (error) {
      console.error('Error loading selected menu items:', error);
    }
    return new Map();
  });

  // Save to localStorage whenever selectedItemsMap changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // Convert Map to array for storage
      const itemsArray = Array.from(selectedItemsMap.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itemsArray));
    } catch (error) {
      console.error('Error saving selected menu items:', error);
    }
  }, [selectedItemsMap]);

  /**
   * Set selected child item for a parent dropdown
   * This replaces the parent dropdown with the selected child
   */
  const setSelectedChild = useCallback((item: NavigationTree, parentKey: string) => {
    setSelectedItemsMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(parentKey, {
        ...item,
        parentKey,
      });
      return newMap;
    });
  }, []);

  /**
   * Remove selected child item for a parent, restoring the dropdown
   */
  const removeSelectedChild = useCallback((parentKey: string) => {
    setSelectedItemsMap((prev) => {
      const newMap = new Map(prev);
      newMap.delete(parentKey);
      return newMap;
    });
  }, []);

  /**
   * Get selected child item for a parent
   */
  const getSelectedChild = useCallback(
    (parentKey: string): SelectedChildItem | undefined => {
      return selectedItemsMap.get(parentKey);
    },
    [selectedItemsMap]
  );

  /**
   * Check if a parent has a selected child
   */
  const hasSelectedChild = useCallback(
    (parentKey: string): boolean => {
      return selectedItemsMap.has(parentKey);
    },
    [selectedItemsMap]
  );

  /**
   * Clear all selected items
   */
  const clearAllSelected = useCallback(() => {
    setSelectedItemsMap(new Map());
  }, []);

  return {
    setSelectedChild,
    removeSelectedChild,
    getSelectedChild,
    hasSelectedChild,
    clearAllSelected,
  };
};

