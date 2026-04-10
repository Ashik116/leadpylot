'use client';

import { useMemo } from 'react';
import type { FilterContextValue } from '@/contexts/FilterContext';
import type { FilterRule } from '@/stores/filterChainStore';

/**
 * Build FilterProvider value for dashboards using useFilterChainLeads.
 * Reduces duplication across Users, Projects, Banks, UnifiedDashboard.
 *
 * @see docs/GROUPING_AND_FILTERING_GUIDE.md
 */
export function useFilterProviderValue(
  buildApiFilters: () => FilterRule[],
  buildGroupedLeadsFilters: () => FilterRule[],
  handleGroupByArrayChangeWithReset: (groupBy: string[]) => void,
  handleClearGroupByFilter: () => void
): FilterContextValue {
  return useMemo(
    () => ({
      buildApiFilters,
      buildGroupedLeadsFilters,
      handleGroupByArrayChangeWithReset,
      handleClearGroupByFilter,
      onGroupByArrayChange: handleGroupByArrayChangeWithReset,
    }),
    [
      buildApiFilters,
      buildGroupedLeadsFilters,
      handleGroupByArrayChangeWithReset,
      handleClearGroupByFilter,
    ]
  );
}
