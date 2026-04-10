'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import DebouceInput, { DebounceInputRef } from '@/components/shared/DebouceInput';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import FiltersDropdown from './FiltersDropdown';
import AppliedFiltersControl from './AppliedFiltersControl';
import { useFilterChainStore } from '@/stores/filterChainStore';
import { useSearchBarExpandedStore } from '@/stores/searchBarExpandedStore';
import { useFilterContext } from '@/contexts/FilterContext';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';
import { useSession } from '@/hooks/useSession';
import { useHasActiveFilterTags } from '@/hooks/useHasActiveFilterTags';
import { useQueryClient } from '@tanstack/react-query';
import { isFilterAndGroupingPage } from '@/configs/filterPages.config';
import Tooltip from '@/components/ui/Tooltip';
import {
  ACTION_BAR_FILTERS_GROUPING_TOOLTIP,
  ACTION_BAR_LIST_SEARCH_TOOLTIP,
  TOOLTIP_POPOVER_CLASS,
} from '@/utils/toltip.constants';

type SearchListAndGlobalSearchProps = {
  search?: string;
  searchPlaceholder?: string;
  onAppendQueryParams: (params: { search: string }) => void;
  pathname?: string | null;
  className?: string;
  // For multi-table pages: unique identifier for this table's dropdown
  // When provided, dropdown open/close is scoped to this specific table
  tableName?: string;
  // For multi-table pages: unique identifier for this table's FilterTags
  // When provided, FilterTags only shows tags for this specific table
  tableId?: string;
  // External group by state for multi-table pages
  // When provided, these override the global store values
  selectedGroupByArray?: string[];
  onGroupByArrayChange?: (groupBy: string[]) => void;
  entityType?:
  | 'Lead'
  | 'Offer'
  | 'User'
  | 'Team'
  | 'Opening'
  | 'Bank'
  | 'CashflowEntry'
  | 'CashflowTransaction'
  | 'Reclamation';
};

// Filter tags show inline only above 1536px; between 1024–1536 they show in popover
const FILTER_TAGS_INLINE_BREAKPOINT = 1536;

const SearchListAndGlobalSearch: React.FC<SearchListAndGlobalSearchProps> = ({
  search,
  searchPlaceholder = 'Search...',
  onAppendQueryParams,
  pathname,
  className = '',
  tableName,
  tableId,
  selectedGroupByArray: externalSelectedGroupByArray,
  onGroupByArrayChange: externalOnGroupByArrayChange,
  entityType,
}) => {
  const listSearchRef = useRef<DebounceInputRef>(null);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);

  // Session for role check
  const { data: session } = useSession();
  const isAgent = session?.user?.role === 'Agent';

  // Filters dropdown state from store
  const {
    isFiltersDropdownOpen: globalIsFiltersDropdownOpen,
    filtersDropdownInitialSection,
    closeFiltersDropdown,
    openFiltersDropdown,
    isDropdownOpenForTable,
    importFilter,
    groupBy: groupByFromStore,
    filterData: filterDataFromStore,
  } = useFilterChainStore();
  const {
    handleGroupByArrayChangeWithReset: handleGroupByArrayChangeWithResetFromContext,
    onGroupByArrayChange: onGroupByArrayChangeFromContext,
    handleFilterDataChange: handleFilterDataChangeFromContext,
  } = useFilterContext();

  // For multi-table mode: check if THIS table's dropdown is open
  // If tableName is provided, use scoped check; otherwise use global state
  const isFiltersDropdownOpen = tableName
    ? isDropdownOpenForTable(tableName)
    : globalIsFiltersDropdownOpen;

  const hideProjectOption = useUniversalGroupingFilterStore((state) => state.hideProjectOption);
  const hasActiveFilterTags = useHasActiveFilterTags();
  const { isExpanded, setExpanded, setCollapsed } = useSearchBarExpandedStore();
  const [isXlOrLarger, setIsXlOrLarger] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const check = () =>
      setIsXlOrLarger(
        typeof window !== 'undefined' && window.innerWidth > FILTER_TAGS_INLINE_BREAKPOINT
      );
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const clearAllFiltersAndClose = useCallback(() => {
    useFilterChainStore.getState().clearAllFilters();
    useUniversalGroupingFilterStore.getState().clearAllFilters();
    const { setCustomFilters, setDynamicFilterMode } = useDynamicFiltersStore.getState();
    setCustomFilters([]);
    setDynamicFilterMode(false);
    import('@/utils/queryInvalidation').then(({ invalidateUniversalGroupingQueries }) =>
      invalidateUniversalGroupingQueries(queryClient)
    );
  }, [queryClient]);

  // Effective filter values from store
  const filterDataFromImportFilter = importFilter?.value as number | undefined;
  const effectiveFilterData =
    filterDataFromStore !== undefined ? filterDataFromStore : filterDataFromImportFilter;
  const effectiveSetFilterData = handleFilterDataChangeFromContext || (() => { });

  // Use external groupBy props when provided (for multi-table pages), otherwise fallback to store
  const effectiveSelectedGroupByArray =
    externalSelectedGroupByArray !== undefined
      ? externalSelectedGroupByArray
      : Array.isArray(groupByFromStore)
        ? groupByFromStore
        : [];
  const effectiveOnGroupByArrayChange =
    externalOnGroupByArrayChange !== undefined
      ? externalOnGroupByArrayChange
      : handleGroupByArrayChangeWithResetFromContext || onGroupByArrayChangeFromContext || (() => { });

  // Use centralized config for pages with filtering and grouping
  const shouldShowFilters = isFilterAndGroupingPage(pathname);
  const showGroupBy = shouldShowFilters; // Same pages support both

  const handleListSearchFocus = () => {
    // Clear GlobalSearch when List Search is focused
    // globalSearchRef.current?.clear();
  };

  // Handle global click to collapse search bar when clicking outside search area and filter buttons
  useEffect(() => {
    if (!isExpanded) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      if (target.closest('.search-bar-container')) return;

      if (target.closest('.dashboard-filter-btn-container')) return;

      if (!search || search.length === 0) {
        setCollapsed();
      }
    };

    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [isExpanded, search, setCollapsed]);

  return (
    <div
      className={`flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2 xl:min-w-[12rem] 2xl:min-w-[24rem] ${className}`}
    >
      {/* Extra large (xl+): show filter tags inline; smaller screens: popover with minimize, or button when minimized */}
      {(shouldShowFilters || showGroupBy) && hasActiveFilterTags && (
        <AppliedFiltersControl
          isXlOrLarger={isXlOrLarger}
          isExpanded={isExpanded}
          tableId={tableId}
          onClearAllFilters={clearAllFiltersAndClose}
        />
      )}

      {/* Search bar with filter button - do not use w-full so filter tags stay on same line */}
      <div
        className={`search-bar-container flex min-h-6 h-6 shrink-0 items-center rounded-md border-[0.3px] border-gray-300 bg-white transition-all duration-300 ease-in-out focus-within:ring-gray-700`}
      >
        {/* Right Side - Global Search / List Search */}
        <div
          className={`flex items-center rounded-md transition-all duration-300 ease-in-out ${isExpanded || (search && search.length > 0)
            ? 'w-auto sm:min-w-[12rem] md:min-w-[24rem] lg:min-w-[16rem] 2xl:min-w-[20rem]'
            : 'w-6'
            }`}
          onClick={(e) => {
            // Don't trigger if clicking on the filters button
            if (
              filtersButtonRef.current &&
              (filtersButtonRef.current === e.target ||
                filtersButtonRef.current.contains(e.target as Node))
            ) {
              return;
            }
            if (!isExpanded) {
              setExpanded();
              // Small delay to allow transition to start before focusing
              setTimeout(() => listSearchRef.current?.focus(), 50);
            }
          }}
        >
          <div className="min-w-0 flex-1">
            <DebouceInput
              ref={listSearchRef}
              prefix={
                <Tooltip
                  title={ACTION_BAR_LIST_SEARCH_TOOLTIP}
                  placement="top"
                  wrapperClass="inline-flex shrink-0"
                  className={TOOLTIP_POPOVER_CLASS}
                >
                  <div
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isExpanded) {
                        setExpanded();
                        setTimeout(() => listSearchRef.current?.focus(), 50);
                      }
                    }}
                  >
                    <ApolloIcon name="search" className="mt-1.5 -ml-1 text-xs" />
                  </div>
                </Tooltip>
              }
              placeholder={isExpanded ? searchPlaceholder : ''}
              onChange={(e) => {
                onAppendQueryParams({
                  search: e.target.value,
                });
              }}
              onFocus={() => {
                setExpanded();
                handleListSearchFocus();
              }}
              onBlur={(e) => {
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (
                  relatedTarget?.closest('.dashboard-filter-btn-container') ||
                  filtersButtonRef.current?.contains(relatedTarget)
                ) {
                  return;
                }

                if (!search || search.length === 0) {
                  setCollapsed();
                }
              }}
              defaultValue={search || ''}
              className={`${pathname?.startsWith('/dashboards/mails') ? 'mails-search-compact' : ''
                } [&_.input-wrapper]:border-none [&_input]:!border-none [&_input]:shadow-none [&_input]:focus-within:ring-0 [&_input]:focus:!border-none [&_input]:focus:ring-0 ${!isExpanded && (!search || search.length === 0) ? 'cursor-pointer' : ''
                }`}
              style={{
                background: 'transparent',
              }}
              wait={750}
              size="xs"
            />
          </div>
        </div>

        {/* Filters & Grouping Button - Right Side */}
        {(shouldShowFilters || showGroupBy) && (
          <>
            <Tooltip
              title={ACTION_BAR_FILTERS_GROUPING_TOOLTIP}
              placement="top"
              wrapperClass="inline-flex"
              className={TOOLTIP_POPOVER_CLASS}
            >
              <Button
                ref={filtersButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  // Pass tableName for multi-table mode - only this table's dropdown will open
                  openFiltersDropdown(undefined, tableName);
                }}
                onMouseDown={(e) => {
                  // Prevent focus on mousedown as well
                  e.preventDefault();
                }}
                variant="plain"
                size="xs"
                className="border-l"
                icon={
                  <ApolloIcon
                    name={isFiltersDropdownOpen ? 'dropdown-up-large' : 'dropdown-large'}
                    className="text-xs"
                  />
                }
              />
            </Tooltip>
            <FiltersDropdown
              isOpen={isFiltersDropdownOpen}
              onClose={closeFiltersDropdown}
              triggerRef={filtersButtonRef}
              isAgent={isAgent}
              filterData={effectiveFilterData}
              setFilterData={effectiveSetFilterData}
              selectedGroupByArray={effectiveSelectedGroupByArray}
              onGroupByArrayChange={effectiveOnGroupByArrayChange}
              hideImportTab={false}
              hideDynamicTab={false}
              hideProjectOption={hideProjectOption}
              initialEditMode={filtersDropdownInitialSection}
              entityType={entityType}
              tableId={tableId}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default SearchListAndGlobalSearch;
