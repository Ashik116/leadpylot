import { useMemo } from 'react';
import { ColumnDef, Row } from '@/components/shared/DataTable';
import { getPaginationOptions } from '@/utils/paginationNumber';

export interface UseBaseTableConfig<T = any> {
  // Table identification
  tableLayout?: 'fixed' | 'auto';
  enableColumnResizing?: boolean;
  tableName: string;
  dynamicallyColumnSizeFit?: boolean;
  hybridResize?: boolean;
  isBackendSortingReady?: boolean;
  selectedRows?: any;
  onSelectedRowsChange?: (selectedRows: any) => void;
  headerSticky?: boolean;
  saveCurentPageColumnToStore?: boolean;
  // Data configuration
  data?: T[];
  loading?: boolean;
  totalItems?: number;

  // Pagination configuration
  pageIndex?: number;
  pageSize?: number;
  pageSizes?: number[];
  onPaginationChange?: (pageIndex: number, pageSize: number, search?: any) => void;
  // Search configuration
  search?: string;
  searchPlaceholder?: string;
  actionBindUrlInQuery?: boolean;
  // Column configuration
  columns: ColumnDef<T>[];

  // Bulk actions configuration
  bulkActionsConfig?: {
    entityName: string;
    deleteUrl: string;
    invalidateQueries?: string[];
    apiData?: any[];
    // Single delete configuration
    singleDeleteConfig?: {
      deleteFunction: (id: string) => Promise<any>;
      onSuccess?: (response: any, deletedId: string) => void;
      onError?: (error: any) => void;
    };
  };
  defaultPageSize?: number;
  // Row selection configuration
  selectable?: boolean;
  rowIdField?: string;
  returnFullObjects?: boolean;

  // Global select all configuration
  globalSelectAll?: {
    enabled: boolean;
    onSelectAllData: () => Promise<string[]>; // Function to get all data IDs
    onDeselectAllData: () => void; // Function to clear all selections
  };

  // Row interaction
  onRowClick?: (row: T) => void;

  rowClassName?: string | ((row: Row<T>) => string);

  // Sorting
  sortKey?: string;
  order?: string;

  // Custom actions (render prop receives setDeleteConfirmOpen when bulk delete is configured)
  customActions?:
    | React.ReactNode
    | ((props: { setDeleteConfirmOpen: (open: boolean) => void }) => React.ReactNode);

  // Table height
  tableClassName?: string;
  fixedHeight?: string | number;

  // Additional props
  noData?: boolean;
  customNoDataIcon?: React.ReactNode;
  showPagination?: boolean;

  // Expanded row functionality
  renderExpandedRow?: (row: Row<T>) => React.ReactNode | null;

  // Group by functionality
  selectedGroupBy?: string[];
  onGroupByChange?: (groupBy: string[]) => void;
  onClearGroupBy?: () => void;
  hasSelectedGroupBy?: boolean;
  hasUserAddedGroupBy?: boolean;
  // Multi Level Grouping functionality
  isMultiLevelGroupingApplied?: boolean;
  onMultiLevelGrouping?: () => void;

  // UI elements
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  headerActions?: React.ReactNode;
  footerContent?: React.ReactNode;
  deleteButton?: boolean;
  showNavigation?: boolean;
  showSearchInActionBar?: boolean;
  showActionsDropdown?: boolean;
  // New prop for select all
  onSelectAll?: () => void | Promise<void>;
  showHeader?: boolean;
  extraActions?: React.ReactNode;
  preservedFields?: string[];
  actionShowOptions?: boolean;
  // New prop for determining if all items are selected (for CommonActionBar toggle)
  isAllItemsSelected?: boolean;
  // New prop for FilterBtn component (for UnifiedDashboard)
  filterBtnComponent?: React.ReactNode;
  // Stage group-by quick button (opt-in)
  showStageGroupByButton?: boolean;
  // Table zoom functionality
  enableZoom?: boolean;
  autoFitRowsOnZoom?: boolean;

  // New: Update global page header
  setPageInfoFromBaseTable?: boolean;
  pageInfoTitle?: string;
  pageInfoSubtitlePrefix?: string;
  isMySelf?: boolean;
  // Transferred Offer filter props
  showTransferredOfferButton?: boolean;
  hasTransferredOffer?: boolean;
  onTransferredOfferToggle?: () => void;
  // Section title to show in action bar
  sectionTitle?: string;
  // Left content in action bar (title, count, etc.)
  leftCommonActions?: React.ReactNode;
  // Content to the left of CommonActionBar (e.g. tabs)
  actionBarLeftContent?: React.ReactNode;
  // Drag and drop props
  enableDragDrop?: boolean;
  dragDropTableId?: string;
  cardClassName?: string;
}

export interface UseBaseTableReturn<T = any> {
  // Table configuration
  tableLayout?: 'fixed' | 'auto';
  enableColumnResizing?: boolean;
  tableName: string;
  dynamicallyColumnSizeFit?: boolean;
  isBackendSortingReady?: boolean;
  actionBindUrlInQuery?: boolean;
  headerSticky?: boolean;
  selectedRows?: any;
  onSelectedRowsChange?: (selectedRows: any) => void;
  onPaginationChange?: (pageIndex: number, pageSize: number, search?: any) => void;
  data: T[];
  loading: boolean;
  totalItems: number;
  showSearchInActionBar?: boolean;
  hybridResize?: boolean;
  // Pagination
  pageIndex: number;
  pageSize: number;
  pageSizes: number[];
  saveCurentPageColumnToStore?: boolean;
  // Search
  search: string;
  searchPlaceholder: string;

  // Columns
  columns: ColumnDef<T>[];

  // Bulk actions
  bulkActionsConfig?: {
    entityName: string;
    deleteUrl: string;
    invalidateQueries?: string[];
    // Single delete configuration
    singleDeleteConfig?: {
      deleteFunction: (id: string) => Promise<any>;
      onSuccess?: (response: any, deletedId: string) => void;
      onError?: (error: any) => void;
    };
  };

  // Row selection
  selectable: boolean;
  rowIdField: string;
  returnFullObjects?: boolean;

  // Row interaction
  onRowClick?: (row: T) => void;
  rowClassName: string | ((row: Row<T>) => string);

  // Sorting
  sortKey?: string;
  order?: string;

  // Custom actions (render prop receives setDeleteConfirmOpen when bulk delete is configured)
  customActions?:
    | React.ReactNode
    | ((props: { setDeleteConfirmOpen: (open: boolean) => void }) => React.ReactNode);

  // Table display
  tableClassName: string;
  fixedHeight?: string | number;
  noData: boolean;
  customNoDataIcon?: React.ReactNode;
  showPagination: boolean;
  showNavigation?: boolean;
  // Expanded row functionality
  renderExpandedRow?: (row: Row<T>) => React.ReactNode | null;

  // Group by functionality
  selectedGroupBy?: string[];
  onGroupByChange?: (groupBy: string[]) => void;
  onClearGroupBy?: () => void;
  hasSelectedGroupBy?: boolean;
  hasUserAddedGroupBy?: boolean;
  // Multi Level Grouping functionality
  isMultiLevelGroupingApplied?: boolean;
  onMultiLevelGrouping?: () => void;

  // UI elements
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  headerActions?: React.ReactNode;
  footerContent?: React.ReactNode;
  deleteButton?: boolean;
  showActionsDropdown?: boolean;
  // New prop for select all
  onSelectAll?: () => void | Promise<void>;
  showHeader?: boolean;
  extraActions?: React.ReactNode;
  preservedFields?: string[];
  actionShowOptions?: boolean;
  // New prop for determining if all items are selected (for CommonActionBar toggle)
  isAllItemsSelected?: boolean;
  // New prop for FilterBtn component (for UnifiedDashboard)
  filterBtnComponent?: React.ReactNode;
  // Stage group-by quick button (opt-in)
  showStageGroupByButton?: boolean;
  // Table zoom functionality
  enableZoom?: boolean;
  autoFitRowsOnZoom?: boolean;

  // Pass-through: page info options
  setPageInfoFromBaseTable?: boolean;
  pageInfoTitle?: string;
  pageInfoSubtitlePrefix?: string;

  // Global select all configuration
  globalSelectAll?: {
    enabled: boolean;
    onSelectAllData: () => Promise<string[]>; // Function to get all data IDs
    onDeselectAllData: () => void; // Function to clear all selections
  };
  isMySelf?: boolean;
  // Transferred Offer filter props
  showTransferredOfferButton?: boolean;
  hasTransferredOffer?: boolean;
  onTransferredOfferToggle?: () => void;
  // Section title to show in action bar
  sectionTitle?: string;
  // Left content in action bar (title, count, etc.)
  leftCommonActions?: React.ReactNode;
  // Content to the left of CommonActionBar (e.g. tabs)
  actionBarLeftContent?: React.ReactNode;
  // Drag and drop props
  enableDragDrop?: boolean;
  dragDropTableId?: string;
  cardClassName?: string;
}

export const useBaseTable = <T extends Record<string, any> = any>(
  config: UseBaseTableConfig<T>
): UseBaseTableReturn<T> => {
  // Extract configuration with defaults
  const {
    tableLayout,
    enableColumnResizing,
    tableName,
    dynamicallyColumnSizeFit,
    isBackendSortingReady,
    selectedRows,
    headerSticky = true,
    saveCurentPageColumnToStore,
    data = [],
    loading = false,
    totalItems = 0,
    pageIndex = 1,
    pageSize = 10,
    pageSizes,
    search = '',
    searchPlaceholder = 'Search...',
    columns,
    bulkActionsConfig,
    selectable = false,
    rowIdField = '_id',
    onPaginationChange,
    onRowClick,
    rowClassName = 'cursor-pointer hover:bg-gray-50',
    sortKey,
    order,
    customActions,
    tableClassName = 'max-h-[65dvh]',
    fixedHeight = 'auto',
    noData = false,
    customNoDataIcon,
    showPagination = true,
    showNavigation = true,
    renderExpandedRow,
    title,
    description,
    headerActions,
    footerContent,
    deleteButton = true,
    returnFullObjects,
    showSearchInActionBar = true,
    showActionsDropdown = true,
    onSelectAll,
    onSelectedRowsChange,
    showHeader = true,
    extraActions,
    actionBindUrlInQuery = true,
    selectedGroupBy,
    onGroupByChange,
    onClearGroupBy,
    hasSelectedGroupBy,
    hasUserAddedGroupBy,
    // Multi Level Grouping functionality
    isMultiLevelGroupingApplied,
    onMultiLevelGrouping,
    preservedFields,
    actionShowOptions,
    // new page info
    setPageInfoFromBaseTable,
    pageInfoTitle,
    pageInfoSubtitlePrefix,
    // global select all
    globalSelectAll,
    // New prop for determining if all items are selected (for CommonActionBar toggle)
    isAllItemsSelected,
    // New prop for FilterBtn component (for UnifiedDashboard)
    filterBtnComponent,
    showStageGroupByButton,
    isMySelf,
    // Table zoom functionality
    enableZoom,
    autoFitRowsOnZoom,
    // Transferred Offer filter props
    showTransferredOfferButton,
    hasTransferredOffer,
    onTransferredOfferToggle,
    // Section title for action bar
    sectionTitle,
    leftCommonActions,
    actionBarLeftContent,
    // Drag and drop
    enableDragDrop,
    dragDropTableId,
    cardClassName,
    hybridResize,
  } = config;

  // Compute pagination options
  const computedPageSizes = useMemo(
    () => pageSizes || getPaginationOptions(totalItems),
    [pageSizes, totalItems]
  );

  return {
    deleteButton,
    selectedRows,
    dynamicallyColumnSizeFit,
    isBackendSortingReady,
    // Table configuration
    tableName,
    actionBindUrlInQuery,
    data,
    loading,
    totalItems,

    // Pagination
    pageIndex,
    pageSize,
    pageSizes: computedPageSizes,
    onPaginationChange,
    // Search
    search,
    searchPlaceholder,

    // Columns
    columns,

    // Bulk actions
    bulkActionsConfig,

    // Row selection
    selectable,
    rowIdField,
    returnFullObjects,
    headerSticky,
    // Row interaction
    onRowClick,
    rowClassName,

    // Sorting
    sortKey,
    order,

    // Custom actions
    customActions,

    // Table display
    tableClassName,
    fixedHeight,
    noData,
    customNoDataIcon,
    showPagination,
    showNavigation,
    // Expanded row functionality
    renderExpandedRow,

    // Group by functionality
    selectedGroupBy,
    onGroupByChange,
    onClearGroupBy,
    hasSelectedGroupBy,
    hasUserAddedGroupBy,
    // Multi Level Grouping functionality
    isMultiLevelGroupingApplied,
    onMultiLevelGrouping,

    // UI elements
    title,
    description,
    headerActions,
    footerContent,
    showSearchInActionBar,
    showActionsDropdown,
    onSelectAll,
    onSelectedRowsChange,
    showHeader,
    extraActions,
    saveCurentPageColumnToStore,
    preservedFields,
    actionShowOptions,
    // New prop for determining if all items are selected (for CommonActionBar toggle)
    isAllItemsSelected,
    // New prop for FilterBtn component (for UnifiedDashboard)
    filterBtnComponent,
    showStageGroupByButton,
    // Table zoom functionality
    enableZoom,
    autoFitRowsOnZoom,

    // Pass-through
    setPageInfoFromBaseTable,
    pageInfoTitle,
    pageInfoSubtitlePrefix,
    globalSelectAll,
    isMySelf,
    // Transferred Offer filter props
    showTransferredOfferButton,
    hasTransferredOffer,
    onTransferredOfferToggle,
    // Section title for action bar
    sectionTitle,
    leftCommonActions,
    actionBarLeftContent,
    // Drag and drop
    enableDragDrop,
    dragDropTableId,
    cardClassName,
    hybridResize,
    enableColumnResizing,
    tableLayout,
  };
};
