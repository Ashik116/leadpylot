'use client';

import React, { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import {
  useBulkDeleteLeads,
  useBulkUpdateLeads,
  usePermanentDeleteLead,
  useRestoreLeads,
  useCloseProjectWithRefresh,
  useGetAllDomainFilterResults,
} from '@/services/hooks/useLeads';
import { useLeadsDashboard } from '../hooks/useLeadsDashboard';
import { useFilterChainLeads } from '@/hooks/useFilterChainLeads';
import { useTableHeight } from '@/hooks/useTableHeight';
import { useLeadsGroupingAndFiltering } from '../hooks/useLeadsGroupingAndFiltering';
import { useLeadsDashboardActions } from '../hooks/useLeadsDashboardActions';
import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';
import useNotification from '@/utils/hooks/useNotification';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { useFilterChainStore } from '@/stores/filterChainStore';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import { FilterProvider } from '@/contexts/FilterContext';
import { hasMeaningfulDomainFilters } from '@/utils/filterUtils';
import LeadsDashboardProps from '@/_interface/commonLeadsDashboardInterface';
import { Lead } from '@/services/LeadsService';

interface LeadsDashboardContextValue {
  // Props from parent
  pageTitle?: string;
  tableName: string;
  sharedDataTable: boolean;
  pendingLeadsComponent?: boolean;
  deleteButton: boolean;
  extraActions?: React.ReactNode;
  filterBtnComponent?: React.ReactNode;
  hideGroupBy: boolean;
  hideProjectOption: boolean;
  externalProjectId?: string;
  closeProjectId?: string;
  setIsProjectOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  /** Loaded project document on close-project / project detail pages (team scope for closed-leads domain). */
  projectData?: unknown;

  // State from hooks
  selectedLeads: string[];
  isLoading: boolean;
  leadsData: any;
  page: number;
  pageSize: number;
  externalPage?: number;
  externalPageSize?: number;
  externalTotal?: number;
  externalLoading?: boolean;
  externalData?: any[];

  // Filter chain state
  selectedStatus?: string;
  selectedGroupBy: string[];
  filterData?: number;
  isDynamicFilterMode: boolean;
  isBulkSearchMode: boolean;
  bulkSearchResults: any[];
  bulkSearchQuery: string[];
  dynamicFilterResults: any[];
  dynamicTotal: number;
  filterSource?: string | null;
  hasFilterData: boolean;
  hasSelectedStatus: boolean;
  hasSelectedGroupBy: boolean;
  hasDynamicFilters: boolean;
  hasUserAddedGroupBy: boolean;

  // Grouping state
  selectedGroupDetails?: any;
  groupLeadsData?: any;
  groupLeadsLoading: boolean;
  liftedGroupedLeadsData?: any;
  liftedGroupedLeadsLoading: boolean;
  groupedLeadsSortBy?: string;
  groupedLeadsSortOrder?: 'asc' | 'desc';
  groupedLeadsTransformLeads: boolean;
  isMultiLevelGroupingApplied: boolean;
  selectAllGroupedLeadsSignal: number;
  clearGroupedSelections: number;
  groupedLeadsFilters?: any;

  // Dashboard state
  transformLeads: boolean;
  isAssignDialogOpen: boolean;
  isReclamationDialogOpen: boolean;
  selectedProjectId?: string;
  selectedAgentId?: string;
  projects: any[];
  isSubmitting: boolean;
  deleteConfirmDialogOpen: boolean;
  updateConfirmDialogOpen: boolean;
  reclamationReason: string;
  isNoteDialogOpen: boolean;
  selectedLead: any;
  expandedRowId?: string | null;
  isSubmittingReclamation: boolean;
  allColumns: any[];
  columnVisibility: any;
  search?: string | null;
  selectLeadPrice?: string | boolean;
  customPrice?: number;
  makeFresh: boolean;
  restoreArchived: boolean;
  setRestoreArchived: (value: boolean) => void;
  sortedData: any[];
  isAgent: boolean;
  allProjects: any[] | undefined;
  allStatus: any[];

  // Actions state
  isArchivedPage: boolean;
  total: number;

  // Dialog states
  isColumnOrderDialogOpen: boolean;
  archiveConfirmDialogOpen: boolean;
  restoreConfirmDialogOpen: boolean;
  isCloseProjectDialogOpen: boolean;
  closureReason: string;
  /** Optional Lead `status_id` sent as `current_status` on close-project API. */
  closeProjectCurrentStatus: string;
  /** Notes when closing with reason `other`. */
  closeProjectNotes: string;
  isBulkUpdateDialogOpen: boolean;
  isBulkSearchEditModalOpen: boolean;
  customizeButtonRef: React.RefObject<HTMLButtonElement | null>;

  // Dynamic pagination
  dynamicPage: number;
  dynamicPageSize: number;

  // Table
  tableHeightClass: string;

  // Mutations
  bulkDeleteMutationLeads: any;
  bulkUpdateMutationLeads: any;
  permanentDeleteLeads: any;
  restoreLeadsMutation: any;
  closeProjectMutation: any;

  // Setters
  setSelectedLeads: (leads: string[]) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFilterData: (data: number | undefined) => void;
  setIsAssignDialogOpen: (open: boolean) => void;
  setIsReclamationDialogOpen: (open: boolean) => void;
  setSelectedAgentId: (id: string) => void;
  setDeleteConfirmDialogOpen: (open: boolean) => void;
  setUpdateConfirmDialogOpen: (open: boolean) => void;
  setReclamationReason: (reason: string) => void;
  setIsNoteDialogOpen: (open: boolean) => void;
  setExpandedRowId: (id: string | null) => void;
  setSelectedLeadPrice: (price: string) => void;
  setSelectedProjectId: (id: string) => void;
  setCustomPrice: (price: number) => void;
  setMakeFresh: (makeFresh: boolean) => void;
  setGroupLeadsData: (data: any) => void;
  setGroupLeadsLoading: (loading: boolean) => void;
  setLiftedGroupedLeadsData: (data: any) => void;
  setLiftedGroupedLeadsLoading: (loading: boolean) => void;
  setIsColumnOrderDialogOpen: (open: boolean) => void;
  setArchiveConfirmDialogOpen: (open: boolean) => void;
  setRestoreConfirmDialogOpen: (open: boolean) => void;
  setIsCloseProjectDialogOpen: (open: boolean) => void;
  setClosureReason: (reason: string) => void;
  setCloseProjectCurrentStatus: (statusId: string) => void;
  setCloseProjectNotes: (notes: string) => void;
  setIsBulkUpdateDialogOpen: (open: boolean) => void;
  setIsBulkSearchEditModalOpen: (open: boolean) => void;

  // Handlers
  handleRowClick: (lead: any) => void;
  handleRowClickWrapper: (lead: any) => void;
  handleColumnVisibilityChange: (key: string, isChecked: boolean) => void;
  handleAssignLeads: () => void;
  handleClearSelection: () => void;
  handleClearSelectionWrapper: () => void;
  handleAssignSubmit: () => Promise<void>;
  handleReclamationSubmit: () => Promise<void>;
  handleRevertClosedProjectLeads: () => Promise<void>;
  getCurrentProjectAndAgent?: { currentProjectId?: string; currentAgentId?: string };
  handleProjectChange: any;
  getProjectAgents: any;
  getUserLogin: any;
  onAppendQueryParams: (params: any) => void;
  handleAssignSubmitTransform: () => Promise<void>;
  selectAllLeadsFromApi: any;
  handleSort: (column: any) => void;
  conditionalRefetch: () => Promise<void>;
  getFilteredColumns: (sharedDataTable: boolean) => any[];
  areAllDisplayedItemsSelected: () => boolean;
  areClosedLeadsActionsDisabled: boolean;

  // Filter handlers
  handleStatusChange: (status: string | undefined) => void;
  handleFilterDataChange: (value: number | undefined) => void;
  handleClearImportFilter: () => void;
  handleClearStatusFilter: () => void;
  handleClearDynamicFilters: () => void;
  clearBulkSearch: () => void;
  clearDynamicFilters: () => void;
  clearFilterByType: (type: 'status' | 'import' | 'dynamic' | 'groupBy') => void;
  buildApiFilters: () => any[];

  // Grouping handlers
  handleGroupByChange: (groupBy: string | undefined) => void;
  handleGroupByArrayChangeWithReset: (groupBy: string[]) => void;
  handleClearGroupByFilter: () => void;
  handleMultiLevelGrouping: () => void;
  handleGroupedLeadSelectionChange: (selectedIds: string[]) => void;
  selectAllGroupedLeads: () => void;
  handleGroupedLeadsSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  handleGroupedLeadsSelectionForAssignment: (leadIds: string[]) => void;
  handleGroupClick: (field: string, groupId: string, groupName: string) => void;
  clearGroupDetails: () => void;
  handleDynamicFilterPaginationChange: (page: number) => void;
  handleDynamicFilterPageSizeChange: (pageSize: number) => void;
  handleDynamicFilterPaginationWrapper: (page: number, newPageSize?: number) => void;
  handleSelectAllSmart: () => void;

  // Action handlers
  handleCheckLeads: (usable?: boolean) => Promise<void>;
  handleMakeFreshLeads: () => void;
  handleBulkUpdate: () => void;
  handleEditBulkSearch: () => void;
  handleCloseProjectSubmit: () => Promise<void>;

  // Utility
  clearSelectedItems: () => void;
  openNotification: any;

  // Task Detail Modal
  isTaskDetailModalOpen: boolean;
  setIsTaskDetailModalOpen: (open: boolean) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  handleOpenTaskDetail: (taskId: string) => void;
  handleCloseTaskDetail: () => void;
  leadTableLoading: boolean;
  selectedLeadForDetails: Lead | null;
  leadDetailsViewOpen: boolean;
  handleCloseLeadDetailsView: () => void;
}

/** Exposed for `GroupSummary` (and similar) that cannot use `useLeadsDashboardContext` hook rules. */
export const LeadsDashboardContext = createContext<LeadsDashboardContextValue | null>(null);

export const useLeadsDashboardContext = () => {
  const context = useContext(LeadsDashboardContext);
  if (!context) {
    throw new Error('useLeadsDashboardContext must be used within LeadsDashboardProvider');
  }
  return context;
};

interface LeadsDashboardProviderProps extends LeadsDashboardProps {
  children: ReactNode;
}

export const LeadsDashboardProvider: React.FC<LeadsDashboardProviderProps> = ({
  children,
  data: externalData,
  loading: externalLoading,
  total: externalTotal,
  page: externalPage,
  pageSize: externalPageSize,
  onPaginationChange: externalOnPaginationChange,
  onPageSizeChange: externalOnPageSizeChange,
  pendingLeadsComponent,
  setIsProjectOpen,
  pageTitle,
  recentImport = false,
  tableName = 'leads',
  projectNameFromDetailsPage,
  externalProjectId,
  projectData,
  getCurrentPosition,
  totalProjects,
  goToPreviousProject,
  goToNextProject,
  sharedDataTable = false,
  todoFilterScope,
  todoStatistics,
  pageInfoSubtitlePrefix,
  extraActions,
  deleteButton = true,
  filterBtnComponent,
  hideGroupBy = false,
  hideProjectOption = false,
  closeProjectId,
}) => {
  // Selected items store and handler
  const { clearSelectedItems } = useSelectedItemsStore();

  // Notification hook
  const { openNotification } = useNotification();

  // Track if user has manually cleared the group filter to prevent auto-reapplication
  const [hasManuallyClearedGroupFilter, setHasManuallyClearedGroupFilter] = useState(false);

  // Check if custom filters are applied (user has added domain filters)
  const {
    userDomainFilters,
    setHideProjectOption,
    setEntityType,
    entityType: storeEntityType,
  } = useUniversalGroupingFilterStore();
  const hasCustomFilters = hasMeaningfulDomainFilters(userDomainFilters);

  // Set hideProjectOption in store so it's accessible globally (e.g., in GlobalSearch)
  useEffect(() => {
    setHideProjectOption(hideProjectOption);
  }, [hideProjectOption, setHideProjectOption]);

  // Set entity type to "Lead" when CommonLeadsDashboard is used (since it's always for leads)
  // This ensures GroupByOptions uses the correct metadata API endpoint
  useEffect(() => {
    if (storeEntityType !== 'Lead') {
      setEntityType('Lead');
    }
  }, [storeEntityType, setEntityType]);

  // Use the new filter chain hook with minimal dependencies first
  const filterChain = useFilterChainLeads({
    pendingLeadsComponent,
    hasManuallyClearedGroupFilter,
    projectData,
    closeProjectId,
    externalProjectId,
  });

  // Hook for fetching all dynamic filter results
  const getAllDynamicFilterResults = useGetAllDomainFilterResults();

  // Extract values from filter chain hook
  const {
    selectedStatus,
    selectedGroupBy,
    filterData: chainFilterData,
    buildApiFilters,
    buildGroupedLeadsFilters,
    handleStatusChange,
    handleGroupByChange: chainHandleGroupByChange,
    handleGroupByArrayChange: chainHandleGroupByArrayChange,
    handleFilterDataChange,
    handleClearImportFilter,
    handleClearStatusFilter,
    handleClearGroupByFilter: chainHandleClearGroupByFilter,
    handleClearDynamicFilters,
    hasFilterData,
    hasSelectedStatus,
    hasSelectedGroupBy,
    hasDynamicFilters,
    hasUserAddedGroupBy,
    isLiveLeadsPage,
    isRecycleLeadsPage,
    filterSource,
    clearFilterByType,
  } = filterChain;

  // Now call useLeadsDashboard
  const {
    transformLeads,
    handleRowClick,
    filterData = undefined,
    setFilterData,
    leadsData,
    isLoading,
    page,
    pageSize,
    setPage,
    setPageSize,
    selectedLeads,
    setSelectedLeads,
    isAssignDialogOpen,
    setIsAssignDialogOpen,
    isReclamationDialogOpen,
    setIsReclamationDialogOpen,
    selectedProjectId,
    selectedAgentId,
    setSelectedAgentId,
    projects,
    isSubmitting,
    deleteConfirmDialogOpen,
    setDeleteConfirmDialogOpen,
    updateConfirmDialogOpen,
    setUpdateConfirmDialogOpen,
    reclamationReason,
    setReclamationReason,
    isNoteDialogOpen,
    setIsNoteDialogOpen,
    selectedLead,
    expandedRowId,
    setExpandedRowId,
    isSubmittingReclamation,
    handleColumnVisibilityChange,
    handleAssignLeads,
    handleClearSelection,
    handleAssignSubmit,
    handleReclamationSubmit,
    handleRevertClosedProjectLeads,
    getCurrentProjectAndAgent,
    handleProjectChange,
    setSelectedProjectId,
    getProjectAgents,
    getUserLogin,
    allColumns,
    onAppendQueryParams,
    columnVisibility,
    search,
    selectLeadPrice,
    setSelectedLeadPrice,
    customPrice,
    setCustomPrice,
    makeFresh,
    setMakeFresh,
    restoreArchived,
    setRestoreArchived,
    isBulkSearchMode,
    bulkSearchResults,
    bulkSearchQuery,
    clearBulkSearch,
    isDynamicFilterMode,
    dynamicFilterResults,
    dynamicFilterQuery,
    clearDynamicFilters,
    handleAssignSubmitTransform,
    selectAllLeadsFromApi,
    sortedData,
    handleSort,
    conditionalRefetch,
    isAgent,
    getFilteredColumns,
    allProjects,
    allStatus,
    areAllDisplayedItemsSelected,
    areClosedLeadsActionsDisabled,
    isTaskDetailModalOpen,
    setIsTaskDetailModalOpen,
    selectedTaskId,
    setSelectedTaskId,
    handleOpenTaskDetail,
    handleCloseTaskDetail,
    leadTableLoading,
    selectedLeadForDetails,
    leadDetailsViewOpen,
    handleCloseLeadDetailsView,
  } = useLeadsDashboard({
    data: externalData,
    loading: externalLoading,
    total: externalTotal,
    page: externalPage,
    pageSize: externalPageSize,
    onPaginationChange: externalOnPaginationChange,
    onPageSizeChange: externalOnPageSizeChange,
    pendingLeadsComponent,
    recentImport,
    tableName,
    projectNameFromDetailsPage,
    externalProjectId,
    filterData: chainFilterData,
    disableApiCall:
      selectedGroupBy.length > 0 ||
      hasCustomFilters ||
      externalData !== undefined ||
      todoFilterScope !== undefined ||
      todoStatistics !== undefined, // Disable old API when grouping OR custom filters are applied OR when external data is provided OR when on todo page
    closeProjectId,
  });

  // Effect to trigger refetch when filters change (for regular mode, not grouped)
  // This ensures API calls are triggered when filters change from project details page
  // Use refs to track previous values and only refetch when filters actually change
  const prevFilterDataRef = useRef<typeof chainFilterData>(chainFilterData);
  const prevStatusRef = useRef<typeof selectedStatus>(selectedStatus);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    // Skip initial mount - React Query will fetch on mount automatically
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevFilterDataRef.current = chainFilterData;
      prevStatusRef.current = selectedStatus;
      return;
    }

    // Check if filters actually changed
    const filterDataChanged = prevFilterDataRef.current !== chainFilterData;
    const statusChanged = prevStatusRef.current !== selectedStatus;

    // Update refs immediately to track current state
    prevFilterDataRef.current = chainFilterData;
    prevStatusRef.current = selectedStatus;

    // Only trigger refetch if filters actually changed
    if (!filterDataChanged && !statusChanged) {
      return;
    }

    // Handle status filter changes - status filters use dynamic filters API
    // The StatusFilter component handles the API call, but we need to ensure it triggers
    if (statusChanged && selectedStatus && !isDynamicFilterMode) {
      // Status filter will be applied by StatusFilter component via applyDynamicFilters
      // We don't need to do anything here as StatusFilter handles it
      return;
    }

    // Handle import filter changes - import filters use regular GET API
    // Only trigger refetch for regular mode (when group by is not selected)
    // and when we're not in bulk search or dynamic filter mode
    if (
      filterDataChanged &&
      selectedGroupBy.length === 0 &&
      !isBulkSearchMode &&
      !isDynamicFilterMode &&
      conditionalRefetch
    ) {
      // CRITICAL: Ensure filter state has propagated to useLeadsDashboard before refetching
      // The effect in useLeadsDashboard will also trigger, but we call conditionalRefetch
      // here to ensure immediate API call on project details page
      const timeoutId = setTimeout(() => {
        conditionalRefetch();
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [
    chainFilterData,
    selectedStatus,
    selectedGroupBy.length,
    isBulkSearchMode,
    isDynamicFilterMode,
    conditionalRefetch,
  ]);

  // Effect to clear dynamic filters when search changes
  // This ensures search results are shown instead of dynamic filter results
  const prevSearchRef = useRef<string | null>(search ?? null);
  const { clearDynamicFilters: clearDynamicFiltersStore, setDynamicFilterMode } =
    useDynamicFiltersStore();
  const isInitialMountSearchRef = useRef(true);

  useEffect(() => {
    // Skip initial mount - only react to search changes after initial render
    if (isInitialMountSearchRef.current) {
      isInitialMountSearchRef.current = false;
      prevSearchRef.current = search ?? null;
      return;
    }

    // Check if search actually changed
    const searchChanged = prevSearchRef.current !== (search ?? null);

    // Update ref
    prevSearchRef.current = search ?? null;

    // If search changed (including when cleared) and we're in dynamic filter mode, clear it
    // This allows regular search results to show instead of dynamic filter results
    if (searchChanged && isDynamicFilterMode) {
      // Clear dynamic filters to show regular search results
      clearDynamicFiltersStore();
      setDynamicFilterMode(false);

      // Also clear from filter chain store to reset filter state
      clearFilterByType('status');
      clearFilterByType('dynamic');
    }
  }, [
    search,
    isDynamicFilterMode,
    clearDynamicFiltersStore,
    setDynamicFilterMode,
    clearFilterByType,
  ]);

  // Get table height class based on table name and filter visibility
  const hasFilterResults =
    isDynamicFilterMode && (filterSource === 'custom' || filterSource === 'table_header');
  const tableHeightClass = useTableHeight(tableName, hasFilterResults);

  // Get dynamic filters store state for pagination
  const {
    page: dynamicPage,
    pageSize: dynamicPageSize,
    total: dynamicTotal,
    refetchDynamicFilters,
    sortBy,
    sortOrder,
  } = useDynamicFiltersStore();

  // Use the grouping and filtering hook
  const groupingAndFiltering = useLeadsGroupingAndFiltering({
    selectedGroupBy,
    buildGroupedLeadsFilters,
    chainHandleGroupByChange,
    chainHandleGroupByArrayChange,
    chainHandleClearGroupByFilter,
    chainFilterData,
    setFilterData,
    handleClearSelection,
    setSelectedLeads,
    selectedLeads,
    setSelectedProjectId,
    setSelectedAgentId,
    selectAllLeadsFromApi,
    leadsData,
    isLoading,
    search: search ?? undefined,
    filterData: chainFilterData ?? undefined,
    conditionalRefetch,
    isBulkSearchMode,
    bulkSearchQuery,
    bulkSearchResults,
    isDynamicFilterMode,
    dynamicFilterQuery,
    buildApiFilters,
    getAllDynamicFilterResults,
    dynamicPageSize,
    refetchDynamicFilters,
    sortBy: sortBy ?? undefined,
    sortOrder: sortOrder ?? undefined,
    tableName,
    todoFilterScope,
    hasManuallyClearedGroupFilter,
    setHasManuallyClearedGroupFilter,
    isAgent,
    isLiveLeadsPage,
    isRecycleLeadsPage,
    openNotification,
  });

  // Extract values from grouping and filtering hook
  const {
    selectedGroupDetails,
    groupLeadsData,
    setGroupLeadsData,
    groupLeadsLoading,
    setGroupLeadsLoading,
    clearGroupedSelections,
    groupedLeadsSortBy,
    groupedLeadsSortOrder,
    groupedLeadsTransformLeads,
    liftedGroupedLeadsData,
    setLiftedGroupedLeadsData,
    liftedGroupedLeadsLoading,
    setLiftedGroupedLeadsLoading,
    isMultiLevelGroupingApplied,
    selectAllGroupedLeadsSignal,
    groupedLeadsFilters,
    handleGroupByChange,
    handleClearGroupByFilter,
    handleMultiLevelGrouping,
    handleGroupByArrayChangeWithReset,
    handleGroupedLeadSelectionChange,
    selectAllGroupedLeads,
    handleGroupedLeadsSortChange,
    handleGroupedLeadsSelectionForAssignment,
    handleGroupClick,
    clearGroupDetails,
    handleClearSelectionWrapper,
    handleDynamicFilterPaginationChange,
    handleDynamicFilterPageSizeChange,
    handleDynamicFilterPaginationWrapper,
    handleSelectAllSmart,
  } = groupingAndFiltering;

  // API mutations
  const bulkDeleteMutationLeads = useBulkDeleteLeads();
  const bulkUpdateMutationLeads = useBulkUpdateLeads();
  const permanentDeleteLeads = usePermanentDeleteLead();
  const restoreLeadsMutation = useRestoreLeads();
  const closeProjectMutation = useCloseProjectWithRefresh();

  // Dialog and UI states
  const [isColumnOrderDialogOpen, setIsColumnOrderDialogOpen] = useState(false);
  const [archiveConfirmDialogOpen, setArchiveConfirmDialogOpen] = useState(false);
  const [restoreConfirmDialogOpen, setRestoreConfirmDialogOpen] = useState(false);
  const [isCloseProjectDialogOpen, setIsCloseProjectDialogOpen] = useState(false);
  const [closureReason, setClosureReason] = useState('project_completed');
  const [closeProjectCurrentStatus, setCloseProjectCurrentStatus] = useState('');
  const [closeProjectNotes, setCloseProjectNotes] = useState('');
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [isBulkSearchEditModalOpen, setIsBulkSearchEditModalOpen] = useState(false);
  const customizeButtonRef = useRef<HTMLButtonElement>(null);

  // Use dashboard actions hook
  const {
    isArchivedPage,
    total,
    handleRowClickWrapper,
    handleCheckLeads,
    handleMakeFreshLeads,
    handleBulkUpdate,
    handleEditBulkSearch,
    handleCloseProjectSubmit,
  } = useLeadsDashboardActions({
    pageTitle,
    tableName,
    sharedDataTable,
    pendingLeadsComponent,
    projectNameFromDetailsPage,
    externalProjectId,
    getCurrentPosition,
    totalProjects,
    goToPreviousProject,
    goToNextProject,
    setIsProjectOpen,
    todoFilterScope,
    todoStatistics,
    pageInfoSubtitlePrefix,
    leadsData,
    externalTotal,
    externalLoading,
    isLoading,
    // selectedLeads and setSelectedLeads removed - use store directly via useSelectedItemsStore
    allColumns,
    isBulkSearchMode,
    bulkSearchResults,
    isDynamicFilterMode,
    selectedGroupBy,
    liftedGroupedLeadsData,
    selectedGroupDetails,
    groupLeadsData,
    clearDynamicFilters,
    clearFilterByType,
    bulkUpdateMutationLeads,
    closeProjectMutation,
    conditionalRefetch,
    clearSelectedItems,
    setUpdateConfirmDialogOpen,
    setIsCloseProjectDialogOpen,
    setIsBulkUpdateDialogOpen,
    setIsBulkSearchEditModalOpen,
    closureReason,
    setClosureReason,
    closeProjectCurrentStatus,
    setCloseProjectCurrentStatus,
    closeProjectNotes,
    setCloseProjectNotes,
    handleRowClick,
  });

  // Store state in filterChainStore (handlers now come from FilterContext)
  const {
    setGroupBy,
    setSelectedGroupDetails,
    setGroupedLeadsSortBy,
    setGroupedLeadsSortOrder,
    setIsMultiLevelGroupingApplied,
    setFilterData: setStoreFilterData,
    setSelectedStatus: setStoreSelectedStatus,
  } = useFilterChainStore();

  // Store filter data and selected status
  useEffect(() => {
    setStoreFilterData(filterData);
  }, [filterData, setStoreFilterData]);

  useEffect(() => {
    setStoreSelectedStatus(selectedStatus);
  }, [selectedStatus, setStoreSelectedStatus]);

  // Store groupBy array
  // Use refs to prevent infinite loops by tracking sync state
  const lastSyncedSelectedGroupByRef = useRef<string>('');
  const isSyncingRef = useRef<boolean>(false);

  useEffect(() => {
    // Skip if we're currently syncing to prevent circular updates
    if (isSyncingRef.current) {
      return;
    }

    const selectedGroupByArray = selectedGroupBy || [];
    const selectedGroupByStr = JSON.stringify(selectedGroupByArray);

    // Only sync if selectedGroupBy actually changed (not just a re-render with same values)
    if (selectedGroupByStr !== lastSyncedSelectedGroupByRef.current) {
      isSyncingRef.current = true;
      lastSyncedSelectedGroupByRef.current = selectedGroupByStr;
      setGroupBy(selectedGroupByArray);
      // Reset sync flag after state update completes
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 0);
    }
  }, [selectedGroupBy, setGroupBy]);

  // Store grouping state
  useEffect(() => {
    setSelectedGroupDetails(selectedGroupDetails || null);
  }, [selectedGroupDetails, setSelectedGroupDetails]);

  useEffect(() => {
    setGroupedLeadsSortBy(groupedLeadsSortBy);
  }, [groupedLeadsSortBy, setGroupedLeadsSortBy]);

  useEffect(() => {
    setGroupedLeadsSortOrder(groupedLeadsSortOrder);
  }, [groupedLeadsSortOrder, setGroupedLeadsSortOrder]);

  useEffect(() => {
    setIsMultiLevelGroupingApplied(isMultiLevelGroupingApplied);
  }, [isMultiLevelGroupingApplied, setIsMultiLevelGroupingApplied]);

  const value: LeadsDashboardContextValue = {
    // Props
    pageTitle,
    tableName,
    sharedDataTable,
    pendingLeadsComponent,
    deleteButton,
    extraActions,
    filterBtnComponent,
    hideGroupBy,
    hideProjectOption,
    externalProjectId,
    closeProjectId,
    projectData,
    setIsProjectOpen,

    // State
    selectedLeads,
    isLoading,
    leadsData,
    page,
    pageSize,
    externalPage,
    externalPageSize,
    externalTotal,
    externalLoading,
    externalData,

    // Filter state
    selectedStatus,
    selectedGroupBy,
    filterData,
    isDynamicFilterMode,
    isBulkSearchMode,
    bulkSearchResults,
    bulkSearchQuery,
    dynamicFilterResults,
    dynamicTotal,
    filterSource,
    hasFilterData,
    hasSelectedStatus,
    hasSelectedGroupBy,
    hasDynamicFilters,
    hasUserAddedGroupBy,

    // Grouping state
    selectedGroupDetails,
    groupLeadsData,
    groupLeadsLoading,
    liftedGroupedLeadsData,
    liftedGroupedLeadsLoading,
    groupedLeadsSortBy,
    groupedLeadsSortOrder,
    groupedLeadsTransformLeads,
    isMultiLevelGroupingApplied,
    selectAllGroupedLeadsSignal,
    clearGroupedSelections,
    groupedLeadsFilters,

    // Dashboard state
    transformLeads,
    isAssignDialogOpen,
    isReclamationDialogOpen,
    selectedProjectId,
    selectedAgentId,
    projects,
    isSubmitting,
    deleteConfirmDialogOpen,
    updateConfirmDialogOpen,
    reclamationReason,
    isNoteDialogOpen,
    selectedLead,
    expandedRowId,
    isSubmittingReclamation,
    allColumns,
    columnVisibility,
    search,
    selectLeadPrice,
    customPrice,
    makeFresh,
    restoreArchived,
    setRestoreArchived,
    sortedData,
    isAgent,
    allProjects: allProjects as any,
    allStatus,

    // Actions state
    isArchivedPage,
    total,

    // Dialog states
    isColumnOrderDialogOpen,
    archiveConfirmDialogOpen,
    restoreConfirmDialogOpen,
    isCloseProjectDialogOpen,
    closureReason,
    closeProjectCurrentStatus,
    closeProjectNotes,
    isBulkUpdateDialogOpen,
    isBulkSearchEditModalOpen,
    customizeButtonRef,

    // Dynamic pagination
    dynamicPage,
    dynamicPageSize,

    // Table
    tableHeightClass,

    // Mutations
    bulkDeleteMutationLeads,
    bulkUpdateMutationLeads,
    permanentDeleteLeads,
    restoreLeadsMutation,
    closeProjectMutation,

    // Setters
    setSelectedLeads,
    setPage,
    setPageSize,
    setFilterData,
    setIsAssignDialogOpen,
    setIsReclamationDialogOpen,
    setSelectedAgentId,
    setDeleteConfirmDialogOpen,
    setUpdateConfirmDialogOpen,
    setReclamationReason,
    setIsNoteDialogOpen,
    setExpandedRowId,
    setSelectedLeadPrice,
    setSelectedProjectId,
    setCustomPrice,
    setMakeFresh,
    setGroupLeadsData,
    setGroupLeadsLoading,
    setLiftedGroupedLeadsData,
    setLiftedGroupedLeadsLoading,
    setIsColumnOrderDialogOpen,
    setArchiveConfirmDialogOpen,
    setRestoreConfirmDialogOpen,
    setIsCloseProjectDialogOpen,
    setClosureReason,
    setCloseProjectCurrentStatus,
    setCloseProjectNotes,
    setIsBulkUpdateDialogOpen,
    setIsBulkSearchEditModalOpen,

    // Handlers
    handleRowClick,
    handleRowClickWrapper,
    handleColumnVisibilityChange,
    handleAssignLeads,
    handleClearSelection,
    handleClearSelectionWrapper,
    handleAssignSubmit,
    handleReclamationSubmit,
    handleRevertClosedProjectLeads,
    getCurrentProjectAndAgent,
    handleProjectChange,
    getProjectAgents,
    getUserLogin,
    onAppendQueryParams,
    handleAssignSubmitTransform,
    selectAllLeadsFromApi,
    handleSort,
    conditionalRefetch,
    getFilteredColumns,
    areAllDisplayedItemsSelected,
    areClosedLeadsActionsDisabled,

    // Filter handlers
    handleStatusChange,
    handleFilterDataChange,
    handleClearImportFilter,
    handleClearStatusFilter,
    handleClearDynamicFilters,
    clearBulkSearch,
    clearDynamicFilters,
    clearFilterByType,
    buildApiFilters,

    // Grouping handlers
    handleGroupByChange,
    handleGroupByArrayChangeWithReset,
    handleClearGroupByFilter,
    handleMultiLevelGrouping,
    handleGroupedLeadSelectionChange,
    selectAllGroupedLeads,
    handleGroupedLeadsSortChange,
    handleGroupedLeadsSelectionForAssignment,
    handleGroupClick,
    clearGroupDetails,
    handleDynamicFilterPaginationChange,
    handleDynamicFilterPageSizeChange,
    handleDynamicFilterPaginationWrapper,
    handleSelectAllSmart,

    // Action handlers
    handleCheckLeads,
    handleMakeFreshLeads,
    handleBulkUpdate,
    handleEditBulkSearch,
    handleCloseProjectSubmit,

    // Utility
    clearSelectedItems,
    openNotification,

    // Task Detail Modal
    isTaskDetailModalOpen,
    setIsTaskDetailModalOpen,
    selectedTaskId,
    setSelectedTaskId,
    handleOpenTaskDetail,
    handleCloseTaskDetail,
    leadTableLoading,
    selectedLeadForDetails,
    leadDetailsViewOpen,
    handleCloseLeadDetailsView,
  };

  const filterContextValue = React.useMemo(
    () => ({
      buildApiFilters,
      buildGroupedLeadsFilters,
      onGroupByArrayChange: handleGroupByArrayChangeWithReset,
      handleFilterDataChange,
      handleStatusChange,
      handleGroupByChange,
      handleGroupByArrayChange: chainHandleGroupByArrayChange,
      handleGroupByArrayChangeWithReset,
      handleClearImportFilter,
      handleClearStatusFilter,
      handleClearGroupByFilter,
      handleClearDynamicFilters,
      handleGroupClick,
      handleGroupedLeadsSortChange,
      handleMultiLevelGrouping,
    }),
    [
      buildApiFilters,
      buildGroupedLeadsFilters,
      handleGroupByArrayChangeWithReset,
      handleFilterDataChange,
      handleStatusChange,
      handleGroupByChange,
      chainHandleGroupByArrayChange,
      handleClearImportFilter,
      handleClearStatusFilter,
      handleClearGroupByFilter,
      handleClearDynamicFilters,
      handleGroupClick,
      handleGroupedLeadsSortChange,
      handleMultiLevelGrouping,
    ]
  );

  return (
    <LeadsDashboardContext.Provider value={value}>
      <FilterProvider value={filterContextValue}>
        {children}
      </FilterProvider>
    </LeadsDashboardContext.Provider>
  );
};
