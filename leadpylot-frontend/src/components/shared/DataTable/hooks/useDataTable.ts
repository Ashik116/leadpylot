import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnSort,
  Row,
  ColumnDef as TanstackColumnDef,
} from '@tanstack/react-table';
import { useColumnSizingStore } from '@/stores/columnSizingStore';
import { getPageSpecificColumnWidth } from '@/utils/columnWidthsUtils';
import { DataTableProps, ColumnDef } from '../types';

const getInitialColumnWidth = <T>(
  col: ColumnDef<T>,
  columnId: string,
  instanceId: string
): number => {
  // 1. Explicit prop priority
  if (col.columnWidth !== undefined) {
    const width = col.columnWidth;
    if (typeof width === 'string') {
      return parseInt(width.replace(/[^\d]/g, ''), 10) || 150;
    }
    return (width as number) || 150;
  }

  // 2. Global project default priority
  const pageSpecific = getPageSpecificColumnWidth(columnId, instanceId, -1);
  if (pageSpecific !== -1) return pageSpecific;

  // 3. TanStack standard / hardcoded fallback
  return (col as any).size || 150;
};

export function useDataTable<T>(props: DataTableProps<T> & { flexColumnId?: string | null }) {
  const {
    columns: columnsProp = [],
    data = [],
    instanceId = 'data-table',
    externalSorting,
    onExternalSortingChange,
    onSort,
    enableColumnResizing = true,
    selectable = false,
    checkboxChecked,
    indeterminateCheckboxChecked,
    onCheckBoxChange,
    onIndeterminateCheckBoxChange,
    flexColumnId = null, // The last column that will absorb remaining space
  } = props;

  // Column sizing store actions
  const registerResetFunction = useColumnSizingStore((s) => s.registerResetFunction);
  const unregisterResetFunction = useColumnSizingStore((s) => s.unregisterResetFunction);
  const updateHasNonDefaultWidths = useColumnSizingStore((s) => s.updateHasNonDefaultWidths);

  // Sorting state
  const [internalSorting, setInternalSorting] = useState<ColumnSort[]>([]);
  const sorting = externalSorting !== undefined ? externalSorting : internalSorting;
  const setSorting = onExternalSortingChange || setInternalSorting;

  // Column sizing state
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(() => {
    const getBaseSizing = () => {
      const sizing: Record<string, number> = {};
      columnsProp.forEach((col, index) => {
        const id = col.id || `col-${index}`;
        sizing[id] = getInitialColumnWidth(col, id, instanceId);
      });
      return sizing;
    };

    if (typeof window === 'undefined') return getBaseSizing();

    const storageKey = `table-column-sizes-${instanceId}`;
    const savedSizing = localStorage.getItem(storageKey);

    if (savedSizing) {
      try {
        const parsed = JSON.parse(savedSizing);
        const sizing = getBaseSizing();
        // Override defaults with saved values, clamped to column minSize/maxSize
        Object.keys(sizing).forEach((id) => {
          if (typeof parsed[id] !== 'number') return;
          const col = columnsProp?.find?.(
            (c: ColumnDef<T>, idx: number) => (c?.id || `col-${idx}`) === id
          );
          const minSize = (col as any)?.minSize ?? 80;
          const maxSize = (col as any)?.maxSize ?? 10000;
          sizing[id] = Math.max(minSize, Math.min(maxSize, parsed[id]));
        });
        return sizing;
      } catch {
        /* ignore parse error */
      }
    }

    return getBaseSizing();
  });

  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);

  const saveColumnSizing = useCallback(
    (sizing: Record<string, number>) => {
      if (typeof window === 'undefined') return;
      const storageKey = `table-column-sizes-${instanceId}`;
      try {
        // Exclude flexColumnId from being saved - it's always calculated dynamically
        const sizingToSave = flexColumnId
          ? Object.fromEntries(Object.entries(sizing).filter(([id]) => id !== flexColumnId))
          : sizing;
        localStorage.setItem(storageKey, JSON.stringify(sizingToSave));
      } catch {
        // Failed to save
      }
    },
    [instanceId, flexColumnId]
  );

  const handleColumnResize = useCallback(
    (updaterOrValue: any) => {
      setColumnSizing(updaterOrValue);
      setIsResizing(true);
      setResizingColumnId(updaterOrValue?.isResizingColumn ? updaterOrValue?.columnId : null);

      const newSizing =
        typeof updaterOrValue === 'function' ? updaterOrValue(columnSizing) : updaterOrValue;
      saveColumnSizing(newSizing);
    },
    [columnSizing, saveColumnSizing]
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizingColumnId(null);
  }, []);

  // Effect to handle column changes
  useEffect(() => {
    const currentColumnIds = columnsProp?.map?.(
      (col: ColumnDef<T>, index: number) => col?.id || `col-${index}`
    );
    const currentSizingKeys = Object.keys(columnSizing);

    const hasNewColumns = currentColumnIds?.some?.(
      (id: string) => !currentSizingKeys?.includes(id)
    );
    const hasRemovedColumns = currentSizingKeys?.some?.((key) => !currentColumnIds?.includes(key));

    if (hasNewColumns || hasRemovedColumns) {
      const updatedSizing: Record<string, number> = {};
      currentColumnIds?.forEach?.((columnId: string) => {
        if (columnSizing[columnId]) {
          updatedSizing[columnId] = columnSizing[columnId];
        } else {
          const col = columnsProp?.find?.(
            (c: ColumnDef<T>, index: number) => (c?.id || `col-${index}`) === columnId
          );
          updatedSizing[columnId] = col
            ? getInitialColumnWidth(col, columnId, instanceId)
            : getPageSpecificColumnWidth(columnId, instanceId, 150);
        }
      });
      setColumnSizing(updatedSizing);
      saveColumnSizing(updatedSizing);
    }
  }, [columnsProp, columnSizing, saveColumnSizing, instanceId]);

  // Track previous sort state to prevent infinite loops
  const previousSortRef = useRef<string>('');

  // Sorting effect - only call onSort when sort actually changes
  useEffect(() => {
    if (externalSorting === undefined && onSort) {
      let currentSortKey = '';
      let currentSortOrder: 'asc' | 'desc' | '' = '';

      if (Array.isArray(sorting) && sorting?.length > 0) {
        currentSortOrder = sorting[0]?.desc ? 'desc' : 'asc';
        currentSortKey = String(sorting[0]?.id || '');
      } else if (Array.isArray(sorting) && sorting?.length === 0) {
        currentSortOrder = '';
        currentSortKey = '';
      }

      // Create a unique key for the current sort state
      const sortKey = `${currentSortKey}:${currentSortOrder}`;

      // Only call onSort if the sort state actually changed
      if (sortKey !== previousSortRef.current) {
        previousSortRef.current = sortKey;
        onSort({ order: currentSortOrder, key: currentSortKey });
      }
    }
  }, [sorting, externalSorting, onSort]);

  // Reset functions
  const getDefaultColumnSizing = useCallback(() => {
    const defaultSizing: Record<string, number> = {};
    columnsProp?.forEach?.((col: ColumnDef<T>, index: number) => {
      const columnId = col?.id || `col-${index}`;
      defaultSizing[columnId] = getInitialColumnWidth(col, columnId, instanceId);
    });
    return defaultSizing;
  }, [columnsProp, instanceId]);

  const checkIfWidthsDifferFromDefaults = useCallback(() => {
    const defaultSizing = getDefaultColumnSizing();
    const currentSizing = columnSizing;

    for (const [columnId, currentWidth] of Object.entries(currentSizing)) {
      // Skip flex column - it's always calculated dynamically
      if (flexColumnId && columnId === flexColumnId) continue;

      const defaultWidth = defaultSizing[columnId];
      if (defaultWidth !== undefined && Math.abs(currentWidth - defaultWidth) > 1) {
        return true;
      }
    }
    for (const columnId of Object.keys(defaultSizing)) {
      // Skip flex column
      if (flexColumnId && columnId === flexColumnId) continue;

      if (currentSizing[columnId] === undefined) {
        return true;
      }
    }
    return false;
  }, [columnSizing, getDefaultColumnSizing, flexColumnId]);

  const resetColumnSizing = useCallback(() => {
    const defaultSizing = getDefaultColumnSizing();
    setColumnSizing(defaultSizing);
    saveColumnSizing(defaultSizing);
  }, [getDefaultColumnSizing, saveColumnSizing]);

  // Use ref to store the latest resetColumnSizing function to break dependency cycle
  const resetColumnSizingRef = useRef(resetColumnSizing);
  useEffect(() => {
    resetColumnSizingRef.current = resetColumnSizing;
  }, [resetColumnSizing]);

  useEffect(() => {
    // Register a stable wrapper function that always calls the latest resetColumnSizing
    const stableWrapper = () => resetColumnSizingRef.current();
    registerResetFunction(instanceId, stableWrapper);
    return () => {
      unregisterResetFunction(instanceId);
    };
    // Only depend on instanceId and store functions - the wrapper function is stable
  }, [instanceId, registerResetFunction, unregisterResetFunction]);

  // Use ref to track previous value to prevent unnecessary updates
  const prevHasNonDefaultRef = useRef<boolean | null>(null);

  useEffect(() => {
    const hasNonDefault = checkIfWidthsDifferFromDefaults();
    // Only update if the value actually changed
    if (prevHasNonDefaultRef.current !== hasNonDefault) {
      prevHasNonDefaultRef.current = hasNonDefault;
      updateHasNonDefaultWidths(instanceId, hasNonDefault);
    }
  }, [columnSizing, instanceId, updateHasNonDefaultWidths, checkIfWidthsDifferFromDefaults]);

  // Table instance
  const table = useReactTable({
    data,
    columns: columnsProp as TanstackColumnDef<unknown, any>[], // Note: This needs to be the final processed columns, but for now we pass raw props. We might need to move column processing here or pass it in.
    // Actually, column processing (adding checkboxes etc) was done in the component.
    // We should probably move that logic here or keep it in the component and pass "finalColumns" to useReactTable.
    // Let's assume we will pass the processed columns to this hook or handle it here.
    // For now, I'll accept `finalColumns` as an argument if needed, or just use `columnsProp` and let the caller handle the special columns.
    // Wait, the original code computed `finalColumns` using `useMemo` inside the component. I should probably include that logic here or in a separate hook.
    // Let's keep it simple: `useDataTable` manages state. The column construction can be a separate utility or part of this hook.
    // I'll add `finalColumns` as a dependency/argument to `useReactTable` inside this hook.
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

  return {
    table,
    sorting,
    setSorting,
    columnSizing,
    setColumnSizing,
    isResizing,
    resizingColumnId,
    resetSorting: () => {
      table.resetSorting();
      if (externalSorting !== undefined && onExternalSortingChange) {
        onExternalSortingChange([]);
      } else {
        setInternalSorting([]);
      }
    },
    resetSelected: () => table.resetRowSelection(true),
    resetColumnSizing,
    saveColumnSizing,
    setIsResizing,
    setResizingColumnId,
  };
}
