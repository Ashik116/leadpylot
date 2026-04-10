import {
  Fragment,
  useMemo,
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  useCallback,
} from 'react';
import classNames from 'classnames';
import Table from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import TableRowSkeleton from './loaders/TableRowSkeleton';
import FileNotFound from '@/assets/svg/FileNotFound';
import {
  useTableZoomStore,
  getTableZoomStyles,
  getTableZoomContainerStyles,
} from '@/stores/tableZoomStore';
import { useColumnSizingStore } from '@/stores/columnSizingStore';
import { getPageSpecificColumnWidth } from '@/utils/columnWidthsUtils';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef as TanstackColumnDef,
  ColumnSort,
  Row,
  CellContext,
} from '@tanstack/react-table';
import type { TableProps } from '@/components/ui/Table';
import type { SkeletonProps } from '@/components/ui/Skeleton';
import type { Ref, ChangeEvent, ReactNode } from 'react';
import type { CheckboxProps } from '@/components/ui/Checkbox';
// Drag and drop imports (optional, only when enableDragDrop is true)
let Droppable: any = null;
let Draggable: any = null;
if (typeof window !== 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dndModule = require('@hello-pangea/dnd');
    Droppable = dndModule.Droppable;
    Draggable = dndModule.Draggable;
  } catch {
    // @hello-pangea/dnd not available
  }
}

export type OnSortParam = { order: 'asc' | 'desc' | ''; key: string | number };

// Custom ColumnDef that extends TanStack's ColumnDef with columnWidth and style
export type ColumnDef<T, K = any> = TanstackColumnDef<T, K> & {
  columnWidth?: number | string;
  style?: React.CSSProperties;
};

type DataTableProps<T> = {
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
  fixedHeight?: string | number; // New prop for fixed height
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
  dragDropTableId?: string; // ID of the table for drag-drop (e.g., 'opening', 'confirmation')
  onDragEnd?: (result: any) => void; // Callback when drag ends
} & TableProps;

type CheckBoxChangeEvent = ChangeEvent<HTMLInputElement>;

interface IndeterminateCheckboxProps extends Omit<CheckboxProps, 'onChange'> {
  onChange: (event: CheckBoxChangeEvent) => void;
  indeterminate: boolean;
  onCheckBoxChange?: (event: CheckBoxChangeEvent) => void;
  onIndeterminateCheckBoxChange?: (event: CheckBoxChangeEvent) => void;
}

const { Tr, Th, Td, THead, TBody, TFoot, Sorter } = Table;

const IndeterminateCheckbox = (props: IndeterminateCheckboxProps) => {
  const { indeterminate, onChange, onCheckBoxChange, onIndeterminateCheckBoxChange, ...rest } =
    props;

  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof indeterminate === 'boolean' && ref.current) {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, indeterminate]);

  const handleChange = (e: CheckBoxChangeEvent) => {
    onChange(e);
    onCheckBoxChange?.(e);
    onIndeterminateCheckBoxChange?.(e);
  };

  return (
    <Checkbox
      ref={ref}
      className="m-0 min-h-4 min-w-4 p-0"
      onChange={(_, e) => handleChange(e)}
      {...rest}
    />
  );
};

export type DataTableResetHandle = {
  resetSorting: () => void;
  resetSelected: () => void;
  resetColumnSizing: () => void;
};

/**
 * Column sizing reset functionality is now managed via Zustand store.
 *
 * The DataTable automatically registers its reset function with the store using its instanceId.
 * The CommonActionBar will automatically show a reset button when column widths differ from defaults.
 *
 * No additional setup is required - the reset functionality works out of the box!
 *
 * The reset button will appear in CommonActionBar when:
 * - There are DataTable components with registered reset functions
 * - At least one table has column widths that differ from their default values (defined in columnWidthsUtils.ts)
 * - The button resets column widths for ALL registered tables back to their defaults
 *
 * The button automatically hides when all column widths are at their default values.
 */

function DataTable<T>({ showHeader = true, ...props }: DataTableProps<T>) {
  const {
    skeletonAvatarColumns,
    columns: columnsProp = [],
    data = [],
    customNoDataIcon,
    loading,
    noData,
    onCheckBoxChange,
    onIndeterminateCheckBoxChange,
    onPaginationChange,
    onSelectChange,
    onSort,
    pageSizes = [10, 25, 50, 100],
    selectable = false,
    skeletonAvatarProps,
    compact = true,
    pagingData = {
      total: 0,
      pageIndex: 1,
      pageSize: 10,
    },
    checkboxChecked,
    indeterminateCheckboxChecked,
    instanceId = 'data-table',
    ref,
    onRowClick,
    rowClassName,
    renderExpandedRow,
    showPagination = true,
    tableHeaderClassName,
    tableClassName,
    headerSticky = true,
    fixedHeight,
    externalSorting,
    onExternalSortingChange,
    enableZoom = true,
    autoFitRowsOnZoom = true,
    enableColumnResizing = true,
    parentChildConnector = false,
    parentChildConnectorElbowOffset = 24,
    parentChildConnectorLeftAdjust = 8,
    enableDragDrop = false,
    dragDropTableId,
    // onDragEnd is handled by DragDropContext in parent, not used here
    ...rest
  } = props;

  const { pageSize, pageIndex, total } = pagingData;

  // Table zoom functionality
  // CRITICAL FIX: Disable zoom when drag-drop is enabled to prevent coordinate calculation issues
  // CSS transforms (scale) interfere with @hello-pangea/dnd's getBoundingClientRect() calculations
  // This also fixes browser zoom compatibility (90%, 80%, etc.)
  const { zoomLevel } = useTableZoomStore();
  const zoomStyles = enableZoom && !enableDragDrop ? getTableZoomStyles(zoomLevel) : {};
  const zoomContainerStyles =
    enableZoom && !enableDragDrop ? getTableZoomContainerStyles(zoomLevel) : {};

  // Column sizing store actions (select only actions to avoid rerenders on store state changes)
  const registerResetFunction = useColumnSizingStore((s) => s.registerResetFunction);
  const unregisterResetFunction = useColumnSizingStore((s) => s.unregisterResetFunction);
  const updateHasNonDefaultWidths = useColumnSizingStore((s) => s.updateHasNonDefaultWidths);

  // Use external sorting if provided, otherwise use internal state
  const [internalSorting, setInternalSorting] = useState<ColumnSort[]>([]);
  const sorting = externalSorting !== undefined ? externalSorting : internalSorting;
  const setSorting = onExternalSortingChange || setInternalSorting;

  // Page-specific column widths are now handled directly in the functions that need them

  // Column resizing state with persistence
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(() => {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      // Server-side rendering: use default column sizes
      const initialSizing: Record<string, number> = {};
      columnsProp?.forEach?.((col, index) => {
        const columnId = col?.id || `col-${index}`;
        if (col.columnWidth !== undefined) {
          if (typeof col.columnWidth === 'string') {
            const numericValue = parseInt(col?.columnWidth?.replace(/[^\d]/g, ''), 10);
            initialSizing[columnId] = numericValue;
          } else {
            initialSizing[columnId] = col?.columnWidth;
          }
        } else {
          // Use page-specific default width if available, otherwise fallback to 150
          initialSizing[columnId] = getPageSpecificColumnWidth(columnId, instanceId, 150);
        }
      });
      return initialSizing;
    }

    // Try to load from localStorage first (browser environment)
    const storageKey = `table-column-sizes-${instanceId}`;
    const savedSizing = localStorage.getItem(storageKey);

    if (savedSizing) {
      try {
        const parsedSizing = JSON.parse(savedSizing);
        // Validate that the saved sizing matches current columns
        const currentColumnIds = columnsProp?.map?.((col, index) => col?.id || `col-${index}`);
        const validSizing: Record<string, number> = {};

        currentColumnIds?.forEach?.((columnId) => {
          if (parsedSizing[columnId] && typeof parsedSizing[columnId] === 'number') {
            validSizing[columnId] = parsedSizing[columnId];
          } else {
            // Use page-specific default for columns not in saved sizing
            validSizing[columnId] = getPageSpecificColumnWidth(columnId, instanceId, 150);
          }
        });

        // Always return the sizing (saved + page-specific defaults for missing columns)
        return validSizing;
      } catch {
        // Failed to parse saved column sizing, will use defaults
      }
    }

    // Fallback to default column sizes
    const initialSizing: Record<string, number> = {};
    columnsProp?.forEach?.((col, index) => {
      const columnId = col?.id || `col-${index}`;
      if (col?.columnWidth !== undefined) {
        if (typeof col?.columnWidth === 'string') {
          const numericValue = parseInt(col?.columnWidth?.replace(/[^\d]/g, ''), 10);
          initialSizing[columnId] = numericValue;
        } else {
          initialSizing[columnId] = col?.columnWidth;
        }
      } else {
        // Use page-specific default width if available, otherwise fallback to 150
        initialSizing[columnId] = getPageSpecificColumnWidth(columnId, instanceId, 150);
      }
    });
    return initialSizing;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);

  // Save column sizing to localStorage
  const saveColumnSizing = useCallback(
    (sizing: Record<string, number>) => {
      // Only save to localStorage in browser environment
      if (typeof window === 'undefined') return;

      const storageKey = `table-column-sizes-${instanceId}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(sizing));
      } catch {
        // Failed to save column sizing to localStorage
      }
    },
    [instanceId]
  );

  // Column resize handler
  const handleColumnResize = useCallback(
    (updaterOrValue: any) => {
      setColumnSizing(updaterOrValue);
      setIsResizing(true);
      setResizingColumnId(updaterOrValue?.isResizingColumn ? updaterOrValue?.columnId : null);

      // Save to localStorage
      const newSizing =
        typeof updaterOrValue === 'function' ? updaterOrValue(columnSizing) : updaterOrValue;
      saveColumnSizing(newSizing);
    },
    [columnSizing, saveColumnSizing]
  );

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizingColumnId(null);
  }, []);

  // Custom resize handler for better control
  const createResizeHandler = useCallback(
    (columnId: string) => {
      return (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startWidth = columnSizing[columnId] || 150;

        setIsResizing(true);
        setResizingColumnId(columnId);

        const handleMouseMove = (e: MouseEvent) => {
          const deltaX = e.clientX - startX;
          const newWidth = Math.max(10, Math.min(500, startWidth + deltaX));

          const newSizing = {
            ...columnSizing,
            [columnId]: newWidth,
          };

          setColumnSizing(newSizing);
          // Save to localStorage on each move for real-time persistence
          saveColumnSizing(newSizing);
        };

        const handleMouseUp = () => {
          setIsResizing(false);
          setResizingColumnId(null);
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      };
    },
    [columnSizing, saveColumnSizing]
  );

  // Effect to handle column changes and update sizing accordingly
  useEffect(() => {
    const currentColumnIds = columnsProp?.map?.((col, index) => col?.id || `col-${index}`);
    const currentSizingKeys = Object.keys(columnSizing);

    // Check if we need to add new columns or remove old ones
    const hasNewColumns = currentColumnIds?.some?.((id) => !currentSizingKeys?.includes(id));
    const hasRemovedColumns = currentSizingKeys?.some?.((key) => !currentColumnIds?.includes(key));

    if (hasNewColumns || hasRemovedColumns) {
      // Update sizing to match current columns
      const updatedSizing: Record<string, number> = {};
      currentColumnIds?.forEach?.((columnId) => {
        // Keep existing sizing if available, otherwise use default
        if (columnSizing[columnId]) {
          updatedSizing[columnId] = columnSizing[columnId];
        } else {
          const col = columnsProp?.find?.((c, index) => (c?.id || `col-${index}`) === columnId);
          if (col?.columnWidth !== undefined) {
            if (typeof col?.columnWidth === 'string') {
              const numericValue = parseInt(col?.columnWidth?.replace(/[^\d]/g, ''), 10);
              updatedSizing[columnId] = numericValue;
            } else {
              updatedSizing[columnId] = col?.columnWidth;
            }
          } else {
            // Use page-specific default width if available, otherwise fallback to 150
            updatedSizing[columnId] = getPageSpecificColumnWidth(columnId, instanceId, 150);
          }
        }
      });

      setColumnSizing(updatedSizing);
      saveColumnSizing(updatedSizing);
    }
  }, [columnsProp, columnSizing, saveColumnSizing, instanceId]);

  // Calculate remaining data based on current page and pageSize
  // Remaining = total - items already shown (pageIndex * pageSize)
  const remainingData = useMemo(() => {
    const itemsShown = pageIndex * pageSize;
    return Math.max(0, total - itemsShown);
  }, [pageIndex, pageSize, total]);

  // Dynamically generate pageSize options based on remaining data
  const pageSizeOption = useMemo(() => {
    const options: Array<{ value: number; label: string }> = [];

    // Define standard page size options - always show these regardless of remaining data
    // Users should always be able to switch back to standard sizes
    const standardPageSizes = [10, 20, 50, 100, 200, 500, 1000];

    // Always include standard page sizes that don't exceed total
    // This ensures users can always switch back to smaller page sizes
    const validStandardSizes = standardPageSizes.filter((size) => size <= total);

    // Add all valid standard sizes
    validStandardSizes.forEach((size) => {
      options.push({
        value: size,
        label: `${size} / page`,
      });
    });

    // Also check if any sizes from pageSizes prop are valid (excluding total and already added standards)
    const validPropSizes = pageSizes.filter((size) => {
      if (size === total) return false; // Exclude total, we'll add it separately
      if (validStandardSizes.includes(size)) return false; // Already added
      return size <= total; // Only include if it doesn't exceed total
    });

    // Add any additional valid sizes from pageSizes prop
    validPropSizes.forEach((size) => {
      options.push({
        value: size,
        label: `${size} / page`,
      });
    });

    // Add remaining data as an option if:
    // 1. It's greater than the max standard size
    // 2. It's different from total
    // 3. It's greater than 0
    // 4. It doesn't exceed remaining data (only show if user can actually select it from current page)
    const maxStandardSize = validStandardSizes.length > 0 ? Math.max(...validStandardSizes) : 0;

    if (remainingData > maxStandardSize && remainingData < total && remainingData > 0) {
      options.push({
        value: remainingData,
        label: `${remainingData} / page`,
      });
    }

    // Always add total as the last option (even if it exceeds remainingData)
    // This allows users to select "show all" which will reset to page 1
    if (total > 0 && !options.some((opt) => opt.value === total)) {
      options.push({
        value: total,
        label: `${total} / page`,
      });
    }

    // Remove duplicates and sort
    const uniqueOptions = Array.from(new Map(options.map((opt) => [opt.value, opt])).values()).sort(
      (a, b) => a.value - b.value
    );

    return uniqueOptions;
  }, [pageSizes, remainingData, total]);

  // Effect to handle sorting changes - only call onSort if not using external sorting
  useEffect(() => {
    // Only call onSort if we're using internal sorting (not external)
    if (externalSorting === undefined) {
      if (Array.isArray(sorting) && sorting?.length > 0) {
        const sortOrder = sorting[0]?.desc ? 'desc' : 'asc';
        const id = sorting[0]?.id;
        onSort?.({ order: sortOrder, key: id });
      } else if (Array.isArray(sorting) && sorting?.length === 0) {
        // Handle case when sorting is cleared
        onSort?.({ order: '', key: '' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorting, externalSorting]);

  const handleIndeterminateCheckBoxChange = useCallback(
    (checked: boolean, rows: Row<T>[]) => {
      if (!loading) {
        onIndeterminateCheckBoxChange?.(checked, rows);
      }
    },
    [loading, onIndeterminateCheckBoxChange]
  );

  const handleCheckBoxChange = useCallback(
    (checked: boolean, row: T) => {
      if (!loading) {
        onCheckBoxChange?.(checked, row);
      }
    },
    [loading, onCheckBoxChange]
  );

  const finalColumns: TanstackColumnDef<T>[] = useMemo(() => {
    // Map custom columns to TanStack columns, handling columnWidth
    const columns = columnsProp?.map?.((col) => {
      const { columnWidth, style, ...rest } = col;
      const tanstackCol: TanstackColumnDef<T> = { ...rest };

      // Set default size if not provided
      if (columnWidth !== undefined) {
        if (typeof columnWidth === 'string') {
          // If it's a string like "20px", parse the number
          const numericValue = parseInt(columnWidth?.replace(/[^\d]/g, ''), 10);
          tanstackCol.size = numericValue;
        } else {
          // If it's already a number
          tanstackCol.size = columnWidth;
        }
      } else {
        // Set default size for resizable columns using page-specific defaults
        const columnId = tanstackCol?.id || `col-${columnsProp?.indexOf(col)}`;
        tanstackCol.size = getPageSpecificColumnWidth(columnId, instanceId, 150); // Use page-specific default or fallback to 150
        tanstackCol.minSize = 10; // Minimum width
        tanstackCol.maxSize = 1000; // Maximum width
      }

      // Enable resizing for all columns except special ones
      if (
        enableColumnResizing &&
        !['select', 'checkbox', 'expander'].includes(tanstackCol?.id || '')
      ) {
        tanstackCol.enableResizing = true;
      }

      // Store style for later use
      if (style) {
        tanstackCol.meta = { ...tanstackCol?.meta, style };
      }

      return tanstackCol;
    });

    // Separate expander column from other columns
    const expanderColumn = columns?.find?.((col) => col?.id === 'expander');
    const checkboxColumn = columns?.find?.((col) => col?.id === 'checkbox');
    const otherColumns = columns?.filter?.(
      (col) => col?.id !== 'expander' && col?.id !== 'checkbox'
    );

    // Build the final column array with proper order
    const finalColumnArray: TanstackColumnDef<T>[] = [];

    // Add select column first (either built-in or custom checkbox)
    if (selectable) {
      finalColumnArray.push({
        id: 'select',
        size: 30,
        minSize: 10,
        maxSize: 30,
        meta: {
          style: {
            position: 'sticky',
            left: 0,
            background: 'white',
            zIndex: 11, // Above header (z-10) for sticky columns
            width: 30,
            minWidth: 30,
            maxWidth: 30,
            paddingRight: '0px',
          },
        },
        header: ({ table }) => (
          <div className="flex h-8 w-full items-center justify-center">
            <IndeterminateCheckbox
              checked={
                indeterminateCheckboxChecked
                  ? indeterminateCheckboxChecked(table?.getRowModel()?.rows)
                  : table?.getIsAllRowsSelected()
              }
              indeterminate={table?.getIsSomeRowsSelected()}
              onChange={table?.getToggleAllRowsSelectedHandler()}
              onIndeterminateCheckBoxChange={(e) => {
                handleIndeterminateCheckBoxChange(e.target.checked, table?.getRowModel()?.rows);
              }}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full items-center justify-center"
          >
            <IndeterminateCheckbox
              checked={checkboxChecked ? checkboxChecked(row?.original) : row?.getIsSelected()}
              indeterminate={row?.getIsSomeSelected()}
              onChange={row?.getToggleSelectedHandler()}
              onCheckBoxChange={(e) => {
                handleCheckBoxChange(e.target.checked, row?.original);
              }}
            />
          </div>
        ),
      });
    } else if (checkboxColumn) {
      // Add custom checkbox column first with size constraints
      const fixedCheckboxColumn = {
        ...checkboxColumn,
        size: 35,
        minSize: 35,
        maxSize: 35,
        meta: {
          ...checkboxColumn?.meta,
          style: {
            position: 'sticky',
            left: 0,
            background: 'white',
            zIndex: 11, // Above header (z-10) for sticky columns
            width: 35,
            minWidth: 35,
            maxWidth: 35,
            paddingRight: '0px',
            ...(checkboxColumn?.meta as any)?.style,
          },
        },
      };
      finalColumnArray.push(fixedCheckboxColumn);
    }

    // Add expander column second if it exists
    if (expanderColumn) {
      const fixedExpanderColumn = {
        ...expanderColumn,
        size: 30,
        minSize: 30,
        maxSize: 30,
        meta: {
          ...expanderColumn?.meta,
          style: {
            width: 30,
            minWidth: 30,
            maxWidth: 30,
            paddingLeft: '0px',
            paddingRight: '10px',
            ...(expanderColumn?.meta as any)?.style,
          },
        },
      };
      finalColumnArray.push(fixedExpanderColumn);
    }

    // Add all other columns
    finalColumnArray.push(...otherColumns);

    return finalColumnArray;
    // Include selection predicates so checkbox reflects latest selection state
  }, [
    columnsProp,
    selectable,
    checkboxChecked,
    indeterminateCheckboxChecked,
    enableColumnResizing,
    handleCheckBoxChange,
    handleIndeterminateCheckBoxChange,
    instanceId,
  ]);

  const table = useReactTable({
    data,
    columns: finalColumns as TanstackColumnDef<unknown | object | any[], any>[],
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: selectable,
    enableMultiRowSelection: selectable,
    enableColumnResizing: enableColumnResizing,
    manualPagination: true,
    manualSorting: true,
    onSortingChange: (sorter) => {
      // Handle both function and array cases from TanStack Table
      if (typeof sorter === 'function') {
        setSorting(sorter(sorting));
      } else {
        setSorting(sorter as ColumnSort[]);
      }
    },
    onColumnSizingChange: handleColumnResize,
    onColumnSizingInfoChange: (info) => {
      if (
        typeof info === 'object' &&
        info &&
        'isResizingColumn' in info &&
        !info.isResizingColumn
      ) {
        handleResizeEnd();
      }
    },
    state: {
      sorting: sorting as ColumnSort[],
      columnSizing: columnSizing,
    },
  });

  // Compute connector left offset based on select and expander columns
  const hasSelectCol = selectable || (finalColumns as any[])?.some?.((c) => c?.id === 'checkbox');
  const hasExpanderCol = (finalColumns as any[])?.some?.((c) => c?.id === 'expander');
  const connectorLeftOffset =
    (hasSelectCol ? 35 : 0) + (hasExpanderCol ? 30 : 0) + parentChildConnectorLeftAdjust;

  // Increase page size automatically when zooming out to fill extra space
  // Skip this when drag-drop is enabled (zoom is disabled for drag-drop tables)
  useEffect(() => {
    if (!autoFitRowsOnZoom || !enableZoom || enableDragDrop) return;
    if (!onSelectChange) return;
    const currentZoom = zoomLevel || 1;
    if (currentZoom >= 1) return; // only on zoom-out
    const ratio = 1 / currentZoom;
    const maxOption =
      Array.isArray(pageSizes) && pageSizes?.length > 0 ? Math.max(...pageSizes) : pageSize * 4;
    const recommended = Math.min(maxOption, Math.ceil(pageSize * ratio));
    if (recommended > pageSize) {
      onSelectChange(recommended);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomLevel, enableDragDrop]);

  const resetSorting = () => {
    table?.resetSorting();
    if (externalSorting !== undefined && onExternalSortingChange) {
      onExternalSortingChange([]);
    } else {
      setInternalSorting([]);
    }
  };

  const resetSelected = () => {
    table?.resetRowSelection(true);
  };

  // Function to get default column sizes
  const getDefaultColumnSizing = useCallback(() => {
    const defaultSizing: Record<string, number> = {};
    columnsProp?.forEach?.((col, index) => {
      const columnId = col?.id || `col-${index}`;
      if (col?.columnWidth !== undefined) {
        if (typeof col?.columnWidth === 'string') {
          const numericValue = parseInt(col?.columnWidth?.replace(/[^\d]/g, ''), 10);
          defaultSizing[columnId] = numericValue;
        } else {
          defaultSizing[columnId] = col?.columnWidth;
        }
      } else {
        // Use page-specific default width if available, otherwise fallback to 150
        defaultSizing[columnId] = getPageSpecificColumnWidth(columnId, instanceId, 150);
      }
    });
    return defaultSizing;
  }, [columnsProp, instanceId]);

  // Function to check if current widths differ from defaults
  const checkIfWidthsDifferFromDefaults = useCallback(() => {
    const defaultSizing = getDefaultColumnSizing();
    const currentSizing = columnSizing;

    // Check if any column width differs from its default
    for (const [columnId, currentWidth] of Object.entries(currentSizing)) {
      const defaultWidth = defaultSizing[columnId];
      if (defaultWidth !== undefined && Math.abs(currentWidth - defaultWidth) > 1) {
        // Allow 1px tolerance
        return true;
      }
    }

    // Check if any default column is missing from current sizing
    for (const columnId of Object.keys(defaultSizing)) {
      if (currentSizing[columnId] === undefined) {
        return true;
      }
    }

    return false;
  }, [columnSizing, getDefaultColumnSizing]);

  const resetColumnSizing = useCallback(() => {
    const defaultSizing = getDefaultColumnSizing();
    setColumnSizing(defaultSizing);
    saveColumnSizing(defaultSizing);
  }, [getDefaultColumnSizing, saveColumnSizing]);

  // Register reset function with Zustand store
  useEffect(() => {
    registerResetFunction(instanceId, resetColumnSizing);

    // Cleanup: unregister when component unmounts
    return () => {
      unregisterResetFunction(instanceId);
    };
  }, [instanceId, registerResetFunction, unregisterResetFunction, resetColumnSizing]);

  // Check and update store when column sizing changes
  useEffect(() => {
    const hasNonDefault = checkIfWidthsDifferFromDefaults();
    updateHasNonDefaultWidths(instanceId, hasNonDefault);
  }, [columnSizing, instanceId, updateHasNonDefaultWidths, checkIfWidthsDifferFromDefaults]);

  useImperativeHandle(ref, () => ({
    resetSorting,
    resetSelected,
    resetColumnSizing,
  }));

  const handlePaginationChange = (page: number) => {
    if (!loading) {
      resetSelected();
      onPaginationChange?.(page);
    }
  };

  const handleSelectChange = (value?: number) => {
    if (!loading && value !== undefined) {
      const selectedValue = Number(value);

      // Calculate the maximum valid page with the new page size
      const maxValidPage = total > 0 ? Math.ceil(total / selectedValue) : 1;

      // If user selects total (max limit) or remaining data, always reset to page 1
      // Also reset if current page would be invalid with the new page size
      if (selectedValue === total || selectedValue === remainingData || pageIndex > maxValidPage) {
        // Reset to page 1 and set the new limit
        onPaginationChange?.(1);
        onSelectChange?.(selectedValue);
      } else {
        // For other selections, just update the page size
        // The current page should still be valid
        onSelectChange?.(selectedValue);
      }
    }
  };

  return (
    <div
      className="relative flex flex-col"
      style={
        fixedHeight
          ? { height: typeof fixedHeight === 'number' ? `${fixedHeight}px` : fixedHeight }
          : { height: '82.5dvh' }
      }
    >
      <div
        className="table-zoom-container flex-1 [-ms-overflow-style:none]"
        style={{
          ...zoomContainerStyles,
          overflow: 'auto', // Keep scrolling enabled
          position: 'relative',
          // Remove z-index to prevent stacking context that clips drag preview
          // The drag preview portal will handle its own z-index via CSS
          // Disable CSS transforms when drag-drop is enabled to fix browser zoom issues
          ...(enableDragDrop ? { transform: 'none', willChange: 'auto' } : {}),
        }}
      >
        <div
          className="table-zoom-content"
          style={{
            ...zoomStyles,
            // Disable CSS transforms when drag-drop is enabled to fix browser zoom coordinate issues
            ...(enableDragDrop ? { transform: 'none !important', willChange: 'auto' } : {}),
          }}
        >
          <Table
            tableClassName={classNames(
              tableClassName,
              isResizing && 'resizing',
              'resizable-table',
              resizingColumnId && 'resizing-column'
            )}
            compact={compact}
            tableWrapperStyle={{
              maxHeight: '100%',
              width: '100%',
              overflow: 'visible',
            }}
            style={{
              tableLayout: 'fixed',
              width: '100%',
              minWidth: '800px',
            }}
            {...rest}
          >
            {showHeader && (
              <THead
                headerSticky={
                  headerSticky && (enableZoom && !enableDragDrop ? (zoomLevel || 1) === 1 : true)
                }
              >
                {table.getHeaderGroups().map((headerGroup) => (
                  <Tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      // @ts-expect-error: 'style' is not typed in ColumnMeta
                      const columnStyle = header?.column?.columnDef?.meta?.style || {};
                      const columnWidth = columnSizing[header?.id] || header?.getSize() || 150;
                      const canResize = header?.column?.getCanResize();

                      return (
                        <Th
                          key={header?.id}
                          colSpan={header?.colSpan}
                          className="relative overflow-hidden whitespace-nowrap"
                          style={{
                            ...columnStyle,
                            width: columnWidth,
                            minWidth: header?.column?.columnDef?.minSize || 10,
                            maxWidth: header?.column?.columnDef?.maxSize || 1000,
                          }}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={classNames(
                                header?.column?.getCanSort() && 'point cursor-pointer select-none',
                                loading && 'pointer-events-none',
                                tableHeaderClassName && tableHeaderClassName,
                                'line-clamp-1',
                                resizingColumnId === header?.id && 'resizing-column',
                                // Support centered headers while keeping sort icon aligned
                                (header?.column?.columnDef?.meta as { headerAlign?: string })
                                  ?.headerAlign === 'center' &&
                                  'flex items-center justify-center gap-1'
                              )}
                              onClick={header?.column?.getToggleSortingHandler()}
                            >
                              {flexRender(header?.column?.columnDef?.header, header?.getContext())}
                              {header?.column?.getCanSort() && (
                                <Sorter sort={header?.column?.getIsSorted()} />
                              )}
                            </div>
                          )}
                          {/* Column resize handle */}
                          {enableColumnResizing && canResize && (
                            <div
                              className="resize-handle"
                              onMouseDown={createResizeHandler(header?.id)}
                              title="Resize column"
                              data-resizing-column-id={header?.id}
                            />
                          )}
                        </Th>
                      );
                    })}
                  </Tr>
                ))}
              </THead>
            )}
            {loading && data?.length === 0 ? (
              <TableRowSkeleton
                columns={(finalColumns as Array<T>)?.length}
                rows={pagingData?.pageSize}
                avatarInColumns={skeletonAvatarColumns}
                avatarProps={skeletonAvatarProps}
              />
            ) : enableDragDrop && Droppable && dragDropTableId ? (
              <Droppable droppableId={dragDropTableId}>
                {(provided: any, snapshot: any) => {
                  // Merge Droppable props with TBody component
                  return (
                    <TBody
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={classNames(
                        'overflow-y-auto',
                        snapshot.isDraggingOver && 'drop-zone-active'
                      )}
                      style={{
                        maxHeight: '100%',
                        height: 'auto',
                        minHeight: '350px', // Significantly increased for better drop detection at all browser zoom levels
                        position: 'relative',
                        // Ensure the drop zone is always accessible
                        paddingBottom: '20px',
                      }}
                    >
                      {noData ? (
                        <Tr>
                          <Td className="hover:bg-transparent" colSpan={finalColumns.length}>
                            <div
                              className="flex flex-col items-center justify-center gap-4"
                              style={{ minHeight: '330px' }} // Match TBody minHeight for consistent drop zone
                            >
                              {customNoDataIcon ? (
                                customNoDataIcon
                              ) : (
                                <>
                                  <FileNotFound />
                                  <span className="font-semibold">No data found!</span>
                                </>
                              )}
                            </div>
                          </Td>
                        </Tr>
                      ) : (
                        <>
                          {table
                            .getRowModel()
                            .rows.slice(0, pageSize)
                            .map((row, index) => {
                              const rowData = (row.original || row) as any;
                              const draggableId = `${dragDropTableId}-${index}-item-data-${JSON.stringify(rowData)}`;

                              if (Draggable) {
                                return (
                                  <Draggable key={row.id} draggableId={draggableId} index={index}>
                                    {(provided: any, snapshot: any) => {
                                      const baseStyle = provided.draggableProps.style || {};
                                      const isDragging = snapshot.isDragging;

                                      // Enhanced style for dragged element - use library's default transform behavior
                                      // @hello-pangea/dnd handles positioning automatically via portal
                                      // The CSS rule in tailwind/index.css will handle the portal clone styling
                                      const dragStyle = isDragging
                                        ? {
                                            ...baseStyle,
                                            // Let the library handle positioning - CSS will style the portal clone
                                          }
                                        : baseStyle;

                                      return (
                                        <Fragment>
                                          <Tr
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={classNames(
                                              typeof rowClassName === 'function'
                                                ? rowClassName(row as Row<T>)
                                                : rowClassName,
                                              isDragging
                                                ? 'border-2 border-blue-500 bg-blue-100 opacity-30'
                                                : 'hover:bg-gray-50',
                                              'cursor-grab transition-all duration-200 active:cursor-grabbing'
                                            )}
                                            onClick={() => onRowClick && onRowClick(row as any)}
                                            style={dragStyle}
                                          >
                                            {row.getVisibleCells().map((cell) => {
                                              const columnStyle =
                                                (cell.column.columnDef.meta &&
                                                'style' in cell.column.columnDef.meta
                                                  ? (
                                                      cell.column.columnDef.meta as {
                                                        style?: React.CSSProperties;
                                                      }
                                                    ).style
                                                  : {}) || {};
                                              const columnWidth =
                                                columnSizing[cell.column.id] ||
                                                cell.column.getSize() ||
                                                150;
                                              return (
                                                <Td
                                                  key={cell.id}
                                                  className={classNames(
                                                    'hover:bg-btn-netto1/30 relative cursor-pointer text-lg 2xl:text-base',
                                                    resizingColumnId === cell.column.id &&
                                                      'resizing-column'
                                                  )}
                                                  style={{
                                                    ...columnStyle,
                                                    width: columnWidth,
                                                    minWidth: cell.column.columnDef.minSize || 10,
                                                    maxWidth: cell.column.columnDef.maxSize || 1000,
                                                  }}
                                                >
                                                  <div className="truncate">
                                                    {flexRender(
                                                      cell.column.columnDef.cell,
                                                      cell.getContext()
                                                    )}
                                                  </div>
                                                </Td>
                                              );
                                            })}
                                          </Tr>
                                          {renderExpandedRow && (
                                            <Tr className="expanded-row border-none">
                                              <Td
                                                colSpan={finalColumns.length}
                                                className="border-none p-0"
                                              >
                                                <div className="relative">
                                                  {parentChildConnector && (
                                                    <div
                                                      className="pointer-events-none"
                                                      style={{
                                                        position: 'absolute',
                                                        left: connectorLeftOffset,
                                                        top: -6,
                                                        height: parentChildConnectorElbowOffset + 6,
                                                        width: 36,
                                                      }}
                                                    >
                                                      <span
                                                        style={{
                                                          position: 'absolute',
                                                          left: -30,
                                                          top: -6,
                                                          height:
                                                            parentChildConnectorElbowOffset + 6,
                                                          width: 2,
                                                          background: '#e5e7eb',
                                                          display: 'block',
                                                        }}
                                                      />
                                                      <span
                                                        style={{
                                                          position: 'absolute',
                                                          left: -28,
                                                          top: parentChildConnectorElbowOffset,
                                                          height: 2,
                                                          width: 36,
                                                          background: '#e5e7eb',
                                                          display: 'block',
                                                        }}
                                                      />
                                                    </div>
                                                  )}
                                                  {renderExpandedRow(row as Row<T>)}
                                                </div>
                                              </Td>
                                            </Tr>
                                          )}
                                        </Fragment>
                                      );
                                    }}
                                  </Draggable>
                                );
                              }

                              // Fallback if Draggable not available
                              return (
                                <Fragment key={row.id}>
                                  <Tr
                                    className={
                                      typeof rowClassName === 'function'
                                        ? rowClassName(row as Row<T>)
                                        : rowClassName
                                    }
                                    onClick={() => onRowClick && onRowClick(row as any)}
                                  >
                                    {row.getVisibleCells().map((cell) => {
                                      // @ts-expect-error: meta.style is not typed in ColumnMeta
                                      const columnStyle = cell.column.columnDef.meta?.style || {};
                                      const columnWidth =
                                        columnSizing[cell.column.id] ||
                                        cell.column.getSize() ||
                                        150;
                                      return (
                                        <Td
                                          key={cell.id}
                                          className={classNames(
                                            'hover:bg-btn-netto1/30 relative cursor-pointer text-lg 2xl:text-base',
                                            resizingColumnId === cell.column.id && 'resizing-column'
                                          )}
                                          style={{
                                            ...columnStyle,
                                            width: columnWidth,
                                            minWidth: cell.column.columnDef.minSize || 10,
                                            maxWidth: cell.column.columnDef.maxSize || 1000,
                                          }}
                                        >
                                          <div className="truncate">
                                            {flexRender(
                                              cell.column.columnDef.cell,
                                              cell.getContext()
                                            )}
                                          </div>
                                        </Td>
                                      );
                                    })}
                                  </Tr>
                                  {renderExpandedRow && (
                                    <Tr className="expanded-row border-none">
                                      <Td colSpan={finalColumns.length} className="border-none p-0">
                                        <div className="relative">
                                          {parentChildConnector && (
                                            <div
                                              className="pointer-events-none"
                                              style={{
                                                position: 'absolute',
                                                left: connectorLeftOffset,
                                                top: -6,
                                                height: parentChildConnectorElbowOffset + 6,
                                                width: 36,
                                              }}
                                            >
                                              <span
                                                style={{
                                                  position: 'absolute',
                                                  left: -30,
                                                  top: -6,
                                                  height: parentChildConnectorElbowOffset + 6,
                                                  width: 2,
                                                  background: '#e5e7eb',
                                                  display: 'block',
                                                }}
                                              />
                                              <span
                                                style={{
                                                  position: 'absolute',
                                                  left: -28,
                                                  top: parentChildConnectorElbowOffset,
                                                  height: 2,
                                                  width: 36,
                                                  background: '#e5e7eb',
                                                  display: 'block',
                                                }}
                                              />
                                            </div>
                                          )}
                                          {renderExpandedRow(row as Row<T>)}
                                        </div>
                                      </Td>
                                    </Tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          {provided.placeholder}
                        </>
                      )}
                    </TBody>
                  );
                }}
              </Droppable>
            ) : (
              <TBody
                className="overflow-y-auto"
                style={{
                  maxHeight: '100%',
                  height: 'auto',
                  // @hello-pangea/dnd uses portal for drag preview, so overflow: auto is fine
                }}
              >
                <>
                  {noData ? (
                    <Tr>
                      <Td className="hover:bg-transparent" colSpan={finalColumns.length}>
                        <div className="flex flex-col items-center gap-4">
                          {customNoDataIcon ? (
                            customNoDataIcon
                          ) : (
                            <>
                              <FileNotFound />
                              <span className="font-semibold">No data found!</span>
                            </>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ) : (
                    <>
                      {table
                        .getRowModel()
                        .rows.slice(0, pageSize)
                        .map((row) => {
                          return (
                            <Fragment key={row.id}>
                              <Tr
                                className={
                                  typeof rowClassName === 'function'
                                    ? rowClassName(row as Row<T>)
                                    : rowClassName
                                }
                                onClick={() => onRowClick && onRowClick(row as any)}
                              >
                                {row.getVisibleCells().map((cell) => {
                                  // @ts-expect-error: meta.style is not typed in ColumnMeta
                                  const columnStyle = cell.column.columnDef.meta?.style || {};
                                  const columnWidth =
                                    columnSizing[cell.column.id] || cell.column.getSize() || 150;
                                  return (
                                    <Td
                                      key={cell.id}
                                      className={classNames(
                                        'hover:bg-btn-netto1/30 relative cursor-pointer text-lg 2xl:text-base',
                                        resizingColumnId === cell.column.id && 'resizing-column'
                                      )}
                                      style={{
                                        ...columnStyle,
                                        width: columnWidth,
                                        minWidth: cell.column.columnDef.minSize || 10,
                                        maxWidth: cell.column.columnDef.maxSize || 1000,
                                      }}
                                    >
                                      <div className="truncate">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                      </div>
                                    </Td>
                                  );
                                })}
                              </Tr>
                              {renderExpandedRow && (
                                <Tr className="expanded-row border-none">
                                  <Td colSpan={finalColumns.length} className="border-none p-0">
                                    <div className="relative">
                                      {parentChildConnector && (
                                        <div
                                          className="pointer-events-none"
                                          style={{
                                            position: 'absolute',
                                            left: connectorLeftOffset,
                                            top: -6,
                                            height: parentChildConnectorElbowOffset + 6,
                                            width: 36,
                                          }}
                                        >
                                          <span
                                            style={{
                                              position: 'absolute',
                                              left: -30,
                                              top: -6,
                                              height: parentChildConnectorElbowOffset + 6,
                                              width: 2,
                                              background: '#e5e7eb',
                                              display: 'block',
                                            }}
                                          />
                                          <span
                                            style={{
                                              position: 'absolute',
                                              left: -28,
                                              top: parentChildConnectorElbowOffset,
                                              height: 2,
                                              width: 36,
                                              background: '#e5e7eb',
                                              display: 'block',
                                            }}
                                          />
                                        </div>
                                      )}
                                      {renderExpandedRow(row as Row<T>)}
                                    </div>
                                  </Td>
                                </Tr>
                              )}
                            </Fragment>
                          );
                        })}
                    </>
                  )}
                </>
              </TBody>
            )}
            {table.getFooterGroups().length > 0 && (
              <TFoot>
                {table.getFooterGroups().map((footerGroup) => (
                  <Tr key={footerGroup.id}>
                    {footerGroup.headers.map((header) => {
                      // @ts-expect-error: 'style' is not typed in ColumnMeta
                      const columnStyle = header.column.columnDef.meta?.style || {};
                      const columnWidth = columnSizing[header.id] || header.getSize() || 150;

                      return (
                        <Th
                          key={header.id}
                          colSpan={header.colSpan}
                          // className="bg-gray-50 font-bold border-t-2 border-gray-300"
                          style={{
                            ...columnStyle,
                            width: columnWidth,
                            minWidth: header.column.columnDef.minSize || 10,
                            maxWidth: header.column.columnDef.maxSize || 1000,
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.footer, header.getContext())}
                        </Th>
                      );
                    })}
                  </Tr>
                ))}
              </TFoot>
            )}
          </Table>
        </div>
      </div>

      {showPagination && total > 10 && (
        <div
          className="flex items-center justify-between border-t border-gray-200 bg-white py-2 shadow-sm"
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 5,
            flexShrink: 0,
          }}
        >
          <Pagination
            pageSize={pageSize}
            currentPage={pageIndex}
            total={total}
            onChange={handlePaginationChange}
          />
          <div style={{ minWidth: 130 }}>
            <Select
              key={`page-size-select-${pageIndex}-${pageSize}-${total}-${remainingData}`}
              instanceId={instanceId}
              size="sm"
              menuPlacement="top"
              isSearchable={false}
              value={pageSizeOption?.find?.((option) => option?.value === pageSize) || null}
              options={pageSizeOption}
              onChange={(option) => handleSelectChange(option?.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export type { Row, CellContext };
export default DataTable;
