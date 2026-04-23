/* eslint-disable react-hooks/set-state-in-effect */
import { DraggableDropdown } from '@/components/shared/DraggableDropdown';
import React, { useState, useEffect, useMemo } from 'react';
import {
  useUniversalGroupingFilterStore,
  DomainFilter,
} from '@/stores/universalGroupingFilterStore';
import ApolloIcon from '@/components/ui/ApolloIcon';

// Array of Object that is for Filter button
type Filter = {
  label: string;
  value: number;
  badge: string;
  variant: 'success' | 'destructive' | 'solid' | 'default';
};

type TFilterDropdownProps = {
  selectedState: number | undefined;
  setSelectedState: (value: number | undefined) => void;
  // New props for external edit mode control
  isEditMode?: boolean;
  onExitEditMode?: () => void;
};

// Filter options array
const filters: Filter[] = [
  { label: 'New', value: 0, badge: 'greenNew', variant: 'success' },
  { label: '10 Week duplicate', value: 1, badge: 'yellowDuplicate', variant: 'destructive' },
  { label: 'Duplicate', value: 2, badge: 'Red10week_duplicate', variant: 'solid' },
];

export default function FilterByImport({
  setSelectedState = () => {},
  isEditMode = false,
  onExitEditMode,
}: TFilterDropdownProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('🔎 [FilterByImport] mount', { isEditMode });
  }, [isEditMode]);

  const [visibleFilters, setVisibleFilters] = useState<Record<string, boolean>>({});
  const [reorderedOptions, setReorderedOptions] = useState<Filter[]>([]);

  // Track changes for edit mode
  const [hasChanges, setHasChanges] = useState(false);
  const [originalVisibleFilters, setOriginalVisibleFilters] = useState<Record<string, boolean>>({});
  const [originalReorderedOptions, setOriginalReorderedOptions] = useState<Filter[]>([]);

  // Add key to force DraggableDropdown re-mount when resetting
  const [resetKey, setResetKey] = useState(0);

  // Universal grouping filter store - use domain filters format
  const { userDomainFilters, setUserDomainFilters } = useUniversalGroupingFilterStore();

  // Get current selected state from userDomainFilters
  // Look for a filter with field 'duplicate_status'
  const currentSelectedState = useMemo(() => {
    if (!userDomainFilters || userDomainFilters.length === 0) {
      return undefined;
    }
    const duplicateStatusFilter = userDomainFilters.find(
      (filter) => Array.isArray(filter) && filter[0] === 'duplicate_status'
    );
    if (
      duplicateStatusFilter &&
      Array.isArray(duplicateStatusFilter) &&
      duplicateStatusFilter.length >= 3
    ) {
      return duplicateStatusFilter[2] as number;
    }
    return undefined;
  }, [userDomainFilters]);

  // Load filter visibility from localStorage on mount and initialize reordered options
  useEffect(() => {
    try {
      const stored = localStorage.getItem('filter-visibility-import');
      if (stored) {
        const parsed = JSON.parse(stored);
        setVisibleFilters(parsed);
        setOriginalVisibleFilters(parsed);
      } else {
        // Set all filters visible by default
        const defaultVisibility = filters.reduce(
          (acc, filter) => {
            acc[filter.value.toString()] = true;
            return acc;
          },
          {} as Record<string, boolean>
        );
        setVisibleFilters(defaultVisibility);
        setOriginalVisibleFilters(defaultVisibility);
      }
    } catch {
      // Set all filters visible by default if localStorage fails
      const defaultVisibility = filters.reduce(
        (acc, filter) => {
          acc[filter.value.toString()] = true;
          return acc;
        },
        {} as Record<string, boolean>
      );
      setVisibleFilters(defaultVisibility);
      setOriginalVisibleFilters(defaultVisibility);
    }

    // Initialize reordered options with stored order or original data
    try {
      const storedOrder = localStorage.getItem('filter-order-import');
      if (storedOrder) {
        const order = JSON.parse(storedOrder);
        // Reorder the data based on stored order
        const reordered = [...filters];
        reordered.sort((a, b) => {
          const aIndex = order.indexOf(a.value.toString());
          const bIndex = order.indexOf(b.value.toString());

          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return 0;
        });
        setReorderedOptions(reordered);
        setOriginalReorderedOptions(reordered);
      } else {
        setReorderedOptions(filters);
        setOriginalReorderedOptions(filters);
      }
    } catch {
      setReorderedOptions(filters);
      setOriginalReorderedOptions(filters);
    }
  }, []);

  // Check for changes when edit mode is active
  useEffect(() => {
    if (isEditMode) {
      const visibilityChanged =
        JSON.stringify(visibleFilters) !== JSON.stringify(originalVisibleFilters);
      const orderChanged =
        JSON.stringify(reorderedOptions) !== JSON.stringify(originalReorderedOptions);
      setHasChanges(visibilityChanged || orderChanged);
    }
  }, [
    isEditMode,
    visibleFilters,
    originalVisibleFilters,
    reorderedOptions,
    originalReorderedOptions,
  ]);

  // Function to handle filter selection
  const handleFilterSelect = (value: number) => {
    // In edit mode, don't allow filter selection
    if (isEditMode) {
      return;
    }

    // eslint-disable-next-line no-console
    console.debug('🟢 [FilterByImport] select clicked', {
      value,
      currentSelectedState,
      userDomainFilters,
    });

    // If clicking the same value, remove the filter (toggle off)
    if (currentSelectedState === value) {
      // Remove duplicate_status filter from userDomainFilters
      const updatedFilters = (userDomainFilters || []).filter(
        (filter) => !(Array.isArray(filter) && filter[0] === 'duplicate_status')
      );
      setUserDomainFilters(updatedFilters);
      setSelectedState(undefined);
      // eslint-disable-next-line no-console
      console.debug('🔴 [FilterByImport] cleared duplicate_status', { updatedFilters });
      return;
    }

    // Remove any existing duplicate_status filter first
    const filtersWithoutDuplicateStatus = (userDomainFilters || []).filter(
      (filter) => !(Array.isArray(filter) && filter[0] === 'duplicate_status')
    );

    // Add new duplicate_status filter in domain format: ["duplicate_status","=","0"]
    const newFilter: DomainFilter = ['duplicate_status', '=', value];
    const updatedFilters = [...filtersWithoutDuplicateStatus, newFilter];

    // Update store with new filters
    setUserDomainFilters(updatedFilters);

    // Update local state (legacy support)
    setSelectedState(value);

    // eslint-disable-next-line no-console
    console.debug('✅ [FilterByImport] applied duplicate_status', {
      appliedValue: value,
      updatedFilters,
    });
  };

  // Function to handle filter visibility change
  const handleFilterVisibilityChange = (key: string, isVisible: boolean) => {
    setVisibleFilters((prev) => ({ ...prev, [key]: isVisible }));
  };

  // Function to handle order changes from DraggableDropdown
  const handleOrderChange = (orderedFilters: any[]) => {
    // Convert the ordered filters back to Filter format
    const newReorderedOptions = orderedFilters.map((filter) => ({
      label: filter.label,
      value: filter.value,
      badge: filter.badge || 'default',
      variant: filter.variant || 'default',
    }));
    setReorderedOptions(newReorderedOptions);
  };

  // Function to handle cancel button
  const handleCancel = () => {
    // Clear localStorage to reset DraggableDropdown state
    localStorage.removeItem('filter-visibility-import');
    localStorage.removeItem('filter-order-import');

    // Reset to original values
    setVisibleFilters(originalVisibleFilters);
    setReorderedOptions(originalReorderedOptions);
    setHasChanges(false);
    setResetKey((prev) => prev + 1); // Force re-mount
  };

  // Function to handle update button
  const handleUpdate = () => {
    try {
      // Save visibility changes
      localStorage.setItem('filter-visibility-import', JSON.stringify(visibleFilters));

      // Save order changes
      const order = reorderedOptions.map((filter) => filter.value.toString());
      localStorage.setItem('filter-order-import', JSON.stringify(order));

      // Update original values
      setOriginalVisibleFilters(visibleFilters);
      setOriginalReorderedOptions(reorderedOptions);
      setHasChanges(false);
    } catch {
      // Handle error silently or show user-friendly message
    }

    // Exit edit mode
    if (onExitEditMode) {
      onExitEditMode();
    }
  };

  // Convert filters to the format expected by DraggableDropdown
  const getDraggableFilters = () => {
    return reorderedOptions.map((filter) => ({
      key: filter.value.toString(),
      label: filter.label,
      value: filter.value,
      isVisible: visibleFilters[filter.value.toString()] !== false,
    }));
  };

  // Get visible filters for clean view (non-edit mode)
  const getVisibleFilters = () => {
    return getDraggableFilters().filter((filter) => filter.isVisible);
  };

  // Clean view (non-edit mode)
  if (!isEditMode) {
    const visibleFiltersList = getVisibleFilters();

    return (
      <div className="w-full">
        <div className="space-y-0">
          {/* Clean filter list */}
          {visibleFiltersList.map((filter) => (
            <button
              key={filter.key}
              onClick={() => handleFilterSelect(filter.value as number)}
              className={`w-full rounded px-4 py-1.5 text-left text-sm transition-colors ${
                currentSelectedState === filter.value
                  ? 'font-medium text-gray-900 dark:text-[var(--dm-text-primary)]'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{filter.label}</span>
                {currentSelectedState === filter.value && (
                  <ApolloIcon name="check" className="text-sm text-blue-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Edit mode with full DraggableDropdown functionality
  return (
    <DraggableDropdown
      key={resetKey} // Add key to force re-mount
      filters={getDraggableFilters()}
      onFilterVisibilityChange={handleFilterVisibilityChange}
      onFilterSelect={(value) => handleFilterSelect(value as number)}
      selectedValue={currentSelectedState}
      filterType="import"
      className="w-full"
      onOrderChange={handleOrderChange}
      // Add custom footer with Cancel and Update buttons
      customFooter={
        <div className="border-t border-gray-200 py-2">
          <div className="flex justify-end gap-2">
            {hasChanges && (
              <button
                onClick={handleCancel}
                className="button border-border hover:bg-sand-5 button-press-feedback h-8 rounded-lg border bg-white px-3 text-sm text-gray-600"
              >
                Cancel
              </button>
            )}
            <button
              onClick={hasChanges ? handleUpdate : onExitEditMode}
              className={`button border-border button-press-feedback h-8 rounded-lg border px-3 text-sm ${
                hasChanges
                  ? 'bg-sunbeam-2 hover:bg-sunbeam-3 text-gray-700'
                  : 'hover:bg-sand-5 bg-white text-gray-600'
              }`}
            >
              {hasChanges ? 'Update' : 'Cancel'}
            </button>
          </div>
        </div>
      }
    />
  );
}
