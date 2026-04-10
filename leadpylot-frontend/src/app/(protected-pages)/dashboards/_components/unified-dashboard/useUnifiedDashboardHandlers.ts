/**
 * UnifiedDashboard drag-drop and dialog handlers.
 * Creates handlers that populate selection store and open dialogs (confirmation, payment, netto, lost).
 */
import { useCallback, useMemo } from 'react';
import { getTableNameForDashboardType, TDashboardType } from '../dashboardTypes';
import { useDashboardDragDrop } from '../useDashboardDragDrop';

function createOpenDialogHandler(
  clearSelectedItems: () => void,
  addSelectedItem: (item: any, tableName: any) => void,
  tableName: any,
  setDialogOpen: (value: boolean) => void
) {
  return (items: any[]) => {
    clearSelectedItems();
    items.forEach((item) => addSelectedItem(item, tableName));
    setDialogOpen(true);
  };
}

interface UseUnifiedDashboardHandlersParams {
  dashboardType: TDashboardType;
  selectedProgressFilter: TDashboardType;
  tableProgressFilter?: TDashboardType;
  sessionRole?: string;
  clearSelectedItems: () => void;
  addSelectedItem: (item: any, tableName: any) => void;
  setForceUpdate: (fn: (prev: number) => number) => void;
  setCreateConfirmationDialogOpen: (value: boolean) => void;
  setIsPaymentVoucherDialogOpen: (value: boolean) => void;
  setIsNettoDialogOpen: (value: boolean) => void;
  setIsLostDialogOpen: (value: boolean) => void;
}

export function useUnifiedDashboardHandlers({
  dashboardType,
  selectedProgressFilter,
  tableProgressFilter,
  sessionRole,
  clearSelectedItems,
  addSelectedItem,
  setForceUpdate,
  setCreateConfirmationDialogOpen,
  setIsPaymentVoucherDialogOpen,
  setIsNettoDialogOpen,
  setIsLostDialogOpen,
}: UseUnifiedDashboardHandlersParams) {
  const tableName = useMemo(
    () => getTableNameForDashboardType(dashboardType, selectedProgressFilter) as any,
    [dashboardType, selectedProgressFilter]
  );

  const clearAllSelections = useCallback(() => {
    clearSelectedItems();
    setForceUpdate((prev) => prev + 1);
  }, [clearSelectedItems, setForceUpdate]);

  const handleOpenConfirmationDialog = useMemo(
    () =>
      createOpenDialogHandler(
        clearSelectedItems,
        addSelectedItem,
        tableName,
        setCreateConfirmationDialogOpen
      ),
    [clearSelectedItems, addSelectedItem, tableName, setCreateConfirmationDialogOpen]
  );

  const handleOpenPaymentDialog = useMemo(
    () =>
      createOpenDialogHandler(
        clearSelectedItems,
        addSelectedItem,
        tableName,
        setIsPaymentVoucherDialogOpen
      ),
    [clearSelectedItems, addSelectedItem, tableName, setIsPaymentVoucherDialogOpen]
  );

  const handleOpenNettoDialog = useMemo(
    () =>
      createOpenDialogHandler(
        clearSelectedItems,
        addSelectedItem,
        tableName,
        setIsNettoDialogOpen
      ),
    [clearSelectedItems, addSelectedItem, tableName, setIsNettoDialogOpen]
  );

  const handleOpenLostDialog = useMemo(
    () =>
      createOpenDialogHandler(
        clearSelectedItems,
        addSelectedItem,
        tableName,
        setIsLostDialogOpen
      ),
    [clearSelectedItems, addSelectedItem, tableName, setIsLostDialogOpen]
  );

  useDashboardDragDrop({
    tableProgressFilter,
    sessionRole: sessionRole as any,
    handleOpenConfirmationDialog,
    handleOpenPaymentDialog,
    handleOpenNettoDialog,
    handleOpenLostDialog,
  });

  return {
    clearAllSelections,
    handleOpenConfirmationDialog,
    handleOpenPaymentDialog,
    handleOpenNettoDialog,
    handleOpenLostDialog,
  };
}
