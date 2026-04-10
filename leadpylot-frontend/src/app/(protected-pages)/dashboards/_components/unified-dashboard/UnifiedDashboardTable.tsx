'use client';

/**
 * UnifiedDashboardTable - Renders BaseTable with dashboard-specific props.
 * Receives table config from useBaseTable and adds grouping, entity type, and filter props.
 * buildApiFilters comes from FilterContext (FilterProvider wraps this component).
 */
import React from 'react';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useFilterContext } from '@/contexts/FilterContext';
import type { MetadataFilterOption, MetadataGroupOption } from '@/stores/filterStateStore';
import type { ColumnFilterValue, ColumnToFieldMap, FieldValueLabels } from '@/components/shared/DataTable/components/ColumnHeaderFilter';
import {
  DEFAULT_COLUMN_HEADER_FILTER_RENDERERS,
  DEFAULT_GROUP_BY_ICON_PLACEMENT,
  type ColumnHeaderFilterRenderers,
  type GroupByIconPlacement,
} from '@/components/shared/DataTable/types';

interface UnifiedDashboardTableProps {
  tableConfig: Record<string, any>;
  forceUpdate: number;
  domainFilters: any[];
  effectiveGroupBy: string[];
  isMultiTableMode: boolean;
  groupedData: any[];
  entityType: string;
  hasProgressForGrouping?: string;
  search?: string | null;
  columnFilterOptions?: MetadataFilterOption[];
  activeColumnFilters?: Record<string, ColumnFilterValue>;
  onColumnFilterApply?: (fieldName: string, operator: string, value: any) => void;
  onColumnFilterClear?: (fieldName: string) => void;
  columnToFieldMap?: ColumnToFieldMap;
  fieldValueLabels?: FieldValueLabels;
  columnHeaderFilterRenderers?: ColumnHeaderFilterRenderers;
  columnGroupOptions?: MetadataGroupOption[];
  activeGroupBy?: string[];
  onToggleGroupBy?: (field: string) => void;
  groupByIconPlacement?: GroupByIconPlacement;
}

export function UnifiedDashboardTable({
  tableConfig,
  forceUpdate,
  domainFilters,
  effectiveGroupBy,
  isMultiTableMode,
  groupedData,
  entityType,
  hasProgressForGrouping,
  search,
  columnFilterOptions,
  activeColumnFilters,
  onColumnFilterApply,
  onColumnFilterClear,
  columnToFieldMap,
  fieldValueLabels,
  columnHeaderFilterRenderers = DEFAULT_COLUMN_HEADER_FILTER_RENDERERS,
  columnGroupOptions,
  activeGroupBy,
  onToggleGroupBy,
  groupByIconPlacement = DEFAULT_GROUP_BY_ICON_PLACEMENT,
}: UnifiedDashboardTableProps) {
  const { buildApiFilters } = useFilterContext();
  const groupedMode = effectiveGroupBy.length > 0 && !isMultiTableMode;

  return (
    <BaseTable
      {...(tableConfig as any)}
      key={forceUpdate}
      buildApiFilters={buildApiFilters}
      selectionResetKey={JSON.stringify(domainFilters)}
      groupedMode={groupedMode}
      groupedData={groupedData}
      entityType={entityType}
      groupByFields={effectiveGroupBy}
      tableProgressFilter={hasProgressForGrouping}
      search={search || undefined}
      columnFilterOptions={columnFilterOptions}
      activeColumnFilters={activeColumnFilters}
      onColumnFilterApply={onColumnFilterApply}
      onColumnFilterClear={onColumnFilterClear}
      columnToFieldMap={columnToFieldMap}
      fieldValueLabels={fieldValueLabels}
      columnHeaderFilterRenderers={columnHeaderFilterRenderers}
      columnGroupOptions={columnGroupOptions}
      activeGroupBy={activeGroupBy}
      onToggleGroupBy={onToggleGroupBy}
      groupByIconPlacement={groupByIconPlacement}
    />
  );
}
