'use client';

import React, { createContext, useContext, type ReactNode } from 'react';
import type { FilterRule } from '@/stores/filterChainStore';

/**
 * Filter context value – provides filter builders and handlers to avoid prop drilling and store function refs.
 *
 * @remarks
 * Phase B: buildApiFilters, buildGroupedLeadsFilters.
 * Phase C: All handlers moved from filterChainStore – stores hold only data.
 *
 * @see docs/GROUPING_AND_FILTERING_GUIDE.md
 */
export interface FilterContextValue {
  // Filter builders (Phase B)
  buildApiFilters?: () => FilterRule[] | any[];
  buildGroupedLeadsFilters?: () => FilterRule[] | any[];

  // Handlers (Phase C) – optional; consumers use no-op when undefined
  onGroupByArrayChange?: (groupBy: string[]) => void;
  handleFilterDataChange?: (value: number | undefined) => void;
  handleStatusChange?: (status: string | undefined) => void;
  handleGroupByChange?: (groupBy: string | undefined) => void;
  handleGroupByArrayChange?: (groupBy: string[]) => void;
  handleGroupByArrayChangeWithReset?: (groupBy: string[]) => void;
  handleClearImportFilter?: () => void;
  handleClearStatusFilter?: () => void;
  handleClearGroupByFilter?: () => void;
  handleClearDynamicFilters?: () => void;
  handleGroupClick?: (field: string, groupId: string, groupName: string) => void;
  handleGroupedLeadsSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  handleMultiLevelGrouping?: () => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export interface FilterProviderProps {
  value: FilterContextValue;
  children: ReactNode;
}

/**
 * Provides buildApiFilters and buildGroupedLeadsFilters to descendants.
 * Wrap dashboard layouts that use useFilterChainLeads (or equivalent).
 */
export function FilterProvider({ value, children }: FilterProviderProps) {
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

/**
 * Returns buildApiFilters and buildGroupedLeadsFilters from FilterProvider.
 * Returns undefined when used outside a FilterProvider.
 */
export function useFilterContext(): FilterContextValue {
  const context = useContext(FilterContext);
  return context ?? {};
}
