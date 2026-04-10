'use client';

import { useFilterChainStore } from '@/stores/filterChainStore';
import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import { hasMeaningfulDomainFilters } from '@/utils/filterUtils';

/**
 * Returns true when any filter tags would be shown (group by, import, agent/custom filters, dynamic filters).
 * Used to collapse the left action bar (All, Contract, Confirmation...) into a menu so the search bar
 * and filter tags have more space.
 */
export function useHasActiveFilterTags(): boolean {
  const importFilter = useFilterChainStore((state) => state.importFilter);
  const groupByFilterChain = useFilterChainStore((state) => state.groupBy);
  const groupByUniversal = useUniversalGroupingFilterStore((state) => state.groupBy);
  const userDomainFilters = useUniversalGroupingFilterStore((state) => state.userDomainFilters);
  const isDynamicFilterMode = useDynamicFiltersStore((state) => state.isDynamicFilterMode);
  const customFilters = useDynamicFiltersStore((state) => state.customFilters);

  const hasImport =
    importFilter !== null && importFilter !== undefined && importFilter.value !== undefined;
  const hasGroupBy =
    (Array.isArray(groupByFilterChain) && groupByFilterChain.length > 0) ||
    (Array.isArray(groupByUniversal) && groupByUniversal.length > 0);
  const hasCustomFilters = hasMeaningfulDomainFilters(userDomainFilters);
  const hasDynamicFilters =
    Boolean(isDynamicFilterMode) && Array.isArray(customFilters) && customFilters.length > 0;

  return hasImport || hasGroupBy || hasCustomFilters || hasDynamicFilters;
}
