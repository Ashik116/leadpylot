import { useCallback, useEffect, useMemo, useState } from 'react';

import { ColumnDef } from '@/components/shared/DataTable';
import { useColumnOrderStore } from '@/stores/columnOrderStore';

// Helper function to get column key
const getColumnKey = (column: ColumnDef<any, any>): string | undefined => {
  if (column.id) {
    return column.id;
  }
  if ('accessorKey' in column && typeof column.accessorKey === 'string') {
    return column.accessorKey;
  }
  return undefined;
};
// test update

// Helper function to get column display label
const getColumnDisplayLabel = (column: ColumnDef<any, any>): string => {
  if (typeof column.header === 'string') {
    return column.header;
  }
  if (typeof column.header === 'function') {
    const headerResult = (column as any).header();
    if (headerResult && headerResult.props && headerResult.props.children) {
      return headerResult.props.children;
    }
    return column.id || 'Column';
  }
  if ('accessorKey' in column && typeof column.accessorKey === 'string') {
    return column.accessorKey
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  if (column.id) {
    return column.id.charAt(0).toUpperCase() + column.id.slice(1);
  }
  return 'Unnamed Column';
};

interface UseColumnCustomizationProps {
  tableName: string;
  columns: ColumnDef<any, any>[];
  disableStorage?: boolean;
}

export const useColumnCustomization = ({
  tableName,
  columns = [],
  disableStorage = false,
}: UseColumnCustomizationProps) => {
  // Store hooks

  const {
    getColumnOrder,
    setColumnOrder,
    getColumnVisibility,
    setColumnVisibility: setStoredColumnVisibility,
    updateColumnVisibility,
    resetColumnOrder,
    resetColumnVisibility,
    hasHydrated,
    hydrateFromServer,
  } = useColumnOrderStore();

  // Get current state from store (only if storage is enabled)
  const columnOrder = disableStorage ? [] : getColumnOrder(tableName);
  const columnVisibility = disableStorage ? {} : getColumnVisibility(tableName);

  // Ensure server hydration kicks in on first mount when storage is enabled
  useEffect(() => {
    if (disableStorage) return;
    if (!hasHydrated) {
      void hydrateFromServer();
    }
  }, [disableStorage, hasHydrated, hydrateFromServer]);

  // Initialize column order if empty AND store has hydrated AND storage is enabled
  useEffect(() => {
    if (disableStorage) return;

    if (hasHydrated && columnOrder.length === 0 && columns.length > 0) {
      const defaultOrder = columns
        .filter((col) => {
          const key = getColumnKey(col);
          return key && !['checkbox', 'action', 'actions', 'expander'].includes(key);
        })
        .map((col) => getColumnKey(col))
        .filter(Boolean) as string[];

      if (defaultOrder.length > 0) {
        setColumnOrder(tableName, defaultOrder);
      }
    }
  }, [columns, columnOrder.length, setColumnOrder, hasHydrated, tableName, disableStorage]);

  // NOTE: Column visibility initialization removed intentionally.
  // We no longer auto-set all columns to visible when empty.
  // Instead, server preferences take precedence, and columns without
  // explicit visibility settings default to visible in renderableColumns.
  // This prevents overwriting admin-configured agent preferences.

  // Handler for column visibility changes (only if storage is enabled)
  const handleColumnVisibilityChange = useCallback(
    (columnKey: string, isVisible: boolean) => {
      if (disableStorage) return;
      updateColumnVisibility(tableName, columnKey, isVisible);
    },
    [tableName, updateColumnVisibility, disableStorage]
  );

  // Reset functionality (only if storage is enabled)
  const handleReset = useCallback(() => {
    if (disableStorage) return;
    resetColumnOrder(tableName);
    resetColumnVisibility(tableName, [], columns);
  }, [tableName, resetColumnOrder, resetColumnVisibility, columns, disableStorage]);

  // Get renderable columns with correct order and visibility
  const renderableColumns = useMemo(() => {
    // If storage is disabled or store not hydrated yet, return all columns in original order
    // ✅ Use isClient check to ensure first client render matches server render (hydration safety)
    if (disableStorage || !hasHydrated) {
      return columns;
    }

    // First filter visible columns
    // IMPORTANT: If a column has no explicit visibility setting (undefined),
    // treat it as visible (true) by default. Only hide if explicitly set to false.
    const visibleColumns = columns.filter((col) => {
      const key = getColumnKey(col);
      if (!key) return false;
      if (['checkbox', 'action', 'actions', 'expander'].includes(key)) {
        return true;
      }
      // Default to visible (true) if visibility is not explicitly set
      return columnVisibility[key] !== false;
    });

    // Separate system columns from reorderable columns
    const systemColumnsStart = visibleColumns.filter((col) => {
      const key = getColumnKey(col);
      return key && ['checkbox', 'expander'].includes(key);
    });

    const systemColumnsEnd = visibleColumns.filter((col) => {
      const key = getColumnKey(col);
      return key && (key === 'action' || key === 'actions');
    });

    const reorderableColumns = visibleColumns.filter((col) => {
      const key = getColumnKey(col);
      return key && !['checkbox', 'expander', 'action', 'actions'].includes(key);
    });

    // Apply custom ordering to reorderable columns only
    const orderedReorderableColumns = [...reorderableColumns];
    if (columnOrder.length > 0) {
      orderedReorderableColumns.sort((a, b) => {
        const aKey = getColumnKey(a);
        const bKey = getColumnKey(b);

        if (!aKey || !bKey) return 0;

        const aIndex = columnOrder.indexOf(aKey);
        const bIndex = columnOrder.indexOf(bKey);

        // If both are in the order, sort by position
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }

        // If only one is in the order, prioritize it
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        // If neither is in the order, maintain original order
        return 0;
      });
    }

    // Combine columns: system start + reorderable + system end
    return [...systemColumnsStart, ...orderedReorderableColumns, ...systemColumnsEnd];
  }, [columns, columnVisibility, columnOrder, disableStorage, hasHydrated]);

  return {
    // State
    columnOrder,
    columnVisibility,
    renderableColumns,
    hasHydrated,

    // Handlers
    handleColumnVisibilityChange,
    handleReset,

    // Helper functions
    getColumnKey,
    getColumnDisplayLabel,

    // Store functions (if needed directly)
    setColumnOrder: (order: string[]) => {
      if (disableStorage) return;
      setColumnOrder(tableName, order);
    },
    setColumnVisibility: (visibility: Record<string, boolean>) => {
      if (disableStorage) return;
      setStoredColumnVisibility(tableName, visibility);
    },
    updateColumnVisibility: (columnKey: string, isVisible: boolean) => {
      if (disableStorage) return;
      updateColumnVisibility(tableName, columnKey, isVisible);
    },
    resetColumnOrder: () => {
      if (disableStorage) return;
      resetColumnOrder(tableName);
    },
    resetColumnVisibility: (preservedFields?: string[], cols?: any[]) => {
      if (disableStorage) return;
      resetColumnVisibility(tableName, preservedFields, cols);
    },
  };
};
