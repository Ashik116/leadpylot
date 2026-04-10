import { Lead as LeadModel } from '@/services/LeadsService';
import { User as UserModel } from '@/services/UsersService';
import { Project as ProjectModel } from '@/services/ProjectsService';
import { Bank as BankModel } from '@/services/SettingsService';
import { createNavigationStore } from './genericNavigationStore';
import { create } from 'zustand';

// Reclamation type for navigation store
interface ReclamationModel {
  _id: string;
  project_id: string;
  agent_id: {
    _id: string;
    login?: string;
    info?: {
      email?: string;
    };
  };
  lead_id: {
    _id: string;
    phone: string;
    email_from?: string;
    lead_date?: string;
  } | null;
  reason: string;
  status: number;
  response: string;
  createdAt: string;
  updatedAt: string;
}

// Pagination metadata interface
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Filter state interface for tracking current filters
interface FilterState {
  search?: string;
  status?: string;
  duplicate?: number;
  use_status?: string; // Add use_status for pending leads filter
  dynamicFilters?: any[];
  bulkSearch?: string[];
  groupBy?: string;
  isDynamicFilterMode?: boolean;
  isBulkSearchMode?: boolean;
  isGroupedMode?: boolean; // Add this to track grouped mode
  groupPath?: string[]; // Add this to track group path for navigation
  groupFields?: string[]; // Add this to track group fields for navigation
  // Add new properties for search navigation
  isFromSearch?: boolean;
  searchTerm?: string;
  searchResultId?: string;
  // Pagination metadata
  paginationMeta?: PaginationMeta;
  // API URL for fetching data
  apiUrl?: string | null;
  // Additional filter properties
  showInactive?: boolean;
  has_todo?: boolean;
  source?: string;
  has_schedule?: boolean;
  project_id?: string;
  agent_name?: string;
  sortBy?: string;
  sortOrder?: string;
}

// Filter-aware navigation store interface
interface FilterAwareNavigationState<T extends { _id: string }> {
  // Current filter state
  currentFilterState: FilterState | null;

  // Filtered items (only the items that match current filters)
  filteredItems: T[];

  // Current index within filtered items
  currentFilteredIndex: number;

  // Total count of filtered items
  totalFilteredItems: number;

  // Pagination metadata
  paginationMeta: PaginationMeta | null;

  // Methods
  setFilterState: (filterState: FilterState | null) => void;
  setFilteredItems: (items: T[], meta?: PaginationMeta) => void;
  setCurrentFilteredIndex: (index: number) => void;
  setPaginationMeta: (meta: PaginationMeta | null) => void;
  findFilteredIndexById: (id: string) => number;
  getPreviousFilteredItem: () => T | null;
  getNextFilteredItem: () => T | null;
  getCurrentFilteredPosition: () => number;
  canGoToPrevious: () => boolean;
  canGoToNext: () => boolean;
  clearFilterState: () => void;
  // Helper to check if item is in current page
  isItemInCurrentPage: (id: string) => boolean;
  // Get the page number for a given index
  getPageForIndex: (index: number) => number;
}

// Create filter-aware navigation store
export const createFilterAwareNavigationStore = <T extends { _id: string }>() =>
  create<FilterAwareNavigationState<T>>((set, get) => ({
    currentFilterState: null,
    filteredItems: [],
    currentFilteredIndex: -1,
    totalFilteredItems: 0,
    paginationMeta: null,

    setFilterState: (filterState: FilterState | null) => {
      set({ currentFilterState: filterState });
    },

    setFilteredItems: (items: T[], meta?: PaginationMeta) => {
      // ✅ CRITICAL: Deduplicate items by _id to prevent duplicate IDs
      // This ensures each lead/offer appears only once in navigation store
      const seenIds = new Set<string>();
      const idToIndexMap = new Map<string, number>(); // Track original index of first occurrence
      const dedupedItems = items.reduce((acc: T[], curr: T, originalIndex: number) => {
        const id = String(curr._id);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          idToIndexMap.set(id, originalIndex);
          acc.push(curr);
        }
        return acc;
      }, []);

      // ✅ Adjust current index after deduplication
      // If current index points to a duplicate, find the first occurrence
      const currentIndex = get().currentFilteredIndex;
      let adjustedIndex = currentIndex;
      
      if (currentIndex >= 0 && currentIndex < items.length) {
        const currentItem = items[currentIndex];
        if (currentItem) {
          const currentId = String(currentItem._id);
          // Find the index of the first occurrence of this ID in dedupedItems
          const firstOccurrenceIndex = dedupedItems.findIndex(
            (item) => String(item._id) === currentId
          );
          if (firstOccurrenceIndex >= 0) {
            adjustedIndex = firstOccurrenceIndex;
          } else {
            // If current item was removed (shouldn't happen), reset index
            adjustedIndex = -1;
          }
        }
      }

      set({
        filteredItems: dedupedItems,
        totalFilteredItems: meta?.total || dedupedItems.length,
        paginationMeta: meta || null,
        // Use adjusted index after deduplication
        currentFilteredIndex:
          adjustedIndex >= dedupedItems.length ? -1 : adjustedIndex,
      });
    },

    setCurrentFilteredIndex: (index: number) => {
      set({ currentFilteredIndex: index });
    },

    setPaginationMeta: (meta: PaginationMeta | null) => {
      set({ paginationMeta: meta });
    },

    findFilteredIndexById: (id: string) => {
      const { filteredItems } = get();
      // CRITICAL: Convert both to strings for consistent comparison
      // This handles cases where _id might be ObjectId or string
      const idString = String(id);
      return filteredItems.findIndex((item) => String(item._id) === idString);
    },

    getPreviousFilteredItem: () => {
      const { filteredItems, currentFilteredIndex } = get();
      if (currentFilteredIndex > 0 && currentFilteredIndex < filteredItems.length) {
        return filteredItems[currentFilteredIndex - 1];
      }
      return null;
    },

    getNextFilteredItem: () => {
      const { filteredItems, currentFilteredIndex } = get();
      if (currentFilteredIndex >= 0 && currentFilteredIndex < filteredItems.length - 1) {
        return filteredItems[currentFilteredIndex + 1];
      }
      return null;
    },

    getCurrentFilteredPosition: () => {
      const { currentFilteredIndex, paginationMeta } = get();
      if (currentFilteredIndex >= 0 && paginationMeta) {
        // Calculate global position: (page - 1) * limit + indexInPage + 1
        const indexInPage = currentFilteredIndex;
        return (paginationMeta.page - 1) * paginationMeta.limit + indexInPage + 1;
      }
      return currentFilteredIndex >= 0 ? currentFilteredIndex + 1 : 0;
    },

    canGoToPrevious: () => {
      const { currentFilteredIndex, paginationMeta } = get();
      if (paginationMeta) {
        // Can go previous if not at first item globally
        const globalPosition = get().getCurrentFilteredPosition();
        return globalPosition > 1;
      }
      return currentFilteredIndex > 0;
    },

    canGoToNext: () => {
      const { filteredItems, currentFilteredIndex, paginationMeta } = get();
      if (paginationMeta) {
        // Can go next if not at last item globally
        // CRITICAL: Use paginationMeta.total instead of totalFilteredItems
        // totalFilteredItems might be the page limit (50), not the actual total (353)
        const globalPosition = get().getCurrentFilteredPosition();
        return globalPosition < paginationMeta.total;
      }
      return currentFilteredIndex >= 0 && currentFilteredIndex < filteredItems.length - 1;
    },

    clearFilterState: () => {
      set({
        currentFilterState: null,
        filteredItems: [],
        currentFilteredIndex: -1,
        totalFilteredItems: 0,
        paginationMeta: null,
      });
    },

    isItemInCurrentPage: (id: string) => {
      const { filteredItems } = get();
      return filteredItems.some((item) => item._id === id);
    },

    getPageForIndex: (index: number) => {
      const { paginationMeta } = get();
      if (paginationMeta) {
        return Math.floor(index / paginationMeta.limit) + 1;
      }
      return 1;
    },
  }));

export const useLeadsNavigationStore = createNavigationStore<LeadModel>();
export const useFilterAwareLeadsNavigationStore = createFilterAwareNavigationStore<LeadModel>();

// ✅ Create filter-aware navigation stores for all entity types
export const useFilterAwareOffersNavigationStore = createFilterAwareNavigationStore<any>();
export const useFilterAwareUsersNavigationStore = createFilterAwareNavigationStore<UserModel>();
export const useFilterAwareOpeningsNavigationStore = createFilterAwareNavigationStore<any>();

export const useUsersNavigationStore = createNavigationStore<UserModel>();
export const useProjectsNavigationStore = createNavigationStore<ProjectModel>();
export const useReclamationsNavigationStore = createNavigationStore<ReclamationModel>();
export const useBanksNavigationStore = createNavigationStore<BankModel>();

/*
 use only genericNavigationStore.ts & navigationStores.ts file for navigation
*/
