'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/Button';
import type { MetadataFilterOption } from '@/stores/filterStateStore';
import type {
  ColumnFilterValue,
  FieldValueLabels,
} from '@/components/shared/DataTable/components/ColumnHeaderFilter';

type TriggerRenderProps = {
  setTriggerElement: (node: HTMLElement | null) => void;
  isOpen: boolean;
  isActive: boolean;
  activeCount: number | null;
  totalCount: number;
  onToggle: (e: React.MouseEvent) => void;
};

interface MetadataCheckboxFilterDropdownProps {
  fieldName: string;
  filterOptions: MetadataFilterOption[];
  activeFilter?: ColumnFilterValue | null;
  onApply: (fieldName: string, operator: string, value: any) => void;
  onClear?: (fieldName: string) => void;
  fieldValueLabels?: FieldValueLabels;
  title?: string;
  loading?: boolean;
  hasError?: boolean;
  placement?: 'start' | 'end';
  searchPlaceholder?: string;
  emptyStateLabel?: string;
  headerAction?: React.ReactNode;
  externalTriggerActive?: boolean;
  renderTrigger: (props: TriggerRenderProps) => React.ReactNode;
}

type CheckboxOption = {
  id: string;
  label: string;
};

const SEARCH_THRESHOLD = 5;
const DROPDOWN_WIDTH = 240;

const isNotInOperator = (operator: string): boolean =>
  operator === 'not in' || operator === 'not_in';

const isNeutralFilter = (activeFilter?: ColumnFilterValue | null): boolean =>
  !!activeFilter &&
  isNotInOperator(activeFilter.operator) &&
  Array.isArray(activeFilter.value) &&
  activeFilter.value.length === 0;

const hasMeaningfulActiveFilter = (activeFilter?: ColumnFilterValue | null): boolean =>
  !!activeFilter && !isNeutralFilter(activeFilter);

const areSetsEqual = (left: Set<string>, right: Set<string>): boolean => {
  if (left.size !== right.size) return false;

  for (const value of left) {
    if (!right.has(value)) return false;
  }

  return true;
};

const resolveSelectedOptionIds = (
  activeFilter: ColumnFilterValue | null | undefined,
  allOptionIds: string[]
): Set<string> => {
  if (!activeFilter || isNeutralFilter(activeFilter)) {
    return new Set(allOptionIds);
  }

  const rawValues = Array.isArray(activeFilter.value)
    ? activeFilter.value
    : activeFilter.value !== null && activeFilter.value !== undefined && activeFilter.value !== ''
      ? [activeFilter.value]
      : [];
  const valueIds = new Set(rawValues.map((value) => String(value)));

  if (
    activeFilter.operator === 'in' ||
    activeFilter.operator === '=' ||
    activeFilter.operator === 'equals'
  ) {
    return new Set(allOptionIds.filter((optionId) => valueIds.has(optionId)));
  }

  if (
    isNotInOperator(activeFilter.operator) ||
    activeFilter.operator === '!=' ||
    activeFilter.operator === 'not_equals'
  ) {
    return new Set(allOptionIds.filter((optionId) => !valueIds.has(optionId)));
  }

  return new Set(allOptionIds);
};

const buildSmartFilter = (
  selectedOptionIds: Set<string>,
  allOptionIds: string[]
): { operator: 'in' | 'not in'; value: string[] } => {
  const includedIds = allOptionIds.filter((optionId) => selectedOptionIds.has(optionId));
  const excludedIds = allOptionIds.filter((optionId) => !selectedOptionIds.has(optionId));

  if (includedIds.length === allOptionIds.length) {
    return { operator: 'not in', value: [] };
  }

  if (includedIds.length <= excludedIds.length) {
    return { operator: 'in', value: includedIds };
  }

  return { operator: 'not in', value: excludedIds };
};

const getDropdownTitle = (title: string | undefined, fallbackTitle: string): string => {
  const resolvedTitle = title?.trim() || fallbackTitle;

  return resolvedTitle.toLowerCase().startsWith('filter by')
    ? resolvedTitle
    : `Filter by ${resolvedTitle}`;
};

export default function MetadataCheckboxFilterDropdown({
  fieldName,
  filterOptions,
  activeFilter = null,
  onApply,
  onClear,
  fieldValueLabels,
  title,
  loading = false,
  hasError = false,
  placement = 'start',
  searchPlaceholder = 'Search options...',
  emptyStateLabel = 'No options found',
  headerAction,
  externalTriggerActive,
  renderTrigger,
}: MetadataCheckboxFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(new Set());
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const [triggerElement, setTriggerElementState] = useState<HTMLElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fieldMeta = useMemo(
    () => filterOptions.find((filterOption) => filterOption.field === fieldName),
    [filterOptions, fieldName]
  );

  const options = useMemo<CheckboxOption[]>(() => {
    if (!fieldMeta?.values) return [];

    const labelOverrides = fieldValueLabels?.[fieldName];

    return fieldMeta.values.map((valueOption) => ({
      id: String(valueOption._id),
      label:
        labelOverrides?.[String(valueOption._id)] ||
        labelOverrides?.[String(valueOption.value)] ||
        String(valueOption.value),
    }));
  }, [fieldMeta, fieldName, fieldValueLabels]);

  const allOptionIds = useMemo(() => options.map((option) => option.id), [options]);
  const appliedSelectedOptionIds = useMemo(
    () => resolveSelectedOptionIds(activeFilter, allOptionIds),
    [activeFilter, allOptionIds]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSelectedOptionIds(new Set(appliedSelectedOptionIds));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [appliedSelectedOptionIds]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerElement &&
        !triggerElement.contains(event.target as Node)
      ) {
        setDropdownPosition(null);
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownPosition(null);
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, triggerElement]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;

    const normalizedQuery = searchQuery.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, searchQuery]);

  const filteredOptionIds = useMemo(
    () => filteredOptions.map((option) => option.id),
    [filteredOptions]
  );
  const hasSearchQuery = searchQuery.trim().length > 0;

  const selectedAllOptionsCount = useMemo(
    () => allOptionIds.filter((optionId) => selectedOptionIds.has(optionId)).length,
    [allOptionIds, selectedOptionIds]
  );

  const selectedFilteredOptionsCount = useMemo(
    () => filteredOptionIds.filter((optionId) => selectedOptionIds.has(optionId)).length,
    [filteredOptionIds, selectedOptionIds]
  );

  const areAllOptionsSelected = useMemo(
    () => allOptionIds.length > 0 && selectedAllOptionsCount === allOptionIds.length,
    [allOptionIds.length, selectedAllOptionsCount]
  );

  const areSomeOptionsSelected = useMemo(
    () => selectedAllOptionsCount > 0 && selectedAllOptionsCount < allOptionIds.length,
    [allOptionIds.length, selectedAllOptionsCount]
  );

  const areAllFilteredOptionsSelected = useMemo(
    () => filteredOptionIds.length > 0 && selectedFilteredOptionsCount === filteredOptionIds.length,
    [filteredOptionIds.length, selectedFilteredOptionsCount]
  );

  const areSomeFilteredOptionsSelected = useMemo(
    () =>
      selectedFilteredOptionsCount > 0 && selectedFilteredOptionsCount < filteredOptionIds.length,
    [filteredOptionIds.length, selectedFilteredOptionsCount]
  );

  const shouldShowFilteredSelectionToggle = useMemo(
    () => hasSearchQuery && filteredOptions.length > 0 && filteredOptions.length < options.length,
    [filteredOptions.length, hasSearchQuery, options.length]
  );

  const isDirty = useMemo(
    () => !areSetsEqual(selectedOptionIds, appliedSelectedOptionIds),
    [selectedOptionIds, appliedSelectedOptionIds]
  );

  const canApply = isDirty;
  const hasActiveFilter = hasMeaningfulActiveFilter(activeFilter);
  const isTriggerActive = externalTriggerActive ?? hasActiveFilter;
  const activeCount = hasActiveFilter ? appliedSelectedOptionIds.size : null;
  const dropdownTitle = getDropdownTitle(title, fieldMeta?.label || fieldName);

  const setTriggerElement = useCallback((node: HTMLElement | null) => {
    setTriggerElementState(node);
  }, []);

  const handleToggle = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      const nextOpen = !isOpen;

      if (nextOpen && triggerElement) {
        const rect = triggerElement.getBoundingClientRect();
        let left = placement === 'end' ? rect.right - DROPDOWN_WIDTH : rect.left;

        if (left + DROPDOWN_WIDTH > window.innerWidth) {
          left = window.innerWidth - DROPDOWN_WIDTH - 8;
        }

        if (left < 8) {
          left = 8;
        }

        setDropdownPosition({
          top: rect.bottom + 4,
          left,
        });
      } else {
        setDropdownPosition(null);
      }

      setIsOpen(nextOpen);
    },
    [isOpen, placement, triggerElement]
  );

  const handleToggleAllOptions = useCallback(() => {
    if (areAllOptionsSelected) {
      setSelectedOptionIds(new Set());
      return;
    }

    setSelectedOptionIds(new Set(allOptionIds));
  }, [allOptionIds, areAllOptionsSelected]);

  const handleToggleFilteredOptions = useCallback(() => {
    if (filteredOptionIds.length === 0) return;

    setSelectedOptionIds((previous) => {
      const next = new Set(previous);

      if (areAllFilteredOptionsSelected) {
        filteredOptionIds.forEach((optionId) => next.delete(optionId));
        return next;
      }

      filteredOptionIds.forEach((optionId) => next.add(optionId));
      return next;
    });
  }, [areAllFilteredOptionsSelected, filteredOptionIds]);

  const handleToggleOption = useCallback((optionId: string) => {
    setSelectedOptionIds((previous) => {
      const next = new Set(previous);

      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }

      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    const { operator, value } = buildSmartFilter(selectedOptionIds, allOptionIds);
    onApply(fieldName, operator, value);
    setDropdownPosition(null);
    setIsOpen(false);
  }, [allOptionIds, fieldName, onApply, selectedOptionIds]);

  const handleClear = useCallback(() => {
    if (!onClear) return;
    onClear(fieldName);
    setDropdownPosition(null);
    setIsOpen(false);
  }, [fieldName, onClear]);

  const handleCancel = useCallback(() => {
    setSelectedOptionIds(new Set(appliedSelectedOptionIds));
    setSearchQuery('');
    setDropdownPosition(null);
    setIsOpen(false);
  }, [appliedSelectedOptionIds]);

  if (!fieldMeta && !loading && !hasError) {
    return null;
  }

  return (
    <>
      {renderTrigger({
        setTriggerElement,
        isOpen,
        isActive: isTriggerActive,
        activeCount,
        totalCount: options.length,
        onToggle: handleToggle,
      })}

      {isOpen &&
        dropdownPosition &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-100031 w-60 rounded-md border border-gray-200 bg-white shadow-lg dark:bg-[var(--dm-bg-elevated)] dark:border-[var(--dm-border)]"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={
                headerAction
                  ? 'flex items-center justify-between gap-1.5 border-b border-gray-200 px-3 py-1.5 dark:border-[var(--dm-border)]'
                  : 'border-b border-gray-200 px-3 py-1.5 dark:border-[var(--dm-border)]'
              }
            >
              <h3 className="text-sm font-semibold text-gray-700 dark:text-[var(--dm-text-primary)]">{dropdownTitle}</h3>
              {headerAction}
            </div>

            {options.length > SEARCH_THRESHOLD && (
              <div className="border-b border-gray-200 px-3 py-1.5 dark:border-[var(--dm-border)]">
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:bg-[var(--dm-bg-input)] dark:border-[var(--dm-border)] dark:text-[var(--dm-text-primary)] dark:placeholder:text-[var(--dm-text-muted)]"
                />
              </div>
            )}

            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="px-3 py-6 text-center text-sm text-gray-500">
                  Loading options...
                </div>
              ) : hasError ? (
                <div className="px-3 py-6 text-center text-sm text-red-500">
                  Failed to load options
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-[var(--dm-text-muted)]">{emptyStateLabel}</div>
              ) : (
                <>
                  <div className="border-b border-gray-200 px-3 py-1.5 dark:border-[var(--dm-border)]">
                    <label className="flex cursor-pointer items-start gap-1.5">
                      <input
                        type="checkbox"
                        checked={areAllOptionsSelected}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = areSomeOptionsSelected && !areAllOptionsSelected;
                          }
                        }}
                        onChange={handleToggleAllOptions}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-black"
                      />
                      <span className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700 dark:text-[var(--dm-text-primary)]">
                          {areAllOptionsSelected ? 'Unselect All' : 'Select All'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-[var(--dm-text-muted)]">
                          {options.length} total options
                        </span>
                      </span>
                    </label>
                  </div>

                  {shouldShowFilteredSelectionToggle && (
                    <div className="border-b border-gray-200 px-3 py-1.5 dark:border-[var(--dm-border)]">
                      <label className="flex cursor-pointer items-start gap-1.5">
                        <input
                          type="checkbox"
                          checked={areAllFilteredOptionsSelected}
                          ref={(input) => {
                            if (input) {
                              input.indeterminate =
                                areSomeFilteredOptionsSelected && !areAllFilteredOptionsSelected;
                            }
                          }}
                          onChange={handleToggleFilteredOptions}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-black"
                        />
                        <span className="flex flex-col">
                          <span className="text-sm font-medium text-gray-700 dark:text-[var(--dm-text-primary)]">
                            {areAllFilteredOptionsSelected ? 'Unselect Results' : 'Select Results'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-[var(--dm-text-muted)]">
                            {filteredOptions.length} matching search
                          </span>
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="divide-y divide-gray-100 dark:divide-[var(--dm-border)]">
                    {filteredOptions.map((option) => (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[var(--dm-bg-hover)]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedOptionIds.has(option.id)}
                          onChange={() => handleToggleOption(option.id)}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-black"
                        />
                        <span className="text-sm text-gray-700 dark:text-[var(--dm-text-primary)]">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-1.5 border-t border-gray-200 px-3 py-1.5 dark:border-[var(--dm-border)]">
              {hasActiveFilter && onClear ? (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={handleClear}
                  className="border border-gray-900 bg-transparent px-3 text-gray-900 hover:bg-gray-50 dark:border-[var(--dm-border)] dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]"
                >
                  Clear
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={handleCancel}
                  className="border border-gray-900 bg-transparent px-3 text-gray-900 hover:bg-gray-50 dark:border-[var(--dm-border)] dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]"
                >
                  Cancel
                </Button>
              )}
              <Button
                variant="default"
                size="xs"
                onClick={handleApply}
                disabled={!canApply}
                className={
                  canApply ? 'border-0 bg-black px-3 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200' : 'px-3'
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
}
