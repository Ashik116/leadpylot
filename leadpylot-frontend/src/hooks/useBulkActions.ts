import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiBulkDelete } from '@/services/LeadsService';
import useNotification from '@/utils/hooks/useNotification';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';

export interface BulkActionsConfig {
  entityName: string; // e.g., 'offers', 'openings', 'confirmations'
  deleteUrl: string; // e.g., '/offers/', '/openings/', '/confirmations/'
  invalidateQueries?: string[]; // Query keys to invalidate after operations
  apiData?: any[]; // The data source to find full objects from
  selectedRows?: string[]; // Selected row IDs from useSelectedRows
  onClearSelection?: () => void; // Callback to clear local selection state
  // Single delete configuration
  singleDeleteConfig?: {
    deleteFunction: (id: string) => Promise<any>;
    onSuccess?: (response: any, deletedId: string) => void;
    onError?: (error: any) => void;
  };
}

export interface BulkActionsState {
  selectedItems: string[];
  deleteConfirmOpen: boolean;
  isDeleting: boolean;
}

export interface BulkActionsHandlers {
  handleCheckboxChange: (id: string) => void;
  handleSelectAll: (visibleIds: string[]) => void;
  handleClearSelection: () => void;
  setDeleteConfirmOpen: (open: boolean) => void;
  handleDeleteConfirm: () => Promise<void>;
  // Single delete handlers
  handleSingleDelete: (id: string) => Promise<void>;
  setSingleDeleteConfirmOpen: (open: boolean) => void;
  singleDeleteConfirmOpen: boolean;
  singleDeleteId: string | null;
  singleDeleteName: string | null;
  isSingleDeleting: boolean;
}

export const useBulkActions = (
  config: BulkActionsConfig
): BulkActionsState & BulkActionsHandlers => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  // Global selected items store
  const { clearSelectedItems } = useSelectedItemsStore();

  // State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [singleDeleteConfirmOpen, setSingleDeleteConfirmOpen] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [singleDeleteName, setSingleDeleteName] = useState<string | null>(null);

  // Use selectedRows from config (passed from useSelectedRows)
  const selectedItems = config.selectedRows || [];

  // Default query keys to invalidate
  const defaultQueries = [config.entityName, 'leads'];
  const queriesToInvalidate = config.invalidateQueries || defaultQueries;

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => apiBulkDelete(config.deleteUrl, ids),
    onSuccess: (data: any) => {
      // Invalidate specified queries
      queriesToInvalidate.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        // Also invalidate nested queries (e.g., ['settings', 'mailservers'])
        queryClient.invalidateQueries({ queryKey: ['settings', queryKey] });
      });

      // Show success notification
      openNotification({
        type: 'success',
        massage: data?.message || `${config.entityName} deleted successfully`,
      });

      // Reset state
      setDeleteConfirmOpen(false);
      clearSelectedItems(); // Clear global store

      // Clear local selection state if callback provided
      if (config.onClearSelection) {
        config.onClearSelection();
      }
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || `Failed to delete ${config.entityName}`,
      });
    },
  });

  // Single delete mutation
  const singleDeleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (config.singleDeleteConfig?.deleteFunction) {
        return config.singleDeleteConfig.deleteFunction(id);
      }
      // Fallback to bulk delete with single ID
      return apiBulkDelete(config.deleteUrl, [id]);
    },
    onSuccess: (data: any, deletedId: string) => {
      // Invalidate specified queries
      queriesToInvalidate.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        // Also invalidate nested queries (e.g., ['settings', 'mailservers'])
        queryClient.invalidateQueries({ queryKey: ['settings', queryKey] });
      });

      // Show success notification
      openNotification({
        type: 'success',
        massage: data?.message || `${config.entityName} deleted successfully`,
      });

      // Reset state
      setSingleDeleteConfirmOpen(false);
      setSingleDeleteId(null);
      setSingleDeleteName(null);

      // Call custom success handler if provided
      if (config.singleDeleteConfig?.onSuccess) {
        config.singleDeleteConfig.onSuccess(data, deletedId);
      }
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || `Failed to delete ${config.entityName}`,
      });

      // Call custom error handler if provided
      if (config.singleDeleteConfig?.onError) {
        config.singleDeleteConfig.onError(error);
      }
    },
  });

  // Selection is handled by useSelectedRows, so these are empty implementations
  const handleCheckboxChange = useCallback(() => {
    // Selection is handled by useSelectedRows
  }, []);

  const handleSelectAll = useCallback(() => {
    // Selection is handled by useSelectedRows
  }, []);

  // Clear all selections
  const handleClearSelection = useCallback(() => {
    clearSelectedItems(); // Clear global store
  }, [clearSelectedItems]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    console.log('🔍 Bulk delete triggered with selectedItems:', {
      selectedItems,
      count: selectedItems.length,
      entityName: config.entityName,
    });
    if (selectedItems.length === 0) {
      console.log('❌ No items selected for deletion');
      return;
    }
    console.log('✅ Proceeding with deletion...');
    await bulkDeleteMutation.mutateAsync(selectedItems);
  }, [selectedItems, bulkDeleteMutation, config.entityName]);

  // Handle single delete
  const handleSingleDelete = useCallback(
    async (id: string) => {
      if (!id) return;
      await singleDeleteMutation.mutateAsync(id);
    },
    [singleDeleteMutation]
  );

  // Set single delete confirmation
  const handleSetSingleDeleteConfirmOpen = useCallback(
    (open: boolean, id?: string, name?: string) => {
      setSingleDeleteConfirmOpen(open);
      if (open && id) {
        setSingleDeleteId(id);
        setSingleDeleteName(name || null);
      } else {
        setSingleDeleteId(null);
        setSingleDeleteName(null);
      }
    },
    []
  );

  return {
    // State
    selectedItems,
    deleteConfirmOpen,
    isDeleting: bulkDeleteMutation.isPending,

    // Handlers
    handleCheckboxChange,
    handleSelectAll,
    handleClearSelection,
    setDeleteConfirmOpen,
    handleDeleteConfirm,

    // Single delete handlers
    handleSingleDelete,
    setSingleDeleteConfirmOpen: handleSetSingleDeleteConfirmOpen,
    singleDeleteConfirmOpen,
    singleDeleteId,
    singleDeleteName,
    isSingleDeleting: singleDeleteMutation.isPending,
  };
};
