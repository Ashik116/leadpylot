import type { DomainFilter } from '@/stores/universalGroupingFilterStore';
import type { FilterRule } from '@/stores/filterChainStore';
import { DEFAULT_PAGE_LIMIT } from '@/constants/pagination.constant';

import {
  transformOffersData,
  transformOpeningsData,
  transformConfirmationsData,
  transformPaymentData,
  transformNettoData,
  transformCashflowEntriesData,
  transformCashflowTransactionsData,
} from '@/app/(protected-pages)/dashboards/_components/DataTransformUtils';

/**
 * Boolean false and 0 are valid group keys; only skip null, undefined, or whitespace-only strings.
 */
function isDefinedGroupPathFilterValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

/**
 * Check if a field is a date field based on metadata or field name patterns
 */
export const isDateField = (
  fieldName: string,
  fieldTypesMap: Record<string, string> | null
): boolean => {
  if (fieldTypesMap && fieldTypesMap[fieldName] === 'date') {
    return true;
  }
  // Fallback: check field name patterns
  return (
    fieldName.includes('date') ||
    fieldName.includes('Date') ||
    fieldName.endsWith('_at') ||
    fieldName === 'createdAt' ||
    fieldName === 'updatedAt'
  );
};

/**
 * Get nested value from object using dot notation
 */
export const getNestedValue = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    return current[key];
  }, obj);
};

/**
 * Determine if we're on a progress page (openings, confirmations, payments, etc.)
 */
export const checkIsProgressPage = (
  storeEntityType: string | undefined,
  entityType: string | undefined,
  storeTableProgressFilter: string | undefined,
  pathname: string | null
): boolean => {
  // If tableProgressFilter is set, we're definitely on a progress page
  if (storeTableProgressFilter) {
    return true;
  }

  // Check pathname for progress page routes
  if (pathname) {
    if (
      pathname.includes('/openings') ||
      pathname.includes('/confirmations') ||
      pathname.includes('/payments') ||
      pathname.includes('/netto') ||
      pathname.includes('/lost')
    ) {
      return true;
    }
  }

  const entityTypeLower = (storeEntityType || entityType || 'Lead').toLowerCase();
  return (
    entityTypeLower === 'opening' ||
    entityTypeLower === 'confirmation' ||
    entityTypeLower === 'payment' ||
    entityTypeLower === 'netto' ||
    entityTypeLower === 'netto1' ||
    entityTypeLower === 'netto2' ||
    entityTypeLower === 'lost'
  );
};

/**
 * Determine has_progress value from tableProgressFilter (store), pathname, or entityType
 */
export const getHasProgressValue = (
  isProgressPage: boolean,
  storeTableProgressFilter: string | undefined,
  pathname: string | null,
  storeEntityType: string | undefined,
  entityType: string | undefined
): string | undefined => {
  // Priority 1: Use tableProgressFilter from store (for multi-table mode on openings page)
  if (storeTableProgressFilter) {
    return storeTableProgressFilter;
  }

  // If not a progress page, return undefined
  if (!isProgressPage) return undefined;

  // Priority 2: Try to get from pathname
  if (pathname) {
    if (pathname.includes('/openings')) return 'opening';
    if (pathname.includes('/confirmations')) return 'confirmation';
    if (pathname.includes('/payments')) return 'payment';
    if (pathname.includes('/netto')) {
      // Check for netto1 or netto2 in pathname or entityType
      const entityTypeLower = (storeEntityType || entityType || '').toLowerCase();
      if (entityTypeLower === 'netto1') return 'netto1';
      if (entityTypeLower === 'netto2') return 'netto2';
      return 'netto';
    }
    if (pathname.includes('/lost')) return 'lost';
  }

  // Priority 3: Fallback to entityType
  const entityTypeLower = (storeEntityType || entityType || '').toLowerCase();
  if (entityTypeLower === 'opening') return 'opening';
  if (entityTypeLower === 'confirmation') return 'confirmation';
  if (entityTypeLower === 'payment') return 'payment';
  if (entityTypeLower === 'netto1') return 'netto1';
  if (entityTypeLower === 'netto2') return 'netto2';
  if (entityTypeLower === 'netto') return 'netto';
  if (entityTypeLower === 'lost') return 'lost';

  return undefined;
};

/** Remove exact duplicate domain tuples (e.g. duplicate team_id from locked + group path). */
export const dedupeDomainFilters = (filters: DomainFilter[]): DomainFilter[] => {
  const seen = new Set<string>();
  const out: DomainFilter[] = [];
  for (const f of filters) {
    const key = JSON.stringify(f);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
};

/**
 * Build domain filters for a specific group
 * When a group is expanded, we need to add filters for the group path
 * For date fields, use groupName instead of groupId
 */
export const buildGroupDomainFilters = (
  userDomainFilters: DomainFilter[] | undefined,
  parentPath: Array<{ groupId: string; groupName: string; fieldName: string }>,
  group: { fieldName?: string; groupId: string; groupName: string },
  isDateFieldFn: (fieldName: string) => boolean
): DomainFilter[] => {
  // Use only user filters (excludes default filters)
  const userFilters = userDomainFilters || [];

  // Build filters from parent path + current group
  const pathFilters: DomainFilter[] = [];

  // Add filters for each parent group
  parentPath.forEach((parent) => {
    if (parent.fieldName) {
      // For date fields, use groupName; for others, use groupId
      const filterValue = isDateFieldFn(parent.fieldName)
        ? parent.groupName || parent.groupId
        : parent.groupId;

      if (isDefinedGroupPathFilterValue(filterValue)) {
        pathFilters.push([parent.fieldName, '=', filterValue] as DomainFilter);
      }
    }
  });

  // Add filter for current group if it has a fieldName
  if (group.fieldName) {
    const filterValue = isDateFieldFn(group.fieldName)
      ? group.groupName || group.groupId
      : group.groupId;

    if (isDefinedGroupPathFilterValue(filterValue)) {
      pathFilters.push([group.fieldName, '=', filterValue] as DomainFilter);
    }
  }

  // Combine user filters with path filters (default filters excluded)
  return [...userFilters, ...pathFilters];
};

/**
 * Convert default filters to query params format
 * Filters out redundant has_opening/has_confirmation/has_payment_voucher if has_progress is set
 */
export const buildDefaultFiltersAsQueryParams = (
  buildDefaultFilters: (() => FilterRule[]) | null,
  isProgressPage: boolean,
  hasProgressValue: string | undefined,
  pathname?: string | null // Add pathname to detect offers/openings pages
): Record<string, string | number | boolean> => {
  const queryParams: Record<string, string | number | boolean> = {};

  // Add includeAll parameter for all - leads page
  if (pathname === '/dashboards/leads') {
    queryParams.includeAll = true;
  }

  // For out-offers page: add out=true so expanded group details only return out-offers
  if (pathname?.includes('out-offers')) {
    queryParams.out = true;
  }

  if (!buildDefaultFilters) return queryParams;

  const defaultFilters = buildDefaultFilters();

  // Check if we're on offers or openings page (progress pages OR regular offers page)
  const isOffersOrOpeningsPage =
    isProgressPage || pathname?.includes('/offers') || pathname?.includes('/openings') || false;

  defaultFilters.forEach((filter) => {
    // Only convert simple '=' operators to query params
    // Complex operators (!=, >, <, etc.) should be in domain array
    if (
      filter.operator === '=' &&
      filter.field &&
      filter.value !== undefined &&
      filter.value !== null
    ) {
      // For progress pages (offers/openings), skip project-related filters
      // This ensures Agent role URLs match Admin role URLs
      if (isOffersOrOpeningsPage && (filter.field === 'project' || filter.field === 'project_id')) {
        return; // Skip project/project_id filters for offers/openings pages
      }

      // For progress pages, skip redundant filters that are already covered by has_progress
      if (isProgressPage && hasProgressValue) {
        // Filter out has_opening unless has_progress is 'opening'
        if (filter.field === 'has_opening' && hasProgressValue !== 'opening') return;
        // Filter out has_opening when has_progress is 'opening' (redundant)
        if (filter.field === 'has_opening' && hasProgressValue === 'opening') return;
        // Filter out has_confirmation unless has_progress is 'confirmation'
        if (filter.field === 'has_confirmation' && hasProgressValue !== 'confirmation') return;
        // Filter out has_confirmation when has_progress is 'confirmation' (redundant)
        if (filter.field === 'has_confirmation' && hasProgressValue === 'confirmation') return;
        // Filter out has_payment/has_payment_voucher unless has_progress is 'payment'
        if (
          (filter.field === 'has_payment' || filter.field === 'has_payment_voucher') &&
          hasProgressValue !== 'payment'
        )
          return;
        // Filter out has_payment/has_payment_voucher when has_progress is 'payment' (redundant)
        if (
          (filter.field === 'has_payment' || filter.field === 'has_payment_voucher') &&
          hasProgressValue === 'payment'
        )
          return;
        // Filter out has_netto1 unless has_progress is 'netto1'
        if (filter.field === 'has_netto1' && hasProgressValue !== 'netto1') return;
        // Filter out has_netto1 when has_progress is 'netto1' (redundant)
        if (filter.field === 'has_netto1' && hasProgressValue === 'netto1') return;
        // Filter out has_netto2 unless has_progress is 'netto2'
        if (filter.field === 'has_netto2' && hasProgressValue !== 'netto2') return;
        // Filter out has_netto2 when has_progress is 'netto2' (redundant)
        if (filter.field === 'has_netto2' && hasProgressValue === 'netto2') return;
        // Filter out has_lost unless has_progress is 'lost'
        if (filter.field === 'has_lost' && hasProgressValue !== 'lost') return;
        // Filter out has_lost when has_progress is 'lost' (redundant)
        if (filter.field === 'has_lost' && hasProgressValue === 'lost') return;
      }
      queryParams[filter.field] = filter.value;
    }
  });

  return queryParams;
};

/**
 * Build query params for API calls
 * For progress pages: use has_progress instead of domain when has_opening/has_confirmation/has_payment is already in defaultFilters
 */
export const buildGroupDetailsQueryParams = (
  groupDomainFilters: DomainFilter[],
  defaultFiltersAsQueryParams: Record<string, string | number | boolean>,
  groupPagination: { page: number; limit: number },
  isProgressPage: boolean,
  hasProgressValue: string | undefined,
  sorting?: { sortBy: string | null; sortOrder: 'asc' | 'desc' },
  pathname?: string | null, // Add pathname to detect offers/openings pages
  search?: string | null // Search term from ActionBar
): Record<string, unknown> => {
  // Remove project-related params for offers/openings pages (progress pages)
  // This ensures Agent role URLs match Admin role URLs
  const cleanedDefaultFilters = { ...defaultFiltersAsQueryParams };
  const isProjectMongoLeadsDetail =
    !!pathname && /^\/dashboards\/projects\/[a-f0-9]{24}$/i.test(pathname);
  if (isProjectMongoLeadsDetail) {
    delete cleanedDefaultFilters.project;
    delete cleanedDefaultFilters.includeAll;
  }
  // Check if we're on offers or openings page (progress pages OR regular offers page)
  const isOffersOrOpeningsPage =
    isProgressPage || pathname?.includes('/offers') || pathname?.includes('/openings') || false;

  if (isOffersOrOpeningsPage) {
    // Remove project and project_id from query params for offers/openings pages
    delete cleanedDefaultFilters.project;
    delete cleanedDefaultFilters.project_id;
  }

  const baseParams: Record<string, unknown> = {
    page: groupPagination.page || 1,
    limit: groupPagination.limit || DEFAULT_PAGE_LIMIT,
    // Add default filters as regular query params (e.g., use_status=pending)
    ...cleanedDefaultFilters,
  };

  // Add sorting parameters if provided
  if (sorting?.sortBy) {
    baseParams.sortBy = sorting.sortBy;
    baseParams.sortOrder = sorting.sortOrder || 'desc';
  }

  // Add search parameter if provided
  if (search) {
    baseParams.search = search;
  }

  // For progress pages (openings, confirmations, payments, etc.)
  if (isProgressPage) {
    // Add has_progress parameter if available
    if (hasProgressValue) {
      baseParams.has_progress = hasProgressValue;
    }

    // Filter out redundant domain filters that are already covered by has_progress
    const filteredDomainFilters =
      groupDomainFilters?.filter((filter) => {
        // Only filter out redundant filters if hasProgressValue is set
        if (hasProgressValue) {
          // Remove all progress-related filters when has_progress is set (they're redundant)
          // Remove has_opening unless has_progress is 'opening'
          if (filter[0] === 'has_opening' && hasProgressValue !== 'opening') return false;
          // Remove has_opening when has_progress is 'opening' (redundant)
          if (filter[0] === 'has_opening' && hasProgressValue === 'opening') return false;
          // Remove has_confirmation unless has_progress is 'confirmation'
          if (filter[0] === 'has_confirmation' && hasProgressValue !== 'confirmation') return false;
          // Remove has_confirmation when has_progress is 'confirmation' (redundant)
          if (filter[0] === 'has_confirmation' && hasProgressValue === 'confirmation') return false;
          // Remove has_payment/has_payment_voucher unless has_progress is 'payment'
          if (
            (filter[0] === 'has_payment' || filter[0] === 'has_payment_voucher') &&
            hasProgressValue !== 'payment'
          )
            return false;
          // Remove has_payment/has_payment_voucher when has_progress is 'payment' (redundant)
          if (
            (filter[0] === 'has_payment' || filter[0] === 'has_payment_voucher') &&
            hasProgressValue === 'payment'
          )
            return false;
          // Remove has_netto1 unless has_progress is 'netto1'
          if (filter[0] === 'has_netto1' && hasProgressValue !== 'netto1') return false;
          // Remove has_netto1 when has_progress is 'netto1' (redundant)
          if (filter[0] === 'has_netto1' && hasProgressValue === 'netto1') return false;
          // Remove has_netto2 unless has_progress is 'netto2'
          if (filter[0] === 'has_netto2' && hasProgressValue !== 'netto2') return false;
          // Remove has_netto2 when has_progress is 'netto2' (redundant)
          if (filter[0] === 'has_netto2' && hasProgressValue === 'netto2') return false;
          // Remove has_lost unless has_progress is 'lost'
          if (filter[0] === 'has_lost' && hasProgressValue !== 'lost') return false;
          // Remove has_lost when has_progress is 'lost' (redundant)
          if (filter[0] === 'has_lost' && hasProgressValue === 'lost') return false;
        }
        return true;
      }) || [];

    // CRITICAL FIX: Do NOT remove project_id filters from domain filters for progress pages
    // Group path filters (e.g., ["project_id", "=", "68786a211d047975700396e1"]) are essential
    // for filtering group details when expanding a group
    // We only remove project_id from defaultFiltersAsQueryParams (query params), not from domain filters
    // Domain filters include group path filters which must be preserved
    const finalDomainFilters = filteredDomainFilters;

    // Always add domain if there are group domain filters (group path filters)
    // This ensures group expansion works correctly on openings page
    // Group path filters (e.g., ["project_id", "=", "68786a211d047975700396e1"]) are essential for filtering group details
    if (finalDomainFilters.length > 0) {
      baseParams.domain = JSON.stringify(finalDomainFilters);
    }
  } else {
    // For non-progress pages, use domain parameter as before
    if (groupDomainFilters && groupDomainFilters.length > 0) {
      baseParams.domain = JSON.stringify(groupDomainFilters);
    }
  }

  return baseParams;
};

/**
 * Build API URL from query params for api-url-storage
 */
export const buildGroupApiUrl = (
  groupDetailsQueryParams: Record<string, unknown>,
  storeEntityType: string | undefined,
  entityType: string | undefined,
  shouldUseProgressEndpoint: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userRole?: string | undefined, // Kept for backward compatibility but not used (project scoping removed)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _selectedProjectId?: string | undefined, // Kept for backward compatibility but not used (project scoping removed)
  listResource: 'leads' | 'closed-leads' = 'leads'
): string => {
  // For progress pages, use /offers/progress endpoint
  // For other pages, use entity-specific endpoint
  // Special case: Team entity type maps to projects endpoint
  // Prioritize entityType prop when explicitly provided (for multi-table pages like cashflow)
  const effectiveEntityType = entityType || storeEntityType || 'Lead';
  let baseUrl: string;
  if (shouldUseProgressEndpoint) {
    baseUrl = '/offers/progress';
  } else if (listResource === 'closed-leads') {
    baseUrl = '/closed-leads';
  } else if (effectiveEntityType === 'Team') {
    baseUrl = '/projects';
  } else if (effectiveEntityType === 'CashflowEntry') {
    baseUrl = '/cashflow';
  } else if (effectiveEntityType === 'CashflowTransaction') {
    baseUrl = '/cashflow/transactions';
  } else {
    baseUrl = `/${effectiveEntityType.toLowerCase()}s`;
  }

  // DISABLED: Check if we're on offers or openings page (for Agent role, use project_id instead of team_id)
  // Project scoping restriction removed - Agents can now see all projects on offers/openings pages
  // const entityTypeLower = (storeEntityType || entityType || 'Lead').toLowerCase();
  // const isOffersPage = entityTypeLower === 'offer';
  // const isOffersOrOpeningsPage = isOffersPage || shouldUseProgressEndpoint; // Progress endpoint includes openings

  // Create a copy of query params to avoid mutating the original
  const processedParams = { ...groupDetailsQueryParams };

  // COMMENTED OUT: Previous logic that added project_id filter for Agents on offers/openings pages
  // For Agent role, convert project ID to team_id or project_id domain filter
  // if (userRole === 'Agent' && selectedProjectId && selectedProjectId !== 'all') {
  //   // Use project_id for offers/openings pages, team_id for other pages
  //   const filterFieldName = isOffersOrOpeningsPage ? 'project_id' : 'team_id';
  //
  //   // Parse existing domain filters if they exist
  //   let domainFilters: DomainFilter[] = [];
  //
  //   if (processedParams.domain) {
  //     try {
  //       // domain might be a string (JSON) or already an array
  //       const domainValue = typeof processedParams.domain === 'string'
  //         ? JSON.parse(processedParams.domain)
  //         : processedParams.domain;
  //
  //       if (Array.isArray(domainValue)) {
  //         domainFilters = domainValue as DomainFilter[];
  //       }
  //     } catch {
  //       domainFilters = [];
  //     }
  //   }
  //
  //   // Add project_id or team_id filter for the selected project
  //   const projectFilter: DomainFilter = [filterFieldName, '=', selectedProjectId];
  //
  //   // Check if filter already exists (check both project_id and team_id to handle page switches)
  //   const existingFilterIndex = domainFilters.findIndex(
  //     (filter) => filter[0] === 'project_id' || filter[0] === 'team_id'
  //   );
  //
  //   if (existingFilterIndex >= 0) {
  //     // Replace existing filter
  //     domainFilters[existingFilterIndex] = projectFilter;
  //   } else {
  //     // Add new filter
  //     domainFilters.push(projectFilter);
  //   }
  //
  //   // Update the domain in processed params
  //   processedParams.domain = JSON.stringify(domainFilters);
  // }

  const params = new URLSearchParams();

  // Convert query params to URLSearchParams
  // For progress pages (offers/openings/confirmations/payments/netto1/netto2), remove project-related params to match Admin URLs
  Object.entries(processedParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Skip project-related params for progress pages (offers/openings/confirmations/payments/netto1/netto2)
      if (shouldUseProgressEndpoint && (key === 'project' || key === 'project_id')) {
        return; // Don't add project/project_id to URL for progress pages
      }

      const outKey = listResource === 'closed-leads' && key === 'search' ? 'contact_name' : key;

      if (typeof value === 'object') {
        // For domain array, stringify it
        params.set(outKey, JSON.stringify(value));
      } else {
        params.set(outKey, String(value));
      }
    }
  });

  const finalUrl = `${baseUrl}?${params.toString()}`;

  return finalUrl;
};

/**
 * Get range text for pagination display
 */
export const getRangeText = (page: number, limit: number, total: number | undefined): string => {
  const start = page === 1 ? 1 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total || 0);
  return `${start}-${end}`;
};

/**
 * Normalize group details data from progress response
 * Handles both OffersProgressResponse and AllOffersProgressResponse
 */
export const normalizeGroupDetailsData = (
  progressGroupDetailsData: any,
  hasProgressValue: string | undefined,
  isOffersPage: boolean,
  isUsersPage: boolean,
  isProjectsPage: boolean,
  isReclamationsPage: boolean,
  offersGroupDetailsData: any,
  leadsGroupDetailsData: any,
  usersGroupDetailsData: any,
  projectsGroupDetailsData: any,
  reclamationsGroupDetailsData: any,
  shouldUseProgressEndpoint: boolean
): any => {
  if (shouldUseProgressEndpoint && progressGroupDetailsData) {
    // Check if it's AllOffersProgressResponse (has data as object) or OffersProgressResponse (has data as array)
    if (progressGroupDetailsData.data && Array.isArray(progressGroupDetailsData.data)) {
      // It's OffersProgressResponse - use directly
      return progressGroupDetailsData;
    } else if (progressGroupDetailsData.data && typeof progressGroupDetailsData.data === 'object') {
      // It's AllOffersProgressResponse - extract the specific table data based on hasProgressValue
      const allData = progressGroupDetailsData.data as any;
      const tableData = hasProgressValue && allData[hasProgressValue];
      if (tableData) {
        return {
          status:
            'status' in progressGroupDetailsData ? progressGroupDetailsData.status : 'success',
          meta: tableData.meta,
          data: tableData.data || [],
        };
      }
    }
    return { status: 'success', meta: { total: 0, page: 1, limit: DEFAULT_PAGE_LIMIT }, data: [] };
  }
  // Return appropriate data based on entity type
  if (isOffersPage) return offersGroupDetailsData;
  if (isUsersPage) return usersGroupDetailsData;
  if (isProjectsPage) return projectsGroupDetailsData;
  if (isReclamationsPage) return reclamationsGroupDetailsData;
  return leadsGroupDetailsData;
};

/**
 * Transform group details data based on entity type
 */
export const transformGroupDetailsData = (
  groupDetailsData: any,
  storeEntityType: string | undefined,
  entityType: string | undefined
): any => {
  if (
    !groupDetailsData?.data ||
    !Array.isArray(groupDetailsData.data) ||
    groupDetailsData.data.length === 0
  ) {
    return { ...groupDetailsData, data: [] };
  }

  // Determine which transform function to use based on entity type
  // Prioritize entityType prop when explicitly provided (for multi-table pages like cashflow)
  let transformFunction;
  const entityTypeLower = (entityType || storeEntityType || 'Lead').toLowerCase();

  switch (entityTypeLower) {
    case 'offer':
      transformFunction = transformOffersData;
      break;
    case 'opening':
      transformFunction = transformOpeningsData;
      break;
    case 'confirmation':
      transformFunction = transformConfirmationsData;
      break;
    case 'payment':
      transformFunction = transformPaymentData;
      break;
    case 'netto':
    case 'netto1':
    case 'netto2':
      transformFunction = transformNettoData;
      break;
    case 'cashflowentry':
      transformFunction = transformCashflowEntriesData;
      break;
    case 'cashflowtransaction':
      transformFunction = transformCashflowTransactionsData;
      break;
    case 'user':
      // Users don't need transformation - return as-is
      return groupDetailsData;
    default:
      // For leads or unknown types, return data as-is (leads might not need transformation)
      return groupDetailsData;
  }

  // Transform the data
  const transformedData = transformFunction(groupDetailsData.data);

  return {
    ...groupDetailsData,
    data: transformedData,
  };
};

/**
 * Determine effective entity type for metadata
 * For UnifiedDashboard pages (Opening entity type), always use "Offer" for metadata options
 */
export const getEffectiveEntityTypeForMetadata = (
  storeEntityType: string | undefined,
  entityType: string | undefined
): string => {
  const entityTypeToCheck = storeEntityType || entityType;
  // If entityType is Opening (used for openings, confirmations, payments pages), use "Offer"
  if (entityTypeToCheck === 'Opening') {
    return 'Offer';
  }
  // Otherwise use the entityType
  return entityTypeToCheck || 'Lead';
};
