import React from 'react';
import { flexRender, HeaderGroup } from '@tanstack/react-table';
import classNames from 'classnames';
import Table from '@/components/ui/Table';
import ColumnHeaderFilter from './ColumnHeaderFilter';
import ColumnHeaderMetadataCheckboxFilter from './ColumnHeaderMetadataCheckboxFilter';
import ColumnHeaderGroupBy from './ColumnHeaderGroupBy';
import type { MetadataFilterOption, MetadataGroupOption } from '@/stores/filterStateStore';
import type { ColumnFilterValue, ColumnToFieldMap, FieldValueLabels } from './ColumnHeaderFilter';
import {
  DEFAULT_COLUMN_HEADER_FILTER_RENDERERS,
  DEFAULT_GROUP_BY_ICON_PLACEMENT,
  type ColumnHeaderFilterRenderers,
  type GroupByIconPlacement,
} from '../types';

const { Tr, Th, THead, Sorter } = Table;

interface DataTableHeaderProps<T> {
  headerGroups: HeaderGroup<T>[];
  loading?: boolean;
  tableHeaderClassName?: string;
  resizingColumnId?: string | null;
  enableColumnResizing?: boolean;
  createResizeHandler: (columnId: string, side?: 'left' | 'right') => (e: React.MouseEvent) => void;
  columnSizing: Record<string, number>;
  headerSticky?: boolean;
  flexColumnId?: string | null;
  tableLayout?: 'auto' | 'fixed';
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

export function DataTableHeader<T>({
  headerGroups,
  loading,
  tableHeaderClassName,
  resizingColumnId,
  enableColumnResizing,
  createResizeHandler,
  columnSizing,
  headerSticky,
  flexColumnId,
  tableLayout = 'fixed',
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
}: DataTableHeaderProps<T>) {
  const hasColumnFilters =
    columnFilterOptions && columnFilterOptions.length > 0 && onColumnFilterApply && onColumnFilterClear;
  const hasColumnGrouping =
    columnGroupOptions && columnGroupOptions.length > 0 && onToggleGroupBy;
  const showColumnHeaderGroupByIcon =
    groupByIconPlacement === 'header' || groupByIconPlacement === 'both';
  const showGroupByInFilterDropdown =
    groupByIconPlacement === 'filter' || groupByIconPlacement === 'both';
  return (
    <THead headerSticky={headerSticky}>
      {headerGroups.map((headerGroup) => (
        <Tr key={headerGroup.id}>
          {headerGroup.headers.map((header, index) => {
            // @ts-expect-error: 'style' is not typed in ColumnMeta
            const columnStyle = header?.column?.columnDef?.meta?.style || {};
            const metadataField = columnToFieldMap?.[header.id] || header.id;
            const columnFilterRenderer =
              columnHeaderFilterRenderers[metadataField] ||
              columnHeaderFilterRenderers[header.id] ||
              'default';
            const hasCheckboxFilterOptions = !!columnFilterOptions?.find(
              (filterOption) =>
                filterOption.field === metadataField &&
                Array.isArray(filterOption.values) &&
                filterOption.values.length > 0
            );
            const columnWidth = columnSizing[header?.id] || header?.getSize() || 150;
            const canResize = header?.column?.getCanResize();

            // For auto layout, use min-width as the primary constraint (more reliable)
            // For fixed layout, use width as the primary constraint
            const minSize = header?.column?.columnDef?.minSize || 10;
            const maxSize = header?.column?.columnDef?.maxSize || 1000;
            const isAutoLayout = tableLayout === 'auto';

            return (
              <Th
                key={header?.id}
                colSpan={header?.colSpan}
                data-column-id={header?.id}
                className="relative overflow-hidden whitespace-nowrap"
                style={{
                  ...columnStyle,
                  // In auto layout, min-width is more reliable than width
                  ...(isAutoLayout
                    ? {
                        minWidth: Math.max(minSize, columnWidth),
                        maxWidth: Math.min(maxSize, columnWidth),
                        width: columnWidth, // Still set width as a hint
                      }
                    : {
                        width: columnWidth,
                        minWidth: minSize,
                        maxWidth: maxSize,
                      }),
                }}
              >
                {header.isPlaceholder ? null : (
                  <div
                    className={classNames(
                      'group flex items-center gap-0.5',
                      (header?.id === 'select' || header?.id === 'checkbox') && 'w-full min-w-0',
                      header?.column?.getCanSort() && 'point cursor-pointer select-none',
                      loading && 'pointer-events-none',
                      tableHeaderClassName && tableHeaderClassName,
                      'line-clamp-1',
                      resizingColumnId === header?.id && 'resizing-column',
                      (header?.column?.columnDef?.meta as { headerAlign?: string })?.headerAlign === 'center' &&
                        'justify-center'
                    )}
                    onClick={header?.column?.getToggleSortingHandler()}
                  >
                    <span
                      className={classNames(
                        'truncate',
                        (header?.id === 'select' || header?.id === 'checkbox') && 'min-w-0 flex-1'
                      )}
                    >
                      {flexRender(header?.column?.columnDef?.header, header?.getContext())}
                    </span>
                    {header?.column?.getCanSort() && (
                      <Sorter sort={header?.column?.getIsSorted()} />
                    )}
                    {hasColumnFilters && columnFilterRenderer === 'metadata_checkbox' && hasCheckboxFilterOptions && (
                      <ColumnHeaderMetadataCheckboxFilter
                        columnId={header.id}
                        filterOptions={columnFilterOptions}
                        activeFilter={activeColumnFilters?.[metadataField] || null}
                        onApply={onColumnFilterApply}
                        onClear={onColumnFilterClear}
                        columnToFieldMap={columnToFieldMap}
                        fieldValueLabels={fieldValueLabels}
                        groupOptions={columnGroupOptions}
                        activeGroupBy={activeGroupBy || []}
                        onToggleGroupBy={onToggleGroupBy}
                        showGroupByInDropdown={showGroupByInFilterDropdown}
                      />
                    )}
                    {hasColumnFilters && (columnFilterRenderer !== 'metadata_checkbox' || !hasCheckboxFilterOptions) && (
                      <ColumnHeaderFilter
                        columnId={header.id}
                        filterOptions={columnFilterOptions}
                        activeFilter={activeColumnFilters?.[metadataField] || null}
                        onApply={onColumnFilterApply}
                        onClear={onColumnFilterClear}
                        columnToFieldMap={columnToFieldMap}
                        fieldValueLabels={fieldValueLabels}
                        groupOptions={columnGroupOptions}
                        activeGroupBy={activeGroupBy || []}
                        onToggleGroupBy={onToggleGroupBy}
                        showGroupByInDropdown={showGroupByInFilterDropdown}
                      />
                    )}
                    {hasColumnGrouping && showColumnHeaderGroupByIcon && (
                      <ColumnHeaderGroupBy
                        columnId={header.id}
                        groupOptions={columnGroupOptions}
                        activeGroupBy={activeGroupBy || []}
                        onToggleGroupBy={onToggleGroupBy}
                        columnToFieldMap={columnToFieldMap}
                      />
                    )}
                  </div>
                )}
                {/* Column resize handle */}
                {enableColumnResizing && canResize && (
                  <>
                    <div
                      className="resize-handle"
                      onMouseDown={createResizeHandler(header?.id)}
                      title="Resize column"
                      data-resizing-column-id={header?.id}
                    />
                  </>
                )}
              </Th>
            );
          })}
        </Tr>
      ))}
    </THead>
  );
}
