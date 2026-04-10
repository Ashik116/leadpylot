'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface FilterItem {
  key: string;
  label: string;
  value: string | number;
  isVisible: boolean;
}

interface DraggableDropdownProps {
  filters: FilterItem[];
  onFilterVisibilityChange: (key: string, isVisible: boolean) => void;
  onFilterSelect: (value: string | number) => void;
  selectedValue?: string | number;
  selectedValues?: (string | number)[]; // For multiple selections
  filterType: 'import' | 'status' | 'groupBy';
  className?: string;
  customFooter?: React.ReactNode;
  onOrderChange?: (orderedFilters: FilterItem[]) => void; // Callback for when order changes
  storageSuffix?: string; // Optional suffix to make localStorage keys entity-specific (e.g., 'Lead', 'User')
  defaultVisibleOptions?: string[]; // Array of filter keys that should be visible by default when resetting
}

export const DraggableDropdown: React.FC<DraggableDropdownProps> = ({
  filters,
  onFilterVisibilityChange,
  onFilterSelect,
  selectedValue,
  selectedValues,
  filterType,
  className = 'w-64',
  customFooter,
  onOrderChange,
  storageSuffix,
  defaultVisibleOptions,
}) => {
  // Build localStorage key with optional suffix for entity-specific storage
  const getStorageKey = useCallback(
    (baseKey: string) => {
      return storageSuffix ? `${baseKey}-${storageSuffix}` : baseKey;
    },
    [storageSuffix]
  );

  const [isResetting, setIsResetting] = useState(false);
  const [orderedFilters, setOrderedFilters] = useState<FilterItem[]>([]);
  const [filterOrder, setFilterOrder] = useState<string[]>([]);
  const [filterVisibility, setFilterVisibility] = useState<Record<string, boolean>>({});
  // For groupBy filterType, show all options by default in edit mode so user can control order of all options
  const [showHiddenOptions, setShowHiddenOptions] = useState(filterType === 'groupBy');

  // Use refs to track previous values to prevent unnecessary updates
  const prevFiltersRef = useRef<FilterItem[]>([]);
  const prevFilterOrderRef = useRef<string[]>([]);
  const prevFilterVisibilityRef = useRef<Record<string, boolean>>({});

  // Load filter order and visibility from localStorage on mount
  useEffect(() => {
    try {
      const storedOrder = localStorage.getItem(getStorageKey(`filter-order-${filterType}`));
      const storedVisibility = localStorage.getItem(
        getStorageKey(`filter-visibility-${filterType}`)
      );

      const order = storedOrder ? JSON.parse(storedOrder) : [];
      let visibility = storedVisibility ? JSON.parse(storedVisibility) : {};

      // If no stored visibility, initialize from filters' isVisible props
      // This ensures default visibility from parent component (e.g., GroupByFilter) is respected
      if (!storedVisibility && filters && filters.length > 0) {
        visibility = filters.reduce(
          (acc, filter) => {
            if (filter?.isVisible !== undefined) {
              acc[filter.key] = filter.isVisible;
            }
            return acc;
          },
          {} as Record<string, boolean>
        );
      }

      setFilterOrder(order);
      setFilterVisibility(visibility);
      prevFilterOrderRef.current = order;
      prevFilterVisibilityRef.current = visibility;
    } catch (error) {
      console.error('Failed to load filter settings:', error);
      // Initialize from filters' isVisible props if available
      let visibility = {};
      if (filters && filters.length > 0) {
        visibility = filters.reduce(
          (acc, filter) => {
            if (filter?.isVisible !== undefined) {
              acc[filter.key] = filter.isVisible;
            }
            return acc;
          },
          {} as Record<string, boolean>
        );
      }
      setFilterOrder([]);
      setFilterVisibility(visibility);
      prevFilterOrderRef.current = [];
      prevFilterVisibilityRef.current = visibility;
    }
  }, [filterType, filters, storageSuffix, getStorageKey]);

  // Update ordered filters when filters prop or settings change
  useEffect(() => {
    // Check if filters have actually changed (deep comparison)
    const filtersChanged = JSON.stringify(filters) !== JSON.stringify(prevFiltersRef.current);
    const orderChanged = JSON.stringify(filterOrder) !== JSON.stringify(prevFilterOrderRef.current);
    const visibilityChanged =
      JSON.stringify(filterVisibility) !== JSON.stringify(prevFilterVisibilityRef.current);

    // Only update if something actually changed
    if (!filtersChanged && !orderChanged && !visibilityChanged) {
      return;
    }

    const filtersWithVisibility = filters?.map?.((filter) => ({
      ...filter,
      // Use filterVisibility from localStorage if it exists, otherwise use the isVisible prop from filters
      // This ensures that when GroupByFilter sets default visibility, it's respected
      isVisible:
        filterVisibility[filter?.key] !== undefined
          ? filterVisibility[filter?.key]
          : filter?.isVisible !== undefined
            ? filter?.isVisible
            : true,
    }));

    if (filterOrder?.length === 0) {
      setOrderedFilters(filtersWithVisibility);
      prevFiltersRef.current = filters;
      prevFilterOrderRef.current = filterOrder;
      prevFilterVisibilityRef.current = filterVisibility;
      return;
    }

    const ordered = [...filtersWithVisibility];
    ordered.sort((a, b) => {
      const aIndex = filterOrder.indexOf(a.key);
      const bIndex = filterOrder.indexOf(b.key);

      // If both are in the order, sort by position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // If only one is in the order, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      // If neither is in the order, maintain original order
      return 0;
    });

    setOrderedFilters(ordered);

    // Call onOrderChange callback if provided
    if (onOrderChange) {
      onOrderChange(ordered);
    }

    // Update refs to track current values
    prevFiltersRef.current = filters;
    prevFilterOrderRef.current = filterOrder;
    prevFilterVisibilityRef.current = filterVisibility;
  }, [filters, filterOrder, filterVisibility, onOrderChange]);

  // Save filter order to localStorage
  const saveFilterOrder = (order: string[]) => {
    try {
      localStorage.setItem(getStorageKey(`filter-order-${filterType}`), JSON.stringify(order));
      setFilterOrder(order);
    } catch (error) {
      console.error('Failed to save filter order:', error);
    }
  };

  // Save filter visibility to localStorage
  const saveFilterVisibility = (visibility: Record<string, boolean>) => {
    try {
      localStorage.setItem(
        getStorageKey(`filter-visibility-${filterType}`),
        JSON.stringify(visibility)
      );
      setFilterVisibility(visibility);
    } catch (error) {
      console.error('Failed to save filter visibility:', error);
    }
  };

  // Get visible filters for display (define before handleDragEnd so it's in scope)
  const visibleFilters = orderedFilters?.filter((filter) => filter?.isVisible) || [];
  const hiddenFilters = orderedFilters?.filter((filter) => !filter?.isVisible) || [];

  // Get filters to display - show visible + hidden if toggled
  // After reset, show all filters so user can control order of all options
  const displayFilters = showHiddenOptions ? orderedFilters : visibleFilters;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    // Use displayFilters for reordering (matches what's rendered on screen)
    // This ensures correct index mapping whether showing all items or just visible ones
    const items = Array.from(displayFilters || []);
    const [reorderedItem] = items?.splice(result?.source?.index, 1);
    items?.splice(result?.destination?.index, 0, reorderedItem);

    // Create new order from the reordered items
    const newOrder: string[] = [];

    // Add all reordered items
    items?.forEach?.((item) => {
      newOrder.push(item?.key);
    });

    // If only showing visible items, append hidden items at the end
    if (!showHiddenOptions) {
      hiddenFilters?.forEach?.((item) => {
        if (!newOrder.includes(item?.key)) {
          newOrder.push(item?.key);
        }
      });
    }

    saveFilterOrder(newOrder);

    // Call onOrderChange callback if provided
    if (onOrderChange) {
      // Get the updated ordered filters after reordering
      const updatedOrderedFilters = orderedFilters?.map?.((filter) => ({
        ...filter,
        // Use filterVisibility from localStorage if it exists, otherwise use the isVisible prop from filters
        isVisible:
          filterVisibility[filter?.key] !== undefined
            ? filterVisibility[filter?.key]
            : filter?.isVisible !== undefined
              ? filter?.isVisible
              : true,
      }));

      // Reorder based on the new order
      const reordered = [...updatedOrderedFilters];
      reordered?.sort?.((a, b) => {
        const aIndex = newOrder?.indexOf(a?.key);
        const bIndex = newOrder?.indexOf(b?.key);

        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return 0;
      });

      onOrderChange(reordered);
    }
  };

  const handleVisibilityChange = (key: string, isVisible: boolean) => {
    const newVisibility = { ...filterVisibility, [key]: isVisible };
    saveFilterVisibility(newVisibility);
    onFilterVisibilityChange(key, isVisible);
  };

  const handleReset = () => {
    setIsResetting(true);
    // Clear localStorage for this filter type
    localStorage.removeItem(getStorageKey(`filter-order-${filterType}`));

    // If defaultVisibleOptions is provided, use it to set visibility
    // Default options will be visible (checked), others will be hidden (unchecked)
    // Otherwise, set all filters to visible (fallback behavior)
    const resetVisibility = defaultVisibleOptions
      ? filters.reduce(
          (acc, filter) => {
            // Only show filters that are in defaultVisibleOptions
            acc[filter.key] = defaultVisibleOptions.includes(filter.key);
            return acc;
          },
          {} as Record<string, boolean>
        )
      : filters.reduce(
          (acc, filter) => {
            acc[filter.key] = true;
            return acc;
          },
          {} as Record<string, boolean>
        );

    // Save visibility state to localStorage
    try {
      localStorage.setItem(
        getStorageKey(`filter-visibility-${filterType}`),
        JSON.stringify(resetVisibility)
      );
    } catch (error) {
      console.error('Failed to save filter visibility:', error);
    }

    // Reset state - clear order so it uses original backend order
    setFilterOrder([]);
    setFilterVisibility(resetVisibility);
    // Show all options (including hidden ones) so user can see all options
    // Default options will be checked, others will be unchecked but still visible
    setShowHiddenOptions(true); // Show all filters so user can see checked/unchecked state

    // Force a re-render by briefly setting a reset state
    setTimeout(() => {
      setIsResetting(false);
    }, 100);
  };

  return (
    <div className={`${className} rounded-lg border border-gray-200 bg-white shadow-sm`}>
      <div className="gap-2 space-y-4 p-4">
        {/* Reset Button and Hide/Show Options in one row */}
        <div className="flex items-center justify-between gap-2 border-b pb-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            icon={<ApolloIcon name="repeat" className="text-sm" />}
            className="text-xs"
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset to Default'}
          </Button>

          {/* Commented out Show Hidden button */}
          {/* {hiddenFilters?.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowHiddenOptions(!showHiddenOptions)}
              icon={
                <ApolloIcon
                  name={showHiddenOptions ? 'eye-slash' : 'eye-filled'}
                  className="text-sm"
                />
              }
              className="button border-border hover:bg-sand-5 button-press-feedback rounded-lg border bg-white px-2 text-sm text-gray-600"
            >
              {showHiddenOptions ? 'Hide' : 'Show'} Hidden ({hiddenFilters?.length})
            </Button>
          )} */}
        </div>

        {/* Draggable Filters List */}
        <div className="max-h-[300px] min-h-[200px] overflow-y-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable
              droppableId="filters"
              renderClone={(provided, snapshot, rubric) => {
                const filter = displayFilters?.[rubric.source.index];
                return (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      zIndex: 99999,
                    }}
                    className="flex min-w-[150px] items-center gap-2 rounded border-2 border-blue-500 bg-blue-100 px-2 py-1"
                  >
                    <div className="p-1 text-gray-400">
                      <ApolloIcon name="drag-and-sort" className="text-sm" />
                    </div>
                    <span className="flex-1 text-sm font-semibold text-blue-500">
                      {filter?.label}
                    </span>
                  </div>
                );
              }}
            >
              {(provided, snapshot) => (
                <div
                  {...provided?.droppableProps}
                  ref={provided?.innerRef}
                  className={`min-h-[100px] transition-colors ${
                    snapshot.isDraggingOver ? 'bg-blue-50' : ''
                  }`}
                >
                  {!isResetting &&
                    displayFilters?.map?.((filter, index) => (
                      <Draggable key={filter?.key} draggableId={filter?.key} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided?.innerRef}
                            {...provided?.draggableProps}
                            {...provided?.dragHandleProps}
                            className={`flex items-center gap-2 rounded p-1 ${
                              snapshot.isDragging
                                ? 'opacity-30'
                                : filter?.isVisible
                                  ? 'hover:bg-gray-50'
                                  : 'opacity-60 hover:bg-gray-50'
                            }`}
                          >
                            <div className="mt-[2px] cursor-grab p-1 text-gray-400 hover:text-gray-600">
                              <ApolloIcon name="drag-and-sort" className="text-sm" />
                            </div>
                            <Checkbox
                              checked={filter?.isVisible}
                              onChange={(isChecked) =>
                                handleVisibilityChange(filter?.key, isChecked)
                              }
                              className="mr-0"
                            />
                            <button
                              onClick={() => {
                                // Toggle checkbox visibility when clicking label
                                handleVisibilityChange(filter?.key, !filter?.isVisible);
                                // Also trigger filter selection
                                onFilterSelect(filter?.value);
                              }}
                              className={`mt-1 flex-1 truncate text-left text-sm transition-colors ${
                                (selectedValues && selectedValues?.includes(filter?.value)) ||
                                selectedValue === filter?.value
                                  ? 'font-medium text-blue-700'
                                  : 'text-gray-700 hover:text-blue-600'
                              }`}
                            >
                              {filter?.label}
                            </button>
                            {((selectedValues && selectedValues?.includes(filter?.value)) ||
                              selectedValue === filter?.value) && (
                              <ApolloIcon name="check" className="text-sm text-blue-600" />
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided?.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Custom Footer */}
        {customFooter}
      </div>
    </div>
  );
};
