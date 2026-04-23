'use client';

import React, { useMemo, useCallback } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';
import { useFilterChainStore } from '@/stores/filterChainStore';
import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';
import {
  useUniversalGroupingFilterStore,
  DomainFilter,
} from '@/stores/universalGroupingFilterStore';
import { useMultiTableFilterStore } from '@/stores/multiTableFilterStore';
import { usePathname } from 'next/navigation';
import { useApplyDomainFilters, useMetadataOptions } from '@/services/hooks/useLeads';
import { useQueryClient } from '@tanstack/react-query';
import { useFilterAwareLeadsNavigationStore } from '@/stores/navigationStores';
import { useApiUrlStore } from '@/stores/apiUrlStore';
import { useFilterContext } from '@/contexts/FilterContext';
import { isFilterAndGroupingPage } from '@/configs/filterPages.config';
import { hasMeaningfulDomainFilters, isNeutralDomainFilter } from '@/utils/filterUtils';
import FilterTagsScrollRow from './components/FilterTagsScrollRow';

// ========== TYPE DEFINITIONS ==========
type FilterTag = {
  id: string;
  label: string;
  icon: string;
  onClear: (e?: React.MouseEvent) => void;
  section?: 'import' | 'groupBy' | 'dynamic';
  /** Full label for tooltip when visible label is truncated (e.g. Agent filter with many selected) */
  labelTooltip?: string;
};

type MetadataValue = {
  _id?: string | number;
  value?: string;
};

type MetadataFieldOption = {
  field: string;
  values?: MetadataValue[];
};

// ========== CONSTANTS ==========
// Use centralized config - see @/configs/filterPages.config.ts

const FILTER_IMPORT_LABELS: Record<number, string> = {
  0: 'New',
  1: '10 Week duplicate',
  2: 'Duplicate',
};

/** Agent filter fields (Lead: user_id, Offer/Opening: agent_id): when value is array with >2 items, show first two + "+N more" and full list in tooltip */
const AGENT_FILTER_FIELDS = ['user_id', 'agent_id'];

const OPERATOR_DISPLAY_MAP: Record<string, string> = {
  equals: '=',
  not_equals: '≠',
  contains: 'contains',
  not_contains: 'not contains',
  starts_with: 'starts with',
  ends_with: 'ends with',
  greater_than: '>',
  less_than: '<',
  greater_than_or_equal: '≥',
  less_than_or_equal: '≤',
  in: 'in',
  not_in: 'not in',
  is_null: 'is null',
  is_not_null: 'is not null',
};

const FIELD_DISPLAY_MAP: Record<string, string> = {
  email: 'Email',
  phone: 'Phone',
  first_name: 'First Name',
  last_name: 'Last Name',
  company: 'Company',
  status: 'Status',
  status_id: 'Status', // Fallback if metadata not available
  source: 'Source',
  source_id: 'Source', // Fallback if metadata not available
  stage_id: 'Stage', // Fallback if metadata not available
  created_at: 'Created Date',
  updated_at: 'Updated Date',
  project: 'Project',
  team_id: 'Project', // Fallback if metadata not available
  agent: 'Agent',
  user_id: 'Agent',
  agent_id: 'Agent',
  use_status: 'Use Status',
  country: 'Country',
  city: 'City',
  zip_code: 'Zip Code',
  address: 'Address',
  website: 'Website',
  industry: 'Industry',
  notes: 'Notes',
  duplicate_status: 'Duplicate Status',
};

export const GROUP_BY_LABELS: Record<string, string> = {
  status: 'Status',
  agent: 'Agent',
  project: 'Project',
  company: 'Company',
  source: 'Source',
  last_transfer: 'Last Transfer',
  lead_date: 'Lead Date',
  assigned_date: 'Assigned Date',
  team_id: 'Project',
  user_id: 'Agent',
  source_id: 'Source',
};

// ========== HELPER FUNCTIONS ==========
const getFilterByImportLabel = (value: number): string =>
  FILTER_IMPORT_LABELS[value] || `Duplicate Status ${value}`;

const getGroupByLabel = (field: string, groupOptionsData?: any[]): string => {
  // groupOptionsData is now metadataOptions.groupOptions array with { field, label, type, ref }
  if (groupOptionsData && groupOptionsData.length > 0) {
    const option = groupOptionsData.find((opt: any) => opt.field === field);
    if (option?.label) return option.label;
  }
  return (
    GROUP_BY_LABELS[field] || field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')
  );
};

const getOperatorDisplay = (operator: string): string => {
  return OPERATOR_DISPLAY_MAP[operator] || operator;
};

// Helper to get field label from metadata
const getFieldLabelFromMetadata = (field: string, metadataOptions?: any): string | null => {
  if (!metadataOptions?.filterOptions) return null;
  const fieldOption = metadataOptions.filterOptions.find(
    (opt: MetadataFieldOption) => opt.field === field
  );
  return fieldOption?.label || null;
};

const getFieldDisplay = (field: string, metadataOptions?: any): string => {
  // First check metadata for the label (e.g., status_id -> "Status")
  const metadataLabel = getFieldLabelFromMetadata(field, metadataOptions);
  if (metadataLabel) return metadataLabel;

  // Then check FIELD_DISPLAY_MAP
  if (FIELD_DISPLAY_MAP[field]) return FIELD_DISPLAY_MAP[field];

  // Finally, format the field name
  return field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatValue = (value: any): string => {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined) return 'null';
  return String(value);
};

const filtersMatch = (f1: any, f2: any): boolean => {
  return (
    f1.field === f2.field &&
    f1.operator === f2.operator &&
    JSON.stringify(f1.value) === JSON.stringify(f2.value)
  );
};

// Create memoized metadata lookup map
const createMetadataLookup = (metadataOptions?: any): Map<string, Map<string | number, string>> => {
  const lookup = new Map<string, Map<string | number, string>>();

  if (!metadataOptions?.filterOptions) return lookup;

  metadataOptions.filterOptions.forEach((fieldOption: MetadataFieldOption) => {
    if (!fieldOption.values || fieldOption.values.length === 0) return;

    const valueMap = new Map<string | number, string>();
    fieldOption.values.forEach((val: MetadataValue) => {
      if (val && typeof val === 'object' && '_id' in val && 'value' in val) {
        valueMap.set(String(val._id), String(val.value));
      }
    });

    if (valueMap.size > 0) {
      lookup.set(fieldOption.field, valueMap);
    }
  });

  return lookup;
};

const formatCustomFilterValue = (
  field: string,
  value: any,
  metadataLookup: Map<string, Map<string | number, string>>
): string => {
  // Special handling for duplicate_status field - show human-readable labels
  if (field === 'duplicate_status') {
    if (Array.isArray(value)) {
      return value.map((v) => FILTER_IMPORT_LABELS[Number(v)] || String(v)).join(', ');
    }
    return FILTER_IMPORT_LABELS[Number(value)] || formatValue(value);
  }

  const fieldLookup = metadataLookup.get(field);

  if (!fieldLookup) return formatValue(value);

  if (Array.isArray(value)) {
    return value.map((v) => fieldLookup.get(String(v)) || String(v)).join(', ');
  }

  return fieldLookup.get(String(value)) || formatValue(value);
};

/** For agent (and similar) filters with many values: return truncated display + full text for tooltip */
const formatCustomFilterValueWithTruncate = (
  field: string,
  value: any,
  metadataLookup: Map<string, Map<string | number, string>>,
  maxVisible = 2
): { display: string; tooltip?: string } => {
  const full = formatCustomFilterValue(field, value, metadataLookup);
  if (!AGENT_FILTER_FIELDS.includes(field) || !Array.isArray(value) || value.length <= maxVisible) {
    return { display: full };
  }
  const fieldLookup = metadataLookup.get(field);
  if (!fieldLookup) return { display: full };
  const labels = value.map((v: any) => fieldLookup.get(String(v)) || String(v));
  const firstTwo = labels.slice(0, maxVisible).join(', ');
  const restCount = labels.length - maxVisible;
  return {
    display: `${firstTwo} +${restCount} more`,
    tooltip: labels.join(', '),
  };
};

// ========== UTILITY FUNCTIONS ==========
const deduplicateFilters = (filters: any[]): any[] => {
  const seen = new Set<string>();
  const result: any[] = [];
  for (let i = filters.length - 1; i >= 0; i--) {
    const f = filters[i];
    if (!f || !f.field) continue;
    const key = `${f.field}|${f.operator}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.unshift(f);
    }
  }
  return result;
};

// ========== TAG CREATION FUNCTIONS ==========
const createImportFilterTag = (
  importFilter: any,
  onClear: (e?: React.MouseEvent) => void
): FilterTag => ({
  id: 'import-filter',
  label: getFilterByImportLabel(importFilter.value as number),
  icon: 'filter-slider',
  section: 'import',
  onClear,
});

const createGroupByTag = (
  groupBy: string[],
  groupOptionsData: any,
  onClear: (e?: React.MouseEvent) => void
): FilterTag => {
  const groupByLabel = groupBy.map((field) => getGroupByLabel(field, groupOptionsData)).join(' > ');
  return {
    id: 'groupby-combined',
    label: groupByLabel,
    icon: 'layer-group',
    section: 'groupBy',
    onClear,
  };
};

const createDynamicFilterTag = (
  filter: any,
  index: number,
  onClear: (e?: React.MouseEvent) => void
): FilterTag => {
  const fieldDisplay = getFieldDisplay(filter?.field || '');
  const operatorDisplay = getOperatorDisplay(filter?.operator || '');
  const valueDisplay = formatValue(filter?.value);
  const label = `${fieldDisplay} ${operatorDisplay} ${valueDisplay}`;

  return {
    id: `dynamic-filter-${index}`,
    label,
    icon: 'funnel-chart',
    section: 'dynamic',
    onClear,
  };
};

const createCustomFilterTag = (
  filter: DomainFilter,
  index: number,
  metadataLookup: Map<string, Map<string | number, string>>,
  onClear: (e?: React.MouseEvent) => void,
  metadataOptions?: any
): FilterTag => {
  const [field, operator, value] = filter;
  const fieldDisplay = getFieldDisplay(field || '', metadataOptions);
  const operatorDisplay = getOperatorDisplay(operator || '');
  const { display: valueDisplay, tooltip: valueTooltip } = formatCustomFilterValueWithTruncate(
    field || '',
    value,
    metadataLookup
  );
  const label = `${fieldDisplay} ${operatorDisplay} ${valueDisplay}`;
  const labelTooltip = valueTooltip ? `${fieldDisplay} ${operatorDisplay} ${valueTooltip}` : undefined;

  return {
    id: `custom-filter-${index}`,
    label,
    icon: 'funnel-chart',
    section: 'dynamic',
    onClear,
    ...(labelTooltip && { labelTooltip }),
  };
};

/**
 * FilterTags Component
 * Displays applied filters as pill-shaped tags with clear buttons
 * 
 * @param tableId - Optional table identifier for multi-table pages (e.g., 'cashflow-entries', 'cashflow-transactions')
 *                  When provided, only shows tags for that specific table
 */
interface FilterTagsProps {
  tableId?: string;
  stacked?: boolean;
}

const FilterTags: React.FC<FilterTagsProps> = ({ tableId, stacked = false }) => {
  const pathname = usePathname();

  // NOTE: FilterTags only DISPLAYS filters, it does NOT manage them
  // Filter clearing logic is handled by useFilterChainLeads.ts to avoid race conditions

  // Early return check
  const shouldShowFilters = useMemo(() => {
    if (!pathname) return false;

    // Use centralized config - excludes lead details, includes all filter/grouping pages
    return isFilterAndGroupingPage(pathname);
  }, [pathname]);

  // prevent infinite loops handle
  const importFilter = useFilterChainStore((state) => state.importFilter);
  const setDynamicFilters = useFilterChainStore((state) => state.setDynamicFilters);
  const {
    handleClearImportFilter,
    handleClearDynamicFilters,
    handleClearGroupByFilter,
    handleGroupByArrayChangeWithReset,
  } = useFilterContext();
  const { buildApiFilters } = useFilterContext();
  const openFiltersDropdown = useFilterChainStore((state) => state.openFiltersDropdown);

  const isDynamicFilterMode = useDynamicFiltersStore((state) => state.isDynamicFilterMode);
  const customFilters = useDynamicFiltersStore((state) => state.customFilters);
  const setCustomFilters = useDynamicFiltersStore((state) => state.setCustomFilters);
  const sortBy = useDynamicFiltersStore((state) => state.sortBy);
  const sortOrder = useDynamicFiltersStore((state) => state.sortOrder);

  const groupBy = useUniversalGroupingFilterStore((state) => state.groupBy);
  const userDomainFilters = useUniversalGroupingFilterStore((state) => state.userDomainFilters);
  const getCombinedDomainFilters = useUniversalGroupingFilterStore(
    (state) => state.getCombinedDomainFilters
  );
  const clearUserDomainFilters = useUniversalGroupingFilterStore(
    (state) => state.clearUserDomainFilters
  );
  const entityType = useUniversalGroupingFilterStore((state) => state.entityType);

  // Multi-table store for pages with multiple independent tables (e.g., cashflow)
  const multiTableStore = useMultiTableFilterStore((state) => state.tables);
  const isCashflowPage = pathname?.includes('/dashboards/cashflow');

  const { setApiUrl } = useApiUrlStore();
  const { setFilterState, clearFilterState } = useFilterAwareLeadsNavigationStore();
  const queryClient = useQueryClient();
  const applyDynamicFilters = useApplyDomainFilters();

  // Lazy load metadata only when custom filters exist
  const shouldLoadMetadata = !isDynamicFilterMode && hasMeaningfulDomainFilters(userDomainFilters);

  // For UnifiedDashboard pages (Opening entity type), always use "Offer" for metadata options
  // This ensures all UnifiedDashboard pages call /api/metadata/options/Offer
  const metadataEntityType = useMemo(() => {
    // Skip metadata for cashflow pages - they have their own entity types handled separately
    if (isCashflowPage) {
      return null;
    }
    
    const entityTypeToUse = entityType || 'Lead';
    // If entityType is Opening (used for openings, confirmations, payments pages), use "Offer"
    if (entityTypeToUse === 'Opening') {
      return 'Offer';
    }
    // For banks page
    if (pathname?.includes('/admin/banks')) return 'Bank';
    // For users page
    if (pathname?.includes('/admin/users')) return 'User';
    // For project pages, Team means "project"
    if (pathname?.includes('/dashboards/projects')) return 'Team';
    return entityTypeToUse;
  }, [entityType, pathname, isCashflowPage]);

  // Only fetch metadata when we have a valid entity type (not for cashflow pages)
  const { data: metadataOptions } = useMetadataOptions(metadataEntityType as any, {
    enabled: metadataEntityType !== null,
  });

  // Use metadataOptions.groupOptions instead of the old useGroupOptions API
  // Old API: /leads/group/options (deprecated)
  // New API: /api/metadata/options/{entityType} (replaces the old one)
  const groupOptionsData = metadataOptions?.groupOptions || [];

  // Create memoized metadata lookup (only when needed)
  const metadataLookup = useMemo(
    () => (shouldLoadMetadata ? createMetadataLookup(metadataOptions) : new Map()),
    [shouldLoadMetadata, metadataOptions]
  );

  // Extract complex clear handlers
  const handleDynamicFilterClear = useCallback(
    async (
      filterToRemove: any,
      customFilters: any[],
      buildApiFilters: (() => any[]) | null | undefined,
      applyDynamicFilters: any,
      sortBy?: string | null,
      sortOrder?: 'asc' | 'desc' | ''
    ) => {
      // Remove from customFilters
      const updatedCustomFilters = customFilters.filter(
        (f: any) => !filtersMatch(f, filterToRemove)
      );

      // Remove from dynamicFilters in filterChainStore
      const filterChainStore = useFilterChainStore.getState();
      const currentDynamicFilters = filterChainStore.dynamicFilters || [];
      const updatedDynamicFilters = currentDynamicFilters.filter(
        (f: any) => !filtersMatch(f, filterToRemove)
      );

      // Update both stores
      setCustomFilters(updatedCustomFilters);
      setDynamicFilters(updatedDynamicFilters);

      // Update localStorage
      if (typeof window !== 'undefined') {
        try {
          if (updatedCustomFilters.length > 0) {
            localStorage.setItem('dynamicFilters', JSON.stringify(updatedCustomFilters));
          } else {
            localStorage.removeItem('dynamicFilters');
          }
        } catch {
          // Silent fail
        }
      }

      // If no more custom filters, clear all dynamic filters
      if (updatedCustomFilters.length === 0) {
        if (handleClearDynamicFilters) {
          handleClearDynamicFilters();
        } else {
          const { clearFilterByType } = useFilterChainStore.getState();
          clearFilterByType('dynamic');
        }
        return;
      }

      // Rebuild filters with defaults + remaining custom filters
      const { setDynamicFilters: setStoreDynamicFilters } = useFilterChainStore.getState();
      const previousDynamicFilters = [...updatedDynamicFilters];

      let defaultFilters: any[] = [];
      let deduplicatedFilters: any[] = [];

      try {
        setStoreDynamicFilters([]);
        const currentStoreState = useFilterChainStore.getState();
        const currentImportFilter = currentStoreState.importFilter;
        const currentStatusFilter = currentStoreState.statusFilter;

        defaultFilters = buildApiFilters ? buildApiFilters() : [];

        if (currentImportFilter && !defaultFilters.some((f) => f.field === 'duplicate_status')) {
          defaultFilters.push(currentImportFilter);
        }

        if (currentStatusFilter && !defaultFilters.some((f) => f.field === 'status')) {
          defaultFilters.push(currentStatusFilter);
        }

        const finalFilterBody: any[] = [...defaultFilters, ...updatedCustomFilters];
        deduplicatedFilters = deduplicateFilters(finalFilterBody);
        deduplicatedFilters = deduplicatedFilters.filter(
          (f: any) => !filtersMatch(f, filterToRemove)
        );
      } finally {
        setStoreDynamicFilters(previousDynamicFilters);
      }

      // Update filter chain store
      const filterBodyAsFilterRules = deduplicatedFilters.map((f: any) => ({
        field: f.field,
        operator: f.operator,
        value: f.value,
      }));
      setDynamicFilters(filterBodyAsFilterRules);

      // Call API with updated filters
      try {
        const result = await applyDynamicFilters.mutateAsync({
          filters: deduplicatedFilters,
          page: 1,
          limit: 50,
          sortBy: sortBy || undefined,
          sortOrder: sortOrder || undefined,
        });

        const {
          setDynamicFilterMode,
          setDynamicFilterResults,
          setDynamicFilterQuery,
          setTotal,
          setPage,
          setPageSize,
          setHasNextPage,
          setHasPrevPage,
          setFilterSource,
        } = useDynamicFiltersStore.getState();

        setDynamicFilterMode(true);
        setDynamicFilterResults(result.data || []);
        setDynamicFilterQuery(deduplicatedFilters);

        const dynamicFilterData = result as any;
        const pagination = dynamicFilterData.meta?.pagination;
        setTotal(pagination?.total || dynamicFilterData.totalFiltered || 0);
        setPage(pagination?.page || 1);
        setPageSize(pagination?.limit || pagination?.currentPageSize || 50);
        setHasNextPage(pagination?.hasNextPage || false);
        setHasPrevPage(pagination?.hasPrevPage || false);
        setFilterSource('custom');
      } catch {
        // Silent fail
      }
    },
    [
      setCustomFilters,
      setDynamicFilters,
      handleClearDynamicFilters,
      buildApiFilters,
      applyDynamicFilters,
    ]
  );

  const handleCustomFilterClear = useCallback(async () => {
    clearUserDomainFilters();
    const combinedFilters = getCombinedDomainFilters();

    try {
      const { userDomainFilters: currentUserFilters } = useUniversalGroupingFilterStore.getState();
      const isClearingFilters = currentUserFilters.length === 0;
      const { groupBy: storeGroupBy } = useFilterChainStore.getState();
      const hasGrouping = storeGroupBy && storeGroupBy.length > 0;
      const groupByFields = storeGroupBy || [];

      if (isClearingFilters && !hasGrouping) {
        clearFilterState();
        setApiUrl(null);
        setFilterState(null);
      } else {
        const endpoint = (entityType || 'Lead').toLowerCase() + 's';
        const queryParams = new URLSearchParams();
        queryParams.set('domain', JSON.stringify(combinedFilters));
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

      const { invalidateUniversalGroupingQueries } = await import('@/utils/queryInvalidation');
      invalidateUniversalGroupingQueries(queryClient);
    } catch {
      const { invalidateUniversalGroupingQueries } = await import('@/utils/queryInvalidation');
      invalidateUniversalGroupingQueries(queryClient);
    }
  }, [
    clearUserDomainFilters,
    getCombinedDomainFilters,
    entityType,
    clearFilterState,
    setApiUrl,
    setFilterState,
    queryClient,
  ]);

  // Handler to remove a single custom filter by index
  const handleSingleCustomFilterClear = useCallback(
    async (filterIndex: number) => {
      const { userDomainFilters: currentFilters, setUserDomainFilters } =
        useUniversalGroupingFilterStore.getState();

      // Remove only the specific filter by index
      const updatedFilters = currentFilters.filter((_, index) => index !== filterIndex);

      // Update the store with remaining filters
      setUserDomainFilters(updatedFilters);

      // Get combined filters (default + remaining user filters)
      const combinedFilters = getCombinedDomainFilters();

      try {
        const { groupBy: storeGroupBy } = useFilterChainStore.getState();
        const hasGrouping = storeGroupBy && storeGroupBy.length > 0;
        const groupByFields = storeGroupBy || [];

        // If no filters remain and no grouping, clear filter state
        if (updatedFilters.length === 0 && !hasGrouping) {
          clearFilterState();
          setApiUrl(null);
          setFilterState(null);
        } else {
          // Build API URL with remaining filters
          const endpoint = (entityType || 'Lead').toLowerCase() + 's';
          const queryParams = new URLSearchParams();
          queryParams.set('domain', JSON.stringify(combinedFilters));
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

        // Invalidate queries to refetch data
        const { invalidateUniversalGroupingQueries } = await import('@/utils/queryInvalidation');
        invalidateUniversalGroupingQueries(queryClient);
      } catch {
        const { invalidateUniversalGroupingQueries } = await import('@/utils/queryInvalidation');
        invalidateUniversalGroupingQueries(queryClient);
      }
    },
    [getCombinedDomainFilters, entityType, clearFilterState, setApiUrl, setFilterState, queryClient]
  );

  // Consolidate event handlers
  // For table-specific tags (tableId provided), don't open dropdown
  const handleTagClick = useCallback(
    (section?: 'import' | 'groupBy' | 'dynamic') => {
      // Skip opening dropdown for table-specific tags (multi-table mode)
      if (tableId) {
        return;
      }
      
      if (section) {
        openFiltersDropdown(section);
      } else {
        openFiltersDropdown();
      }
    },
    [openFiltersDropdown, tableId]
  );

  const handleTagClear = useCallback(
    (e: React.MouseEvent, onClear: (e?: React.MouseEvent) => void) => {
      e.stopPropagation();
      onClear(e);
    },
    []
  );
  const optionsFields = useMemo(
    () => [...(metadataOptions?.groupOptions || []), ...(metadataOptions?.filterOptions || [])],
    [metadataOptions]
  );
  // Memoize tag generation
  const tags = useMemo(() => {
    const result: FilterTag[] = [];

    // For cashflow page (multi-table), show tags based on tableId
    if (isCashflowPage) {
      // If tableId is provided, only show tags for that specific table
      if (tableId) {
        const table = multiTableStore[tableId];
        if (table?.groupBy && table.groupBy.length > 0) {
          const onClear = async (e?: React.MouseEvent) => {
            if (e) e.stopPropagation();
            const { clearGrouping } = useMultiTableFilterStore.getState();
            clearGrouping(tableId);
          };
          // Don't show table prefix when rendering per-table (it's obvious from context)
          const label = table.groupBy.map((field) => getGroupByLabel(field, optionsFields)).join(' > ');
          result.push({
            id: `groupby-${tableId}`,
            label,
            icon: 'layer-group',
            section: 'groupBy',
            onClear,
          });
        }
      } else {
        // No tableId provided - show all tables (for backward compatibility if FilterTags is rendered globally)
        // Check cashflow-entries table
        const entriesTable = multiTableStore['cashflow-entries'];
        if (entriesTable?.groupBy && entriesTable.groupBy.length > 0) {
          const onClear = async (e?: React.MouseEvent) => {
            if (e) e.stopPropagation();
            const { clearGrouping } = useMultiTableFilterStore.getState();
            clearGrouping('cashflow-entries');
          };
          const entriesLabel = `Entries: ${entriesTable.groupBy.map((field) => getGroupByLabel(field, optionsFields)).join(' > ')}`;
          result.push({
            id: 'groupby-cashflow-entries',
            label: entriesLabel,
            icon: 'layer-group',
            section: 'groupBy',
            onClear,
          });
        }

        // Check cashflow-transactions table
        const transactionsTable = multiTableStore['cashflow-transactions'];
        if (transactionsTable?.groupBy && transactionsTable.groupBy.length > 0) {
          const onClear = async (e?: React.MouseEvent) => {
            if (e) e.stopPropagation();
            const { clearGrouping } = useMultiTableFilterStore.getState();
            clearGrouping('cashflow-transactions');
          };
          const transactionsLabel = `Transactions: ${transactionsTable.groupBy.map((field) => getGroupByLabel(field, optionsFields)).join(' > ')}`;
          result.push({
            id: 'groupby-cashflow-transactions',
            label: transactionsLabel,
            icon: 'layer-group',
            section: 'groupBy',
            onClear,
          });
        }
      }

      return result; // Return early for cashflow page (skip global filters)
    }

    // For non-cashflow pages, use global store as before
    // Add FilterByImport tag
    if (importFilter && importFilter.value !== undefined) {
      const onClear = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (handleClearImportFilter) {
          handleClearImportFilter();
        } else {
          const { clearFilterByType } = useFilterChainStore.getState();
          clearFilterByType('import');
        }
      };
      result.push(createImportFilterTag(importFilter, onClear));
    }

    // Add DynamicFilters tags
    if (isDynamicFilterMode && customFilters && customFilters.length > 0) {
      customFilters.forEach((filter: any, index: number) => {
        const onClear = async (e?: React.MouseEvent) => {
          if (e) e.stopPropagation();
          await handleDynamicFilterClear(
            filter,
            customFilters,
            buildApiFilters ?? null,
            applyDynamicFilters,
            sortBy,
            sortOrder
          );
        };
        result.push(createDynamicFilterTag(filter, index, onClear));
      });
    }

    // Add Custom Filter tags
    if (!isDynamicFilterMode && userDomainFilters && userDomainFilters.length > 0) {
      userDomainFilters.forEach((filter: DomainFilter, index: number) => {
        if (isNeutralDomainFilter(filter)) return;

        const onClear = async (e?: React.MouseEvent) => {
          if (e) e.stopPropagation();
          await handleSingleCustomFilterClear(index); // Pass the index to remove only this filter
        };
        result.push(createCustomFilterTag(filter, index, metadataLookup, onClear, metadataOptions));
      });
    }

    // Add GroupBy tag
    if (groupBy && groupBy.length > 0) {
      const onClear = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        // Always clear both stores first to ensure consistency
        const { setGroupBy: setUniversalGroupBy } = useUniversalGroupingFilterStore.getState();
        const { setGroupBy: setFilterChainGroupBy, clearFilterByType } =
          useFilterChainStore.getState();

        // Clear both stores immediately
        setUniversalGroupBy([]);
        setFilterChainGroupBy([]);
        clearFilterByType('groupBy');

        // Then try to use handlers if available (they will sync properly)
        if (handleGroupByArrayChangeWithReset) {
          handleGroupByArrayChangeWithReset([]);
        } else if (handleClearGroupByFilter) {
          handleClearGroupByFilter();
        }

        // Always invalidate queries to refresh the UI
        try {
          const { invalidateUniversalGroupingQueries } = await import('@/utils/queryInvalidation');
          invalidateUniversalGroupingQueries(queryClient);
        } catch {
          // Silent fail
        }
      };
      result.push(createGroupByTag(groupBy, optionsFields, onClear));
    }

    return result;
  }, [
    importFilter,
    handleClearImportFilter,
    isDynamicFilterMode,
    customFilters,
    buildApiFilters,
    sortBy,
    sortOrder,
    userDomainFilters,
    groupBy,
    groupOptionsData,
    metadataLookup,
    metadataOptions,
    handleDynamicFilterClear,
    handleCustomFilterClear,
    handleSingleCustomFilterClear,
    applyDynamicFilters,
    handleGroupByArrayChangeWithReset,
    handleClearGroupByFilter,
    isCashflowPage,
    multiTableStore,
    optionsFields,
    queryClient,
    tableId, // Add tableId dependency
  ]);

  if (!shouldShowFilters || tags.length === 0) {
    return null;
  }

  return (
    <FilterTagsScrollRow itemCount={tags.length} stacked={stacked}>
        {tags.map((tag) => (
          <div
            key={tag.id}
            className={`flex h-6 items-center overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm transition-colors dark:bg-[var(--dm-bg-elevated)] dark:border-[var(--dm-border)] ${
              stacked ? 'w-full' : 'shrink-0'
            } ${
              tableId ? '' : 'cursor-pointer hover:border-gray-300'
            }`}
            onClick={() => handleTagClick(tag.section)}
          >
            <div className="flex h-full min-w-6 items-center justify-center rounded-l-full bg-gray-900 px-1.5 py-0.5">
              <ApolloIcon name={tag.icon as any} className="text-xs text-white" />
            </div>
            <div className="flex items-center gap-1 rounded-r-full bg-white px-2 py-0.5 min-w-0">
              {tag.labelTooltip ? (
                <Tooltip title={tag.labelTooltip} placement="top" className="!bg-white border border-gray-200 shadow-md" wrapperClass="min-w-0 truncate max-w-[200px] sm:max-w-[280px]">
                  <span className="block truncate text-xs font-medium text-gray-900">{tag.label}</span>
                </Tooltip>
              ) : (
                <span className="text-xs font-medium whitespace-nowrap text-gray-900">{tag.label}</span>
              )}
              <button
                onClick={(e) => handleTagClear(e, tag.onClear)}
                className="ml-0.5 flex items-center justify-center text-gray-600 transition-colors hover:text-gray-900"
                title={`Clear ${tag.label}`}
                type="button"
              >
                <ApolloIcon name="cross" className="text-[10px]" />
              </button>
            </div>
          </div>
        ))}
    </FilterTagsScrollRow>
  );
};

export default FilterTags;
