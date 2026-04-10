import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { DEFAULT_PAGE_LIMIT } from '@/constants/pagination.constant';
import { useMetadataOptions } from '@/services/hooks/useLeads';
import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import { usePathname } from 'next/navigation';
import { GROUP_BY_LABELS } from '../FilterTags/FilterTags';

export interface SavedFilter {
  id: string;
  name: string;
  type:
    | 'grouping'
    | 'filterByImport'
    | 'dynamic-filter'
    | 'both'
    | 'grouping-filterByImport'
    | 'grouping-dynamic-filter';
  groupingFields?: string[];
  pagePath?: string; // NEW: Store the page pathname where this filter was saved
  // FilterByImport: GET API with duplicate query parameter
  filterByImport?: {
    duplicate: number; // 0=New, 1=10 Week duplicate, 2=Duplicate
    apiEndpoint: string; // '/leads'
    queryParams?: {
      page?: number;
      limit?: number;
      [key: string]: any;
    };
  };
  // DynamicFilters: POST API
  dynamicFilters?: {
    // DynamicFilters localStorage data (custom rules only)
    localStorageData?: any[];
    // DynamicFilters sessionStorage data (complete filter body for POST API)
    sessionStorageData?: {
      filters: any[];
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
    };
  };
  apiParams?: Record<string, unknown>;
  createdAt: number;
}

interface SavedFiltersProps {
  onApplySavedFilter: (savedFilter: SavedFilter) => void;
  currentGroupingFields?: string[];
  currentFilterData?: number | undefined;
  buildApiFilters?: () => any[];
  currentPagePath?: string; // NEW: Current page pathname to filter saved filters by page
}

// ========== CONSTANTS ==========
const STORAGE_KEYS = {
  savedFilters: 'saved-filters-grouping',
  dynamicFilters: 'dynamicFilters',
  dynamicFiltersBody: 'dynamic-filters-body',
} as const;

const FILTER_IMPORT_LABELS: Record<number, string> = {
  0: 'New',
  1: '10 Week duplicate',
  2: 'Duplicate',
};

const DEFAULT_API_CONFIG = {
  endpoint: '/leads',
  page: 1,
  limit: DEFAULT_PAGE_LIMIT,
} as const;

const DEFAULT_FILTER_NAME = 'No Filter';

// ========== HELPER FUNCTIONS ==========
const normalizePagePath = (path: string | undefined): string => {
  if (!path) return '';
  // Remove query parameters and hash
  const cleanPath = path.split('?')[0].split('#')[0];
  // Normalize trailing slashes
  return cleanPath.endsWith('/') && cleanPath !== '/' ? cleanPath.slice(0, -1) : cleanPath;
};

const getFilterByImportLabel = (value: number | undefined): string => {
  if (value === undefined) return '';
  return FILTER_IMPORT_LABELS[value] || '';
};

const getGroupLabel = (key: string, groupOptionsData?: any[]): string => {
  // groupOptionsData is now metadataOptions.groupOptions array with { field, label, type, ref }
  // Try to get label from API data first
  if (groupOptionsData && groupOptionsData.length > 0) {
    const option = groupOptionsData.find((opt: any) => opt.field === key);
    if (option?.label) return option.label;
  }
  // Fallback to hardcoded labels
  return GROUP_BY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
};

const generateDefaultName = (
  fields: string[],
  filterData?: number | undefined,
  getGroupLabelFn?: (key: string) => string
): string => {
  const parts: string[] = [];

  // Add FilterByImport label if present
  if (filterData !== undefined) {
    const filterLabel = getFilterByImportLabel(filterData);
    if (filterLabel) {
      parts.push(filterLabel);
    }
  }

  // Add grouping fields
  if (fields.length > 0 && getGroupLabelFn) {
    parts.push(...fields.map((field) => getGroupLabelFn(field)));
  }

  // Return combined name or default
  if (parts.length === 0) return DEFAULT_FILTER_NAME;
  return parts.join(' > ');
};

// ========== UTILITY FUNCTIONS ==========
const loadSavedFilters = (normalizedPagePath: string): SavedFilter[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.savedFilters);
    if (stored) {
      const parsed = JSON.parse(stored);
      const allFilters = Array.isArray(parsed) ? parsed : [];
      return filterSavedFiltersByPage(allFilters, normalizedPagePath);
    }
  } catch {
    // Silent fail
  }
  return [];
};

const filterSavedFiltersByPage = (
  allFilters: SavedFilter[],
  normalizedPagePath: string
): SavedFilter[] => {
  if (normalizedPagePath) {
    return allFilters.filter((filter: SavedFilter) => {
      const filterPagePath = normalizePagePath(filter.pagePath);
      return filterPagePath === normalizedPagePath;
    });
  } else {
    // Backward compatibility: show filters without pagePath
    return allFilters.filter((filter: SavedFilter) => !filter.pagePath);
  }
};

const saveFilterToStorage = (filter: SavedFilter, normalizedPagePath: string): SavedFilter[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.savedFilters);
    const allFilters = stored ? JSON.parse(stored) : [];
    const updated = Array.isArray(allFilters) ? [...allFilters, filter] : [filter];
    localStorage.setItem(STORAGE_KEYS.savedFilters, JSON.stringify(updated));
    return filterSavedFiltersByPage(updated, normalizedPagePath);
  } catch {
    // Silent fail
  }
  return [];
};

const deleteFilterFromStorage = (id: string, normalizedPagePath: string): SavedFilter[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.savedFilters);
    const allFilters = stored ? JSON.parse(stored) : [];
    const updated = Array.isArray(allFilters)
      ? allFilters.filter((f: SavedFilter) => f.id !== id)
      : [];
    localStorage.setItem(STORAGE_KEYS.savedFilters, JSON.stringify(updated));
    return filterSavedFiltersByPage(updated, normalizedPagePath);
  } catch {
    // Silent fail
  }
  return [];
};

const updateFilterInStorage = (
  id: string,
  updates: Partial<SavedFilter>,
  normalizedPagePath: string
): SavedFilter[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.savedFilters);
    const allFilters = stored ? JSON.parse(stored) : [];
    const updated = allFilters.map((f: SavedFilter) => (f.id === id ? { ...f, ...updates } : f));
    localStorage.setItem(STORAGE_KEYS.savedFilters, JSON.stringify(updated));
    return filterSavedFiltersByPage(updated, normalizedPagePath);
  } catch {
    // Silent fail
  }
  return [];
};

const buildFilterByImportData = (duplicate: number | undefined): SavedFilter['filterByImport'] => {
  if (duplicate === undefined) return undefined;
  return {
    duplicate,
    apiEndpoint: DEFAULT_API_CONFIG.endpoint,
    queryParams: {
      page: DEFAULT_API_CONFIG.page,
      limit: DEFAULT_API_CONFIG.limit,
      duplicate,
    },
  };
};

const buildDynamicFiltersData = (isDynamicFilterMode: boolean): SavedFilter['dynamicFilters'] => {
  if (!isDynamicFilterMode || typeof window === 'undefined') return undefined;
  try {
    const dynamicFiltersLocalStorage = localStorage.getItem(STORAGE_KEYS.dynamicFilters);
    const dynamicFiltersLocalStorageData = dynamicFiltersLocalStorage
      ? JSON.parse(dynamicFiltersLocalStorage)
      : null;

    const dynamicFiltersSessionStorage = sessionStorage.getItem(STORAGE_KEYS.dynamicFiltersBody);
    const dynamicFiltersSessionStorageData = dynamicFiltersSessionStorage
      ? JSON.parse(dynamicFiltersSessionStorage)
      : null;

    if (dynamicFiltersLocalStorageData || dynamicFiltersSessionStorageData) {
      return {
        localStorageData: dynamicFiltersLocalStorageData,
        sessionStorageData: dynamicFiltersSessionStorageData,
      };
    }
  } catch {
    // Silent fail
  }
  return undefined;
};

const determineFilterType = (
  hasGrouping: boolean,
  hasFilterByImport: boolean,
  hasDynamicFilters: boolean
): SavedFilter['type'] => {
  if (hasGrouping && hasFilterByImport && hasDynamicFilters) {
    return 'both';
  } else if (hasGrouping && hasFilterByImport && !hasDynamicFilters) {
    return 'grouping-filterByImport';
  } else if (hasGrouping && hasDynamicFilters && !hasFilterByImport) {
    return 'grouping-dynamic-filter';
  } else if (hasFilterByImport && hasDynamicFilters && !hasGrouping) {
    return 'both';
  } else if (hasFilterByImport && !hasDynamicFilters) {
    return 'filterByImport';
  } else if (hasDynamicFilters && !hasFilterByImport) {
    return 'dynamic-filter';
  }
  return 'grouping';
};

const buildApiFiltersUtil = (
  buildApiFiltersFn?: () => any[],
  currentFilterData?: number
): any[] => {
  if (buildApiFiltersFn) {
    return buildApiFiltersFn();
  }

  // Fallback: build basic filters
  const filters: any[] = [];
  if (currentFilterData !== undefined) {
    filters.push({
      field: 'duplicate_status',
      operator: 'equals',
      value: currentFilterData,
    });
  }
  return filters;
};

const compareFilters = (
  filter: SavedFilter,
  currentGroupingFields: string[],
  currentFilterByImportData?: SavedFilter['filterByImport'],
  currentDynamicFiltersData?: SavedFilter['dynamicFilters']
): boolean => {
  // Compare grouping
  const groupingMatch =
    JSON.stringify(filter.groupingFields?.sort() || []) ===
    JSON.stringify(currentGroupingFields.sort());

  // Compare FilterByImport - both must be undefined or both must match
  const filterFilterByImport = filter.filterByImport;
  const filterByImportBothUndefined = !filterFilterByImport && !currentFilterByImportData;
  const filterByImportBothMatch = !!(
    filterFilterByImport &&
    currentFilterByImportData &&
    filterFilterByImport.duplicate === currentFilterByImportData.duplicate
  );
  const filterByImportMatch = filterByImportBothUndefined || filterByImportBothMatch;

  // Compare DynamicFilters - both must be undefined or both must match
  const filterDynamicFilters = filter.dynamicFilters;
  const dynamicFiltersBothUndefined = !filterDynamicFilters && !currentDynamicFiltersData;
  const dynamicFiltersBothMatch = !!(
    filterDynamicFilters &&
    currentDynamicFiltersData &&
    JSON.stringify(filterDynamicFilters.localStorageData) ===
      JSON.stringify(currentDynamicFiltersData.localStorageData) &&
    JSON.stringify(filterDynamicFilters.sessionStorageData?.filters) ===
      JSON.stringify(currentDynamicFiltersData.sessionStorageData?.filters)
  );
  const dynamicFiltersMatch = dynamicFiltersBothUndefined || dynamicFiltersBothMatch;

  return groupingMatch && filterByImportMatch && dynamicFiltersMatch;
};

const hasAppliedFiltersUtil = (
  currentGroupingFields: string[],
  currentFilterData?: number,
  isDynamicFilterMode?: boolean
): boolean => {
  if (currentGroupingFields.length > 0 || currentFilterData !== undefined) {
    return true;
  }

  // Check if DynamicFilters are actually applied (not just leftover data in storage)
  if (isDynamicFilterMode && typeof window !== 'undefined') {
    try {
      const dynamicFiltersLocalStorage = localStorage.getItem(STORAGE_KEYS.dynamicFilters);
      const dynamicFiltersSessionStorage = sessionStorage.getItem(STORAGE_KEYS.dynamicFiltersBody);
      if (dynamicFiltersLocalStorage || dynamicFiltersSessionStorage) {
        return true;
      }
    } catch {
      // Silent fail
    }
  }

  return false;
};

const SavedFilters: React.FC<SavedFiltersProps> = ({
  onApplySavedFilter,
  currentGroupingFields = [],
  currentFilterData,
  buildApiFilters,
  currentPagePath,
}) => {
  const normalizedCurrentPagePath = normalizePagePath(currentPagePath);
  const { isDynamicFilterMode } = useDynamicFiltersStore();
  const pathname = usePathname();

  // Get entity type from store or determine from pathname
  const entityType = useUniversalGroupingFilterStore((state) => state.entityType);
  const isCashflowPage = pathname?.includes('/dashboards/cashflow');
  
  const metadataEntityType = useMemo(() => {
    // Skip for cashflow pages - they have their own entity types
    if (isCashflowPage) {
      return null;
    }
    
    const entityTypeToUse = entityType || 'Lead';
    // If entityType is Opening (used for openings, confirmations, payments pages), use "Offer"
    if (entityTypeToUse === 'Opening') {
      return 'Offer';
    }
    // For users page
    if (pathname?.includes('/admin/users')) return 'User';
    // For project pages, Team means "project"
    if (pathname?.includes('/dashboards/projects/')) return 'Team';
    return entityTypeToUse;
  }, [entityType, pathname, isCashflowPage]);

  // Use metadataOptions.groupOptions instead of the old useGroupOptions API
  // Old API: /leads/group/options (deprecated)
  // New API: /api/metadata/options/{entityType} (replaces the old one)
  const { data: metadataOptions } = useMetadataOptions(metadataEntityType as any, {
    enabled: metadataEntityType !== null,
  });
  const groupOptionsData = metadataOptions?.groupOptions || [];

  // Get group label function with groupOptionsData
  const getGroupLabelWithData = useCallback(
    (key: string) => getGroupLabel(key, groupOptionsData),
    [groupOptionsData]
  );

  // Load saved filters from localStorage on initial mount, filtered by current page
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() =>
    loadSavedFilters(normalizedCurrentPagePath)
  );

  // Update saved filters when page path changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.savedFilters);
      if (stored) {
        const parsed = JSON.parse(stored);
        const allFilters = Array.isArray(parsed) ? parsed : [];
        setSavedFilters(filterSavedFiltersByPage(allFilters, normalizedCurrentPagePath));
      } else {
        setSavedFilters([]);
      }
    } catch {
      // Silent fail
    }
  }, [normalizedCurrentPagePath]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Compute default name based on current grouping fields and FilterByImport
  const defaultFilterName = useMemo(
    () => generateDefaultName(currentGroupingFields, currentFilterData, getGroupLabelWithData),
    [currentGroupingFields, currentFilterData, getGroupLabelWithData]
  );

  // State for new filter name
  const [newFilterName, setNewFilterName] = useState('');

  // Track previous state to update name only when it actually changes
  const prevStateRef = useRef<string>('');
  const currentStateKey = JSON.stringify({
    grouping: [...currentGroupingFields].sort(),
    filterData: currentFilterData,
  });

  // Update new filter name when grouping or FilterByImport changes
  useEffect(() => {
    const hasApplied = currentGroupingFields.length > 0 || currentFilterData !== undefined;

    if (hasApplied) {
      // Only update if state actually changed (not just a re-render)
      if (currentStateKey !== prevStateRef.current) {
        setNewFilterName(defaultFilterName);
        prevStateRef.current = currentStateKey;
      }
    } else {
      setNewFilterName('');
      prevStateRef.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStateKey, defaultFilterName]);

  // Save current filter/grouping - ONLY called when user clicks "Save Current" button
  const handleSaveCurrent = useCallback(() => {
    if (typeof window === 'undefined') return;

    const filterByImportData = buildFilterByImportData(currentFilterData);
    const dynamicFiltersData = buildDynamicFiltersData(isDynamicFilterMode);

    const hasGrouping = currentGroupingFields.length > 0;
    const hasFilterByImport = filterByImportData !== undefined;
    const hasDynamicFilters = dynamicFiltersData !== undefined;

    if (!hasGrouping && !hasFilterByImport && !hasDynamicFilters) {
      return; // Nothing to save
    }

    const nameToSave =
      newFilterName.trim() ||
      generateDefaultName(currentGroupingFields, currentFilterData, getGroupLabelWithData);
    const timestamp = new Date().getTime();
    const filterType = determineFilterType(hasGrouping, hasFilterByImport, hasDynamicFilters);

    const newFilter: SavedFilter = {
      id: timestamp.toString(),
      name: nameToSave,
      type: filterType,
      groupingFields: hasGrouping ? [...currentGroupingFields] : undefined,
      pagePath: normalizedCurrentPagePath,
      filterByImport: filterByImportData,
      dynamicFilters: dynamicFiltersData,
      apiParams: {
        filters: JSON.stringify(buildApiFiltersUtil(buildApiFilters, currentFilterData)),
        page: DEFAULT_API_CONFIG.page,
        limit: DEFAULT_API_CONFIG.limit,
        groupingFields: currentGroupingFields,
      },
      createdAt: timestamp,
    };

    const filtered = saveFilterToStorage(newFilter, normalizedCurrentPagePath);
    setSavedFilters(filtered);
    setNewFilterName(
      generateDefaultName(currentGroupingFields, currentFilterData, getGroupLabelWithData)
    );
  }, [
    currentFilterData,
    isDynamicFilterMode,
    currentGroupingFields,
    newFilterName,
    normalizedCurrentPagePath,
    buildApiFilters,
    getGroupLabelWithData,
  ]);

  // Delete saved filter
  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const filtered = deleteFilterFromStorage(id, normalizedCurrentPagePath);
      setSavedFilters(filtered);
    },
    [normalizedCurrentPagePath]
  );

  // Start editing name
  const handleStartEdit = (filter: SavedFilter, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(filter.id);
    setEditName(filter.name);
  };

  // Save edited name
  const handleSaveEdit = useCallback(
    (id: string) => {
      const trimmedName = editName.trim();

      if (typeof window === 'undefined') {
        setEditingId(null);
        setEditName('');
        return;
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEYS.savedFilters);
        const allFilters = stored ? JSON.parse(stored) : [];

        if (!trimmedName) {
          // If empty, restore default name based on grouping fields
          const filter = allFilters.find((f: SavedFilter) => f.id === id);
          if (filter) {
            const defaultName =
              filter.groupingFields && filter.groupingFields.length > 0
                ? generateDefaultName(filter.groupingFields, undefined, getGroupLabelWithData)
                : filter.name;
            const filtered = updateFilterInStorage(
              id,
              { name: defaultName },
              normalizedCurrentPagePath
            );
            setSavedFilters(filtered);
          }
        } else {
          // Save the edited name
          const filtered = updateFilterInStorage(
            id,
            { name: trimmedName },
            normalizedCurrentPagePath
          );
          setSavedFilters(filtered);
        }
      } catch {
        // Silent fail
      }

      setEditingId(null);
      setEditName('');
    },
    [editName, normalizedCurrentPagePath, getGroupLabelWithData]
  );

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  // Check if current state matches a saved filter (only checks filters for current page)
  const isCurrentStateSaved = useMemo(() => {
    if (typeof window === 'undefined') return false;

    const currentFilterByImportData = buildFilterByImportData(currentFilterData);
    const currentDynamicFiltersData = buildDynamicFiltersData(isDynamicFilterMode);

    const hasGrouping = currentGroupingFields.length > 0;
    const hasFilterByImport = currentFilterByImportData !== undefined;
    const hasDynamicFilters = currentDynamicFiltersData !== undefined;

    if (!hasGrouping && !hasFilterByImport && !hasDynamicFilters) {
      return false;
    }

    return savedFilters.some((filter) =>
      compareFilters(
        filter,
        currentGroupingFields,
        currentFilterByImportData,
        currentDynamicFiltersData
      )
    );
  }, [savedFilters, currentGroupingFields, currentFilterData, isDynamicFilterMode]);

  // Check if there are applied filters/groupings to save
  const hasAppliedFilters = useMemo(
    () => hasAppliedFiltersUtil(currentGroupingFields, currentFilterData, isDynamicFilterMode),
    [currentGroupingFields, currentFilterData, isDynamicFilterMode]
  );

  return (
    <div className="w-full">
      <div className="space-y-0">
        {/* Saved Filters List */}
        {savedFilters.length > 0 && (
          <>
            {savedFilters.map((filter) => (
              <div
                key={filter.id}
                className="group flex items-center justify-between rounded border-b border-gray-200 px-0 py-2 hover:bg-gray-50"
              >
                {editingId === filter.id ? (
                  <div className="flex w-full flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEdit(filter.id);
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          handleCancelEdit();
                        }
                      }}
                      placeholder={
                        filter.groupingFields && filter.groupingFields.length > 0
                          ? generateDefaultName(
                              filter.groupingFields,
                              undefined,
                              getGroupLabelWithData
                            )
                          : 'Enter filter name'
                      }
                      className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit(filter.id);
                      }}
                      className="p-1 text-sm text-blue-600 hover:text-blue-800"
                      title="Save"
                    >
                      <ApolloIcon name="check" className="text-sm" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEdit();
                      }}
                      className="p-1 text-sm text-gray-600 hover:text-gray-800"
                      title="Cancel"
                    >
                      <ApolloIcon name="cross" className="text-sm" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onApplySavedFilter(filter)}
                      className="flex-1 text-left text-sm text-gray-700 hover:text-gray-900"
                      title="Click to apply this filter"
                    >
                      {filter.name ||
                        (filter.groupingFields && filter.groupingFields.length > 0
                          ? generateDefaultName(
                              filter.groupingFields,
                              undefined,
                              getGroupLabelWithData
                            )
                          : 'Unnamed Filter')}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {/* <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(filter, e);
                        }}
                        className="p-1 text-gray-600 hover:text-blue-600"
                        title="Edit name"
                      >
                        <ApolloIcon name="pen" className="text-xs" />
                      </button> */}
                      <button
                        onClick={(e) => handleDelete(filter.id, e)}
                        className="p-1 text-gray-600 hover:text-red-600"
                        title="Delete"
                      >
                        <ApolloIcon name="trash" className="text-xs" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </>
        )}

        {savedFilters.length === 0 && !hasAppliedFilters && (
          <div className="px-0 py-2 text-sm text-gray-400 italic">No saved filters</div>
        )}

        {/* Save Current Section - Show at bottom when there are applied filters and they're not already saved */}
        {hasAppliedFilters && !isCurrentStateSaved && (
          <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
            {/* Editable Title Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                placeholder={defaultFilterName}
                className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              {/* <button
                onClick={() => {
                  // Reset to default name
                  setNewFilterName(defaultFilterName);
                }}
                className="p-1 text-gray-600 hover:text-gray-800"
                title="Reset to default name"
              >
                <ApolloIcon name="refresh" className="text-xs" />
              </button> */}
            </div>

            {/* Save Current Filter Button */}
            <button
              onClick={handleSaveCurrent}
              className="bg-sunbeam-2 hover:bg-sunbeam-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors"
            >
              <ApolloIcon name="bookmark-filled" className="text-sm" />
              <span>Save Current Filter</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedFilters;
