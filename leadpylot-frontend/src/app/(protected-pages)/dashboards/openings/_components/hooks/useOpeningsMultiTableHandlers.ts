import { useCallback } from 'react';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DropResult } from '@hello-pangea/dnd';
import { DragDropTableType, TDashboardType } from '../DragDropContext';
import { useOpeningsMultiTable } from '../OpeningsMultiTableContext';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { useDraggedItemsStore } from '@/stores/draggedItemsStore';
import { useBulkCreateConfirmations } from '@/services/hooks/useConfirmations';
import { useCreatePaymentVoucher } from '@/services/hooks/usePaymentVouchers';
import { useBulkCreateLostOffers } from '@/services/hooks/useLostOffers';
import { useCreateOpeningWithoutFiles } from '@/services/hooks/useOpenings';
import {
  useBulkDeleteOpenings,
  useBulkDeleteConfirmations,
  useBulkDeletePaymentVouchers,
  useBulkDeleteOffers,
} from '@/services/hooks/useLeads';
import { useRevertOffers } from '@/hooks/useRevertOffers';
import { useRevertBatch } from '@/services/hooks/useOffersProgress';
import { apiGetRevertOptions } from '@/services/OffersProgressService';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import {
  getTableIndex,
  getStageNameFromTableType,
  isValidDragMovement,
  extractOfferId,
  extractItemId,
  getPageTypeFromProgressFilter,
  TABLE_TITLES,
  PROGRESS_FILTERS,
} from '../openingsMultiTableUtils';

export const useOpeningsMultiTableHandlers = () => {
  const queryClient = useQueryClient();
  const {
    setClearSelectionsSignal,
    setUpdatingTable,
    setDragDropSelectedItems,
    setGlowingItem,
    resetDragStates,
    sourceTableRef,
    destinationTableRef,
    isDraggingRef,
    draggedItemAvailableRevertsRef,
    dragOperationRef,
    setIsDragging,
    setDestinationTable,
    setSourceTable,
    setIsDeleteDialogOpen,
    setDeleteTableType,
    setIsNettoDialogOpen,
  } = useOpeningsMultiTable();

  // Mutations
  const createOpeningMutation = useCreateOpeningWithoutFiles();
  const createPaymentVoucherMutation = useCreatePaymentVoucher();
  const bulkCreateConfirmationsMutation = useBulkCreateConfirmations({
    onSuccess: () => {
      handleClearSelection();
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
    },
  });
  const bulkCreateLostOffersMutation = useBulkCreateLostOffers({
    onSuccess: () => {
      handleClearSelection();
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
    },
  });

  // Bulk delete mutations
  const bulkDeleteOpeningsMutation = useBulkDeleteOpenings();
  const bulkDeleteConfirmationsMutation = useBulkDeleteConfirmations();
  const bulkDeletePaymentVouchersMutation = useBulkDeletePaymentVouchers();
  const bulkDeleteOffersMutation = useBulkDeleteOffers();

  // Revert offers hook
  const { revertOffers, isLoading: isReverting } = useRevertOffers({
    onSuccess: () => {
      handleClearSelection();
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
    },
  });

  // Revert batch hook (for reverse drag-drop)
  const revertBatchMutation = useRevertBatch();

  // Handle clearing selections
  const handleClearSelection = useCallback(() => {
    const { clearSelectedItems } = useSelectedItemsStore.getState();
    clearSelectedItems();
    // Force update to sync BaseTable checkbox state
    setClearSelectionsSignal((prev) => prev + 1);
  }, [setClearSelectionsSignal]);

  // Helper to get selected items from a specific store or all stores
  const getSelectedItemsForTable = useCallback((storeName?: string) => {
    const { getSelectedItems } = useSelectedItemsStore.getState();

    // If store name is provided, get items from that specific store
    if (storeName) {
      return getSelectedItems(storeName as any);
    }

    // Otherwise, try to get from all possible stores
    let selectedItems: any[] = [];

    // Try each store in order (including new unique store names for netto2 and lost)
    const stores = ['offers', 'offers-netto2', 'offers-lost', 'openings', 'confirmations', 'payments'] as const;
    for (const store of stores) {
      const items = getSelectedItems(store as any);
      if (items.length > 0) {
        selectedItems = items;
        break;
      }
    }

    return selectedItems;
  }, []);

  // Helper function to trigger glow effect on dropped item
  const triggerGlowEffect = useCallback((itemId: string, tableId: TDashboardType) => {
    setGlowingItem({ itemId, tableId });

    // Clear glow after 3 seconds
    setTimeout(() => {
      setGlowingItem(null);
    }, 3000);
  }, [setGlowingItem]);

  // Handle revert - gets the selected items from the current table context
  const handleRevert = useCallback(
    async (tableType?: TDashboardType, storeName?: string) => {
      const warn = (msg: string) =>
        toast.push(
          React.createElement(Notification, { title: 'Revert Offers', type: 'warning' }, msg)
        );

      // Get selected items from the specific table or try to find them
      const selectedItems = storeName ? getSelectedItemsForTable(storeName) : getSelectedItemsForTable();

      if (!selectedItems || selectedItems.length === 0) {
        return warn('No items selected');
      }

      // Extract offer IDs from selected items based on table type
      const offerIds: string[] = selectedItems
        .map((item: any) => extractOfferId(item, tableType))
        .filter((id): id is string => id !== null);

      if (offerIds.length === 0) {
        return warn('No valid offer IDs found in selected items');
      }

      if (offerIds.length > 1) {
        return warn('Please select only one offer to revert');
      }

      // Determine the progress filter from table type
      let progressFilter: DragDropTableType = (tableType || 'opening') as DragDropTableType;

      // If tableType is not provided, try to infer from the store name
      if (!tableType && storeName) {
        // Map store name back to progress filter
        switch (storeName) {
          case 'openings':
            progressFilter = 'opening';
            break;
          case 'confirmations':
            progressFilter = 'confirmation';
            break;
          case 'payments':
            progressFilter = 'payment';
            break;
          default:
            progressFilter = 'opening';
        }
      }

      // Validate progress filter - DragDropTableType doesn't include 'netto' or 'offer', so no check needed

      try {
        await revertOffers(offerIds, progressFilter);
      } catch {
        // Error handled by the hook
      }
    },
    [getSelectedItemsForTable, revertOffers]
  );

  // Handle bulk delete
  const handleBulkDelete = useCallback(
    async (tableType: TDashboardType, storeName?: string) => {
      const selectedItems = getSelectedItemsForTable(storeName);
      if (!selectedItems || selectedItems.length === 0) return;

      // Extract IDs based on table type
      let ids: string[] = [];

      switch (tableType) {
        case 'opening':
          ids = selectedItems.map((item: any) => item?._id ?? item?.opening_id?._id).filter(Boolean);
          if (ids.length > 0) {
            await bulkDeleteOpeningsMutation.mutateAsync(ids);
          }
          break;
        case 'confirmation':
          ids = selectedItems.map((item: any) => item?._id ?? item?.confirmation_id?._id).filter(Boolean);
          if (ids.length > 0) {
            await bulkDeleteConfirmationsMutation.mutateAsync(ids);
          }
          break;
        case 'payment':
          ids = selectedItems.map((item: any) => item?._id ?? item?.payment_voucher_id?._id).filter(Boolean);
          if (ids.length > 0) {
            await bulkDeletePaymentVouchersMutation.mutateAsync(ids);
          }
          break;
        case 'netto1':
        case 'netto2':
        case 'lost':
          // For netto and lost, delete the underlying offers
          ids = selectedItems.map((item: any) => extractItemId(item, tableType)).filter((id): id is string => id !== null);
          if (ids.length > 0) {
            await bulkDeleteOffersMutation.mutateAsync(ids);
          }
          break;
        default:
          return;
      }

      // Close dialog and clear selections
      setIsDeleteDialogOpen(false);
      setDeleteTableType(null);
      handleClearSelection();
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
    },
    [
      getSelectedItemsForTable,
      bulkDeleteOpeningsMutation,
      bulkDeleteConfirmationsMutation,
      bulkDeletePaymentVouchersMutation,
      bulkDeleteOffersMutation,
      handleClearSelection,
      queryClient,
      setIsDeleteDialogOpen,
      setDeleteTableType,
    ]
  );

  // Handle create opening
  const handleCreateOpening = useCallback(
    async (storeName?: string) => {
      const selectedItems = getSelectedItemsForTable(storeName);
      if (!selectedItems || selectedItems.length === 0) return;

      const selectedRows = selectedItems
        .map((item: any) => extractOfferId(item))
        .filter((id): id is string => id !== null);
      if (selectedRows.length === 0) return;

      try {
        await Promise.all(
          selectedRows.map((id: string) => createOpeningMutation.mutateAsync({ offer_id: id }))
        );
        toast.push(
          React.createElement(
            Notification,
            { title: 'Openings created', type: 'success' },
            `Successfully created ${selectedRows.length} opening${selectedRows.length > 1 ? 's' : ''}`
          )
        );
        handleClearSelection();
        queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
      } catch {
        // Error handled by mutations
      }
    },
    [getSelectedItemsForTable, createOpeningMutation, handleClearSelection, queryClient]
  );

  // Handle create item for drag-drop (direct API calls for most, dialog only for Netto 2)
  const handleCreateItem = useCallback(
    async (
      type: 'confirmation' | 'payment-voucher' | 'lost',
      data: { reference_no?: string; files?: File[]; amount?: number },
      storeName?: string,
      destTableId?: DragDropTableType
    ) => {
      const { clearDraggedItem } = useDraggedItemsStore.getState();
      const selectedItems = getSelectedItemsForTable(storeName);

      // Set updating table to show spinner
      if (destTableId) {
        setUpdatingTable(destTableId);
      }

      try {
        if (type === 'confirmation') {
          const offerIds: string[] = selectedItems
            .map((item: any) => extractOfferId(item))
            .filter((id): id is string => id !== null);

          if (offerIds.length === 0) {
            setUpdatingTable(null);
            return;
          }

          const confirmationRequests = offerIds.map((offerId: string) => ({
            offer_id: offerId,
            reference_no: data.reference_no || undefined,
            files: data.files || undefined,
          }));

          await bulkCreateConfirmationsMutation.mutateAsync(confirmationRequests);
          // Success - clear updating state and drag operation
          setUpdatingTable(null);

          // Trigger glow effect on the dropped item
          if (dragOperationRef.current?.itemData && destTableId) {
            const itemId = extractOfferId(dragOperationRef.current.itemData);
            if (itemId) {
              triggerGlowEffect(itemId, destTableId);
            }
          }

          dragOperationRef.current = null;

          // Reset drag states after successful operation
          resetDragStates();
          clearDraggedItem();

          // Success handled by mutation's onSuccess callback
        } else if (type === 'payment-voucher') {
          const offerIds: string[] = selectedItems
            .map((item: any) => extractOfferId(item))
            .filter((id): id is string => id !== null);

          if (offerIds.length === 0) {
            setUpdatingTable(null);
            return;
          }

          const promises = offerIds.map(async (offerId: string) => {
            const formData = new FormData();
            formData.append('offer_id', offerId);
            if (data.reference_no) formData.append('reference_no', data.reference_no);
            if (data.amount) formData.append('amount', data.amount.toString());
            if (data.files && Array.isArray(data.files) && data.files.length > 0) {
              data.files.forEach((file) => formData.append('files', file));
            }
            return createPaymentVoucherMutation.mutateAsync(formData);
          });
          await Promise.all(promises);
          // Success - clear updating state and drag operation
          setUpdatingTable(null);

          // Trigger glow effect on the dropped item
          if (dragOperationRef.current?.itemData && destTableId) {
            const itemId = extractOfferId(dragOperationRef.current.itemData);
            if (itemId) {
              triggerGlowEffect(itemId, destTableId);
            }
          }

          dragOperationRef.current = null;

          // Reset drag states after successful operation
          resetDragStates();
          clearDraggedItem();

          // Clear selections and invalidate queries after payment voucher creation
          handleClearSelection();
          queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
          toast.push(
            React.createElement(
              Notification,
              { title: 'Payment vouchers created', type: 'success' },
              `Successfully created ${offerIds.length} payment voucher${offerIds.length > 1 ? 's' : ''}`
            )
          );
        } else if (type === 'lost') {
          const offerIds: string[] = selectedItems
            .map((item: any) => extractOfferId(item))
            .filter((id): id is string => id !== null);

          if (offerIds.length === 0) {
            setUpdatingTable(null);
            return;
          }

          await bulkCreateLostOffersMutation.mutateAsync(offerIds);
          // Success - clear updating state and drag operation
          setUpdatingTable(null);

          // Trigger glow effect on the dropped item
          if (dragOperationRef.current?.itemData && destTableId) {
            const itemId = extractOfferId(dragOperationRef.current.itemData);
            if (itemId) {
              triggerGlowEffect(itemId, destTableId);
            }
          }

          dragOperationRef.current = null;

          // Reset drag states after successful operation
          resetDragStates();
          clearDraggedItem();

          // Success handled by mutation's onSuccess callback
        }
      } catch {
        // Error - immediately reset all drag states to stop the drag operation
        setUpdatingTable(null);
        dragOperationRef.current = null;
        resetDragStates();
        clearDraggedItem();
        // Clear selected items that were added during drag-drop
        handleClearSelection();
        setDragDropSelectedItems([]);
        // Error notification is handled by mutations
      }
    },
    [
      bulkCreateConfirmationsMutation,
      createPaymentVoucherMutation,
      bulkCreateLostOffersMutation,
      handleClearSelection,
      getSelectedItemsForTable,
      queryClient,
      setUpdatingTable,
      triggerGlowEffect,
      dragOperationRef,
      resetDragStates,
      setDragDropSelectedItems,
    ]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { source } = result;
      const { clearDraggedItem } = useDraggedItemsStore.getState();

      // Use custom destinationTableRef if available, otherwise fall back to library's destination
      const destTableId = destinationTableRef.current || (result.destination?.droppableId as DragDropTableType);
      const sourceTableId = sourceTableRef.current || (source.droppableId as DragDropTableType);

      // Get the item data from the draggableId
      let itemData: any = {};
      try {
        const itemDataPart = result.draggableId.split('-item-data-')[1];
        if (itemDataPart) {
          itemData = JSON.parse(itemDataPart);
        }
      } catch {
        // If parsing fails, itemData will be empty object
      }

      // If dropped outside or same table, reset drag states immediately
      if (!destTableId || sourceTableId === destTableId || !PROGRESS_FILTERS.includes(destTableId as any)) {
        resetDragStates();
        clearDraggedItem();
        dragOperationRef.current = null;
        draggedItemAvailableRevertsRef.current = null;
        return;
      }

      // Check if this is a reverse movement (bottom to top) FIRST
      const sourceIndex = getTableIndex(sourceTableId);
      const destIndex = getTableIndex(destTableId);
      const isReverseMovement = destIndex < sourceIndex;

      // Get availableReverts for validation - try multiple sources
      let availableReverts = draggedItemAvailableRevertsRef.current || [];

      // Fallback: try to get from itemData if ref is empty
      if (availableReverts.length === 0) {
        availableReverts =
          itemData?.availableReverts ||
          itemData?.offer_id?.availableReverts ||
          itemData?.originalData?.availableReverts ||
          [];
      }

      // Special handling for "lost" table: if availableReverts doesn't start with "lost", prepend it
      if (sourceTableId === 'lost' && availableReverts.length > 0 && availableReverts[0] !== 'lost') {
        availableReverts = ['lost', ...availableReverts];
      }

      // If availableReverts is still empty and this is a reverse movement, try to fetch it on-demand
      const offerId = extractOfferId(itemData);
      if (isReverseMovement && availableReverts.length === 0 && offerId) {
        try {
          const revertOptionsResponse = await apiGetRevertOptions(offerId);
          if (revertOptionsResponse?.data?.availableReverts) {
            // Map the revert options to stage names array
            availableReverts = revertOptionsResponse.data.availableReverts.map(
              (option: { stage: string }) => option.stage
            );
            // Special handling for "lost" table
            if (sourceTableId === 'lost' && availableReverts.length > 0 && availableReverts[0] !== 'lost') {
              availableReverts = ['lost', ...availableReverts];
            }
          }
        } catch (error) {
          console.warn('Failed to fetch revert options on-demand:', error);
          // Continue with empty availableReverts - will show error below
        }
      }

      // Get valid revert stages (excluding first item which is current table)
      const validRevertStages = availableReverts.length > 0 ? availableReverts.slice(1) : [];

      // Handle reverse movement (revert-batch API) - check this BEFORE general validation
      if (isReverseMovement && availableReverts.length > 0) {
        const sourceStage = getStageNameFromTableType(sourceTableId);
        const destStage = getStageNameFromTableType(destTableId);

        // Find indices in availableReverts array
        let sourceIndexInReverts = availableReverts.indexOf(sourceStage);
        const destIndexInReverts = availableReverts.indexOf(destStage);

        // If source stage is not in availableReverts, it might be the current stage
        // In that case, we need to include it in the stages to revert
        // availableReverts typically contains stages that CAN be reverted (excluding current)
        // So if source is not found, we should prepend it or handle it differently
        if (sourceIndexInReverts < 0) {
          // Source stage not in availableReverts - this means it's the current stage
          // We need to revert from the first available stage up to destination
          sourceIndexInReverts = 0; // Start from first available revert stage
        }

        // Check if destination is in availableReverts
        // For reverse movement: destination must be in availableReverts and come AFTER source in the array
        const isValidReverseMovement =
          destIndexInReverts >= 0 &&
          sourceIndexInReverts >= 0 &&
          destIndexInReverts > sourceIndexInReverts; // dest must be AFTER source in array

        if (isValidReverseMovement) {
          // Calculate stages array: from source to destination (exclusive - don't include destination)
          // This will revert all stages from source (inclusive) up to but not including destination
          let stages = availableReverts.slice(sourceIndexInReverts, destIndexInReverts);

          // If source stage was not in availableReverts, we need to include it
          if (availableReverts.indexOf(sourceStage) < 0 && sourceStage) {
            // Prepend source stage to stages array since it needs to be reverted too
            stages = [sourceStage, ...stages];
          }

          // Get offer ID from itemData
          const offerId = extractOfferId(itemData);

          // Validate that we have stages to revert and an offer ID
          if (offerId && stages.length > 0 && stages.every(stage => stage)) {
            // Set updating table to show spinner
            setUpdatingTable(sourceTableId);

            // Store drag operation details
            dragOperationRef.current = {
              sourceTable: sourceTableId,
              destTable: destTableId,
              itemData,
              availableReverts,
            };

            // Call revert-batch API
            revertBatchMutation.mutate(
              {
                offerId,
                data: {
                  stages,
                  reason: `Reverted via drag-drop from ${TABLE_TITLES[sourceTableId]} to ${TABLE_TITLES[destTableId]}`,
                },
              },
              {
                onSuccess: () => {
                  // Success - clear updating state and drag operation
                  setUpdatingTable(null);
                  dragOperationRef.current = null;
                  draggedItemAvailableRevertsRef.current = null;

                  // Reset drag states after successful operation
                  resetDragStates();
                  clearDraggedItem();

                  // Trigger glow effect on the dropped item
                  const itemId = extractOfferId(itemData);
                  if (itemId && destTableId) {
                    triggerGlowEffect(itemId, destTableId);
                  }

                  // Invalidate queries to refresh data
                  queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
                  handleClearSelection();
                },
                onError: () => {
                  // Error - immediately reset all drag states to stop the drag operation
                  setUpdatingTable(null);
                  dragOperationRef.current = null;
                  draggedItemAvailableRevertsRef.current = null;
                  resetDragStates();
                  clearDraggedItem();
                  // Clear selected items that were added during drag-drop
                  handleClearSelection();
                  setDragDropSelectedItems([]);
                  // Error notification is handled by the mutation hook
                },
              }
            );

            return; // Exit early, don't process as forward movement
          } else {
            // Valid reverse movement but missing offerId or empty stages
            console.warn('Invalid reverse movement: missing offerId or empty stages', {
              offerId,
              stages,
              sourceStage,
              destStage,
              availableReverts,
            });
          }
        } else {
          // Invalid reverse movement - destination not in availableReverts or wrong order
          console.warn('Invalid reverse movement: destination not valid', {
            sourceStage,
            destStage,
            sourceIndexInReverts,
            destIndexInReverts,
            availableReverts,
          });
        }
        // If reverse movement but invalid, fall through to show error below
      }

      // Validate forward movement OR invalid reverse movement
      if (!isValidDragMovement(sourceTableId, destTableId, availableReverts)) {
        resetDragStates();
        clearDraggedItem();
        dragOperationRef.current = null;
        draggedItemAvailableRevertsRef.current = null;

        // Only show notification for truly invalid movements (not valid reverse movements)
        // Valid reverse movements are handled above and return early
        const destStage = getStageNameFromTableType(destTableId);
        const isDestInValidReverts = validRevertStages.includes(destStage);
        
        if (
          !isReverseMovement ||
          !availableReverts.length ||
          !isDestInValidReverts
        ) {
          const errorMessage = isReverseMovement
            ? `Cannot revert to ${TABLE_TITLES[destTableId]}. Available revert options: ${validRevertStages.join(', ') || 'none'}`
            : `Cannot move items to this stage. Please check available revert options.`;
          
          toast.push(
            React.createElement(
              Notification,
              { title: 'Invalid Movement', type: 'warning' },
              errorMessage
            )
          );
        }
        return;
      }

      // Store drag operation details to prevent snap-back on success
      dragOperationRef.current = {
        sourceTable: sourceTableId,
        destTable: destTableId,
        itemData,
        availableReverts,
      };

      // Clear availableReverts ref for forward movement
      draggedItemAvailableRevertsRef.current = null;

      // Clear existing selections and add the dragged item
      const { clearSelectedItems, addSelectedItem } = useSelectedItemsStore.getState();
      clearSelectedItems();

      // Determine the page name based on target table
      const pageName = getPageTypeFromProgressFilter(destTableId);

      // Add the item to the appropriate store
      addSelectedItem(itemData, pageName as any);
      setDragDropSelectedItems([itemData]);

      // Handle different destinations: Only Netto 2 shows dialog, others call API directly
      switch (destTableId) {
        case 'confirmation':
          // Directly create confirmation without dialog
          handleCreateItem('confirmation', {}, pageName, destTableId).catch(() => {
            // On error, immediately reset all drag states to stop the drag operation
            dragOperationRef.current = null;
            resetDragStates();
            clearDraggedItem();
            // Clear selected items that were added during drag-drop
            handleClearSelection();
            setDragDropSelectedItems([]);
          });
          break;
        case 'payment':
          // Directly create payment voucher without dialog
          handleCreateItem('payment-voucher', {}, pageName, destTableId).catch(() => {
            // On error, immediately reset all drag states to stop the drag operation
            dragOperationRef.current = null;
            resetDragStates();
            clearDraggedItem();
            // Clear selected items that were added during drag-drop
            handleClearSelection();
            setDragDropSelectedItems([]);
          });
          break;
        case 'netto2':
          // Only Netto 2 shows dialog - no loading spinner needed
          setIsNettoDialogOpen(true);
          break;
        case 'lost':
          // Directly create lost offer without dialog
          handleCreateItem('lost', {}, pageName, destTableId).catch(() => {
            // On error, immediately reset all drag states to stop the drag operation
            dragOperationRef.current = null;
            resetDragStates();
            clearDraggedItem();
            // Clear selected items that were added during drag-drop
            handleClearSelection();
            setDragDropSelectedItems([]);
          });
          break;
        case 'opening':
          // Opening table - no action needed, reset drag states
          resetDragStates();
          clearDraggedItem();
          dragOperationRef.current = null;
          break;
        default:
          break;
      }
    },
    [
      destinationTableRef,
      sourceTableRef,
      draggedItemAvailableRevertsRef,
      dragOperationRef,
      resetDragStates,
      setUpdatingTable,
      triggerGlowEffect,
      queryClient,
      handleClearSelection,
      setDragDropSelectedItems,
      setIsNettoDialogOpen,
      handleCreateItem,
      revertBatchMutation,
    ]
  );

  return {
    handleRevert,
    handleBulkDelete,
    handleCreateOpening,
    handleCreateItem,
    handleDragEnd,
    handleClearSelection,
    getSelectedItemsForTable,
    triggerGlowEffect,
    isReverting,
    bulkDeleteOpeningsMutation,
    bulkDeleteConfirmationsMutation,
    bulkDeletePaymentVouchersMutation,
    bulkDeleteOffersMutation,
    createOpeningMutation,
    createPaymentVoucherMutation,
    bulkCreateConfirmationsMutation,
    bulkCreateLostOffersMutation,
    revertBatchMutation,
  };
};

