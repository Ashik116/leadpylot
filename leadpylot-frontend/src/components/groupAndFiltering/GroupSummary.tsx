import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Next from '@/components/ui/Pagination/Next';
import Prev from '@/components/ui/Pagination/Prev';
import { useClosedLeads, useLeads, useMetadataOptions, useOffers } from '@/services/hooks/useLeads';
import { useOffersProgress } from '@/services/hooks/useOffersProgress';
import { useUsers } from '@/services/hooks/useUsers';
import { useReclamation } from '@/services/hooks/useReclamation';
import { useProjects, useAllProjects } from '@/services/hooks/useProjects';
import { useCashflowEntries, useAllTransactions } from '@/services/hooks/useCashflow';
import {
  useUniversalGroupingFilterStore,
  type GroupSummary as GroupSummaryType,
} from '@/stores/universalGroupingFilterStore';
import { useGroupContextStore } from '@/stores/groupContextStore';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
// Optional import - only used for leads dashboard, not for offers
// We'll use a try-catch approach inside the component to handle this safely
import { useGroupedVisibleLeadsStore } from '@/stores/groupedVisibleLeadsStore';
import { useApiUrlStore } from '@/stores/apiUrlStore';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import { useBulkSearchStore } from '@/stores/bulkSearchStore';
import { DEFAULT_PAGE_LIMIT } from '@/constants/pagination.constant';
import { useSession } from '@/hooks/useSession';
import Checkbox from '@/components/ui/Checkbox';
import { formatGroupNameIfDate } from '@/utils/dateFormateUtils';
import type { ColumnDef } from '@/components/shared/DataTable';
import { flexRender } from '@tanstack/react-table';
import { usePathname } from 'next/navigation';
import {
  isDateField,
  getNestedValue,
  checkIsProgressPage,
  getHasProgressValue,
  buildGroupDomainFilters,
  buildDefaultFiltersAsQueryParams,
  buildGroupDetailsQueryParams,
  buildGroupApiUrl,
  getRangeText as getRangeTextUtil,
  normalizeGroupDetailsData,
  transformGroupDetailsData,
  getEffectiveEntityTypeForMetadata,
  dedupeDomainFilters,
} from './groupSummaryUtils';
import type { DomainFilter } from '@/stores/universalGroupingFilterStore';
import { LeadsDashboardContext } from '@/app/(protected-pages)/dashboards/leads/context/LeadsDashboardContext';

interface GroupSummaryProps {
  group: GroupSummaryType;
  columns: ColumnDef<any>[];
  entityType?: string;
  onRowClick?: (row: any) => void;
  level?: number; // For nested groups
  parentPath?: Array<{ groupId: string; groupName: string; fieldName: string }>; // For multilevel grouping with field names and group names
  groupByFields?: string[]; // The grouping fields array (e.g., ["team_id", "user_id"])
  tableProgressFilter?: string; // Explicit progress filter for multi-table mode
  search?: string | null; // Search term from ActionBar
}

const GroupSummary: React.FC<GroupSummaryProps> = ({
  group,
  columns,
  entityType = 'Lead',
  onRowClick,
  level = 0,
  parentPath = [],
  groupByFields = [],
  tableProgressFilter,
  search,
}) => {
  const {
    expandedGroups,
    toggleGroupExpansion,
    setSelectedGroupPath,
    userDomainFilters, // Use only user filters, not combined (defaults excluded)
    lockedDomainFilters, // Immutable filters for agents (e.g., default status filter)
    sorting, // Get sorting from store
    groupDetailsPagination,
    setGroupDetailsPagination,
    entityType: storeEntityType,
    groupBy,
    buildDefaultFilters, // Function to get default filters
    setSubgroupPagination, // Set subgroup pagination
    clearSubgroupPagination, // Clear subgroup pagination
    subgroupPagination, // Get current subgroup pagination state (Record<string, {subPage, subLimit}>)
  } = useUniversalGroupingFilterStore();
  const { setGroupContext, clearGroupContext } = useGroupContextStore();
  const { isBulkSearchMode, bulkSearchQuery } = useBulkSearchStore();
  // Determine table name based on entity type (must be before context usage)
  const tableName = React.useMemo(() => {
    const entityTypeLower = (storeEntityType || entityType || 'Lead').toLowerCase();
    return `${entityTypeLower}s`; // e.g., 'lead' -> 'leads', 'offer' -> 'offers'
  }, [storeEntityType, entityType]);

  // Leads dashboard (optional). Provider may be absent on offers/offers-only pages → null.
  const contextValue = React.useContext(LeadsDashboardContext);

  // Extract context data, using empty defaults if context is not available
  const contextData: {
    selectedLeads?: string[];
    setSelectedLeads?: (leads: string[]) => void;
    handleGroupedLeadSelectionChange?: (items: any[]) => void;
    handleGroupedLeadsSelectionForAssignment?: (items: any[]) => void;
    closeProjectId?: string;
  } = contextValue || {};

  const {
    selectedLeads: contextSelectedLeads = [],
    setSelectedLeads,
    handleGroupedLeadSelectionChange,
    handleGroupedLeadsSelectionForAssignment,
    closeProjectId: closeProjectIdFromContext,
  } = contextData;

  // For offers page, use selectedItemsStore to get selected items
  const selectedItemsStore = useSelectedItemsStore();
  const getSelectedIdsFromStore = useCallback(
    (tableName: string) => {
      return selectedItemsStore.getSelectedIds(tableName as any) || [];
    },
    [selectedItemsStore]
  );

  // Get selected IDs - use context for leads, store for offers
  const effectiveSelectedLeads = React.useMemo(() => {
    // If context has selectedLeads (leads dashboard), use it
    if (contextSelectedLeads.length > 0) {
      return contextSelectedLeads;
    }
    // Fallback to store for offers or when context is not available
    return getSelectedIdsFromStore(tableName);
  }, [contextSelectedLeads, getSelectedIdsFromStore, tableName]);
  const setSelectedItems = useSelectedItemsStore((state) => state.setSelectedItems);
  const getSelectedItems = useSelectedItemsStore((state) => state.getSelectedItems);
  const setVisibleLeadsForGroup = useGroupedVisibleLeadsStore(
    (state) => state.setVisibleLeadsForGroup
  );
  const removeVisibleLeadsForGroup = useGroupedVisibleLeadsStore(
    (state) => state.removeVisibleLeadsForGroup
  );

  // For UnifiedDashboard pages (Opening entity type), always use "Offer" for metadata options
  // This ensures all UnifiedDashboard pages (offers, openings, confirmations, payments) call /api/metadata/options/Offer
  const effectiveEntityTypeForMetadata = useMemo(() => {
    if (closeProjectIdFromContext) {
      return 'ClosedLeads';
    }
    return getEffectiveEntityTypeForMetadata(storeEntityType, entityType);
  }, [storeEntityType, entityType, closeProjectIdFromContext]);

  // Get metadata options to identify date fields - use "Offer" for UnifiedDashboard pages
  const { data: metadataOptions } = useMetadataOptions(effectiveEntityTypeForMetadata);

  // Create a map of field types from metadata (memoized)
  const fieldTypesMap = useMemo(() => {
    if (!metadataOptions?.filterOptions) return null;
    const fieldTypes: Record<string, string> = {};
    metadataOptions.filterOptions.forEach((option) => {
      fieldTypes[option.field] = option.type;
    });
    return fieldTypes;
  }, [metadataOptions]);

  // Helper function to check if a field is a date field (memoized)
  const isDateFieldFn = useCallback(
    (fieldName: string): boolean => isDateField(fieldName, fieldTypesMap),
    [fieldTypesMap]
  );

  // Use groupByFields from props, fallback to store groupBy
  const effectiveGroupByFields = groupByFields.length > 0 ? groupByFields : groupBy;

  // Create unique group ID that includes parent path
  const uniqueGroupId =
    parentPath.length > 0
      ? [...parentPath.map((p) => p.groupId), group.groupId].join('|')
      : group.groupId;
  const isExpanded = expandedGroups.has(uniqueGroupId);

  // Get selected project for team_id filter
  const { selectedProject } = useSelectedProjectStore();

  // Get pathname to detect offers/openings pages
  const pathname = usePathname();

  // Fetch all projects to convert "project" filters to "project_id" filters
  const { data: allProjectsData } = useAllProjects({ limit: 1000 });

  // Create project name-to-ID mapping
  const projectNameToIdMap = useMemo(() => {
    if (!allProjectsData?.data) return {};
    const map: Record<string, string> = {};
    allProjectsData.data.forEach((project: any) => {
      if (project.name && project._id) {
        map[project.name] = project._id;
      }
    });
    return map;
  }, [allProjectsData]);

  // Build domain filters for this specific group
  // When a group is expanded, we need to add filters for the group path
  // For date fields, use groupName instead of groupId
  // IMPORTANT: Include locked filters (immutable for agents, e.g., default status filter) + user filters
  // Default filters are already handled by page-specific query params in the /leads API
  const groupDomainFilters = useMemo(() => {
    // Combine locked filters (immutable for agents) with user filters
    // Locked filters come first, then user filters, then group path filters
    const locked = lockedDomainFilters || [];
    const user = userDomainFilters || [];

    // Build base domain filters from combined locked + user filters and group path
    const baseFilters = buildGroupDomainFilters(
      [...locked, ...user], // Include both locked and user filters
      parentPath,
      group,
      isDateFieldFn
    );

    // Add selected project ID as team_id filter if a project is selected
    // BUT: On offers/openings pages (progress pages), agents can work across multiple teams,
    // so we should NOT filter by team_id when fetching group details for agent groups
    // Close-project closed-leads bank: locked scope already sets team_id; skip duplicate from project picker
    const selectedProjectId = selectedProject?._id || selectedProject?.value;
    const isOffersOrOpeningsPage =
      pathname?.includes('/offers') ||
      pathname?.includes('/openings') ||
      pathname?.includes('/dashboards/offers');
    const isCloseProjectsLeadBank = pathname?.includes('/dashboards/projects/close-projects/');
    const isProjectMongoLeadsDetail =
      !!pathname && /^\/dashboards\/projects\/[a-f0-9]{24}$/i.test(pathname);

    if (
      selectedProjectId &&
      selectedProjectId !== 'all' &&
      !isOffersOrOpeningsPage &&
      !isCloseProjectsLeadBank &&
      !isProjectMongoLeadsDetail
    ) {
      // Check if team_id filter already exists
      const hasTeamIdFilter = baseFilters.some((filter) => filter[0] === 'team_id');

      // Only add if it doesn't already exist
      if (!hasTeamIdFilter) {
        return dedupeDomainFilters([
          ...baseFilters,
          ['team_id', '=', selectedProjectId] as DomainFilter,
        ]);
      }
    }

    return dedupeDomainFilters(baseFilters);
  }, [
    lockedDomainFilters,
    userDomainFilters,
    parentPath,
    group,
    isDateFieldFn,
    selectedProject,
    pathname,
  ]);

  // Get pagination for this group
  const groupPagination = useMemo(
    () => groupDetailsPagination[uniqueGroupId] || { page: 1, limit: DEFAULT_PAGE_LIMIT },
    [groupDetailsPagination, uniqueGroupId]
  );

  // Page size editing state
  const [isEditingPageSize, setIsEditingPageSize] = useState(false);
  const pageSizeSpanRef = useRef<HTMLSpanElement | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if group has subgroups
  const hasSubGroups = group.subGroups && group.subGroups.length > 0;

  // Only fetch group details when expanded AND there are no subgroups (leaf node)
  // If there are subgroups, we don't need to fetch details - just show the subgroups
  const shouldFetchDetails = isExpanded && !hasSubGroups && group.count > 0;
  // Get tableProgressFilter from store (for multi-table mode on openings page)
  const storeTableProgressFilter = useUniversalGroupingFilterStore(
    (state) => state.tableProgressFilter
  );
  const effectiveTableProgressFilter = tableProgressFilter ?? storeTableProgressFilter;

  // Determine if we're on a progress page (openings, confirmations, payments, etc.)
  // These pages use useOffersProgress hook instead of useOffers or useLeads
  // Check tableProgressFilter first (for multi-table mode), then pathname, then entityType
  const isProgressPage = useMemo(
    () => checkIsProgressPage(storeEntityType, entityType, effectiveTableProgressFilter, pathname),
    [storeEntityType, entityType, effectiveTableProgressFilter, pathname]
  );

  // Determine has_progress value from tableProgressFilter (store), pathname, or entityType
  const hasProgressValue = useMemo(
    () =>
      getHasProgressValue(
        isProgressPage,
        effectiveTableProgressFilter,
        pathname,
        storeEntityType,
        entityType
      ),
    [isProgressPage, effectiveTableProgressFilter, pathname, storeEntityType, entityType]
  );

  // Convert default filters to query params format
  // Default filters should be passed as regular query params (e.g., use_status=pending)
  // Only convert simple '=' operators to query params, complex operators stay in domain
  // For progress pages: filter out redundant has_opening/has_confirmation/has_payment_voucher if has_progress is set
  const defaultFiltersAsQueryParams = useMemo(
    () =>
      buildDefaultFiltersAsQueryParams(
        buildDefaultFilters,
        isProgressPage,
        hasProgressValue,
        pathname // Pass pathname to detect offers/openings pages
      ),
    [buildDefaultFilters, isProgressPage, hasProgressValue, pathname]
  );

  // Convert "project" filters to "project_id" filters before building query params
  const convertedDomainFilters = useMemo(() => {
    if (!projectNameToIdMap || Object.keys(projectNameToIdMap).length === 0) {
      return groupDomainFilters;
    }

    return groupDomainFilters.map((filter) => {
      // Convert "project" field to "project_id" with actual ID
      if (filter[0] === 'project' && filter[1] === '=') {
        const projectName = filter[2];
        const projectId = projectNameToIdMap[projectName];
        if (projectId) {
          return ['project_id', '=', projectId] as DomainFilter;
        }
      }
      // Handle "in" and "not in" operators for project field
      if (filter[0] === 'project' && (filter[1] === 'in' || filter[1] === 'not in')) {
        const projectNames = Array.isArray(filter[2]) ? filter[2] : [filter[2]];
        const projectIds = projectNames.map((name) => projectNameToIdMap[name]).filter((id) => id);
        if (projectIds.length > 0) {
          return ['project_id', filter[1], projectIds] as DomainFilter;
        }
      }
      return filter;
    });
  }, [groupDomainFilters, projectNameToIdMap]);

  // Build query params for API calls
  // For progress pages: use has_progress instead of domain when has_opening/has_confirmation/has_payment is already in defaultFilters
  // For other pages: use domain parameter as before
  const baseGroupDetailsQueryParams = useMemo(
    () =>
      buildGroupDetailsQueryParams(
        convertedDomainFilters, // Use converted filters instead of original
        defaultFiltersAsQueryParams,
        groupPagination,
        isProgressPage,
        hasProgressValue,
        sorting, // Pass sorting to include sortBy and sortOrder in API calls
        pathname, // Pass pathname to detect offers/openings pages
        search // Pass search from ActionBar
      ),
    [
      convertedDomainFilters, // Use converted filters in dependencies
      defaultFiltersAsQueryParams,
      groupPagination,
      isProgressPage,
      hasProgressValue,
      sorting, // Include sorting in dependencies
      pathname, // Include pathname in dependencies
      search, // Include search in dependencies
    ]
  );

  // Get user session for Agent role handling
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const selectedProjectId = selectedProject?._id || selectedProject?.value;

  // Determine which hook to use based on entity type
  // Prioritize entityType prop when explicitly provided (for multi-table pages like cashflow)
  // Otherwise fall back to storeEntityType, then default to 'Lead'
  const effectiveEntityType = entityType || storeEntityType || 'Lead';
  const entityTypeLower = effectiveEntityType.toLowerCase();
  const isOffersPage = entityTypeLower === 'offer';
  const isUsersPage = entityTypeLower === 'user';
  const isProjectsPage = effectiveEntityType === 'Team';
  const isReclamationsPage = entityTypeLower === 'reclamation';
  const isCashflowEntriesPage = effectiveEntityType === 'CashflowEntry';
  const isCashflowTransactionsPage = effectiveEntityType === 'CashflowTransaction';

  // Determine if we should use progress endpoint (has_progress is set or we're on a progress page)
  // This ensures we use /offers/progress endpoint for progress pages
  const shouldUseProgressEndpoint =
    isProgressPage || !!hasProgressValue || !!effectiveTableProgressFilter;

  // DISABLED: Check if we're on offers or openings page (for Agent role, use project_id instead of team_id)
  // const isOffersOrOpeningsPage = isOffersPage || pathname?.includes('/openings') || false;

  // DISABLED: Process groupDetailsQueryParams to add Agent role project filter
  // Project scoping restriction removed - Agents can now see all projects on offers/openings pages
  const groupDetailsQueryParams = useMemo(() => {
    // For progress pages (offers/openings), remove project_id from params
    // This ensures Agent role URLs match Admin role URLs
    const cleanedParams = { ...baseGroupDetailsQueryParams };
    // Check if we're on offers or openings page using multiple methods
    const isOffersOrOpeningsPage =
      isOffersPage ||
      pathname?.includes('/openings') ||
      pathname?.includes('/offers') ||
      shouldUseProgressEndpoint || // Progress endpoint is used for openings
      false;

    // Always remove project_id for offers/openings/confirmations/payments/netto1/netto2 pages
    if (isOffersOrOpeningsPage) {
      // Remove project_id for progress pages
      delete cleanedParams.project_id;
      delete cleanedParams.project;
    }

    // Add bulk search values when grouping after bulk search (leads page only)
    if (entityTypeLower === 'lead' && isBulkSearchMode && bulkSearchQuery?.length) {
      cleanedParams.values = JSON.stringify(bulkSearchQuery);
    }

    return cleanedParams;
  }, [
    baseGroupDetailsQueryParams,
    shouldUseProgressEndpoint,
    isOffersPage,
    pathname,
    entityTypeLower,
    isBulkSearchMode,
    bulkSearchQuery,
  ]);

  // Get apiUrlStore methods
  const { setApiUrl } = useApiUrlStore();

  // Build API URL from query params for api-url-storage
  const buildGroupApiUrlFn = useCallback(
    () =>
      buildGroupApiUrl(
        groupDetailsQueryParams,
        storeEntityType,
        entityType,
        shouldUseProgressEndpoint,
        userRole,
        selectedProjectId,
        closeProjectIdFromContext ? 'closed-leads' : 'leads'
      ),
    [
      groupDetailsQueryParams,
      storeEntityType,
      entityType,
      shouldUseProgressEndpoint,
      userRole,
      selectedProjectId,
      closeProjectIdFromContext,
    ]
  );

  // For progress pages (openings, confirmations, payments, etc.), use useOffersProgress hook
  const {
    data: progressGroupDetailsData,
    isLoading: progressGroupDetailsLoading,
    isFetching: progressGroupDetailsFetching,
  } = useOffersProgress({
    ...(groupDetailsQueryParams as any),
    enabled: shouldFetchDetails && shouldUseProgressEndpoint,
  });

  // For users, use useUsers hook
  const {
    data: usersGroupDetailsData,
    isLoading: usersGroupDetailsLoading,
    isFetching: usersGroupDetailsFetching,
  } = useUsers(groupDetailsQueryParams as any, {
    enabled: shouldFetchDetails && isUsersPage && !shouldUseProgressEndpoint,
  });

  // For projects (Team entity type), use useProjects hook
  // Transform query params to match ProjectsParams interface
  const projectsQueryParams = useMemo(() => {
    if (!isProjectsPage) return {};
    const params: any = {
      page: groupDetailsQueryParams.page as number | undefined,
      limit: groupDetailsQueryParams.limit as number | undefined,
      sortBy: groupDetailsQueryParams.sortBy as string | undefined,
      sortOrder: groupDetailsQueryParams.sortOrder as string | undefined,
      role: userRole,
    };
    // Pass domain if it exists (API supports it even if not in TypeScript interface)
    if (groupDetailsQueryParams.domain) {
      params.domain = groupDetailsQueryParams.domain;
    }
    return params;
  }, [groupDetailsQueryParams, isProjectsPage, userRole]);

  const {
    data: projectsGroupDetailsData,
    isLoading: projectsGroupDetailsLoading,
    isFetching: projectsGroupDetailsFetching,
  } = useProjects({
    ...projectsQueryParams,
    enabled: shouldFetchDetails && isProjectsPage && !shouldUseProgressEndpoint,
  });

  // Reclamations query params - useReclamation expects domain as DomainFilter[]
  const reclamationsQueryParams = useMemo(() => {
    if (!isReclamationsPage) return undefined;
    const domain = groupDetailsQueryParams.domain;
    return {
      page: groupDetailsQueryParams.page as number | undefined,
      limit: groupDetailsQueryParams.limit as number | undefined,
      sortBy: groupDetailsQueryParams.sortBy as string | undefined,
      sortOrder: groupDetailsQueryParams.sortOrder as string | undefined,
      search: groupDetailsQueryParams.search as string | undefined,
      domain: domain ? (typeof domain === 'string' ? JSON.parse(domain) : domain) : undefined,
      includeAll: true,
    };
  }, [groupDetailsQueryParams, isReclamationsPage]);

  // For reclamations, use useReclamation hook
  const {
    data: reclamationsGroupDetailsData,
    isLoading: reclamationsGroupDetailsLoading,
    isFetching: reclamationsGroupDetailsFetching,
  } = useReclamation({
    ...(reclamationsQueryParams || {}),
    enabled: shouldFetchDetails && isReclamationsPage && !shouldUseProgressEndpoint,
  } as any);

  const closedLeadsGroupParams = useMemo(() => {
    if (!closeProjectIdFromContext || entityTypeLower !== 'lead') return null;
    const p = groupDetailsQueryParams;
    const sortOrderNum =
      p.sortOrder === 'asc' || p.sortOrder === 1 || p.sortOrder === '1' ? 1 : -1;
    const row: Record<string, unknown> = {
      page: Number(p.page) || 1,
      limit: Number(p.limit) || DEFAULT_PAGE_LIMIT,
      sortBy: (p.sortBy as string) || 'closed_at',
      sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : sortOrderNum,
      contact_name: p.search ? String(p.search) : undefined,
      ...(p.values
        ? {
            values:
              typeof p.values === 'string' ? p.values : JSON.stringify(p.values),
          }
        : {}),
    };
    if (p.domain) {
      row.domain = String(p.domain);
    } else if (closeProjectIdFromContext) {
      row.project_id = closeProjectIdFromContext;
    }
    return row;
  }, [closeProjectIdFromContext, entityTypeLower, groupDetailsQueryParams]);

  // For offers, use useOffers hook; for leads and others, use useLeads (or closed-leads on close-project page)
  const {
    data: leadsGroupDetailsData,
    isLoading: leadsGroupDetailsLoading,
    isFetching: leadsGroupDetailsFetching,
  } = useLeads(groupDetailsQueryParams, {
    enabled:
      shouldFetchDetails &&
      !closeProjectIdFromContext &&
      !isOffersPage &&
      !isUsersPage &&
      !isProjectsPage &&
      !isReclamationsPage &&
      !isCashflowEntriesPage &&
      !isCashflowTransactionsPage &&
      !shouldUseProgressEndpoint,
    // Multiple expanded leaf groups: do not show another group's cached rows while this key loads,
    // or _apiUrl / navigation will disagree with visible lead ids.
    keepPreviousData: false,
  });

  const {
    data: closedLeadsGroupDetailsData,
    isLoading: closedLeadsGroupDetailsLoading,
    isFetching: closedLeadsGroupDetailsFetching,
  } = useClosedLeads(closedLeadsGroupParams ?? undefined, {
    enabled:
      shouldFetchDetails &&
      !!closeProjectIdFromContext &&
      !!closedLeadsGroupParams &&
      entityTypeLower === 'lead' &&
      !isOffersPage &&
      !isUsersPage &&
      !isProjectsPage &&
      !isReclamationsPage &&
      !isCashflowEntriesPage &&
      !isCashflowTransactionsPage &&
      !shouldUseProgressEndpoint,
    keepPreviousData: false,
  });

  // For offers, use useOffers hook (only if NOT a progress page)
  // Progress pages should use useOffersProgress instead
  const {
    data: offersGroupDetailsData,
    isLoading: offersGroupDetailsLoading,
    isFetching: offersGroupDetailsFetching,
  } = useOffers({
    ...(groupDetailsQueryParams as any),
    enabled: shouldFetchDetails && isOffersPage && !shouldUseProgressEndpoint,
  });

  // For cashflow entries, use useCashflowEntries hook
  const {
    data: cashflowEntriesGroupDetailsData,
    isLoading: cashflowEntriesGroupDetailsLoading,
    isFetching: cashflowEntriesGroupDetailsFetching,
  } = useCashflowEntries({
    page: groupDetailsQueryParams.page as number | undefined,
    limit: groupDetailsQueryParams.limit as number | undefined,
    domain: groupDetailsQueryParams.domain as string | undefined,
    sortBy: groupDetailsQueryParams.sortBy as string | undefined,
    sortOrder: groupDetailsQueryParams.sortOrder as 'asc' | 'desc' | undefined,
    enabled: shouldFetchDetails && isCashflowEntriesPage && !shouldUseProgressEndpoint,
  });

  // For cashflow transactions, use useAllTransactions hook
  const {
    data: cashflowTransactionsGroupDetailsData,
    isLoading: cashflowTransactionsGroupDetailsLoading,
    isFetching: cashflowTransactionsGroupDetailsFetching,
  } = useAllTransactions({
    page: groupDetailsQueryParams.page as number | undefined,
    limit: groupDetailsQueryParams.limit as number | undefined,
    domain: groupDetailsQueryParams.domain as string | undefined,
    sortField: groupDetailsQueryParams.sortBy as string | undefined,
    sortOrder: groupDetailsQueryParams.sortOrder as 'asc' | 'desc' | undefined,
    enabled: shouldFetchDetails && isCashflowTransactionsPage && !shouldUseProgressEndpoint,
  });

  // Extract data from progress response (which can be OffersProgressResponse or AllOffersProgressResponse)
  // When has_progress is set (not 'all'), it returns OffersProgressResponse with data array
  const normalizedGroupDetailsData = useMemo(() => {
    // Handle cashflow entities first
    if (isCashflowEntriesPage && cashflowEntriesGroupDetailsData) {
      return {
        data: cashflowEntriesGroupDetailsData.data || [],
        meta: cashflowEntriesGroupDetailsData.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          pages: 1,
        },
      };
    }
    if (isCashflowTransactionsPage && cashflowTransactionsGroupDetailsData) {
      return {
        data: cashflowTransactionsGroupDetailsData.data || [],
        meta: cashflowTransactionsGroupDetailsData.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          pages: 1,
        },
      };
    }
    if (isReclamationsPage && reclamationsGroupDetailsData) {
      const meta = reclamationsGroupDetailsData.meta || { total: 0, page: 1, limit: 50 };
      return {
        data: reclamationsGroupDetailsData.data || [],
        meta: {
          ...meta,
          pages: 'pages' in meta ? meta.pages : Math.ceil((meta.total || 0) / (meta.limit || 50)),
        },
      };
    }
    // Fall back to existing logic for other entity types
    const leadsDetailsForNormalize = closeProjectIdFromContext
      ? closedLeadsGroupDetailsData
      : leadsGroupDetailsData;

    return normalizeGroupDetailsData(
      progressGroupDetailsData,
      hasProgressValue,
      isOffersPage,
      isUsersPage,
      isProjectsPage,
      isReclamationsPage,
      offersGroupDetailsData,
      leadsDetailsForNormalize,
      usersGroupDetailsData,
      projectsGroupDetailsData,
      reclamationsGroupDetailsData,
      shouldUseProgressEndpoint
    );
  }, [
    shouldUseProgressEndpoint,
    closeProjectIdFromContext,
    progressGroupDetailsData,
    hasProgressValue,
    isOffersPage,
    isUsersPage,
    isProjectsPage,
    isReclamationsPage,
    isCashflowEntriesPage,
    isCashflowTransactionsPage,
    offersGroupDetailsData,
    leadsGroupDetailsData,
    closedLeadsGroupDetailsData,
    usersGroupDetailsData,
    projectsGroupDetailsData,
    reclamationsGroupDetailsData,
    cashflowEntriesGroupDetailsData,
    cashflowTransactionsGroupDetailsData,
  ]);

  // Use the appropriate data based on entity type
  const groupDetailsData = normalizedGroupDetailsData;
  const groupDetailsLoading = shouldUseProgressEndpoint
    ? progressGroupDetailsLoading || progressGroupDetailsFetching
    : isOffersPage
      ? offersGroupDetailsLoading || offersGroupDetailsFetching
      : isUsersPage
        ? usersGroupDetailsLoading || usersGroupDetailsFetching
        : isProjectsPage
          ? projectsGroupDetailsLoading || projectsGroupDetailsFetching
          : isReclamationsPage
            ? reclamationsGroupDetailsLoading || reclamationsGroupDetailsFetching
            : isCashflowEntriesPage
              ? cashflowEntriesGroupDetailsLoading || cashflowEntriesGroupDetailsFetching
              : isCashflowTransactionsPage
                ? cashflowTransactionsGroupDetailsLoading ||
                  cashflowTransactionsGroupDetailsFetching
                : closeProjectIdFromContext
                  ? closedLeadsGroupDetailsLoading || closedLeadsGroupDetailsFetching
                  : leadsGroupDetailsLoading || leadsGroupDetailsFetching;

  // Transform the data based on entity type to match column expectations
  // The columns expect transformed data (e.g., leadName, projectName, agent) not raw API data
  const transformedGroupDetailsData = useMemo(
    () => transformGroupDetailsData(groupDetailsData, storeEntityType, entityType),
    [groupDetailsData, storeEntityType, entityType]
  );

  // Handle toggle expansion
  const handleToggle = () => {
    toggleGroupExpansion(uniqueGroupId);

    if (!isExpanded) {
      // Set selected group path when expanding
      const newPath =
        parentPath.length > 0
          ? [...parentPath.map((p) => p.groupId), group.groupId]
          : [group.groupId];
      setSelectedGroupPath(newPath);

      // ✅ FIX: Don't set subgroup pagination when expanding a group with subgroups
      // Subgroups are already loaded from the parent grouped summary API
      // Only set pagination when user actually clicks pagination controls (handleSubgroupPaginationChange)
      // This prevents unnecessary API refetch when expanding groups
      // The subgroup pagination will be set only when user interacts with pagination controls
    } else {
      // Clear selected path when collapsing
      setSelectedGroupPath(null);

      // ✅ Clear subgroup pagination for this specific group when collapsing
      // Uses uniqueGroupId to clear only this group's pagination, not others
      if (hasSubGroups && storedSubgroupPagination) {
        clearSubgroupPagination(uniqueGroupId);
      }
    }
  };

  // Handle pagination change for group details
  const handleGroupPaginationChange = useCallback(
    (page: number, newLimit?: number) => {
      setGroupDetailsPagination(uniqueGroupId, {
        ...groupPagination,
        page,
        limit: newLimit !== undefined ? newLimit : groupPagination.limit,
      });
    },
    [uniqueGroupId, groupPagination, setGroupDetailsPagination]
  );

  // Handle pagination change for subgroups at ANY nesting level
  // Uses uniqueGroupId (includes full parent path) to track pagination per group
  // This allows each nesting level (2nd, 3rd, 4th, 5th) to have independent pagination
  const handleSubgroupPaginationChange = useCallback(
    (page: number, newLimit?: number) => {
      // Update subgroup pagination using uniqueGroupId as the key
      // uniqueGroupId includes the full path (e.g., "groupId1|groupId2|groupId3")
      // This ensures each nesting level has its own pagination state
      setSubgroupPagination(uniqueGroupId, {
        subPage: page,
        subLimit: newLimit !== undefined ? newLimit : group.meta?.limit || DEFAULT_PAGE_LIMIT,
      });
    },
    [uniqueGroupId, group.meta?.limit, setSubgroupPagination]
  );

  // Get pagination state for this group's subgroups from store
  // Uses uniqueGroupId to get the pagination state for this specific group
  const storedSubgroupPagination = useMemo(
    () => subgroupPagination[uniqueGroupId] || null,
    [subgroupPagination, uniqueGroupId]
  );

  // Get pagination for subgroups (from group's meta object OR store)
  // Store takes precedence if it exists (user has interacted with pagination)
  // Otherwise, use meta from API response
  const subgroupPaginationFromMeta = useMemo(() => {
    // If user has set pagination in store, use that limit; otherwise use meta limit or default
    const effectiveLimit =
      storedSubgroupPagination?.subLimit || group.meta?.limit || DEFAULT_PAGE_LIMIT;
    const effectivePage = storedSubgroupPagination?.subPage || group.meta?.page || 1;
    const total = group.meta?.total || 0;

    // Calculate pages based on effective limit (might differ from API's pages if user changed limit)
    const calculatedPages = total > 0 ? Math.ceil(total / effectiveLimit) : 1;

    return {
      page: effectivePage,
      limit: effectiveLimit,
      total: total,
      pages: Math.max(calculatedPages, group.meta?.pages || 1), // Use higher of calculated or API pages
    };
  }, [storedSubgroupPagination, group.meta]);

  // Get range text for subgroup pagination display
  const getSubgroupRangeText = useCallback(() => {
    const start =
      subgroupPaginationFromMeta.page === 1
        ? 1
        : (subgroupPaginationFromMeta.page - 1) * subgroupPaginationFromMeta.limit + 1;
    const end = Math.min(
      subgroupPaginationFromMeta.page * subgroupPaginationFromMeta.limit,
      subgroupPaginationFromMeta.total
    );
    return `${start}-${end}`;
  }, [subgroupPaginationFromMeta]);

  // Get range text for pagination display
  const getRangeText = useCallback(
    () =>
      getRangeTextUtil(groupPagination.page, groupPagination.limit, groupDetailsData?.meta?.total),
    [groupPagination.page, groupPagination.limit, groupDetailsData?.meta?.total]
  );

  // Handle page size editing
  const startEditingPageSize = useCallback(() => {
    if (!pageSizeSpanRef.current) return;
    setIsEditingPageSize(true);
    // Show current range value for editing (e.g., "1-10")
    const start =
      groupPagination.page === 1 ? 1 : (groupPagination.page - 1) * groupPagination.limit + 1;
    const end = Math.min(
      groupPagination.page * groupPagination.limit,
      groupDetailsData?.meta?.total || 0
    );
    pageSizeSpanRef.current.textContent = `${start}-${end}`;
  }, [groupPagination.page, groupPagination.limit, groupDetailsData?.meta?.total]);

  const handleSpanClick = useCallback(() => {
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(startEditingPageSize, 200);
  }, [startEditingPageSize]);

  const handlePageSizeDoubleClick = useCallback(() => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    const total = groupDetailsData?.meta?.total || 0;
    if (total > 0) {
      handleGroupPaginationChange(1, total);
    }
  }, [groupDetailsData?.meta?.total, handleGroupPaginationChange]);

  const handleSpanInput = useCallback((e: React.FormEvent<HTMLSpanElement>) => {
    const text = e.currentTarget.textContent || '';
    // Allow numeric input and dash (for range format like "1-10")
    if (!/^[\d-]+$/.test(text) && text !== '') {
      e.currentTarget.textContent = text.replace(/[^\d-]/g, '');
    }
  }, []);

  const submitPageSize = useCallback(() => {
    if (!pageSizeSpanRef.current) return;

    const text = pageSizeSpanRef.current.textContent || '';
    // Parse the input - could be "1-10" format or just a number
    let newPageSize: number;

    if (text.includes('-')) {
      // If it's in range format "1-10", extract the end number
      const parts = text.split('-');
      newPageSize = parseInt(parts[parts.length - 1]?.trim() || '', 10);
    } else {
      // If it's just a number
      newPageSize = parseInt(text, 10);
    }

    if (isNaN(newPageSize) || newPageSize < 1) {
      // Invalid input, restore original range display
      pageSizeSpanRef.current.textContent = getRangeText();
      setIsEditingPageSize(false);
      return;
    }

    const total = groupDetailsData?.meta?.total || 0;
    const maxPageSize = total > 0 ? total : 1000;
    handleGroupPaginationChange(1, Math.min(newPageSize, maxPageSize));
    setIsEditingPageSize(false);
  }, [getRangeText, groupDetailsData?.meta?.total, handleGroupPaginationChange]);

  const handleSpanKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitPageSize();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditingPageSize(false);
        // Restore original range display
        if (pageSizeSpanRef.current) {
          pageSizeSpanRef.current.textContent = getRangeText();
        }
      }
    },
    [submitPageSize, getRangeText]
  );

  // Auto-select text when editing starts and ensure default value is set
  useEffect(() => {
    if (isEditingPageSize && pageSizeSpanRef.current) {
      // Ensure the text content is set if it's empty
      if (
        !pageSizeSpanRef.current.textContent ||
        pageSizeSpanRef.current.textContent.trim() === ''
      ) {
        pageSizeSpanRef.current.textContent = getRangeText();
      }

      requestAnimationFrame(() => {
        if (pageSizeSpanRef.current) {
          const range = document.createRange();
          range.selectNodeContents(pageSizeSpanRef.current);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      });
    }
  }, [isEditingPageSize, getRangeText]);

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    },
    []
  );

  // Use refs to track previous values and avoid infinite loops
  const previousDataRef = useRef<any[] | null>(null);
  const previousApiUrlRef = useRef<string | null>(null);
  const previousExpandedRef = useRef<boolean>(false);
  const previousGroupIdRef = useRef<string | null>(null);

  // Memoize API URL to avoid recreating it unnecessarily
  const currentApiUrl = useMemo(() => {
    if (isExpanded && !hasSubGroups && shouldFetchDetails) {
      return buildGroupApiUrlFn();
    }
    return null;
  }, [isExpanded, hasSubGroups, shouldFetchDetails, buildGroupApiUrlFn]);

  // Store API URL when group is expanded (even before data loads)
  useEffect(() => {
    if (currentApiUrl && currentApiUrl !== previousApiUrlRef.current) {
      setApiUrl(currentApiUrl);
      previousApiUrlRef.current = currentApiUrl;
    }
  }, [currentApiUrl, setApiUrl]);

  // Keep track of which leads are currently visible for expanded groups
  // Also store lead IDs for navigation tracking
  useEffect(() => {
    const isCurrentlyExpanded = isExpanded && !hasSubGroups;
    const currentData = groupDetailsData?.data;
    const groupIdChanged = previousGroupIdRef.current !== uniqueGroupId;
    if (isCurrentlyExpanded && currentData && Array.isArray(currentData)) {
      const leads = currentData;
      const dataChanged =
        groupIdChanged ||
        !previousDataRef.current ||
        previousDataRef.current.length !== leads.length ||
        previousDataRef.current.some((prevLead, index) => {
          const currentLead = leads[index];
          return !currentLead || prevLead._id !== currentLead._id;
        });

      // Update if data changed or group wasn't previously expanded
      if (dataChanged || !previousExpandedRef.current) {
        setVisibleLeadsForGroup(uniqueGroupId, leads);

        // Use current API URL (already memoized)
        const apiUrl = currentApiUrl;

        // Only update API URL if it changed and is available
        if (apiUrl && previousApiUrlRef.current !== apiUrl) {
          setApiUrl(apiUrl);
          previousApiUrlRef.current = apiUrl;
        }
        if (groupDetailsData?.meta) {
          const meta = groupDetailsData?.meta;

          // Build pagination metadata with correct total
          const paginationMeta = meta
            ? {
                page: meta.page || groupPagination.page || 1,
                limit: meta.limit || groupPagination.limit || DEFAULT_PAGE_LIMIT,
                total: meta.total || 0, // ✅ Total items in this group
                pages:
                  meta.pages ||
                  Math.ceil(
                    (meta.total || 0) / (meta.limit || groupPagination.limit || DEFAULT_PAGE_LIMIT)
                  ),
              }
            : undefined;

          // Build filter state for navigation
          const filterState = {
            isGroupedMode: true,
            groupBy: groupByFields.join(','), // Convert array to comma-separated string
            groupPath: [
              ...parentPath,
              {
                groupId: group.groupId,
                groupName: group.groupName,
                fieldName: group.fieldName,
              },
            ].map((p) => p.groupName), // Array of group names for filtering
            sortBy: sorting?.sortBy || undefined,
            sortOrder: sorting?.sortOrder || undefined,
            paginationMeta,
          };
          setGroupContext(filterState, paginationMeta);
        }
        previousDataRef.current = leads;
        previousGroupIdRef.current = uniqueGroupId;
      }
    } else if (!isCurrentlyExpanded && previousExpandedRef.current) {
      // Only remove if we were previously expanded
      removeVisibleLeadsForGroup(uniqueGroupId);
      previousDataRef.current = null;
      previousApiUrlRef.current = null;
      previousGroupIdRef.current = null;
      clearGroupContext(); // Clear global group context when collapsing
    }

    previousExpandedRef.current = isCurrentlyExpanded;
  }, [
    groupDetailsData?.data,
    groupDetailsData?.meta,
    hasSubGroups,
    isExpanded,
    removeVisibleLeadsForGroup,
    setVisibleLeadsForGroup,
    uniqueGroupId,
    currentApiUrl,
    setApiUrl,
    clearGroupContext,
    setGroupContext,
    entityType,
    groupPagination,
    groupByFields,
    parentPath,
    group.groupId,
    group.groupName,
    group.fieldName,
    groupDomainFilters,
    sorting,
  ]);

  // Clean up when the component unmounts to avoid stale visibility state
  useEffect(
    () => () => {
      removeVisibleLeadsForGroup(uniqueGroupId);
    },
    [removeVisibleLeadsForGroup, uniqueGroupId, clearGroupContext, setGroupContext]
  );

  // Get group display name
  const groupDisplayName = formatGroupNameIfDate(group.groupName);

  // Toggle selection for a single lead in grouped view
  const handleToggleLeadSelection = useCallback(
    (lead: any) => {
      const id = lead?._id?.toString();
      if (!id) return;

      const isAlreadySelected = effectiveSelectedLeads.includes(id);
      const updatedIds = isAlreadySelected
        ? effectiveSelectedLeads.filter((leadId: string) => leadId !== id)
        : [...effectiveSelectedLeads, id];

      const previousItems = getSelectedItems(tableName as any) || [];
      const filteredPrevious = previousItems.filter((item) => item?._id?.toString() !== id);
      const updatedObjects = isAlreadySelected ? filteredPrevious : [...filteredPrevious, lead];

      // Update context if available (for leads dashboard)
      if (setSelectedLeads) {
        setSelectedLeads(updatedIds);
      }

      // Always update store (works for both leads and offers)
      setSelectedItems(updatedObjects, tableName as any);

      // Call context handlers if available (for leads)
      handleGroupedLeadSelectionChange?.(updatedObjects);
      handleGroupedLeadsSelectionForAssignment?.(updatedObjects);
    },
    [
      getSelectedItems,
      handleGroupedLeadSelectionChange,
      handleGroupedLeadsSelectionForAssignment,
      effectiveSelectedLeads,
      setSelectedItems,
      setSelectedLeads,
      tableName,
    ]
  );

  return (
    <>
      {/* Group Summary Row */}
      <tr
        className={`border-b bg-gray-100 ${
          hasSubGroups || group.count > 0 ? 'cursor-pointer' : ''
        }`}
        onClick={hasSubGroups || group.count > 0 ? handleToggle : undefined}
      >
        {/* Span all columns for group summary */}
        <td colSpan={columns.length} className="p-0.5">
          <div className="relative flex items-center">
            {/* Left side: Group Name and Count */}
            <div className="flex items-center gap-2" style={{ marginLeft: `${level * 100}px` }}>
              {/* Expand/Collapse Icon */}
              {(hasSubGroups || group.count > 0) && (
                <Button
                  variant="plain"
                  size="sm"
                  icon={
                    <ApolloIcon
                      name={isExpanded ? 'arrow-down' : 'arrow-right'}
                      className="text-base"
                    />
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle();
                  }}
                />
              )}

              {/* Group Name and Count */}
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900 capitalize">
                  {groupDisplayName}
                </h3>
                <p className="text-xs text-gray-600">{group.count}</p>

                {/* Show summary data if available (for cashflow transactions) */}
                {group.summary && (
                  <div className="ml-4 flex items-center gap-4 text-xs text-gray-700">
                    {group.summary.current_balance !== null &&
                      group.summary.current_balance !== undefined && (
                        <span className="font-medium">
                          Balance:{' '}
                          <span className="text-blue-600">
                            €{group.summary.current_balance.toLocaleString()}
                          </span>
                        </span>
                      )}
                    {group.summary.total_incoming_received !== undefined &&
                      group.summary.total_incoming_received > 0 && (
                        <span className="text-green-600">
                          ↓ In: €{group.summary.total_incoming_received.toLocaleString()} (
                          {group.summary.incoming_received_count})
                        </span>
                      )}
                    {group.summary.total_outgoing !== undefined &&
                      group.summary.total_outgoing > 0 && (
                        <span className="text-red-600">
                          ↑ Out: €{group.summary.total_outgoing.toLocaleString()} (
                          {group.summary.outgoing_count})
                        </span>
                      )}
                    {group.summary.total_incoming_pending !== undefined &&
                      group.summary.total_incoming_pending > 0 && (
                        <span className="text-yellow-600">
                          ⏳ Pending: €{group.summary.total_incoming_pending.toLocaleString()} (
                          {group.summary.incoming_pending_count})
                        </span>
                      )}
                    {group.summary.usable_balance !== undefined &&
                      group.summary.usable_balance !== group.summary.current_balance && (
                        <span className="text-purple-600">
                          Usable: €{group.summary.usable_balance.toLocaleString()}
                        </span>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Middle: Pagination (centered) */}
            <div className="absolute left-1/2 -translate-x-1/2">
              {/* Show pagination for group details when expanded, no subgroups, and has pagination data */}
              {isExpanded &&
                !hasSubGroups &&
                groupDetailsData?.meta &&
                groupDetailsData.meta.total > 0 && (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onDoubleClick={handlePageSizeDoubleClick}
                      className="cursor-pointer rounded px-1 text-xs whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                      title="Single click span to edit page size, double click to show all items"
                    >
                      <span
                        ref={pageSizeSpanRef}
                        contentEditable={isEditingPageSize}
                        suppressContentEditableWarning
                        onClick={handleSpanClick}
                        onInput={handleSpanInput}
                        onBlur={submitPageSize}
                        onKeyDown={handleSpanKeyDown}
                        className={
                          isEditingPageSize
                            ? 'inline-block w-20 max-w-min rounded bg-gray-50 px-1 transition-all duration-200 ease-in-out outline-none'
                            : 'transition-all duration-200 ease-in-out'
                        }
                      >
                        {!isEditingPageSize && getRangeText()}
                      </span>{' '}
                      /{groupDetailsData.meta.total}
                    </button>
                    {groupDetailsData.meta.total > groupPagination.limit && (
                      <div className="flex items-center gap-1">
                        <Prev
                          currentPage={groupPagination.page}
                          pagerClass={{
                            default:
                              'cursor-pointer text-sm rounded-md hover:bg-gray-200 transition-colors',
                            inactive: 'text-gray-700',
                            active: 'bg-blue-500 text-white',
                            disabled: 'text-gray-400 cursor-not-allowed hover:bg-transparent',
                          }}
                          onPrev={() => handleGroupPaginationChange(groupPagination.page - 1)}
                        />
                        <Next
                          currentPage={groupPagination.page}
                          pageCount={
                            'pages' in groupDetailsData.meta
                              ? groupDetailsData.meta.pages
                              : Math.ceil(groupDetailsData.meta.total / groupPagination.limit)
                          }
                          pagerClass={{
                            default:
                              'cursor-pointer text-sm rounded hover:bg-gray-300 transition-colors',
                            inactive: 'text-gray-700',
                            active: 'bg-blue-500 text-white',
                            disabled: 'text-gray-400 cursor-not-allowed hover:bg-transparent',
                          }}
                          onNext={() => handleGroupPaginationChange(groupPagination.page + 1)}
                        />
                      </div>
                    )}
                  </div>
                )}
              {/* Show pagination for subgroups when expanded, has subgroups, and has pagination data */}
              {/* Phase 2: Works at ANY nesting level (2nd, 3rd, 4th, 5th) */}
              {/* Show pagination section if group has subgroups and either has meta with total > 0 OR has count > 0 */}
              {isExpanded &&
                hasSubGroups &&
                ((group.meta && group.meta.total > 0) || group.count > 0) && (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs whitespace-nowrap text-gray-700">
                      {getSubgroupRangeText()} / {group.meta?.total || group.count || 0}
                    </span>
                    {/* Show pagination controls if there are multiple pages OR if total is large enough to warrant pagination */}
                    {/* Phase 2: Show pagination at ANY nesting level when:
                      1. API reports multiple pages (pages > 1), OR
                      2. Total exceeds current effective limit (more items than currently shown), OR  
                      3. Total exceeds default page limit (enough items to warrant pagination), OR
                      4. User has set custom pagination (has interacted with pagination), OR
                      5. Count exceeds default limit (fallback if meta is missing) */}
                    {(() => {
                      const total = group.meta?.total || group.count || 0;
                      const effectiveLimit = subgroupPaginationFromMeta.limit;
                      const hasMultiplePages = subgroupPaginationFromMeta.pages > 1;
                      const totalExceedsLimit = total > effectiveLimit;
                      const totalExceedsDefault = total > DEFAULT_PAGE_LIMIT;
                      const hasStoredPagination = storedSubgroupPagination !== null;
                      const countExceedsDefault = group.count > DEFAULT_PAGE_LIMIT;

                      // Show pagination if any condition is true
                      return (
                        hasMultiplePages ||
                        totalExceedsLimit ||
                        totalExceedsDefault ||
                        hasStoredPagination ||
                        countExceedsDefault
                      );
                    })() && (
                      <div className="flex items-center gap-1">
                        <Prev
                          currentPage={subgroupPaginationFromMeta.page}
                          pagerClass={{
                            default:
                              'cursor-pointer text-sm rounded-md hover:bg-gray-200 transition-colors',
                            inactive: 'text-gray-700',
                            active: 'bg-blue-500 text-white',
                            disabled: 'text-gray-400 cursor-not-allowed hover:bg-transparent',
                          }}
                          onPrev={() =>
                            handleSubgroupPaginationChange(subgroupPaginationFromMeta.page - 1)
                          }
                        />
                        <Next
                          currentPage={subgroupPaginationFromMeta.page}
                          pageCount={subgroupPaginationFromMeta.pages}
                          pagerClass={{
                            default:
                              'cursor-pointer text-sm rounded hover:bg-gray-300 transition-colors',
                            inactive: 'text-gray-700',
                            active: 'bg-blue-500 text-white',
                            disabled: 'text-gray-400 cursor-not-allowed hover:bg-transparent',
                          }}
                          onNext={() =>
                            handleSubgroupPaginationChange(subgroupPaginationFromMeta.page + 1)
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* Right side: Loading indicator */}
            <div className="ml-auto flex items-center gap-2">
              {isExpanded && groupDetailsLoading && <Skeleton width="60px" height="16px" />}
            </div>
          </div>
        </td>
      </tr>

      {/* Expanded Group Content */}
      {isExpanded && (
        <>
          {/* Render subgroups first if they exist (multilevel grouping) */}
          {hasSubGroups && group.subGroups && (
            <>
              {group.subGroups.map((subGroup) => (
                <GroupSummary
                  key={subGroup.groupId}
                  group={subGroup}
                  columns={columns}
                  entityType={entityType}
                  onRowClick={onRowClick}
                  level={level + 1}
                  parentPath={
                    parentPath.length > 0
                      ? [
                          ...parentPath,
                          {
                            groupId: group.groupId,
                            groupName: group.groupName,
                            fieldName: group.fieldName || '',
                          },
                        ]
                      : [
                          {
                            groupId: group.groupId,
                            groupName: group.groupName,
                            fieldName: group.fieldName || '',
                          },
                        ]
                  }
                  groupByFields={effectiveGroupByFields}
                  tableProgressFilter={tableProgressFilter}
                  search={search}
                />
              ))}
            </>
          )}

          {/* Render group details only if there are no subgroups (leaf node) */}
          {!hasSubGroups && (
            <>
              {groupDetailsLoading ? (
                // Loading skeleton - show 30 rows
                <>
                  {Array.from({ length: 10 }, (_, index) => (
                    <tr key={`skeleton-row-${index}`} className="border-b">
                      {columns.map((column, colIndex) => {
                        // Check if this is the checkbox column
                        const isCheckboxColumn = column.id === 'checkbox';

                        return (
                          <td key={`skeleton-col-${colIndex}`} className="p-0.5">
                            <div className="flex items-center gap-2">
                              {isCheckboxColumn ? (
                                <Skeleton variant="circle" width="16px" height="16px" />
                              ) : (
                                <Skeleton width="100%" height="20px" />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ) : transformedGroupDetailsData?.data &&
                Array.isArray(transformedGroupDetailsData.data) &&
                transformedGroupDetailsData.data.length > 0 ? (
                // Render group details as table rows
                // Note: Data rows should align with table headers (no indentation)
                // Use transformed data which matches column expectations
                <>
                  {transformedGroupDetailsData.data.map((item: any, index: number) => {
                    // Attach _apiUrl to each item for navigation tracking
                    const itemWithApiUrl = {
                      ...item,
                      _apiUrl: buildGroupApiUrlFn(),
                    };
                    const itemId = item?._id?.toString();
                    const isSelected = effectiveSelectedLeads.includes(itemId);
                    const offerTypeValue =
                      item?.offerType || item?.offer_type || item?.offer_type_name || '';
                    const isOfferTypeColored =
                      isOffersPage ||
                      pathname?.includes('/offers') ||
                      pathname?.includes('/openings') ||
                      shouldUseProgressEndpoint;
                    const offerTypeClass =
                      !isSelected && isOfferTypeColored
                        ? offerTypeValue === 'ETF'
                          ? 'bg-pink-50'
                          : offerTypeValue === 'Festgeld'
                            ? 'bg-blue-50'
                            : offerTypeValue === 'Tagesgeld'
                              ? 'bg-green-50'
                              : ''
                        : '';
                    const baseRowClass = offerTypeClass
                      ? 'hover:brightness-95'
                      : 'hover:bg-gray-50';
                    const selectedClass = isSelected ? 'bg-gray-100' : '';

                    return (
                      <tr
                        key={item._id || index}
                        className={`border-b ${offerTypeClass} ${baseRowClass} ${selectedClass}`}
                        onClick={() => onRowClick?.(itemWithApiUrl)}
                      >
                        {columns.map((column, colIndex) => {
                          // Create a mock row object for flexRender with all required methods
                          // This matches the TanStack Table Row interface expected by column.cell
                          const isChecked = isSelected;

                          // Get the accessorKey or id for this column
                          const accessorKey = (column as any).accessorKey || column.id;

                          // Create a proper getValue function that handles accessorKey
                          // TanStack Table's getValue expects to be called with the column's accessorKey
                          // Since data is already transformed, we can directly access properties
                          // ✅ Use itemWithApiUrl so _apiUrl is available in CellInlineEdit via props.row.original
                          const getValue = (key?: string) => {
                            const path = key || accessorKey;
                            if (!path) return undefined;

                            // Handle nested paths (e.g., "lead_id.contact_name") as fallback
                            if (typeof path === 'string' && path.includes('.')) {
                              return getNestedValue(itemWithApiUrl, path);
                            }

                            // Direct property access (transformed data has flat structure)
                            return itemWithApiUrl[path];
                          };

                          const mockRow = {
                            original: itemWithApiUrl, // ✅ Use itemWithApiUrl so _apiUrl is available in CellInlineEdit
                            getValue,
                            // Add row selection methods that DataTableOptimized expects
                            getIsSelected: () => isChecked,
                            getIsSomeSelected: () => false, // No sub-rows in grouped view
                            getToggleSelectedHandler: () => () =>
                              handleToggleLeadSelection(itemWithApiUrl),
                          };

                          if (column.id === 'checkbox') {
                            return (
                              <td key={colIndex} className="p-0.5">
                                <div
                                  className="flex w-full items-start justify-start"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onChange={() => handleToggleLeadSelection(item)}
                                  />
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={colIndex} className="p-0.5">
                              {column.cell
                                ? flexRender(column.cell, {
                                    row: mockRow,
                                    getValue: () => getValue(accessorKey),
                                    column: { columnDef: column } as any,
                                  } as any)
                                : getValue(accessorKey) || ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              ) : (
                // No data message (only show if we tried to fetch but got no data)
                shouldFetchDetails && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="p-0.5 text-center text-sm text-gray-500"
                    >
                      No{' '}
                      {entityTypeLower === 'user'
                        ? 'users'
                        : entityTypeLower === 'offer'
                          ? 'offers'
                          : 'items'}{' '}
                      found in this group
                    </td>
                  </tr>
                )
              )}
            </>
          )}
        </>
      )}
    </>
  );
};

export default GroupSummary;
