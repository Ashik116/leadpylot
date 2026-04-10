import { create } from 'zustand';
import { apiGetColumnPreferenceByUser, apiSaveColumnPreference } from '@/services/LeadsService';

interface ColumnOrderState {
  columnOrders: Record<string, string[]>; // Table-specific column orders
  columnVisibility: Record<string, Record<string, boolean>>; // Table-specific column visibility
  isDragModeEnabled: boolean;
  hasHydrated: boolean; // Track if store has loaded from localStorage
  version: number; // Track server version for optimistic locking
  lastSaveError: string | null; // Track last save error for debugging
  setColumnOrder: (tableName: string, order: string[]) => void;
  getColumnOrder: (tableName: string) => string[];
  setColumnVisibility: (tableName: string, visibility: Record<string, boolean>) => void;
  getColumnVisibility: (tableName: string) => Record<string, boolean>;
  updateColumnVisibility: (tableName: string, columnKey: string, isVisible: boolean) => void;
  setDragModeEnabled: (enabled: boolean) => void;
  resetColumnOrder: (tableName: string) => void;
  resetColumnVisibility: (tableName: string, preservedFields?: string[], columns?: any[]) => void;
  setHasHydrated: (hydrated: boolean) => void;
  hydrateFromServer: () => Promise<void>;
  forceRehydrateFromServer: () => Promise<void>;
  saveToServer: () => Promise<{ success: boolean; error?: string }>;
}

// Track hydration promise to prevent multiple simultaneous API calls
let hydrationPromise: Promise<void> | null = null;

export const useColumnOrderStore = create<ColumnOrderState>()((set, get) => ({
  columnOrders: {},
  columnVisibility: {},
  isDragModeEnabled: false,
  hasHydrated: false,
  version: 0,
  lastSaveError: null,
  hydrateFromServer: async () => {
    const state = get();
    
    // If already hydrated, return immediately
    if (state.hasHydrated) {
      return;
    }
    
    // If hydration is already in progress, wait for the existing promise
    if (hydrationPromise) {
      return hydrationPromise;
    }
    
    // Start hydration and store the promise
    hydrationPromise = (async () => {
      try {
        const res = await apiGetColumnPreferenceByUser();
        
        // Check for success flag from backend
        if (res?.success === false) {
          console.warn('Failed to fetch column preferences:', res?.message);
          set({ hasHydrated: true, lastSaveError: res?.message || 'Failed to fetch preferences' });
          return;
        }
        
        const serverData = res?.data;
        if (serverData && typeof serverData === 'object') {
          set((state) => ({
            columnOrders: serverData.columnOrders || state.columnOrders,
            columnVisibility: serverData.columnVisibility || state.columnVisibility,
            isDragModeEnabled:
              typeof serverData.isDragModeEnabled === 'boolean'
                ? serverData.isDragModeEnabled
                : state.isDragModeEnabled,
            hasHydrated: true,
            version: res?.version ?? state.version,
            lastSaveError: null,
          }));
        } else {
          set({ hasHydrated: true });
        }
      } catch (error: any) {
        // On failure, proceed with local data but log the error
        console.warn('Error fetching column preferences:', error?.message || error);
        set({ hasHydrated: true, lastSaveError: error?.message || 'Network error' });
      } finally {
        // Clear the promise so future calls can hydrate again if needed
        hydrationPromise = null;
      }
    })();
    
    return hydrationPromise;
  },
  forceRehydrateFromServer: async () => {
    try {
      const res = await apiGetColumnPreferenceByUser();
      if (res?.success === false) return;
      const serverData = res?.data;
      if (serverData && typeof serverData === 'object') {
        set((state) => ({
          columnOrders: serverData.columnOrders || state.columnOrders,
          columnVisibility: serverData.columnVisibility || state.columnVisibility,
          version: res?.version ?? state.version,
        }));
      }
    } catch (e) {
      console.warn('Force rehydrate failed:', e);
    }
  },
  saveToServer: async () => {
    const state = get();
    try {
      const res = await apiSaveColumnPreference({
        data: {
          columnOrders: state.columnOrders,
          columnVisibility: state.columnVisibility,
          isDragModeEnabled: state.isDragModeEnabled,
          hasHydrated: true,
        },
        version: state.version,
      });
      
      // Check for success flag from backend
      if (res?.success === false) {
        const errorMsg = res?.message || 'Failed to save preferences';
        console.warn('Failed to save column preferences:', errorMsg);
        set({ lastSaveError: errorMsg });
        return { success: false, error: errorMsg };
      }
      
      // Update version from server response if available
      set({ lastSaveError: null });
      return { success: true };
    } catch (error: any) {
      const errorMsg = error?.message || 'Network error while saving';
      console.warn('Error saving column preferences:', errorMsg);
      set({ lastSaveError: errorMsg });
      return { success: false, error: errorMsg };
    }
  },
  // internal save scheduler
  setColumnOrder: (tableName, order) => {
    set((state) => ({
      columnOrders: {
        ...state.columnOrders,
        [tableName]: order,
      },
    }));
    scheduleSave(get);
  },
  getColumnOrder: (tableName) => {
    const state = get();
    return state.columnOrders[tableName] || [];
  },
  setColumnVisibility: (tableName, visibility) => {
    set((state) => ({
      columnVisibility: {
        ...state.columnVisibility,
        [tableName]: visibility,
      },
    }));
    scheduleSave(get);
  },
  getColumnVisibility: (tableName) => {
    const state = get();
    return state.columnVisibility[tableName] || {};
  },
  updateColumnVisibility: (tableName, columnKey, isVisible) => {
    set((state) => ({
      columnVisibility: {
        ...state.columnVisibility,
        [tableName]: {
          ...state.columnVisibility[tableName],
          [columnKey]: isVisible,
        },
      },
    }));
    scheduleSave(get);
  },
  setDragModeEnabled: (enabled) => {
    set({ isDragModeEnabled: enabled });
    scheduleSave(get);
  },
  resetColumnOrder: (tableName) =>
    set((state) => {
      const newOrders = { ...state.columnOrders };
      delete newOrders[tableName];
      return { columnOrders: newOrders };
    }),

  resetColumnVisibility: (tableName, preservedFields?: string[], columns?: any[]) =>
    set((state) => {
      const current = state.columnVisibility[tableName] || {};
      const columnKeys = Array.isArray(columns)
        ? columns.map((c: any) => c?.accessorKey ?? c?.id).filter(Boolean)
        : [];
      // Use union: provided columns + any existing stored keys
      const keys = Array.from(new Set([...columnKeys, ...Object.keys(current)]));
      if (keys.length === 0) return { columnVisibility: state.columnVisibility };
      const next: Record<string, boolean> = Object.fromEntries(keys.map((k) => [k, true]));
      // Preserve stored state for preserved fields only if it exists in storage
      (preservedFields || []).forEach((k) => {
        if (k in current) next[k] = current[k];
      });
      return {
        columnVisibility: {
          ...state.columnVisibility,
          [tableName]: next,
        },
      };
    }),
  setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
}));

// // Debounced save helper
// let saveTimer: number | undefined;
// function scheduleSave(get: () => ColumnOrderState) {
//   if (typeof window === 'undefined') return;
//   if (saveTimer !== undefined) {
//     window.clearTimeout(saveTimer);
//   }
//   saveTimer = window.setTimeout(() => {
//     const { saveToServer } = get();
//     saveToServer();
//   }, 800);
// }

// Debounced save helper
let saveTimer: number | undefined;
function scheduleSave(get: () => ColumnOrderState) {
  if (typeof window === 'undefined') return;
  if (saveTimer !== undefined) {
    window.clearTimeout(saveTimer);
  }
  saveTimer = window.setTimeout(() => {
    const { saveToServer } = get();
    saveToServer();
    saveTimer = undefined; // clear after firing
  }, 800);
}

// NEW: allow other modules to cancel any pending save
export function cancelColumnPrefSaveDebounce() {
  if (typeof window === 'undefined') return;
  if (saveTimer !== undefined) {
    window.clearTimeout(saveTimer);
    saveTimer = undefined;
  }
}
