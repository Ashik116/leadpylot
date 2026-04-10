/**
 * Multi-Table Filter Store
 * 
 * This store allows multiple independent tables on the same page to have
 * their own isolated filter/grouping state. Each table is identified by
 * a unique `tableId` and has its own state slice.
 * 
 * Usage:
 * - Single-table pages: Continue using `useUniversalGroupingFilterStore`
 * - Multi-table pages: Use `useTableScopedFilters(tableId)` for each table
 */

import { create } from 'zustand';

// Per-table state structure
export interface TableFilterState {
  groupBy: string[];
  entityType: string;
  userDomainFilters: Array<[string, string, any]>;
  expandedGroups: Set<string>;
  isDropdownOpen: boolean;
  pagination: {
    page: number;
    limit: number;
  };
  sorting: {
    sortBy: string | null;
    sortOrder: 'asc' | 'desc';
  };
}

// Default state for a new table
const createDefaultTableState = (): TableFilterState => ({
  groupBy: [],
  entityType: 'Lead',
  userDomainFilters: [],
  expandedGroups: new Set<string>(),
  isDropdownOpen: false,
  pagination: {
    page: 1,
    limit: 50,
  },
  sorting: {
    sortBy: null,
    sortOrder: 'desc',
  },
});

interface MultiTableFilterStore {
  // State keyed by table ID
  tables: Record<string, TableFilterState>;
  
  // Get state for a specific table (creates default if not exists)
  getTableState: (tableId: string) => TableFilterState;
  
  // Update state for a specific table
  setTableState: (tableId: string, updates: Partial<TableFilterState>) => void;
  
  // Specific setters for common operations
  setGroupBy: (tableId: string, groupBy: string[]) => void;
  setEntityType: (tableId: string, entityType: string) => void;
  setUserDomainFilters: (tableId: string, filters: Array<[string, string, any]>) => void;
  setDropdownOpen: (tableId: string, isOpen: boolean) => void;
  setPagination: (tableId: string, pagination: { page: number; limit: number }) => void;
  setSorting: (tableId: string, sorting: { sortBy: string | null; sortOrder: 'asc' | 'desc' }) => void;
  toggleGroupExpansion: (tableId: string, groupId: string) => void;
  
  // Clear state for a specific table
  clearTableState: (tableId: string) => void;
  
  // Clear grouping for a specific table
  clearGrouping: (tableId: string) => void;
  
  // Clear all filters for a specific table
  clearFilters: (tableId: string) => void;
}

export const useMultiTableFilterStore = create<MultiTableFilterStore>((set, get) => ({
  tables: {},
  
  getTableState: (tableId: string) => {
    const state = get().tables[tableId];
    if (state) return state;
    
    // Create default state for new table
    const defaultState = createDefaultTableState();
    set((s) => ({
      tables: {
        ...s.tables,
        [tableId]: defaultState,
      },
    }));
    return defaultState;
  },
  
  setTableState: (tableId: string, updates: Partial<TableFilterState>) => {
    set((state) => ({
      tables: {
        ...state.tables,
        [tableId]: {
          ...state.tables[tableId] || createDefaultTableState(),
          ...updates,
        },
      },
    }));
  },
  
  setGroupBy: (tableId: string, groupBy: string[]) => {
    set((state) => ({
      tables: {
        ...state.tables,
        [tableId]: {
          ...state.tables[tableId] || createDefaultTableState(),
          groupBy,
        },
      },
    }));
  },
  
  setEntityType: (tableId: string, entityType: string) => {
    set((state) => ({
      tables: {
        ...state.tables,
        [tableId]: {
          ...state.tables[tableId] || createDefaultTableState(),
          entityType,
        },
      },
    }));
  },
  
  setUserDomainFilters: (tableId: string, filters: Array<[string, string, any]>) => {
    set((state) => ({
      tables: {
        ...state.tables,
        [tableId]: {
          ...state.tables[tableId] || createDefaultTableState(),
          userDomainFilters: filters,
        },
      },
    }));
  },
  
  setDropdownOpen: (tableId: string, isOpen: boolean) => {
    set((state) => ({
      tables: {
        ...state.tables,
        [tableId]: {
          ...state.tables[tableId] || createDefaultTableState(),
          isDropdownOpen: isOpen,
        },
      },
    }));
  },
  
  setPagination: (tableId: string, pagination: { page: number; limit: number }) => {
    set((state) => ({
      tables: {
        ...state.tables,
        [tableId]: {
          ...state.tables[tableId] || createDefaultTableState(),
          pagination,
        },
      },
    }));
  },
  
  setSorting: (tableId: string, sorting: { sortBy: string | null; sortOrder: 'asc' | 'desc' }) => {
    set((state) => ({
      tables: {
        ...state.tables,
        [tableId]: {
          ...state.tables[tableId] || createDefaultTableState(),
          sorting,
        },
      },
    }));
  },
  
  toggleGroupExpansion: (tableId: string, groupId: string) => {
    set((state) => {
      const tableState = state.tables[tableId] || createDefaultTableState();
      const newExpandedGroups = new Set(tableState.expandedGroups);
      
      if (newExpandedGroups.has(groupId)) {
        newExpandedGroups.delete(groupId);
      } else {
        newExpandedGroups.add(groupId);
      }
      
      return {
        tables: {
          ...state.tables,
          [tableId]: {
            ...tableState,
            expandedGroups: newExpandedGroups,
          },
        },
      };
    });
  },
  
  clearTableState: (tableId: string) => {
    set((state) => ({
      tables: {
        ...state.tables,
        [tableId]: createDefaultTableState(),
      },
    }));
  },
  
  clearGrouping: (tableId: string) => {
    set((state) => ({
      tables: {
        ...state.tables,
        [tableId]: {
          ...state.tables[tableId] || createDefaultTableState(),
          groupBy: [],
          expandedGroups: new Set<string>(),
        },
      },
    }));
  },
  
  clearFilters: (tableId: string) => {
    set((state) => ({
      tables: {
        ...state.tables,
        [tableId]: {
          ...state.tables[tableId] || createDefaultTableState(),
          userDomainFilters: [],
        },
      },
    }));
  },
}));

/**
 * Hook to get scoped filter state and handlers for a specific table
 * Use this instead of useUniversalGroupingFilterStore for multi-table pages
 */
export const useTableScopedFilters = (tableId: string) => {
  const store = useMultiTableFilterStore();
  const tableState = store.getTableState(tableId);
  
  return {
    // State
    groupBy: tableState.groupBy,
    entityType: tableState.entityType,
    userDomainFilters: tableState.userDomainFilters,
    expandedGroups: tableState.expandedGroups,
    isDropdownOpen: tableState.isDropdownOpen,
    pagination: tableState.pagination,
    sorting: tableState.sorting,
    
    // Setters (scoped to this table)
    setGroupBy: (groupBy: string[]) => store.setGroupBy(tableId, groupBy),
    setEntityType: (entityType: string) => store.setEntityType(tableId, entityType),
    setUserDomainFilters: (filters: Array<[string, string, any]>) => 
      store.setUserDomainFilters(tableId, filters),
    setDropdownOpen: (isOpen: boolean) => store.setDropdownOpen(tableId, isOpen),
    setPagination: (pagination: { page: number; limit: number }) => 
      store.setPagination(tableId, pagination),
    setSorting: (sorting: { sortBy: string | null; sortOrder: 'asc' | 'desc' }) => 
      store.setSorting(tableId, sorting),
    toggleGroupExpansion: (groupId: string) => store.toggleGroupExpansion(tableId, groupId),
    
    // Clear methods
    clearGrouping: () => store.clearGrouping(tableId),
    clearFilters: () => store.clearFilters(tableId),
    clearAll: () => store.clearTableState(tableId),
  };
};
