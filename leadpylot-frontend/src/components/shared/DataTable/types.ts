import type { ColumnDef as TanstackColumnDef, ColumnSort, Row } from '@tanstack/react-table';
import type { SkeletonProps } from '@/components/ui/Skeleton';
import type { Ref, ReactNode, ChangeEvent } from 'react';
import type { CheckboxProps } from '@/components/ui/Checkbox';
import type { TableProps } from '@/components/ui/Table';
import type { MetadataFilterOption, MetadataGroupOption } from '@/stores/filterStateStore';
import type { ColumnFilterValue, ColumnToFieldMap, FieldValueLabels } from './components/ColumnHeaderFilter';

export type OnSortParam = { order: 'asc' | 'desc' | ''; key: string | number };
export type GroupByIconPlacement = 'header' | 'filter' | 'both' | 'none';
export const DEFAULT_GROUP_BY_ICON_PLACEMENT: GroupByIconPlacement = 'header';
export type ColumnHeaderFilterRenderer = 'default' | 'metadata_checkbox';
export type ColumnHeaderFilterRenderers = Partial<Record<string, ColumnHeaderFilterRenderer>>;
export const DEFAULT_COLUMN_HEADER_FILTER_RENDERERS: ColumnHeaderFilterRenderers = {};

// Custom ColumnDef that extends TanStack's ColumnDef with columnWidth and style
export type ColumnDef<T, K = any> = TanstackColumnDef<T, K> & {
  columnWidth?: number | string;
  style?: React.CSSProperties;
};

export type DataTableResetHandle = {
  resetSorting: () => void;
  resetSelected: () => void;
  resetColumnSizing: () => void;
};

export type DataTableProps<T> = {
  columns: ColumnDef<T, any>[];
  customNoDataIcon?: ReactNode;
  data?: unknown[];
  loading?: boolean;
  noData?: boolean;
  instanceId?: string;
  onCheckBoxChange?: (checked: boolean, row: T) => void;
  onIndeterminateCheckBoxChange?: (checked: boolean, rows: Row<T>[]) => void;
  onPaginationChange?: (page: number) => void;
  onSelectChange?: (num: number) => void;
  onSort?: (sort: OnSortParam) => void;
  pageSizes?: number[];
  selectable?: boolean;
  skeletonAvatarColumns?: number[];
  skeletonAvatarProps?: SkeletonProps;
  tableClassName?: string;
  pagingData?: {
    total: number;
    pageIndex: number;
    pageSize: number;
  };
  showPagination?: boolean;
  checkboxChecked?: (row: T) => boolean;
  indeterminateCheckboxChecked?: (row: Row<T>[]) => boolean;
  ref?: Ref<DataTableResetHandle | HTMLTableElement>;
  onRowClick?: (row: Row<T>) => void;
  rowClassName?: string | ((row: Row<T>) => string);
  renderExpandedRow?: (row: Row<T>) => React.ReactNode | null;
  tableHeaderClassName?: string;
  showHeader?: boolean;
  headerSticky?: boolean;
  fixedHeight?: string | number;
  // External sorting control props
  externalSorting?: ColumnSort[];
  onExternalSortingChange?: (sorting: ColumnSort[]) => void;
  // Table zoom functionality
  enableZoom?: boolean;
  // Automatically increase page size on zoom-out to reduce whitespace
  autoFitRowsOnZoom?: boolean;
  // Column resizing functionality (enabled by default)
  enableColumnResizing?: boolean;
  // Draw a parent->child flow connector inside expanded rows
  parentChildConnector?: boolean;
  parentChildConnectorElbowOffset?: number;
  parentChildConnectorLeftAdjust?: number;
  // Drag and drop props
  enableDragDrop?: boolean;
  dragDropTableId?: string;
  onDragEnd?: (result: any) => void;
  // Dynamic column sizing - when true, columns fit dynamically to fill space (old behavior)
  // When false (default), columns use fixed widths with last column absorbing remaining space
  // Auto-enabled for screens > 3xl (1920px)
  dynamicallyColumnSizeFit?: boolean;
  // When true, during resize only the resized column changes; others stay fixed (disables dynamic fit while dragging)
  hybridResize?: boolean;
  // Grouped mode props
  groupedMode?: boolean;
  groupedData?: Array<{
    groupId: string;
    groupName: string;
    fieldName?: string;
    count: number;
    subGroups?: any[];
  }>;
  entityType?: string;
  groupByFields?: string[];
  skeletonRowMultiple?: number;
  tableProgressFilter?: string;
  search?: string | null; // Search term from ActionBar for group details
  tableLayout?: 'fixed' | 'auto';
  loadingRowSize?: number;
  // Column header filter props
  columnFilterOptions?: MetadataFilterOption[];
  activeColumnFilters?: Record<string, ColumnFilterValue>;
  onColumnFilterApply?: (fieldName: string, operator: string, value: any) => void;
  onColumnFilterClear?: (fieldName: string) => void;
  columnToFieldMap?: ColumnToFieldMap;
  fieldValueLabels?: FieldValueLabels;
  columnHeaderFilterRenderers?: ColumnHeaderFilterRenderers;
  // Column header group-by props
  columnGroupOptions?: MetadataGroupOption[];
  activeGroupBy?: string[];
  onToggleGroupBy?: (field: string) => void;
  groupByIconPlacement?: GroupByIconPlacement;
} & TableProps;

export type CheckBoxChangeEvent = ChangeEvent<HTMLInputElement>;

export interface IndeterminateCheckboxProps extends Omit<CheckboxProps, 'onChange'> {
  onChange: (event: CheckBoxChangeEvent) => void;
  indeterminate: boolean;
  onCheckBoxChange?: (event: CheckBoxChangeEvent) => void;
  onIndeterminateCheckBoxChange?: (event: CheckBoxChangeEvent) => void;
}
