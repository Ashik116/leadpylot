/**
 * Custom hook to manage grouping and filtering logic for leads dashboard
 * Handles group state, multi-level grouping, selection, sorting, and filter effects
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useFilterAwareLeadsNavigationStore } from '@/stores/navigationStores';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { TTodoFilter } from '../../todo/_components/TodoDashboard';

interface UseLeadsGroupingAndFilteringProps {
  // Filter chain values
  selectedGroupBy: string[];
  buildGroupedLeadsFilters: () => Array<{ field: string; operator: string; value: any }>;
  chainHandleGroupByChange: (groupBy: string | undefined) => void;
  chainHandleGroupByArrayChange: (groupByArray: string[]) => void;
  chainHandleClearGroupByFilter: () => void;
  chainFilterData?: any;
  setFilterData?: (data: any) => void;

  // Selection handlers
  handleClearSelection: () => void;
  setSelectedLeads: (leads: string[]) => void;
  selectedLeads: string[];
  setSelectedProjectId: (id: string) => void;
  setSelectedAgentId: (id: string) => void;
  selectAllLeadsFromApi: () => Promise<void>;

  // Data and loading states
  leadsData: any;
  isLoading: boolean;
  search?: string;
  filterData?: any;

  // Conditional refetch
  conditionalRefetch?: () => void;

  // Bulk search and dynamic filters
  isBulkSearchMode: boolean;
  bulkSearchQuery: string[];
  bulkSearchResults: any[];
  isDynamicFilterMode: boolean;
  dynamicFilterQuery: any[];
  buildApiFilters: () => any[];
  getAllDynamicFilterResults: any;

  // Dynamic filters store
  dynamicPageSize: number;
  refetchDynamicFilters?: (page: number, pageSize: number) => Promise<void>;
  sortBy?: string;
  sortOrder?: string;

  // Table configuration
  tableName: string;
  todoFilterScope?: TTodoFilter;
  hasManuallyClearedGroupFilter: boolean;
  setHasManuallyClearedGroupFilter: (value: boolean) => void;

  // Role-based filtering
  isAgent: boolean;
  isLiveLeadsPage: boolean;
  isRecycleLeadsPage: boolean;

  // Notification hook
  openNotification: any;
}

interface UseLeadsGroupingAndFilteringReturn {
  // Group state
  selectedGroupDetails: { field: string; groupId: string; groupName: string } | null;
  groupLeadsData: any;
  groupLeadsLoading: boolean;
  clearGroupedSelections: number;
  groupedLeadsSortBy: string;
  groupedLeadsSortOrder: 'asc' | 'desc';
  groupedLeadsTransformLeads: boolean;
  liftedGroupedLeadsData: any;
  liftedGroupedLeadsLoading: boolean;
  isMultiLevelGroupingApplied: boolean;
  selectAllGroupedLeadsSignal: number;

  // Setters
  setSelectedGroupDetails: (
    details: { field: string; groupId: string; groupName: string } | null
  ) => void;
  setGroupLeadsData: (data: any) => void;
  setGroupLeadsLoading: (loading: boolean) => void;
  setClearGroupedSelections: React.Dispatch<React.SetStateAction<number>>;
  setGroupedLeadsSortBy: (sortBy: string) => void;
  setGroupedLeadsSortOrder: (sortOrder: 'asc' | 'desc') => void;
  setGroupedLeadsTransformLeads: (value: boolean) => void;
  setLiftedGroupedLeadsData: (data: any) => void;
  setLiftedGroupedLeadsLoading: (loading: boolean) => void;
  setIsMultiLevelGroupingApplied: (value: boolean) => void;

  // Computed values
  groupedLeadsFilters: Array<{ field: string; operator: string; value: any }>;

  // Handlers
  handleGroupByChange: (groupBy: string | undefined) => void;
  handleClearGroupByFilter: () => void;
  handleMultiLevelGrouping: () => void;
  handleGroupByArrayChangeWithReset: (groupByArray: string[]) => void;
  handleGroupedLeadSelectionChange: (selectedGroupedLeads: any[]) => void;
  selectAllGroupedLeads: () => Promise<void>;
  handleGroupedLeadsSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  handleGroupedLeadsSelectionForAssignment: (selectedGroupedLeads: any[]) => void;
  handleGroupClick: (field: string, groupId: string, groupName: string) => void;
  clearGroupDetails: () => void;
  handleClearSelectionWrapper: () => void;

  // Dynamic filter pagination handlers
  handleDynamicFilterPaginationChange: (newPage: number) => Promise<void>;
  handleDynamicFilterPageSizeChange: (newPageSize: number) => Promise<void>;
  handleDynamicFilterPaginationWrapper: (page: number, newPageSize?: number) => Promise<void>;

  // Smart select all handler
  handleSelectAllSmart: () => Promise<void>;
}

type LeadAssignmentInfo = {
  projectId: string;
  agentId: string;
  isAssigned: boolean;
};

const getLeadAssignmentInfo = (lead: any): LeadAssignmentInfo => {
  const firstProject = Array.isArray(lead?.project) ? lead.project[0] : lead?.project;
  const projectId =
    firstProject?._id ||
    lead?.project_id?._id ||
    (typeof lead?.project_id === 'string' ? lead.project_id : '') ||
    '';
  const agentId =
    firstProject?.agent?._id ||
    lead?.assigned_agent?._id ||
    lead?.user_id?._id ||
    lead?.agent_id?._id ||
    (typeof lead?.user_id === 'string' ? lead.user_id : '') ||
    (typeof lead?.agent_id === 'string' ? lead.agent_id : '') ||
    '';

  return {
    projectId,
    agentId,
    isAssigned: lead?.use_status === 'in_use' || Boolean(projectId) || Boolean(agentId),
  };
};

export const useLeadsGroupingAndFiltering = (
  props: UseLeadsGroupingAndFilteringProps
): UseLeadsGroupingAndFilteringReturn => {
  const {
    selectedGroupBy,
    buildGroupedLeadsFilters,
    chainHandleGroupByChange,
    chainHandleGroupByArrayChange,
    chainHandleClearGroupByFilter,
    chainFilterData,
    setFilterData,
    handleClearSelection,
    setSelectedProjectId,
    setSelectedAgentId,
    selectAllLeadsFromApi,
    filterData,
    conditionalRefetch,
    isBulkSearchMode,
    bulkSearchQuery,
    bulkSearchResults,
    isDynamicFilterMode,
    dynamicFilterQuery,
    getAllDynamicFilterResults,
    dynamicPageSize,
    refetchDynamicFilters,
    sortBy,
    sortOrder,
    tableName,
    todoFilterScope,
    setHasManuallyClearedGroupFilter,
    isAgent,
    isLiveLeadsPage,
    isRecycleLeadsPage,
    openNotification,
  } = props;

  const pathname = usePathname();
  const { clearSelectedItems, setSelectedItems, selectedItems, currentPage } = useSelectedItemsStore();
  const selectedItemsForCurrentTable = useMemo(
    () => (currentPage === (tableName as any) ? selectedItems : []),
    [currentPage, selectedItems, tableName]
  );
  const derivedGroupedAssignmentState = useMemo(() => {
    if (selectedGroupBy.length === 0 || !selectedItemsForCurrentTable.length) {
      return { isTransfer: false, projectId: '', agentId: '' };
    }

    const firstAssignedLead = selectedItemsForCurrentTable
      .map((lead: any) => getLeadAssignmentInfo(lead))
      .find((assignmentInfo) => assignmentInfo.isAssigned);

    return {
      isTransfer: Boolean(firstAssignedLead),
      projectId: firstAssignedLead?.projectId || '',
      agentId: firstAssignedLead?.agentId || '',
    };
  }, [selectedGroupBy.length, selectedItemsForCurrentTable]);

  // ==================== State Management ====================
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<{
    field: string;
    groupId: string;
    groupName: string;
  } | null>(null);
  const [groupLeadsData, setGroupLeadsData] = useState<any>(null);
  const [groupLeadsLoading, setGroupLeadsLoading] = useState(false);
  const [clearGroupedSelections, setClearGroupedSelections] = useState(0);
  const [groupedLeadsSortBy, setGroupedLeadsSortBy] = useState('count');
  const [groupedLeadsSortOrder, setGroupedLeadsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [groupedLeadsTransformLeads, setGroupedLeadsTransformLeads] = useState(false);
  const [liftedGroupedLeadsData, setLiftedGroupedLeadsData] = useState<any>(null);
  const [liftedGroupedLeadsLoading, setLiftedGroupedLeadsLoading] = useState<boolean>(false);
  const [isMultiLevelGroupingApplied, setIsMultiLevelGroupingApplied] = useState(false);
  const [selectAllGroupedLeadsSignal, setSelectAllGroupedLeadsSignal] = useState(0);

  // ==================== Computed Values ====================

  /**
   * Build grouped leads filters with Todo-specific defaults and bulk search integration
   */
  const groupedLeadsFilters = useMemo(() => {
    const baseFilters: Array<{ field: string; operator: string; value: any }> =
      buildGroupedLeadsFilters();

    // When on Todo dashboard in grouped mode, apply default filters based on scope
    if (tableName === 'todo_leads' && selectedGroupBy?.length > 0) {
      const enforced: Array<{ field: string; operator: string; value: any }> = [
        { field: 'has_todo', operator: 'equals', value: true },
      ];
      if (todoFilterScope?.filter === 'assigned_to_me') {
        enforced.push({ field: 'has_extra_todo', operator: 'equals', value: true });
      } else if (todoFilterScope?.filter === 'assigned_by_me') {
        enforced.push({ field: 'has_assigned_todo', operator: 'equals', value: true });
      } else if (todoFilterScope?.pendingTodos) {
        enforced.push({ field: 'pending_todos', operator: 'equals', value: true });
      } else if (todoFilterScope?.completedTodos) {
        enforced.push({ field: 'done_todos', operator: 'equals', value: true });
      }

      // Merge: remove any duplicates of enforced fields from base, then append enforced
      const enforcedFields = new Set(enforced?.map((f) => f?.field));
      const merged = baseFilters
        ?.filter((f: any) => !enforcedFields?.has(f?.field))
        ?.concat(enforced);

      // Add bulk search partner IDs filter if we're in bulk search mode
      if (isBulkSearchMode && bulkSearchQuery && bulkSearchQuery?.length > 0) {
        bulkSearchQuery?.forEach((partnerId: string) => {
          merged.push({
            field: 'lead_source_no',
            operator: 'equals',
            value: partnerId,
          });
        });
      }

      return merged;
    }

    // Add bulk search partner IDs filter if we're in bulk search mode and not in Todo dashboard
    if (isBulkSearchMode && bulkSearchQuery && bulkSearchQuery?.length > 0) {
      bulkSearchQuery?.forEach((partnerId: string) => {
        baseFilters.push({
          field: 'lead_source_no',
          operator: 'equals',
          value: partnerId,
        });
      });
    }

    return baseFilters;
  }, [
    buildGroupedLeadsFilters,
    tableName,
    selectedGroupBy.length,
    todoFilterScope,
    isBulkSearchMode,
    bulkSearchQuery,
  ]);

  // ==================== Handlers ====================

  /**
   * Enhanced clear selection handler that clears both regular and grouped selections
   */
  const handleClearSelectionWrapper = useCallback(() => {
    handleClearSelection();
    clearSelectedItems();
    setClearGroupedSelections((prev) => prev + 1);
    setGroupedLeadsTransformLeads(false);
  }, [handleClearSelection, clearSelectedItems]);

  /**
   * Handle group by change with selection clearing and refetch
   */
  const handleGroupByChange = useCallback(
    (groupBy: string | undefined) => {
      handleClearSelectionWrapper();
      chainHandleGroupByChange(groupBy);
      if (conditionalRefetch) {
        conditionalRefetch();
      }
    },
    [handleClearSelectionWrapper, chainHandleGroupByChange, conditionalRefetch]
  );

  /**
   * Clear group by filter with manual flag and state reset
   */
  const handleClearGroupByFilter = useCallback(() => {
    handleClearSelectionWrapper();
    setHasManuallyClearedGroupFilter(true);
    setIsMultiLevelGroupingApplied(false);
    chainHandleClearGroupByFilter();
    if (conditionalRefetch) {
      conditionalRefetch();
    }
  }, [
    handleClearSelectionWrapper,
    setHasManuallyClearedGroupFilter,
    chainHandleClearGroupByFilter,
    conditionalRefetch,
  ]);

  /**
   * Apply multi-level grouping (project > agent > updatedAt)
   */
  const handleMultiLevelGrouping = useCallback(() => {
    if (chainHandleGroupByArrayChange) {
      chainHandleGroupByArrayChange(['project', 'agent', 'updatedAt']);
      setIsMultiLevelGroupingApplied(true);
    }
  }, [chainHandleGroupByArrayChange]);

  /**
   * Handle group by array change with multi-level grouping state reset
   * Note: Grouped leads API calls are handled automatically by React Query
   * when groupedLeadsParams change (which includes filters via buildGroupedLeadsFilters)
   */
  const handleGroupByArrayChangeWithReset = useCallback(
    (groupByArray: string[]) => {
      handleClearSelectionWrapper();
      chainHandleGroupByArrayChange(groupByArray);
      setIsMultiLevelGroupingApplied(false);
      // Grouped leads API will automatically refetch when groupedLeadsParams change
      // because buildGroupedLeadsFilters is included in the params and will change
    },
    [handleClearSelectionWrapper, chainHandleGroupByArrayChange]
  );

  /**
   * Handle grouped lead selection changes
   */
  const handleGroupedLeadSelectionChange = useCallback(
    (selectedGroupedLeads: any[]) => {
      // Update store directly (single source of truth)
      setSelectedItems(selectedGroupedLeads, 'leads');
    },
    [setSelectedItems]
  );

  /**
   * Select all grouped leads via signal
   */
  const selectAllGroupedLeads = useCallback(async () => {
    setSelectAllGroupedLeadsSignal((prev) => prev + 1);
  }, []);

  /**
   * Handle sorting change for grouped leads
   */
  const handleGroupedLeadsSortChange = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    setGroupedLeadsSortBy(sortBy);
    setGroupedLeadsSortOrder(sortOrder);
  }, []);

  /**
   * Handle grouped leads selection for assignment logic
   * Determines if Transfer or Assign should be used
   */
  const handleGroupedLeadsSelectionForAssignment = useCallback(
    (selectedGroupedLeads: any[]) => {
      const assignmentInfos = (selectedGroupedLeads || []).map((lead: any) => getLeadAssignmentInfo(lead));
      const firstAssignedLead = assignmentInfos.find((assignmentInfo) => assignmentInfo.isAssigned);
      const hasInUseLead = assignmentInfos.some((assignmentInfo) => assignmentInfo.isAssigned);

      const resolvedProjectId = firstAssignedLead ? firstAssignedLead.projectId : '';
      const resolvedAgentId = firstAssignedLead ? firstAssignedLead.agentId : '';

      if (resolvedProjectId) {
        setSelectedProjectId(resolvedProjectId);
      }

      if (resolvedAgentId) {
        setSelectedAgentId(resolvedAgentId);
      }

      setGroupedLeadsTransformLeads(hasInUseLead);
    },
    [setSelectedProjectId, setSelectedAgentId]
  );

  /**
   * Handle group click for detailed view
   */
  const handleGroupClick = useCallback((field: string, groupId: string, groupName: string) => {
    setSelectedGroupDetails({ field, groupId, groupName });
  }, []);

  /**
   * Clear group details and return to grouped view
   */
  const clearGroupDetails = useCallback(() => {
    handleClearSelectionWrapper();
    setSelectedGroupDetails(null);
  }, [handleClearSelectionWrapper]);

  /**
   * Handle dynamic filter pagination change
   */
  const handleDynamicFilterPaginationChange = useCallback(
    async (newPage: number) => {
      if (refetchDynamicFilters) {
        await refetchDynamicFilters(newPage, dynamicPageSize);
      }
    },
    [refetchDynamicFilters, dynamicPageSize]
  );

  /**
   * Handle dynamic filter page size change
   */
  const handleDynamicFilterPageSizeChange = useCallback(
    async (newPageSize: number) => {
      if (refetchDynamicFilters) {
        await refetchDynamicFilters(1, newPageSize);
      }
    },
    [refetchDynamicFilters]
  );

  /**
   * Wrapper function for CommonActionBar pagination that handles both single and double parameter calls
   */
  const handleDynamicFilterPaginationWrapper = useCallback(
    async (page: number, newPageSize?: number) => {
      if (newPageSize && newPageSize !== dynamicPageSize) {
        await handleDynamicFilterPageSizeChange(newPageSize);
      } else {
        await handleDynamicFilterPaginationChange(page);
      }
    },
    [handleDynamicFilterPaginationChange, handleDynamicFilterPageSizeChange, dynamicPageSize]
  );

  /**
   * Smart select all function that selects whatever data is currently displayed in the table
   */
  const handleSelectAllSmart = useCallback(async () => {
    try {
      // Handle dynamic filter mode - fetch ALL dynamic filter results via POST API
      if (isDynamicFilterMode && dynamicFilterQuery && dynamicFilterQuery?.length > 0) {
        const allDynamicResults = await getAllDynamicFilterResults.mutateAsync({
          filters: dynamicFilterQuery,
          sortBy: sortBy || undefined,
          sortOrder: sortOrder || undefined,
        });

        if (allDynamicResults?.data && allDynamicResults?.data?.length > 0) {
          // Update store directly (single source of truth)
          setSelectedItems(allDynamicResults?.data, 'leads');
          openNotification({
            type: 'success',
            massage: `Selected all ${allDynamicResults?.data?.length} filtered leads`,
          });
        }
        return;
      }

      // Handle bulk search mode directly
      if (isBulkSearchMode && bulkSearchResults && bulkSearchResults?.length > 0) {
        // Update store directly (single source of truth)
        setSelectedItems(bulkSearchResults, 'leads');
        return;
      }

      // For regular mode, use the API to get all leads with current filters
      await selectAllLeadsFromApi();
    } catch (error) {
      openNotification({
        type: 'danger',
        massage: `Failed to select all leads: ${error instanceof Error ? error?.message : 'Unknown error'}`,
      });
    }
  }, [
    isDynamicFilterMode,
    dynamicFilterQuery,
    getAllDynamicFilterResults,
    sortBy,
    sortOrder,
    setSelectedItems,
    openNotification,
    isBulkSearchMode,
    bulkSearchResults,
    selectAllLeadsFromApi,
  ]);

  // ==================== Side Effects ====================

  /**
   * Sync filter data from filter chain to useLeadsDashboard
   * This ensures filter changes propagate and trigger API refetches
   */
  useEffect(() => {
    if (setFilterData && chainFilterData !== filterData) {
      setFilterData(chainFilterData);
      // Trigger refetch when filter data changes (for regular mode)
      if (conditionalRefetch && selectedGroupBy.length === 0) {
        conditionalRefetch();
      }
    }
  }, [chainFilterData, filterData, setFilterData, conditionalRefetch, selectedGroupBy.length]);

  /**
   * Show notification to Agent users when automatic filters are applied
   */
  useEffect(() => {
    if (isAgent && (isLiveLeadsPage || isRecycleLeadsPage) && selectedGroupBy?.length > 0) {
      const hasShownNotification = sessionStorage.getItem('agent-filters-notification');
      if (!hasShownNotification) {
        sessionStorage.setItem('agent-filters-notification', 'true');
      }
    }

    return () => {
      if (isAgent && (isLiveLeadsPage || isRecycleLeadsPage)) {
        sessionStorage.setItem('agent-filters-notification-clear', 'true');
      }
    };
  }, [isAgent, isLiveLeadsPage, isRecycleLeadsPage, selectedGroupBy?.length]);

  /**
   * Clear notification flag when navigating to different pages
   */
  useEffect(() => {
    const shouldClear = sessionStorage.getItem('agent-filters-notification-clear');
    if (shouldClear === 'true') {
      sessionStorage.removeItem('agent-filters-notification');
      sessionStorage.removeItem('agent-filters-notification-clear');
    }
  }, [pathname]);

  // ==================== Side Effects (continued) ====================

  /**
   * Effect to update navigation store for bulk search mode only
   * Regular leads data is handled by useLeadsDashboard hook
   */
  useEffect(() => {
    // Don't update if we're in grouped mode (handled separately)
    if (selectedGroupBy.length > 0) {
      return;
    }

    // Don't update if we're in dynamic filter mode (handled by filter components)
    if (isDynamicFilterMode) {
      return;
    }

    // Only handle bulk search mode here - useLeadsDashboard handles regular leads data
    if (isBulkSearchMode && bulkSearchQuery && bulkSearchQuery.length > 0 && bulkSearchResults) {
      const setFilteredItems = useFilterAwareLeadsNavigationStore.getState().setFilteredItems;
      const setFilterState = useFilterAwareLeadsNavigationStore.getState().setFilterState;

      // For bulk search, we have all results already, so use them directly
      // Since bulk search returns all matching results, we can calculate pagination meta
      const total = bulkSearchResults.length;
      const limit = 50; // Default page size
      const paginationMeta = {
        page: 1,
        limit: limit,
        total: total,
        pages: Math.ceil(total / limit),
      };

      setFilteredItems(bulkSearchResults, paginationMeta);
      setFilterState({
        isBulkSearchMode: true,
        bulkSearch: bulkSearchQuery,
        paginationMeta,
      });
    }
  }, [
    selectedGroupBy?.length,
    isBulkSearchMode,
    bulkSearchQuery,
    bulkSearchResults,
    isDynamicFilterMode,
  ]);

  /**
   * Effect to clear navigation store when grouped mode is disabled
   */
  useEffect(() => {
    if (selectedGroupBy?.length === 0) {
      const clearFilterState = useFilterAwareLeadsNavigationStore.getState().clearFilterState;
      clearFilterState();
    }
  }, [selectedGroupBy?.length]);

  /**
   * Check if current group by array matches Multi Level Grouping and reset state if not
   */
  useEffect(() => {
    const expectedMultiLevelGrouping = ['project', 'agent', 'updatedAt'];
    const currentGroupBy = selectedGroupBy || [];

    const isExactMatch =
      currentGroupBy?.length === expectedMultiLevelGrouping?.length &&
      currentGroupBy?.every((item, index) => item === expectedMultiLevelGrouping?.[index]);

    if (!isExactMatch && isMultiLevelGroupingApplied) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setIsMultiLevelGroupingApplied(false);
      }, 0);
    }
  }, [selectedGroupBy, isMultiLevelGroupingApplied]);

  /**
   * Reset states when pathname changes (user navigates to different page)
   */
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      setHasManuallyClearedGroupFilter(false);
      setGroupedLeadsTransformLeads(false);
    }, 0);
  }, [pathname, setHasManuallyClearedGroupFilter]);

  // ==================== Return Values ====================
  return {
    // State
    selectedGroupDetails,
    groupLeadsData,
    groupLeadsLoading,
    clearGroupedSelections,
    groupedLeadsSortBy,
    groupedLeadsSortOrder,
    groupedLeadsTransformLeads:
      selectedGroupBy.length > 0 ? derivedGroupedAssignmentState.isTransfer : groupedLeadsTransformLeads,
    liftedGroupedLeadsData,
    liftedGroupedLeadsLoading,
    isMultiLevelGroupingApplied,
    selectAllGroupedLeadsSignal,

    // Setters
    setSelectedGroupDetails,
    setGroupLeadsData,
    setGroupLeadsLoading,
    setClearGroupedSelections,
    setGroupedLeadsSortBy,
    setGroupedLeadsSortOrder,
    setGroupedLeadsTransformLeads,
    setLiftedGroupedLeadsData,
    setLiftedGroupedLeadsLoading,
    setIsMultiLevelGroupingApplied,

    // Computed values
    groupedLeadsFilters,

    // Handlers
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

    // Dynamic filter pagination handlers
    handleDynamicFilterPaginationChange,
    handleDynamicFilterPageSizeChange,
    handleDynamicFilterPaginationWrapper,

    // Smart select all handler
    handleSelectAllSmart,
  };
};
