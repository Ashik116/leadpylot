/* eslint-disable react-hooks/set-state-in-effect */
/**
 * Filter chain leads hook – manages status, group-by, import, and dynamic filters for lead dashboards.
 *
 * @remarks
 * - Uses pathname or currentTab for page detection; currentTab overrides pathname when provided (e.g. UnifiedDashboard tabs).
 * - Filter chain: import + status + role-based + dynamic filters. buildApiFilters / buildGroupedLeadsFilters produce FilterRule[].
 * - Group-by lives in universalGroupingFilterStore; Agent defaults come from filter.config.
 * - Domain filters (locked + user) are set in universalGroupingFilterStore for offers page; other pages derive from filter chain.
 *
 * @see docs/GROUPING_AND_FILTERING_GUIDE.md
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useFilterChainStore, FilterRule } from '@/stores/filterChainStore';
import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import {
  getDefaultGroupBy as getDefaultGroupByFromConfig,
  getDefaultCustomFilters as getDefaultCustomFiltersFromConfig,
} from '@/configs/filter.config';
import { useMetadataOptions } from '@/services/hooks/useLeads';
import type { DomainFilter } from '@/stores/universalGroupingFilterStore';
import { resolveCloseProjectTeamId, isProjectLeadsMongoDetailRoute } from '@/utils/closeProjectUtils';
import { useAuth } from './useAuth';

interface UseFilterChainLeadsProps {
  pendingLeadsComponent?: boolean;
  onClearSelections?: () => void; // Callback to clear selections when filters change
  onAppendQueryParams?: (params: any) => void; // For URL parameter updates (optional)
  hasManuallyClearedGroupFilter?: boolean; // Track if user has manually cleared group filter
  currentTab?: string; // NEW: Override pathname-based page detection with current tab
  projectData?: any; // Project details data for default filters
  /** Route id from `/close-projects/[id]` — API expects this as `team_id` in domain (with `=`). */
  closeProjectId?: string;
  /** Project document id on `/dashboards/projects/[id]` embed — scope open leads by `team_id` in domain. */
  externalProjectId?: string;
}

interface FilterChainResult {
  // Filter States
  selectedStatus: string | undefined;
  selectedGroupBy: string[];
  filterData: number | undefined;

  // Filter Builders
  buildApiFilters: () => FilterRule[];
  buildGroupedLeadsFilters: () => FilterRule[];

  // Filter Handlers
  handleStatusChange: (status: string | undefined) => void;
  handleGroupByChange: (groupBy: string | undefined) => void;
  handleGroupByArrayChange: (groupByArray: string[]) => void;
  handleFilterDataChange: (filterData: number | undefined) => void;

  // Clear Handlers (with selection clearing)
  handleClearImportFilter: () => void;
  handleClearStatusFilter: () => void;
  handleClearGroupByFilter: () => void;
  handleClearDynamicFilters: () => void;

  // Filter States for UI
  hasFilterData: boolean;
  hasSelectedStatus: boolean;
  hasSelectedGroupBy: boolean;
  hasDynamicFilters: boolean;
  hasUserAddedGroupBy: boolean; // NEW: Track if user has added group filters beyond defaults

  // Page Detection
  isLiveLeadsPage: boolean;
  isRecycleLeadsPage: boolean;
  isLeadsPage: boolean;
  isArchivedPage: boolean;
  isTodoPage: boolean;
  isOffersPage: boolean;
  isOpeningsPage: boolean;
  isConfirmationsPage: boolean;
  isPaymentsPage: boolean;
  isNettoPage: boolean;

  // Store Integration
  importFilter: FilterRule | null;
  statusFilter: FilterRule | null;
  dynamicFilters: FilterRule[] | null;
  isDynamicFilterMode: boolean;
  filterSource: string | null;

  // Actions
  clearDynamicFilters: () => void;
  clearFilterByType: (type: 'import' | 'status' | 'dynamic' | 'groupBy') => void;
}

export const useFilterChainLeads = ({
  pendingLeadsComponent = false,
  onClearSelections,
  onAppendQueryParams,
  hasManuallyClearedGroupFilter = false,
  currentTab, // NEW: Add currentTab parameter
  projectData, // Project details data for default filters
  closeProjectId,
  externalProjectId,
}: UseFilterChainLeadsProps = {}): FilterChainResult => {
  // Local filter states
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  // REMOVED: selectedGroupBy - now using Zustand store as single source of truth
  const [filterData, setFilterData] = useState<number | undefined>(undefined);

  // NEW: Track default group filters and user-added filters for Agents
  const [defaultGroupBy, setDefaultGroupBy] = useState<string[]>([]);
  const [hasUserAddedGroupBy, setHasUserAddedGroupBy] = useState(false);

  // Hooks
  const pathname = usePathname();
  const { hasRole, isAuthenticated } = useAuth();
  const isAgent = hasRole(Role.AGENT);
  const { data: session, status: sessionStatus } = useSession();
  const {
    importFilter,
    statusFilter,
    dynamicFilters,
    clearFilterByType,
    setStatusFilter,
    setGroupBy: setFilterChainGroupBy,
  } = useFilterChainStore();
  const {
    isDynamicFilterMode,
    filterSource,
    clearDynamicFilters: clearDynamicFiltersStore,
  } = useDynamicFiltersStore();
  // Read currently selected project (for Agent-scoped filtering)
  const { selectedProject } = useSelectedProjectStore();
  // Get filter setters from universal grouping filter store
  const setLockedDomainFilters = useUniversalGroupingFilterStore(
    (state) => state.setLockedDomainFilters
  );
  const clearLockedDomainFilters = useUniversalGroupingFilterStore(
    (state) => state.clearLockedDomainFilters
  );
  const clearUserDomainFilters = useUniversalGroupingFilterStore(
    (state) => state.clearUserDomainFilters
  );
  const clearGrouping = useUniversalGroupingFilterStore((state) => state.clearGrouping);
  const previousPathname = useUniversalGroupingFilterStore((state) => state.previousPathname);
  const setPreviousPathname = useUniversalGroupingFilterStore((state) => state.setPreviousPathname);
  // Use Zustand store as single source of truth for grouping
  const selectedGroupBy = useUniversalGroupingFilterStore((state) => state.groupBy);
  const setStoreGroupBy = useUniversalGroupingFilterStore((state) => state.setGroupBy);

  // Get user role
  const userRole = session?.user?.role;

  // Page Detection - MODIFIED: Use currentTab if provided, otherwise use pathname
  const effectivePath = currentTab || pathname;

  // When currentTab is provided, map tab values to page detection
  // IMPORTANT: Check more specific pages first (leads-bank) before generic ones (leads)
  const isLeadsBankPage = currentTab ? false : effectivePath?.includes('leads-bank') || false;
  const isLiveLeadsPage = currentTab ? false : effectivePath?.includes('live-leads') || false;
  const isRecycleLeadsPage = currentTab ? false : effectivePath?.includes('recycle-leads') || false;
  // Exclude leads-bank from isLeadsPage check to prevent false matches
  const isLeadsPage = currentTab
    ? false
    : (effectivePath?.includes('leads') && !isLeadsBankPage) || false;
  const isArchivedPage = currentTab ? false : effectivePath?.includes('archived') || false;
  const isTodoPage = currentTab ? false : effectivePath?.includes('todo') || false;
  // Tickets page uses TodoDashboard component, so it inherits todo page behavior (no default grouping for Agent role)
  const isOffersPage = currentTab
    ? currentTab === 'offer'
    : effectivePath?.includes('offers') || false;
  const isOutOffersPage = currentTab ? false : effectivePath?.includes('out-offers') || false;
  const isOpeningsPage = currentTab
    ? currentTab === 'opening'
    : effectivePath?.includes('openings') || false;
  const isConfirmationsPage = currentTab
    ? currentTab === 'confirmation'
    : effectivePath?.includes('confirmation') || false;
  const isPaymentsPage = currentTab
    ? currentTab === 'payment'
    : effectivePath?.includes('payment') || false;
  const isNettoPage = currentTab
    ? currentTab === 'netto'
    : effectivePath?.includes('netto') || false;
  const isHoldsPage = currentTab
    ? currentTab === 'holds'
    : effectivePath?.includes('holds') || false;
  const isTerminPage = currentTab
    ? currentTab === 'termin'
    : effectivePath?.includes('termin') || false;
  // Add project page detection
  const isProjectPage = currentTab
    ? currentTab === 'project_leads'
    : effectivePath?.includes('/dashboards/projects/') || false;

  /** Closed-project lead bank: `/dashboards/projects/close-projects/[id]` (not the list route). */
  const isCloseProjectDetailPage = currentTab
    ? false
    : (pathname?.startsWith('/dashboards/projects/close-projects/') ?? false);

  const isProjectLeadsMongoDetailPage = useMemo(
    () =>
      isProjectLeadsMongoDetailRoute({
        pathname,
        currentTab,
        externalProjectId,
        closeProjectId,
      }),
    [pathname, currentTab, externalProjectId, closeProjectId]
  );

  // Fetch metadata for Lead entity to resolve status names to IDs
  // Only fetch when Agent is on live-leads, recycle-leads, or archived pages
  const isArchivedLeadsPage = effectivePath?.includes('leads/archived') || false;
  const { data: metadataOptions } = useMetadataOptions('Lead', {
    enabled: isAgent && (isLiveLeadsPage || isRecycleLeadsPage || isArchivedLeadsPage),
  });

  // Get default group filters for Agent users from config
  const getDefaultGroupBy = useCallback((): string[] => {
    if (!isAgent) return [];

    // Use the config-based function to get default groupby for current page
    // Use pathname for config lookup since config patterns are based on pathname
    return getDefaultGroupByFromConfig(pathname || '', userRole, pendingLeadsComponent);
  }, [isAgent, pathname, userRole, pendingLeadsComponent]);

  // Get default custom filters for Agent users from config
  const getDefaultCustomFilters = useCallback(() => {
    if (!isAgent) return [];

    // Use the config-based function to get default custom filters for current page
    // Use pathname for config lookup since config patterns are based on pathname
    return getDefaultCustomFiltersFromConfig(pathname || '', userRole, pendingLeadsComponent);
  }, [isAgent, pathname, userRole, pendingLeadsComponent]);

  // Clear user-applied filters and grouping when navigating between different pages
  // BUT preserve filters/grouping when navigating TO/FROM lead details pages
  // Uses Zustand store for previousPathname to persist across component remounts
  useEffect(() => {
    if (!pathname) {
      return;
    }

    // Get current store state (selectedGroupBy is already from store)
    const storeState = useUniversalGroupingFilterStore.getState();
    const storeUserFilters = storeState.userDomainFilters;

    // Check if current pathname is a lead details page (pattern: /dashboards/leads/[id])
    const isCurrentLeadDetailsPage = pathname.match(/^\/dashboards\/leads\/[a-f0-9]{24}$/i);

    // Check if previous pathname was a lead details page
    const isPreviousLeadDetailsPage = previousPathname
      ? previousPathname.match(/^\/dashboards\/leads\/[a-f0-9]{24}$/i)
      : false;

    // If we're currently on a lead details page, preserve filters/grouping
    if (isCurrentLeadDetailsPage) {
      // Update store but don't clear filters
      setPreviousPathname(pathname);
      return;
    }

    // Check if pathname has changed (navigated to a different page)
    const pathnameChanged = previousPathname !== null && previousPathname !== pathname;

    // If we're coming back FROM a lead details page, preserve filters
    if (pathnameChanged && isPreviousLeadDetailsPage) {
      // No need to restore - we're using store as single source of truth

      setPreviousPathname(pathname);
      return;
    }

    // We're navigating to a different page - clear filters/grouping
    if (pathnameChanged) {
      // Pathname changed - clear user-applied filters and grouping
      // This ensures filters/grouping from previous page don't persist to new page
      clearUserDomainFilters();
      clearGrouping();
      // Also clear filterChainStore groupBy for consistency
      setFilterChainGroupBy([]);
      // Update hasUserAddedGroupBy flag
      setHasUserAddedGroupBy(false);
      // Clear previousPathname
      setPreviousPathname(pathname);

      return;
    } else {
      // No need to restore - we're using store as single source of truth

      // First load - set current pathname as previous
      if (!previousPathname) {
        setPreviousPathname(pathname);
      }
      return;
    }
  }, [
    pathname,
    previousPathname,
    clearUserDomainFilters,
    clearGrouping,
    setFilterChainGroupBy,
    setPreviousPathname,
    selectedGroupBy,
  ]);

  // Automatic filter application for Agent users on live-leads, recycle-leads, todo, and dashboard pages
  // Wait until auth is fully resolved before applying defaults.
  // Use isAuthenticated OR (session user when past loading) - production may have auth/session load in different order
  const isAdmin = hasRole(Role.ADMIN);
  const groupByLength = selectedGroupBy.length;
  const isSessionReady =
    isAuthenticated || (sessionStatus !== 'loading' && !!session?.user);

  useEffect(() => {
    if (!isSessionReady) return;

    if (isAgent && !hasManuallyClearedGroupFilter) {
      const newDefaultGroupBy = getDefaultGroupBy();
      setDefaultGroupBy(newDefaultGroupBy);

      if (groupByLength === 0 && newDefaultGroupBy.length > 0) {
        setStoreGroupBy(newDefaultGroupBy);
        setHasUserAddedGroupBy(false);
      }
    } else if (isAdmin) {
      setDefaultGroupBy([]);
      setHasUserAddedGroupBy(false);
    }
  }, [
    isSessionReady,
    isAgent,
    isAdmin,
    groupByLength,
    hasManuallyClearedGroupFilter,
    getDefaultGroupBy,
    setStoreGroupBy,
  ]);

  // Retry: production may have groupBy still empty when session loads - re-apply after 300ms
  useEffect(() => {
    if (!isSessionReady || !isAgent || hasManuallyClearedGroupFilter) return;
    if (groupByLength > 0) return;
    const newDefault = getDefaultGroupBy();
    if (newDefault.length === 0) return;

    const id = setTimeout(() => {
      const current = useUniversalGroupingFilterStore.getState().groupBy;
      if (current.length === 0) {
        setStoreGroupBy(newDefault);
        setHasUserAddedGroupBy(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [isSessionReady, isAgent, hasManuallyClearedGroupFilter, groupByLength, getDefaultGroupBy, setStoreGroupBy]);

  // Automatic LOCKED filter application for Agent users on live-leads and recycle-leads pages
  // These filters are IMMUTABLE - agents cannot remove them, only add additional filters on top
  // CRITICAL: For Agent on live-leads, API must include domain param (status_id filter). Never call without domain.
  useEffect(() => {
    // Close-project closed leads: always scope by team in domain (merged with user filters for grouping / filtering)
    if (isCloseProjectDetailPage) {
      const scopeId =
        (closeProjectId && /^[a-f0-9]{24}$/i.test(closeProjectId) ? closeProjectId : undefined) ??
        resolveCloseProjectTeamId(projectData);
      if (scopeId) {
        setLockedDomainFilters([['team_id', '=', scopeId]]);
      } else {
        clearLockedDomainFilters();
      }
      return;
    }

    // Open leads on project detail page: scope by team_id (same id as project in URL) — no `project=` param
    if (isProjectLeadsMongoDetailPage && externalProjectId) {
      setLockedDomainFilters([['team_id', '=', externalProjectId]]);
      return;
    }

    // Only apply locked filters for Agent role on live-leads or recycle-leads pages
    if (isAgent && (isLiveLeadsPage || isRecycleLeadsPage)) {
      const defaultCustomFilters = getDefaultCustomFilters();

      // Check if we have default filters to apply as locked
      if (defaultCustomFilters.length > 0) {
        const allValuesAreIds = (val: unknown): boolean =>
          Array.isArray(val) &&
          val.every((v) => typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v));

        // If values are already IDs, apply immediately (no metadata needed)
        // Otherwise resolve status names to IDs using metadata
        const needsMetadata = defaultCustomFilters.some((filter) => {
          const [, , value] = filter;
          return filter[0] === 'status_id' && Array.isArray(value) && !allValuesAreIds(value);
        });

        if (needsMetadata && !metadataOptions?.filterOptions) {
          return; // Wait for metadata to resolve names to IDs
        }

        const resolvedFilters: DomainFilter[] = defaultCustomFilters.map((filter) => {
          const [field, operator, value] = filter;

          if (field === 'status_id' && Array.isArray(value) && operator === 'in') {
            if (allValuesAreIds(value)) {
              return filter; // Already IDs, use as-is
            }
            const statusField = metadataOptions?.filterOptions?.find(
              (opt: { field: string }) => opt.field === 'status_id'
            );
            const statusValues =
              (statusField as { values?: Array<{ _id: string | number; value: string }> })
                ?.values || [];

            const resolvedValues = value
              .map((name) => {
                if (typeof name === 'string' && /^[0-9a-f]{24}$/i.test(name)) {
                  return name;
                }
                const statusOption = statusValues.find(
                  (opt: { _id: string | number; value: string }) => {
                    return String(opt.value).toLowerCase() === String(name).toLowerCase();
                  }
                );
                return statusOption ? String(statusOption._id) : name;
              })
              .filter((v) => v !== null && v !== undefined);

            if (resolvedValues.length > 0) {
              return [field, operator, resolvedValues] as DomainFilter;
            }
            return filter;
          }

          return filter;
        });

        setLockedDomainFilters(resolvedFilters);
      }
    } else if (!isArchivedPage) {
      // Clear locked filters when not on live-leads/recycle-leads/archived pages for agent
      // or when user is not an agent.
      // Archived page manages its own locked filters via ArchivedLeadsDashboard.
      clearLockedDomainFilters();
    }
  }, [
    isCloseProjectDetailPage,
    closeProjectId,
    isProjectLeadsMongoDetailPage,
    externalProjectId,
    projectData,
    isAgent,
    isLiveLeadsPage,
    isRecycleLeadsPage,
    isArchivedPage,
    getDefaultCustomFilters,
    setLockedDomainFilters,
    clearLockedDomainFilters,
    metadataOptions,
  ]);

  // Clear selectedGroupBy when current tab is netto1 or netto2
  useEffect(() => {
    if (['netto1', 'netto2'].includes(currentTab || '')) {
      setStoreGroupBy([]);
    }
  }, [currentTab, setStoreGroupBy]);

  // Track when user adds group filters beyond defaults
  // Use refs to prevent infinite loops by tracking last synced values
  const lastSelectedGroupByRef = useRef<string>('');
  const lastDefaultGroupByRef = useRef<string>('');
  const lastHasUserAddedGroupByRef = useRef<boolean>(false);

  useEffect(() => {
    const selectedGroupByStr = JSON.stringify(selectedGroupBy);
    const defaultGroupByStr = JSON.stringify(defaultGroupBy);

    // Only update if values actually changed (not just reference changes)
    const selectedChanged = selectedGroupByStr !== lastSelectedGroupByRef.current;
    const defaultChanged = defaultGroupByStr !== lastDefaultGroupByRef.current;

    if (!selectedChanged && !defaultChanged) {
      // Values haven't changed, skip update
      return;
    }

    // Update refs to track current values
    lastSelectedGroupByRef.current = selectedGroupByStr;
    lastDefaultGroupByRef.current = defaultGroupByStr;

    if (isAgent && defaultGroupBy.length > 0) {
      // Check if current selectedGroupBy contains more than just the default filters
      const hasMoreThanDefaults = selectedGroupBy.some((group) => !defaultGroupBy.includes(group));

      // Only update state if value actually changed
      if (hasMoreThanDefaults !== lastHasUserAddedGroupByRef.current) {
        lastHasUserAddedGroupByRef.current = hasMoreThanDefaults;
        setHasUserAddedGroupBy(hasMoreThanDefaults);
      }
    } else {
      // Only update state if value actually changed
      if (lastHasUserAddedGroupByRef.current !== false) {
        lastHasUserAddedGroupByRef.current = false;
        setHasUserAddedGroupBy(false);
      }
    }
  }, [isAgent, selectedGroupBy, defaultGroupBy]);

  // Get page-specific filters based on current page/tab
  const getPageSpecificFilters = useCallback((): FilterRule[] => {
    const filters: FilterRule[] = [];

    // IMPORTANT: Check leads-bank first and return empty filters (no defaults)
    if (isLeadsBankPage) {
      return []; // No default filters for leads-bank page
    }

    if (pendingLeadsComponent) {
      filters.push({
        field: 'use_status',
        operator: '=',
        value: 'pending',
      });
    } else if (isTodoPage) {
      filters.push({
        field: 'has_todo',
        operator: '=',
        value: true,
      });
    } else if (isOutOffersPage) {
      filters.push({
        field: 'out',
        operator: '=',
        value: true,
      });
    } else if (isOffersPage) {
      filters.push({
        field: 'has_offer',
        operator: '=',
        value: true,
      });
    } else if (isOpeningsPage) {
      filters.push({
        field: 'has_opening',
        operator: '=',
        value: true,
      });
    } else if (isConfirmationsPage) {
      filters.push({
        field: 'has_confirmation',
        operator: '=',
        value: true,
      });
    } else if (isPaymentsPage) {
      filters.push({
        field: 'has_payment',
        operator: '=',
        value: true,
      });
    } else if (isNettoPage) {
      filters.push({
        field: 'has_netto',
        operator: '=',
        value: true,
      });
    } else if (isHoldsPage || isTerminPage) {
      filters.push({
        field: 'status',
        operator: '=',
        value: 'Hold',
      });
    } else if (
      isProjectPage &&
      projectData &&
      !isCloseProjectDetailPage &&
      !isProjectLeadsMongoDetailPage
    ) {
      // Add project-specific default filters (skip close-project bank and mongo project leads — scoped via team_id domain)
      // Project filter
      if (projectData.name) {
        filters.push({
          field: 'project',
          operator: '=',
          value: projectData.name,
        });
      }

      // Agent filter - handle multiple agents
      if (projectData.agents && projectData.agents.length > 0) {
        const agentNames = projectData.agents
          .filter((agent: any) => agent.active && agent.user?.name)
          .map((agent: any) => agent.user.name);

        if (agentNames.length === 1) {
          // Single agent - use = operator
          filters.push({
            field: 'agent',
            operator: '=',
            value: agentNames[0],
          });
        } else if (agentNames.length > 1) {
          // Multiple agents - use in operator
          filters.push({
            field: 'agent',
            operator: 'in',
            value: agentNames,
          });
        }
      }
    } else if (isLiveLeadsPage) {
      filters.push(
        {
          field: 'source',
          operator: '=',
          value: 'live',
        },
        {
          field: 'use_status',
          operator: '!=',
          value: 'pending',
        }
      );

      // Apply role-based status filters only for Agent users
      if (isAgent) {
        filters.push(
          {
            field: 'status',
            operator: '!=',
            value: 'Payment',
          },
          {
            field: 'status',
            operator: '!=',
            value: 'Opening',
          },
          {
            field: 'status',
            operator: '!=',
            value: 'Confirmation',
          },
          {
            field: 'status',
            operator: '!=',
            value: 'Angebot',
          },
          {
            field: 'status',
            operator: '!=',
            value: 'Netto1',
          },
          {
            field: 'status',
            operator: '!=',
            value: 'Netto2',
          },
          {
            field: 'status',
            operator: '!=',
            value: 'Contract',
          }
        );
      }
    } else if (isRecycleLeadsPage) {
      filters.push(
        {
          field: 'source',
          operator: '=',
          value: 'recycle',
        },
        {
          field: 'use_status',
          operator: '!=',
          value: 'pending',
        }
      );

      // Apply role-based status filters only for Agent users
      if (isAgent) {
        filters.push(
          {
            field: 'status',
            operator: '!=',
            value: 'Payment',
          },
          {
            field: 'status',
            operator: '!=',
            value: 'Opening',
          },
          {
            field: 'status',
            operator: '!=',
            value: 'Confirmation',
          },
          {
            field: 'status',
            operator: '!=',
            value: 'Angebot',
          },
          {
            field: 'status',
            operator: '!=',
            value: 'Netto1',
          },
          {
            field: 'status',
            operator: '!=',
            value: 'Netto2',
          },
          {
            field: 'status',
            operator: '!=',
            value: 'Contract',
          }
        );
      }
    } else if (isLeadsPage && !isArchivedPage) {
      filters.push({
        field: 'use_status',
        operator: '!=',
        value: 'pending',
      });
    } else if (isArchivedPage) {
      filters.push({
        field: 'active',
        operator: '=',
        value: false,
      });
    }

    return filters;
  }, [
    pendingLeadsComponent,
    isLeadsBankPage,
    isLiveLeadsPage,
    isRecycleLeadsPage,
    isLeadsPage,
    isArchivedPage,
    isOffersPage,
    isOutOffersPage,
    isOpeningsPage,
    isConfirmationsPage,
    isPaymentsPage,
    isNettoPage,
    isProjectPage,
    isCloseProjectDetailPage,
    isProjectLeadsMongoDetailPage,
    isAgent,
    projectData,
    isHoldsPage,
    isTerminPage,
    isTodoPage,
  ]);

  // Build API filters (used by GroupedLeadsTable)
  const buildApiFilters = useCallback((): FilterRule[] => {
    const filters: FilterRule[] = [];

    // Page-specific filters
    const pageFilters = getPageSpecificFilters();
    if (pageFilters.length > 0) {
      filters.push(...pageFilters);
    }

    // Import filter from filter-chain-store
    if (importFilter) {
      filters.push(importFilter);
    }

    // Status filter from filter-chain-store
    if (statusFilter) {
      filters.push(statusFilter);
    }

    // Dynamic filters from filter-chain-store
    if (dynamicFilters && dynamicFilters.length > 0) {
      filters.push(...dynamicFilters);
    }

    // Agent + Specific Project filter (exclude "All Projects")
    // DISABLED: Don't add project filter for offers/openings pages
    // Project scoping restriction removed - Agents can now see all projects on offers/openings pages
    const isOffersOrOpeningsPage = isOffersPage || isOpeningsPage;
    if (
      isAgent &&
      selectedProject &&
      selectedProject._id !== 'all' &&
      typeof selectedProject.name === 'string' &&
      selectedProject.name.trim() !== '' &&
      !isOffersOrOpeningsPage && // Don't add project filter for offers/openings pages
      !isProjectLeadsMongoDetailPage // Project embed: scope via team_id domain, not project name param
    ) {
      filters.push({ field: 'project', operator: '=', value: selectedProject.name });
    }

    return filters;
  }, [
    getPageSpecificFilters,
    importFilter,
    statusFilter,
    dynamicFilters,
    isAgent,
    selectedProject,
    isOffersPage,
    isOpeningsPage,
    isProjectLeadsMongoDetailPage,
  ]);

  // Build grouped leads filters (used by CommonLeadsDashboard)
  const buildGroupedLeadsFilters = useCallback((): FilterRule[] => {
    const filters: FilterRule[] = [];

    // Page-specific filters
    const pageFilters = getPageSpecificFilters();
    if (pageFilters.length > 0) {
      filters.push(...pageFilters);
    }

    // Import filter from filter-chain-store
    if (importFilter) {
      filters.push(importFilter);
    }

    // Status filter from filter-chain-store
    if (statusFilter) {
      filters.push(statusFilter);
    }

    // Dynamic filters from filter-chain-store
    if (dynamicFilters && dynamicFilters.length > 0) {
      filters.push(...dynamicFilters);
    }

    // Agent + Specific Project filter (exclude "All Projects")
    // DISABLED: Don't add project filter for offers/openings pages
    // Project scoping restriction removed - Agents can now see all projects on offers/openings pages
    const isOffersOrOpeningsPage = isOffersPage || isOpeningsPage;
    if (
      isAgent &&
      selectedProject &&
      selectedProject._id !== 'all' &&
      typeof selectedProject.name === 'string' &&
      selectedProject.name.trim() !== '' &&
      !isOffersOrOpeningsPage && // Don't add project filter for offers/openings pages
      !isProjectLeadsMongoDetailPage
    ) {
      filters.push({ field: 'project', operator: '=', value: selectedProject.name });
    }

    return filters;
  }, [
    getPageSpecificFilters,
    importFilter,
    statusFilter,
    dynamicFilters,
    isAgent,
    selectedProject,
    isOffersPage,
    isOpeningsPage,
    isProjectLeadsMongoDetailPage,
  ]);

  // Status change handler with filter chain integration
  const handleStatusChange = useCallback(
    (status: string | undefined) => {
      // Clear selections when status changes (for consistency)
      onClearSelections?.();

      // Create filter rule for filter chaining
      const newFilter: FilterRule | null = status
        ? {
            field: 'status',
            operator: '=',
            value: status,
          }
        : null;

      // Update filter chain store
      setStatusFilter(newFilter);

      // Update local state
      setSelectedStatus(status);
    },
    [onClearSelections, setStatusFilter]
  );

  // Group by change handler (single value - backward compatibility)
  const handleGroupByChange = useCallback(
    (groupBy: string | undefined) => {
      // Clear selections when grouping changes (for better UX)
      onClearSelections?.();

      if (groupBy === undefined) {
        // For Agents, preserve default filters when clearing
        if (isAgent && defaultGroupBy.length > 0) {
          setStoreGroupBy(defaultGroupBy);
          setHasUserAddedGroupBy(false);
        } else {
          setStoreGroupBy([]);
        }
      } else {
        // For Agents, ensure default filters are always included
        if (isAgent && defaultGroupBy.length > 0) {
          const newGroupBy = defaultGroupBy.includes(groupBy)
            ? defaultGroupBy
            : [...defaultGroupBy, groupBy];
          setStoreGroupBy(newGroupBy);
          setHasUserAddedGroupBy(!defaultGroupBy.includes(groupBy));
        } else {
          setStoreGroupBy([groupBy]);
          setHasUserAddedGroupBy(true);
        }
      }
    },
    [onClearSelections, isAgent, defaultGroupBy, setStoreGroupBy]
  );

  // Group by array change handler (multiple selections)
  // NOTE: Store update is handled by UnifiedDashboard sync logic to prevent circular updates
  const handleGroupByArrayChange = useCallback(
    (groupByArray: string[]) => {
      // Clear selections when grouping changes (for better UX)
      onClearSelections?.();

      let finalGroupBy: string[];
      // For Agents, ensure default filters are always included
      if (isAgent && defaultGroupBy.length > 0) {
        const combinedGroupBy = [...defaultGroupBy];
        groupByArray.forEach((group) => {
          if (!combinedGroupBy.includes(group)) {
            combinedGroupBy.push(group);
          }
        });
        finalGroupBy = combinedGroupBy;
        setStoreGroupBy(finalGroupBy);
        setHasUserAddedGroupBy(groupByArray.some((group) => !defaultGroupBy.includes(group)));
      } else {
        finalGroupBy = groupByArray;
        setStoreGroupBy(finalGroupBy);
        setHasUserAddedGroupBy(groupByArray.length > 0);
      }

      // Store update is handled by UnifiedDashboard sync effect to prevent infinite loops
      // The sync effect will update the store when selectedGroupBy changes
    },
    [onClearSelections, isAgent, defaultGroupBy, setStoreGroupBy]
  );

  // Filter data change handler
  const handleFilterDataChange = useCallback(
    (newFilterData: number | undefined) => {
      // Clear selections when filter data changes (for consistency)
      onClearSelections?.();

      setFilterData(newFilterData);
    },
    [onClearSelections]
  );

  // Clear import filter handler
  const handleClearImportFilter = useCallback(() => {
    // Clear selections when clearing import filter (for consistency)
    onClearSelections?.();

    // Clear from filter-chain-store
    clearFilterByType('import');

    // Clear local state
    setFilterData(undefined);

    // Clear from URL parameters using empty values
    onAppendQueryParams?.({
      status: '',
      total: '',
    });
  }, [onClearSelections, clearFilterByType, onAppendQueryParams]);

  // Clear status filter handler
  const handleClearStatusFilter = useCallback(() => {
    // Clear selections when clearing status filter (for consistency)
    onClearSelections?.();

    // Clear from filter-chain-store
    clearFilterByType('status');

    // Clear local state
    setSelectedStatus(undefined);

    // Clear from URL parameters using empty values
    onAppendQueryParams?.({
      status: '',
    });

    // Also clear dynamic filter state when status filter is cleared
    if (isDynamicFilterMode && filterSource === 'table_header') {
      clearDynamicFiltersStore();
    }
  }, [
    onClearSelections,
    clearFilterByType,
    onAppendQueryParams,
    isDynamicFilterMode,
    filterSource,
    clearDynamicFiltersStore,
  ]);

  // Clear group by filter handler - MODIFIED for Agent behavior
  const handleClearGroupByFilter = useCallback(() => {
    // Clear selections when clearing group filters (for better UX)
    onClearSelections?.();

    // For Agents, reset to default filters instead of clearing completely
    if (isAgent && defaultGroupBy.length > 0) {
      setStoreGroupBy(defaultGroupBy);
      setHasUserAddedGroupBy(false);
    } else {
      setStoreGroupBy([]);
      setHasUserAddedGroupBy(false);
    }
  }, [onClearSelections, isAgent, defaultGroupBy, setStoreGroupBy]);

  // Clear dynamic filters handler
  const handleClearDynamicFilters = useCallback(() => {
    // Clear selections when clearing dynamic filters (for consistency)
    onClearSelections?.();

    // Clear from filter chain store
    clearFilterByType('dynamic');

    // Also clear dynamic filter state when dynamic filters are cleared
    if (isDynamicFilterMode) {
      clearDynamicFiltersStore();
    }
  }, [onClearSelections, clearFilterByType, isDynamicFilterMode, clearDynamicFiltersStore]);

  // Filter states for UI (to show clear buttons)
  const hasFilterData = useMemo(
    () => filterData !== undefined || importFilter !== null,
    [filterData, importFilter]
  );

  const hasSelectedStatus = useMemo(
    () => selectedStatus !== undefined || statusFilter !== null,
    [selectedStatus, statusFilter]
  );

  const hasSelectedGroupBy = useMemo(() => selectedGroupBy.length > 0, [selectedGroupBy]);

  const hasDynamicFilters = useMemo(
    () => dynamicFilters !== null && dynamicFilters.length > 0,
    [dynamicFilters]
  );

  return {
    // Filter states
    selectedStatus: statusFilter?.value as string | undefined,
    selectedGroupBy,
    filterData: importFilter?.value as number | undefined,

    // Filter builders
    buildApiFilters,
    buildGroupedLeadsFilters,

    // Filter handlers
    handleStatusChange,
    handleGroupByChange,
    handleGroupByArrayChange,
    handleFilterDataChange,

    // Clear handlers
    handleClearImportFilter,
    handleClearStatusFilter,
    handleClearGroupByFilter,
    handleClearDynamicFilters,

    // Filter states for UI
    hasFilterData,
    hasSelectedStatus,
    hasSelectedGroupBy,
    hasDynamicFilters,
    hasUserAddedGroupBy, // NEW: Track if user has added group filters beyond defaults

    // Page detection
    isLiveLeadsPage,
    isRecycleLeadsPage,
    isLeadsPage,
    isArchivedPage,
    isTodoPage,
    isOffersPage,
    isOpeningsPage,
    isConfirmationsPage,
    isPaymentsPage,
    isNettoPage,

    // Additional state
    statusFilter,
    importFilter,
    dynamicFilters,
    isDynamicFilterMode,
    filterSource,
    clearDynamicFilters: clearDynamicFiltersStore,
    clearFilterByType,
  };
};
