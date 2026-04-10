import { QueryClient } from '@tanstack/react-query';
import { useFilterChainStore } from '@/stores/filterChainStore';
import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';

/**
 * Intelligently invalidates all lead-related queries based on current filter state
 * This ensures that both regular and filtered lead queries are updated after mutations
 */
export const invalidateLeadQueries = (queryClient: QueryClient) => {
  // Always invalidate basic leads queries
  queryClient.invalidateQueries({ queryKey: ['leads'] });
  queryClient.invalidateQueries({ queryKey: ['lead'] }); // Individual lead details

  // Get current filter state
  const filterState = useFilterChainStore.getState();
  const { groupBy, importFilter, statusFilter, dynamicFilters } = filterState;
  
  // Invalidate grouped-summary queries (new system) when grouping is active
  // Only invalidate, don't force refetch - React Query will refetch when components need it
  if (groupBy && groupBy.length > 0) {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const firstKey = query.queryKey[0];
        // Only invalidate grouped-summary (new system)
        return firstKey === 'grouped-summary';
      },
    });
  }

  // If there are any active filters, invalidate filtered lead queries
  const hasActiveFilters = !!(importFilter || statusFilter || dynamicFilters.length > 0);
  if (hasActiveFilters) {
    // Invalidate dynamic filter related queries
    queryClient.invalidateQueries({ queryKey: ['dynamic-filter-options'] });

    // Invalidate leads queries with filter parameters
    // Since filtered leads still use ['leads', params], we need to be more aggressive
    queryClient.invalidateQueries({
      predicate: (query) => {
        // Invalidate any leads query that might have filter parameters
        return Boolean(
          query.queryKey[0] === 'leads' &&
            query.queryKey.length > 1 &&
            query.queryKey[1] &&
            typeof query.queryKey[1] === 'object'
        );
      },
    });
  }

  // Also invalidate related queries that might display lead data
  queryClient.invalidateQueries({ queryKey: ['sources'] });
  // DEPRECATED: group-options query is no longer used, replaced by metadata-options
  // queryClient.invalidateQueries({ queryKey: ['group-options'] });

  // Invalidate recent imports if import filters are active
  if (importFilter) {
    queryClient.invalidateQueries({ queryKey: ['recent-imports'] });
  }
};

/**
 * Specific invalidation for dynamic filters
 * This handles the case where dynamic filters are applied and data is stored in Zustand store
 */
export const invalidateDynamicFilters = (queryClient: QueryClient) => {
  // Get current dynamic filter state
  const dynamicFilterState = useDynamicFiltersStore.getState();
  const { isDynamicFilterMode, refetchDynamicFilters } = dynamicFilterState;

  if (isDynamicFilterMode && refetchDynamicFilters) {
    // Trigger a refetch of the dynamic filter results
    refetchDynamicFilters().catch(() => {
      // Silently handle errors - refetch failure shouldn't block invalidation
    });
  }

  // Also invalidate any related queries
  queryClient.invalidateQueries({ queryKey: ['dynamic-filter-options'] });
};

/**
 * Alternative approach: Invalidate specific query combinations
 * Use this when you know the exact filter state being used
 */
export const invalidateSpecificLeadQueries = (
  queryClient: QueryClient,
  options: {
    groupFields?: string[];
    groupPath?: string[];
    filterParams?: Record<string, unknown>;
    invalidateAll?: boolean;
  }
) => {
  const { groupFields, groupPath, filterParams, invalidateAll = false } = options;

  // Always invalidate basic queries
  queryClient.invalidateQueries({ queryKey: ['leads'] });
  queryClient.invalidateQueries({ queryKey: ['lead'] });

  // Invalidate specific grouped leads query
  if (groupFields && groupFields.length > 0) {
    queryClient.invalidateQueries({
      queryKey: ['grouped-leads', groupFields],
      exact: false,
    });
  }

  // Invalidate specific group leads query
  if (groupFields && groupPath && groupFields.length > 0 && groupPath.length > 0) {
    queryClient.invalidateQueries({
      queryKey: ['group-leads', groupFields, groupPath],
      exact: false,
    });
  }

  // Invalidate leads with specific filter parameters
  if (filterParams) {
    queryClient.invalidateQueries({
      queryKey: ['leads', filterParams],
      exact: true,
    });
  }

  // Nuclear option: invalidate everything lead-related
  if (invalidateAll) {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const firstKey = query.queryKey[0];
        return (
          typeof firstKey === 'string' && (firstKey.includes('lead') || firstKey.includes('group'))
        );
      },
    });
  }
};

/**
 * Nuclear approach: Invalidate ALL lead-related queries
 * Use this as a fallback if the smart approach has issues
 */
export const invalidateAllLeadQueries = (queryClient: QueryClient) => {
  // Nuclear option: invalidate anything that might contain lead data
  queryClient.invalidateQueries({
    predicate: (query) => {
      const firstKey = query.queryKey[0];
      return Boolean(
        typeof firstKey === 'string' &&
          (firstKey.includes('lead') ||
            firstKey.includes('group') ||
            firstKey === 'sources' ||
            firstKey === 'recent-imports')
      );
    },
  });
};

/**
 * Specific invalidation for grouped leads scenarios
 * Use this when you know you're dealing with grouped data
 * OPTIMIZED: Only invalidates queries (marks as stale) - React Query will refetch when components need them
 * This prevents unnecessary API calls for inactive queries
 */
export const invalidateGroupedLeadQueries = (queryClient: QueryClient) => {
  // Only invalidate grouped-summary queries (new system)
  // React Query will automatically refetch when the component using the query is active
  // This prevents refetching inactive queries that aren't being used
  queryClient.invalidateQueries({
    predicate: (query) => {
      const firstKey = query.queryKey[0];
      // Only invalidate grouped-summary (new system)
      // Old grouped-leads queries are kept for backward compatibility but won't be refetched unless active
      return firstKey === 'grouped-summary';
    },
  });

  // Note: We don't invalidate ['leads'] or ['lead'] here because:
  // 1. They're already invalidated by invalidateLeadQueries() which is called before this
  // 2. This prevents duplicate invalidations and unnecessary refetches
  // 3. React Query will handle refetching when components actually need the data
};

/**
 * Invalidate universal grouping and filtering queries
 * This handles both grouped-summary and leads queries (including group-details which now uses useLeads)
 * Also invalidates offers, openings, and offers-progress queries for UnifiedDashboard pages
 * Uses predicate to match all queries regardless of serialized parameters
 */
export const invalidateUniversalGroupingQueries = (queryClient: QueryClient) => {
  // Invalidate grouped-summary queries (all variants)
  queryClient.invalidateQueries({
    predicate: (query) => {
      const firstKey = query.queryKey[0];
      return firstKey === 'grouped-summary';
    },
  });

  // Invalidate all leads queries (including group-details which now uses useLeads with domain parameter)
  // This will catch both regular leads queries and filtered leads queries with domain parameter
  queryClient.invalidateQueries({ 
    queryKey: ['leads'], 
    exact: false // Match all leads queries with any parameters (including domain parameter)
  });

  // Invalidate offers queries (for offers dashboard)
  queryClient.invalidateQueries({ 
    queryKey: ['offers'], 
    exact: false // Match all offers queries with any parameters (including domain parameter)
  });

  // Invalidate openings queries (for openings dashboard)
  queryClient.invalidateQueries({ 
    queryKey: ['openings'], 
    exact: false // Match all openings queries with any parameters (including domain parameter)
  });

  // Invalidate offers-progress queries (for openings, confirmations, payments dashboards)
  queryClient.invalidateQueries({ 
    queryKey: ['offers-progress'], 
    exact: false // Match all offers-progress queries with any parameters (including domain parameter)
  });

  // Invalidate offers-progress-all queries (for multi-table mode)
  queryClient.invalidateQueries({ 
    queryKey: ['offers-progress-all'], 
    exact: false
  });
};

/**
 * EMERGENCY: Nuclear invalidation of EVERYTHING
 * Use this as last resort for debugging
 */
export const emergencyInvalidateEverything = (queryClient: QueryClient) => {
  queryClient.clear();
  queryClient.refetchQueries();
};

/**
 * Hook version that can be used within React components
 * tst comgg
 */
export const useInvalidateLeadQueries = () => {
  return {
    invalidateAll: (queryClient: QueryClient) => invalidateLeadQueries(queryClient),
    invalidateSpecific: (
      queryClient: QueryClient,
      options: Parameters<typeof invalidateSpecificLeadQueries>[1]
    ) => invalidateSpecificLeadQueries(queryClient, options),
  };
};
