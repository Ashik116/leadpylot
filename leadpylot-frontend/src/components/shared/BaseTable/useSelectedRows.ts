import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { useState, useCallback } from 'react';

export interface UseSelectedRowsConfig {
  // Enable/disable row selection
  selectable?: boolean;

  // Custom row ID field (defaults to '_id')
  rowIdField?: string;

  // Initial selected rows
  initialSelected?: string[];

  // Callback when selection changes
  onSelectionChange?: (selectedIds: string[]) => void;

  // Return full row objects instead of just IDs
  returnFullObjects?: boolean;

  // Table name
  tableName?: string;
}

export interface UseSelectedRowsReturn {
  // State
  selectedRows: string[];
  selectedRowObjects: any[];
  isAllSelected: (rows: any[]) => boolean;
  isIndeterminate: (rows: any[]) => boolean;

  // Actions
  selectRow: (rowId: string) => void;
  deselectRow: (rowId: string) => void;
  selectAll: (rowIds: string[]) => void;
  clearSelection: () => void;
  toggleRow: (rowId: string) => void;

  // Utilities
  getRowId: (row: any) => string;
  isRowSelected: (row: any) => boolean;

  // Action handlers
  handleRowCheckboxChange: (checked: boolean, row: any) => void;
  handleSelectAllChange: (checked: boolean, rows: any[]) => void;
}

export const useSelectedRows = (config: UseSelectedRowsConfig = {}): UseSelectedRowsReturn => {
  const {
    selectable = true,
    rowIdField = '_id',
    initialSelected = [],
    onSelectionChange,
    returnFullObjects = false,
    tableName = '',
  } = config;

  const [selectedRows, setSelectedRows] = useState<string[]>(initialSelected);
  const [selectedRowObjects, setSelectedRowObjects] = useState<any[]>([]);
  const { setSelectedItems, clearSelectedItems } = useSelectedItemsStore();

  // Get row ID from row object
  const getRowId = useCallback(
    (row: any): string => {
      const id = row[rowIdField];
      return id?.toString() || '';
    },
    [rowIdField]
  );

  // Check if a row is selected
  const isRowSelected = useCallback(
    (row: any): boolean => {
      const rowId = getRowId(row);
      return selectedRows.includes(rowId);
    },
    [selectedRows, getRowId]
  );

  // Select a single row
  const selectRow = useCallback(
    (rowId: string, rowObject?: any) => {
      if (!selectable) return;

      setSelectedRows((prev) => {
        const newSelection = prev.includes(rowId) ? prev : [...prev, rowId];
        onSelectionChange?.(newSelection);
        return newSelection;
      });

      // Update global store with selected item
      if (rowObject && tableName) {
        // Get current selected items from store for this table
        const currentSelectedItems = useSelectedItemsStore
          .getState()
          .getSelectedItems(tableName as any);
        const currentPage = useSelectedItemsStore.getState().getCurrentPage();
        // Check if we're on the same page/table
        if (currentPage === tableName) {
          // Add to existing selection if not already selected
          const itemExists = currentSelectedItems.some((item) => getRowId(item) === rowId);
          if (!itemExists) {
            const newItems = [...currentSelectedItems, rowObject as Record<string, any>];
            if (tableName === 'reclamations') {
              // eslint-disable-next-line no-console
              console.log('[useSelectedRows] setSelectedItems reclamations (add):', {
                tableName,
                newItemsCount: newItems.length,
                newItems,
              });
            }
            setSelectedItems(newItems, tableName as any);
          }
        } else {
          // Start fresh selection for new table
          if (tableName === 'reclamations') {
            // eslint-disable-next-line no-console
            console.log('[useSelectedRows] setSelectedItems reclamations (single):', {
              tableName,
              rowObject,
            });
          }
          setSelectedItems([rowObject as Record<string, any>], tableName as any);
        }
      }

      if (returnFullObjects && rowObject) {
        setSelectedRowObjects((prev) => {
          const exists = prev.some((obj) => getRowId(obj) === rowId);
          return exists ? prev : [...prev, rowObject];
        });
      }
    },
    [selectable, onSelectionChange, returnFullObjects, getRowId, tableName]
  );

  // Deselect a single row
  const deselectRow = useCallback(
    (rowId: string) => {
      if (!selectable) return;

      setSelectedRows((prev) => {
        const newSelection = prev.filter((id) => id !== rowId);
        onSelectionChange?.(newSelection);
        return newSelection;
      });

      // Update global store by removing the deselected item
      if (tableName) {
        const currentSelectedItems = useSelectedItemsStore
          .getState()
          .getSelectedItems(tableName as any);
        const currentPage = useSelectedItemsStore.getState().getCurrentPage();

        if (currentPage === tableName) {
          const updatedItems = currentSelectedItems.filter((item) => getRowId(item) !== rowId);
          if (updatedItems.length === 0) {
            clearSelectedItems();
          } else {
            setSelectedItems(updatedItems, tableName as any);
          }
        }
      }

      if (returnFullObjects) {
        setSelectedRowObjects((prev) => prev.filter((obj) => getRowId(obj) !== rowId));
      }
    },
    [selectable, onSelectionChange, returnFullObjects, getRowId, tableName]
  );

  // Toggle row selection
  const toggleRow = useCallback(
    (rowId: string, rowObject?: any) => {
      if (!selectable) return;

      const isCurrentlySelected = selectedRows.includes(rowId);

      if (isCurrentlySelected) {
        deselectRow(rowId);
      } else {
        selectRow(rowId, rowObject);
      }
    },
    [selectable, selectedRows, selectRow, deselectRow]
  );

  // Select all rows
  const selectAll = useCallback(
    (rowIds: string[], rowObjects?: any[]) => {
      if (!selectable) return;
      // console.log('rowIds from selectAll', rowIds, rowObjects, tableName);
      setSelectedRows((prev) => {
        const newSelection = [...new Set([...prev, ...rowIds])];
        onSelectionChange?.(newSelection);
        return newSelection;
      });

      // Update global store with selected items
      if (rowObjects && rowObjects.length > 0 && tableName) {
        const currentSelectedItems = useSelectedItemsStore
          .getState()
          .getSelectedItems(tableName as any);
        const currentPage = useSelectedItemsStore.getState().getCurrentPage();

        const selectedObjects: Record<string, any>[] = [];
        rowIds.forEach((rowId) => {
          const foundObject = rowObjects.find((obj) => getRowId(obj) === rowId);
          if (foundObject) {
            selectedObjects.push(foundObject as Record<string, any>);
          }
        });

        if (selectedObjects.length > 0) {
          if (currentPage === tableName) {
            // Merge with existing selection, avoiding duplicates
            const existingIds = currentSelectedItems.map((item) => getRowId(item));
            const newObjects = selectedObjects.filter(
              (obj) => !existingIds.includes(getRowId(obj))
            );
            const mergedItems = [...currentSelectedItems, ...newObjects];
            if (tableName === 'reclamations') {
              // eslint-disable-next-line no-console
              console.log('[useSelectedRows] setSelectedItems reclamations (merge):', {
                tableName,
                mergedCount: mergedItems.length,
                mergedItems,
              });
            }
            setSelectedItems(mergedItems, tableName as any);
          } else {
            // Start fresh selection for new table
            if (tableName === 'reclamations') {
              // eslint-disable-next-line no-console
              console.log('[useSelectedRows] setSelectedItems reclamations (selectAll):', {
                tableName,
                selectedObjectsCount: selectedObjects.length,
                selectedObjects,
              });
            }
            setSelectedItems(selectedObjects, tableName as any);
          }
        }
      }

      if (returnFullObjects && rowObjects) {
        setSelectedRowObjects((prev) => {
          const existingIds = prev.map((obj) => getRowId(obj));
          const newObjects = rowObjects.filter((obj) => !existingIds.includes(getRowId(obj)));
          return [...prev, ...newObjects];
        });
      }
    },
    [selectable, onSelectionChange, returnFullObjects, getRowId, tableName]
  );

  // Clear all selections
  const clearSelection = useCallback(() => {
    if (!selectable) return;

    setSelectedRows([]);
    setSelectedRowObjects([]);
    onSelectionChange?.([]);

    // Clear global store
    clearSelectedItems();
  }, [selectable, onSelectionChange, clearSelectedItems]);

  // Handle individual row checkbox change
  const handleRowCheckboxChange = useCallback(
    (checked: boolean, row: any) => {
      const rowId = getRowId(row);
      if (checked) {
        selectRow(rowId, row);
      } else {
        deselectRow(rowId);
      }
    },
    [getRowId, selectRow, deselectRow]
  );

  // Handle select all checkbox change
  const handleSelectAllChange = useCallback(
    (checked: boolean, rows: any[]) => {
      const rowIds = rows.map((row) => getRowId(row)).filter(Boolean);

      if (checked) {
        selectAll(rowIds, rows);
      } else {
        clearSelection();
      }
    },
    [getRowId, selectAll, clearSelection]
  );

  // Check if all visible rows are selected
  const isAllSelected = useCallback(
    (rows: any[]): boolean => {
      if (rows.length === 0) return false;
      const rowIds = rows.map((row) => getRowId(row)).filter(Boolean);
      return rowIds.length > 0 && rowIds.every((id) => selectedRows.includes(id));
    },
    [selectedRows, getRowId]
  );

  // Check if selection is indeterminate (some but not all selected)
  const isIndeterminate = useCallback(
    (rows: any[]): boolean => {
      if (rows.length === 0) return false;
      const rowIds = rows.map((row) => getRowId(row)).filter(Boolean);
      const selectedInRows = rowIds.filter((id) => selectedRows.includes(id));
      return selectedInRows.length > 0 && selectedInRows.length < rowIds.length;
    },
    [selectedRows, getRowId]
  );

  return {
    // State
    selectedRows,
    selectedRowObjects,
    isAllSelected,
    isIndeterminate,

    // Actions
    selectRow,
    deselectRow,
    selectAll,
    clearSelection,
    toggleRow,

    // Utilities
    getRowId,
    isRowSelected,

    // Action handlers
    handleRowCheckboxChange,
    handleSelectAllChange,
  };
};
