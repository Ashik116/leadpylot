'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import HideActions from '../HideActions';
import BulkSearchResultsHeader from '@/components/shared/BulkSearchResultsHeader/BulkSearchResultsHeader';
import DynamicFilterResults from '../DynamicFilterResults';
import CommonActionBar from '@/components/shared/ActionBar/CommonActionBar';
import { LeadsSwitchToSection } from '../LeadsSwitchToSection';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import {
  filtersToQueryParams,
  hasMeaningfulDomainFilters,
  normalizeDomainFiltersForApi,
} from '@/utils/filterUtils';
import { useGroupedSummary, useLeads } from '@/services/hooks/useLeads';
import { useFilterAwareLeadsNavigationStore } from '@/stores/navigationStores';
import { ActionButton } from '@/components/shared/ActionBar/ActionDropDown';
import RoleGuard from '@/components/shared/RoleGuard';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useLeadsDashboardContext } from '../../context/LeadsDashboardContext';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { usePathname, useRouter } from 'next/navigation';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { useSession } from '@/hooks/useSession';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import { useGroupedVisibleLeadsStore } from '@/stores/groupedVisibleLeadsStore';
import {
  mergeCloseProjectTeamDomain,
  isProjectLeadsMongoDetailRoute,
} from '@/utils/closeProjectUtils';

// Type guard function to check if the data is GetAllLeadsResponse
function isGetAllLeadsResponse(data: any): data is { data: any[]; meta: { total: number } } {
  return data && typeof data === 'object' && 'data' in data && 'meta' in data;
}

const ActionsLeadTableComponents = () => {
  const router = useRouter();
  // Get selected items from global store (single source of truth)
  // This ensures selected count shows correctly in grouped mode and all other modes
  const { getSelectedItems, getSelectedIds } = useSelectedItemsStore();
  const selectedItemsFromStore = getSelectedItems('leads');
  const selectedIdsFromStore = getSelectedIds('leads');

  // Get grouped summary pagination and filters from store
  // Use same pagination name as LeadDataTables to ensure consistency
  const {
    pagination, // Use same name as LeadDataTables
    setPagination: setGroupedPagination,
    userDomainFilters, // Use userDomainFilters only (not combined with defaults)
    lockedDomainFilters, // Include locked filters for Agent on live-leads (status_id)
    groupBy: storeGroupBy,
    subgroupPagination,
    sorting,
    buildDefaultFilters, // Function to get default filters
  } = useUniversalGroupingFilterStore();

  // Consume all needed values from context
  const {
    // Shared data table flag
    sharedDataTable,

    // Bulk search related
    isBulkSearchMode,
    bulkSearchResults,
    bulkSearchQuery,
    clearBulkSearch,
    handleEditBulkSearch,

    // Dynamic filter related
    isDynamicFilterMode,
    filterSource,
    dynamicFilterResults,
    clearDynamicFilters,
    dynamicTotal,
    handleClearStatusFilter,

    // Loading state
    isLoading,

    // Common action bar props
    selectedLeads,
    handleClearSelectionWrapper,
    onAppendQueryParams,
    search,
    deleteButton,
    allColumns,
    columnVisibility,
    handleColumnVisibilityChange,
    setDeleteConfirmDialogOpen,
    setIsColumnOrderDialogOpen,
    customizeButtonRef,
    isColumnOrderDialogOpen,
    tableName,
    setIsProjectOpen,
    filterData,
    extraActions,
    handleFilterDataChange,

    // Status and filter handling
    selectedStatus,
    handleStatusChange,

    // Group by related
    hideGroupBy,
    selectedGroupBy,
    handleGroupByChange,
    handleGroupByArrayChangeWithReset,
    isMultiLevelGroupingApplied,
    handleMultiLevelGrouping,
    groupedLeadsSortBy,
    groupedLeadsSortOrder,
    handleGroupedLeadsSortChange,
    hideProjectOption,

    // Pagination related
    selectedGroupDetails,
    page,
    pageSize,
    externalPage,
    externalPageSize,
    dynamicPage,
    dynamicPageSize,
    setPage,
    setPageSize,
    handleDynamicFilterPaginationWrapper,

    // Data related
    groupLeadsData,
    liftedGroupedLeadsData,
    externalTotal,
    leadsData,
    externalData,

    // Selection handlers
    selectAllGroupedLeads,
    handleSelectAllSmart,
    hasSelectedGroupBy,
    areAllDisplayedItemsSelected,

    // Filter clearing handlers
    handleClearImportFilter,
    handleClearGroupByFilter,
    handleClearDynamicFilters,

    // Filter states
    hasFilterData,
    hasSelectedStatus,
    hasDynamicFilters,
    hasUserAddedGroupBy,

    // Filter chain
    buildApiFilters,

    // Additional components
    filterBtnComponent,

    // Action handlers
    clearGroupDetails,
    setUpdateConfirmDialogOpen,
    pageTitle,
    handleMakeFreshLeads,
    handleAssignLeads,
    groupedLeadsTransformLeads,
    transformLeads,
    handleBulkUpdate,
    setIsReclamationDialogOpen,
    isArchivedPage,
    setArchiveConfirmDialogOpen,
    setRestoreConfirmDialogOpen,

    // Pending leads component flag
    pendingLeadsComponent,

    // Closed leads props
    closeProjectId,
    externalProjectId,
    handleRevertClosedProjectLeads,
    isSubmitting,
    setSelectedLeads,
  } = useLeadsDashboardContext();

  // Include locked + user domain filters (same as LeadDataTables)
  // For Agent on live-leads, locked filters (status_id) are required - API must have domain param
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

  const teamScopedLeadsDomainFilters = useMemo(() => {
    if (closeProjectId) return mergeCloseProjectTeamDomain(closeProjectId, domainFilters);
    if (isProjectLeadsMongoDetailPage && externalProjectId)
      return mergeCloseProjectTeamDomain(externalProjectId, domainFilters);
    return domainFilters;
  }, [closeProjectId, externalProjectId, domainFilters, isProjectLeadsMongoDetailPage]);

  const isLeadsBankPage = pathname === '/dashboards/leads-bank';
  const allLeadsPage = pathname === '/dashboards/leads';

  // Get session to check if agent is on grouped page
  const { data: session, status: sessionStatus } = useSession();
  const isArchivedLeadsPage = pathname?.includes('leads/archived') ?? false;
  const isSessionReady =
    sessionStatus === 'authenticated' || (sessionStatus !== 'loading' && !!session?.user);

  const { selectedProject } = useSelectedProjectStore();
  const projectId = selectedProject?._id;
  const effectiveProjectId = projectId === 'all' ? undefined : projectId;
  const isAllProjectsSelected = selectedProject?._id === 'all' || selectedProject?.value === 'all';

  // Convert default filters from buildApiFilters to query params format
  // Default filters as regular query params (e.g., use_status=pending); leads page needs includeAll=true
  // Keep aligned with LeadDataTables so useGroupedSummary shares one React Query cache entry
  const defaultFiltersAsQueryParams = useMemo((): Record<string, string | number | boolean> => {
    const base: Record<string, string | number | boolean> = {
      ...(allLeadsPage ? { includeAll: true } : {}),
      ...filtersToQueryParams((buildApiFilters || buildDefaultFilters)?.() ?? []),
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
    buildDefaultFilters,
    allLeadsPage,
    session?.user?.role,
    effectiveProjectId,
    closeProjectId,
    isProjectLeadsMongoDetailPage,
  ]);

  // Check if custom filters are applied (user has added filters)
  const hasUserFilters = useMemo(() => {
    return hasMeaningfulDomainFilters(userDomainFilters);
  }, [userDomainFilters]);

  // Get navigation store paginationMeta for total count when filters are applied
  const navigationPaginationMeta = useFilterAwareLeadsNavigationStore(
    (state) => state.paginationMeta
  );

  // Use selectedGroupBy from props, fallback to store
  const effectiveGroupBy = selectedGroupBy.length > 0 ? selectedGroupBy : storeGroupBy;

  // CRITICAL: For agents on live-leads/recycle-leads/archived pages, prevent automatic grouped summary API call on initial load/reload
  // The grouping should be set up, but the API call should only happen after user interaction (pagination, filters, group expansion, etc.)
  // IMPORTANT: This only affects agents, admins are not affected
  const isAgentOnGroupedPage =
    session?.user?.role === Role.AGENT &&
    (pathname?.includes('live-leads') ||
      pathname?.includes('recycle-leads') ||
      pathname?.includes('leads/archived'));
  const [shouldEnableGroupedSummary, setShouldEnableGroupedSummary] =
    useState(!isAgentOnGroupedPage); // Disable for agents on grouped pages initially
  const isInitialMountRef = useRef(true);
  const initialPaginationRef = useRef({ page: pagination.page, limit: pagination.limit });
  const initialFiltersRef = useRef(domainFilters.length);
  const initialSortingRef = useRef({ sortBy: sorting.sortBy, sortOrder: sorting.sortOrder });
  const initialProjectIdRef = useRef(effectiveProjectId); // Track initial project ID

  // Set initial values on mount (only once)
  useEffect(() => {
    if (isInitialMountRef.current) {
      initialPaginationRef.current = { page: pagination.page, limit: pagination.limit };
      initialFiltersRef.current = domainFilters.length;
      initialSortingRef.current = { sortBy: sorting.sortBy, sortOrder: sorting.sortOrder };
      initialProjectIdRef.current = effectiveProjectId; // Store initial project ID
      isInitialMountRef.current = false;
    }
  }, []); // Only run once on mount

  // Enable grouped summary API when dependencies are ready (production: session/groupBy/domain may load async)
  useEffect(() => {
    if (!isSessionReady) return;
    if (isInitialMountRef.current) return;

    if (isAgentOnGroupedPage && !shouldEnableGroupedSummary && effectiveGroupBy.length > 0) {
      const hasDomainFilters = domainFilters.length > 0;
      const hasRequiredData =
        session?.user?.role === Role.AGENT
          ? isArchivedLeadsPage
            ? true
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

  // Retry for production: re-check every 300ms when async data may load in different order
  const domainFiltersRef = useRef(domainFilters);
  const effectiveProjectIdRef = useRef(effectiveProjectId);
  const isAllProjectsSelectedRef = useRef(isAllProjectsSelected);
  domainFiltersRef.current = domainFilters;
  effectiveProjectIdRef.current = effectiveProjectId;
  isAllProjectsSelectedRef.current = isAllProjectsSelected;

  useEffect(() => {
    if (!isSessionReady || !isAgentOnGroupedPage || shouldEnableGroupedSummary) return;
    if (effectiveGroupBy.length === 0) return;

    const hasRequiredData = isArchivedLeadsPage
      ? true
      : domainFiltersRef.current.length > 0 ||
        effectiveProjectIdRef.current !== undefined ||
        isAllProjectsSelectedRef.current;

    if (hasRequiredData) {
      setShouldEnableGroupedSummary(true);
      return;
    }

    let attempts = 0;
    const id = setInterval(() => {
      attempts++;
      const ready =
        isArchivedLeadsPage ||
        domainFiltersRef.current.length > 0 ||
        effectiveProjectIdRef.current !== undefined ||
        isAllProjectsSelectedRef.current;
      if (ready || attempts >= 7) {
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

  // Enable grouped summary API when user interacts (pagination change, filter change, sorting change, project change, or group expansion)
  // This prevents the automatic API call on initial load/reload for agents
  useEffect(() => {
    // Skip on initial mount to prevent false positives
    if (isInitialMountRef.current) return;

    if (isAgentOnGroupedPage && !shouldEnableGroupedSummary) {
      // Enable when pagination changes from initial values (user interaction)
      if (
        pagination.page !== initialPaginationRef.current.page ||
        pagination.limit !== initialPaginationRef.current.limit
      ) {
        setTimeout(() => {
          setShouldEnableGroupedSummary(true);
        }, 0);
      }
      // Enable when filters change from initial (user interaction)
      if (domainFilters.length !== initialFiltersRef.current) {
        setTimeout(() => {
          setShouldEnableGroupedSummary(true);
        }, 0);
      }
      // Enable when sorting changes from initial (user interaction)
      if (
        sorting.sortBy !== initialSortingRef.current.sortBy ||
        sorting.sortOrder !== initialSortingRef.current.sortOrder
      ) {
        setTimeout(() => {
          setShouldEnableGroupedSummary(true);
        }, 0);
      }
      // Enable when project changes from initial (user interaction)
      if (effectiveProjectId !== initialProjectIdRef.current) {
        setTimeout(() => {
          setShouldEnableGroupedSummary(true);
        }, 0);
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
    effectiveProjectId,
  ]); // Add project ID to dependencies

  // Also enable when a group is expanded (handled in GroupSummary component via expandedGroups)
  const { expandedGroups } = useUniversalGroupingFilterStore();
  const visibleLeadsByGroup = useGroupedVisibleLeadsStore((s) => s.visibleLeadsByGroup);
  useEffect(() => {
    // Skip on initial mount to prevent false positives
    if (isInitialMountRef.current) return;

    if (isAgentOnGroupedPage && !shouldEnableGroupedSummary && expandedGroups.size > 0) {
      setTimeout(() => {
        setShouldEnableGroupedSummary(true);
      }, 0);
    }
  }, [isAgentOnGroupedPage, shouldEnableGroupedSummary, expandedGroups.size]);

  // Match LeadDataTables so grouped-summary queryKey matches and React Query dedupes to one request
  const activeSubgroupPagination = useMemo(() => {
    const entries = Object.entries(subgroupPagination);
    if (entries.length === 0) {
      return { subPage: null, subLimit: null, groupId: null };
    }
    const [uniqueGroupId, pag] = entries[0];
    const groupIdPath = uniqueGroupId.split('|');
    const deepestGroupId = groupIdPath[groupIdPath.length - 1] || null;
    return {
      subPage: pag.subPage,
      subLimit: pag.subLimit,
      groupId: deepestGroupId,
    };
  }, [subgroupPagination]);

  // Use useGroupedSummary hook directly - React Query will deduplicate requests automatically
  // This ensures we get fresh data when pagination changes, not stale cache data
  // CRITICAL: For agents on live-leads/recycle-leads, completely disable on initial load
  // Only enable after explicit user interaction (pagination, filters, sorting, or group expansion)
  const applySortToGroupedSummary = Object.keys(visibleLeadsByGroup).length === 0;

  const { data: groupedSummaryData } = useGroupedSummary({
    entityType: 'Lead',
    domain: teamScopedLeadsDomainFilters,
    groupBy: effectiveGroupBy,
    page: pagination.page,
    limit: pagination.limit,
    subPage: activeSubgroupPagination.subPage,
    subLimit: activeSubgroupPagination.subLimit,
    groupId: activeSubgroupPagination.groupId,
    sortBy: sorting.sortBy || undefined,
    sortOrder: sorting.sortOrder || 'desc',
    applySortToSummary: applySortToGroupedSummary,
    search: search || undefined,
    // CRITICAL: For Agent on live-leads/recycle-leads, only call when domain has filters.
    // Archived page does NOT require domain filters.
    enabled:
      effectiveGroupBy.length > 0 &&
      shouldEnableGroupedSummary &&
      (!isAgentOnGroupedPage ||
        domainFilters.length > 0 ||
        pathname?.includes('leads/archived') ||
        (!!closeProjectId && teamScopedLeadsDomainFilters.length > 0) ||
        (!!isProjectLeadsMongoDetailPage && teamScopedLeadsDomainFilters.length > 0)),
    defaultFilters: defaultFiltersAsQueryParams, // Pass default filters as query params
    values: isBulkSearchMode && bulkSearchQuery?.length ? bulkSearchQuery : undefined, // Bulk search params when grouping after bulk search
    includeAll:
      isLeadsBankPage || closeProjectId || isProjectLeadsMongoDetailPage ? false : undefined,
    listResource: closeProjectId ? 'closed-leads' : undefined,
  });

  // Build query params for filtered leads
  const filteredLeadsQueryParams = useMemo(() => {
    if (effectiveGroupBy.length === 0 && hasUserFilters) {
      const queryParams: Record<string, unknown> = {
        page: pagination.page || 1,
        limit: pagination.limit || 50,
        // Add default filters as regular query params (e.g., use_status=pending)
        ...defaultFiltersAsQueryParams,
      };

      // Add domain parameter if filters exist
      if (domainFilters && domainFilters.length > 0) {
        queryParams.domain = JSON.stringify(domainFilters);
      }

      // Add bulk search values when filtering after bulk search (Custom Filter, Agent, Date)
      if (isBulkSearchMode && bulkSearchQuery?.length) {
        queryParams.values = JSON.stringify(bulkSearchQuery);
      }

      return queryParams;
    }
    return null;
  }, [
    domainFilters,
    defaultFiltersAsQueryParams,
    pagination.page,
    pagination.limit,
    effectiveGroupBy.length,
    hasUserFilters,
    isBulkSearchMode,
    bulkSearchQuery,
  ]);

  // Use useLeads hook directly - React Query will deduplicate requests automatically
  // This ensures we get fresh data when pagination changes, not stale cache data
  // CRITICAL: For agents on live-leads/recycle-leads pages, disable this API call (grouping is always active)
  // Note: isAgentOnGroupedPage is already defined above
  const { data: filteredLeadsData } = useLeads(filteredLeadsQueryParams || undefined, {
    enabled: effectiveGroupBy.length === 0 && hasUserFilters && !isAgentOnGroupedPage, // Only fetch when no grouping but filters exist, and not agent on grouped page
  });

  // Get closed leads data to check status
  const closedLeadsData = closeProjectId ? leadsData : null;

  // Helper function to separate fresh leads from restricted leads
  const separateFreshAndRestrictedLeads = () => {
    // Use store IDs (single source of truth)
    const currentSelectedIds = selectedIdsFromStore;
    if (!closeProjectId || !currentSelectedIds.length || !closedLeadsData?.data) {
      return {
        freshLeadIds: currentSelectedIds,
        restrictedLeads: [],
      };
    }

    const freshLeadIds: string[] = [];
    const restrictedLeads: Array<{ leadId: string; contactName: string; status: string }> = [];

    currentSelectedIds.forEach((leadId) => {
      const lead = closedLeadsData.data.find((l: any) => l._id?.toString() === leadId.toString());
      if (lead) {
        const closeLeadStatus = lead?.closeLeadStatus?.toLowerCase();
        if (closeLeadStatus === 'fresh') {
          freshLeadIds.push(leadId);
        } else if (closeLeadStatus === 'revert' || closeLeadStatus === 'assigned') {
          restrictedLeads.push({
            leadId,
            contactName: lead.contact_name || 'Unknown',
            status: closeLeadStatus,
          });
        }
      } else {
        // If lead not found, assume it's fresh (fallback)
        freshLeadIds.push(leadId);
      }
    });

    return { freshLeadIds, restrictedLeads };
  };

  // Helper to close dropdown after action
  const closeDropdown = () => {
    // Close dropdown by triggering a click outside
    setTimeout(() => {
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(event);
    }, 100);
  };

  // Wrapper for Assign action with validation
  const handleAssignLeadsWithValidation = () => {
    if (!closeProjectId) {
      handleAssignLeads();
      closeDropdown();
      return;
    }

    // Separate fresh leads from restricted leads
    const { freshLeadIds, restrictedLeads } = separateFreshAndRestrictedLeads();

    // Show warning for restricted leads
    if (restrictedLeads.length > 0) {
      const revertLeads = restrictedLeads.filter((l) => l.status === 'revert');
      const assignedLeads = restrictedLeads.filter((l) => l.status === 'assigned');

      let message = `Skipped ${restrictedLeads.length} lead${restrictedLeads.length > 1 ? 's' : ''} that cannot be assigned: `;
      const reasons: string[] = [];

      if (revertLeads.length > 0) {
        reasons.push(`${revertLeads.length} already reverted`);
      }
      if (assignedLeads.length > 0) {
        reasons.push(`${assignedLeads.length} already assigned`);
      }

      message += reasons.join(' and ') + '.';

      toast.push(
        <Notification title="Some Leads Skipped" type="warning">
          {message}
        </Notification>
      );
    }

    // If no fresh leads, don't proceed
    if (freshLeadIds.length === 0) {
      closeDropdown();
      return;
    }

    // Update selected leads to only include fresh ones
    setSelectedLeads(freshLeadIds);

    // Proceed with assignment for fresh leads only
    handleAssignLeads();
    closeDropdown();
  };

  // Wrapper for Revert action with validation
  const handleRevertClosedProjectLeadsWithValidation = async () => {
    if (!closeProjectId) {
      await handleRevertClosedProjectLeads();
      closeDropdown();
      return;
    }

    // Separate fresh leads from restricted leads
    const { freshLeadIds, restrictedLeads } = separateFreshAndRestrictedLeads();

    // Show warning for restricted leads
    if (restrictedLeads.length > 0) {
      const revertLeads = restrictedLeads.filter((l) => l.status === 'revert');
      const assignedLeads = restrictedLeads.filter((l) => l.status === 'assigned');

      let message = `Skipped ${restrictedLeads.length} lead${restrictedLeads.length > 1 ? 's' : ''} that cannot be reverted: `;
      const reasons: string[] = [];

      if (revertLeads.length > 0) {
        reasons.push(`${revertLeads.length} already reverted`);
      }
      if (assignedLeads.length > 0) {
        reasons.push(`${assignedLeads.length} already assigned to another project`);
      }

      message += reasons.join(' and ') + '.';

      toast.push(
        <Notification title="Some Leads Skipped" type="warning">
          {message}
        </Notification>
      );
    }

    // If no fresh leads, don't proceed
    if (freshLeadIds.length === 0) {
      closeDropdown();
      return;
    }

    // Store original selection to restore if needed
    const originalSelectedLeads = [...selectedLeads];

    // Update selected leads to only include fresh ones
    setSelectedLeads(freshLeadIds);

    try {
      // Proceed with revert for fresh leads only
      await handleRevertClosedProjectLeads();
    } catch (error) {
      // Restore original selection on error
      setSelectedLeads(originalSelectedLeads);
      throw error;
    }

    closeDropdown();
  };

  /** Left cluster when nothing selected: project / close-project navigation (matches action bar control sizes). */
  const actionBarIdleLeftToolbar = useMemo(() => {
    if (tableName === 'close_project_leads' && closeProjectId) {
      return (
        <>
          <Button
            variant="default"
            size="xs"
            onClick={() => router.push('/dashboards/projects/close-projects')}
            icon={<ApolloIcon name="arrow-left" className="text-xs" />}
          >
            Back
          </Button>
          <Link
            href={`/dashboards/projects/${closeProjectId}?view=leads`}
            className="inline-flex"
            aria-label="Open project details and manage live leads"
          >
            <Button
              variant="default"
              size="xs"
              icon={<ApolloIcon name="arrow-right" className="text-xs" />}
              iconAlignment="end"
            >
              Project leads
            </Button>
          </Link>
        </>
      );
    }

    if (
      tableName !== 'project_leads' ||
      closeProjectId ||
      !externalProjectId ||
      !setIsProjectOpen
    ) {
      return null;
    }
    return (
      <>
        <Button
          variant="solid"
          size="xs"
          onClick={() => setIsProjectOpen(true)}
          icon={<ApolloIcon name="arrow-left" className="text-xs" />}
        >
          Open Project
        </Button>
        <RoleGuard>
          <Link
            href={`/dashboards/projects/close-projects/${externalProjectId}`}
            className="inline-flex"
            aria-label="Open closed project leads for this team"
          >
            <Button
              variant="default"
              size="xs"
              icon={<ApolloIcon name="arrow-right" className="text-xs" />}
              iconAlignment="end"
            >
              Closed project leads
            </Button>
          </Link>
        </RoleGuard>
      </>
    );
  }, [tableName, closeProjectId, externalProjectId, setIsProjectOpen, router]);

  return (
    <>
      <HideActions sharedDataTable={sharedDataTable}>
        {isBulkSearchMode ? (
          <BulkSearchResultsHeader
            foundCount={bulkSearchResults.length}
            searchedIds={bulkSearchQuery}
            onClearSearch={clearBulkSearch}
            onEditSearch={handleEditBulkSearch}
            isLoading={isLoading}
          />
        ) : (
          <DynamicFilterResults
            isVisible={isDynamicFilterMode && filterSource === 'table_header'}
            results={dynamicFilterResults}
            onClear={clearDynamicFilters}
            isLoading={isLoading}
            total={dynamicTotal}
            onClearStatusFilter={handleClearStatusFilter}
          />
        )}
      </HideActions>

      <HideActions sharedDataTable={sharedDataTable}>
        <CommonActionBar
          idleLeftToolbar={actionBarIdleLeftToolbar}
          selectedItems={
            // Use selectedItemsFromStore (single source of truth)
            // CommonActionBar can handle both full objects and IDs
            selectedItemsFromStore.length > 0 ? selectedItemsFromStore : selectedIdsFromStore
          }
          handleClearSelection={handleClearSelectionWrapper}
          onAppendQueryParams={onAppendQueryParams}
          search={search ?? ''}
          searchPlaceholder="Search list..."
          deleteButton={closeProjectId ? false : deleteButton}
          allColumns={allColumns}
          columnVisibility={columnVisibility}
          handleColumnVisibilityChange={handleColumnVisibilityChange}
          setDeleteConfirmDialogOpen={setDeleteConfirmDialogOpen}
          setIsColumnOrderDialogOpen={setIsColumnOrderDialogOpen}
          // customizeButtonRef={customizeButtonRef}
          isColumnOrderDialogOpen={isColumnOrderDialogOpen}
          tableName={tableName}
          filterData={filterData}
          extraActions={extraActions ?? undefined}
          setFilterData={handleFilterDataChange}
          selectedStatus={selectedStatus}
          onStatusChange={handleStatusChange}
          showSortingColumn={true}
          selectedGroupBy={
            hideGroupBy ? undefined : selectedGroupBy.length > 0 ? selectedGroupBy[0] : undefined
          }
          onGroupByChange={hideGroupBy ? undefined : handleGroupByChange}
          selectedGroupByArray={hideGroupBy ? [] : selectedGroupBy}
          onGroupByArrayChange={hideGroupBy ? undefined : handleGroupByArrayChangeWithReset}
          isMultiLevelGroupingApplied={hideGroupBy ? false : isMultiLevelGroupingApplied}
          onMultiLevelGrouping={hideGroupBy ? undefined : handleMultiLevelGrouping}
          groupSortBy={hideGroupBy ? undefined : groupedLeadsSortBy}
          groupSortOrder={hideGroupBy ? undefined : groupedLeadsSortOrder}
          onGroupSortChange={hideGroupBy ? undefined : handleGroupedLeadsSortChange}
          hideProjectOption={hideProjectOption}
          showPagination={true}
          currentPage={
            selectedGroupDetails
              ? 1
              : selectedGroupBy.length > 0
                ? pagination.page
                : isDynamicFilterMode
                  ? dynamicPage
                  : hasUserFilters
                    ? pagination.page // Use store pagination when custom filters are applied
                    : externalPage || page
          }
          pageSize={
            selectedGroupDetails
              ? 50
              : selectedGroupBy.length > 0
                ? pagination.limit
                : isDynamicFilterMode
                  ? dynamicPageSize
                  : hasUserFilters
                    ? pagination.limit // Use store pagination when custom filters are applied
                    : externalPageSize || pageSize
          }
          total={
            selectedGroupDetails
              ? groupLeadsData?.meta?.total || 0
              : selectedGroupBy.length > 0
                ? groupedSummaryData?.meta?.total || 0
                : isDynamicFilterMode
                  ? dynamicTotal
                  : hasUserFilters
                    ? // Prioritize navigation store paginationMeta.total (most up-to-date), fallback to filteredLeadsData cache
                      navigationPaginationMeta?.total || filteredLeadsData?.meta?.total || 0
                    : externalTotal ||
                      (isGetAllLeadsResponse(leadsData) ? leadsData.meta?.total : 0)
          }
          onPageChange={
            selectedGroupDetails
              ? () => {}
              : selectedGroupBy.length > 0
                ? // Phase 1: 1st Layer Pagination - Controls top-level groups in grouped summary
                  // This updates the store's pagination state, which triggers useGroupedSummary hook to refetch
                  // When pagination changes, subgroup pagination is automatically cleared (handled in store)
                  (page: number, newPageSize?: number) => {
                    setGroupedPagination({
                      page,
                      limit: newPageSize || pagination.limit,
                    });
                  }
                : isDynamicFilterMode
                  ? handleDynamicFilterPaginationWrapper
                  : hasUserFilters
                    ? // When custom filters are applied, use store pagination (which triggers useLeads)
                      (page: number, newPageSize?: number) => {
                        setGroupedPagination({
                          page,
                          limit: newPageSize || pagination.limit,
                        });
                      }
                    : // Regular pagination (no custom filters)
                      (page: number, newPageSize?: number) => {
                        setPage(page);
                        if (newPageSize && newPageSize !== pageSize) {
                          setPageSize(newPageSize);
                        }
                      }
          }
          onSelectAll={(() => {
            const selectedFunction =
              selectedGroupBy.length > 0 ? selectAllGroupedLeads : handleSelectAllSmart;
            return selectedFunction;
          })()}
          showSelectAllButton={!hasSelectedGroupBy && selectedGroupBy.length === 0}
          bulkSearchPartnerIds={isBulkSearchMode ? bulkSearchQuery : undefined}
          onClearFilterData={() => {
            handleClearImportFilter();
            onAppendQueryParams({
              status: '',
              total: '',
            });
          }}
          onClearStatus={() => {
            handleClearStatusFilter();
            onAppendQueryParams({
              status: '',
            });
          }}
          onClearGroupBy={handleClearGroupByFilter}
          onClearDynamicFilters={handleClearDynamicFilters}
          hasFilterData={hasFilterData}
          hasSelectedStatus={hasSelectedStatus}
          hasSelectedGroupBy={hasSelectedGroupBy}
          hasDynamicFilters={hasDynamicFilters}
          hasUserAddedGroupBy={hasUserAddedGroupBy}
          showFiltersDropdown={true}
          hideActionsForAgent={true}
          buildApiFilters={buildApiFilters}
          isAllSelected={(() => {
            if (externalData && externalTotal) {
              return selectedLeads.length === externalTotal;
            }
            if (isBulkSearchMode && bulkSearchResults) {
              return selectedLeads.length === bulkSearchResults.length;
            }
            if (isDynamicFilterMode) {
              return selectedLeads.length === dynamicTotal;
            }
            return areAllDisplayedItemsSelected();
          })()}
          filterBtnComponent={filterBtnComponent}
          showZoomButtons={false}
          entityType="Lead"
          switchToActions={<LeadsSwitchToSection switchMode={false} />}
        >
          {selectedGroupDetails && (
            <ActionButton
              icon="arrow-left"
              onClick={clearGroupDetails}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <span className="hidden lg:block">Back to Groups</span>
            </ActionButton>
          )}
          {pendingLeadsComponent === true ? (
            <ActionButton
              icon="check"
              onClick={() => setUpdateConfirmDialogOpen(true)}
              disabled={!selectedIdsFromStore.length}
            >
              <span className="hidden lg:block">Check</span>
            </ActionButton>
          ) : null}
          {/* For close project details page, only show Revert and Assign */}
          {closeProjectId ? (
            <RoleGuard>
              <ActionButton
                icon="exchange"
                onClick={handleAssignLeadsWithValidation}
                disabled={!selectedIdsFromStore.length || isSubmitting}
              >
                <span className="hidden lg:block">Assign</span>
              </ActionButton>
              <ActionButton
                icon="refresh"
                onClick={handleRevertClosedProjectLeadsWithValidation}
                className="bg-green-600 text-white hover:bg-green-700"
                disabled={!selectedIdsFromStore.length || isSubmitting}
              >
                <span className="hidden lg:block">Revert</span>
              </ActionButton>
            </RoleGuard>
          ) : (
            <>
              <RoleGuard>
                {pageTitle === 'Project Leads' && (
                  <ActionButton
                    icon="cog"
                    onClick={handleMakeFreshLeads}
                    disabled={!selectedIdsFromStore.length}
                  >
                    <span className="whitespace-nowrap">Make Fresh Leads</span>
                  </ActionButton>
                )}
              </RoleGuard>
              <RoleGuard role={Role.ADMIN || Role.PROVIDER}>
                {pageTitle !== 'Project Leads' ? (
                  <>
                    <ActionButton
                      icon="exchange"
                      onClick={handleAssignLeads}
                      disabled={!selectedIdsFromStore.length}
                    >
                      <span className="hidden lg:block">
                        {(() => {
                          if (selectedGroupBy.length > 0) {
                            return groupedLeadsTransformLeads ? 'Transfer' : 'Assign';
                          }
                          return transformLeads ? 'Transfer' : 'Assign';
                        })()}
                      </span>
                    </ActionButton>
                    <ActionButton
                      icon="refresh"
                      onClick={handleBulkUpdate}
                      disabled={!selectedIdsFromStore.length}
                      className="flex items-center gap-2 text-nowrap"
                    >
                      <span className="hidden lg:block">Bulk Update</span>
                    </ActionButton>
                  </>
                ) : (
                  <></>
                )}

                <ActionButton
                  icon="user-exclamation"
                  onClick={() => setIsReclamationDialogOpen(true)}
                  disabled={!selectedIdsFromStore.length}
                  className="bg-rust hover:bg-rust text-white"
                >
                  <span className="hidden lg:block">Reclamation</span>
                </ActionButton>

                {!isArchivedPage ? (
                  <ActionButton
                    icon="server-database"
                    onClick={() => setArchiveConfirmDialogOpen(true)}
                    disabled={!selectedIdsFromStore.length}
                  >
                    <span className="hidden lg:block">Archive</span>
                  </ActionButton>
                ) : (
                  <ActionButton
                    icon="refresh"
                    onClick={() => setRestoreConfirmDialogOpen(true)}
                    disabled={!selectedIdsFromStore.length}
                  >
                    <span className="hidden lg:block">Restore</span>
                  </ActionButton>
                )}
              </RoleGuard>
            </>
          )}
        </CommonActionBar>
      </HideActions>
    </>
  );
};

export default ActionsLeadTableComponents;
