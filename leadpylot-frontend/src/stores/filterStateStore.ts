/**
 * FilterStateStore — Consolidated filter and grouping state.
 *
 * Merges filterChainStore, universalGroupingFilterStore, and dynamicFiltersStore
 * into a single source of truth. No function references; logic lives in hooks/context.
 *
 * @see docs/GROUPING_AND_FILTERING_GUIDE.md
 */
import { create } from 'zustand';
import { Lead } from '@/services/LeadsService';
import { toDomainFiltersForApi } from '@/utils/filterUtils';
import { DEFAULT_PAGE_LIMIT } from '@/constants/pagination.constant';

// Re-export types for consumers
export type DomainFilter = [string, string, any];
export type EntityType =
  | 'Lead'
  | 'Offer'
  | 'User'
  | 'Team'
  | 'Opening'
  | 'Bank'
  | 'CashflowEntry'
  | 'CashflowTransaction'
  | 'Reclamation';

export interface FilterRule {
  field: string;
  operator: string;
  value: string | number | boolean;
}

// Group summary types (from universalGroupingFilterStore)
export interface GroupSummary {
  groupId: string;
  groupName: string;
  fieldName?: string;
  count: number;
  path?: string[];
  subGroups?: GroupSummary[];
  meta?: {
    total: number;
    totalGroups?: number;
    page: number;
    limit: number;
    pages: number;
    offset?: number;
  };
  summary?: {
    total_incoming_received?: number;
    incoming_received_count?: number;
    total_incoming_pending?: number;
    incoming_pending_count?: number;
    total_outgoing?: number;
    outgoing_count?: number;
    total_bounces?: number;
    bounces_count?: number;
    total_refunds?: number;
    refunds_count?: number;
    current_balance?: number | null;
    usable_balance?: number;
    is_frozen?: boolean;
  };
}

export interface GroupedSummaryResponse {
  success: boolean;
  data: GroupSummary[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface GroupDetailsResponse {
  success: boolean;
  data: unknown[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface MetadataFilterOption {
  field: string;
  label: string;
  type: string;
  operators: string[];
  ref: string | null;
  example: unknown;
  parentField?: string;
  parentLabel?: string;
  isRelatedField?: boolean;
  values?: Array<{ _id: string | number; value: string | number }>;
}

export interface MetadataValueOption {
  _id: string | number;
  value: string | number;
}

export interface MetadataGranularityOption {
  field: string;
  label: string;
  type: string;
  suffix: string;
  granularity: string;
  baseField: string;
  parentField?: string;
  parentLabel?: string;
}

export interface MetadataGroupOption {
  field: string;
  label: string;
  type: string;
  ref: string | null;
  values?: MetadataValueOption[];
  granularities?: MetadataGranularityOption[];
  baseField?: string;
  isRelatedField?: boolean;
}

export interface AvailableOperator {
  operator: string;
  label: string;
  types: string[];
}

export interface MetadataOptionsResponse {
  success: boolean;
  model: string;
  filterOptions: MetadataFilterOption[];
  groupOptions: MetadataGroupOption[];
  availableOperators: AvailableOperator[];
}

const convertFiltersToDomain = (filters: FilterRule[]): DomainFilter[] =>
  toDomainFiltersForApi(filters);

interface FilterStateStore {
  // ========== FILTER CHAIN (from filterChainStore) ==========
  importFilter: FilterRule | null;
  statusFilter: FilterRule | null;
  dynamicFilters: FilterRule[];
  filterData: number | undefined;
  selectedStatus: string | undefined;
  hasFilterData: boolean;
  hasSelectedStatus: boolean;
  hasSelectedGroupBy: boolean;
  hasDynamicFilters: boolean;
  hasUserAddedGroupBy: boolean;
  combinedFilters: FilterRule[];
  selectedGroupDetails: { field: string; groupId: string; groupName: string } | null;
  groupedLeadsSortBy: string | undefined;
  groupedLeadsSortOrder: 'asc' | 'desc' | undefined;
  isMultiLevelGroupingApplied: boolean;
  isFiltersDropdownOpen: boolean;
  filtersDropdownInitialSection: 'import' | 'groupBy' | 'dynamic' | null;
  activeDropdownTableId: string | null;

  // ========== GROUPING (from universalGroupingFilterStore) ==========
  entityType: EntityType;
  previousPathname: string | null;
  userDomainFilters: DomainFilter[];
  lockedDomainFilters: DomainFilter[];
  domainFilters: DomainFilter[];
  groupBy: string[];
  tableProgressFilter: string | undefined;
  expandedGroups: Set<string>;
  selectedGroupPath: string[] | null;
  pagination: { page: number; limit: number };
  subgroupPagination: Record<string, { subPage: number; subLimit: number }>;
  sorting: { sortBy: string | null; sortOrder: 'asc' | 'desc' };
  groupDetailsPagination: Record<string, { page: number; limit: number }>;
  buildDefaultFilters: (() => FilterRule[]) | null;
  hideProjectOption: boolean;

  // ========== DYNAMIC FILTERS (from dynamicFiltersStore) ==========
  isDynamicFilterMode: boolean;
  dynamicFilterResults: Lead[];
  dynamicFilterQuery: any[];
  customFilters: any[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  filterSource: 'custom' | 'table_header' | null;
  sortBy: string | null;
  sortOrder: 'asc' | 'desc' | '';
  refetchDynamicFilters?: (page?: number, pageSize?: number) => Promise<void>;

  // ========== ACTIONS ==========
  setImportFilter: (filter: FilterRule | null) => void;
  setStatusFilter: (filter: FilterRule | null) => void;
  setDynamicFilters: (filters: FilterRule[]) => void;
  setGroupBy: (groupBy: string[]) => void;
  setFilterData: (value: number | undefined) => void;
  setSelectedStatus: (status: string | undefined) => void;
  setSelectedGroupDetails: (details: { field: string; groupId: string; groupName: string } | null) => void;
  setGroupedLeadsSortBy: (sortBy: string | undefined) => void;
  setGroupedLeadsSortOrder: (order: 'asc' | 'desc' | undefined) => void;
  setIsMultiLevelGroupingApplied: (value: boolean) => void;
  openFiltersDropdown: (section?: 'import' | 'groupBy' | 'dynamic', tableId?: string) => void;
  closeFiltersDropdown: () => void;
  isDropdownOpenForTable: (tableId: string) => boolean;
  clearAllFilters: () => void;
  clearFilterByType: (type: 'import' | 'status' | 'dynamic' | 'groupBy') => void;
  getCombinedFilters: () => FilterRule[];
  getHasFilterData: () => boolean;
  getHasSelectedStatus: () => boolean;
  getHasSelectedGroupBy: () => boolean;
  getHasDynamicFilters: () => boolean;
  getHasUserAddedGroupBy: () => boolean;
  updateFromURL: (filters: FilterRule[], groupBy?: string[]) => void;

  setEntityType: (type: EntityType) => void;
  setPreviousPathname: (pathname: string | null) => void;
  setUserDomainFilters: (filters: DomainFilter[]) => void;
  addUserDomainFilter: (filter: DomainFilter) => void;
  removeUserDomainFilter: (index: number) => void;
  clearUserDomainFilters: () => void;
  setLockedDomainFilters: (filters: DomainFilter[]) => void;
  clearLockedDomainFilters: () => void;
  setDomainFilters: (filters: DomainFilter[]) => void;
  setTableProgressFilter: (filter: string | undefined) => void;
  toggleGroupExpansion: (groupId: string) => void;
  setSelectedGroupPath: (path: string[] | null) => void;
  setBuildDefaultFilters: (fn: (() => FilterRule[]) | null) => void;
  setPagination: (pagination: { page: number; limit: number }) => void;
  setSubgroupPagination: (uniqueGroupId: string, pagination: { subPage: number; subLimit: number }) => void;
  clearSubgroupPagination: (uniqueGroupId: string) => void;
  setSorting: (sorting: { sortBy: string | null; sortOrder: 'asc' | 'desc' }) => void;
  setGroupDetailsPagination: (groupId: string, pagination: { page: number; limit: number }) => void;
  setHideProjectOption: (hide: boolean) => void;
  getCombinedDomainFilters: () => DomainFilter[];
  getLockedDomainFilters: () => DomainFilter[];
  clearGrouping: () => void;

  setDynamicFilterMode: (mode: boolean) => void;
  setDynamicFilterResults: (results: Lead[]) => void;
  setDynamicFilterQuery: (query: any[]) => void;
  setCustomFilters: (filters: any[]) => void;
  setLoading: (loading: boolean) => void;
  setTotal: (total: number) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setHasNextPage: (hasNext: boolean) => void;
  setHasPrevPage: (hasPrev: boolean) => void;
  setFilterSource: (source: 'custom' | 'table_header' | null) => void;
  setSort: (key: string, order: 'asc' | 'desc' | '') => void;
  clearSort: () => void;
  setRefetchFunction: (refetchFn: (page?: number, pageSize?: number) => Promise<void>) => void;
  clearDynamicFilters: () => void;
}

const computeCombinedFilters = (state: {
  importFilter: FilterRule | null;
  statusFilter: FilterRule | null;
  dynamicFilters: FilterRule[];
}): FilterRule[] => {
  const filters: FilterRule[] = [];
  if (state.importFilter) filters.push(state.importFilter);
  if (state.statusFilter) filters.push(state.statusFilter);
  if (state.dynamicFilters.length > 0) filters.push(...state.dynamicFilters);
  return filters;
};

const computeDomainFilters = (
  buildDefaultFilters: (() => FilterRule[]) | null,
  lockedDomainFilters: DomainFilter[],
  userDomainFilters: DomainFilter[]
): DomainFilter[] => {
  const defaultFilters = buildDefaultFilters ? buildDefaultFilters() : [];
  const defaultDomain = convertFiltersToDomain(defaultFilters);
  return [...defaultDomain, ...lockedDomainFilters, ...userDomainFilters];
};

export const useFilterStateStore = create<FilterStateStore>((set, get) => ({
  // ========== INITIAL STATE ==========
  importFilter: null,
  statusFilter: null,
  dynamicFilters: [],
  filterData: undefined,
  selectedStatus: undefined,
  hasFilterData: false,
  hasSelectedStatus: false,
  hasSelectedGroupBy: false,
  hasDynamicFilters: false,
  hasUserAddedGroupBy: false,
  combinedFilters: [],
  selectedGroupDetails: null,
  groupedLeadsSortBy: undefined,
  groupedLeadsSortOrder: undefined,
  isMultiLevelGroupingApplied: false,
  isFiltersDropdownOpen: false,
  filtersDropdownInitialSection: null,
  activeDropdownTableId: null,

  entityType: 'Lead',
  previousPathname: null,
  userDomainFilters: [],
  lockedDomainFilters: [],
  domainFilters: [],
  groupBy: [],
  tableProgressFilter: undefined,
  expandedGroups: new Set<string>(),
  selectedGroupPath: null,
  pagination: { page: 1, limit: DEFAULT_PAGE_LIMIT },
  subgroupPagination: {},
  sorting: { sortBy: null, sortOrder: 'desc' },
  groupDetailsPagination: {},
  buildDefaultFilters: null,
  hideProjectOption: false,

  isDynamicFilterMode: false,
  dynamicFilterResults: [],
  dynamicFilterQuery: [],
  customFilters: [],
  isLoading: false,
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_LIMIT,
  hasNextPage: false,
  hasPrevPage: false,
  filterSource: null,
  sortBy: null,
  sortOrder: '',
  refetchDynamicFilters: undefined,

  // ========== FILTER CHAIN ACTIONS ==========
  setImportFilter: (filter) => {
    set((state) => {
      const newState = { ...state, importFilter: filter };
      const filterData = filter?.value as number | undefined;
      const hasFilterData = filter !== null;
      const combinedFilters = computeCombinedFilters(newState);
      return { ...newState, filterData, hasFilterData, combinedFilters };
    });
  },

  setStatusFilter: (filter) => {
    set((state) => {
      const newState = { ...state, statusFilter: filter };
      const selectedStatus = filter?.value as string | undefined;
      const hasSelectedStatus = filter !== null;
      const combinedFilters = computeCombinedFilters(newState);
      return { ...newState, selectedStatus, hasSelectedStatus, combinedFilters };
    });
  },

  setDynamicFilters: (filters) => {
    set((state) => {
      const newState = { ...state, dynamicFilters: filters };
      const hasDynamicFilters = filters.length > 0;
      const combinedFilters = computeCombinedFilters(newState);
      return { ...newState, hasDynamicFilters, combinedFilters };
    });
  },

  setGroupBy: (groupBy) => {
    const current = get().groupBy;
    if (JSON.stringify(current) === JSON.stringify(groupBy)) return;
    set((state) => ({
      groupBy,
      hasSelectedGroupBy: groupBy.length > 0,
    }));
  },

  setFilterData: (value) => {
    set({ filterData: value, hasFilterData: value !== undefined });
  },

  setSelectedStatus: (status) => {
    set({ selectedStatus: status, hasSelectedStatus: status !== undefined });
  },

  setSelectedGroupDetails: (details) => set({ selectedGroupDetails: details }),
  setGroupedLeadsSortBy: (sortBy) => set({ groupedLeadsSortBy: sortBy }),
  setGroupedLeadsSortOrder: (order) => set({ groupedLeadsSortOrder: order }),
  setIsMultiLevelGroupingApplied: (value) => set({ isMultiLevelGroupingApplied: value }),

  openFiltersDropdown: (section, tableId) => {
    set({
      isFiltersDropdownOpen: true,
      filtersDropdownInitialSection: section || null,
      activeDropdownTableId: tableId || null,
    });
  },

  closeFiltersDropdown: () => {
    set({
      isFiltersDropdownOpen: false,
      filtersDropdownInitialSection: null,
      activeDropdownTableId: null,
    });
  },

  isDropdownOpenForTable: (tableId) => {
    const state = get();
    if (state.activeDropdownTableId === null) return state.isFiltersDropdownOpen;
    return state.isFiltersDropdownOpen && state.activeDropdownTableId === tableId;
  },

  clearAllFilters: () => {
    const state = get();
    const combinedFilters = computeDomainFilters(
      state.buildDefaultFilters,
      state.lockedDomainFilters,
      []
    );
    set({
      importFilter: null,
      statusFilter: null,
      dynamicFilters: [],
      groupBy: [],
      filterData: undefined,
      selectedStatus: undefined,
      hasFilterData: false,
      hasSelectedStatus: false,
      hasSelectedGroupBy: false,
      hasDynamicFilters: false,
      hasUserAddedGroupBy: false,
      selectedGroupDetails: null,
      groupedLeadsSortBy: undefined,
      groupedLeadsSortOrder: undefined,
      isMultiLevelGroupingApplied: false,
      userDomainFilters: [],
      domainFilters: combinedFilters,
      expandedGroups: new Set<string>(),
      selectedGroupPath: null,
      pagination: { page: 1, limit: DEFAULT_PAGE_LIMIT },
      subgroupPagination: {},
      sorting: { sortBy: null, sortOrder: 'desc' },
      groupDetailsPagination: {},
      previousPathname: null,
    });
  },

  clearFilterByType: (type) => {
    set((state) => {
      const newState = { ...state };
      switch (type) {
        case 'import':
          newState.importFilter = null;
          newState.filterData = undefined;
          newState.hasFilterData = false;
          break;
        case 'status':
          newState.statusFilter = null;
          newState.selectedStatus = undefined;
          newState.hasSelectedStatus = false;
          break;
        case 'dynamic':
          newState.dynamicFilters = [];
          newState.hasDynamicFilters = false;
          break;
        case 'groupBy':
          newState.groupBy = [];
          newState.hasSelectedGroupBy = false;
          break;
      }
      const combinedFilters = computeCombinedFilters(newState);
      return { ...newState, combinedFilters };
    });
  },

  getCombinedFilters: () => computeCombinedFilters(get()),
  getHasFilterData: () => get().filterData !== undefined || get().importFilter !== null,
  getHasSelectedStatus: () => get().selectedStatus !== undefined || get().statusFilter !== null,
  getHasSelectedGroupBy: () => get().groupBy.length > 0,
  getHasDynamicFilters: () => get().dynamicFilters.length > 0,
  getHasUserAddedGroupBy: () => get().hasUserAddedGroupBy,

  updateFromURL: (filters, groupBy) => {
    const importFilter = filters.find((f) => f.field === 'duplicate_status') || null;
    const statusFilter = filters.find((f) => f.field === 'status') || null;
    const dynamicFilters = filters.filter(
      (f) => f.field !== 'duplicate_status' && f.field !== 'status'
    );
    const newGroupBy = groupBy || [];
    set({
      importFilter,
      statusFilter,
      dynamicFilters,
      groupBy: newGroupBy,
      filterData: importFilter?.value as number | undefined,
      selectedStatus: statusFilter?.value as string | undefined,
      hasFilterData: importFilter !== null,
      hasSelectedStatus: statusFilter !== null,
      hasSelectedGroupBy: newGroupBy.length > 0,
      hasDynamicFilters: dynamicFilters.length > 0,
    });
  },

  // ========== GROUPING ACTIONS ==========
  setEntityType: (type) => set({ entityType: type }),
  setPreviousPathname: (pathname) => set({ previousPathname: pathname }),

  setUserDomainFilters: (filters) => {
    const state = get();
    const combinedFilters = computeDomainFilters(
      state.buildDefaultFilters,
      state.lockedDomainFilters,
      filters
    );
    set({ userDomainFilters: filters, domainFilters: combinedFilters });
  },

  addUserDomainFilter: (filter) => {
    set((state) => {
      const user = [...state.userDomainFilters, filter];
      const combined = computeDomainFilters(
        state.buildDefaultFilters,
        state.lockedDomainFilters,
        user
      );
      return { userDomainFilters: user, domainFilters: combined };
    });
  },

  removeUserDomainFilter: (index) => {
    set((state) => {
      const user = state.userDomainFilters.filter((_, i) => i !== index);
      const combined = computeDomainFilters(
        state.buildDefaultFilters,
        state.lockedDomainFilters,
        user
      );
      return { userDomainFilters: user, domainFilters: combined };
    });
  },

  clearUserDomainFilters: () => {
    const state = get();
    const combined = computeDomainFilters(
      state.buildDefaultFilters,
      state.lockedDomainFilters,
      []
    );
    set({ userDomainFilters: [], domainFilters: combined });
  },

  setLockedDomainFilters: (filters) => {
    const state = get();
    const combined = computeDomainFilters(state.buildDefaultFilters, filters, state.userDomainFilters);
    set({ lockedDomainFilters: filters, domainFilters: combined });
  },

  clearLockedDomainFilters: () => {
    const state = get();
    const combined = computeDomainFilters(state.buildDefaultFilters, [], state.userDomainFilters);
    set({ lockedDomainFilters: [], domainFilters: combined });
  },

  setDomainFilters: (filters) => set({ domainFilters: filters }),
  setTableProgressFilter: (filter) => set({ tableProgressFilter: filter }),

  toggleGroupExpansion: (groupId) => {
    set((state) => {
      const newExpanded = new Set(state.expandedGroups);
      if (newExpanded.has(groupId)) {
        newExpanded.delete(groupId);
        const shouldClearPath =
          state.selectedGroupPath?.length &&
          state.selectedGroupPath[state.selectedGroupPath.length - 1] === groupId;
        return {
          expandedGroups: newExpanded,
          selectedGroupPath: shouldClearPath ? null : state.selectedGroupPath,
        };
      }
      newExpanded.add(groupId);
      return { expandedGroups: newExpanded };
    });
  },

  setSelectedGroupPath: (path) => set({ selectedGroupPath: path }),
  setBuildDefaultFilters: (fn) => set({ buildDefaultFilters: fn }),
  setHideProjectOption: (hide) => set({ hideProjectOption: hide }),

  setPagination: (pagination) => {
    set({ pagination, subgroupPagination: {} });
  },

  setSubgroupPagination: (uniqueGroupId, pagination) => {
    set((state) => ({
      subgroupPagination: {
        ...state.subgroupPagination,
        [uniqueGroupId]: { subPage: pagination.subPage, subLimit: pagination.subLimit },
      },
    }));
  },

  clearSubgroupPagination: (uniqueGroupId) => {
    set((state) => {
      const { [uniqueGroupId]: _, ...rest } = state.subgroupPagination;
      return { subgroupPagination: rest };
    });
  },

  setSorting: (sorting) => set({ sorting }),
  setGroupDetailsPagination: (groupId, pagination) => {
    set((state) => ({
      groupDetailsPagination: {
        ...state.groupDetailsPagination,
        [groupId]: pagination,
      },
    }));
  },

  getCombinedDomainFilters: () => {
    const state = get();
    return computeDomainFilters(
      state.buildDefaultFilters,
      state.lockedDomainFilters,
      state.userDomainFilters
    );
  },

  getLockedDomainFilters: () => get().lockedDomainFilters,

  clearGrouping: () => {
    set({
      groupBy: [],
      expandedGroups: new Set<string>(),
      selectedGroupPath: null,
      groupDetailsPagination: {},
    });
  },

  // ========== DYNAMIC FILTERS ACTIONS ==========
  setDynamicFilterMode: (mode) => set({ isDynamicFilterMode: mode }),
  setDynamicFilterResults: (results) => set({ dynamicFilterResults: results }),
  setDynamicFilterQuery: (query) => set({ dynamicFilterQuery: query }),
  setCustomFilters: (filters) => set({ customFilters: filters }),
  setLoading: (loading) => set({ isLoading: loading }),
  setTotal: (total) => set({ total }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize }),
  setHasNextPage: (hasNext) => set({ hasNextPage: hasNext }),
  setHasPrevPage: (hasPrev) => set({ hasPrevPage: hasPrev }),
  setFilterSource: (source) => set({ filterSource: source }),
  setSort: (key, order) => set({ sortBy: key, sortOrder: order }),
  clearSort: () => set({ sortBy: null, sortOrder: '' }),
  setRefetchFunction: (refetchFn) => set({ refetchDynamicFilters: refetchFn }),
  clearDynamicFilters: () =>
    set({
      isDynamicFilterMode: false,
      dynamicFilterResults: [],
      dynamicFilterQuery: [],
      customFilters: [],
      isLoading: false,
      total: 0,
      page: 1,
      pageSize: DEFAULT_PAGE_LIMIT,
      hasNextPage: false,
      hasPrevPage: false,
      filterSource: null,
      sortBy: null,
      sortOrder: '',
      refetchDynamicFilters: undefined,
    }),
}));
