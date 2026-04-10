import React from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Badge from '@/components/ui/Badge';
import Tooltip from '@/components/ui/Tooltip';
import { Lead } from '@/services/LeadsService';
import { useFilterChainStore } from '@/stores/filterChainStore';
import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';

interface DynamicFilterResultsProps {
  isVisible: boolean;
  results: Lead[];
  onClear: () => void;
  isLoading?: boolean;
  total?: number; // Add total count prop
  // Add props to clear other filters
  onClearStatusFilter?: () => void;
}

const DynamicFilterResults: React.FC<DynamicFilterResultsProps> = ({
  isVisible,
  results,
  onClear,
  isLoading = false,
  total,
  onClearStatusFilter,
}) => {
  // Get store functions for comprehensive clearing
  const { setDynamicFilters, setImportFilter, setStatusFilter } = useFilterChainStore();
  const {
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
    customFilters, // Get custom filters from store
  } = useDynamicFiltersStore();

  // Comprehensive clear function that clears ALL filter types
  const handleComprehensiveClear = () => {
    try {
      // 1. Clear ALL localStorage filter data
      localStorage.removeItem('dynamicFilters'); // DynamicFilters saved rules
      localStorage.removeItem('filter-visibility-import'); // FilterByImport visibility
      localStorage.removeItem('filter-visibility-status'); // StatusFilter visibility
      // localStorage.removeItem('filter-visibility-groupBy'); // GroupByFilter visibility

      // 2. Clear ALL global filter chain store states
      setDynamicFilters([]); // Clear dynamic filters
      setImportFilter(null); // Clear import filter
      setStatusFilter(null); // Clear status filter
      // Note: GroupByFilter doesn't use filter chain store directly

      // 3. Clear dynamic filters store completely
      setDynamicFilterMode(false);
      setDynamicFilterResults([]);
      setDynamicFilterQuery([]);
      setCustomFilters([]); // Clear custom filters too
      setTotal(0);
      setPage(1);
      setPageSize(50);
      setHasNextPage(false);
      setHasPrevPage(false);
      setFilterSource(null);
      setLoading(false);

      // 4. Call the original onClear if provided (for any additional cleanup like resetting component states)
      onClear?.();

      // 5. Clear StatusFilter selection if provided
      onClearStatusFilter?.();
    } catch (error) {
      console.error('❌ Error clearing all filters:', error);
    }
  };

  if (!isVisible) return null;

  const getOperatorDisplay = (operator: string) => {
    const operatorMap: Record<string, string> = {
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
    return operatorMap[operator] || operator;
  };

  const getFieldDisplay = (field: string) => {
    const fieldMap: Record<string, string> = {
      email: 'Email',
      phone: 'Phone',
      first_name: 'First Name',
      last_name: 'Last Name',
      company: 'Company',
      status: 'Status',
      source: 'Source',
      created_at: 'Created Date',
      updated_at: 'Updated Date',
      project: 'Project',
      agent: 'Agent',
      use_status: 'Use Status',
      country: 'Country',
      city: 'City',
      zip_code: 'Zip Code',
      address: 'Address',
      website: 'Website',
      industry: 'Industry',
      notes: 'Notes',
    };
    return fieldMap[field] || field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatValue = (value: any) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (value === null || value === undefined) {
      return 'null';
    }
    return String(value);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      {/* Header */}
      <div className="flex w-full items-start justify-between">
        <div className="flex items-start space-x-10">
          <div className="flex items-start gap-2">
            <ApolloIcon name="filter" className="text-xl text-gray-600" />
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-900 md:text-base">
                Dynamic Filter Results :
              </h3>
              <p className="text-xs text-gray-600 lg:text-sm">
                {isLoading ? (
                  <span className="flex items-center space-x-1">
                    <ApolloIcon name="loading" className="text-xs" />
                    <span>Loading results...</span>
                  </span>
                ) : (
                  `Found ${total || results?.length} lead${(total || results?.length) !== 1 ? 's' : ''} matching your filters`
                )}
              </p>
            </div>
          </div>
          {/* Applied Filters - Show only custom filters, not default filters */}
          {customFilters?.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-1">
                <ApolloIcon name="cog" className="text-lg text-gray-500" />
                <span className="text-xs font-medium text-gray-700 md:text-sm">
                  Applied filters:
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {customFilters?.map((filter: any, index: number) => (
                  <Badge
                    key={index}
                    className="border-gray-300 bg-white text-xs text-gray-700 md:text-sm"
                  >
                    <span className="font-medium">{getFieldDisplay(filter?.field)}</span>
                    <span className="mx-1 text-gray-500">
                      {getOperatorDisplay(filter?.operator)}
                    </span>
                    <span className="font-semibold">{formatValue(filter?.value)}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Tooltip title="Clear filter">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleComprehensiveClear}
            className="text-gray-600 hover:text-gray-800"
            icon={<ApolloIcon name="cross" className="text-sm text-white" />}
          ></Button>
        </Tooltip>
      </div>

      {/* Empty State */}
      {!isLoading && results?.length === 0 && (
        <div className="rounded border border-gray-200 bg-white p-4 text-center">
          <ApolloIcon name="search" className="mx-auto mb-2 text-2xl text-gray-300" />
          <h4 className="mb-1 text-sm font-medium text-gray-700">No Results Found</h4>
          <p className="text-xs text-gray-500">Try adjusting your filters to find more leads</p>
        </div>
      )}
    </div>
  );
};

export default DynamicFilterResults;
