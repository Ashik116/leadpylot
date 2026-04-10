import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { useFilterChainStore } from '@/stores/filterChainStore';
import { useGroupedSortingStore } from '@/stores/groupedSortingStore';
import { FiDelete } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import ApolloIcon, { APOLLO_ICONS } from '@/components/ui/ApolloIcon';
import { sortingOptions } from '@/constants/sortingOptions';

type QuickGroupByFilterOptionsProps = {
  selectedGroupByArray?: string[];
  onGroupByArrayChange?: (groupBy: string[]) => void;
  propIsMultiLevelGroupingApplied?: boolean;
  onMultiLevelGrouping?: () => void;
  showGroupBy?: boolean;
  shouldShowFilters?: boolean;
  showFiltersDropdown?: boolean;
  hasSelectedGroupBy?: boolean;
  onClearGroupBy?: () => void;
  hasUserAddedGroupBy?: boolean;
  isAgent?: boolean;
  // Group sorting control props (for grouped tables)
  groupSortBy?: string;
  groupSortOrder?: 'asc' | 'desc';
  onGroupSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  // Hide specific group by options
  hideProjectOption?: boolean;
};
const QUICK_GROUP_BY_OPTIONS = ['project', 'agent', 'status'] as const;
const OPTION_ICON_MAP: Record<(typeof QUICK_GROUP_BY_OPTIONS)[number], keyof typeof APOLLO_ICONS> =
  {
    project: 'folder',
    agent: 'user-star',
    status: 'flag',
  };

function QuickGroupByFilterOptions({
  selectedGroupByArray,
  propIsMultiLevelGroupingApplied,
  onMultiLevelGrouping,
  showGroupBy,
  shouldShowFilters,
  showFiltersDropdown,
  hasSelectedGroupBy,
  onClearGroupBy,
  hasUserAddedGroupBy,
  isAgent,
  onGroupByArrayChange = () => {},
  groupSortBy,
  groupSortOrder = 'desc',
  onGroupSortChange,
  hideProjectOption = false,
}: QuickGroupByFilterOptionsProps) {
  // Get dynamic filters to check for mutual exclusivity
  const { dynamicFilters } = useFilterChainStore();
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Global sorting store for grouped tables
  const { sortBy: globalSortBy, sortOrder: globalSortOrder, setSorting } = useGroupedSortingStore();

  // Use props if provided, otherwise fall back to global store
  const currentSortBy = groupSortBy || globalSortBy;
  const currentSortOrder = groupSortOrder || globalSortOrder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMoreDropdownOpen(false);
      }
    };

    if (isMoreDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreDropdownOpen]);

  // Check for mutual exclusivity in dynamic filters
  const hasAgentInDynamicFilters = dynamicFilters?.some((filter) => filter?.field === 'agent');
  const isAgentSelected = selectedGroupByArray?.includes('agent');
  return (
    <>
      <div className="flex items-center gap-2">
        {QUICK_GROUP_BY_OPTIONS.filter(
          (option) => !(hideProjectOption && option === 'project')
        ).map((option) => {
          const isSelected = selectedGroupByArray?.includes(option);
          // Show selected state for project and agent when Multi Level Grouping is applied
          const shouldShowSelected = isSelected;

          // Check for mutual exclusivity: "agent" and "last_transfer" cannot be selected together
          // Also check if dynamic filters contain conflicting fields
          const hasLastTransferInDynamicFilters = dynamicFilters.some(
            (filter) => filter.field === 'last_transfer'
          );

          const isDisabled =
            option === 'agent' &&
            (selectedGroupByArray?.includes('last_transfer') || hasLastTransferInDynamicFilters);

          const disabledTitle =
            isDisabled &&
            option === 'agent' &&
            (selectedGroupByArray?.includes('last_transfer') || hasLastTransferInDynamicFilters)
              ? hasLastTransferInDynamicFilters
                ? 'Cannot select "Agent" when "Last Transfer" is selected in dynamic filters'
                : 'Cannot select "Agent" when "Last Transfer" is selected'
              : undefined;

          const label = option.charAt(0).toUpperCase() + option.slice(1);
          const baseTitle = disabledTitle || label;

          return (
            <Button
              key={option}
              variant={shouldShowSelected ? 'secondary' : 'default'}
              size="md"
              onClick={() => {
                const current = selectedGroupByArray || [];

                if (isSelected) {
                  // Remove if already selected
                  const newSelection = current.filter((item) => item !== option);
                  onGroupByArrayChange(newSelection);
                } else {
                  // Add if not selected, but check mutual exclusivity
                  if (
                    option === 'agent' &&
                    (current.includes('last_transfer') || hasLastTransferInDynamicFilters)
                  ) {
                    // If trying to select "agent" but "last_transfer" is already selected in group by or dynamic filters, remove "last_transfer" first
                    const newSelection = current.filter((item) => item !== 'last_transfer');
                    onGroupByArrayChange([...newSelection, option]);
                    return;
                  }

                  const newSelection = [...current, option];
                  onGroupByArrayChange(newSelection);
                }
              }}
              disabled={isDisabled}
              className={`group flex items-center ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
              title={baseTitle}
            >
              <div className="flex items-center overflow-hidden">
                <ApolloIcon name={OPTION_ICON_MAP[option]} className="text-lg" />
                <span
                  className={`ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 ease-in-out group-hover:ml-1 group-hover:max-w-[96px] group-hover:opacity-100 ${shouldShowSelected ? 'ml-1 max-w-[96px] opacity-100' : ''}`}
                >
                  <span
                    className={`inline-block origin-center transform transition-transform duration-200 ease-in-out ${shouldShowSelected ? 'scale-x-100' : 'scale-x-0'} group-hover:scale-x-100`}
                  >
                    {label}
                  </span>
                </span>
              </div>
            </Button>
          );
        })}

        {/* More button with dropdown */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="default"
            size="md"
            onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
            className="group"
            title="More"
          >
            <div className="flex items-center overflow-hidden">
              <FiChevronDown className="h-4 w-4" />
              <span
                className={`ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 ease-in-out group-hover:ml-1 group-hover:max-w-[80px] group-hover:opacity-100 ${isMoreDropdownOpen ? 'ml-1 max-w-[80px] opacity-100' : ''}`}
              >
                <span
                  className={`inline-block origin-center transform transition-transform duration-200 ease-in-out ${isMoreDropdownOpen ? 'scale-x-100' : 'scale-x-0'} group-hover:scale-x-100`}
                >
                  More
                </span>
              </span>
            </div>
          </Button>

          {isMoreDropdownOpen && (
            <div className="absolute top-full left-0 z-10 mt-1 min-w-[120px] rounded-md border border-gray-200 bg-white shadow-lg">
              {/* Source option */}
              <button
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                  selectedGroupByArray?.includes('source')
                    ? 'bg-sand-1 hover:bg-sand-2 text-white'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  const current = selectedGroupByArray || [];
                  const option = 'source';
                  const isSelected = current.includes(option);

                  if (isSelected) {
                    // Remove if already selected
                    const newSelection = current.filter((item) => item !== option);
                    onGroupByArrayChange(newSelection);
                  } else {
                    // Add if not selected
                    const newSelection = [...current, option];
                    onGroupByArrayChange(newSelection);
                  }
                  setIsMoreDropdownOpen(false);
                }}
                title="Group by Source"
              >
                <span>Source</span>
                {selectedGroupByArray?.includes('source') && (
                  <ApolloIcon name="check" className="font-semibold text-white" />
                )}
              </button>

              {/* Last Transfer option */}
              <button
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                  isAgentSelected || hasAgentInDynamicFilters
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                    : selectedGroupByArray?.includes('last_transfer')
                      ? 'bg-sand-1 hover:bg-sand-2 text-white'
                      : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  const current = selectedGroupByArray || [];
                  const option = 'last_transfer';
                  const isSelected = current.includes(option);

                  if (isSelected) {
                    // Remove if already selected
                    const newSelection = current.filter((item) => item !== option);
                    onGroupByArrayChange(newSelection);
                  } else {
                    // Add if not selected, but check mutual exclusivity
                    if (
                      option === 'last_transfer' &&
                      (current.includes('agent') || hasAgentInDynamicFilters)
                    ) {
                      const newSelection = current.filter((item) => item !== 'agent');
                      onGroupByArrayChange([...newSelection, option]);
                    } else {
                      const newSelection = [...current, option];
                      onGroupByArrayChange(newSelection);
                    }
                  }
                  setIsMoreDropdownOpen(false);
                }}
                disabled={isAgentSelected || hasAgentInDynamicFilters}
                title={
                  isAgentSelected || hasAgentInDynamicFilters
                    ? 'Cannot select "Last Transfer" when "Agent" is selected'
                    : undefined
                }
              >
                <span>Last Transfer</span>
                {selectedGroupByArray?.includes('last_transfer') && (
                  <ApolloIcon name="check" className="font-semibold text-white" />
                )}
              </button>

              {/* Multiple option */}
              {((shouldShowFilters && showFiltersDropdown) || showGroupBy) && (
                <button
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                    propIsMultiLevelGroupingApplied
                      ? 'bg-sand-1 hover:bg-sand-2 text-white'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (onMultiLevelGrouping) {
                      onMultiLevelGrouping();
                    } else {
                      if (onGroupByArrayChange) {
                        onGroupByArrayChange(['project', 'agent', 'updatedAt']);
                      }
                    }
                    setIsMoreDropdownOpen(false);
                  }}
                >
                  <span>Multiple</span>
                  {propIsMultiLevelGroupingApplied && (
                    <ApolloIcon name="check" className="font-semibold text-white" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Group Sort Select - beside More button */}
        {(showGroupBy || hasSelectedGroupBy) && onGroupSortChange && (
          <div className="ml-1 min-w-[140px]">
            <Select
              size="sm"
              isSearchable={false}
              className="text-md"
              value={(() => {
                const match = sortingOptions.find(
                  (opt) => opt.sortBy === currentSortBy && opt.sortOrder === currentSortOrder
                );
                return match || sortingOptions[0];
              })()}
              options={sortingOptions}
              onChange={(option: any) => {
                const selected = sortingOptions.find((opt) => opt.value === option?.value);
                if (selected) {
                  // Update global store
                  setSorting(selected.sortBy, selected.sortOrder);
                  // Call parent handler if provided
                  onGroupSortChange?.(selected.sortBy, selected.sortOrder);
                }
              }}
              placeholder="Sort by"
            />
          </div>
        )}
      </div>
      {/* Clear Group By Button - Removed: Now handled by FilterTags component in header */}
    </>
  );
}

export default QuickGroupByFilterOptions;
