import { useEffect } from 'react';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { TDashboardType } from './dashboardTypes';

// Drag-drop context for cross-table drag and drop
let useDragDropHook: (() => any) | null = null;
if (typeof window !== 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dragDropModule = require('../openings/_components/DragDropContext');
    useDragDropHook = dragDropModule.useDragDrop;
  } catch {
    // Context not available, drag-drop disabled
  }
}

// Safe wrapper hook that always calls something (satisfies React hook rules)
const useSafeDragDrop = () => {
  // Always call a hook-like function - if useDragDropHook exists, use it, otherwise return null
  // This is a dynamic import scenario, so conditional hook calling is necessary
  if (useDragDropHook) {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useDragDropHook();
    } catch {
      return null;
    }
  }
  // Return a stable null value instead of calling a hook conditionally
  return null;
};

type UseDashboardDragDropArgs = {
  tableProgressFilter?: TDashboardType;
  sessionRole?: Role;
  handleOpenConfirmationDialog: (items: any[]) => void;
  handleOpenPaymentDialog: (items: any[]) => void;
  handleOpenNettoDialog: (items: any[]) => void;
  handleOpenLostDialog: (items: any[]) => void;
};

export const useDashboardDragDrop = ({
  tableProgressFilter,
  sessionRole,
  handleOpenConfirmationDialog,
  handleOpenPaymentDialog,
  handleOpenNettoDialog,
  handleOpenLostDialog,
}: UseDashboardDragDropArgs) => {
  const dragDropContext = useSafeDragDrop();

  // Register dialog handlers with drag-drop context
  // Only re-register when tableProgressFilter changes to prevent race conditions
  // Disable for Agent role
  useEffect(() => {
    if (dragDropContext && tableProgressFilter && sessionRole !== Role.AGENT) {
      dragDropContext.registerTableHandlers(tableProgressFilter, {
        openConfirmationDialog: handleOpenConfirmationDialog,
        openPaymentDialog: handleOpenPaymentDialog,
        openNettoDialog: handleOpenNettoDialog,
        openLostDialog: handleOpenLostDialog,
      });

      return () => {
        dragDropContext.unregisterTableHandlers(tableProgressFilter);
      };
    }
  }, [
    dragDropContext,
    tableProgressFilter,
    sessionRole,
    handleOpenConfirmationDialog,
    handleOpenPaymentDialog,
    handleOpenNettoDialog,
    handleOpenLostDialog,
  ]);

  return dragDropContext;
};
