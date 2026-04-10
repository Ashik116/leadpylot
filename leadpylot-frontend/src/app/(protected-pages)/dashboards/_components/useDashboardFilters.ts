/**
 * Dashboard filters hook – builds domain filters, API params, and query keys for dashboard data fetching.
 *
 * @remarks
 * - Offers page: domain filters from lockedDomainFilters + userDomainFilters (universalGroupingFilterStore).
 * - Other pages: domain filters from buildGroupedLeadsFilters() + locked + user, with has_offer → has_transferred_offer for Agent.
 * - Converts FilterRule operators to API format (equals→=, in→in, etc.) via operatorMap.
 * - Produces domain, pageIndex, pageSize, search, sort, groupBy for LeadsService / grouped-leads APIs.
 *
 * @see docs/GROUPING_AND_FILTERING_GUIDE.md
 */
import React from 'react';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { DashboardType, TDashboardType } from './dashboardTypes';
import { useAllProjects } from '@/services/hooks/useProjects';
import type { DomainFilter } from '@/stores/universalGroupingFilterStore';
import {
  hasMeaningfulDomainFilters,
  normalizeDomainFiltersForApi,
  toDomainFiltersForApi,
} from '@/utils/filterUtils';

type UseDashboardFiltersArgs = {
  dashboardType: TDashboardType;
  dataHookParams?: Record<string, any>;
  selectedProgressFilter: TDashboardType;
  hasTransferredOffer: boolean;
  sessionRole?: Role;
  buildGroupedLeadsFilters: () => any[];
  buildApiFilters?: () => any[];
  lockedDomainFilters?: any[];
  userDomainFilters?: any[];
  storeSorting?: { sortBy?: string | null; sortOrder?: string | null } | null;
  storeSubgroupPagination?: Record<string, any> | null;
  pageIndex: number;
  pageSize: number;
  search: string | null;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  pathname: string;
  isMultiTableMode: boolean;
  selectedGroupBy: string[];
  effectiveProjectId?: string;
  tableProgressFilter?: TDashboardType;
};

export const useDashboardFilters = ({
  dashboardType,
  dataHookParams = {},
  selectedProgressFilter,
  hasTransferredOffer,
  sessionRole,
  buildGroupedLeadsFilters,
  buildApiFilters,
  lockedDomainFilters,
  userDomainFilters,
  storeSorting,
  storeSubgroupPagination,
  pageIndex,
  pageSize,
  search,
  status,
  sortBy,
  sortOrder,
  pathname,
  isMultiTableMode,
  selectedGroupBy,
  effectiveProjectId,
  tableProgressFilter,
}: UseDashboardFiltersArgs) => {
  // Build domain filters for all pages
  // For offers page: use lockedDomainFilters + userDomainFilters from CustomFilterOption (stored in universalGroupingFilterStore)
  // For other pages: build domain filters from filter chain + lockedDomainFilters + userDomainFilters
  const domainFilters = React.useMemo(() => {
    // Combine locked filters (immutable for agents) with user filters
    const locked = lockedDomainFilters || [];
    const user = normalizeDomainFiltersForApi(userDomainFilters || []);

    // For offers page, use locked + user domain filters from store (set by CustomFilterOption)
    if (dashboardType === DashboardType.OFFER) {
      return [...locked, ...user];
    }

    // For other pages, build domain filters from filter chain + locked + userDomainFilters
    const baseGroupedFilters = buildGroupedLeadsFilters();
    let groupedFilters = baseGroupedFilters;

    // Agent + "Transferred offers" button: use has_transferred_offer instead of has_offer — see ARCHITECTURE.md §5.4
    if (hasTransferredOffer && sessionRole === Role.AGENT) {
      groupedFilters = baseGroupedFilters.map((filter) => {
        if (filter.field === 'has_offer' && filter.operator === 'equals' && filter.value === true) {
          return {
            field: 'has_transferred_offer',
            operator: 'equals',
            value: true,
          };
        }
        return filter;
      });
    }

    // Convert filter chain format to domain format for API (equals→=, etc.)
    const filterChainDomainFilters = toDomainFiltersForApi(groupedFilters) as [string, string, any][];

    // OPENINGS PAGE: project_id handling — see docs/ARCHITECTURE.md §5.3
    // We only include project/project_id when user explicitly adds it via CustomFilterOption.
    // Otherwise, users would be restricted to one project's data on the openings page.
    if (dashboardType === DashboardType.OPENING) {
      // Filter out project/project_id from locked and filterChain filters
      // Only keep it if user explicitly added it via userDomainFilters
      const filteredLocked = locked.filter(
        (filter) => filter[0] !== 'project' && filter[0] !== 'project_id'
      );
      const filteredFilterChain = filterChainDomainFilters.filter(
        (filter) => filter[0] !== 'project' && filter[0] !== 'project_id'
      );

      // Combine: filtered locked + user filters (which may include project if user added it) + filtered filterChain
      return [...filteredLocked, ...user, ...filteredFilterChain];
    }

    // Combine locked filters + user filters + filter chain filters (from CustomFilterOption)
    return [...locked, ...user, ...filterChainDomainFilters];
  }, [
    dashboardType,
    buildGroupedLeadsFilters,
    hasTransferredOffer,
    sessionRole,
    lockedDomainFilters,
    userDomainFilters,
  ]);

  // Fetch all projects to convert "project" filters to "project_id" filters
  const { data: allProjectsData } = useAllProjects({ limit: 1000 });

  // Create project name-to-ID mapping
  const projectNameToIdMap = React.useMemo(() => {
    if (!allProjectsData?.data) return {};
    const map: Record<string, string> = {};
    allProjectsData.data.forEach((project: any) => {
      if (project.name && project._id) {
        map[project.name] = project._id;
      }
    });
    return map;
  }, [allProjectsData]);

  // Convert "project" filters to "project_id" filters and deduplicate
  const convertedDomainFilters = React.useMemo(() => {
    let converted = domainFilters;

    // Convert project name filters to project_id filters
    if (projectNameToIdMap && Object.keys(projectNameToIdMap).length > 0) {
      converted = domainFilters.map((filter) => {
        if (filter[0] === 'project' && filter[1] === '=') {
          const projectName = filter[2];
          const projectId = projectNameToIdMap[projectName];
          if (projectId) {
            return ['project_id', '=', projectId] as DomainFilter;
          }
        }
        if (filter[0] === 'project' && (filter[1] === 'in' || filter[1] === 'not in')) {
          const projectNames = Array.isArray(filter[2]) ? filter[2] : [filter[2]];
          const projectIds = projectNames
            .map((name) => projectNameToIdMap[name])
            .filter((id) => id);
          if (projectIds.length > 0) {
            return ['project_id', filter[1], projectIds] as DomainFilter;
          }
        }
        return filter;
      });
    }

    // Deduplicate filters: remove duplicates based on field, operator, and value
    const seen = new Set<string>();
    const deduplicated: DomainFilter[] = [];

    for (const filter of converted) {
      // Create a unique key for the filter: field|operator|value
      // For array values (like 'in' operator), sort and stringify
      let valueKey = filter[2];
      if (Array.isArray(valueKey)) {
        valueKey = JSON.stringify([...valueKey].sort());
      } else {
        valueKey = String(valueKey);
      }
      const filterKey = `${filter[0]}|${filter[1]}|${valueKey}`;

      if (!seen.has(filterKey)) {
        seen.add(filterKey);
        deduplicated.push(filter);
      }
    }

    return deduplicated;
  }, [domainFilters, projectNameToIdMap]);

  // Prepare hook parameters
  // For offers page: include domain parameter when userDomainFilters are present (from CustomFilterOption)
  const hookParams = React.useMemo(() => {
    // Use store sorting when domain filters are applied, otherwise use URL params
    const hasDomainFilters = convertedDomainFilters && convertedDomainFilters.length > 0;
    const effectiveSortBy =
      hasDomainFilters && storeSorting?.sortBy ? storeSorting.sortBy : sortBy || undefined;
    const effectiveSortOrder =
      hasDomainFilters && storeSorting?.sortOrder ? storeSorting.sortOrder : sortOrder || undefined;

    const baseParams: Record<string, any> = {
      page: pageIndex,
      limit: pageSize,
      search: search || undefined,
      sortBy: effectiveSortBy,
      sortOrder: effectiveSortOrder,
      out: pathname.includes('out-offers') ? true : undefined,
      ...dataHookParams,
      // Add progress filter for all progress-related dashboards (openings, confirmations, payments)
      // This ensures has_progress is included for all tabs: opening, confirmation, payment, netto1, netto2, lost
      ...((dashboardType === DashboardType?.OPENING ||
        dashboardType === DashboardType?.CONFIRMATION ||
        dashboardType === DashboardType?.PAYMENT ||
        dashboardType === DashboardType?.NETTO) &&
        selectedProgressFilter && {
          has_progress: selectedProgressFilter,
        }),
      // Add status for offers
      ...(dashboardType === DashboardType.OFFER && { status }),
      // Add transferred offer filter
      ...(dashboardType === DashboardType.OFFER &&
        hasTransferredOffer && { has_transferred_offer: true }),
    };

    // Add domain parameter when convertedDomainFilters are present (from CustomFilterOption)
    if (convertedDomainFilters && convertedDomainFilters.length > 0) {
      if (dashboardType === DashboardType.OFFER) {
        // For offers page, add all domain filters
        baseParams.domain = JSON.stringify(convertedDomainFilters);
      } else if (
        dashboardType === DashboardType.OPENING ||
        dashboardType === DashboardType.CONFIRMATION ||
        dashboardType === DashboardType.PAYMENT ||
        dashboardType === DashboardType.NETTO
      ) {
        // For progress pages, filter out redundant has_progress-related filters
        // These conflict with the has_progress parameter and can cause no data to show
        const conflictingFields = [
          'has_opening',
          'has_confirmation',
          'has_payment',
          'has_payment_voucher',
          'has_netto1',
          'has_netto2',
          'has_lost',
        ];

        let filteredDomainFilters = convertedDomainFilters.filter(
          (filter) => !conflictingFields.includes(filter[0])
        );

        // When grouping is active: project_id is conveyed via groupBy path, not domain.
        const hasGrouping = selectedGroupBy.length > 0 || isMultiTableMode;
        if (hasGrouping) {
          filteredDomainFilters = filteredDomainFilters.filter(
            (filter) => filter[0] !== 'project_id' && filter[0] !== 'project'
          );
        } else if (dashboardType === DashboardType.OPENING) {
          // Openings: no project_id unless user explicitly added filters (see ARCHITECTURE.md §5.3)
          const hasUserFilters = hasMeaningfulDomainFilters(userDomainFilters);

          if (!hasUserFilters) {
            filteredDomainFilters = filteredDomainFilters.filter(
              (filter) => filter[0] !== 'project_id' && filter[0] !== 'project'
            );
          }
        }

        // Only add domain if there are non-conflicting filters
        if (filteredDomainFilters.length > 0) {
          baseParams.domain = JSON.stringify(filteredDomainFilters);
        }
      }
    }

    return baseParams;
  }, [
    pageIndex,
    pageSize,
    search,
    sortBy,
    sortOrder,
    storeSorting, // Include store sorting in dependencies
    convertedDomainFilters, // Use convertedDomainFilters instead of domainFilters
    dataHookParams,
    dashboardType,
    selectedProgressFilter,
    hasTransferredOffer,
    status,
    pathname, // Include pathname in dependencies
    selectedGroupBy, // Include for openings page project_id filtering logic
    isMultiTableMode, // Include for openings page project_id filtering logic
    userDomainFilters, // Include for openings page project_id filtering logic
  ]);

  // For Agent role with transferred offer filter: skip flat view API call, only use grouped view
  const shouldSkipFlatViewApi =
    sessionRole === Role.AGENT && hasTransferredOffer && dashboardType === DashboardType.OFFER;
  // Disable regular API hook when grouping is active - only use grouped summary API
  const shouldDisableHook = shouldSkipFlatViewApi || isMultiTableMode || selectedGroupBy.length > 0;

  // Prepare hook params with enabled flag
  const hookParamsWithEnabled = {
    ...hookParams, // _filterHash is included for React Query cache key but filtered out in API service
    ...(shouldDisableHook && { enabled: false }),
  };

  // Build default filters as query params
  const defaultFiltersAsQueryParams = React.useMemo(() => {
    const queryParams: Record<string, string | number | boolean> = {};

    // Check if we're on offers or openings pages (for removing project filtering)
    // Define once at the top to avoid duplicate definitions
    // Fix: Use correct dashboardType values ('offer' and 'opening', not 'offers' and 'openings')
    const isOffersOrOpeningsPage =
      dashboardType === DashboardType.OFFER || dashboardType === DashboardType.OPENING;

    if (!buildApiFilters) {
      // DISABLED: Add project_id for Agent role on offers/openings pages
      // Project scoping restriction removed - Agents can now see all projects on offers/openings pages
      if (sessionRole === Role.AGENT && effectiveProjectId && !isOffersOrOpeningsPage) {
        queryParams.project_id = effectiveProjectId;
      }
      return queryParams;
    }

    const defaultFilters = buildApiFilters();

    // Determine if we're on a progress page and get the has_progress value
    const isProgressPage =
      dashboardType === DashboardType.OPENING ||
      dashboardType === DashboardType.CONFIRMATION ||
      dashboardType === DashboardType.PAYMENT ||
      dashboardType === DashboardType.NETTO ||
      selectedProgressFilter === 'netto1' ||
      selectedProgressFilter === 'netto2' ||
      selectedProgressFilter === 'lost';
    // Use selectedProgressFilter for default filters (hasProgressForGrouping is defined later)
    const currentHasProgress = selectedProgressFilter;

    defaultFilters.forEach((filter) => {
      // Only convert simple '=' operators to query params
      if (
        filter.operator === '=' &&
        filter.field &&
        filter.value !== undefined &&
        filter.value !== null
      ) {
        // For progress pages (offers/openings), skip project-related filters
        // This ensures Agent role URLs match Admin role URLs
        if (
          (isProgressPage || isOffersOrOpeningsPage) &&
          (filter.field === 'project' || filter.field === 'project_id')
        ) {
          return; // Skip project/project_id filters for progress pages and offers/openings pages
        }

        // For progress pages, skip redundant filters that are already covered by has_progress
        if (isProgressPage && currentHasProgress) {
          // Filter out has_opening unless has_progress is 'opening'
          if (filter.field === 'has_opening' && currentHasProgress !== 'opening') return;
          // Filter out has_opening when has_progress is 'opening' (redundant)
          if (filter.field === 'has_opening' && currentHasProgress === 'opening') return;
          // Filter out has_confirmation unless has_progress is 'confirmation'
          if (filter.field === 'has_confirmation' && currentHasProgress !== 'confirmation') return;
          // Filter out has_confirmation when has_progress is 'confirmation' (redundant)
          if (filter.field === 'has_confirmation' && currentHasProgress === 'confirmation') return;
          // Filter out has_payment/has_payment_voucher unless has_progress is 'payment'
          if (
            (filter.field === 'has_payment' || filter.field === 'has_payment_voucher') &&
            currentHasProgress !== 'payment'
          )
            return;
          // Filter out has_payment/has_payment_voucher when has_progress is 'payment' (redundant)
          if (
            (filter.field === 'has_payment' || filter.field === 'has_payment_voucher') &&
            currentHasProgress === 'payment'
          )
            return;
          // Filter out has_netto1 unless has_progress is 'netto1'
          if (filter.field === 'has_netto1' && currentHasProgress !== 'netto1') return;
          // Filter out has_netto1 when has_progress is 'netto1' (redundant)
          if (filter.field === 'has_netto1' && currentHasProgress === 'netto1') return;
          // Filter out has_netto2 unless has_progress is 'netto2'
          if (filter.field === 'has_netto2' && currentHasProgress !== 'netto2') return;
          // Filter out has_netto2 when has_progress is 'netto2' (redundant)
          if (filter.field === 'has_netto2' && currentHasProgress === 'netto2') return;
          // Filter out has_lost unless has_progress is 'lost'
          if (filter.field === 'has_lost' && currentHasProgress !== 'lost') return;
          // Filter out has_lost when has_progress is 'lost' (redundant)
          if (filter.field === 'has_lost' && currentHasProgress === 'lost') return;
        }
        queryParams[filter.field] = filter.value;
      }
    });

    // For out-offers page: replace has_offer with out (do not pass has_offer, use out=true instead)
    if (pathname?.includes('out-offers')) {
      delete queryParams.has_offer;
      queryParams.out = true;
    }

    // DISABLED: Add project_id for Agent role on offers/openings pages
    // Project scoping restriction removed - Agents can now see all projects on offers/openings pages
    // For other pages, project_id is still added if needed
    // Note: isOffersOrOpeningsPage is already defined at the top of this useMemo
    if (sessionRole === Role.AGENT && effectiveProjectId && !isOffersOrOpeningsPage) {
      queryParams.project_id = effectiveProjectId;
    }

    return queryParams;
  }, [buildApiFilters, sessionRole, effectiveProjectId, dashboardType, selectedProgressFilter, pathname]);

  // Determine has_progress value for grouped summary API call
  // Priority: tableProgressFilter (multi-table mode) > selectedProgressFilter (single-table mode)
  const hasProgressForGrouping = React.useMemo(() => {
    if (tableProgressFilter) {
      return tableProgressFilter;
    }
    // For openings/confirmations/payments pages, use selectedProgressFilter
    if (
      dashboardType === DashboardType.OPENING ||
      dashboardType === DashboardType.CONFIRMATION ||
      dashboardType === DashboardType.PAYMENT
    ) {
      return selectedProgressFilter;
    }
    return undefined;
  }, [tableProgressFilter, selectedProgressFilter, dashboardType]);

  const finalDomainFilters = React.useMemo(() => {
    // Check if we're on any progress page
    const isProgressPageForDomainFilter =
      dashboardType === DashboardType.OFFER ||
      dashboardType === DashboardType.OPENING ||
      dashboardType === DashboardType.CONFIRMATION ||
      dashboardType === DashboardType.PAYMENT ||
      dashboardType === DashboardType.NETTO ||
      dashboardType === DashboardType.NETTO1 ||
      dashboardType === DashboardType.NETTO2 ||
      dashboardType === DashboardType.LOST ||
      !!tableProgressFilter || // Multi-table mode: any tableProgressFilter indicates progress page
      !!hasProgressForGrouping; // Single-table mode: hasProgressForGrouping indicates progress page

    // For progress pages, filter out conflicting has_progress-related filters
    // These conflict with the has_progress parameter and can cause no data to show
    if (isProgressPageForDomainFilter) {
      // Progress pages: has_* filters come from tableProgressFilter/selectedProgressFilter, not domain
      const conflictingFields = [
        'has_opening',
        'has_confirmation',
        'has_payment',
        'has_payment_voucher',
        'has_netto1',
        'has_netto2',
        'has_lost',
      ];

      // Filter out conflicting filters
      let filtered = domainFilters.filter((filter) => !conflictingFields.includes(filter[0]));

      // project_id handling when expanding groups — see docs/ARCHITECTURE.md §5.3
      // Distinguish: (a) group path filter = ObjectId, used for group details; (b) project name filter = project scoping.
      const isExpandingGroup = Object.keys(storeSubgroupPagination || {}).length > 0;

      if (isExpandingGroup) {
        filtered = filtered.filter((filter) => {
          if (filter[0] === 'project' || filter[0] === 'project_id') {
            const filterValue = filter[2];
            // MongoDB ObjectId (24 hex) = group path filter for group details API — keep it
            if (typeof filterValue === 'string' && /^[0-9a-fA-F]{24}$/.test(filterValue)) {
              return true;
            }
            // Project name = project scoping filter — remove when expanding group
            return false;
          }
          return true;
        });
      }

      return filtered;
    }

    // For non-progress pages (like offers), return domainFilters as-is
    // Note: Conversion to project_id is already done in convertedDomainFilters above
    return domainFilters;
  }, [
    domainFilters,
    dashboardType,
    tableProgressFilter,
    hasProgressForGrouping,
    storeSubgroupPagination, // Include storeSubgroupPagination directly
  ]);

  // Remove project_id from defaultFilters for progress pages — see docs/ARCHITECTURE.md §5.3
  const cleanedDefaultFiltersForGrouping = React.useMemo(() => {
    const cleaned = { ...defaultFiltersAsQueryParams };
    // Check if we're on any progress page
    // In multi-table mode: check tableProgressFilter (confirmation, payment, netto2, lost)
    // In single-table mode: check dashboardType (opening) or hasProgressForGrouping
    const isProgressPageForProjectRemoval =
      dashboardType === DashboardType.OFFER ||
      dashboardType === DashboardType.OPENING ||
      dashboardType === DashboardType.CONFIRMATION ||
      dashboardType === DashboardType.PAYMENT ||
      dashboardType === DashboardType.NETTO ||
      dashboardType === DashboardType.NETTO1 ||
      dashboardType === DashboardType.NETTO2 ||
      dashboardType === DashboardType.LOST ||
      !!tableProgressFilter || // Multi-table mode: any tableProgressFilter indicates progress page
      !!hasProgressForGrouping; // Single-table mode: hasProgressForGrouping indicates progress page

    if (isProgressPageForProjectRemoval) {
      delete cleaned.project_id;
      delete cleaned.project;
    }
    return cleaned;
  }, [defaultFiltersAsQueryParams, dashboardType, tableProgressFilter, hasProgressForGrouping]);

  return {
    domainFilters,
    hookParams,
    hookParamsWithEnabled,
    shouldSkipFlatViewApi,
    shouldDisableHook,
    defaultFiltersAsQueryParams,
    hasProgressForGrouping,
    finalDomainFilters,
    cleanedDefaultFiltersForGrouping,
  };
};
