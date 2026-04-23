'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ColumnDef, OnSortParam, Row } from '@/components/shared/DataTable';
import CommonActionBar from '@/components/shared/ActionBar/CommonActionBar';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useColumnCustomization } from '@/hooks/useColumnCustomization';
import { useBulkActions } from '@/hooks/useBulkActions';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
import { getPaginationOptions } from '@/utils/paginationNumber';
import { useSelectedRows } from './useSelectedRows';
import { useCurrentPageColumnsStore } from '@/stores/currentPageColumnsStore';
import useFrontendSorting from '@/hooks/useFrontendSorting';
import { usePageInfoStore } from '@/stores/pageInfoStore';
import { useAuth } from '@/hooks/useAuth';
import { useGroupedVisibleLeadsStore } from '@/stores/groupedVisibleLeadsStore';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import { useMultiTableFilterStore } from '@/stores/multiTableFilterStore';
import { hasMeaningfulDomainFilters } from '@/utils/filterUtils';
import DataTableOptimized from '../DataTableOptimizedVersion/DataTableOptimized';
import {
  DEFAULT_COLUMN_HEADER_FILTER_RENDERERS,
  DEFAULT_GROUP_BY_ICON_PLACEMENT,
  type ColumnHeaderFilterRenderers,
  type GroupByIconPlacement,
} from '../DataTable/types';

export interface BaseTableConfig<T = any> {
  tableLayout?: 'fixed' | 'auto';
  // Table identification
  tableName: string;

  // Data configuration
  data?: T[];
  loading?: boolean;
  totalItems?: number;

  // Pagination configuration
  pageIndex: number;
  pageSize: number;
  pageSizes?: number[];

  // Search configuration
  search?: string;
  searchPlaceholder?: string;

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
  deleteButton?: boolean;

  // Additional props
  noData?: boolean;
  customNoDataIcon?: React.ReactNode;
  showPagination?: boolean;
  showNavigation?: boolean;
  // Expanded row functionality
  renderExpandedRow?: (row: Row<T>) => React.ReactNode | null;

  // Search in action bar
  showSearchInActionBar?: boolean;
  showActionsDropdown?: boolean;
  // New prop for select all
  onSelectAll?: () => void | Promise<void>;
  isBackendSortingReady?: boolean; // Add this prop to toggle between client and backend sorting
  // Table header visibility
  showHeader?: boolean;
  extraActions?: React.ReactNode;
  actionBindUrlInQuery?: boolean;
  onPaginationChange?: (pageIndex: number, pageSize: number, search?: any) => void;

  // Optional: Update global page header
  setPageInfoFromBaseTable?: boolean;
  pageInfoTitle?: string; // fallback to string title prop if provided
  pageInfoSubtitlePrefix?: string; // default 'Total'
  isMySelf?: boolean;
  // Reset selection when this key changes (e.g., filters applied)
  selectionResetKey?: string | number;
}

export interface BaseTableProps<T = any> extends BaseTableConfig<T> {
  hybridResize?: boolean;
  // Optional title and description
  title?: React.ReactNode;
  description?: React.ReactNode;
  showActionComponent?: boolean;
  showActionsDropdown?: boolean;
  styleColumnSorting?: string;
  showCustomActions?: boolean;
  // Optional header actions
  headerActions?: React.ReactNode;

  // Optional footer content
  footerContent?: React.ReactNode;
  showFilterLeadsBtn?: boolean;
  // New prop for select all
  onSelectAll?: () => void | Promise<void>;
  selectedRows?: any;
  onSelectedRowsChange?: (selectedRows: any) => void;
  headerSticky?: boolean;
  actionShowOptions?: boolean;
  // New prop for determining if all items are selected (for CommonActionBar toggle)
  isAllItemsSelected?: boolean;
  // For multi-table pages, unique identifier for table-specific FilterTags
  tableId?: string;
  // Group by functionality
  selectedGroupBy?: string[];
  onGroupByChange?: (groupBy: string[]) => void;
  onClearGroupBy?: () => void;
  hasSelectedGroupBy?: boolean;
  hasUserAddedGroupBy?: boolean;
  // Multi Level Grouping functionality
  isMultiLevelGroupingApplied?: boolean;
  onMultiLevelGrouping?: () => void;
  saveCurentPageColumnToStore?: boolean;
  // if you want to default hide some column or default field. which is array of key_name column
  preservedFields?: string[];
  // New: page info
  setPageInfoFromBaseTable?: boolean;
  pageInfoTitle?: string;
  pageInfoSubtitlePrefix?: string;
  // New prop for FilterBtn component (for UnifiedDashboard)
  filterBtnComponent?: React.ReactNode;
  // Stage group-by quick button (opt-in)
  showStageGroupByButton?: boolean;
  // New prop to completely disable column customization storage
  disableColumnCustomization?: boolean;
  // Table zoom functionality
  enableZoom?: boolean;
  autoFitRowsOnZoom?: boolean;
  // Column resizing functionality (enabled by default)
  enableColumnResizing?: boolean;
  // Transferred Offer filter props
  showTransferredOfferButton?: boolean;
  hasTransferredOffer?: boolean;
  onTransferredOfferToggle?: () => void;
  fixedHeight?: string | number;
  // Section title to show in action bar
  sectionTitle?: string;
  // Optional left content in the action bar row (e.g. "Tasks" + "Create task" on same line as table settings)
  actionBarLeftContent?: React.ReactNode;
  // Drag and drop props
  enableDragDrop?: boolean;
  dragDropTableId?: string; // ID of the table for drag-drop (e.g., 'opening', 'confirmation')
  cardClassName?: string;
  skeletonRowMultiple?: number;
  // Filter chain function for building default filters (for GroupByOptions and CustomFilterOption)
  buildApiFilters?: () => any[];
  // Grouped mode props
  groupedMode?: boolean;
  groupedData?: any[];
  entityType?: string;
  groupByFields?: string[];
  tableProgressFilter?: string;
  // Multi-table mode: When true, this table uses isolated state instead of the global store
  // Use this when you have multiple independent tables on the same page
  multiTableMode?: boolean;
  dynamicallyColumnSizeFit?: boolean;
  loadingRowSize?: number;
  // CommonActionBar classes
  commonActionBarClasses?: string;
  leftCommonActions?: React.ReactNode;
  // When set, portals the selection bar + custom actions to this DOM element (e.g. tab row)
  actionBarPortalTargetId?: string;
  // When set, portals Create Offer + column customization to this target (keeps them fixed when selection bar appears)
  headerActionsPortalTargetId?: string;
  /** When set (e.g. lead details), BaseTable registers its column customization open handler so a parent button can trigger it */
  onRegisterColumnCustomization?: (open: () => void) => void;
  /** Ref for tab row column customization button - used for dropdown positioning */
  externalCustomizeButtonRef?: React.RefObject<HTMLButtonElement | null>;
  showSelectAllButton?: boolean;
  /** When true, renders smaller "item selected" and "Select All" buttons (e.g. for lead details Offers/Openings tabs) */
  compactSelectionButtons?: boolean;
  // Column header filter props
  columnFilterOptions?: import('@/stores/filterStateStore').MetadataFilterOption[];
  activeColumnFilters?: Record<string, import('../DataTable/components/ColumnHeaderFilter').ColumnFilterValue>;
  onColumnFilterApply?: (fieldName: string, operator: string, value: any) => void;
  onColumnFilterClear?: (fieldName: string) => void;
  columnToFieldMap?: import('../DataTable/components/ColumnHeaderFilter').ColumnToFieldMap;
  fieldValueLabels?: import('../DataTable/components/ColumnHeaderFilter').FieldValueLabels;
  columnHeaderFilterRenderers?: ColumnHeaderFilterRenderers;
  // Column header group-by props
  columnGroupOptions?: import('@/stores/filterStateStore').MetadataGroupOption[];
  activeGroupBy?: string[];
  onToggleGroupBy?: (field: string) => void;
  groupByIconPlacement?: GroupByIconPlacement;
}

const BaseTable = <T extends Record<string, any> = any>({
  tableLayout = 'fixed',
  // Table configuration
  tableName,
  tableId,
  actionBindUrlInQuery = true,
  headerSticky = true,
  selectedRows: allSelectedRows,
  onPaginationChange,
  data = [],
  loading = false,
  totalItems = 0,

  // Pagination
  pageIndex,
  pageSize,
  pageSizes,

  // Search
  search = '',
  searchPlaceholder = 'Search...',

  // Columns
  columns = [],

  // Bulk actions
  bulkActionsConfig,

  // Row selection
  selectable = false,
  rowIdField = '_id',
  returnFullObjects,

  // Global select all
  globalSelectAll,

  // Row interaction
  onRowClick,
  rowClassName = 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[var(--dm-bg-hover)]',
  fixedHeight = '85dvh',
  // Drag and drop
  enableDragDrop = false,
  dragDropTableId,

  // Sorting
  // sortKey and order are used by the DataTable component internally

  // Custom actions
  customActions,

  // Table display
  tableClassName = 'max-h-[65dvh]',
  noData = false,
  customNoDataIcon,
  showPagination = true,
  renderExpandedRow,
  showNavigation = true,
  // UI elements
  title,
  description,
  headerActions,
  footerContent,
  showSearchInActionBar = true,
  styleColumnSorting,
  showActionsDropdown = true,
  onSelectAll,
  onSelectedRowsChange,
  isBackendSortingReady = false, // Add this prop to toggle between client and backend sorting
  showHeader = true,
  extraActions,
  showActionComponent = true,
  actionShowOptions = true,
  deleteButton = true,
  // New prop for determining if all items are selected (for CommonActionBar toggle)
  isAllItemsSelected,
  // Group by functionality
  selectedGroupBy,
  onGroupByChange,
  onClearGroupBy,
  hasSelectedGroupBy,
  hasUserAddedGroupBy,
  // Multi Level Grouping functionality
  isMultiLevelGroupingApplied,
  onMultiLevelGrouping,
  saveCurentPageColumnToStore = true,
  // if you want to default hide some column or default field. which is array of key_name column
  preservedFields = [],
  // New: page info
  setPageInfoFromBaseTable = false,
  pageInfoTitle,
  pageInfoSubtitlePrefix,
  filterBtnComponent,
  showStageGroupByButton = false,
  disableColumnCustomization = false,
  isMySelf = false,
  selectionResetKey,
  // Table zoom functionality
  enableZoom = true,
  autoFitRowsOnZoom = true,
  enableColumnResizing = true,
  // Transferred Offer filter props
  showTransferredOfferButton = false,
  hasTransferredOffer = false,
  onTransferredOfferToggle,
  cardClassName,
  // Section title for action bar
  sectionTitle,
  actionBarLeftContent,
  skeletonRowMultiple,
  // Filter chain function for building default filters (for GroupByOptions and CustomFilterOption)
  buildApiFilters,
  // Grouped mode props
  groupedMode = false,
  groupedData,
  entityType,
  groupByFields,
  tableProgressFilter,
  // Multi-table mode: Uses isolated state instead of global store
  multiTableMode = false,
  dynamicallyColumnSizeFit = true,
  loadingRowSize,
  commonActionBarClasses,
  leftCommonActions,
  actionBarPortalTargetId,
  headerActionsPortalTargetId,
  onRegisterColumnCustomization,
  externalCustomizeButtonRef,
  showSelectAllButton = true,
  compactSelectionButtons = false,
  hybridResize = false,
  // Column header filter props
  columnFilterOptions,
  activeColumnFilters,
  onColumnFilterApply,
  onColumnFilterClear,
  columnToFieldMap,
  fieldValueLabels,
  columnHeaderFilterRenderers = DEFAULT_COLUMN_HEADER_FILTER_RENDERERS,
  // Column header group-by props
  columnGroupOptions,
  activeGroupBy,
  onToggleGroupBy,
  groupByIconPlacement = DEFAULT_GROUP_BY_ICON_PLACEMENT,
}: BaseTableProps<T> & { isBackendSortingReady?: boolean }) => {
  const { onAppendQueryParams } = useAppendQueryParams();
  const [isColumnOrderDialogOpen, setIsColumnOrderDialogOpen] = useState(false);
  const { setCurrentPageColumns } = useCurrentPageColumnsStore();
  const { setPageInfo, clearPageInfo } = usePageInfoStore();
  const hasSetColumnsRef = useRef(false);
  const { user } = useAuth();
  // Column customization
  const { columnVisibility, renderableColumns, handleColumnVisibilityChange } =
    useColumnCustomization({ tableName, columns, disableStorage: disableColumnCustomization });

  // Register column customization open handler when headerActionsPortalTargetId is set (e.g. lead details tab row button)
  useEffect(() => {
    if (headerActionsPortalTargetId && onRegisterColumnCustomization) {
      onRegisterColumnCustomization(() => setIsColumnOrderDialogOpen(true));
      return () => {
        onRegisterColumnCustomization(() => { });
      };
    }
  }, [headerActionsPortalTargetId, onRegisterColumnCustomization]);

  // Update global page header (optional)
  useEffect(() => {
    if (setPageInfoFromBaseTable) {
      const inferredTitle =
        pageInfoTitle || (typeof title === 'string' ? (title as string) : undefined);
      if (inferredTitle) {
        setPageInfo({
          title: inferredTitle,
          subtitle: `${pageInfoSubtitlePrefix || 'Total'}: ${totalItems}`,
          total: totalItems,
        } as any);
      }
      return () => {
        clearPageInfo();
      };
    }
  }, [
    setPageInfoFromBaseTable,
    pageInfoTitle,
    title,
    totalItems,
    pageInfoSubtitlePrefix,
    setPageInfo,
    clearPageInfo,
  ]);

  // Row selection management
  const {
    selectedRows,
    selectedRowObjects,
    handleRowCheckboxChange,
    handleSelectAllChange,
    clearSelection,
  } = useSelectedRows({
    selectable: selectable || !!bulkActionsConfig,
    rowIdField,
    returnFullObjects: returnFullObjects,
    tableName,
  });

  // Reset selection when the reset key changes (e.g., filters applied)
  useEffect(() => {
    if (selectionResetKey !== undefined) {
      clearSelection();
    }
  }, [selectionResetKey, clearSelection]);

  // Grouped selection support (visible items come from groupedVisibleLeadsStore)
  const visibleLeadsByGroup = useGroupedVisibleLeadsStore((state) => state.visibleLeadsByGroup);
  const groupedSelectionEnabled =
    groupedMode && Array.isArray(groupByFields) && groupByFields.length > 0;

  const visibleGroupedItems = useMemo(() => {
    if (!groupedSelectionEnabled) return [];
    const seen = new Set<string>();
    const flattened: any[] = [];
    Object.values(visibleLeadsByGroup || {}).forEach((leads = []) => {
      leads?.forEach((lead: any) => {
        const id = lead?._id?.toString();
        if (id && !seen.has(id)) {
          seen.add(id);
          flattened.push(lead);
        }
      });
    });
    return flattened;
  }, [groupedSelectionEnabled, visibleLeadsByGroup]);

  // Bulk actions (only if config is provided)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bulkActions = bulkActionsConfig
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
    useBulkActions({
      ...bulkActionsConfig,
      apiData: bulkActionsConfig.apiData || data,
      selectedRows: selectedRows,
      onClearSelection: clearSelection, // Pass the clearSelection function as callback
    })
    : {
      selectedItems: [],
      handleClearSelection: () => { },
      handleCheckboxChange: () => { },
      handleSelectAll: () => { },
      setDeleteConfirmOpen: () => { },
      handleDeleteConfirm: async () => { },
        deleteConfirmOpen: false,
        isDeleting: false,
      };

  // Resolve customActions (support render prop for setDeleteConfirmOpen)
  const resolvedCustomActions =
    typeof customActions === 'function'
      ? customActions({ setDeleteConfirmOpen: bulkActions.setDeleteConfirmOpen })
      : customActions;

  // Function to check if all visible rows are selected (for header checkbox)
  const isAllSelectedForRows = (rows: Row<T>[]) => {
    if (!selectable && !bulkActionsConfig) return false;

    if (groupedSelectionEnabled) {
      const visibleIds = visibleGroupedItems
        ?.map((item: any) => item?._id?.toString())
        ?.filter(Boolean);
      return visibleIds?.length > 0 && visibleIds?.every((id: string) => selectedRows.includes(id));
    }

    // Extract original data from Row objects
    const originalData = rows?.map((row) => row.original);

    // Check if all visible items are selected (this is what the header checkbox should show)
    const visibleIds = originalData
      ?.map((item: any) => (item as any)[rowIdField]?.toString())
      ?.filter(Boolean);
    const allVisibleSelected =
      visibleIds?.length > 0 && visibleIds?.every((id: string) => selectedRows.includes(id));

    return allVisibleSelected;
  };

  // Function to check if selection is indeterminate (for header checkbox)
  // This will be used when we implement proper indeterminate state handling

  // DataTable checkbox handlers
  const handleDataTableCheckboxChange = (checked: boolean, row: T) => {
    if ((!selectable && !bulkActionsConfig) || user?.id === row?._id) return;
    const rowId = (row as any)[rowIdField]?.toString();
    if (rowId) {
      handleRowCheckboxChange(checked, row);
    }
  };

  const isCheckboxChecked = (row: T) => {
    if ((!selectable && !bulkActionsConfig) || user?.id === row._id) return false;
    const rowId = (row as any)[rowIdField]?.toString();
    return rowId ? selectedRows.includes(rowId) : false;
  };

  // Handle header checkbox change for global select all
  const handleHeaderCheckboxChange = (checked: boolean, rows: Row<T>[]) => {
    if (!selectable && !bulkActionsConfig) return;
    if (groupedSelectionEnabled) {
      // In grouped mode, use currently visible group items instead of table rows
      handleSelectAllChange(checked, visibleGroupedItems);
      return;
    }
    // Extract original data from Row objects
    const originalData = !isMySelf
      ? rows?.map((row) => row.original)
      : rows?.filter((row) => user?.id !== row?.original._id)?.map((row) => row.original);

    handleSelectAllChange(checked, originalData);
  };

  // Use ref to track previous allSelectedRows to prevent infinite loops
  const prevAllSelectedRowsRef = useRef<string>('');
  const isUpdatingRef = useRef<boolean>(false);

  useEffect(() => {
    // Prevent infinite loops by checking if we're already updating
    if (isUpdatingRef.current) return;
    if (!allSelectedRows) return;

    // Create a stable key for comparison
    const currentSelectionKey = JSON.stringify(
      (Array.isArray(allSelectedRows) ? allSelectedRows : [])
        .map((row: any) => {
          const id = returnFullObjects ? row?._id : row;
          return id;
        })
        .filter(Boolean)
        .sort()
    );

    // Only update if the selection actually changed
    if (currentSelectionKey !== prevAllSelectedRowsRef.current) {
      prevAllSelectedRowsRef.current = currentSelectionKey;
      isUpdatingRef.current = true;

      if (allSelectedRows.length > 0) {
        handleSelectAllChange(true, allSelectedRows);
      } else {
        clearSelection();
      }

      // Reset the flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSelectedRows, returnFullObjects]);

  // Use ref to track previous selection to prevent infinite loops
  const prevSelectionRef = useRef<any>(null);

  useEffect(() => {
    if (onSelectedRowsChange) {
      const currentSelection = returnFullObjects ? selectedRowObjects : selectedRows;
      const prevSelection = prevSelectionRef.current;

      // Only call onSelectedRowsChange if the selection actually changed
      if (JSON.stringify(currentSelection) !== JSON.stringify(prevSelection)) {
        prevSelectionRef.current = currentSelection;
        onSelectedRowsChange(currentSelection);
      }
    }
  }, [selectedRows, returnFullObjects, selectedRowObjects, onSelectedRowsChange]);

  // Columns for CommonActionBar (static structure only)
  const columnsForActionBar = useMemo(
    () =>
      columns.map((col) => ({
        id: col.id || (col as any).accessorKey,
        header: () => (
          <span className="whitespace-nowrap">
            {typeof col.header === 'string' ? col.header : col.id || 'Column'}
          </span>
        ),
      })),
    [columns]
  );

  // Pagination handlers
  const handlePaginationChange = (page: number, newPageSize?: number, searchText?: any) => {
    const params: any = {
      pageIndex: String(page),
    };

    if (newPageSize !== undefined) {
      params.pageSize = String(newPageSize);
    }

    if (actionBindUrlInQuery) {
      onAppendQueryParams(params);
    }
    if (onPaginationChange) {
      onPaginationChange(params.page || page, pageSize);
    }
    if (searchText && onPaginationChange) {
      onPaginationChange(pageIndex, pageSize, searchText);
    }
  };

  const handleSelectChange = (value: number) => {
    if (actionBindUrlInQuery) {
      onAppendQueryParams({
        pageSize: String(value),
        pageIndex: '1',
      });
    }
    if (onPaginationChange) {
      // Always reset to page 1 when page size changes
      // This ensures consistency, especially when selecting total (max limit)
      onPaginationChange(1, value);
    }
  };
  const { setLocalSort, sortedData } = useFrontendSorting({ data, columns, isBackendSortingReady });

  // Get store methods for syncing sorting when grouping or custom filters are active
  // In multi-table mode, use the scoped store instead of the global store
  const globalStore = useUniversalGroupingFilterStore();
  const multiTableStore = useMultiTableFilterStore();

  // Get the appropriate store methods based on mode
  const setStoreSorting = multiTableMode
    ? (sorting: { sortBy: string; sortOrder: 'asc' | 'desc' }) =>
      multiTableStore.setSorting(tableName, {
        sortBy: sorting.sortBy,
        sortOrder: sorting.sortOrder,
      })
    : globalStore.setSorting;

  const userDomainFilters = multiTableMode
    ? multiTableStore.getTableState(tableName).userDomainFilters
    : globalStore.userDomainFilters;

  // Sorting handler
  const handleSort = (sort: OnSortParam) => {
    if (!isBackendSortingReady) {
      setLocalSort({ key: sort.key as string, order: sort.order as 'asc' | 'desc' });
    } else {
      // Update URL params if actionBindUrlInQuery is enabled
      if (actionBindUrlInQuery) {
        onAppendQueryParams({
          sortOrder: sort.order,
          sortBy: sort.key as string,
        });
      }

      // Sync sorting to store when grouping or custom filters are active
      // In multi-table mode, this syncs to the scoped store instead of global
      if (groupedMode || hasMeaningfulDomainFilters(userDomainFilters)) {
        setStoreSorting({
          sortBy: sort.key as string,
          sortOrder: sort.order as 'asc' | 'desc',
        });
      }
    }
  };

  // Row click handler
  const handleRowClick = (row: any) => {
    if (onRowClick) {
      onRowClick(row.original);
    }
  };

  // Create enhanced columns with single delete functionality
  const enhancedColumns = useMemo(() => {
    if (deleteButton === false) {
      return renderableColumns;
    }

    return renderableColumns.map((column) => {
      // If this is an actions column, enhance it with delete functionality
      if (column.id === 'actions' || (column as any).accessorKey === 'actions') {
        return {
          ...column,
          cell: (props: any) => {
            const originalCell =
              column.cell && typeof column.cell === 'function' ? column.cell(props) : null;

            // Always add delete button when singleDeleteConfig is present
            return (
              <div className="flex items-center gap-2">
                {originalCell}
                <button
                  className="text-sand-2 hover:text-rust rounded p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rowId = (props.row.original as any)[rowIdField];
                    const rowName =
                      (props.row.original as any)?.name ||
                      (props.row.original as any)?.title ||
                      (props.row.original as any)?.email ||
                      'item';
                    if ('setSingleDeleteConfirmOpen' in bulkActions) {
                      (bulkActions as any).setSingleDeleteConfirmOpen(true, rowId, rowName);
                    }
                  }}
                  title="Delete"
                >
                  <ApolloIcon name="trash" className="text-md" />
                </button>
              </div>
            );
          },
        };
      }
      return column;
    });
  }, [renderableColumns, rowIdField, bulkActions, deleteButton]);

  // bulk delete

  useEffect(() => {
    if (tableName && enhancedColumns && saveCurentPageColumnToStore && !hasSetColumnsRef.current) {
      setCurrentPageColumns(enhancedColumns, tableName as any);
      hasSetColumnsRef.current = true;
    }
  }, [tableName, saveCurentPageColumnToStore, enhancedColumns, setCurrentPageColumns]);

  // Reset the ref when tableName changes
  useEffect(() => {
    hasSetColumnsRef.current = false;
  }, [tableName]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}

      {/* Main table */}
      <Card
        className={`rounded-none border-none ${cardClassName}`}
        bodyClass="p-0"
        style={
          enableDragDrop
            ? {
              overflow: 'visible', // Allow drag preview portal to escape
            }
            : undefined
        }
      >
        {(title || description || headerActions) && (
          <div className="flex items-center justify-between">
            <div className="mb-4 w-full">
              {title && typeof title === 'string' ? <h1 className="text-sm">{title}</h1> : title}
              {description && typeof description === 'string' ? <p>{description}</p> : description}
            </div>
            {headerActions && (
              <div className="mb-4 flex items-center gap-2 text-sm">{headerActions}</div>
            )}
          </div>
        )}

        {/* Portal only ActionButtonsSection (selection + Switch To) to external target when configured */}
        {actionBarPortalTargetId &&
          typeof document !== 'undefined' &&
          (returnFullObjects ? selectedRowObjects : selectedRows).length > 0 &&
          (() => {
            const target = document.getElementById(actionBarPortalTargetId);
            if (!target) return null;
            const selectedCount = (returnFullObjects ? selectedRowObjects : selectedRows).length;
            const matchActionBarSize = compactSelectionButtons;
            return createPortal(
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size={matchActionBarSize ? 'xs' : 'xs'}
                  className="flex min-w-[6.5rem] shrink-0 items-center gap-1 rounded-none rounded-l-md"
                  onClick={clearSelection}
                >
                  <span>
                    {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
                  </span>
                  <ApolloIcon name="cross" className="text-xs" />
                </Button>
                {resolvedCustomActions}
              </div>,
              target
            );
          })()}

        {/* CommonActionBar - Create Offer, column customization stay here (unchanged) */}
        {/* Hide CommonActionBar completely when in multi-table mode (enableDragDrop is true) */}
        {/* When actionBarPortalTargetId or headerActionsPortalTargetId is set (e.g. lead details), always show so column customization icon is visible */}
        {!enableDragDrop &&
          (showSearchInActionBar ||
            showActionsDropdown ||
            showPagination ||
            actionBarPortalTargetId ||
            headerActionsPortalTargetId ||
            (returnFullObjects ? selectedRowObjects : selectedRows).length > 0) && (
            <>
              {showActionComponent && (
                <Card className="rounded-none border-none" bodyClass="p-0">
                  <div className="w-full">
                    <div className="flex items-center justify-between gap-4">
                      {actionBarLeftContent && (
                        <div className="flex shrink-0 items-center gap-3">
                          {actionBarLeftContent}
                        </div>
                      )}
                      <div className={actionBarLeftContent ? 'min-w-0 flex-1' : 'grow'}>
                        <CommonActionBar
                          showZoomButtons={false}
                          onSelectAll={onSelectAll}
                          showActionsDropdown={
                            actionBarPortalTargetId ? false : showActionsDropdown
                          }
                          styleColumnSorting={styleColumnSorting}
                          showSearchInActionBar={showSearchInActionBar}
                          selectable={selectable}
                          selectedItems={
                            actionBarPortalTargetId
                              ? []
                              : returnFullObjects
                                ? selectedRowObjects
                                : selectedRows
                          }
                          handleClearSelection={clearSelection}
                          deleteButton={deleteButton}
                          tableName={tableName}
                          tableId={tableId}
                          onAppendQueryParams={(params: any) => {
                            if (actionBindUrlInQuery) {
                              onAppendQueryParams(params);
                            }
                            if (onPaginationChange) {
                              onPaginationChange(pageIndex, pageSize, params);
                            }
                          }}
                          actionBindUrlInQuery={actionBindUrlInQuery}
                          search={search}
                          searchPlaceholder={searchPlaceholder}
                          allColumns={columnsForActionBar}
                          columnVisibility={columnVisibility}
                          handleColumnVisibilityChange={handleColumnVisibilityChange}
                          setDeleteConfirmDialogOpen={bulkActions.setDeleteConfirmOpen}
                          setIsColumnOrderDialogOpen={setIsColumnOrderDialogOpen}
                          // customizeButtonRef={customizeButtonRef}
                          isColumnOrderDialogOpen={isColumnOrderDialogOpen}
                          // tableName={tableName}
                          showPagination={showPagination}
                          currentPage={pageIndex}
                          pageSize={pageSize}
                          total={totalItems}
                          onPageChange={handlePaginationChange}
                          showNavigation={showNavigation}
                          extraActions={extraActions}
                          actionShowOptions={actionShowOptions}
                          // Add Group By filter props
                          selectedGroupByArray={selectedGroupBy}
                          onGroupByArrayChange={onGroupByChange}
                          onClearGroupBy={onClearGroupBy}
                          hasSelectedGroupBy={hasSelectedGroupBy}
                          hasUserAddedGroupBy={hasUserAddedGroupBy}
                          // Add Multi Level Grouping props
                          isMultiLevelGroupingApplied={isMultiLevelGroupingApplied}
                          onMultiLevelGrouping={onMultiLevelGrouping}
                          preservedFields={preservedFields}
                          // Add isAllSelected prop for toggle functionality
                          isAllSelected={isAllItemsSelected}
                          // Add FilterBtn component for UnifiedDashboard
                          filterBtnComponent={filterBtnComponent}
                          showStageGroupByButton={showStageGroupByButton}
                          // Transferred Offer filter props
                          showTransferredOfferButton={showTransferredOfferButton}
                          hasTransferredOffer={hasTransferredOffer}
                          onTransferredOfferToggle={onTransferredOfferToggle}
                          // Section title to show next to Actions button
                          sectionTitle={sectionTitle}
                          // Pass buildApiFilters for FilterByImport and CustomFilterOption
                          buildApiFilters={buildApiFilters}
                          // Pass entityType for multi-table pages
                          entityType={entityType as any}
                          commonActionBarClasses={commonActionBarClasses}
                          leftCommonActions={leftCommonActions}
                          showSelectAllButton={showSelectAllButton}
                          headerActionsPortalTargetId={headerActionsPortalTargetId}
                          externalCustomizeButtonRef={externalCustomizeButtonRef}
                          compactSelectionButtons={compactSelectionButtons}
                        >
                          {actionBarPortalTargetId ? null : resolvedCustomActions}
                        </CommonActionBar>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

        <DataTableOptimized
          tableLayout={tableLayout}
          instanceId={tableName}
          columns={
            bulkActionsConfig?.singleDeleteConfig
              ? (enhancedColumns as ColumnDef<T>[])
              : (renderableColumns as ColumnDef<T>[])
          }
          data={isBackendSortingReady ? data : sortedData}
          noData={noData || !data?.length}
          loading={loading}
          pagingData={{
            pageIndex,
            pageSize,
            total: totalItems,
          }}
          loadingRowSize={loadingRowSize}
          pageSizes={pageSizes || getPaginationOptions(totalItems)}
          onPaginationChange={handlePaginationChange}
          onSelectChange={handleSelectChange}
          onSort={handleSort}
          rowClassName={rowClassName}
          onRowClick={handleRowClick}
          tableClassName={tableClassName}
          selectable={selectable}
          onCheckBoxChange={handleDataTableCheckboxChange}
          onIndeterminateCheckBoxChange={handleHeaderCheckboxChange}
          checkboxChecked={isCheckboxChecked}
          indeterminateCheckboxChecked={isAllSelectedForRows}
          customNoDataIcon={customNoDataIcon}
          showPagination={false}
          renderExpandedRow={renderExpandedRow}
          showHeader={showHeader}
          headerSticky={headerSticky}
          enableZoom={enableZoom}
          autoFitRowsOnZoom={autoFitRowsOnZoom}
          enableColumnResizing={enableColumnResizing}
          fixedHeight={fixedHeight}
          enableDragDrop={enableDragDrop}
          dragDropTableId={dragDropTableId}
          skeletonRowMultiple={skeletonRowMultiple}
          // Pass grouped mode props
          groupedMode={groupedMode}
          groupedData={groupedData}
          entityType={entityType}
          groupByFields={groupByFields}
          tableProgressFilter={tableProgressFilter}
          search={search}
          dynamicallyColumnSizeFit={dynamicallyColumnSizeFit}
          hybridResize={hybridResize}
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
      </Card>
      {/* Footer content */}
      {footerContent && <div className="mt-4">{footerContent}</div>}

      {/* Bulk Delete Confirmation Dialog */}
      {bulkActionsConfig && (
        <ConfirmDialog
          type="warning"
          isOpen={bulkActions.deleteConfirmOpen}
          title="Warning"
          onCancel={() => bulkActions.setDeleteConfirmOpen(false)}
          onConfirm={bulkActions.handleDeleteConfirm}
          confirmButtonProps={{ disabled: bulkActions.isDeleting }}
        >
          <p>
            Are you sure you want to delete {selectedRowObjects?.length}{' '}
            {bulkActionsConfig?.entityName}?
          </p>
        </ConfirmDialog>
      )}

      {/* Single Delete Confirmation Dialog */}
      {bulkActionsConfig?.singleDeleteConfig && 'singleDeleteConfirmOpen' in bulkActions && (
        <ConfirmDialog
          type="warning"
          isOpen={(bulkActions as any).singleDeleteConfirmOpen}
          title="Warning"
          onCancel={() => (bulkActions as any).setSingleDeleteConfirmOpen(false)}
          onConfirm={async () => {
            if ((bulkActions as any).singleDeleteId) {
              await (bulkActions as any).handleSingleDelete((bulkActions as any).singleDeleteId);
            }
          }}
          confirmButtonProps={{ disabled: (bulkActions as any).isSingleDeleting }}
        >
          <p>
            Are you sure you want to delete {(bulkActions as any).singleDeleteName || 'this item'}?
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
};

export default BaseTable;
