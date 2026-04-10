'use client';

import React, { useMemo } from 'react';
import { FaFilter } from 'react-icons/fa';
import type { MetadataFilterOption, MetadataGroupOption } from '@/stores/filterStateStore';
import MetadataCheckboxFilterDropdown from '@/components/shared/filters/MetadataCheckboxFilterDropdown';
import ColumnHeaderGroupBy from './ColumnHeaderGroupBy';
import type { ColumnFilterValue, ColumnToFieldMap, FieldValueLabels } from './ColumnHeaderFilter';

interface ColumnHeaderMetadataCheckboxFilterProps {
  columnId: string;
  filterOptions: MetadataFilterOption[];
  activeFilter?: ColumnFilterValue | null;
  onApply: (fieldName: string, operator: string, value: any) => void;
  onClear: (fieldName: string) => void;
  columnToFieldMap?: ColumnToFieldMap;
  fieldValueLabels?: FieldValueLabels;
  groupOptions?: MetadataGroupOption[];
  activeGroupBy?: string[];
  onToggleGroupBy?: (field: string) => void;
  showGroupByInDropdown?: boolean;
}

export default function ColumnHeaderMetadataCheckboxFilter({
  columnId,
  filterOptions,
  activeFilter,
  onApply,
  onClear,
  columnToFieldMap,
  fieldValueLabels,
  groupOptions,
  activeGroupBy,
  onToggleGroupBy,
  showGroupByInDropdown = false,
}: ColumnHeaderMetadataCheckboxFilterProps) {
  const metadataField = columnToFieldMap?.[columnId] || columnId;
  const hasActiveGroupBy = !!(showGroupByInDropdown && activeGroupBy?.includes(metadataField));

  const headerAction = useMemo(() => {
    if (!showGroupByInDropdown || !onToggleGroupBy || !groupOptions?.length) {
      return null;
    }

    return (
      <ColumnHeaderGroupBy
        columnId={columnId}
        groupOptions={groupOptions}
        activeGroupBy={activeGroupBy || []}
        onToggleGroupBy={onToggleGroupBy}
        columnToFieldMap={columnToFieldMap}
        alwaysVisible
        renderAsOutlineButton
      />
    );
  }, [
    activeGroupBy,
    columnId,
    columnToFieldMap,
    groupOptions,
    onToggleGroupBy,
    showGroupByInDropdown,
  ]);

  return (
    <MetadataCheckboxFilterDropdown
      fieldName={metadataField}
      filterOptions={filterOptions}
      activeFilter={activeFilter}
      onApply={onApply}
      onClear={onClear}
      fieldValueLabels={fieldValueLabels}
      title={filterOptions.find((filterOption) => filterOption.field === metadataField)?.label}
      headerAction={headerAction}
      externalTriggerActive={hasActiveGroupBy || undefined}
      renderTrigger={({ setTriggerElement, isActive, onToggle }) => (
        <div
          ref={setTriggerElement}
          className="ml-0.5 inline-flex shrink-0 cursor-pointer items-center"
          onClick={onToggle}
          title="Filter this column"
        >
          <FaFilter
            className={`text-[11px] ${isActive ? 'text-blue-500' : 'text-gray-400 opacity-0 group-hover:opacity-100'} transition-opacity`}
          />
        </div>
      )}
    />
  );
}
