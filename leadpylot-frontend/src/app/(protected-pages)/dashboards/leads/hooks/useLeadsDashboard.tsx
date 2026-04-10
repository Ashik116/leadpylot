import DownloadImports from '@/components/shared/DownloadImport';
import Badge from '@/components/ui/Badge';
import Checkbox from '@/components/ui/Checkbox';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';

import {
  useAssignLeads,
  useAssignLeadsTransform,
  useAssignClosedLeads,
  useRevertClosedLeads,
  useBulkDeleteLeads,
  useBulkUpdateLeads,
  useLeads,
  useApplyDomainFilters,
  useClosedLeads,
} from '@/services/hooks/useLeads';
import {
  apiSubmitReclamation,
  GetAllLeadsResponse,
  Lead,
  TLead,
  apiGetLeads,
} from '@/services/LeadsService';
import { apiGetProjects } from '@/services/ProjectsService';
import { apiUpdateTodo } from '@/services/ToDoService';
import { useBulkSearchStore } from '@/stores/bulkSearchStore';
import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';
import {
  useLeadsNavigationStore,
  useFilterAwareLeadsNavigationStore,
} from '@/stores/navigationStores';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import {
  hasMeaningfulDomainFilters,
  normalizeDomainFiltersForApi,
  filtersToQueryParams,
} from '@/utils/filterUtils';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import { useApiUrlStore } from '@/stores/apiUrlStore';
import classNames from '@/utils/classNames';
import getDuplicateStatusColor from '@/utils/getDuplicateStatusColor';
import { DEFAULT_PAGE_LIMIT } from '@/constants/pagination.constant';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
import { useLeadSourceValidation } from '@/utils/hooks/useLeadSourceValidation';
import { useSession } from '@/hooks/useSession';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useColumnCustomization } from '@/hooks/useColumnCustomization';
import { useRoleBasedColumns } from '@/hooks/useRoleBasedColumns';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import TodoList from '../../todo/_components/TodoList';
import useFrontendSorting from '@/hooks/useFrontendSorting';
import CellInlineEdit from '@/components/shared/CellInlineEdit';
import { useQueryClient } from '@tanstack/react-query';
import { useAllProjects } from '@/services/hooks/useProjects';
import useDoubleTapDataUpdateChanges from '@/hooks/useDoubleTapDataUpdateChanges';
import ProjectDoubleTapCell from '@/components/ProjectDoubleTapCell';
import AgentDoubleTapCell from '@/components/shared/AgentDoubleTapCell';
import useNotification from '@/utils/hooks/useNotification';
import { dateFormateUtils, DateFormatType } from '@/utils/dateFormateUtils';
import { ColumnDef, OnSortParam } from '@/components/shared/DataTable/types';
import { useStatusBadgeColors } from '@/utils/utils';
import { Role } from '@/configs/navigation.config/auth.route.config';
import useIsClient from '@/utils/hooks/useIsClient';
import { IN_USE_STATUS, IN_USE_STATUS_OPTIONS } from '@/components/ui/utils/constants';
interface Project {
  _id: string;
  name: string;
  agents?: Array<{
    _id: string;
    user?: string | { _id?: string; id?: string; name?: string };
    alias_name?: string;
    active: boolean;
  }>;
}

interface SelectOption {
  value: string;
  label: string;
}

interface LeadsDashboardProps {
  data?: Lead[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPaginationChange?: React.Dispatch<React.SetStateAction<number>>;
  onPageSizeChange?: React.Dispatch<React.SetStateAction<number>>;
  pendingLeadsComponent?: boolean;
  recentImport?: boolean;
  tableName?: string; // Add tableName support
  projectNameFromDetailsPage?: string;
  externalProjectId?: string;
  // Add filter chain support
  externalFilters?: any[]; // Filters from the filter chain
  filterData?: number; // Import filter data
  // Add option to disable API calls (for grouped mode)
  disableApiCall?: boolean;
  // Closed project ID for closed leads API
  closeProjectId?: string;
}

export const useLeadsDashboard = ({
  data: externalData,
  loading: externalLoading,
  total: externalTotal,
  page: externalPage,
  pageSize: externalPageSize,
  onPaginationChange: externalOnPaginationChange,
  onPageSizeChange: externalOnPageSizeChange,
  pendingLeadsComponent,
  recentImport = false,
  tableName = 'leads', // Default table name
  projectNameFromDetailsPage,
  externalProjectId,
  filterData: externalFilterData,
  // Add option to disable API calls (for grouped mode)
  disableApiCall = false,
  closeProjectId,
}: LeadsDashboardProps = {}) => {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'Admin';
  const isAgentRole = session?.user?.role === Role.AGENT;
  const search = searchParams.get('search');
  const pathName = usePathname();
  // const showinactive = searchParams.get('showInactive')
  const showinactive = pathName.includes('archived');
  const showInTodo = pathName?.includes('/todo');
  const showInTickets = pathName?.includes('/tickets');
  const liveLeads = pathName?.includes('live-leads');
  const recycleLeads = pathName?.includes('recycle-leads');
  const holds = pathName?.includes('holds');
  const termin = pathName?.includes('termin');
  const scheduledLeadsPage = pathName?.includes('scheduled-leads');
  const allLeadsPage = pathName === '/dashboards/leads';
  const calendarPage = pathName?.includes('calendar');
  const hideSelectionCheckbox = isAgentRole && (liveLeads || recycleLeads || showinactive);
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(DEFAULT_PAGE_LIMIT);
  const page = externalPage !== undefined ? externalPage : internalPage;
  const pageSize = externalPageSize !== undefined ? externalPageSize : internalPageSize;

  const setPage = externalOnPaginationChange || setInternalPage;
  const setPageSize = externalOnPageSizeChange || setInternalPageSize;
  const currentProject = useSelectedProjectStore();
  const projectId = currentProject?.selectedProject?._id;
  // Handle "All Projects" selection - don't filter by project name
  const effectiveProjectId = projectId === 'all' ? undefined : projectId;
  const role = session?.user?.role;
  const agentName = session?.user?.name;
  // Get status from URL params and convert to number if it exists
  const statusParam = searchParams.get('status');
  const totalParam = searchParams.get('total');
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');
  const parsedStatus = statusParam ? parseInt(statusParam, 10) : undefined;
  const parsedTotal = totalParam ? parseInt(totalParam, 10) : 0;
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [makeFresh, setMakeFresh] = useState<boolean>(false);
  const [restoreArchived, setRestoreArchived] = useState<boolean>(false);

  useEffect(() => {
    if (!makeFresh) setRestoreArchived(false);
  }, [makeFresh]);

  // Initialize filter data from URL params, but only if total > 0
  // Use external filter data if provided, otherwise use URL params
  const [filterData, setFilterData] = useState<number | undefined>(
    externalFilterData !== undefined
      ? externalFilterData
      : parsedTotal && parsedTotal > 0
        ? parsedStatus
        : undefined
  );

  const { openNotification } = useNotification();

  const queryClient = useQueryClient();

  // Filter-aware navigation store - declare early so it can be used in effects
  const setFilteredItems = useFilterAwareLeadsNavigationStore((state) => state.setFilteredItems);
  const setFilterState = useFilterAwareLeadsNavigationStore((state) => state.setFilterState);
  const customFilteredItems = useFilterAwareLeadsNavigationStore((state) => state.filteredItems);
  const customFiltersMeta = useFilterAwareLeadsNavigationStore((state) => state.paginationMeta);

  // Custom domain filters applied via CustomFilterOption
  const {
    userDomainFilters,
    buildDefaultFilters,
    groupBy,
    setSorting: setStoreSorting,
  } = useUniversalGroupingFilterStore();
  const hasCustomFilters = useMemo(
    () => hasMeaningfulDomainFilters(userDomainFilters),
    [userDomainFilters]
  );
  const hasNeutralOnlyUserFilters = useMemo(
    () => (userDomainFilters?.length ?? 0) > 0 && !hasCustomFilters,
    [userDomainFilters, hasCustomFilters]
  );

  // Check if grouping is active
  const hasGrouping = useMemo(() => (groupBy?.length ?? 0) > 0, [groupBy]);

  // For agents on live-leads/recycle-leads pages, default grouping is automatically applied
  // So we should disable the regular API call even if grouping isn't set yet (to prevent race conditions)
  const isAgentOnGroupedPage = useMemo(
    () => role === 'Agent' && (liveLeads || recycleLeads),
    [role, liveLeads, recycleLeads]
  );

  // Memoize query params to ensure React Query detects changes properly
  // CRITICAL: This ensures filterData changes trigger refetches on project details page
  const leadsQueryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search || undefined,
      project_id:
        role === 'Agent'
          ? effectiveProjectId
          : projectNameFromDetailsPage
            ? externalProjectId
            : undefined,
      agent_name: role === 'Agent' ? agentName : undefined,
      use_status: pendingLeadsComponent === true ? 'pending' : undefined,
      duplicate: filterData, // CRITICAL: Include filterData so React Query detects changes
      showInactive: showinactive ? true : undefined,
      has_todo: showInTodo ? true : undefined,
      has_ticket: showInTickets ? true : undefined,
      source: liveLeads ? 'live' : recycleLeads ? 'recycle' : undefined,
      status: termin || calendarPage ? 'Hold' : undefined,
      has_schedule: scheduledLeadsPage ? true : undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      includeAll: allLeadsPage ? true : undefined,
      domain: hasNeutralOnlyUserFilters
        ? JSON.stringify(normalizeDomainFiltersForApi(userDomainFilters))
        : undefined,
    }),
    [
      page,
      pageSize,
      search,
      role,
      effectiveProjectId,
      projectNameFromDetailsPage,
      externalProjectId,
      agentName,
      pendingLeadsComponent,
      filterData, // CRITICAL: Include filterData in dependencies
      showinactive,
      showInTodo,
      liveLeads,
      recycleLeads,
      scheduledLeadsPage,
      sortBy,
      sortOrder,
      allLeadsPage,
      termin,
      calendarPage,
      showInTickets,
      hasNeutralOnlyUserFilters,
      userDomainFilters,
    ]
  );

  // Default filters converted to query params for domain-filtered requests
  const defaultFiltersAsQueryParams = useMemo(
    () => ({
      ...(allLeadsPage ? { includeAll: true } : {}),
      ...filtersToQueryParams(buildDefaultFilters?.() ?? []),
    }),
    [buildDefaultFilters, allLeadsPage]
  );

  // Closed leads query params
  const closedLeadsQueryParams = useMemo(
    () => ({
      project_id: closeProjectId,
      page,
      limit: pageSize,
      sortBy: sortBy || 'closed_at',
      sortOrder: sortOrder ? parseInt(String(sortOrder), 10) : -1,
      contact_name: search || undefined,
      duplicate: filterData,
    }),
    [closeProjectId, page, pageSize, sortBy, sortOrder, search, filterData]
  );

  // Data fetching for leads by default - MUST be declared before effects that use refetchLeads
  // CRITICAL: When disableApiCall is true OR grouping is active OR agent is on live-leads/recycle-leads, completely disable the query to prevent any API calls
  // For agents on live-leads/recycle-leads pages, default grouping is automatically applied, so only the grouped summary API should be called
  const {
    data: leadsData,
    isLoading: leadTableLoading,
    isRefetching,
    refetch: refetchLeads,
  } = useLeads<GetAllLeadsResponse>(leadsQueryParams, {
    enabled: !disableApiCall && !closeProjectId && !hasGrouping && !isAgentOnGroupedPage, // Disable when grouping is active, agent on grouped page, using closed leads, OR when custom filters are applied
  });

  // Data fetching for closed leads when closeProjectId is provided
  const {
    data: closedLeadsData,
    isLoading: isClosedLeadsLoading,
    isRefetching: isClosedLeadsRefetching,
    refetch: refetchClosedLeads,
  } = useClosedLeads(closedLeadsQueryParams, {
    enabled: !disableApiCall && !!closeProjectId, // Only enable when closeProjectId is provided
  });

  // Use closed leads data when closeProjectId is provided, otherwise use regular leads data
  const effectiveLeadsData = closeProjectId ? closedLeadsData : leadsData;
  const effectiveIsLoading = closeProjectId && isClosedLeadsLoading;
  const effectiveIsRefetching = closeProjectId ? isClosedLeadsRefetching : isRefetching;
  const effectiveRefetch = closeProjectId ? refetchClosedLeads : refetchLeads;

  // Update filterData when externalFilterData changes
  useEffect(() => {
    // Update filterData when externalFilterData changes, including when it becomes undefined
    if (externalFilterData !== filterData) {
      setFilterData(externalFilterData);
      // Force refetch when filterData changes - CRITICAL for project details page
      // Invalidate queries AND explicitly refetch to ensure API call happens
      // CRITICAL: Don't refetch if grouping is active or agent is on grouped page
      if (!disableApiCall && !hasGrouping && !isAgentOnGroupedPage && effectiveRefetch) {
        // Small delay to ensure state has propagated
        const timeoutId = setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: closeProjectId ? ['closed-leads'] : ['leads'],
          });
          // Explicitly refetch to ensure API call happens even if query is considered "fresh"
          effectiveRefetch();
        }, 50);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [
    externalFilterData,
    filterData,
    disableApiCall,
    hasGrouping,
    isAgentOnGroupedPage,
    queryClient,
    effectiveRefetch,
    closeProjectId,
  ]);

  // Store current page data with pagination metadata in navigation store
  useEffect(() => {
    // CRITICAL: Don't store data if grouping is active or agent is on grouped page (no regular API data)
    if (
      !disableApiCall &&
      !hasGrouping &&
      !isAgentOnGroupedPage &&
      effectiveLeadsData?.data &&
      effectiveLeadsData?.meta
    ) {
      const meta = effectiveLeadsData.meta;
      const paginationMeta = {
        page: meta.page || page,
        limit: meta.limit || pageSize,
        total: meta.total || 0,
        pages: meta.pages || Math.ceil((meta.total || 0) / (meta.limit || pageSize)),
      };

      // Update filter-aware navigation store with current page data and meta
      setFilteredItems(effectiveLeadsData.data, paginationMeta);
      setFilterState({
        search: search || undefined,
        duplicate: filterData,
        use_status: pendingLeadsComponent === true ? 'pending' : undefined,
        showInactive: showinactive ? true : undefined,
        has_todo: showInTodo ? true : undefined,
        source: liveLeads ? 'live' : recycleLeads ? 'recycle' : undefined,
        project_id: closeProjectId
          ? closeProjectId
          : role === 'Agent'
            ? effectiveProjectId
            : projectNameFromDetailsPage
              ? externalProjectId
              : undefined,
        agent_name: role === 'Agent' ? agentName : undefined,
        status: holds ? 'Hold' : undefined,
        has_schedule: scheduledLeadsPage ? true : undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        paginationMeta,
      });
    }
  }, [
    disableApiCall,
    hasGrouping,
    isAgentOnGroupedPage,
    effectiveLeadsData,
    page,
    pageSize,
    search,
    role,
    effectiveProjectId,
    projectNameFromDetailsPage,
    externalProjectId,
    agentName,
    pendingLeadsComponent,
    filterData,
    showinactive,
    showInTodo,
    liveLeads,
    recycleLeads,
    holds,
    scheduledLeadsPage,
    sortBy,
    sortOrder,
    setFilteredItems,
    setFilterState,
    closeProjectId,
  ]);

  // Build API URL from current filters and pagination
  const buildApiUrl = useCallback(() => {
    const baseUrl = '/leads';
    const params = new URLSearchParams();

    // Add pagination
    params.set('page', page.toString());
    params.set('limit', pageSize.toString());

    // Add includeAll parameter for leads page
    if (allLeadsPage) {
      params.set('includeAll', 'true');
    }

    // Add filters
    if (search) params.set('search', search);
    if (role === 'Agent' && effectiveProjectId) {
      params.set('project_id', effectiveProjectId);
    } else if (projectNameFromDetailsPage && externalProjectId) {
      params.set('project_id', externalProjectId);
    }
    if (role === 'Agent' && agentName) params.set('agent_name', agentName);
    if (pendingLeadsComponent) params.set('use_status', 'pending');
    if (filterData !== undefined) params.set('duplicate', filterData.toString());
    if (showinactive) params.set('showInactive', 'true');
    if (showInTodo) params.set('has_todo', 'true');
    if (liveLeads) params.set('source', 'live');
    if (recycleLeads) params.set('source', 'recycle');
    // Termin page actually uses status=Hold (same as calendar)
    if (termin || calendarPage) params.set('status', 'Hold');
    if (scheduledLeadsPage) params.set('has_schedule', 'true');
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);

    return `${baseUrl}?${params.toString()}`;
  }, [
    page,
    pageSize,
    allLeadsPage,
    search,
    role,
    effectiveProjectId,
    projectNameFromDetailsPage,
    externalProjectId,
    agentName,
    pendingLeadsComponent,
    filterData,
    showinactive,
    showInTodo,
    liveLeads,
    recycleLeads,
    termin,
    calendarPage,
    scheduledLeadsPage,
    sortBy,
    sortOrder,
  ]);

  // Automatically set API URL when page loads or filters change
  useEffect(() => {
    if (!disableApiCall && leadsData?.data && leadsData?.meta) {
      const apiUrl = buildApiUrl();
      const { setApiUrl } = useApiUrlStore.getState();
      setApiUrl(apiUrl);
    }
  }, [disableApiCall, leadsData?.data, leadsData?.meta, buildApiUrl]);

  const bulkUpdateMutationLeads = useBulkUpdateLeads();
  const assignLeadsMutation = useAssignLeads({ queryKey: ['leads'] });
  const assignLeadsMutationTransform = useAssignLeadsTransform({ queryKey: ['leads'] });
  const assignClosedLeadsMutation = useAssignClosedLeads({ queryKey: ['closed-leads'] });
  const revertClosedLeadsMutation = useRevertClosedLeads({ queryKey: ['closed-leads'] });
  const bulkDeleteMutationLeads = useBulkDeleteLeads();
  const { onAppendQueryParams } = useAppendQueryParams();
  const router = useRouter();
  // Selected items store for global state management - single source of truth
  const { getSelectedItems, getSelectedIds, setSelectedItems, clearSelectedItems } =
    useSelectedItemsStore();

  // Get selected lead IDs from store (reactive)
  const selectedLeads = getSelectedIds('leads');

  const { isSameSource, sourceLeadPrice } = useLeadSourceValidation({
    leads: leadsData?.data ?? [],
    selectedLeadIds: selectedLeads,
  });
  const [transformLeads, setTransformLeads] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isReclamationDialogOpen, setIsReclamationDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectLeadPrice, setSelectedLeadPrice] = useState<string | boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [updateConfirmDialogOpen, setUpdateConfirmDialogOpen] = useState(false);
  const [reclamationReason, setReclamationReason] = useState('');
  const [isLeadsDialogOpen, setIsLeadsDialogOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isSubmittingReclamation, setIsSubmittingReclamation] = useState(false);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [leadDetailsViewOpen, setLeadDetailsViewOpen] = useState(false);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<Lead | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pathname = pathName;
  const addLeads = useLeadsNavigationStore((state) => state.setItems);
  const setTotalLeads = useLeadsNavigationStore((state) => state.setTotalItems);
  const isClient = useIsClient();

  const handleOpenLeadDetails = (lead: Lead) => {
    setSelectedLeadForDetails(lead);
    setLeadDetailsViewOpen(true);
  };
  const handleCloseLeadDetailsView = () => {
    setLeadDetailsViewOpen(false);
    setSelectedLeadForDetails(null);
  };

  // clear selected items when pathname changes
  useEffect(() => {
    return () => {
      setSelectedItems([], 'leads');
    };
  }, [pathname, setSelectedItems]); // only depend on pathname

  // Effect to handle switching between regular leads and closed leads
  // This ensures data is cleared and refetched when navigating between pages
  useEffect(() => {
    if (disableApiCall) return;

    // When closeProjectId changes, invalidate the opposite query and clear selections
    if (closeProjectId) {
      // Switching to closed leads - invalidate regular leads cache
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      // Clear selections when switching modes
      setSelectedItems([], 'leads');
      // Force refetch closed leads to ensure fresh data
      refetchClosedLeads();
    } else {
      // Switching to regular leads - invalidate closed leads cache
      queryClient.invalidateQueries({ queryKey: ['closed-leads'] });
      //   remove refetchLeads function use the queryClient to invalidate the query by -rejoan-
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      // Clear selections when switching modes
      setSelectedItems([], 'leads');
      // Force refetch regular leads to ensure fresh data
    }
  }, [closeProjectId, disableApiCall, queryClient, setSelectedItems, refetchClosedLeads]);

  const { data: allProjects } = useAllProjects({ limit: 100 });

  // Task Detail Modal handlers
  const handleOpenTaskDetail = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setIsTaskDetailModalOpen(true);
  }, []);

  const handleCloseTaskDetail = useCallback(() => {
    setIsTaskDetailModalOpen(false);
    setSelectedTaskId(null);
  }, []);

  // Todo update function
  const updateTodo = useCallback(
    async (id: string, updates: { isDone?: boolean; message?: string }) => {
      try {
        await apiUpdateTodo(id, updates);

        // Use the same comprehensive invalidation logic as useAssignTodo
        // 1) Invalidate only leads queries that include has_todo filter
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key0 = query.queryKey[0] as unknown;
            const key1 = query.queryKey[1] as Record<string, unknown> | undefined | null;
            const hasTodoParam =
              key1 !== undefined &&
              key1 !== null &&
              typeof key1 === 'object' &&
              (key1 as any).has_todo === true;
            return key0 === 'leads' && hasTodoParam;
          },
        });

        // 2) Invalidate grouped leads queries (no removal, no explicit refetch)
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key0 = query.queryKey[0] as unknown;
            return key0 === 'grouped-leads' || key0 === 'group-leads';
          },
        });

        // 3) Invalidate todo-specific lists used by the Todo dashboard
        queryClient.invalidateQueries({ queryKey: ['todos'] });
        queryClient.invalidateQueries({ queryKey: ['assigned-todos'] });
        queryClient.invalidateQueries({ queryKey: ['extra-todos'] });

        // 4) Also invalidate basic leads queries
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['my-tasks', 'pending-count'] });

        // 5) Invalidate current user query to update totalPendingTodo count
        queryClient.invalidateQueries({ queryKey: ['current-user'] });

        toast.push(<Notification type="success">Todo updated successfully</Notification>);
      } catch {
        toast.push(
          <Notification title="Error" type="danger">
            Failed to update todo
          </Notification>
        );
      }
    },
    [queryClient]
  );

  // Bulk search state
  const {
    isBulkSearchMode,
    bulkSearchResults,
    bulkSearchQuery,
    isLoading: bulkSearchLoading,
    clearBulkSearch,
    refetchBulkSearch,
  } = useBulkSearchStore();

  // Dynamic filters state
  const {
    isDynamicFilterMode,
    dynamicFilterResults,
    dynamicFilterQuery,
    isLoading: dynamicFilterLoading,
    total: dynamicFilterTotal,
    page: dynamicFilterPage,
    pageSize: dynamicFilterPageSize,
    clearDynamicFilters,
    setSort,
    setDynamicFilterMode,
    setDynamicFilterResults,
    setDynamicFilterQuery,
    setCustomFilters,
    setLoading: setDynamicLoading,
    setTotal: setDynamicTotal,
    setPage: setDynamicPage,
    setPageSize: setDynamicPageSize,
    setHasNextPage: setDynamicHasNextPage,
    setHasPrevPage: setDynamicHasPrevPage,
    setFilterSource,
  } = useDynamicFiltersStore();

  // Auto-restore saved dynamic filters from localStorage on page refresh
  const applyDynamicFiltersMutation = useApplyDomainFilters();

  useEffect(() => {
    // Only run once on mount, skip for project-specific pages
    if (disableApiCall || projectNameFromDetailsPage) return;

    // Check localStorage for saved API URL
    const { apiUrl } = useApiUrlStore.getState();
    if (!apiUrl || apiUrl !== '/dynamic-filters/apply') return;

    // Get saved POST body from sessionStorage (not from URL!)
    // Use single key: dynamic-filters-body (both StatusFilter and DynamicFilters use same API)
    try {
      const savedBody = sessionStorage.getItem('dynamic-filters-body');
      if (!savedBody) return;

      const { filters, sortBy, sortOrder } = JSON.parse(savedBody);
      if (!Array.isArray(filters) || filters.length === 0) return;

      // Auto-apply the saved filters via POST request
      setDynamicLoading(true);
      applyDynamicFiltersMutation.mutate(
        {
          filters,
          page: 1,
          limit: DEFAULT_PAGE_LIMIT,
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder }),
        },
        {
          onSuccess: (data) => {
            // Restore dynamic filter state
            setDynamicFilterMode(true);
            setDynamicFilterResults(data.data || []);
            setDynamicFilterQuery(filters);
            setCustomFilters(filters);

            // Handle nested pagination structure
            const dynamicFilterData = data as any;
            const pagination = dynamicFilterData.meta?.pagination;
            setDynamicTotal(pagination?.total || 0);
            setDynamicPage(pagination?.page || 1);
            setDynamicPageSize(pagination?.limit || DEFAULT_PAGE_LIMIT);
            setDynamicHasNextPage(pagination?.hasNextPage || false);
            setDynamicHasPrevPage(pagination?.hasPrevPage || false);
            setFilterSource('custom');
            setDynamicLoading(false);

            // Update navigation store
            const paginationMeta = pagination
              ? {
                page: pagination.page || 1,
                limit: pagination.limit || DEFAULT_PAGE_LIMIT,
                total: pagination.total || 0,
                pages: Math.ceil(
                  (pagination.total || 0) / (pagination.limit || DEFAULT_PAGE_LIMIT)
                ),
              }
              : undefined;

            setFilteredItems(data.data || [], paginationMeta);
            setFilterState({
              isDynamicFilterMode: true,
              dynamicFilters: filters,
              isGroupedMode: false,
              paginationMeta,
              apiUrl,
              sortBy,
              sortOrder,
            });
          },
          onError: () => {
            setDynamicLoading(false);
          },
        }
      );
    } catch {
      // Silent fail - user can manually reapply filters if needed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Create a conditional refetch function that uses bulk search store's refetch when in bulk search mode
  // or dynamic filters store's refetch when in dynamic filter mode
  const conditionalRefetch = useCallback(async () => {
    if (isBulkSearchMode) {
      // Use store's refetch function for bulk search
      await refetchBulkSearch();
    } else if (isDynamicFilterMode) {
      // CRITICAL: Refetch dynamic filters POST request when in dynamic filter mode
      // This ensures UI updates immediately after mutations (update, delete, etc.)
      const dynamicFiltersStore = useDynamicFiltersStore.getState();
      if (dynamicFiltersStore.refetchDynamicFilters) {
        await dynamicFiltersStore.refetchDynamicFilters(
          dynamicFiltersStore.page,
          dynamicFiltersStore.pageSize
        );
      }
    } else {
      // Use regular refetch for GET requests - CRITICAL: This ensures filters trigger API calls
      //   if (refetchLeads && !disableApiCall) {
      //     await refetchLeads();
      //   }
    }
  }, [isBulkSearchMode, isDynamicFilterMode, refetchBulkSearch]);

  useEffect(() => {
    if (leadsData?.data) {
      addLeads(leadsData?.data);
      if (leadsData?.meta?.total) {
        setTotalLeads(leadsData?.meta?.total);
      }
    }
  }, [
    leadsData?.data,
    leadsData?.meta?.total,
    addLeads,
    setTotalLeads,
    filterData,
    currentProject,
  ]);

  // Sync filtered results with filter-aware navigation store
  useEffect(() => {
    let currentFilteredData: Lead[] = [];
    let currentFilterState: any = null;

    // Determine which data to use based on current filter mode
    if (isBulkSearchMode && bulkSearchResults) {
      currentFilteredData = bulkSearchResults;
      currentFilterState = {
        isBulkSearchMode: true,
        bulkSearch: bulkSearchQuery,
      };
    } else if (isDynamicFilterMode && dynamicFilterResults) {
      // Don't update navigation store for dynamic filter mode
      // StatusFilter and DynamicFilters components handle their own navigation store updates
      return;
    } else if (leadsData?.data) {
      // Use regular leads data (may be filtered by API)
      currentFilteredData = leadsData.data;

      // CRITICAL: Build paginationMeta from leadsData.meta
      // This ensures we have the correct total (353) not just page limit (50)
      const paginationMeta = leadsData.meta
        ? {
          page: leadsData.meta.page || page,
          limit: leadsData.meta.limit || pageSize,
          total: leadsData.meta.total || 0,
          pages:
            leadsData.meta.pages ||
            Math.ceil((leadsData.meta.total || 0) / (leadsData.meta.limit || pageSize)),
        }
        : undefined;

      currentFilterState = {
        search: search || undefined,
        duplicate: filterData,
        use_status: pendingLeadsComponent === true ? 'pending' : undefined,
        showInactive: showinactive ? true : undefined,
        has_todo: showInTodo ? true : undefined,
        source: liveLeads ? 'live' : recycleLeads ? 'recycle' : undefined,
        project_id:
          role === 'Agent' ? projectId : projectNameFromDetailsPage ? undefined : undefined,
        agent_name: role === 'Agent' ? agentName : undefined,
        status: termin ? 'Termin' : undefined,
        has_schedule: scheduledLeadsPage ? true : undefined,
        // new params for sorting
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        // CRITICAL: Include paginationMeta in filterState
        paginationMeta: paginationMeta,
      };
    }

    // Update filter-aware navigation store
    // CRITICAL: Pass meta as second parameter so store has paginationMeta
    const metaToPass = leadsData?.meta
      ? {
        page: leadsData.meta.page || page,
        limit: leadsData.meta.limit || pageSize,
        total: leadsData.meta.total || 0,
        pages:
          leadsData.meta.pages ||
          Math.ceil((leadsData.meta.total || 0) / (leadsData.meta.limit || pageSize)),
      }
      : undefined;

    setFilteredItems(currentFilteredData, metaToPass);
    setFilterState(currentFilterState);
  }, [
    isBulkSearchMode,
    bulkSearchResults,
    bulkSearchQuery,
    isDynamicFilterMode,
    dynamicFilterResults,
    dynamicFilterQuery,
    leadsData?.data,
    leadsData?.meta,
    search,
    filterData,
    pendingLeadsComponent,
    showinactive,
    showInTodo,
    liveLeads,
    recycleLeads,
    role,
    projectId,
    projectNameFromDetailsPage,
    agentName,
    setFilteredItems,
    setFilterState,
    termin,
    scheduledLeadsPage,
    page,
    pageSize,
    sortBy,
    sortOrder,
  ]);
  const { sourceOptions, allStatus, negativeAndPrivatOptions } = useDoubleTapDataUpdateChanges({
    sourcesApi: true,
    stagesApi: true,
  });

  useEffect(() => {
    if (isSameSource) {
      setCustomPrice(sourceLeadPrice);
    } else {
      setCustomPrice(0);
    }
  }, [isSameSource, sourceLeadPrice]);

  // Handle select all leads toggle
  const handleSelectAllLeads = useCallback(
    (visibleLeadIds: string[]) => {
      const effectiveDynamicFilterMode =
        isDynamicFilterMode || (!!dynamicFilterResults && dynamicFilterResults.length > 0);
      const customFilterMode = hasCustomFilters && !effectiveDynamicFilterMode && !isBulkSearchMode;

      const currentSelectedIds = getSelectedIds('leads');
      const allSelected =
        visibleLeadIds?.length > 0 &&
        visibleLeadIds?.every((id) => currentSelectedIds.includes(id));

      let newSelectedLeads: string[];

      if (allSelected) {
        newSelectedLeads = currentSelectedIds.filter((id) => !visibleLeadIds?.includes(id));
      } else {
        newSelectedLeads = [...currentSelectedIds];
        visibleLeadIds?.forEach((id) => {
          if (!newSelectedLeads.includes(id)) {
            newSelectedLeads.push(id);
          }
        });
      }

      // Get current lead objects from global store to preserve objects from other pages
      const currentSelectedObjects = getSelectedItems('leads');

      // Get the full lead objects for visible leads being toggled
      // When externalData is provided, use it instead of leadsData
      const baseData = externalData
        ? externalData
        : closeProjectId
          ? closedLeadsData?.data
          : leadsData?.data;
      const resolvedFlatData = (customFilterMode ? customFilteredItems : baseData) || [];
      const visibleLeadObjects: Record<string, any>[] = [];
      visibleLeadIds?.forEach((leadId) => {
        const foundLead = isBulkSearchMode
          ? bulkSearchResults?.find((lead: Lead) => lead?._id?.toString() === leadId)
          : effectiveDynamicFilterMode
            ? dynamicFilterResults?.find((lead: Lead) => lead._id.toString() === leadId)
            : (resolvedFlatData?.find(
              (lead: Lead) => lead._id.toString() === leadId
            ) as unknown as TLead);
        if (foundLead) {
          visibleLeadObjects.push(foundLead as Record<string, any>);
        }
      });

      // Update global store: preserve objects from other pages, update current page objects
      let updatedSelectedObjects: Record<string, any>[];

      if (allSelected) {
        // Removing visible items: keep objects not in visibleLeadIds
        const visibleLeadIdsSet = new Set(visibleLeadIds);
        updatedSelectedObjects = currentSelectedObjects?.filter(
          (obj: Record<string, any>) => !visibleLeadIdsSet.has(obj._id?.toString())
        );
      } else {
        // Adding visible items: keep existing objects + add new visible objects
        const existingObjectsMap = new Map(
          currentSelectedObjects?.map((obj: Record<string, any>) => [obj?._id?.toString(), obj])
        );

        // Add visible lead objects to the map (will overwrite if exists)
        visibleLeadObjects?.forEach((obj) => {
          existingObjectsMap.set(obj?._id?.toString(), obj);
        });

        // Convert back to array, filtered by newSelectedLeads
        const newSelectedLeadsSet = new Set(newSelectedLeads);
        updatedSelectedObjects = Array.from(existingObjectsMap?.values()).filter(
          (obj: Record<string, any>) => newSelectedLeadsSet.has(obj?._id?.toString())
        );
      }

      // Store the updated selected items in the global store (this updates selectedLeads automatically)
      setSelectedItems(updatedSelectedObjects, 'leads');

      // Check if any selected lead has use_status="in_use" - use the same data source logic
      // When externalData is provided, use it instead of leadsData
      const dataSourceForInUseCheck = externalData ? externalData : resolvedFlatData;
      const hasInUseLead = newSelectedLeads?.some((leadId) => {
        const selectedLead = isBulkSearchMode
          ? bulkSearchResults?.find((lead: Lead) => lead?._id?.toString() === leadId)
          : effectiveDynamicFilterMode
            ? dynamicFilterResults?.find((lead: Lead) => lead._id.toString() === leadId)
            : (dataSourceForInUseCheck?.find(
              (lead: Lead) => lead._id.toString() === leadId
            ) as unknown as TLead);

        const inUse = selectedLead?.use_status === 'in_use';
        if (
          inUse &&
          selectedLead?.project &&
          Array.isArray(selectedLead.project) &&
          selectedLead?.project[0]
        ) {
          setSelectedProjectId(selectedLead?.project[0]?._id);
          setSelectedAgentId(selectedLead?.project[0]?.agent?._id);
        }
        return inUse;
      });

      setTransformLeads(hasInUseLead);
    },
    [
      setSelectedItems,
      getSelectedIds,
      isDynamicFilterMode,
      dynamicFilterResults,
      isBulkSearchMode,
      bulkSearchResults,
      externalData,
      leadsData?.data,
      closedLeadsData?.data,
      closeProjectId,
      getSelectedItems,
      hasCustomFilters,
      customFilteredItems,
    ]
  );

  // Checkbox toggle for single lead
  const handleCheckboxChange = useCallback(
    (id: string) => {
      const effectiveDynamicFilterMode =
        isDynamicFilterMode || (!!dynamicFilterResults && dynamicFilterResults.length > 0);
      const customFilterMode = hasCustomFilters && !effectiveDynamicFilterMode && !isBulkSearchMode;

      const currentSelectedIds = getSelectedIds('leads');
      const newSelectedLeads = currentSelectedIds.includes(id)
        ? currentSelectedIds.filter((leadId) => leadId !== id)
        : [...currentSelectedIds, id];

      // Update the global store as well for export functionality
      // When externalData is provided, use it instead of leadsData
      const currentData = externalData
        ? externalData
        : closeProjectId
          ? closedLeadsData?.data
          : leadsData?.data;
      const resolvedData = (customFilterMode ? customFilteredItems : currentData) || [];

      const newSelectedLeadObjects = isDynamicFilterMode
        ? dynamicFilterResults?.filter((lead) =>
          newSelectedLeads?.includes(lead?._id?.toString())
        ) || []
        : isBulkSearchMode
          ? bulkSearchResults?.filter((lead) => newSelectedLeads.includes(lead._id.toString())) ||
          []
          : resolvedData?.filter((lead) => newSelectedLeads.includes(lead._id.toString())) || [];

      // Store the updated selected items in the global store (this updates selectedLeads automatically)
      setSelectedItems(newSelectedLeadObjects, 'leads');

      // Project finding logic for transformLeads
      const hasInUseLead = newSelectedLeads.some((leadId: string) => {
        const findLead = newSelectedLeadObjects?.find(
          (lead: any) => lead?._id?.toString() === leadId
        );
        // Check if the lead has use_status of "in_use" or is assigned to a project
        const inUse = findLead?.use_status === 'in_use' || !!findLead?.project?._id;

        if (inUse && findLead?.project?._id) {
          setSelectedProjectId(findLead?.project?._id);
          // For agent, we might need to check assigned_agent or other fields
          if (findLead?.assigned_agent?._id) {
            setSelectedAgentId(findLead?.assigned_agent?._id);
          }
        }

        return inUse;
      });

      setTransformLeads(hasInUseLead);
    },
    [
      getSelectedIds,
      setSelectedItems,
      isDynamicFilterMode,
      dynamicFilterResults,
      isBulkSearchMode,
      bulkSearchResults,
      externalData,
      leadsData?.data,
      closedLeadsData?.data,
      closeProjectId,
      setSelectedProjectId,
      setSelectedAgentId,
      setTransformLeads,
      hasCustomFilters,
      customFilteredItems,
    ]
  );

  // Function to check if all items across all pages are selected (not just visible)
  const areAllDisplayedItemsSelected = useCallback(() => {
    const currentSelectedIds = getSelectedIds('leads');

    // For bulk search mode, check if all bulk search results are selected
    if (isBulkSearchMode && bulkSearchResults) {
      const totalBulkResults = bulkSearchResults?.length;
      const selectedBulkIds = bulkSearchResults
        ?.map((lead: Lead) => lead?._id?.toString())
        ?.filter((id) => currentSelectedIds.includes(id));
      return totalBulkResults > 0 && selectedBulkIds?.length === totalBulkResults;
    }

    // For dynamic filter mode, check if all dynamic filter results are selected
    if (isDynamicFilterMode) {
      // Use the total from the dynamic filters store, not just current page results
      const { total: dynamicTotal } = useDynamicFiltersStore.getState();
      return dynamicTotal > 0 && currentSelectedIds.length === dynamicTotal;
    }

    // For custom domain filter mode, use filtered navigation meta
    if (hasCustomFilters) {
      const totalFiltered = customFiltersMeta?.total ?? customFilteredItems?.length ?? 0;

      if (totalFiltered === 0 || currentSelectedIds.length === 0) {
        return false;
      }

      return currentSelectedIds.length === totalFiltered;
    }

    // For regular mode, we need to check against the total data count
    // This requires knowing the total number of items available (from meta.total)
    const totalItems = closeProjectId
      ? closedLeadsData?.meta?.total || 0
      : leadsData?.meta?.total || 0;

    // If we don't have total count or no items selected, return false
    if (totalItems === 0 || currentSelectedIds.length === 0) {
      return false;
    }

    // Check if selected count equals total count
    return currentSelectedIds.length === totalItems;
  }, [
    getSelectedIds,
    isBulkSearchMode,
    bulkSearchResults,
    isDynamicFilterMode,
    leadsData?.meta?.total,
    closedLeadsData?.meta?.total,
    closeProjectId,
    hasCustomFilters,
    customFilteredItems,
    customFiltersMeta,
  ]);

  // Create a single click handler function that prevents navigation for inline edit cells

  // Columns definition (no longer memoized)
  const checkboxColumn: ColumnDef<Lead> | null = hideSelectionCheckbox
    ? null
    : {
      id: 'checkbox',
      //   size: 30,
      //   maxSize: 30,
      //   minSize: 30,
      enableResizing: false,
      // Make the checkbox column sticky during horizontal scroll
      meta: {
        style: {
          position: 'sticky',
          left: 0,
          zIndex: 11, // Changed from 3 to 11 to match other sticky columns
          background: 'white',
          width: 25, // Explicit width constraint
          minWidth: 25, // Explicit minWidth constraint
          maxWidth: 25, // Explicit maxWidth constraint
        },
      },
      header: () => {
        // Get the exact same data that's being displayed in the DataTable
        // FALLBACK: If we have dynamic filter results but mode is false, use dynamic results anyway
        const effectiveDynamicFilterMode =
          isDynamicFilterMode || (!!dynamicFilterResults && dynamicFilterResults.length > 0);
        const customFilterMode =
          hasCustomFilters && !effectiveDynamicFilterMode && !isBulkSearchMode;

        const currentDisplayedData = isBulkSearchMode
          ? bulkSearchResults
          : effectiveDynamicFilterMode
            ? dynamicFilterResults
            : customFilterMode
              ? customFilteredItems
              : externalData
                ? externalData
                : (closeProjectId ? closedLeadsData?.data : leadsData?.data) || [];

        const currentSelectedIds = getSelectedIds('leads');
        const visibleLeadIds =
          currentDisplayedData?.map((lead: Lead) => lead?._id?.toString()) || [];
        const allSelected =
          visibleLeadIds?.length > 0 &&
          visibleLeadIds?.every((id: string) => currentSelectedIds.includes(id));

        // Check if ALL items across all pages are selected (not just visible)
        const areAllItemsSelected = (() => {
          // For bulk search mode, check if all bulk search results are selected
          if (isBulkSearchMode && bulkSearchResults) {
            const totalBulkResults = bulkSearchResults?.length;
            return currentSelectedIds.length === totalBulkResults;
          }

          // For dynamic filter mode, check if all dynamic filter results are selected
          if (isDynamicFilterMode && dynamicFilterResults) {
            // We need to check against the total filtered results, not just current page
            // Get the total from the dynamic filters store
            const { total: dynamicTotal } = useDynamicFiltersStore.getState();
            return dynamicTotal > 0 && currentSelectedIds.length === dynamicTotal;
          }

          if (customFilterMode) {
            const totalFiltered = customFiltersMeta?.total ?? customFilteredItems?.length ?? 0;
            return totalFiltered > 0 && currentSelectedIds.length === totalFiltered;
          }

          // For regular mode, check against total data count
          const totalItems = closeProjectId
            ? closedLeadsData?.meta?.total || 0
            : leadsData?.meta?.total || 0;
          return totalItems > 0 && currentSelectedIds.length === totalItems;
        })();

        return (
          <div>
            <Checkbox
              checked={allSelected}
              onChange={() => {
                if (areAllItemsSelected) {
                  // If ALL items across all pages/filters are selected, unselect ALL
                  setSelectedItems([], 'leads');
                } else if (allSelected) {
                  // If all visible items are selected but not ALL items, remove only visible items
                  handleSelectAllLeads(visibleLeadIds);
                } else {
                  // If not all visible items are selected, add them to selection
                  handleSelectAllLeads(visibleLeadIds);
                }
              }}
              disabled={leadTableLoading || isClosedLeadsLoading}
            />
          </div>
        );
      },
      cell: ({ row }: { row: any }) => {
        const id = row.original?._id?.toString();
        const currentSelectedIds = getSelectedIds('leads');
        const isSelected = currentSelectedIds.includes(id);

        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleCheckboxChange(id);
            }}
          >
            <Checkbox checked={isSelected} />
          </div>
        );
      },
    };

  const allColumns: ColumnDef<Lead>[] = [
    ...(checkboxColumn ? [checkboxColumn] : []),
    // {
    //   id: 'expander',
    //   size: 50,
    //   maxSize: 50,
    //   minSize: 50,
    //   enableResizing: false,
    //   header: () => null,
    //   cell: ({ row }: { row: any }) => (
    //     <div
    //       onClick={(e) => {
    //         e.stopPropagation();
    //         e.preventDefault();
    //         const id = row.original?._id?.toString();

    //         setExpandedRowId(expandedRowId === id ? null : id);
    //       }}
    //       data-no-navigate="true"
    //       className="flex h-full cursor-pointer items-center justify-center"
    //     >
    //       {expandedRowId === row.original?._id?.toString() ? (
    //         <ApolloIcon name="chevron-arrow-down" className="text-2xl" />
    //       ) : (
    //         <ApolloIcon name="chevron-arrow-right" className="text-2xl" />
    //       )}
    //     </div>
    //   ),
    // },
    // Close Lead Status column - only show for closed leads, placed early in the table
    ...(closeProjectId
      ? [
        {
          id: 'closeLeadStatus',
          header: () => <span className="whitespace-nowrap">Close Status</span>,
          accessorKey: 'closeLeadStatus',
          enableSorting: false,
          columnWidth: 90,
          cell: (props: any) => {
            const closeLeadStatus = props.row.original?.closeLeadStatus?.toLowerCase() ?? '';

            const closeLeadStatusBadgeColors: Record<string, string> = {
              fresh: 'bg-evergreen',
              revert: 'bg-ember',
              assigned: 'bg-ocean-2',
              default: 'bg-sand-2',
            };

            const statusDisplay = closeLeadStatus || '-';
            const badgeColor =
              closeLeadStatusBadgeColors[closeLeadStatus] || closeLeadStatusBadgeColors.default;

            return (
              <div>
                <Badge
                  className={classNames(
                    'max-w-20 truncate px-1 h-5 flex items-center justify-center text-xs capitalize',
                    badgeColor
                  )}
                  innerClass="text-nowrap"
                  content={statusDisplay}
                />
              </div>
            );
          },
        },
        {
          id: 'closed_at',
          header: () => <span className="whitespace-nowrap">Closed At</span>,
          accessorKey: 'closed_at',
          enableSorting: true,
          columnWidth: 95,
          cell: ({ row }: { row: any }) => {
            const closedAt = row.original?.closed_at;
            if (!closedAt) return <span className="text-gray-400">-</span>;

            const formattedDate = dateFormateUtils(closedAt, DateFormatType.SHOW_DATE);

            return (
              <div className="text-sm">
                <div className="font-medium">{formattedDate}</div>
              </div>
            );
          },
        },
        {
          id: 'current_status',
          header: () => <span className="whitespace-nowrap">Current Status</span>,
          accessorKey: 'current_status',
          enableSorting: false,
          columnWidth: 120,
          cell: ({ row }: { row: any }) => {
            const cs = row.original?.current_status;
            const label =
              cs && typeof cs === 'object' && cs !== null && 'name' in cs
                ? String((cs as { name?: string }).name ?? '').trim()
                : typeof cs === 'string'
                  ? cs.trim()
                  : '';
            return <span className="text-sm font-medium">{label || '-'}</span>;
          },
        },
      ]
      : []),
    ...(tableName === 'termin'
      ? [
        {
          id: 'appointment_description',
          header: () => <span className="whitespace-nowrap">Description</span>,
          accessorKey: 'appointments',
          enableSorting: false,
          columnWidth: 220,
          cell: ({ row }: { row: any }) => {
            const appt = row.original?.appointments?.[0];
            return <span className="text-sm">{appt?.description || '-'}</span>;
          },
        },
        {
          id: 'appointment_date',
          header: () => <span className="whitespace-nowrap">Appointment At</span>,
          accessorKey: 'appointments',
          enableSorting: true,
          columnWidth: 160,
          cell: ({ row }: { row: any }) => {
            const appt = row.original?.appointments?.[0];
            const dateVal = appt?.appointment_date;
            if (!dateVal) return <span className="text-gray-400">-</span>;
            const formatted = dateFormateUtils(dateVal, DateFormatType.SHOW_DATE);
            return (
              <div className="text-sm">
                <div className="font-medium">{formatted}</div>
              </div>
            );
          },
        },
      ]
      : []),
    {
      id: 'agent',
      header: () => (
        <span className="whitespace-nowrap"> {closeProjectId ? 'Prev Agent' : 'Agent'}</span>
      ),
      accessorKey: 'agent',
      enableSorting: true,
      columnWidth: 101,
      minSize: 10,

      cell: (props: any) => {
        const lead = props.row.original;
        // Try multiple possible paths for agent information, prioritizing the most common ones
        return (
          <AgentDoubleTapCell
            props={props}
            lead={lead}
            allProjects={allProjects}
            selectOptionClassName="min-w-fit"
          />
        );
      },
    },
    {
      id: 'project_name',
      header: () => (
        <span className="whitespace-nowrap">
          {' '}
          {closeProjectId ? 'Prev Project' : allLeadsPage ? 'Project' : 'Project'}{' '}
        </span>
      ),
      accessorKey: 'project.name',
      enableSorting: true,
      columnWidth: 132,

      cell: (props: any) => {
        const lead = props.row.original;
        return (
          <ProjectDoubleTapCell
            props={props}
            lead={lead}
            allProjects={allProjects}
            selectOptionClassName="min-w-fit"
          />
        );
      },
    },
    // Prev Agent / Prev Project from prev_user_id / prev_team_id — not on close-project bank:
    // those rows already use agent + project_name columns labeled "Prev Agent" / "Prev Project".
    ...(closeProjectId
      ? []
      : [
        {
          id: 'prev_agent',
          header: () => <span className="whitespace-nowrap">Prev Agent</span>,
          accessorKey: 'prev_user_id.login',
          enableSorting: true,
          columnWidth: 125,
          cell: ({ row }: { row: any }) => {
            const prevAgent = row.original?.prev_user_id?.login;
            return <span className="text-sm font-medium">{prevAgent || '-'}</span>;
          },
        },
        {
          id: 'prev_project',
          header: () => <span className="whitespace-nowrap">Prev Project</span>,
          accessorKey: 'prev_team_id.name',
          enableSorting: true,
          columnWidth: 134,
          cell: ({ row }: { row: any }) => {
            const prevProject = row.original?.prev_team_id?.name;
            return <span className="text-sm font-medium">{prevProject || '-'}</span>;
          },
        },
      ]),
    {
      id: 'source_agent',
      header: () => <span className="whitespace-nowrap">Src Agent</span>,
      accessorKey: 'source_agent.login',
      enableSorting: true,
      columnWidth: 109,
      cell: ({ row }: { row: any }) => {
        const sourceAgent = row.original?.source_agent?.login;
        return <span className="text-sm font-medium">{sourceAgent || '-'}</span>;
      },
    },
    {
      id: 'source_project',
      header: () => <span className="whitespace-nowrap">Src Project</span>,
      accessorKey: 'source_project.name',
      enableSorting: true,
      columnWidth: 126,
      cell: ({ row }: { row: any }) => {
        const sourceProject = row.original?.source_project?.name;
        return <span className="text-sm font-medium">{sourceProject || '-'}</span>;
      },
    },
    {
      id: 'lead_source_no',
      header: () => <span className="whitespace-nowrap">Lead ID</span>,
      accessorKey: 'lead_source_no',
      enableSorting: true,
      columnWidth: 92,
      cell: (props: any) => (
        <CellInlineEdit props={props} type="lead_source_no" isCopyable={true} />
      ),
    },
    {
      id: 'contact_name',
      header: () => <span className="whitespace-nowrap">Contact</span>,
      accessorKey: 'contact_name',
      enableSorting: true,
      columnWidth: 144,
      cell: (props: any) => (
        <CellInlineEdit props={props} type="contact_name" enableTodo={true} isCopyable={true} />
      ),
    },
    {
      id: 'phone',
      header: () => <span className="whitespace-nowrap">Phone</span>,
      accessorKey: 'phone',
      enableSorting: true,
      columnWidth: 151,
      cell: (props: any) => <CellInlineEdit props={props} type="phone" isCopyable={true} />,
    },
    {
      id: 'email_from',
      header: () => <span className="whitespace-nowrap">Email</span>,
      accessorKey: 'email_from',
      enableSorting: true,
      columnWidth: 230,
      cell: (props: any) => <CellInlineEdit props={props} type="email_from" isCopyable={true} />,
    },
    {
      id: 'expected_revenue',
      header: () => <span className="whitespace-nowrap">REV</span>,
      accessorKey: 'expected_revenue',
      enableSorting: true,
      columnWidth: 91,
      minSize: 45,
      cell: (props: any) => <CellInlineEdit props={props} type="expected_revenue" />,
    },

    {
      id: 'lead_source',
      header: () => <span className="whitespace-nowrap">Src</span>,
      enableSorting: true,
      accessorKey: 'lead_source',
      columnWidth: 90,
      cell: (props: any) => {return (
       
        <CellInlineEdit
          props={props}
          type="lead_source"
          apiUpdateField="source_id"
          dropdown={true}
          options={sourceOptions}
          selectOptionClassName="min-w-32"
          sourceColor={props.row.original?.source_id?.color}
        />
      )},
    },
    {
      id: 'status',
      header: () => (
        <span className="whitespace-nowrap">{closeProjectId ? 'Prev Status' : 'Status'}</span>
      ),
      enableSorting: true,
      accessorKey: 'status',
      columnWidth: 121,
      cell: (props: any) => {
        const statusName = props.row.original?.status?.name?.toLowerCase() ?? '';

        return (
          <CellInlineEdit
            props={props}
            type="status"
            apiUpdateField="status_id"
            dropdown={true}
            options={allStatus}
            initialValue={statusName}
            leadId={props.row.original?._id}
            selectOptionClassName="min-w-40"
            selectClassName="truncate"
          />
        );
      },
    },

    {
      id: 'imp_status',
      header: () => <span className="whitespace-nowrap">IMP</span>,
      accessorKey: 'duplicate_status',
      columnWidth: 82,
      minSize: 31,
      enableSorting: true,
      cell: (props: any) => (
        <span
          className={classNames(
            'block size-4 rounded-full',
            getDuplicateStatusColor(props.row.original?.duplicate_status)
          )}
        ></span>
      ),
    },
    {
      id: 'use_status',
      header: () => <span className="">Use</span>,
      accessorKey: 'use_status',
      columnWidth: 81,
      enableSorting: true,
      cell: (props: any) => {
        const useStatus = props.row.original?.use_status?.toLowerCase().replace('_', ' ');

        return (
          <CellInlineEdit
            props={props}
            type="use_status"
            apiUpdateField="use_status"
            dropdown={true}
            options={IN_USE_STATUS_OPTIONS}
            initialValue={useStatus}
            leadId={props.row.original?._id}
            selectOptionClassName="min-w-40"
            selectClassName="truncate capitalize"
          />
        );
      },
    },
    // Date columns
    {
      id: 'createdAt',
      header: () => <span className="whitespace-nowrap">Created At</span>,
      accessorKey: 'createdAt',
      enableSorting: true,
      columnWidth: 130,
      cell: ({ row }: { row: any }) => {
        const createdAt = row.original?.createdAt;
        if (!createdAt) return <span className="text-gray-400">-</span>;

        const formattedDate = dateFormateUtils(createdAt, DateFormatType.SHOW_DATE);

        return <div className="text-sm font-medium">{formattedDate}</div>;
      },
    },
    {
      id: 'updatedAt',
      header: () => <span className="whitespace-nowrap">Updated At</span>,
      accessorKey: 'updatedAt',
      enableSorting: true,
      columnWidth: 138,
      cell: ({ row }: { row: any }) => {
        const updatedAt = row.original?.updatedAt;
        if (!updatedAt) return <span className="text-gray-400">-</span>;

        const formattedDate = dateFormateUtils(updatedAt, DateFormatType.SHOW_DATE);

        return <div className="text-sm font-medium">{formattedDate}</div>;
      },
    },
    {
      id: 'lead_date',
      header: () => <span className="truncate whitespace-nowrap">Lead At</span>,
      accessorKey: 'lead_date',
      enableSorting: true,
      columnWidth: 114,
      cell: ({ row }: { row: any }) => {
        const leadDate = row.original?.lead_date;
        if (!leadDate) return <span className="text-gray-400">-</span>;

        const formattedDate = dateFormateUtils(leadDate, DateFormatType.SHOW_DATE);

        return <div className="text-sm font-medium">{formattedDate}</div>;
      },
    },
    {
      id: 'assigned_date',
      header: () => <span className="whitespace-nowrap">Assigned</span>,
      accessorKey: 'assigned_date',
      enableSorting: true,
      columnWidth: 94,
      cell: ({ row }: { row: any }) => {
        const assignedDate = row.original?.assigned_date;
        if (!assignedDate) return <span className="text-gray-400">-</span>;

        const formattedDate = dateFormateUtils(assignedDate, DateFormatType.SHOW_DATE);

        return <div className="text-sm font-medium">{formattedDate}</div>;
      },
    },

    ...(showInTodo || showInTickets
      ? [
        {
          id: 'todo',
          header: () => <span className="whitespace-nowrap">Todo</span>,
          accessorKey: 'todo',
          enableSorting: false,
          columnWidth: 350,
          cell: ({ row }: { row: any }) => {
            const activeTodos = row.original?.activeTodos || [];
            return (
              <TodoList
                activeTodos={activeTodos}
                author={session?.user?.name || ''}
                todoId={row.original?._id}
                updateTodo={updateTodo}
                projectId={row.original?.team_id}
                onTodoClick={handleOpenTaskDetail}
              />
            );
          },
        },
      ]
      : []),
  ];

  // Conditionally add Download column if recentImport is true
  if (recentImport) {
    allColumns.push({
      id: 'download',
      header: () => <span className="whitespace-nowrap">Download</span>,
      enableSorting: false,
      accessorKey: 'download',
      columnWidth: 100,
      cell: () => (
        <div>
          <DownloadImports downloadLink="" />
        </div>
      ),
    });
  }

  // Use the common column customization hook with ALL columns first
  const {
    columnOrder,
    columnVisibility,
    renderableColumns: allRenderableColumns,
    handleColumnVisibilityChange,
    getColumnKey,
    getColumnDisplayLabel,
  } = useColumnCustomization({
    tableName,
    columns: allColumns,
  });

  // Apply role-based column filtering to the customized columns
  const { getFilteredColumns, isAgent, userRole } = useRoleBasedColumns({
    columns: allRenderableColumns,
  });

  // Get the final rendered columns (customized AND role-filtered)
  const renderableColumns = getFilteredColumns(false);

  // Fetch projects when assign dialog opens
  useEffect(() => {
    if (isAssignDialogOpen) {
      fetchProjects();
    }
  }, [isAssignDialogOpen]);

  const fetchProjects = async () => {
    try {
      const response = await apiGetProjects();
      const projectsData = Array.isArray(response) ? response : response.data;
      const transformedProjects = projectsData?.map((project: any) => ({
        _id: project?._id,
        name: project?.name?.en_US || project?.name,
        agents: project?.agents || [],
      }));

      setProjects(transformedProjects || []);
    } catch {
      // Error handling without console.log
    }
  };

  // Get current project and agent from selected closed leads (for filtering in dialog)
  const getCurrentProjectAndAgent = useMemo(() => {
    const currentSelectedIds = getSelectedIds('leads');
    if (!closeProjectId || !currentSelectedIds.length || !closedLeadsData?.data) {
      return { currentProjectId: undefined, currentAgentId: undefined };
    }

    // Get the first selected closed lead to determine current project/agent
    const firstSelectedLead = closedLeadsData.data.find((lead: any) =>
      currentSelectedIds.includes(lead._id?.toString())
    );

    if (!firstSelectedLead) {
      return { currentProjectId: undefined, currentAgentId: undefined };
    }

    // Get current project ID from closed_project_id (object) or project array
    const closedProjectIdObj = firstSelectedLead.closed_project_id;
    const projectArray = firstSelectedLead.project;

    // Check if closed_project_id is an object with _id
    const projectIdFromClosedProject =
      closedProjectIdObj && typeof closedProjectIdObj === 'object' && '_id' in closedProjectIdObj
        ? (closedProjectIdObj as { _id?: string })._id?.toString()
        : undefined;

    // Check if project is an array and get first element
    const projectIdFromArray =
      Array.isArray(projectArray) && projectArray.length > 0 && projectArray[0]?._id
        ? projectArray[0]._id.toString()
        : undefined;

    const currentProjectId = projectIdFromClosedProject || projectIdFromArray;

    // Get current agent ID from project array
    const currentAgentId =
      (Array.isArray(projectArray) && projectArray[0]?.agent?._id?.toString()) ||
      (Array.isArray(projectArray) && projectArray[0]?.agent?.user_id?.toString());

    return { currentProjectId, currentAgentId };
  }, [closeProjectId, getSelectedIds, closedLeadsData?.data]);

  // Handle assign leads flow
  const handleAssignLeads = () => {
    const currentSelectedIds = getSelectedIds('leads');
    if (currentSelectedIds.length === 0) {
      toast.push(
        <Notification title="No Selection" type="warning">
          Please select leads you want to assign
        </Notification>
      );
      return;
    }
    setIsAssignDialogOpen(true);
  };

  const handleClearSelection = () => {
    setSelectedItems([], 'leads'); // Clear the global store (single source of truth)
  };

  const handleAssignSubmit = async () => {
    const currentSelectedIds = getSelectedIds('leads');
    if (!selectedProjectId || !selectedAgentId || currentSelectedIds.length === 0) return;

    setIsSubmitting(true);
    try {
      // Use closed leads API if closeProjectId is present
      if (closeProjectId) {
        const submitData = {
          closedLeadIds: currentSelectedIds,
          projectId: selectedProjectId,
          agentId: selectedAgentId,
          notes: notes || 'Optional notes about this assignment',
          leadPrice: selectLeadPrice === 'customPrice' ? customPrice : 0,
        };

        const result = await assignClosedLeadsMutation.mutateAsync(submitData);
        const failureCount = result?.results?.failureCount || 0;
        toast.push(
          <Notification type={failureCount > 0 ? 'warning' : 'success'}>
            {result?.message}
          </Notification>
        );
      } else {
        // Use regular assign leads API
        const submitData = {
          projectId: selectedProjectId,
          leadIds: currentSelectedIds,
          agentId: selectedAgentId,
          notes: notes || 'Optional notes about this assignment',
          leadPrice: selectLeadPrice === 'customPrice' ? customPrice : 0,
        };

        const result = await assignLeadsMutation.mutateAsync(submitData);
        toast.push(<Notification type="success">{result?.message}</Notification>);
      }

      setIsAssignDialogOpen(false);
      setSelectedProjectId('');
      setSelectedAgentId('');
      setSelectedItems([], 'leads'); // Clear the global store (single source of truth)
      setNotes('');
      router.refresh();
    } catch (error: any) {
      //console.error('Error assigning leads:', error);
      toast.push(
        <Notification title="Assignment Failed" type="danger">
          {error?.message || 'Failed to assign leads. Please try again.'}
        </Notification>
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleAssignSubmitTransform = async () => {
    const currentSelectedIds = getSelectedIds('leads');
    if (!selectedProjectId || !selectedAgentId || currentSelectedIds.length === 0) return;

    const submitData = {
      toProjectId: selectedProjectId,
      leadIds: currentSelectedIds,
      toAgentUserId: selectedAgentId,
      notes: notes,
      isFreshTransfer: makeFresh,
      isRestore: makeFresh ? restoreArchived : false,
    };

    setIsSubmitting(true);
    try {
      const result = await assignLeadsMutationTransform.mutateAsync(submitData);

      toast.push(<Notification type="success">{result?.message}</Notification>);
      setIsAssignDialogOpen(false);
      setSelectedProjectId('');
      setSelectedAgentId('');
      setSelectedItems([], 'leads'); // Clear the global store (single source of truth)
      setNotes('');
      setMakeFresh(false);
      setRestoreArchived(false);
      router.refresh();
    } catch (error: any) {
      //console.error('Error assigning leads:', error);
      toast.push(
        <Notification title="Assignment Failed" type="danger">
          {error?.message || 'Failed to assign leads. Please try again.'}
        </Notification>
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for reverting selected closed leads
  const handleRevertClosedProjectLeads = async () => {
    const currentSelectedIds = getSelectedIds('leads');
    if (!closeProjectId || currentSelectedIds.length === 0) {
      toast.push(
        <Notification title="No Selection" type="warning">
          Please select closed leads to revert
        </Notification>
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Revert all selected closed leads in a single batch call
      const result = await revertClosedLeadsMutation.mutateAsync(currentSelectedIds);

      if (result.success && result.reverted_count === currentSelectedIds.length) {
        toast.push(
          <Notification type="success">
            Successfully reverted {result.reverted_count} closed lead
            {result.reverted_count !== 1 ? 's' : ''}
          </Notification>
        );
        // Clear selection after successful revert
        setSelectedItems([], 'leads');
        router.refresh();
      } else if (result.reverted_count > 0) {
        toast.push(
          <Notification title="Partial Success" type="warning">
            Reverted {result.reverted_count} of {currentSelectedIds.length} closed leads
            {result.failed_count > 0 && ` (${result.failed_count} failed)`}
          </Notification>
        );
      }
    } catch (error: any) {
      toast.push(
        <Notification title="Revert Failed" type="danger">
          {error?.message || 'Failed to revert closed leads. Please try again.'}
        </Notification>
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reclamation submit
  const handleReclamationSubmit = async () => {
    if (!reclamationReason.trim()) {
      toast.push(
        <Notification title="Error" type="danger">
          Please enter a reason for reclamation
        </Notification>
      );
      return;
    }
    // if (selectedLeads.length > 1) {
    //   toast.push(
    //     <Notification title="Error" type="danger">
    //       Please select only one lead to reclamation
    //     </Notification>
    //   );
    //   return;
    // }

    setIsSubmittingReclamation(true);
    try {
      const currentSelectedIds = getSelectedIds('leads');
      const reclamationData: {
        reason: string;
        leads: (string | number)[];
        project_id?: string;
        agent_id?: string | number;
      } = {
        reason: reclamationReason,
        // lead_id: currentSelectedIds[0].toString(),
        leads: currentSelectedIds ?? [],
      };

      if (!isAdmin) {
        reclamationData.project_id = projectId;
        reclamationData.agent_id = selectedAgentId;
      } else if (projectId) {
        reclamationData.project_id = projectId;
        if (selectedAgentId) reclamationData.agent_id = selectedAgentId;
      }
      const response = await apiSubmitReclamation(reclamationData);

      // Validate API response
      if (response && response?.success !== false) {
        toast.push(
          <Notification title="Reclamation submitted" type="success">
            Reclamation submitted successfully
          </Notification>
        );

        // CRITICAL: Always invalidate basic leads queries
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['lead'] });
        queryClient.invalidateQueries({ queryKey: ['current-top-lead'] });
        queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });

        // CRITICAL: Invalidate filtered leads queries (with filter parameters)
        // This ensures StatusFilter and DynamicFilters refresh when they use GET /leads API
        queryClient.invalidateQueries({
          predicate: (query) => {
            return Boolean(
              query.queryKey[0] === 'leads' &&
              query.queryKey.length > 1 &&
              query.queryKey[1] &&
              typeof query.queryKey[1] === 'object'
            );
          },
        });

        // CRITICAL: Always invalidate grouped leads queries (same as useUpdateLeadStatus)
        // This ensures GroupByFilter and GroupedLeadsTable refresh
        const { invalidateGroupedLeadQueries } = await import('@/utils/queryInvalidation');
        invalidateGroupedLeadQueries(queryClient);

        // If there's project-specific data, invalidate that too
        if (projectId) {
          queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        }

        // CRITICAL: Refetch dynamic filters POST request if active (StatusFilter or DynamicFilters)
        // This ensures UI updates immediately when data comes from POST /dynamic-filters/apply
        // Same pattern as useUpdateLeadStatus
        const { useDynamicFiltersStore } = await import('@/stores/dynamicFiltersStore');
        const dynamicFiltersStore = useDynamicFiltersStore.getState();
        if (dynamicFiltersStore.isDynamicFilterMode && dynamicFiltersStore.refetchDynamicFilters) {
          await dynamicFiltersStore.refetchDynamicFilters(
            dynamicFiltersStore.page,
            dynamicFiltersStore.pageSize
          );
        }

        setIsReclamationDialogOpen(false);
        setReclamationReason('');
        setSelectedProjectId('');
        setSelectedAgentId('');
        setSelectedItems([], 'leads'); // Clear the global store (single source of truth)

        // Also call conditionalRefetch for backward compatibility
        await conditionalRefetch();
      } else {
        // Handle case where API returns success: false or other error indicators
        throw new Error(response?.message || 'Reclamation submission failed');
      }
    } catch (error) {
      toast.push(
        <Notification title="Error" type="danger">
          {error instanceof Error
            ? error.message
            : 'Failed to submit reclamation. Please try again.'}
        </Notification>
      );
    } finally {
      setIsSubmittingReclamation(false);
    }
  };

  // Project change resets agent selection
  const handleProjectChange = (option: SelectOption | null) => {
    if (!option) return;
    const project = projects?.find((p) => p?._id === option?.value);
    setSelectedProjectId(project?._id || '');
    setSelectedAgentId('');
  };

  const getProjectAgents = () => {
    const project = projects?.find((p) => p?._id === selectedProjectId);
    const agents = project?.agents || [];
    return agents?.filter((agent: any) => {
      const userVal = agent?.user;
      if (typeof userVal === 'string') return Boolean(userVal);
      return Boolean(userVal && (userVal?._id || userVal?.id));
    });
  };

  const getUserLogin = (agentId: string) => {
    const agent = getProjectAgents()?.find((a: any) => {
      const userVal = a?.user;
      const uid = typeof userVal === 'string' ? userVal : userVal?._id || userVal?.id;
      return uid === agentId;
    });
    return (
      (agent as any)?.alias_name ||
      (typeof (agent as any)?.user !== 'string' ? (agent as any)?.user?.name : undefined) ||
      'Unknown'
    );
  };

  // Handle row click navigation
  const handleRowClick = (lead: Lead | any) => {
    // Handle undefined lead (can happen in grouped leads table)
    if (!lead || !lead._id) {
      return;
    }

    const id = lead._id.toString();
    const routeId =
      lead?.original_lead_id != null && String(lead.original_lead_id).trim() !== ''
        ? String(lead.original_lead_id)
        : id;

    // Update navigation position to clicked lead before navigating
    try {
      const navStore = useFilterAwareLeadsNavigationStore.getState();
      const { setApiUrl, apiUrl: storedApiUrl } = useApiUrlStore.getState();

      const index = navStore.findFilteredIndexById(routeId);

      if (index >= 0) {
        navStore.setCurrentFilteredIndex(index);
      } else {
        // Try to find it in the current page data as fallback
        const currentData = isDynamicFilterMode ? dynamicFilterResults : leadsData?.data || [];
        const fallbackIndex = currentData?.findIndex((item: any) => {
          const itemRouteId =
            item?.original_lead_id != null && String(item.original_lead_id).trim() !== ''
              ? String(item.original_lead_id)
              : item?._id?.toString();
          return itemRouteId === routeId;
        });
        if (fallbackIndex >= 0) {
          // Calculate the local index within current page
          navStore.setCurrentFilteredIndex(fallbackIndex);
        }
      }

      // ✅ Store API URL in sessionStorage for navigation
      // CRITICAL FIX: For grouped mode, itemApiUrl already has the correct page for that specific group
      // For non-grouped mode (especially archived page), always prefer storedApiUrl's page
      // because storedApiUrl is updated by ArchivedLeadsDashboard when pagination changes
      const itemApiUrl = (lead as any)._apiUrl;
      let apiUrlToStore: string;

      // Extract page from storedApiUrl (source of truth for non-grouped mode)
      let storedPage: number | null = null;
      if (storedApiUrl) {
        try {
          const storedUrl = new URL(storedApiUrl, window.location.origin);
          storedPage = parseInt(storedUrl.searchParams.get('page') || '1', 10);
        } catch {
          // If extraction fails, continue without updating page
        }
      }

      // Check if itemApiUrl exists and has a page parameter
      let itemApiUrlHasPage = false;
      let itemApiUrlPage: number | null = null;
      if (itemApiUrl) {
        try {
          const itemUrl = new URL(itemApiUrl, window.location.origin);
          itemApiUrlHasPage = itemUrl.searchParams.has('page');
          if (itemApiUrlHasPage) {
            itemApiUrlPage = parseInt(itemUrl.searchParams.get('page') || '1', 10);
          }
        } catch {
          // If parsing fails, assume it doesn't have page
        }
      }

      // Check if URLs have different domain parameters (indicates grouped mode)
      // In grouped mode, itemApiUrl has group-specific domain filters that differ from storedApiUrl
      const isLikelyGroupedMode =
        itemApiUrl && storedApiUrl
          ? (() => {
            try {
              const itemUrl = new URL(itemApiUrl, window.location.origin);
              const storedUrl = new URL(storedApiUrl, window.location.origin);
              const itemDomain = itemUrl.searchParams.get('domain');
              const storedDomain = storedUrl.searchParams.get('domain');
              // If domains are different, it's likely grouped mode
              return itemDomain !== storedDomain && itemDomain !== null && storedDomain !== null;
            } catch {
              return false;
            }
          })()
          : false;

      // Determine which page to use:
      // - If likely grouped mode and itemApiUrl has a page, use it (group-specific pagination)
      // - Otherwise, prefer storedApiUrl's page (non-grouped mode - single source of truth updated by ArchivedLeadsDashboard)
      // - Fallback to itemApiUrl's page or current page
      const pageToUse =
        // If likely grouped mode and itemApiUrl has a page, use it (group-specific pagination)
        isLikelyGroupedMode && itemApiUrlPage !== null && itemApiUrlPage >= 1
          ? itemApiUrlPage
          : // Otherwise, prefer storedApiUrl's page (non-grouped mode)
          storedPage !== null && storedPage >= 1
            ? storedPage
            : // Fallback to itemApiUrl's page or current page
            itemApiUrlPage !== null && itemApiUrlPage >= 1
              ? itemApiUrlPage
              : page;

      // Build the final URL
      if (itemApiUrl) {
        // Update itemApiUrl with the correct page number while preserving all other parameters
        try {
          const url = new URL(itemApiUrl, window.location.origin);
          const searchParams = new URLSearchParams(url.search);
          searchParams.set('page', pageToUse.toString());
          searchParams.set('limit', pageSize.toString());
          apiUrlToStore = `${url.pathname}?${searchParams.toString()}`;
        } catch {
          // If URL parsing fails, use storedApiUrl or buildApiUrl()
          apiUrlToStore = storedApiUrl || buildApiUrl();
        }
      } else if (storedApiUrl) {
        // Use storedApiUrl directly if itemApiUrl doesn't exist
        apiUrlToStore = storedApiUrl;
      } else {
        // Fallback: build URL from current state
        apiUrlToStore = buildApiUrl();
      }

      // ✅ Update api-url-storage with the correct URL (preserves page number from storedApiUrl)
      setApiUrl(apiUrlToStore);

      // CRITICAL: Update sessionStorage with current page when in dynamic filter mode
      // This ensures the details page has the correct page number
      if (isDynamicFilterMode && storedApiUrl === '/dynamic-filters/apply') {
        try {
          const savedBody = sessionStorage.getItem('dynamic-filters-body');
          if (savedBody) {
            const parsed = JSON.parse(savedBody);
            const currentPage = navStore.paginationMeta?.page || dynamicFilterPage || 1;
            const currentLimit =
              navStore.paginationMeta?.limit || dynamicFilterPageSize || DEFAULT_PAGE_LIMIT;
            sessionStorage.setItem(
              'dynamic-filters-body',
              JSON.stringify({
                ...parsed,
                page: currentPage,
                limit: currentLimit,
              })
            );
          }
        } catch {
          // Silent fail
        }
      }
    } catch {
      // Error handling without console.log
    }

    router.push(`/dashboards/leads/${routeId}`);
  };

  // Create a properly typed leadsData object if external data is provided, bulk search results, or dynamic filter results
  const typedLeadsData: GetAllLeadsResponse | undefined | any = externalData
    ? { data: externalData, meta: { total: externalTotal || 0, page: page, limit: pageSize } }
    : isBulkSearchMode
      ? {
        data: bulkSearchResults,
        meta: { total: bulkSearchResults?.length, page: 1, limit: bulkSearchResults?.length },
      }
      : isDynamicFilterMode
        ? {
          data: dynamicFilterResults,
          meta: {
            total: dynamicFilterTotal,
            page: dynamicFilterPage,
            limit: dynamicFilterPageSize,
          },
        }
        : effectiveLeadsData;

  // Select all leads from API for the current query context
  const selectAllLeadsFromApi = async () => {
    try {
      let allLeads: any[] = [];

      // For closed leads, use closed leads API or just select from current page
      if (closeProjectId) {
        // For closed leads, select only from current page data (visible items)
        // This matches the behavior - select only what's visible, not all closed leads
        const currentData = closedLeadsData?.data || [];
        allLeads = currentData;
      } else if (isDynamicFilterMode) {
        allLeads = dynamicFilterResults || [];
      } else if (hasCustomFilters) {
        const allLeadsResponse = await apiGetLeads({
          page: 1,
          limit: customFiltersMeta?.total || leadsData?.meta?.total || pageSize,
          ...defaultFiltersAsQueryParams,
          domain:
            userDomainFilters && userDomainFilters.length > 0
              ? JSON.stringify(normalizeDomainFiltersForApi(userDomainFilters))
              : undefined,
        });
        allLeads = allLeadsResponse?.data || [];
      } else {
        const allLeadsResponse = await apiGetLeads({
          page: 1,
          limit: leadsData?.meta?.total,
          search: search || undefined,
          project_id:
            role === 'Agent'
              ? effectiveProjectId
              : projectNameFromDetailsPage
                ? externalProjectId
                : undefined,
          agent_name: role === 'Agent' ? agentName : undefined,
          use_status: pendingLeadsComponent === true ? 'pending' : undefined,
          duplicate: filterData,
          showInactive: showinactive ? true : undefined,
          has_todo: showInTodo ? true : undefined,
          has_schedule: scheduledLeadsPage ? true : undefined,
          source: liveLeads ? 'live' : recycleLeads ? 'recycle' : undefined,
          includeAll: allLeadsPage ? true : undefined,
        });
        allLeads = allLeadsResponse?.data || [];
      }

      // Store selected items in global store (this updates selectedLeads automatically)
      setSelectedItems(allLeads, 'leads');
    } catch {
      openNotification({
        type: 'danger',
        massage: 'Failed to select all leads',
      });
    }
  };

  const { sortedData } = useFrontendSorting({
    data: leadsData?.data,
    columns: allColumns,
    isBackendSortingReady: true,
  });

  // Add the apply dynamic filters hook
  const applyDynamicFilters = useApplyDomainFilters();

  // Check if actions should be disabled for closed leads
  // Actions are disabled if any selected lead has closeLeadStatus of "revert" or "assigned"
  const areClosedLeadsActionsDisabled = useMemo(() => {
    const currentSelectedIds = getSelectedIds('leads');
    if (!closeProjectId || !currentSelectedIds.length || !closedLeadsData?.data) {
      return false;
    }

    // Check if any selected lead has closeLeadStatus of "revert" or "assigned"
    const hasRestrictedStatus = currentSelectedIds.some((leadId) => {
      const lead = closedLeadsData.data.find((l: any) => l._id?.toString() === leadId.toString());
      const closeLeadStatus = lead?.closeLeadStatus?.toLowerCase();
      return closeLeadStatus === 'revert' || closeLeadStatus === 'assigned';
    });

    return hasRestrictedStatus;
  }, [closeProjectId, getSelectedIds, closedLeadsData?.data]);

  // Sorting handler
  const handleSort = (sort: OnSortParam) => {
    // Sync sorting to universal grouping filter store when grouping or custom filters are active
    // This ensures sorting works correctly with group details and custom filter APIs
    if (hasGrouping || hasCustomFilters) {
      setStoreSorting({
        sortBy: sort?.key as string,
        sortOrder: sort?.order as 'asc' | 'desc',
      });
    }

    if (isDynamicFilterMode) {
      // When in dynamic filter mode, update the store's sorting state
      setSort(sort?.key as string, sort?.order as 'asc' | 'desc');

      // Trigger a refetch to get sorted data from backend
      if (dynamicFilterQuery && dynamicFilterQuery?.length > 0) {
        // Apply the current filters with new sorting
        applyDynamicFilters.mutate(
          {
            filters: dynamicFilterQuery,
            page: 1,
            limit: pageSize, // Use current pageSize instead of hardcoded 50
            sortBy: sort?.key as string,
            sortOrder: sort?.order as 'asc' | 'desc',
          },
          {
            onSuccess: (data) => {
              // Update the store with the new sorted results
              const {
                setDynamicFilterResults,
                setTotal,
                setPage,
                setPageSize,
                setHasNextPage,
                setHasPrevPage,
              } = useDynamicFiltersStore.getState();
              setDynamicFilterResults(data?.data || []);
              setTotal(data?.meta?.total || 0);
              setPage(data?.meta?.page || 1);
              setPageSize(data?.meta?.limit || DEFAULT_PAGE_LIMIT);
              setHasNextPage(data?.meta?.hasNextPage || false);
              setHasPrevPage(data?.meta?.hasPrevPage || false);

              // Also update the navigation store with the sorted results
              setFilteredItems(data?.data || []);
            },
            onError: () => {
              // Error handling without console.log
            },
          }
        );
      } else {
        // console.warn('⚠️ No dynamicFilterQuery available for sorting');
      }
    } else {
      // For regular mode, update query parameters
      // console.log('🔄 Regular mode sorting - updating URL params');
      onAppendQueryParams({ sortBy: sort?.key, sortOrder: sort?.order });
    }
  };

  // Wrapper function to update selected leads via store
  // This maintains backward compatibility with components that call setSelectedLeads
  const setSelectedLeads = useCallback(
    (leadIds: string[]) => {
      // Get current selected items from store
      const currentSelectedItems = getSelectedItems('leads');

      // Build a map of current items by ID
      const itemsMap = new Map(currentSelectedItems.map((item) => [item._id?.toString(), item]));

      // Get the base data source to find lead objects
      const baseData = closeProjectId ? closedLeadsData?.data : leadsData?.data;
      const resolvedFlatData = (hasCustomFilters ? customFilteredItems : baseData) || [];

      // Find lead objects for the provided IDs
      const newSelectedItems: Record<string, any>[] = [];
      leadIds.forEach((leadId) => {
        // First check if we already have this item in store
        const existingItem = itemsMap.get(leadId);
        if (existingItem) {
          newSelectedItems.push(existingItem);
        } else {
          // Try to find it in current data
          const foundLead = isBulkSearchMode
            ? bulkSearchResults?.find((lead: Lead) => lead?._id?.toString() === leadId)
            : isDynamicFilterMode
              ? dynamicFilterResults?.find((lead: Lead) => lead._id.toString() === leadId)
              : resolvedFlatData.find((lead: Lead) => lead._id.toString() === leadId);

          if (foundLead) {
            newSelectedItems.push(foundLead as Record<string, any>);
          }
        }
      });

      // Update store with new selection
      setSelectedItems(newSelectedItems, 'leads');
    },
    [
      getSelectedItems,
      setSelectedItems,
      closeProjectId,
      closedLeadsData?.data,
      leadsData?.data,
      hasCustomFilters,
      customFilteredItems,
      isBulkSearchMode,
      bulkSearchResults,
      isDynamicFilterMode,
      dynamicFilterResults,
    ]
  );

  return {
    conditionalRefetch,
    sortedData,
    handleSort,
    filterData,
    setFilterData,
    leadTableLoading:
      leadTableLoading ||
      effectiveIsRefetching ||
      bulkSearchLoading ||
      dynamicFilterLoading ||
      isClosedLeadsLoading,
    leadsData: typedLeadsData,
    isLoading:
      externalLoading !== undefined
        ? externalLoading
        : effectiveIsLoading || effectiveIsRefetching || bulkSearchLoading || dynamicFilterLoading,
    page,
    pageSize,
    setPage,
    setPageSize,
    selectedLeads, // Derived from store (reactive)
    setSelectedLeads, // Wrapper function that updates store
    isAssignDialogOpen,
    setIsAssignDialogOpen,
    isReclamationDialogOpen,
    setIsReclamationDialogOpen,
    selectedProjectId,
    setSelectedProjectId,
    selectedAgentId,
    setSelectedAgentId,
    selectLeadPrice,
    setSelectedLeadPrice,
    notes,
    setNotes,
    projects,
    isSubmitting,
    deleteConfirmDialogOpen,
    setDeleteConfirmDialogOpen,
    updateConfirmDialogOpen,
    setUpdateConfirmDialogOpen,
    reclamationReason,
    setReclamationReason,
    isLeadsDialogOpen,
    setIsLeadsDialogOpen,
    selectedSourceId,
    setSelectedSourceId,
    isNoteDialogOpen,
    setIsNoteDialogOpen,
    selectedLead,
    setSelectedLead,
    expandedRowId,
    setExpandedRowId,
    isSubmittingReclamation,

    fileInputRef,

    // Handlers
    handleSelectAllLeads,
    handleCheckboxChange,
    handleRowClick,
    fetchProjects,
    handleAssignLeads,
    handleClearSelection,
    handleAssignSubmit,
    handleAssignSubmitTransform,
    handleReclamationSubmit,
    handleRevertClosedProjectLeads,
    handleProjectChange,
    getProjectAgents,
    getUserLogin,
    bulkUpdateMutationLeads,
    bulkDeleteMutationLeads,
    onAppendQueryParams,
    allColumns,
    search,
    isRefetching,
    customPrice,
    setCustomPrice,
    makeFresh,
    setMakeFresh,
    restoreArchived,
    setRestoreArchived,
    isSameSource,
    sourceLeadPrice,

    // Column customization (from common hook)
    getColumnKey,
    getColumnDisplayLabel,
    handleColumnVisibilityChange,
    renderableColumns,
    columnVisibility,
    columnOrder,

    // Role-based filtering
    isAgent,
    userRole,

    // Current project and agent for closed leads filtering
    getCurrentProjectAndAgent,
    getFilteredColumns,

    // Bulk search
    isBulkSearchMode,
    bulkSearchResults,
    bulkSearchQuery,
    refetchBulkSearch,
    clearBulkSearch,

    // Dynamic filters
    isDynamicFilterMode,
    dynamicFilterResults,
    dynamicFilterQuery,
    clearDynamicFilters,
    setSort,

    transformLeads,
    selectAllLeadsFromApi,
    updateTodo,
    allProjects,
    allStatus,
    negativeAndPrivatOptions,
    areAllDisplayedItemsSelected,
    areClosedLeadsActionsDisabled,
    isTaskDetailModalOpen,
    setIsTaskDetailModalOpen,
    selectedTaskId,
    setSelectedTaskId,
    handleOpenTaskDetail,
    handleCloseTaskDetail,
    selectedLeadForDetails,
    leadDetailsViewOpen,
    handleCloseLeadDetailsView,
  };
};
