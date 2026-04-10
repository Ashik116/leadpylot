'use client';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import ScrollBar from '@/components/ui/ScrollBar';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
// OLD: import GroupedLeadsTable from '../GroupedLeadsTable'; // COMMENTED OUT - Using new system
import ExpandRowLeadViewDetails from '../ExpandRowLeadViewDetails';
import ScheduleOffersTable from '../ScheduleOffersTable';
import { getPaginationOptions } from '@/utils/paginationNumber';
import { useLeadsDashboardContext } from '../../context/LeadsDashboardContext';
import AssignOrTransferLeadsDialog from '../AssignOrTransferLeadsDialog';
import ReclamationDialog from '../ReclamationDialog';
import CloseProjectDialog from '../CloseProjectDialog';
import '../scheduled-flow.css';
import DataTableOptimized from '@/components/shared/DataTableOptimizedVersion/DataTableOptimized';
import {
  useClosedLeads,
  useGroupedSummary,
  useLeads,
  useMetadataOptions,
} from '@/services/hooks/useLeads';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import type { DomainFilter } from '@/stores/filterStateStore';
import type {
  ColumnFilterValue,
  ColumnToFieldMap,
  FieldValueLabels,
} from '@/components/shared/DataTable/components/ColumnHeaderFilter';
import type { ColumnHeaderFilterRenderers } from '@/components/shared/DataTable/types';
import {
  FILTER_OPERATOR_TO_API,
  filtersToQueryParams,
  hasMeaningfulDomainFilters,
  normalizeDomainFiltersForApi,
} from '@/utils/filterUtils';
import { mapClosedLeadsForNavigation } from '@/utils/closedLeadNavigation';
import { METADATA_OPTIONS_ENTITY_CLOSED_LEADS } from '@/utils/closeProjectUtils';

/**
 * Maps table column IDs to their corresponding metadata API field names.
 * Only entries where the column ID differs from the API field name are needed.
 */
const LEAD_COLUMN_TO_FIELD_MAP: ColumnToFieldMap = {
  agent: 'user_id',
  project_name: 'team_id',
  prev_agent: 'prev_user_id',
  prev_project: 'prev_team_id',
  lead_source: 'source_id',
  status: 'status_id',
  imp_status: 'duplicate_status',
};

const LEAD_FIELD_VALUE_LABELS: FieldValueLabels = {
  duplicate_status: {
    '0': 'New',
    '1': '10 Week Duplicate',
    '2': 'Duplicate',
  },
};

const LEAD_COLUMN_HEADER_FILTER_RENDERERS: ColumnHeaderFilterRenderers = {
  user_id: 'metadata_checkbox',
  team_id: 'metadata_checkbox',
  prev_user_id: 'metadata_checkbox',
  prev_team_id: 'metadata_checkbox',
  source_id: 'metadata_checkbox',
  source_agent: 'metadata_checkbox',
  source_project: 'metadata_checkbox',
  status_id: 'metadata_checkbox',
  duplicate_status: 'metadata_checkbox',
  use_status: 'metadata_checkbox',
};
import { useGroupedVisibleLeadsStore } from '@/stores/groupedVisibleLeadsStore';
import { useFilterAwareLeadsNavigationStore } from '@/stores/navigationStores';
import Checkbox from '@/components/ui/Checkbox';
import { usePathname } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useQueryClient } from '@tanstack/react-query';
import { useApiUrlStore } from '@/stores/apiUrlStore';
import { hasRole } from '@/services/AuthService';
import {
  mergeCloseProjectTeamDomain,
  isProjectLeadsMongoDetailRoute,
} from '@/utils/closeProjectUtils';

// Type guard function to check if the data is GetAllLeadsResponse
function isGetAllLeadsResponse(data: any): data is { data: any[]; meta: { total: number } } {
  return data && typeof data === 'object' && 'data' in data && 'meta' in data;
}

type GroupedHeaderCheckboxProps = {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

const GroupedHeaderCheckbox: React.FC<GroupedHeaderCheckboxProps> = ({
  checked,
  indeterminate,
  disabled,
  onToggle,
}) => {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <Checkbox
      ref={checkboxRef}
      checked={checked}
      disabled={disabled}
      onChange={(_, event) => {
        event?.stopPropagation();
        onToggle();
      }}
    />
  );
};

// Custom status order for Agent on live-leads, recycle-leads, and archived pages
const AGENT_STATUS_ORDER = ['New', 'Angebot', 'Termin', 'NE1', 'NE2', 'NE3', 'NE4'];

const LeadDataTables = ({ fixedHeight }: { fixedHeight?: string }) => {
  // Consume all needed values from context
  const {
    // Group by related
    selectedGroupBy,
    selectedGroupDetails,

    // Group leads data
    groupLeadsData,
    groupLeadsLoading,
    setGroupLeadsData,
    setGroupLeadsLoading,

    // Lifted grouped leads data
    liftedGroupedLeadsData,
    liftedGroupedLeadsLoading,
    setLiftedGroupedLeadsData,
    setLiftedGroupedLeadsLoading,

    // Columns and filtering
    getFilteredColumns,
    sharedDataTable,

    // Expanded row
    expandedRowId,
    setExpandedRowId,

    // Projects and status
    allProjects,
    allStatus,

    // Pagination
    externalPage,
    page,
    pageSize,
    externalPageSize,
    setPage,
    setPageSize,

    // Row click handlers
    handleRowClickWrapper,
    handleGroupClick,

    // Table name and filters
    tableName,
    groupedLeadsFilters,

    // Selection handlers
    handleGroupedLeadSelectionChange,
    clearGroupedSelections,
    selectAllGroupedLeadsSignal,
    selectedLeads,

    // Sorting
    groupedLeadsSortBy,
    groupedLeadsSortOrder,
    handleGroupedLeadsSortChange,
    handleSort,

    // Group leads selection for assignment
    handleGroupedLeadsSelectionForAssignment,

    // Pending leads component
    pendingLeadsComponent,

    // External data
    externalData,
    leadsData,
    externalLoading,

    // Dynamic filter and bulk search
    isDynamicFilterMode,
    dynamicFilterResults,
    isBulkSearchMode,
    bulkSearchQuery,
    bulkSearchResults,
    sortedData,

    // Table height
    tableHeightClass,

    // Dynamic pagination
    dynamicPage,
    dynamicPageSize,
    externalTotal,
    dynamicTotal,
    total,

    // Pagination handlers
    handleDynamicFilterPaginationChange,
    handleDynamicFilterPageSizeChange,

    // Dialog states - Update leads
    updateConfirmDialogOpen,
    setUpdateConfirmDialogOpen,
    handleCheckLeads,
    bulkUpdateMutationLeads,

    // Dialog states - Archive
    archiveConfirmDialogOpen,
    setArchiveConfirmDialogOpen,
    bulkDeleteMutationLeads,
    conditionalRefetch,
    setSelectedLeads,
    clearSelectedItems,

    // Dialog states - Restore
    restoreConfirmDialogOpen,
    setRestoreConfirmDialogOpen,
    restoreLeadsMutation,

    // Dialog states - Delete
    deleteConfirmDialogOpen,
    setDeleteConfirmDialogOpen,
    permanentDeleteLeads,

    // Dialog states - Assign/Transfer
    isAssignDialogOpen,
    setIsAssignDialogOpen,
    projects,
    transformLeads,
    groupedLeadsTransformLeads,
    selectedProjectId,
    selectedAgentId,
    selectLeadPrice,
    customPrice,
    makeFresh,
    isSubmitting,
    getProjectAgents,
    getUserLogin,
    handleProjectChange,
    handleAssignSubmit,
    handleAssignSubmitTransform,
    setSelectedLeadPrice,
    setSelectedAgentId,
    setSelectedProjectId,
    setCustomPrice,
    setMakeFresh,
    setRestoreArchived,
    restoreArchived,
    // Dialog states - Reclamation
    isReclamationDialogOpen,
    setIsReclamationDialogOpen,
    reclamationReason,
    setReclamationReason,
    isSubmittingReclamation,
    handleReclamationSubmit,

    // Dialog states - Close Project
    isCloseProjectDialogOpen,
    setIsCloseProjectDialogOpen,
    closureReason,
    setClosureReason,
    closeProjectCurrentStatus,
    setCloseProjectCurrentStatus,
    closeProjectNotes,
    setCloseProjectNotes,
    handleCloseProjectSubmit,
    closeProjectMutation,

    // Closed leads props
    externalProjectId,
    closeProjectId,
    getCurrentProjectAndAgent,

    // Filter values for API URL building
    search,
    filterData,
    leadTableLoading,
    buildApiFilters,
  } = useLeadsDashboardContext();

  // Track which grouped leads are visible so header checkbox can act on them
  const visibleLeadsByGroup = useGroupedVisibleLeadsStore((state) => state.visibleLeadsByGroup);
  const clearAllVisibleLeads = useGroupedVisibleLeadsStore((state) => state.clearAllVisibleLeads);

  // NEW: Get universal grouping filter store and build default filters
  const {
    getCombinedDomainFilters,
    domainFilters: storedDomainFilters,
    userDomainFilters,
    lockedDomainFilters, // Immutable filters for agents
    groupBy: storeGroupBy,
    pagination,
    subgroupPagination,
    sorting,
    setPagination,
    setBuildDefaultFilters,
    setGroupBy: setStoreGroupBy,
    setUserDomainFilters,
    expandedGroups,
  } = useUniversalGroupingFilterStore();

  // Set build default filters function in store
  React.useEffect(() => {
    if (buildApiFilters) {
      setBuildDefaultFilters(buildApiFilters);
    }
  }, [buildApiFilters, setBuildDefaultFilters]);

  // Sync selectedGroupBy from props to store (one-way: props -> store)
  // Use refs to prevent infinite loops by tracking sync state
  const lastSyncedSelectedGroupByRef = React.useRef<string>('');
  const isSyncingRef = React.useRef<boolean>(false);
  const storeGroupByRef = React.useRef<string[]>([]);

  // Keep ref in sync with store value (without triggering effects)
  React.useEffect(() => {
    storeGroupByRef.current = storeGroupBy;
  }, [storeGroupBy]);

  React.useEffect(() => {
    // Skip if we're currently syncing to prevent circular updates
    if (isSyncingRef.current) {
      return;
    }

    const selectedGroupByStr = JSON.stringify(selectedGroupBy);
    const storeGroupByStr = JSON.stringify(storeGroupByRef.current);

    // Only sync if:
    // 1. selectedGroupBy changed (not just a re-render)
    // 2. selectedGroupBy is different from what we last synced
    // 3. selectedGroupBy is different from current store value
    if (selectedGroupByStr !== lastSyncedSelectedGroupByRef.current) {
      if (selectedGroupBy.length > 0) {
        // Only update if different from store to avoid unnecessary updates
        if (selectedGroupByStr !== storeGroupByStr) {
          isSyncingRef.current = true;
          lastSyncedSelectedGroupByRef.current = selectedGroupByStr;
          setStoreGroupBy(selectedGroupBy);
          // Reset sync flag after state update completes
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 0);
        } else {
          // Store already matches, just update the ref
          lastSyncedSelectedGroupByRef.current = selectedGroupByStr;
        }
      } else if (selectedGroupBy.length === 0 && storeGroupByRef.current.length > 0) {
        // Clear store if props are cleared
        isSyncingRef.current = true;
        lastSyncedSelectedGroupByRef.current = selectedGroupByStr;
        setStoreGroupBy([]);
        // Reset sync flag after state update completes
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 0);
      } else {
        // Both are empty, just update the ref
        lastSyncedSelectedGroupByRef.current = selectedGroupByStr;
      }
    }
    // Only depend on selectedGroupBy - storeGroupBy is tracked via ref to prevent loops
  }, [selectedGroupBy, setStoreGroupBy]);

  // Use userDomainFilters + lockedDomainFilters (excludes page default filters)
  // Default filters should be passed as regular query params (use_status=pending, project_id=123, etc.)
  // IMPORTANT: Include both locked filters (immutable for agents) and user-added filters
  const domainFilters = useMemo(() => {
    const locked = lockedDomainFilters || [];
    const user = normalizeDomainFiltersForApi(userDomainFilters || []);
    return [...locked, ...user];
  }, [lockedDomainFilters, userDomainFilters]);

  const pathname = usePathname();
  const isProjectLeadsMongoDetailPage = useMemo(
    () =>
      isProjectLeadsMongoDetailRoute({
        pathname,
        externalProjectId,
        closeProjectId,
      }),
    [pathname, externalProjectId, closeProjectId]
  );

  // Close-project: team_id from route; project detail `/projects/[id]`: team_id from project id — merge for API domain
  const teamScopedLeadsDomainFilters = useMemo(() => {
    if (closeProjectId) return mergeCloseProjectTeamDomain(closeProjectId, domainFilters);
    if (isProjectLeadsMongoDetailPage && externalProjectId)
      return mergeCloseProjectTeamDomain(externalProjectId, domainFilters);
    return domainFilters;
  }, [closeProjectId, externalProjectId, domainFilters, isProjectLeadsMongoDetailPage]);

  // Clear selections when domain filters change (filtered dataset changes)
  React.useEffect(() => {
    setSelectedLeads([]);
    clearSelectedItems();
    clearAllVisibleLeads();
  }, [domainFilters, clearSelectedItems, clearAllVisibleLeads, setSelectedLeads]);

  const isLeadsBankPage = pathname === '/dashboards/leads-bank';
  const allLeadsPage = pathname === '/dashboards/leads';

  // Get selected project for Agent role
  const { data: session, status: sessionStatus } = useSession();
  const { selectedProject } = useSelectedProjectStore();
  const projectId = selectedProject?._id;
  const effectiveProjectId = projectId === 'all' ? undefined : projectId;
  const isAllProjectsSelected = selectedProject?._id === 'all' || selectedProject?.value === 'all';

  // Convert default filters from buildApiFilters to query params format
  // Default filters should be passed as regular query params (e.g., use_status=pending)
  // Only convert simple '=' operators to query params, complex operators stay in domain
  // All-leads page adds includeAll via query params; leads-bank does not
  const defaultFiltersAsQueryParams = useMemo((): Record<string, string | number | boolean> => {
    const base: Record<string, string | number | boolean> = {
      ...(allLeadsPage ? { includeAll: true } : {}),
      ...filtersToQueryParams(buildApiFilters?.() ?? []),
      ...(session?.user?.role === Role.AGENT && effectiveProjectId
        ? { project_id: effectiveProjectId }
        : {}),
      ...(closeProjectId
        ? {
            sortBy: 'closed_at',
            sortOrder: -1,
          }
        : {}),
    };
    if (isProjectLeadsMongoDetailPage) {
      delete base.project;
      delete base.includeAll;
    }
    return base;
  }, [
    buildApiFilters,
    allLeadsPage,
    session?.user?.role,
    effectiveProjectId,
    closeProjectId,
    isProjectLeadsMongoDetailPage,
  ]);

  // Use selectedGroupBy from props, fallback to store
  const effectiveGroupBy = selectedGroupBy.length > 0 ? selectedGroupBy : storeGroupBy;

  // Build API URL for flat (non-grouped) view to attach _apiUrl to items
  // This matches the buildApiUrl logic from useLeadsDashboard.tsx
  const buildFlatApiUrl = useCallback(() => {
    const baseUrl = closeProjectId ? '/closed-leads' : '/leads';
    const params = new URLSearchParams();

    // Add pagination
    params.set('page', page.toString());
    params.set('limit', pageSize.toString());

    // Add search if available
    if (search) {
      if (closeProjectId) params.set('contact_name', search);
      else params.set('search', search);
    }

    // Close-project & project-detail leads: prefer domain (team_id); flat view may still send project_id below
    const domainForUrl = teamScopedLeadsDomainFilters;
    if (closeProjectId && (!domainForUrl || domainForUrl.length === 0)) {
      params.set('project_id', closeProjectId);
    } else if (session?.user?.role === Role.AGENT && effectiveProjectId) {
      params.set('project_id', effectiveProjectId);
    } else if (externalProjectId) {
      params.set('project_id', externalProjectId);
    }

    // Add default filters from defaultFiltersAsQueryParams
    Object.entries(defaultFiltersAsQueryParams || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });

    // Add domain filters if present
    if (domainForUrl && domainForUrl.length > 0) {
      params.set('domain', JSON.stringify(domainForUrl));
    }

    // Add sorting
    if (sorting?.sortBy) params.set('sortBy', sorting.sortBy);
    if (sorting?.sortOrder) params.set('sortOrder', sorting.sortOrder);

    // Add filterData (duplicate filter)
    if (filterData !== undefined) params.set('duplicate', filterData.toString());

    return `${baseUrl}?${params.toString()}`;
  }, [
    page,
    pageSize,
    search,
    closeProjectId,
    session?.user?.role,
    effectiveProjectId,
    externalProjectId,
    defaultFiltersAsQueryParams,
    domainFilters,
    teamScopedLeadsDomainFilters,
    sorting,
    filterData,
  ]);

  // CRITICAL: For agents on live-leads/recycle-leads/archived pages, prevent automatic grouped summary API call on initial load/reload
  // The grouping should be set up, but the API call should only happen after user interaction (pagination, filters, group expansion, etc.)
  // IMPORTANT: This only affects agents, admins are not affected
  const isArchivedLeadsPage = pathname?.includes('leads/archived') ?? false;
  const isAgentOnGroupedPage =
    session?.user?.role === Role.AGENT &&
    (pathname?.includes('live-leads') ||
      pathname?.includes('recycle-leads') ||
      isArchivedLeadsPage);
  // Session ready = authenticated or past loading with user (handles production rehydration)
  const isSessionReady =
    sessionStatus === 'authenticated' || (sessionStatus !== 'loading' && !!session?.user);
  const [shouldEnableGroupedSummary, setShouldEnableGroupedSummary] =
    React.useState(!isAgentOnGroupedPage); // Disable for agents on grouped pages initially
  const isInitialMountRef = React.useRef(true);
  const initialPaginationRef = React.useRef({ page: pagination.page, limit: pagination.limit });
  const initialFiltersRef = React.useRef(domainFilters.length);
  const initialSortingRef = React.useRef({ sortBy: sorting.sortBy, sortOrder: sorting.sortOrder });
  const initialProjectIdRef = React.useRef(effectiveProjectId); // Track initial project ID
  const initialSourceRef = React.useRef(defaultFiltersAsQueryParams?.source); // Track initial source

  // Set initial values on mount (only once)
  React.useEffect(() => {
    if (isInitialMountRef.current) {
      initialPaginationRef.current = { page: pagination.page, limit: pagination.limit };
      initialFiltersRef.current = domainFilters.length;
      initialSortingRef.current = { sortBy: sorting.sortBy, sortOrder: sorting.sortOrder };
      initialProjectIdRef.current = effectiveProjectId; // Store initial project ID
      initialSourceRef.current = defaultFiltersAsQueryParams?.source; // Store initial source
      isInitialMountRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - dependencies intentionally excluded

  // For agents on live-leads/recycle-leads/archived pages, enable grouped summary API after mount when dependencies are ready
  // This ensures the API is called when navigating to these pages (not just on user interaction)
  // CRITICAL: In production, effectiveProjectId/selectedProject/metadata may load async. Enable when we have groupBy + required data.
  // Archived page does NOT require domain filters (no locked status filters).
  React.useEffect(() => {
    if (!isSessionReady) return;
    if (isInitialMountRef.current) return;

    if (isAgentOnGroupedPage && !shouldEnableGroupedSummary && effectiveGroupBy.length > 0) {
      const hasDomainFilters = domainFilters.length > 0;
      // Archived: no locked filters needed; live/recycle: need domain (status_id) or project
      const hasRequiredData =
        session?.user?.role === Role.AGENT
          ? isArchivedLeadsPage
            ? true // Archived doesn't require domain filters
            : hasDomainFilters || effectiveProjectId !== undefined || isAllProjectsSelected
          : true;

      if (hasRequiredData) {
        setShouldEnableGroupedSummary(true);
      }
    }
  }, [
    isSessionReady,
    isAgentOnGroupedPage,
    shouldEnableGroupedSummary,
    effectiveGroupBy.length,
    domainFilters.length,
    effectiveProjectId,
    isAllProjectsSelected,
    isArchivedLeadsPage,
    session?.user?.role,
  ]);

  // Retry effect for production: when session/groupBy/domain load in different order, re-check every 300ms for up to 2s
  const domainFiltersRef = React.useRef(domainFilters);
  const effectiveProjectIdRef = React.useRef(effectiveProjectId);
  const isAllProjectsSelectedRef = React.useRef(isAllProjectsSelected);
  domainFiltersRef.current = domainFilters;
  effectiveProjectIdRef.current = effectiveProjectId;
  isAllProjectsSelectedRef.current = isAllProjectsSelected;

  React.useEffect(() => {
    if (!isSessionReady || !isAgentOnGroupedPage || shouldEnableGroupedSummary) return;
    if (effectiveGroupBy.length === 0) return;

    const hasDomainFilters = domainFiltersRef.current.length > 0;
    const hasRequiredData = isArchivedLeadsPage
      ? true
      : hasDomainFilters ||
      effectiveProjectIdRef.current !== undefined ||
      isAllProjectsSelectedRef.current;

    if (hasRequiredData) {
      setShouldEnableGroupedSummary(true);
      return;
    }

    const maxAttempts = 7;
    let attempts = 0;
    const id = setInterval(() => {
      attempts++;
      const d = domainFiltersRef.current.length > 0;
      const p = effectiveProjectIdRef.current !== undefined || isAllProjectsSelectedRef.current;
      const ready = isArchivedLeadsPage || d || p;
      if (ready || attempts >= maxAttempts) {
        clearInterval(id);
        if (ready) setShouldEnableGroupedSummary(true);
      }
    }, 300);
    return () => clearInterval(id);
  }, [
    isSessionReady,
    isAgentOnGroupedPage,
    shouldEnableGroupedSummary,
    effectiveGroupBy.length,
    isArchivedLeadsPage,
  ]);

  // Enable grouped summary API when user interacts (pagination change, filter change, sorting change, project change, source change, or group expansion)
  // This prevents the automatic API call on initial load/reload for agents
  React.useEffect(() => {
    // Skip on initial mount to prevent false positives
    if (isInitialMountRef.current) return;

    if (isAgentOnGroupedPage && !shouldEnableGroupedSummary) {
      // Enable when pagination changes from initial values (user interaction)
      if (
        pagination.page !== initialPaginationRef.current.page ||
        pagination.limit !== initialPaginationRef.current.limit
      ) {
        setShouldEnableGroupedSummary(true);
      }
      // Enable when filters change from initial (user interaction)
      if (domainFilters.length !== initialFiltersRef.current) {
        setShouldEnableGroupedSummary(true);
      }
      // Enable when sorting changes from initial (user interaction)
      if (
        sorting.sortBy !== initialSortingRef.current.sortBy ||
        sorting.sortOrder !== initialSortingRef.current.sortOrder
      ) {
        setShouldEnableGroupedSummary(true);
      }
      // Enable when project changes from initial (user interaction)
      if (effectiveProjectId !== initialProjectIdRef.current) {
        setShouldEnableGroupedSummary(true);
      }
      // Enable when source changes from initial (user interaction - menu/selector change)
      if (defaultFiltersAsQueryParams?.source !== initialSourceRef.current) {
        setShouldEnableGroupedSummary(true);
      }
    }
  }, [
    isAgentOnGroupedPage,
    shouldEnableGroupedSummary,
    pagination.page,
    pagination.limit,
    domainFilters.length,
    sorting.sortBy,
    sorting.sortOrder,
    effectiveProjectId, // Add project ID to dependencies
    defaultFiltersAsQueryParams?.source, // Add source to dependencies
  ]);

  // Also enable when a group is expanded (handled in GroupSummary component via expandedGroups)
  React.useEffect(() => {
    // Skip on initial mount to prevent false positives
    if (isInitialMountRef.current) return;

    if (isAgentOnGroupedPage && !shouldEnableGroupedSummary && expandedGroups.size > 0) {
      setShouldEnableGroupedSummary(true);
    }
  }, [isAgentOnGroupedPage, shouldEnableGroupedSummary, expandedGroups.size]);

  // Get query client for cache invalidation
  const queryClient = useQueryClient();

  // Detect source changes from defaultFilters (includes source from buildApiFilters or menu selection)
  // This tracks source changes both from pathname navigation AND from menu/selector changes
  const currentSourceFromFilters = defaultFiltersAsQueryParams?.source;
  const previousSourceFromFiltersRef = React.useRef(currentSourceFromFilters);

  // Detect source changes (live-leads vs recycle-leads) from pathname
  const liveLeads = pathname?.includes('live-leads');
  const recycleLeads = pathname?.includes('recycle-leads');
  const currentSourceFromPath = liveLeads ? 'live' : recycleLeads ? 'recycle' : undefined;
  const previousSourceFromPathRef = React.useRef(currentSourceFromPath);

  // Invalidate grouped summary cache when source changes (from pathname OR from filters/menu)
  React.useEffect(() => {
    // Check if source changed from pathname
    if (
      previousSourceFromPathRef.current !== currentSourceFromPath &&
      previousSourceFromPathRef.current !== undefined
    ) {
      // Source changed via pathname navigation - invalidate all grouped-summary queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const firstKey = query.queryKey[0];
          return firstKey === 'grouped-summary';
        },
      });
    }
    previousSourceFromPathRef.current = currentSourceFromPath;
  }, [currentSourceFromPath, queryClient]);

  // Invalidate grouped summary cache when source changes from filters/menu
  React.useEffect(() => {
    // Check if source changed from defaultFilters (menu/selector change)
    if (
      previousSourceFromFiltersRef.current !== currentSourceFromFilters &&
      previousSourceFromFiltersRef.current !== undefined
    ) {
      // Source changed via menu/selector - invalidate all grouped-summary queries to force fresh fetch
      queryClient.invalidateQueries({
        predicate: (query) => {
          const firstKey = query.queryKey[0];
          return firstKey === 'grouped-summary';
        },
      });
    }
    previousSourceFromFiltersRef.current = currentSourceFromFilters;
  }, [currentSourceFromFilters, queryClient]);

  // Extract active subgroup pagination and deepest groupId for API call
  // Phase 2: Support recursive pagination at any nesting level
  // Find the most recently updated subgroup pagination (if any)
  // Extract the deepest groupId from the uniqueGroupId path for API call
  const activeSubgroupPagination = React.useMemo(() => {
    const entries = Object.entries(subgroupPagination);
    if (entries.length === 0) {
      return { subPage: null, subLimit: null, groupId: null };
    }

    // Get the first active pagination (in practice, there should only be one active at a time)
    // The uniqueGroupId includes the full path (e.g., "groupId1|groupId2|groupId3")
    // We need to extract the deepest (last) groupId for the API
    const [uniqueGroupId, pagination] = entries[0];
    const groupIdPath = uniqueGroupId.split('|');
    const deepestGroupId = groupIdPath[groupIdPath.length - 1] || null;

    return {
      subPage: pagination.subPage,
      subLimit: pagination.subLimit,
      groupId: deepestGroupId,
    };
  }, [subgroupPagination]);

  // Sorting: use grouped-summary API whenever we're not showing expanded *leaf* lead rows.
  // Parent expanded + subgroups (2nd layer) still uses grouped summary → keep sort on that API.
  // Only when a leaf is expanded (GroupSummary loads rows into visibleLeadsByGroup) route sort to details only.
  const applySortToGroupedSummary = Object.keys(visibleLeadsByGroup).length === 0;

  // Must match `enabled` on useGroupedSummary so we never show an infinite skeleton when the query is off
  // (e.g. `team_id` missing from domain — `project_id` in defaultFilters still scopes /closed-leads).
  const isGroupedSummaryQueryEnabled =
    effectiveGroupBy.length > 0 &&
    shouldEnableGroupedSummary &&
    (!isAgentOnGroupedPage ||
      domainFilters.length > 0 ||
      isArchivedLeadsPage ||
      (!!closeProjectId && teamScopedLeadsDomainFilters.length > 0) ||
      (!!isProjectLeadsMongoDetailPage && teamScopedLeadsDomainFilters.length > 0));

  // Fetch grouped summary using new API
  // Ensure sortOrder always has a value to prevent duplicate API calls
  // CRITICAL: For agents on live-leads/recycle-leads/archived pages, completely disable on initial load
  // Only enable after explicit user interaction (pagination, filters, sorting, or group expansion)
  const {
    data: groupedSummaryData,
    isLoading: groupedSummaryLoading,
    isFetching: groupedSummaryFetching,
    isError: groupedSummaryError,
  } = useGroupedSummary({
    entityType: 'Lead',
    domain: teamScopedLeadsDomainFilters,
    groupBy: effectiveGroupBy,
    page: pagination.page,
    limit: pagination.limit,
    subPage: activeSubgroupPagination.subPage,
    subLimit: activeSubgroupPagination.subLimit,
    groupId: activeSubgroupPagination.groupId, // Deepest groupId extracted from uniqueGroupId path
    sortBy: sorting.sortBy || undefined,
    sortOrder: sorting.sortOrder || 'desc', // Always provide default to prevent duplicate calls
    applySortToSummary: applySortToGroupedSummary,
    // CRITICAL: For Agent on live-leads/recycle-leads, only call API when domain has filters (status_id).
    // Archived page does NOT require domain filters.
    enabled: isGroupedSummaryQueryEnabled,
    defaultFilters: defaultFiltersAsQueryParams, // Pass default filters as query params (includes source)
    search: search || undefined, // Pass search parameter - when search is active, grouped summary API handles it instead of group details API
    values: isBulkSearchMode && bulkSearchQuery?.length ? bulkSearchQuery : undefined, // Bulk search params when grouping after bulk search
    includeAll:
      isLeadsBankPage || closeProjectId || isProjectLeadsMongoDetailPage ? false : undefined,
    listResource: closeProjectId ? 'closed-leads' : undefined,
  });

  // Show loading skeleton when API is fetching or loading, not just when isLoading is true
  // Only treat "no data yet" as loading when the query is actually enabled (avoids infinite spinner when enabled=false)
  const isGroupedSummaryLoading =
    groupedSummaryLoading ||
    groupedSummaryFetching ||
    (isGroupedSummaryQueryEnabled && !groupedSummaryData && !groupedSummaryError);

  // Sort grouped data by custom status order for Agents on live/recycle pages
  const sortedGroupedData = useMemo(() => {
    const data = groupedSummaryData?.data || [];

    // Detect if we're on live-leads, recycle-leads, or archived page
    const isLiveLeadsPage = pathname?.includes('live-leads') || false;
    const isRecycleLeadsPage = pathname?.includes('recycle-leads') || false;
    const isArchivedLeadsPage = pathname?.includes('leads/archived') || false;
    const isAgent = session?.user?.role === Role.AGENT;

    // Only apply custom sorting for Agents on live-leads, recycle-leads, or archived pages
    // and when grouping by status_id
    const shouldApplyCustomSort =
      isAgent &&
      (isLiveLeadsPage || isRecycleLeadsPage || isArchivedLeadsPage) &&
      effectiveGroupBy.includes('status_id');

    if (!shouldApplyCustomSort || data.length === 0) {
      return data;
    }

    // Sort by custom status order
    return [...data].sort((a, b) => {
      const aName = a.groupName || '';
      const bName = b.groupName || '';

      const aIndex = AGENT_STATUS_ORDER.findIndex(
        (status) => status.toLowerCase() === aName.toLowerCase()
      );
      const bIndex = AGENT_STATUS_ORDER.findIndex(
        (status) => status.toLowerCase() === bName.toLowerCase()
      );

      // If both are in the custom order, sort by that order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only one is in the custom order, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // If neither is in the custom order, keep original order (by count)
      return 0;
    });
  }, [groupedSummaryData, pathname, session?.user?.role, effectiveGroupBy]);

  // Fetch filtered leads when custom filters are applied but no grouping
  // Only check user-added filters (not locked/default filters like active=false)
  const hasUserFilters = useMemo(() => {
    return hasMeaningfulDomainFilters(userDomainFilters);
  }, [userDomainFilters]);

  // Build query params for /leads or /closed-leads with domain filters
  // IMPORTANT: Default filters should be passed as regular query params alongside domain
  const filteredLeadsQueryParams = useMemo(() => {
    if (closeProjectId) {
      const baseParams: Record<string, unknown> = {
        page: pagination.page || 1,
        limit: pagination.limit || 50,
        ...defaultFiltersAsQueryParams,
        sortBy: sorting?.sortBy || 'closed_at',
        sortOrder: sorting?.sortOrder === 'asc' ? 1 : -1,
      };

      if (teamScopedLeadsDomainFilters && teamScopedLeadsDomainFilters.length > 0) {
        baseParams.domain = JSON.stringify(teamScopedLeadsDomainFilters);
      } else {
        baseParams.project_id = closeProjectId;
      }

      if (isBulkSearchMode && bulkSearchQuery?.length) {
        baseParams.values = JSON.stringify(bulkSearchQuery);
      }

      if (search) {
        baseParams.contact_name = search;
      }

      return baseParams;
    }

    const baseParams: Record<string, unknown> = {
      page: pagination.page || 1,
      limit: pagination.limit || 50,
      // Add default filters as regular query params (e.g., use_status=pending)
      ...defaultFiltersAsQueryParams,
    };

    const domainForFilteredOpen =
      isProjectLeadsMongoDetailPage && externalProjectId
        ? mergeCloseProjectTeamDomain(externalProjectId, domainFilters)
        : domainFilters;
    if (domainForFilteredOpen && domainForFilteredOpen.length > 0) {
      baseParams.domain = JSON.stringify(domainForFilteredOpen);
    }

    // Add bulk search values when filtering after bulk search (Custom Filter, Agent, Date)
    if (isBulkSearchMode && bulkSearchQuery?.length) {
      baseParams.values = JSON.stringify(bulkSearchQuery);
    }

    // Add sorting parameters if provided
    if (sorting?.sortBy) {
      baseParams.sortBy = sorting.sortBy;
      baseParams.sortOrder = sorting.sortOrder || 'desc';
    }

    // Add search parameter if provided (from ActionBar search input)
    if (search) {
      baseParams.search = search;
    }

    return baseParams;
  }, [
    closeProjectId,
    domainFilters,
    teamScopedLeadsDomainFilters,
    isProjectLeadsMongoDetailPage,
    externalProjectId,
    defaultFiltersAsQueryParams,
    pagination.page,
    pagination.limit,
    sorting,
    search,
    isBulkSearchMode,
    bulkSearchQuery,
  ]);

  // Fetch filtered leads when custom filters are applied but no grouping using useLeads directly
  // CRITICAL: For agents on live-leads/recycle-leads/archived pages, disable this API call (grouping is always active)
  // Note: isAgentOnGroupedPage is already declared above
  const {
    data: filteredOpenLeadsData,
    isLoading: filteredOpenLeadsLoading,
    isFetching: filteredOpenLeadsFetching,
  } = useLeads(filteredLeadsQueryParams, {
    enabled:
      effectiveGroupBy.length === 0 &&
      hasUserFilters &&
      !isAgentOnGroupedPage &&
      !closeProjectId,
  });

  const {
    data: filteredClosedLeadsData,
    isLoading: filteredClosedLeadsLoading,
    isFetching: filteredClosedLeadsFetching,
  } = useClosedLeads(filteredLeadsQueryParams as Parameters<typeof useClosedLeads>[0], {
    enabled:
      effectiveGroupBy.length === 0 &&
      hasUserFilters &&
      !isAgentOnGroupedPage &&
      !!closeProjectId,
  });

  const filteredLeadsData = closeProjectId ? filteredClosedLeadsData : filteredOpenLeadsData;
  const isFilteredLeadsLoading =
    (closeProjectId ? filteredClosedLeadsLoading : filteredOpenLeadsLoading) ||
    (closeProjectId ? filteredClosedLeadsFetching : filteredOpenLeadsFetching);

  // Build API URL from filteredLeadsQueryParams when custom filters are applied
  const buildFilteredApiUrl = useCallback(() => {
    const baseUrl = closeProjectId ? '/closed-leads' : '/leads';
    const params = new URLSearchParams();

    // Build URL from filteredLeadsQueryParams to match the actual API call
    Object.entries(filteredLeadsQueryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // domain is already a JSON string in filteredLeadsQueryParams
        if (key === 'domain' && typeof value === 'string') {
          params.set(key, value);
        } else {
          params.set(key, String(value));
        }
      }
    });

    return `${baseUrl}?${params.toString()}`;
  }, [filteredLeadsQueryParams, closeProjectId]);

  // Update navigation store and apiUrlStore when filteredLeadsData changes (for pagination metadata sync)
  React.useEffect(() => {
    if (
      filteredLeadsData?.data &&
      filteredLeadsData?.meta &&
      effectiveGroupBy.length === 0 &&
      hasUserFilters
    ) {
      const { setFilteredItems, setFilterState } = useFilterAwareLeadsNavigationStore.getState();
      const paginationMeta = {
        page: filteredLeadsData.meta.page || pagination.page,
        limit: filteredLeadsData.meta.limit || pagination.limit,
        total: filteredLeadsData.meta.total || 0,
        pages:
          filteredLeadsData.meta.pages ||
          Math.ceil(
            (filteredLeadsData.meta.total || 0) / (filteredLeadsData.meta.limit || pagination.limit)
          ),
      };
      const itemsForNav =
        closeProjectId && Array.isArray(filteredLeadsData.data)
          ? mapClosedLeadsForNavigation(filteredLeadsData.data)
          : filteredLeadsData.data;
      setFilteredItems(itemsForNav, paginationMeta);
      setFilterState({
        isDynamicFilterMode: false,
        dynamicFilters: [],
        isGroupedMode: false,
        paginationMeta,
      });

      // ✅ Update apiUrlStore with the filtered API URL
      const filteredApiUrl = buildFilteredApiUrl();
      const { setApiUrl } = useApiUrlStore.getState();
      setApiUrl(filteredApiUrl);
    }
  }, [
    filteredLeadsData,
    effectiveGroupBy.length,
    hasUserFilters,
    pagination.page,
    pagination.limit,
    buildFilteredApiUrl,
    closeProjectId,
  ]);

  // Handle pagination change for grouped summary
  const handleGroupedPaginationChange = React.useCallback(
    (pageIndex: number) => {
      setPagination({ ...pagination, page: pageIndex });
    },
    [pagination, setPagination]
  );

  // Handle page size change for grouped summary
  const handleGroupedPageSizeChange = React.useCallback(
    (newPageSize: number) => {
      setPagination({ page: 1, limit: newPageSize });
    },
    [setPagination]
  );

  // Column header filter: close-project bank uses ClosedLeads metadata (not Lead)
  const { data: metadataOptions } = useMetadataOptions(
    closeProjectId ? METADATA_OPTIONS_ENTITY_CLOSED_LEADS : 'Lead'
  );
  const columnFilterOptions = useMemo(
    () => metadataOptions?.filterOptions || [],
    [metadataOptions]
  );

  // Derive active column filters from userDomainFilters for header indicator
  const activeColumnFilters = useMemo(() => {
    const filters: Record<string, ColumnFilterValue> = {};
    if (!userDomainFilters?.length) return filters;
    for (const df of userDomainFilters) {
      const [field, op, val] = df;
      if (field) {
        filters[field] = { operator: op, value: val };
      }
    }
    return filters;
  }, [userDomainFilters]);

  const handleColumnFilterApply = useCallback(
    (columnId: string, operator: string, value: any) => {
      const apiOperator = FILTER_OPERATOR_TO_API[operator] ?? operator;
      const newFilter: DomainFilter = [columnId, apiOperator, value];

      // Replace existing filter for the same field, or add new one
      const updated = [
        ...(userDomainFilters || []).filter(([field]) => field !== columnId),
        newFilter,
      ];
      setUserDomainFilters(updated);
    },
    [userDomainFilters, setUserDomainFilters]
  );

  const handleColumnFilterClear = useCallback(
    (columnId: string) => {
      const updated = (userDomainFilters || []).filter(([field]) => field !== columnId);
      setUserDomainFilters(updated);
    },
    [userDomainFilters, setUserDomainFilters]
  );

  // Column header group-by: extract group options from metadata
  const columnGroupOptions = useMemo(() => metadataOptions?.groupOptions || [], [metadataOptions]);

  const handleToggleGroupBy = useCallback(
    (field: string) => {
      const current = storeGroupBy || [];
      const isSelected = current.includes(field);
      const updated = isSelected ? current.filter((f) => f !== field) : [...current, field];
      setStoreGroupBy(updated);
    },
    [storeGroupBy, setStoreGroupBy]
  );

  // Build base columns once for reuse
  const baseColumns = useMemo(
    () => getFilteredColumns(sharedDataTable),
    [getFilteredColumns, sharedDataTable]
  );

  // Flatten visible grouped leads and clear the store when grouping turns off
  const visibleGroupedLeads = useMemo(() => {
    const seen = new Set<string>();
    const flattened: any[] = [];

    Object.values(visibleLeadsByGroup || {}).forEach((leads = []) => {
      leads?.forEach((lead: any) => {
        const id = lead?._id?.toString();
        if (id && !seen.has(id)) {
          seen.add(id);
          flattened.push(lead);
        }
      });
    });

    return flattened;
  }, [visibleLeadsByGroup]);

  const isFilteredFlatView =
    (effectiveGroupBy.length === 0 && hasUserFilters) || (isBulkSearchMode && hasUserFilters);
  const shouldUseFilteredLeadsData = isFilteredFlatView && Boolean(filteredLeadsData);
  const currentTableLoading =
    (externalLoading ?? false) || leadTableLoading || isFilteredLeadsLoading;
  const currentTableNoData = (() => {
    if (isDynamicFilterMode) {
      return dynamicFilterResults.length === 0;
    }

    if (shouldUseFilteredLeadsData) {
      return (filteredLeadsData?.data?.length || 0) === 0;
    }

    if (isBulkSearchMode) {
      return bulkSearchResults.length === 0;
    }

    if (externalData !== undefined) {
      return externalData.length === 0;
    }

    return !isGetAllLeadsResponse(leadsData) || !leadsData?.data?.length;
  })();

  useEffect(() => {
    if (effectiveGroupBy.length === 0) {
      clearAllVisibleLeads();
    }
  }, [clearAllVisibleLeads, effectiveGroupBy.length]);

  useEffect(
    () => () => {
      clearAllVisibleLeads();
    },
    [clearAllVisibleLeads]
  );

  // Toggle header checkbox in grouped mode to select/deselect currently visible leads
  const handleGroupedHeaderToggle = useCallback(() => {
    if (!visibleGroupedLeads.length) return;

    const visibleIds = visibleGroupedLeads
      .map((lead: any) => lead?._id?.toString())
      .filter((id): id is string => Boolean(id));
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedLeads.includes(id));

    const nextSelection = allVisibleSelected ? [] : visibleGroupedLeads;

    handleGroupedLeadSelectionChange(nextSelection);
    handleGroupedLeadsSelectionForAssignment(nextSelection);
  }, [
    handleGroupedLeadSelectionChange,
    handleGroupedLeadsSelectionForAssignment,
    selectedLeads,
    visibleGroupedLeads,
  ]);

  // Override checkbox column header in grouped mode to reflect visible grouped leads
  const groupedColumns = useMemo(() => {
    if (effectiveGroupBy.length === 0) return baseColumns;

    const visibleIds = visibleGroupedLeads
      .map((lead: any) => lead?._id?.toString())
      .filter((id): id is string => Boolean(id));

    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedLeads.includes(id));
    const someVisibleSelected = visibleIds.some((id) => selectedLeads.includes(id));

    return baseColumns.map((column: any) => {
      if (column.id !== 'checkbox') return column;

      return {
        ...column,
        header: () => (
          <GroupedHeaderCheckbox
            checked={allVisibleSelected}
            indeterminate={!allVisibleSelected && someVisibleSelected}
            disabled={visibleIds.length === 0}
            onToggle={handleGroupedHeaderToggle}
          />
        ),
      };
    });
  }, [
    baseColumns,
    effectiveGroupBy.length,
    handleGroupedHeaderToggle,
    selectedLeads,
    visibleGroupedLeads,
  ]);

  return (
    <div className="min-w-max">
      <ScrollBar className="h-auto">
        <div className="leads-table">
          {effectiveGroupBy.length > 0 ? (
            selectedGroupDetails ? (
              // Show group details table (when a specific group is selected)
              // <DataTable
              //   data={groupLeadsData?.data?.leads || []}
              //   loading={groupLeadsLoading}
              //   columns={getFilteredColumns(sharedDataTable)}
              //   showPagination={false}
              //   selectable={false}
              //   noData={!groupLeadsData?.data?.leads?.length}
              //   onSort={handleSort}
              //   onRowClick={(row: any) => handleRowClickWrapper(row.original)}
              //   enableZoom={true}
              //   autoFitRowsOnZoom={false}
              //   renderExpandedRow={(row: any) => {
              //     if (row.original?._id !== expandedRowId) return null;
              //     if (tableName === 'scheduled_leads') {
              //       return (
              //         <div className="scheduled-expanded relative">
              //           <div className="scheduled-flow-connector pointer-events-none">
              //             <span className="rail" />
              //             <span className="elbow" />
              //           </div>
              //           <ScheduleOffersTable lead={row.original} />
              //         </div>
              //       );
              //     }
              //     return (
              //       <ExpandRowLeadViewDetails
              //         row={row}
              //         allProjects={allProjects}
              //         negativeAndPrivatOptions={allStatus}
              //       />
              //     );
              //   }}
              // />
              <h2>Grouped Leads Table</h2>
            ) : (
              // NEW: Show grouped leads using DataTableOptimized with groupedMode
              <DataTableOptimized
                tableClassName={tableHeightClass}
                data={[]}
                loading={isGroupedSummaryLoading}
                columns={groupedColumns}
                groupedMode={true}
                groupedData={sortedGroupedData}
                entityType="Lead"
                groupByFields={effectiveGroupBy}
                search={search}
                onRowClick={(row: any) => handleRowClickWrapper(row.original)}
                onSort={handleSort}
                columnFilterOptions={columnFilterOptions}
                activeColumnFilters={activeColumnFilters}
                onColumnFilterApply={handleColumnFilterApply}
                onColumnFilterClear={handleColumnFilterClear}
                columnToFieldMap={LEAD_COLUMN_TO_FIELD_MAP}
                fieldValueLabels={LEAD_FIELD_VALUE_LABELS}
                columnHeaderFilterRenderers={LEAD_COLUMN_HEADER_FILTER_RENDERERS}
                columnGroupOptions={columnGroupOptions}
                activeGroupBy={effectiveGroupBy}
                onToggleGroupBy={handleToggleGroupBy}
                showPagination={
                  groupedSummaryData?.meta?.total
                    ? groupedSummaryData.meta.total > pagination.limit
                    : false
                }
                pagingData={{
                  pageIndex: pagination.page,
                  pageSize: pagination.limit,
                  total: groupedSummaryData?.meta?.total || 0,
                }}
                onPaginationChange={handleGroupedPaginationChange}
                onSelectChange={handleGroupedPageSizeChange}
                enableZoom={true}
                tableLayout="fixed"
                enableColumnResizing={true}
                dynamicallyColumnSizeFit={true}
                autoFitRowsOnZoom={false}
                renderExpandedRow={(row: any) => {
                  if (row.original?._id !== expandedRowId) return null;
                  if (tableName === 'scheduled_leads') {
                    return (
                      <div className="scheduled-expanded relative">
                        <div className="scheduled-flow-connector pointer-events-none">
                          <span className="rail" />
                          <span className="elbow" />
                        </div>
                        <ScheduleOffersTable lead={row.original} />
                      </div>
                    );
                  }
                  return (
                    <ExpandRowLeadViewDetails
                      row={row}
                      allProjects={allProjects}
                      negativeAndPrivatOptions={allStatus}
                    />
                  );
                }}
              />
            )
          ) : (
            // Show regular leads table with fixed pagination positioning
            <div className="relative">
              <DataTableOptimized
                enableColumnResizing={tableName === 'termin' && hasRole(Role.AGENT) ? false : true}
                tableClassName={tableHeightClass}
                columnFilterOptions={columnFilterOptions}
                activeColumnFilters={activeColumnFilters}
                onColumnFilterApply={handleColumnFilterApply}
                onColumnFilterClear={handleColumnFilterClear}
                columnToFieldMap={LEAD_COLUMN_TO_FIELD_MAP}
                fieldValueLabels={LEAD_FIELD_VALUE_LABELS}
                columnHeaderFilterRenderers={LEAD_COLUMN_HEADER_FILTER_RENDERERS}
                columnGroupOptions={columnGroupOptions}
                activeGroupBy={effectiveGroupBy}
                onToggleGroupBy={handleToggleGroupBy}
                data={(() => {
                  // Get raw data
                  // When user has active filters, filteredLeadsData takes priority over externalData
                  const rawData = shouldUseFilteredLeadsData
                    ? filteredLeadsData?.data || []
                    : externalData ||
                    (isGetAllLeadsResponse(leadsData) || (closeProjectId && leadsData)
                      ? isDynamicFilterMode
                        ? dynamicFilterResults
                        : isBulkSearchMode && hasUserFilters && filteredLeadsData
                          ? filteredLeadsData?.data || []
                          : isBulkSearchMode
                            ? bulkSearchResults
                            : closeProjectId
                              ? leadsData?.data || []
                              : sortedData || leadsData?.data || []
                      : []);

                  // ✅ Attach _apiUrl to each item when NOT in grouped mode (flat view)
                  // This ensures CellInlineEdit can use the correct API URL for navigation
                  // ✅ Priority: Preserve existing _apiUrl from item > buildFilteredApiUrl > storedApiUrl > buildFlatApiUrl
                  if (effectiveGroupBy.length === 0 && rawData && Array.isArray(rawData)) {
                    const { apiUrl: storedApiUrl } = useApiUrlStore.getState();
                    let fallbackApiUrl: string;
                    if (hasUserFilters && filteredLeadsData) {
                      // Custom filters are applied - use the filtered API URL (includes domain parameter)
                      fallbackApiUrl = buildFilteredApiUrl();
                    } else {
                      // No custom filters - use stored URL or build flat URL
                      fallbackApiUrl = storedApiUrl || buildFlatApiUrl();
                    }
                    return rawData.map((item: any) => ({
                      ...item,
                      // ✅ Preserve existing _apiUrl if item already has it (from custom filters, etc.)
                      // Otherwise use fallbackApiUrl
                      _apiUrl: item._apiUrl || fallbackApiUrl,
                    }));
                  }

                  return rawData;
                })()}
                loading={currentTableLoading}
                columns={baseColumns}
                rowClassName={(row: any) =>
                  selectedLeads.includes((row?.original?._id ?? '').toString()) ? 'bg-gray-300' : ''
                }
                showPagination={false}
                // showPagination={(() => {
                //   const currentTotal =
                //     externalTotal ||
                //     (isDynamicFilterMode
                //       ? dynamicTotal
                //       : isGetAllLeadsResponse(leadsData)
                //         ? leadsData?.meta?.total
                //         : 0);
                //   return currentTotal > 10;
                // })()}

                pagingData={(() => {
                  const useFilteredData = shouldUseFilteredLeadsData;
                  const currentPageIndex = isDynamicFilterMode
                    ? dynamicPage
                    : useFilteredData
                      ? pagination.page
                      : externalPage || page;
                  const currentPageSize = isDynamicFilterMode
                    ? dynamicPageSize
                    : useFilteredData
                      ? pagination.limit
                      : externalPageSize || pageSize;
                  const currentTotal = isDynamicFilterMode
                    ? dynamicTotal
                    : useFilteredData
                      ? filteredLeadsData?.meta?.total || 0
                      : externalTotal ||
                      (isGetAllLeadsResponse(leadsData) ? leadsData?.meta?.total : 0);

                  return {
                    pageIndex: currentPageIndex,
                    pageSize: currentPageSize,
                    total: currentTotal,
                  };
                })()}
                pageSizes={getPaginationOptions(total)}
                onPaginationChange={
                  isDynamicFilterMode
                    ? handleDynamicFilterPaginationChange
                    : (effectiveGroupBy.length === 0 && hasUserFilters) ||
                      (isBulkSearchMode && hasUserFilters)
                      ? handleGroupedPaginationChange
                      : setPage
                }
                onSelectChange={
                  isDynamicFilterMode
                    ? handleDynamicFilterPageSizeChange
                    : (effectiveGroupBy.length === 0 && hasUserFilters) ||
                      (isBulkSearchMode && hasUserFilters)
                      ? handleGroupedPageSizeChange
                      : setPageSize
                }
                noData={currentTableNoData}
                onSort={handleSort}
                onRowClick={(row: any) => handleRowClickWrapper(row.original)}
                enableZoom={true}
                headerSticky={true}
                autoFitRowsOnZoom={false}
                tableLayout="fixed"
                dynamicallyColumnSizeFit={true}
                fixedHeight={fixedHeight || '89dvh'}
                renderExpandedRow={(row: any) => {
                  if (row.original?._id !== expandedRowId) return null;
                  if (tableName === 'scheduled_leads') {
                    return (
                      <div className="scheduled-expanded relative">
                        <div className="scheduled-flow-connector pointer-events-none">
                          <span className="rail" />
                          <span className="elbow" />
                        </div>
                        <ScheduleOffersTable lead={row.original} />
                      </div>
                    );
                  }
                  return (
                    <ExpandRowLeadViewDetails
                      row={row}
                      allProjects={allProjects}
                      negativeAndPrivatOptions={allStatus}
                    />
                  );
                }}
              />
            </div>
          )}
        </div>
      </ScrollBar>
      {pendingLeadsComponent && (
        <>
          <ConfirmDialog
            type="warning"
            isOpen={updateConfirmDialogOpen}
            title="Warning"
            cancelText="Not Usable"
            confirmText="Usable"
            onCancel={() => setUpdateConfirmDialogOpen(false)}
            onConfirm={handleCheckLeads}
            handleCancel={() => handleCheckLeads(false)}
            confirmButtonProps={{ disabled: bulkUpdateMutationLeads.isPending }}
          >
            <p>Are you sure you want to update {selectedLeads?.length} items?</p>
          </ConfirmDialog>
        </>
      )}

      <ConfirmDialog
        type="warning"
        isOpen={archiveConfirmDialogOpen}
        title="Archive Leads"
        onCancel={() => setArchiveConfirmDialogOpen(false)}
        onConfirm={async () => {
          bulkDeleteMutationLeads.mutate(selectedLeads);
          await conditionalRefetch();
          setArchiveConfirmDialogOpen(false);
          setSelectedLeads([]);
          clearSelectedItems();
        }}
        confirmButtonProps={{ disabled: bulkDeleteMutationLeads.isPending }}
      >
        <p>Are you sure you want to archive {selectedLeads?.length} leads?</p>
      </ConfirmDialog>

      <ConfirmDialog
        type="info"
        isOpen={restoreConfirmDialogOpen}
        title="Restore Leads"
        onCancel={() => setRestoreConfirmDialogOpen(false)}
        onConfirm={async () => {
          restoreLeadsMutation.mutate(selectedLeads);
          await conditionalRefetch();
          setRestoreConfirmDialogOpen(false);
          setSelectedLeads([]);
        }}
        confirmButtonProps={{ disabled: restoreLeadsMutation.isPending }}
      >
        <p>Are you sure you want to restore {selectedLeads?.length} leads?</p>
      </ConfirmDialog>

      <ConfirmDialog
        type="warning"
        isOpen={deleteConfirmDialogOpen}
        title="Warning"
        onCancel={() => setDeleteConfirmDialogOpen(false)}
        onConfirm={async () => {
          permanentDeleteLeads.mutate(selectedLeads);
          await conditionalRefetch();
          setDeleteConfirmDialogOpen(false);
          setSelectedLeads([]);
          clearSelectedItems();
        }}
        confirmButtonProps={{ disabled: permanentDeleteLeads.isPending }}
      >
        <p>Are you sure you want to delete {selectedLeads?.length} items?</p>
      </ConfirmDialog>

      <AssignOrTransferLeadsDialog
        isOpen={isAssignDialogOpen}
        onClose={() => {
          setIsAssignDialogOpen(false);
          setMakeFresh(false);
        }}
        projects={projects as any}
        selectedGroupBy={selectedGroupBy}
        groupedLeadsTransformLeads={groupedLeadsTransformLeads}
        transformLeads={transformLeads}
        selectedProjectId={selectedProjectId ?? ''}
        selectedAgentId={selectedAgentId ?? ''}
        selectLeadPrice={selectLeadPrice ?? ''}
        customPrice={customPrice as number}
        makeFresh={makeFresh}
        isSubmitting={isSubmitting}
        getProjectAgents={getProjectAgents as any}
        getUserLogin={getUserLogin as any}
        handleProjectChange={handleProjectChange}
        handleAssignSubmit={handleAssignSubmit}
        handleAssignSubmitTransform={handleAssignSubmitTransform}
        setSelectedLeadPrice={setSelectedLeadPrice}
        setSelectedAgentId={setSelectedAgentId}
        setSelectedProjectId={setSelectedProjectId}
        setCustomPrice={setCustomPrice}
        setMakeFresh={setMakeFresh}
        isClosedLeads={!!closeProjectId}
        currentProjectId={getCurrentProjectAndAgent?.currentProjectId}
        currentAgentId={getCurrentProjectAndAgent?.currentAgentId}
        setRestoreArchived={setRestoreArchived}
        restoreArchived={restoreArchived}
      />

      <ReclamationDialog
        isOpen={isReclamationDialogOpen}
        onClose={() => setIsReclamationDialogOpen(false)}
        reclamationReason={reclamationReason}
        setReclamationReason={setReclamationReason}
        isSubmitting={isSubmittingReclamation}
        onSubmit={handleReclamationSubmit}
      />

      <CloseProjectDialog
        isOpen={isCloseProjectDialogOpen}
        onClose={() => {
          setCloseProjectCurrentStatus('');
          setCloseProjectNotes('');
          setIsCloseProjectDialogOpen(false);
        }}
        closureReason={closureReason}
        setClosureReason={setClosureReason}
        closeProjectCurrentStatus={closeProjectCurrentStatus}
        setCloseProjectCurrentStatus={setCloseProjectCurrentStatus}
        closeProjectNotes={closeProjectNotes}
        setCloseProjectNotes={setCloseProjectNotes}
        isSubmitting={closeProjectMutation?.isPending}
        selectedLeads={selectedLeads}
        onSubmit={handleCloseProjectSubmit}
      />
    </div>
  );
};

export default LeadDataTables;
