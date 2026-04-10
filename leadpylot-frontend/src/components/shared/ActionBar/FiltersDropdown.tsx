import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import ApolloIcon from '@/components/ui/ApolloIcon';
import FilterByImport from '@/app/(protected-pages)/dashboards/leads/_components/FilterByImport';
// OLD: import GroupByFilter from '@/app/(protected-pages)/dashboards/leads/_components/GroupByFilter';
import GroupByOptions, { GroupBySavedPresetsToolbar } from '@/components/groupAndFiltering/GroupByOptions';
// OLD: import DynamicFilters from '@/components/layouts/PostLoginLayout/components/DynamicFilters';
import CustomFilterOption from '@/components/groupAndFiltering/CustomFilterOption';
import SavedFilters, { SavedFilter } from './SavedFilters';
import { useApplyDomainFilters } from '@/services/hooks/useLeads';
import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';
import { useFilterChainStore } from '@/stores/filterChainStore';
import { useFilterAwareLeadsNavigationStore } from '@/stores/navigationStores';
import { useApiUrlStore } from '@/stores/apiUrlStore';
import {
  useUniversalGroupingFilterStore,
  type DomainFilter,
} from '@/stores/universalGroupingFilterStore';
import { toDomainFiltersForApi } from '@/utils/filterUtils';
import { useCentralizedFilters } from '@/hooks/useCentralizedFilters';
import { useFilterContext } from '@/contexts/FilterContext';
import { entityTypeToFilterPage } from '@/types/savedFilter.types';
import Tooltip from '@/components/ui/Tooltip';
import {
  CUSTOM_FILTER_BACK_TOOLTIP,
  FILTERS_PANEL_ADD_CUSTOM_FILTER_TOOLTIP,
  TOOLTIP_POPOVER_CLASS,
} from '@/utils/toltip.constants';
// Removed direct API imports - using React Query hooks instead

type TFiltersDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  isAgent: boolean;
  filterData?: number | undefined;
  setFilterData: (value: number | undefined) => void;
  // OLD: selectedGroupBy?: string; // No longer used - GroupByOptions uses store directly
  // OLD: onGroupByChange: (groupBy: string | undefined) => void; // No longer used
  selectedGroupByArray?: string[];
  onGroupByArrayChange: (groupBy: string[]) => void;
  hideImportTab?: boolean;
  hideDynamicTab?: boolean;
  /** @deprecated Use useFilterContext() instead */
  buildApiFilters?: () => any[];
  // Hide specific group by options
  hideProjectOption?: boolean;
  // Control which section is open initially (e.g., 'dynamic' to open DynamicFilters section)
  initialEditMode?: 'import' | 'groupBy' | 'dynamic' | null;
  // Entity type for multi-table pages - when provided, overrides pathname-based detection
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
  // Table ID for multi-table pages - when provided, uses multi-table store instead of global store
  tableId?: string;
};

const FiltersDropdown: React.FC<TFiltersDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  isAgent,
  filterData,
  setFilterData,
  // OLD: selectedGroupBy, // No longer used
  // OLD: onGroupByChange, // No longer used
  selectedGroupByArray,
  onGroupByArrayChange,
  hideImportTab = false,
  hideDynamicTab = false,
  buildApiFilters,
  hideProjectOption = false,
  initialEditMode = null,
  entityType: propEntityType,
  tableId,
}) => {
  // State for edit mode per column
  const [editModes, setEditModes] = useState<Record<string, boolean>>({
    import: false,
    groupBy: false,
    dynamic: false,
  });

  // Function to toggle edit mode for a specific column
  const toggleEditMode = (column: string) => {
    setEditModes((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  // Set initial edit mode when dropdown opens with initialEditMode prop
  // IMPORTANT: When opening from tags, only open the section (for dynamic), NOT edit mode
  // Edit mode should only be activated when user clicks the edit button
  useEffect(() => {
    if (isOpen && initialEditMode) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        // Only open the dynamic section, not edit mode for import/groupBy
        // Edit mode is only for reordering/hiding filters, not for viewing them
        if (initialEditMode === 'dynamic') {
          setEditModes({
            import: false,
            groupBy: false,
            dynamic: true, // Open dynamic section when clicking dynamic filter tag
          });
        } else {
          // For import and groupBy, just show them normally (not in edit mode)
          setEditModes({
            import: false,
            groupBy: false,
            dynamic: false,
          });
        }
      });
    } else if (!isOpen) {
      // Reset edit modes when dropdown closes
      requestAnimationFrame(() => {
        setEditModes({
          import: false,
          groupBy: false,
          dynamic: false,
        });
      });
    }
  }, [isOpen, initialEditMode]);

  // Check if we're on pages that should hide import filter
  const pathname = usePathname();
  const isTodoPage = pathname?.includes('/dashboards/todo');
  const isBanksPage = pathname?.includes('/admin/banks');
  const isCashflowPage = pathname?.includes('/dashboards/cashflow');
  const shouldHideImportTab =
    hideImportTab || (isAgent && isTodoPage) || isBanksPage || isCashflowPage;

  // Domain-based filter API (replaces removed /dynamic-filters/apply)
  const applyDynamicFilters = useApplyDomainFilters();
  const {
    sortBy,
    sortOrder,
    setRefetchFunction,
    setDynamicFilterMode,
    setDynamicFilterResults,
    setDynamicFilterQuery,
    setCustomFilters,
    setLoading,
    setTotal,
    setPage,
    setPageSize,
    setHasNextPage,
    setHasPrevPage,
    setFilterSource,
  } = useDynamicFiltersStore();
  const { setDynamicFilters, filterData: filterDataFromStore } = useFilterChainStore();
  const {
    buildApiFilters: buildApiFiltersFromContext,
    handleFilterDataChange: handleFilterDataChangeFromContext,
    onGroupByArrayChange: onGroupByArrayChangeFromContext,
    handleGroupByArrayChangeWithReset: handleGroupByArrayChangeWithResetFromContext,
  } = useFilterContext();

  const { setFilteredItems, setFilterState } = useFilterAwareLeadsNavigationStore();
  const { setApiUrl } = useApiUrlStore();
  const queryClient = useQueryClient();

  // Get groupBy from universalGroupingFilterStore (single source of truth)
  const {
    groupBy: storeGroupBy,
    setGroupBy,
    setEntityType: setStoreEntityType,
  } = useUniversalGroupingFilterStore();

  // Ref to track if we're updating from props to prevent circular updates
  const isUpdatingFromPropsRef = useRef(false);
  const isUpdatingFromStoreRef = useRef(false);

  // Prioritize store values, fallback to props (for backward compatibility)
  const effectiveFilterData = filterData !== undefined ? filterData : filterDataFromStore;
  const effectiveSetFilterData = handleFilterDataChangeFromContext || setFilterData || (() => {});

  // Memoize to prevent unnecessary re-renders
  // Use storeGroupBy from universalGroupingFilterStore as source of truth
  const effectiveSelectedGroupByArray = useMemo(
    () =>
      selectedGroupByArray !== undefined
        ? selectedGroupByArray
        : Array.isArray(storeGroupBy)
          ? storeGroupBy
          : [],
    [selectedGroupByArray, storeGroupBy]
  );

  const effectiveOnGroupByArrayChange = useMemo(
    () =>
      handleGroupByArrayChangeWithResetFromContext ||
      onGroupByArrayChangeFromContext ||
      onGroupByArrayChange ||
      (() => {}),
    [
      handleGroupByArrayChangeWithResetFromContext,
      onGroupByArrayChangeFromContext,
      onGroupByArrayChange,
    ]
  );

  const effectiveBuildApiFilters = buildApiFilters || buildApiFiltersFromContext || undefined;

  // Determine entity type from pathname
  const { pageType } = useCentralizedFilters();
  const getEntityType = (): 'Lead' | 'Offer' | 'User' | 'Team' | 'Opening' | 'Bank' => {
    if (pageType === 'offers' || pageType === 'out-offers') return 'Offer';
    if (pageType === 'openings') return 'Opening';
    if (pageType === 'confirmations') return 'Opening'; // Confirmations might use Opening entity
    if (pageType === 'payments') return 'Opening'; // Payments might use Opening entity
    // For banks page
    if (pathname?.includes('/admin/banks')) return 'Bank';
    // For users page
    if (pathname?.includes('/admin/users')) return 'User';
    // For project details page (viewing leads within a project), use "Lead"
    // Pattern: /dashboards/projects/[id] where [id] is a MongoDB ObjectId (24 hex chars)
    if (pathname?.match(/^\/dashboards\/projects\/[a-f0-9]{24}$/i)) return 'Lead';
    // For project list pages, Team means "project"
    if (pathname?.includes('/dashboards/projects')) return 'Team';
    // Default to Lead
    return 'Lead';
  };
  // Use prop entityType if provided (for multi-table pages), otherwise derive from pathname
  const entityType = propEntityType || getEntityType();

  // Determine if we're externally controlled (multi-table mode)
  // When propEntityType is provided with external groupBy props, we're in multi-table mode
  const isExternallyControlled = propEntityType !== undefined && selectedGroupByArray !== undefined;

  // For UnifiedDashboard pages (offers, openings, confirmations, payments), always use "Offer" for metadata options
  // This ensures all UnifiedDashboard pages call /api/metadata/options/Offer
  const metadataEntityType = useMemo(() => {
    // If it's a UnifiedDashboard page (offers, out-offers, openings, confirmations, payments), use "Offer"
    if (
      pageType === 'offers' ||
      pageType === 'out-offers' ||
      pageType === 'openings' ||
      pageType === 'confirmations' ||
      pageType === 'payments'
    ) {
      return 'Offer';
    }
    // Otherwise use the determined entityType
    return entityType;
  }, [pageType, entityType]);

  // Set entity type in store when it changes (use original entityType for store, not metadataEntityType)
  // SKIP when externally controlled - we don't want to modify the global store in multi-table mode
  useEffect(() => {
    if (!isExternallyControlled) {
      setStoreEntityType(entityType);
    }
  }, [entityType, setStoreEntityType, isExternallyControlled]);

  // Sync groupBy from props to store (one-way: props -> store, only when props have values)
  // CRITICAL: Do NOT clear store when props are empty - this prevents accidental clearing
  // The store is the source of truth when props are not provided (e.g., on offers page)
  // SKIP when externally controlled - each table manages its own state
  useEffect(() => {
    // Skip if externally controlled - multi-table mode uses local state
    if (isExternallyControlled) {
      return;
    }

    // Skip if we're currently updating from store to prevent circular updates
    if (isUpdatingFromStoreRef.current) {
      return;
    }

    // Only sync props to store when props have actual values
    // If props are undefined/empty, trust the store (GroupByOptions updates store directly)
    if (effectiveSelectedGroupByArray && effectiveSelectedGroupByArray.length > 0) {
      // Only update if different to avoid infinite loops
      if (JSON.stringify(storeGroupBy) !== JSON.stringify(effectiveSelectedGroupByArray)) {
        isUpdatingFromPropsRef.current = true;
        setGroupBy(effectiveSelectedGroupByArray);
        // Reset flag after a brief delay to allow store update to complete
        setTimeout(() => {
          isUpdatingFromPropsRef.current = false;
        }, 0);
      }
    }
    // REMOVED: The else clause that cleared store when props are empty
    // This was causing GroupByOptions selections to disappear
  }, [effectiveSelectedGroupByArray, setGroupBy, storeGroupBy, isExternallyControlled]);

  // Sync store changes back to parent via callback (if needed)
  // SKIP when externally controlled - each table manages its own state
  useEffect(() => {
    // Skip if externally controlled - multi-table mode uses local state
    if (isExternallyControlled) {
      return;
    }

    // Skip if we're currently updating from props to prevent circular updates
    if (isUpdatingFromPropsRef.current) {
      return;
    }

    if (
      storeGroupBy.length > 0 &&
      JSON.stringify(storeGroupBy) !== JSON.stringify(effectiveSelectedGroupByArray)
    ) {
      // Notify parent of store changes
      if (effectiveOnGroupByArrayChange) {
        isUpdatingFromStoreRef.current = true;
        effectiveOnGroupByArrayChange(storeGroupBy);
        // Reset flag after a brief delay to allow callback to complete
        setTimeout(() => {
          isUpdatingFromStoreRef.current = false;
        }, 0);
      }
    }
  }, [
    storeGroupBy,
    effectiveSelectedGroupByArray,
    effectiveOnGroupByArrayChange,
    isExternallyControlled,
  ]);

  // Handle CustomFilterOption apply callback
  // Note: CustomFilterOption already updates the store with userDomainFilters
  // We just need to invalidate queries to trigger React Query refetch
  const handleCustomFilterApply = async (domainFilters: DomainFilter[]) => {
    try {
      // Check if filters are being cleared (only default filters remain, no user filters)
      const { userDomainFilters } = useUniversalGroupingFilterStore.getState();
      const isClearingFilters = userDomainFilters.length === 0;

      // Update navigation store state (but don't call API directly - let React Query handle it)
      const hasGrouping =
        (storeGroupBy && storeGroupBy.length > 0) ||
        (effectiveSelectedGroupByArray && effectiveSelectedGroupByArray.length > 0);
      const groupByFields =
        storeGroupBy.length > 0 ? storeGroupBy : effectiveSelectedGroupByArray || [];

      // If clearing filters and no grouping, clear navigation store
      if (isClearingFilters && !hasGrouping) {
        const { clearFilterState } = useFilterAwareLeadsNavigationStore.getState();
        clearFilterState();
        setApiUrl(null);
        setFilterState(null);
      } else {
        // Build API URL for navigation store
        const endpoint = entityType.toLowerCase() + 's';
        const queryParams = new URLSearchParams();
        queryParams.set('domain', JSON.stringify(domainFilters));
        if (hasGrouping && groupByFields.length > 0) {
          queryParams.set('groupBy', JSON.stringify(groupByFields));
        }
        const apiUrl = `/${endpoint}?${queryParams.toString()}`;

        setApiUrl(apiUrl);
        setFilterState({
          isDynamicFilterMode: false,
          dynamicFilters: [],
          isGroupedMode: hasGrouping && groupByFields.length > 0,
          apiUrl,
          groupFields: hasGrouping && groupByFields.length > 0 ? groupByFields : undefined,
        });
      }

      // Invalidate queries to trigger refetch in components using React Query hooks
      // Use centralized invalidation function to prevent duplicate calls
      const { invalidateUniversalGroupingQueries } = await import('@/utils/queryInvalidation');
      invalidateUniversalGroupingQueries(queryClient);
    } catch (error) {
      console.error('Error applying custom filters:', error);
      // Still invalidate queries to trigger refetch
      const { invalidateUniversalGroupingQueries } = await import('@/utils/queryInvalidation');
      invalidateUniversalGroupingQueries(queryClient);
    }
  };

  // Function to get edit icon button for header
  const getEditIconButton = (column: string) => {
    // Don't show edit button for import column if user is agent or on todo page
    if (column === 'import' && (isAgent || shouldHideImportTab)) return null;

    // For dynamic column, don't show edit button as it doesn't have traditional edit functionality
    if (column === 'dynamic') return null;

    const isInEditMode = editModes[column];

    return (
      <button
        onClick={() => toggleEditMode(column)}
        className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        title={isInEditMode ? 'Done' : 'Edit'}
      >
        <ApolloIcon name={isInEditMode ? 'check' : 'pen'} className="text-sm" />
      </button>
    );
  };

  // Handle applying saved filter
  const handleApplySavedFilter = async (savedFilter: SavedFilter) => {
    // Apply grouping if present
    if (savedFilter.groupingFields && savedFilter.groupingFields.length > 0) {
      if (effectiveOnGroupByArrayChange) {
        effectiveOnGroupByArrayChange(savedFilter.groupingFields);
      }
    }

    // Determine which filters to apply based on type
    // IMPORTANT: FilterByImport (GET API) and DynamicFilters (POST API) are mutually exclusive
    // If both are present, prioritize DynamicFilters (POST API) since it's more comprehensive
    const hasFilterByImport = savedFilter.filterByImport !== undefined;
    const hasDynamicFilters = savedFilter.dynamicFilters?.sessionStorageData !== undefined;

    // Check type to determine which API to use
    const isFilterByImportType =
      savedFilter.type === 'filterByImport' || savedFilter.type === 'grouping-filterByImport';
    const isDynamicFilterType =
      savedFilter.type === 'dynamic-filter' || savedFilter.type === 'grouping-dynamic-filter';
    const isBothType = savedFilter.type === 'both';

    // If type is "both" and both filters exist, prioritize DynamicFilters (POST API)
    // Otherwise, apply based on the specific type
    const shouldApplyFilterByImport =
      isFilterByImportType && hasFilterByImport && !hasDynamicFilters;
    const shouldApplyDynamicFilters = isDynamicFilterType || (isBothType && hasDynamicFilters);

    // Apply FilterByImport if present and type indicates it (GET API: /leads?duplicate=X)
    // Only apply if DynamicFilters is NOT present (they're mutually exclusive)
    if (shouldApplyFilterByImport && effectiveSetFilterData) {
      const { duplicate } = savedFilter.filterByImport!;

      // Clear DynamicFilters first (they're mutually exclusive)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dynamicFilters');
        sessionStorage.removeItem('dynamic-filters-body');
        setDynamicFilters([]);
        setDynamicFilterMode(false);
      }

      // Set filterData state (this will trigger the GET API call via useLeadsDashboard)
      effectiveSetFilterData(duplicate);

      // Also update filter chain store
      const { setImportFilter } = useFilterChainStore.getState();
      setImportFilter({
        field: 'duplicate_status',
        operator: 'equals',
        value: duplicate,
      });

      // Invalidate and refetch leads queries to trigger GET API call
      // The query key includes duplicate parameter, so changing filterData will trigger refetch
      queryClient.invalidateQueries({ queryKey: ['leads'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['grouped-leads'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['group-leads'], exact: false });
    } else if (
      !shouldApplyFilterByImport &&
      effectiveSetFilterData &&
      (isDynamicFilterType || isBothType)
    ) {
      // Clear FilterByImport if this filter type uses DynamicFilters instead
      effectiveSetFilterData(undefined);
      const { clearFilterByType } = useFilterChainStore.getState();
      clearFilterByType('import');
    }

    // Apply DynamicFilters if present and type indicates it (POST API)
    // Only apply if FilterByImport is NOT being applied (they're mutually exclusive)
    if (shouldApplyDynamicFilters && savedFilter.dynamicFilters && typeof window !== 'undefined') {
      try {
        // Restore localStorage (custom rules)
        if (savedFilter.dynamicFilters.localStorageData) {
          localStorage.setItem(
            'dynamicFilters',
            JSON.stringify(savedFilter.dynamicFilters.localStorageData)
          );
        } else {
          localStorage.removeItem('dynamicFilters');
        }

        // Clear FilterByImport first (they're mutually exclusive)
        if (effectiveSetFilterData) {
          effectiveSetFilterData(undefined);
          const { clearFilterByType } = useFilterChainStore.getState();
          clearFilterByType('import');
        }

        // Restore sessionStorage (complete filter body for POST API)
        if (savedFilter.dynamicFilters.sessionStorageData) {
          const sessionData = savedFilter.dynamicFilters.sessionStorageData;
          sessionStorage.setItem(
            'dynamic-filters-body',
            JSON.stringify({
              filters: sessionData.filters || [],
              page: sessionData.page || 1,
              limit: sessionData.limit || 50,
              ...(sessionData.sortBy && { sortBy: sessionData.sortBy }),
              ...(sessionData.sortOrder && { sortOrder: sessionData.sortOrder }),
            })
          );

          // Update filter chain store
          const filterRules = (sessionData.filters || []).map((filter: any) => ({
            field: filter.field,
            operator: filter.operator,
            value: filter.value,
          }));
          setDynamicFilters(filterRules);

          // Trigger POST API call with saved filters
          const filtersToApply = sessionData.filters || [];
          const page = sessionData.page || 1;
          const limit = sessionData.limit || 50;
          const sortByToUse = sessionData.sortBy || sortBy || undefined;
          const sortOrderToUse = sessionData.sortOrder || sortOrder || undefined;

          // Create refetch function for pagination that also updates stores
          const refetchWithPagination = async (pageNum = 1, pageSize = 50): Promise<void> => {
            try {
              const result = await applyDynamicFilters.mutateAsync({
                filters: filtersToApply,
                page: pageNum,
                limit: pageSize,
                sortBy: sortByToUse,
                sortOrder: sortOrderToUse,
              });

              // Update stores with paginated results
              setDynamicFilterResults(result.data || []);
              const dynamicFilterData = result as any;
              setTotal(
                dynamicFilterData.meta?.pagination?.total || dynamicFilterData.totalFiltered || 0
              );
              setPage(dynamicFilterData.meta?.pagination?.page || pageNum);
              setPageSize(
                dynamicFilterData.meta?.pagination?.limit ||
                  dynamicFilterData.meta?.pagination?.currentPageSize ||
                  pageSize
              );
              setHasNextPage(dynamicFilterData.meta?.pagination?.hasNextPage || false);
              setHasPrevPage(dynamicFilterData.meta?.pagination?.hasPrevPage || false);
              setLoading(false);

              // Update navigation store
              const pagination = (result.meta as any)?.pagination;
              const paginationMeta = pagination
                ? {
                    page: pagination.page || pageNum,
                    limit: pagination.limit || pageSize,
                    total: pagination.total || 0,
                    pages: Math.ceil((pagination.total || 0) / (pagination.limit || pageSize)),
                  }
                : undefined;

              const domain = toDomainFiltersForApi(filtersToApply);
              const refetchParams = new URLSearchParams();
              refetchParams.set('domain', JSON.stringify(domain));
              refetchParams.set('page', String(paginationMeta?.page || pageNum));
              refetchParams.set('limit', String(paginationMeta?.limit || pageSize));
              refetchParams.set('includeAll', 'true');
              if (sortByToUse) refetchParams.set('sortBy', sortByToUse);
              if (sortOrderToUse) refetchParams.set('sortOrder', sortOrderToUse);
              const refetchApiUrl = `/leads?${refetchParams.toString()}`;
              setApiUrl(refetchApiUrl);
              setFilteredItems(result.data || [], paginationMeta);
              setFilterState({
                isDynamicFilterMode: true,
                dynamicFilters: filtersToApply,
                isGroupedMode: false,
                paginationMeta,
                apiUrl: refetchApiUrl,
                sortBy: sortByToUse ?? undefined,
                sortOrder: sortOrderToUse ?? undefined,
              });
            } catch {
              setLoading(false);
            }
          };

          // Set refetch function
          setRefetchFunction(refetchWithPagination);

          // Trigger initial API call with onSuccess callback to update stores
          applyDynamicFilters.mutate(
            {
              filters: filtersToApply,
              page,
              limit,
              sortBy: sortByToUse,
              sortOrder: sortOrderToUse,
            },
            {
              onSuccess: (data) => {
                // Update dynamic filters store with response data
                setDynamicFilterMode(true);
                setDynamicFilterResults(data.data || []);
                setDynamicFilterQuery(filtersToApply);

                // Extract custom filters (non-default filters) from saved data
                const customFilters = savedFilter.dynamicFilters?.localStorageData || [];
                setCustomFilters(customFilters);

                // Handle dynamic filter response structure with nested pagination
                const dynamicFilterData = data as any;
                setTotal(
                  dynamicFilterData.meta?.pagination?.total || dynamicFilterData.totalFiltered || 0
                );
                setPage(dynamicFilterData.meta?.pagination?.page || page);
                setPageSize(
                  dynamicFilterData.meta?.pagination?.limit ||
                    dynamicFilterData.meta?.pagination?.currentPageSize ||
                    limit
                );
                setHasNextPage(dynamicFilterData.meta?.pagination?.hasNextPage || false);
                setHasPrevPage(dynamicFilterData.meta?.pagination?.hasPrevPage || false);
                setFilterSource('custom');
                setLoading(false);

                // Update navigation store with current page results and pagination metadata
                try {
                  const currentResults = data.data || [];
                  const meta = data.meta;

                  // CRITICAL: Dynamic filters API has nested pagination: meta.pagination.{total, page, limit}
                  const pagination = (meta as any)?.pagination;
                  const paginationMeta = pagination
                    ? {
                        page: pagination.page || page,
                        limit: pagination.limit || limit,
                        total: pagination.total || 0,
                        pages: Math.ceil((pagination.total || 0) / (pagination.limit || limit)),
                      }
                    : undefined;

                  // Store domain-based URL for navigation (replaces old /dynamic-filters/apply)
                  const domain = toDomainFiltersForApi(filtersToApply);
                  const params = new URLSearchParams();
                  params.set('domain', JSON.stringify(domain));
                  params.set('page', String(paginationMeta?.page || page));
                  params.set('limit', String(paginationMeta?.limit || limit));
                  params.set('includeAll', 'true');
                  if (sortByToUse) params.set('sortBy', sortByToUse);
                  if (sortOrderToUse) params.set('sortOrder', sortOrderToUse);
                  const apiUrlToStore = `/leads?${params.toString()}`;
                  setApiUrl(apiUrlToStore);

                  // Store in sessionStorage for page refresh restoration (backward compatibility)
                  sessionStorage.setItem(
                    'dynamic-filters-body',
                    JSON.stringify({
                      filters: filtersToApply,
                      page: paginationMeta?.page || page,
                      limit: paginationMeta?.limit || limit,
                      ...(sortByToUse && { sortBy: sortByToUse }),
                      ...(sortOrderToUse && { sortOrder: sortOrderToUse }),
                    })
                  );

                  // Update navigation store with current page data and pagination metadata
                  setFilteredItems(currentResults, paginationMeta);
                  setFilterState({
                    isDynamicFilterMode: true,
                    dynamicFilters: filtersToApply,
                    isGroupedMode: false,
                    paginationMeta,
                    apiUrl: apiUrlToStore,
                    sortBy: sortByToUse ?? undefined,
                    sortOrder: sortOrderToUse ?? undefined,
                  });
                } catch {
                  // Fallback to current page results
                  const currentResults = data.data || [];
                  const domain = toDomainFiltersForApi(filtersToApply);
                  const fallbackParams = new URLSearchParams();
                  fallbackParams.set('domain', JSON.stringify(domain));
                  fallbackParams.set('page', String(page));
                  fallbackParams.set('limit', String(limit));
                  fallbackParams.set('includeAll', 'true');
                  if (sortByToUse) fallbackParams.set('sortBy', sortByToUse);
                  if (sortOrderToUse) fallbackParams.set('sortOrder', sortOrderToUse);
                  const apiUrlToStore = `/leads?${fallbackParams.toString()}`;
                  setApiUrl(apiUrlToStore);
                  setFilteredItems(currentResults);
                  setFilterState({
                    isDynamicFilterMode: true,
                    dynamicFilters: filtersToApply,
                    isGroupedMode: false,
                    apiUrl: apiUrlToStore,
                  });
                }
              },
              onError: () => {
                setLoading(false);
              },
            }
          );
        } else {
          // Clear DynamicFilters if no sessionStorage data
          localStorage.removeItem('dynamicFilters');
          sessionStorage.removeItem('dynamic-filters-body');
          setDynamicFilters([]);
        }
      } catch {
        // Silent fail - dynamic filters restoration failed
      }
    } else if (!isDynamicFilterType && typeof window !== 'undefined') {
      // Clear DynamicFilters if this filter type doesn't use it
      // Only clear if we're applying a filter that doesn't include dynamic filters
      if (
        savedFilter.type === 'filterByImport' ||
        savedFilter.type === 'grouping-filterByImport' ||
        savedFilter.type === 'grouping'
      ) {
        // Clear dynamic filters for FilterByImport types (GET API)
        localStorage.removeItem('dynamicFilters');
        sessionStorage.removeItem('dynamic-filters-body');
        setDynamicFilters([]);
        setDynamicFilterMode(false);
      }
    }

    // Close the dropdown after applying
    onClose();
  };

  const isImportOrGroupByEditMode = editModes.import || editModes.groupBy;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    triggerCenter: 0,
    centerHorizontally: false,
    showArrow: true,
  });

  // Calculate position and handle click outside/Escape
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const triggerCenter = rect.left + rect.width / 2;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isMobile = viewportWidth < 1024; // lg breakpoint
        const isMediumLarge = viewportWidth >= 1024 && viewportWidth <= 1650;

        // Offset the dropdown a bit lower (40px) and keep it within the viewport
        const desiredTop = rect.bottom + 8;
        const clampedTop = Math.min(
          Math.max(desiredTop, 40),
          Math.max(viewportHeight - 520, 16) // 520 ~ dropdown height + padding
        );

        // 1024–1650px: center dropdown horizontally; otherwise mobile = left edge, large = trigger center
        const clampedLeft = isMediumLarge
          ? viewportWidth / 2
          : isMobile
            ? 16
            : Math.min(Math.max(triggerCenter, 16), viewportWidth - 16);

        setPosition({
          top: clampedTop,
          left: clampedLeft,
          triggerCenter: isMediumLarge ? triggerCenter : clampedLeft,
          centerHorizontally: isMediumLarge,
          showArrow: viewportWidth <= 1650,
        });
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (dropdownRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      // Don't close when clicking inside the custom filter "+N more" value popover (portaled to body)
      if (target.closest?.('[data-custom-filter-value-popover]')) return;
      if (target.closest?.('[data-save-filter-panel]')) return;
      if (target.closest?.('[data-saved-filters-picker]')) return;
      // Don't close when clicking the "clear all selected agents" X (should only clear the field, not close popover)
      if (target.closest?.('[data-custom-filter-clear-indicator]')) return;
      // Save filter / other modals use react-modal under .dialog-portal (outside dropdownRef) — ignore those clicks
      if (target.closest?.('.dialog-portal') || target.closest?.('.ReactModal__Overlay')) return;
      onClose();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    updatePosition();
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Ticker/Arrow: only show up to 1650px viewport */}
      {position.showArrow && (
        <div
          className="fixed z-50"
          style={{
            top: `${position.top - 6}px`,
            left: `${position.triggerCenter}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="h-0 w-0 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-b-white border-l-transparent" />
          <div className="-mt-[6px] h-0 w-0 border-r-[7px] border-b-[7px] border-l-[7px] border-r-transparent border-b-gray-200 border-l-transparent" />
        </div>
      )}

      {/* Dropdown */}
      <div
        ref={dropdownRef}
        className={`fixed z-50 flex w-[calc(100vw-32px)] flex-col overflow-hidden rounded-lg bg-white shadow-lg lg:w-[650px] ${position.centerHorizontally ? '' : 'lg:translate-x-[-96%]'}`}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          maxHeight: isImportOrGroupByEditMode ? '550px' : '500px',
          ...(position.centerHorizontally && { transform: 'translateX(-50%)' }),
        }}
      >
        {/* Header with close button */}
        {/* <div className="flex items-center justify-between border-b px-3 py-2">
          <h3 className="text-sm font-semibold text-gray-700">Filters &amp; Grouping</h3>
          <button
            onClick={onClose}
            className="flex items-center rounded-md border border-gray-200 px-2 py-1 text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
            type="button"
            aria-label="Close filters"
          >
            <ApolloIcon name="cross" className="text-sm" />
          </button>
        </div> */}

        {/* Dynamic layout - 3 columns normally, full width when CustomFilterOption is open */}
        <div
          className={`grid overflow-y-auto ${
            editModes.dynamic
              ? 'grid-cols-1'
              : 'grid-cols-1 divide-y divide-gray-200 lg:grid-cols-[1fr_1fr] lg:divide-x lg:divide-y-0'
          }`}
        >
          {/* Filters Column (Left) */}
          <div
            className={`flex flex-col ${
              isImportOrGroupByEditMode
                ? 'h-auto lg:h-[500px] lg:max-h-[500px]'
                : 'h-auto lg:h-[350px] lg:max-h-[350px]'
            }`}
          >
            {/* Column Header - Hide when CustomFilterOption is open */}
            {!editModes.dynamic && (
              <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
                <div className="flex items-center gap-2">
                  <ApolloIcon name="funnel-chart" className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Filters</span>
                </div>
                {/* {getEditIconButton('import')} */}
              </div>
            )}

            {/* Column Content */}
            <div
              className={`flex-1 lg:overflow-y-auto ${editModes.import ? 'px-0 py-0' : 'px-1 py-2'}`}
            >
              {/* Import Filters Section - Hide when CustomFilterOption is open */}
              {!editModes.dynamic && !isAgent && !shouldHideImportTab && (
                <FilterByImport
                  selectedState={effectiveFilterData}
                  setSelectedState={effectiveSetFilterData}
                  isEditMode={editModes.import}
                  onExitEditMode={() => setEditModes((prev) => ({ ...prev, import: false }))}
                />
              )}

              {/* Custom Filters Section */}
              {!hideDynamicTab && (
                <>
                  {!editModes.dynamic && (
                    <div
                      className={`space-y-0 ${editModes.import ? '' : 'border-t border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <Tooltip
                          title={FILTERS_PANEL_ADD_CUSTOM_FILTER_TOOLTIP}
                          placement="top"
                          wrapperClass="inline-flex min-w-0 flex-1"
                          className={TOOLTIP_POPOVER_CLASS}
                        >
                          <button
                            type="button"
                            onClick={() => toggleEditMode('dynamic')}
                            className="w-full flex-1 px-2 py-2 text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            Add Custom Filter
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                  {editModes.dynamic && (
                    <div className="px-2 py-2">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-700">Custom Filter</h3>
                        <Tooltip
                          title={CUSTOM_FILTER_BACK_TOOLTIP}
                          placement="left"
                          wrapperClass="inline-flex shrink-0"
                          className={TOOLTIP_POPOVER_CLASS}
                        >
                          <button
                            type="button"
                            onClick={() => toggleEditMode('dynamic')}
                            className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <ApolloIcon name="arrow-left" className="text-sm" />
                          </button>
                        </Tooltip>
                      </div>
                      <CustomFilterOption
                        entityType={
                          metadataEntityType as
                            | 'Lead'
                            | 'Offer'
                            | 'User'
                            | 'Team'
                            | 'Opening'
                            | 'Bank'
                            | 'CashflowEntry'
                            | 'CashflowTransaction'
                            | 'Reclamation'
                        }
                        selectedGroupByArray={effectiveSelectedGroupByArray}
                        onApply={handleCustomFilterApply}
                        tableId={tableId}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Group By Column - Hide when CustomFilterOption is open */}
          {!editModes.dynamic && (
            <div
              className={`flex flex-col ${
                isImportOrGroupByEditMode
                  ? 'h-auto lg:h-[500px] lg:max-h-[500px]'
                  : 'h-auto lg:h-[350px] lg:max-h-[350px]'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-start justify-between gap-2 border-b border-gray-200 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2 pt-0.5">
                  <ApolloIcon name="layer-group" className="shrink-0 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Group By</span>
                </div>
                {!editModes.groupBy && (
                  <GroupBySavedPresetsToolbar
                    pageKey={entityTypeToFilterPage(String(metadataEntityType))}
                    selectedGroupBy={effectiveSelectedGroupByArray ?? []}
                    onApplyGroupBy={(gb) => effectiveOnGroupByArrayChange?.(gb)}
                  />
                )}
              </div>

              {/* Column Content */}
              <div
                className={`flex-1 lg:overflow-y-auto ${editModes.groupBy ? 'px-0 py-0' : 'px-3 py-2'}`}
              >
                <Suspense fallback={<div>Loading...</div>}>
                  <GroupByOptions
                    entityType={metadataEntityType}
                    hideProjectOption={hideProjectOption}
                    isEditMode={editModes.groupBy}
                    onExitEditMode={() => setEditModes((prev) => ({ ...prev, groupBy: false }))}
                    selectedGroupByArray={effectiveSelectedGroupByArray}
                    onGroupByArrayChange={effectiveOnGroupByArrayChange}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {/* Favorites Column - Hide when CustomFilterOption is open */}
          {/* {!editModes.dynamic && (
            <div
              className={`flex flex-col ${
                isImportOrGroupByEditMode
                  ? 'h-auto lg:h-[500px] lg:max-h-[500px]'
                  : 'h-auto lg:h-[350px] lg:max-h-[350px]'
              }`}
            >
        
              <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
                <ApolloIcon name="bookmark-filled" className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Favorites</span>
              </div>

    
              <div className="flex-1 px-3 py-2 lg:overflow-y-auto">
                <SavedFilters
                  onApplySavedFilter={handleApplySavedFilter}
                  currentGroupingFields={effectiveSelectedGroupByArray}
                  currentFilterData={effectiveFilterData}
                  currentPagePath={pathname}
                />
              </div>
            </div>
          )} */}
        </div>
      </div>
    </>,
    document.body
  );
};

export default FiltersDropdown;
