'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useUniversalGroupingFilterStore, DomainFilter } from '@/stores/universalGroupingFilterStore';
import { useTableScopedFilters } from '@/stores/multiTableFilterStore';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import DatePicker from '@/components/ui/DatePicker';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import Tooltip from '@/components/ui/Tooltip';
import { ACTION_BAR_DATE_FILTER_TOOLTIP, TOOLTIP_POPOVER_CLASS } from '@/utils/toltip.constants';

interface DateFilterDropdownProps {
  entityType: 'Lead' | 'Offer' | 'CashflowEntry' | 'CashflowTransaction' | 'Opening' | 'User' | 'Team' | 'Bank';
  tableId?: string; // For multi-table pages (cashflow)
  dateFieldName?: string; // Optional: Override the date field name (e.g., 'assigned_date', 'createdAt', 'updatedAt')
  /** When true, show only the icon (hide "Date" label) for responsive layout (e.g. 1024–1536px). */
  iconOnly?: boolean;
}

type DateFilterOption = 'today' | 'yesterday' | 'last7days' | 'last1month' | 'currentyear' | 'custom';

/**
 * Get the date field name based on entity type
 * Default to updatedAt for most entities
 */
const getDateFieldName = (entityType: string): string => {
  switch (entityType) {
    case 'Lead':
    case 'Offer':
    case 'Opening':
    case 'CashflowEntry':
    case 'CashflowTransaction':
    default:
      return 'updatedAt';
  }
};

/**
 * Calculate date ranges for different filter options
 */
const getDateRange = (option: DateFilterOption): { start: Date; end: Date } | null => {
  const today = dayjs().startOf('day');
  
  switch (option) {
    case 'today':
      return {
        start: today.toDate(),
        end: today.endOf('day').toDate(),
      };
    case 'yesterday':
      const yesterday = today.subtract(1, 'day');
      return {
        start: yesterday.startOf('day').toDate(),
        end: yesterday.endOf('day').toDate(),
      };
    case 'last7days':
      return {
        start: today.subtract(6, 'day').startOf('day').toDate(), // Include today (7 days total)
        end: today.endOf('day').toDate(),
      };
    case 'last1month':
      return {
        start: today.subtract(1, 'month').startOf('day').toDate(),
        end: today.endOf('day').toDate(),
      };
    case 'currentyear':
      return {
        start: today.startOf('year').toDate(),
        end: today.endOf('day').toDate(),
      };
    case 'custom':
      return null; // Custom range will be handled separately
    default:
      return null;
  }
};

/**
 * Format date for API (YYYY-MM-DD)
 */
const formatDateForAPI = (date: Date | null): string | null => {
  return date ? dayjs(date).format('YYYY-MM-DD') : null;
};

const DateFilterDropdown: React.FC<DateFilterDropdownProps> = ({
  entityType,
  tableId,
  dateFieldName: propDateFieldName,
  iconOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DateFilterOption | null>(null);
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasInitializedRef = useRef(false);

  // Store integration - use multi-table store if tableId is provided, otherwise use global store
  const globalStore = useUniversalGroupingFilterStore();
  const multiTableStoreRaw = useTableScopedFilters(tableId || 'dummy');
  const multiTableStore = tableId ? multiTableStoreRaw : null;

  // Extract date field name - use prop if provided, otherwise use default logic
  const dateFieldName = useMemo(() => {
    if (propDateFieldName) {
      return propDateFieldName;
    }
    return getDateFieldName(entityType);
  }, [propDateFieldName, entityType]);

  // Get current date filter from store to sync with existing filters
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      const userDomainFilters = multiTableStore
        ? multiTableStore.userDomainFilters
        : globalStore.userDomainFilters;

      // Find existing date filter
      const existingDateFilter = userDomainFilters.find(
        (filter) => filter[0] === dateFieldName && (filter[1] === 'between' || filter[1] === 'equals')
      );

      if (existingDateFilter) {
        // Handle 'between' operator with array value
        if (existingDateFilter[1] === 'between' && Array.isArray(existingDateFilter[2]) && existingDateFilter[2].length === 2) {
          const [start, end] = existingDateFilter[2];
          const startDate = dayjs(start);
          const endDate = dayjs(end);
          
          // Try to match to predefined options
          const today = dayjs().startOf('day');
          const yesterday = today.subtract(1, 'day');
          const last7DaysStart = today.subtract(6, 'day');
          const last1MonthStart = today.subtract(1, 'month').startOf('day');
          const currentYearStart = today.startOf('year');

          if (startDate.isSame(today, 'day') && endDate.isSame(today, 'day')) {
            setSelectedOption('today');
          } else if (startDate.isSame(yesterday, 'day') && endDate.isSame(yesterday, 'day')) {
            setSelectedOption('yesterday');
          } else if (startDate.isSame(last7DaysStart, 'day') && endDate.isSame(today, 'day')) {
            setSelectedOption('last7days');
          } else if (startDate.isSame(last1MonthStart, 'day') && endDate.isSame(today, 'day')) {
            setSelectedOption('last1month');
          } else if (startDate.isSame(currentYearStart, 'day') && endDate.isSame(today, 'day')) {
            setSelectedOption('currentyear');
          } else {
            // Custom range
            setSelectedOption('custom');
            setCustomDateRange([
              startDate.isValid() ? startDate.toDate() : null,
              endDate.isValid() ? endDate.toDate() : null,
            ]);
            setShowCustomPicker(true);
          }
        } else if (existingDateFilter[1] === 'equals' && !Array.isArray(existingDateFilter[2])) {
          // Single date - treat as today if matches
          const filterDate = dayjs(existingDateFilter[2] as string | number | Date);
          const today = dayjs().startOf('day');
          if (filterDate.isSame(today, 'day')) {
            setSelectedOption('today');
          } else {
            setSelectedOption('custom');
            setCustomDateRange([filterDate.toDate(), filterDate.toDate()]);
            setShowCustomPicker(true);
          }
        }
        hasInitializedRef.current = true;
      } else {
        // No existing filter, clear selection
        setSelectedOption(null);
        setCustomDateRange([null, null]);
        setShowCustomPicker(false);
        if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        }
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [dateFieldName, multiTableStore, globalStore.userDomainFilters]);

  // Calculate dropdown position (must be before early return)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(
    null
  );

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 256; // w-64 = 256px
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.right - dropdownWidth, // Align to right edge of button, expand leftward
      });
    }
  }, [isOpen]);

  // Handle option selection
  const handleOptionSelect = useCallback((option: DateFilterOption) => {
    if (option === 'custom') {
      setShowCustomPicker(true);
      setSelectedOption('custom');
    } else {
      setSelectedOption(option);
      setShowCustomPicker(false);
    }
  }, []);

  // Apply filter
  const handleApply = useCallback(() => {
    if (!selectedOption) {
      // No option selected, clear filter
      const currentFilters = multiTableStore
        ? multiTableStore.userDomainFilters
        : globalStore.userDomainFilters;
      const filtered = currentFilters.filter((f) => f[0] !== dateFieldName);
      
      if (multiTableStore) {
        multiTableStore.setUserDomainFilters(filtered);
      } else {
        globalStore.setUserDomainFilters(filtered);
      }
      setIsOpen(false);
      return;
    }

    let dateFilter: DomainFilter | null = null;

    if (selectedOption === 'custom') {
      // Custom date range
      if (customDateRange[0] && customDateRange[1]) {
        const start = formatDateForAPI(customDateRange[0]);
        const end = formatDateForAPI(customDateRange[1]);
        if (start && end) {
          // If start and end are the same, use equals operator
          if (start === end) {
            dateFilter = [dateFieldName, '=', start];
          } else {
            dateFilter = [dateFieldName, 'between', [start, end]];
          }
        }
      } else {
        // Invalid custom range, don't apply
        return;
      }
    } else {
      // Predefined option
      const range = getDateRange(selectedOption);
      if (range) {
        const start = formatDateForAPI(range.start);
        const end = formatDateForAPI(range.end);
        if (start && end) {
          // If start and end are the same, use equals operator
          if (start === end) {
            dateFilter = [dateFieldName, '=', start];
          } else {
            dateFilter = [dateFieldName, 'between', [start, end]];
          }
        }
      }
    }

    if (dateFilter) {
      // Get current filters
      const currentFilters = multiTableStore
        ? multiTableStore.userDomainFilters
        : globalStore.userDomainFilters;

      // Remove existing date filter if any
      const filtered = currentFilters.filter((f) => f[0] !== dateFieldName);

      // Add new date filter
      if (multiTableStore) {
        multiTableStore.setUserDomainFilters([...filtered, dateFilter]);
      } else {
        globalStore.setUserDomainFilters([...filtered, dateFilter]);
      }
    }

    setIsOpen(false);
    setShowCustomPicker(false);
  }, [selectedOption, customDateRange, dateFieldName, multiTableStore, globalStore]);

  // Cancel - restore previous selection
  const handleCancel = useCallback(() => {
    // Restore from store
    const userDomainFilters = multiTableStore
      ? multiTableStore.userDomainFilters
      : globalStore.userDomainFilters;

    const existingDateFilter = userDomainFilters.find(
      (filter) => filter[0] === dateFieldName && (filter[1] === 'between' || filter[1] === 'equals')
    );

    if (existingDateFilter && Array.isArray(existingDateFilter[2])) {
      if (existingDateFilter[1] === 'between' && existingDateFilter[2].length === 2) {
        const [start, end] = existingDateFilter[2];
        const startDate = dayjs(start);
        const endDate = dayjs(end);
        
        const today = dayjs().startOf('day');
        const yesterday = today.subtract(1, 'day');
        const last7DaysStart = today.subtract(6, 'day');
        const last1MonthStart = today.subtract(1, 'month').startOf('day');
        const currentYearStart = today.startOf('year');

        if (startDate.isSame(today, 'day') && endDate.isSame(today, 'day')) {
          setSelectedOption('today');
        } else if (startDate.isSame(yesterday, 'day') && endDate.isSame(yesterday, 'day')) {
          setSelectedOption('yesterday');
        } else if (startDate.isSame(last7DaysStart, 'day') && endDate.isSame(today, 'day')) {
          setSelectedOption('last7days');
        } else if (startDate.isSame(last1MonthStart, 'day') && endDate.isSame(today, 'day')) {
          setSelectedOption('last1month');
        } else if (startDate.isSame(currentYearStart, 'day') && endDate.isSame(today, 'day')) {
          setSelectedOption('currentyear');
        } else {
          setSelectedOption('custom');
          setCustomDateRange([
            startDate.isValid() ? startDate.toDate() : null,
            endDate.isValid() ? endDate.toDate() : null,
          ]);
        }
      } else {
        setSelectedOption(null);
      }
    } else {
      setSelectedOption(null);
      setCustomDateRange([null, null]);
    }

    setShowCustomPicker(false);
    setIsOpen(false);
  }, [dateFieldName, multiTableStore, globalStore.userDomainFilters]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        handleCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleCancel]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleCancel]);

  // Check if date filter is active
  const isDateFilterActive = useMemo(() => {
    const userDomainFilters = multiTableStore
      ? multiTableStore.userDomainFilters
      : globalStore.userDomainFilters;

    return userDomainFilters.some(
      (filter) => filter[0] === dateFieldName && (filter[1] === 'between' || filter[1] === 'equals')
    );
  }, [dateFieldName, multiTableStore, globalStore.userDomainFilters]);

  return (
    <>
      <Tooltip
        title={ACTION_BAR_DATE_FILTER_TOOLTIP}
        placement="top"
        wrapperClass="inline-flex"
        className={TOOLTIP_POPOVER_CLASS}
      >
        <button
          type="button"
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-6 items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 py-0 xl:px-2 text-xs transition-colors dark:bg-[var(--dm-bg-surface)] dark:border-[var(--dm-border)] ${
            isDateFilterActive
              ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500'
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]'
          }`}
        >
          <ApolloIcon name="calendar" className="text-xs" />
          {!iconOnly && <span className="hidden xl:inline whitespace-nowrap">Date</span>}
          <ApolloIcon name={isOpen ? 'dropdown-up-large' : 'dropdown-large'} className="text-xs" />
        </button>
      </Tooltip>

      {isOpen &&
        dropdownPosition &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 w-64 rounded-md border border-gray-200 bg-white shadow-lg dark:bg-[var(--dm-bg-elevated)] dark:border-[var(--dm-border)]"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-[var(--dm-border)]">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-[var(--dm-text-primary)]">Filter by Date</h3>
              <button
                onClick={handleCancel}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
                title="Close"
              >
                <ApolloIcon name="cross" className="text-sm" />
              </button>
            </div>

            {/* Date Options */}
            <div className="max-h-96 overflow-y-auto">
              {!showCustomPicker ? (
                <div className="divide-y divide-gray-100 dark:divide-[var(--dm-border)]">
                  {/* Today */}
                  <button
                    onClick={() => handleOptionSelect('today')}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      selectedOption === 'today'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 ${
                          selectedOption === 'today'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-[var(--dm-border)]'
                        }`}
                      >
                        {selectedOption === 'today' && (
                          <div className="flex h-full w-full items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                      <span>Today</span>
                    </div>
                  </button>

                  {/* Yesterday */}
                  <button
                    onClick={() => handleOptionSelect('yesterday')}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      selectedOption === 'yesterday'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 ${
                          selectedOption === 'yesterday'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-[var(--dm-border)]'
                        }`}
                      >
                        {selectedOption === 'yesterday' && (
                          <div className="flex h-full w-full items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                      <span>Yesterday</span>
                    </div>
                  </button>

                  {/* Last 7 Days */}
                  <button
                    onClick={() => handleOptionSelect('last7days')}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      selectedOption === 'last7days'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 ${
                          selectedOption === 'last7days'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-[var(--dm-border)]'
                        }`}
                      >
                        {selectedOption === 'last7days' && (
                          <div className="flex h-full w-full items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                      <span>Last 7 Days</span>
                    </div>
                  </button>

                  {/* Last 1 Month */}
                  <button
                    onClick={() => handleOptionSelect('last1month')}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      selectedOption === 'last1month'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 ${
                          selectedOption === 'last1month'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-[var(--dm-border)]'
                        }`}
                      >
                        {selectedOption === 'last1month' && (
                          <div className="flex h-full w-full items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                      <span>Last 1 Month</span>
                    </div>
                  </button>

                  {/* Current Year */}
                  <button
                    onClick={() => handleOptionSelect('currentyear')}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      selectedOption === 'currentyear'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 ${
                          selectedOption === 'currentyear'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-[var(--dm-border)]'
                        }`}
                      >
                        {selectedOption === 'currentyear' && (
                          <div className="flex h-full w-full items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                      <span>Current Year - {dayjs().year()}</span>
                    </div>
                  </button>

                  {/* Custom Date */}
                  <button
                    onClick={() => handleOptionSelect('custom')}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      selectedOption === 'custom'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 ${
                          selectedOption === 'custom'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-[var(--dm-border)]'
                        }`}
                      >
                        {selectedOption === 'custom' && (
                          <div className="flex h-full w-full items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                      <span>Custom Date</span>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="px-4 py-4">
                  <div className="mb-3">
                    <button
                      onClick={() => setShowCustomPicker(false)}
                      className="mb-2 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-[var(--dm-text-secondary)] dark:hover:text-[var(--dm-text-primary)]"
                    >
                      <ApolloIcon name="arrow-left" className="text-xs" />
                      <span>Back</span>
                    </button>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-[var(--dm-text-primary)]">
                      Select Date Range
                    </label>
                  </div>
                  <DatePicker.DatePickerRange
                    value={customDateRange}
                    onChange={(range: [Date | null, Date | null]) => {
                      setCustomDateRange(range);
                      setSelectedOption('custom');
                    }}
                    inputFormat="YYYY-MM-DD"
                    size="md"
                    className="[&_input]:h-10 [&_input]:rounded-md"
                  />
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-2 dark:border-[var(--dm-border)]">
              <Button variant="secondary" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleApply}
                disabled={
                  selectedOption === null ||
                  (selectedOption === 'custom' && (!customDateRange[0] || !customDateRange[1]))
                }
              >
                Apply
              </Button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default DateFilterDropdown;
