'use client';

import React, { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMetadataOptions } from '@/services/hooks/useLeads';
import { useUniversalGroupingFilterStore, DomainFilter } from '@/stores/universalGroupingFilterStore';
import { invalidateUniversalGroupingQueries } from '@/utils/queryInvalidation';
import { useTableScopedFilters } from '@/stores/multiTableFilterStore';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';
import MetadataCheckboxFilterDropdown from '@/components/shared/filters/MetadataCheckboxFilterDropdown';
import { ACTION_BAR_AGENT_FILTER_TOOLTIP, TOOLTIP_POPOVER_CLASS } from '@/utils/toltip.constants';
import type { ColumnFilterValue } from '@/components/shared/DataTable/components/ColumnHeaderFilter';
import { usePathname } from 'next/navigation';
import { isCloseProjectsLeadsBankPath, METADATA_OPTIONS_ENTITY_CLOSED_LEADS } from '@/utils/closeProjectUtils';

interface AgentFilterDropdownProps {
  entityType:
    | 'Lead'
    | 'Offer'
    | 'CashflowEntry'
    | 'CashflowTransaction'
    | 'Opening'
    | 'User'
    | 'Team'
    | 'Bank';
  tableId?: string;
  iconOnly?: boolean;
}

const getAgentFieldName = (entityType: string): string => {
  switch (entityType) {
    case 'Lead':
      return 'user_id';
    case 'Offer':
    case 'Opening':
      return 'agent_id';
    case 'CashflowEntry':
      return 'offer_id.agent_id';
    case 'CashflowTransaction':
      return 'created_by';
    default:
      return 'agent_id';
  }
};

const getMetadataEntityType = (entityType: string): string => {
  if (entityType === 'Opening') {
    return 'Offer';
  }

  return entityType;
};

const isListLikeOperator = (operator: string): boolean =>
  operator === 'in' || operator === 'not in' || operator === 'not_in' || operator === '=' || operator === '!=';

const findActiveFilter = (filters: DomainFilter[], fieldName: string): ColumnFilterValue | null => {
  const matchedFilter = filters.find(
    (filter) => filter[0] === fieldName && isListLikeOperator(filter[1])
  );

  if (!matchedFilter) return null;

  return {
    operator: matchedFilter[1],
    value: matchedFilter[2],
  };
};

const AgentFilterDropdown: React.FC<AgentFilterDropdownProps> = ({
  entityType,
  tableId,
  iconOnly = false,
}) => {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const globalStore = useUniversalGroupingFilterStore();
  const multiTableStoreRaw = useTableScopedFilters(tableId || 'dummy');
  const multiTableStore = tableId ? multiTableStoreRaw : null;
  const userDomainFilters = multiTableStore
    ? multiTableStore.userDomainFilters
    : globalStore.userDomainFilters;

  const metadataEntityType = useMemo(() => {
    if (isCloseProjectsLeadsBankPath(pathname) && entityType === 'Lead') {
      return METADATA_OPTIONS_ENTITY_CLOSED_LEADS;
    }
    return getMetadataEntityType(entityType);
  }, [entityType, pathname]);
  const fieldName = useMemo(() => getAgentFieldName(entityType), [entityType]);

  const {
    data: metadataOptions,
    isLoading,
    error,
  } = useMetadataOptions(metadataEntityType);

  const filterOptions = useMemo(() => metadataOptions?.filterOptions || [], [metadataOptions]);
  const hasSelectableValues = useMemo(
    () =>
      filterOptions.some(
        (filterOption) =>
          filterOption.field === fieldName &&
          Array.isArray(filterOption.values) &&
          filterOption.values.length > 0
      ),
    [fieldName, filterOptions]
  );
  const activeFilter = useMemo(
    () => findActiveFilter(userDomainFilters, fieldName),
    [fieldName, userDomainFilters]
  );

  const handleApply = useCallback(
    (targetFieldName: string, operator: string, value: any) => {
      const currentFilters = multiTableStore
        ? multiTableStore.userDomainFilters
        : globalStore.userDomainFilters;
      const updatedFilters: DomainFilter[] = [
        ...currentFilters.filter((filter) => filter[0] !== targetFieldName),
        [targetFieldName, operator, value],
      ];

      if (multiTableStore) {
        multiTableStore.setUserDomainFilters(updatedFilters);
      } else {
        globalStore.setUserDomainFilters(updatedFilters);
      }

      invalidateUniversalGroupingQueries(queryClient);
    },
    [globalStore, multiTableStore, queryClient]
  );

  const handleClear = useCallback(
    (targetFieldName: string) => {
      const currentFilters = multiTableStore
        ? multiTableStore.userDomainFilters
        : globalStore.userDomainFilters;
      const updatedFilters = currentFilters.filter((filter) => filter[0] !== targetFieldName);

      if (multiTableStore) {
        multiTableStore.setUserDomainFilters(updatedFilters);
      } else {
        globalStore.setUserDomainFilters(updatedFilters);
      }

      invalidateUniversalGroupingQueries(queryClient);
    },
    [globalStore, multiTableStore, queryClient]
  );

  if (!hasSelectableValues && !isLoading) {
    return null;
  }

  return (
    <MetadataCheckboxFilterDropdown
      fieldName={fieldName}
      filterOptions={filterOptions}
      activeFilter={activeFilter}
      onApply={handleApply}
      onClear={handleClear}
      title="Filter by Agent"
      loading={isLoading}
      hasError={!!error}
      placement="end"
      searchPlaceholder="Search agents..."
      emptyStateLabel="No agents found"
      renderTrigger={({ setTriggerElement, isOpen, activeCount, totalCount, onToggle }) => (
        <Tooltip
          title={ACTION_BAR_AGENT_FILTER_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className={TOOLTIP_POPOVER_CLASS}
        >
          <button
            type="button"
            ref={(node) => setTriggerElement(node)}
            onClick={onToggle}
            className={`flex h-6 items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 py-0 text-xs transition-colors xl:px-2 dark:bg-[var(--dm-bg-surface)] dark:border-[var(--dm-border)] ${
              activeCount !== null && activeCount < totalCount
                ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]'
            }`}
          >
            <ApolloIcon name="user" className="text-xs" />
            {!iconOnly && <span className="hidden whitespace-nowrap xl:inline">Agent</span>}
            <ApolloIcon
              name={isOpen ? 'dropdown-up-large' : 'dropdown-large'}
              className="text-xs"
            />
          </button>
        </Tooltip>
      )}
    />
  );
};

export default AgentFilterDropdown;
