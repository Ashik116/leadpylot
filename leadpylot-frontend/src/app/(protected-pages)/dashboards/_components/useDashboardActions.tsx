import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDocumentHandler } from '@/hooks/useDocumentHandler';
import { useFileUploadHook } from '@/hooks/useFileUploadHook';
import { useRevertOffers } from '@/hooks/useRevertOffers';
import { useAssignTodo } from '@/services/hooks/useLeads';
import { useBulkCreateConfirmations } from '@/services/hooks/useConfirmations';
import { useBulkCreateLostOffers } from '@/services/hooks/useLostOffers';
import { useCreateOpeningWithoutFiles } from '@/services/hooks/useOpenings';
import { useCreatePaymentVoucher } from '@/services/hooks/usePaymentVouchers';
import { useMoveOffersOut, useRevertOffersFromOut } from '@/services/hooks/useOffers';
import { apiUpdateTodo, UpdateTodoRequest } from '@/services/ToDoService';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import { DOCUMENT_TYPES } from '@/components/shared/DocumentTypeOptions';
import { parseKNumber } from '@/utils/utils';
import { apiBulkDownloadDocuments } from '@/services/DocumentService';
import { extractDocumentIdsFromItems, BULK_DOWNLOAD_COLUMN_LABELS } from '@/utils/extractDocumentIds';
import { DashboardType, TDashboardType } from './dashboardTypes';

function resolveLeadIdFromOfferRow(row: any): string | undefined {
  if (!row) return undefined;
  const raw = row?.originalData ?? row;
  const leadRef = raw?.lead_id ?? raw?.lead;
  if (!leadRef) return undefined;
  if (typeof leadRef === 'string') return leadRef;
  const id = leadRef?._id;
  return id !== null ? String(id) : undefined;
}

type UseDashboardActionsArgs = {
  dashboardType: TDashboardType;
  selectedProgressFilter: TDashboardType;
  selectedRows: string[];
  selectedItems: any[];
  selectedOpeningForDetails: any | null;
  selectedOfferForDocs: any | null;
  preFetchedData?: { data?: any[] };
  apiData?: { data?: any[] };
  config: {
    invalidateQueries: string[];
    fileUploadTableName: string;
  };
  isOfferDetailsOpen: boolean; // Add this
  selectedOfferForDetails: any | null; // Add this
  session?: any;
  pathname: string;
  refetch?: () => void;
  clearAllSelections: () => void;
  clearSelectedItems: () => void;
  setCreateOpeningOpen: (value: boolean) => void;
  setCreateConfirmationDialogOpen: (value: boolean) => void;
  setIsPaymentVoucherDialogOpen: (value: boolean) => void;
  setIsLostDialogOpen: (value: boolean) => void;
  setIsSendToOutDialogOpen: (value: boolean) => void;
  setIsEditOfferDialogOpen: (value: boolean) => void;
  setSelectedOfferForEdit: (value: any) => void;
  setIsDocsModalOpen: (value: boolean) => void;
  setSelectedOfferForDocs: (value: any) => void;
  setIsPdfModalOpen: (value: boolean) => void;
  setSelectedRowForPdf: (value: any) => void;
  setIsPdfConfirmationModalOpen: (value: boolean) => void;
  setSelectedRowForPdfConfirmation: (value: any) => void;
  setIsOpeningDetailsOpen: (value: boolean) => void;
  setSelectedOpeningForDetails: (value: any) => void;
  setIsOfferDetailsOpen: (value: boolean) => void;
  setSelectedOfferForDetails: (value: any) => void;
  openGeneratedPdfPreviewModal: (data: any) => void;
  setIsAssignTicketDialogOpen: (value: boolean) => void;
  setSelectedTicketForAssign: (value: { ticketId: string; rowData: any } | null) => void;
  setIsBulkDownloadConfirmOpen: (value: boolean) => void;
  setIsBulkDownloading: (value: boolean) => void;
  setBulkDownloadConfirmData: (value: {
    columnId: string;
    columnLabel: string;
    documentCount: number;
    ids: string[];
  } | null) => void;
};

export const useDashboardActions = ({
  dashboardType,
  selectedProgressFilter,
  selectedRows,
  selectedItems,
  selectedOpeningForDetails,
  selectedOfferForDocs,
  preFetchedData,
  apiData,
  config,
  isOfferDetailsOpen, // Add this
  selectedOfferForDetails, // Add this
  session,
  pathname,
  refetch,
  clearAllSelections,
  clearSelectedItems,
  setCreateOpeningOpen,
  setCreateConfirmationDialogOpen,
  setIsPaymentVoucherDialogOpen,
  setIsLostDialogOpen,
  setIsSendToOutDialogOpen,
  setIsEditOfferDialogOpen,
  setSelectedOfferForEdit,
  setIsDocsModalOpen,
  setSelectedOfferForDocs,
  setIsPdfModalOpen,
  setSelectedRowForPdf,
  setIsPdfConfirmationModalOpen,
  setSelectedRowForPdfConfirmation,
  setIsOpeningDetailsOpen,
  setSelectedOpeningForDetails,
  setIsOfferDetailsOpen,
  setSelectedOfferForDetails,
  openGeneratedPdfPreviewModal,
  setIsAssignTicketDialogOpen,
  setSelectedTicketForAssign,
  setIsBulkDownloadConfirmOpen,
  setIsBulkDownloading,
  setBulkDownloadConfirmData,
}: UseDashboardActionsArgs) => {
  // Mutations
  const createOpeningMutation = useCreateOpeningWithoutFiles();
  const createPaymentVoucherMutation = useCreatePaymentVoucher();
  const queryClient = useQueryClient();

  // Helper function to invalidate grouped summary queries
  const invalidateGroupedSummary = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['grouped-summary'] });
  }, [queryClient]);

  const bulkCreateConfirmationsMutation = useBulkCreateConfirmations({
    onSuccess: () => {
      setCreateConfirmationDialogOpen(false);
    },
  });

  const bulkCreateLostOffersMutation = useBulkCreateLostOffers({
    onSuccess: () => {
      setIsLostDialogOpen(false);
      clearAllSelections();
      refetch?.();
      invalidateGroupedSummary();
    },
  });

  const moveOffersOutMutation = useMoveOffersOut();
  const revertOffersFromOutMutation = useRevertOffersFromOut();

  // Document handling hook
  const documentHandler = useDocumentHandler();

  // Simple file upload hook
  const { uploadFiles, isUploading } = useFileUploadHook(config.invalidateQueries);

  // Revert offers hook
  const { revertOffers, isLoading: isReverting } = useRevertOffers({
    onSuccess: () => {
      clearAllSelections();
      refetch?.();
      invalidateGroupedSummary();
      // Invalidate offers-progress-all query for multi-table view
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
    },
  });

  // Trigger grouped refresh after successful document delete (EMAIL/OFFER docs)
  React.useEffect(() => {
    if (documentHandler.deleteAttachmentMutation.isSuccess) {
      invalidateGroupedSummary();
      refetch?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentHandler.deleteAttachmentMutation.isSuccess]);

  const onOpenDocsModal = React.useCallback((rowData: any) => {
    setSelectedOfferForDocs(rowData);
    setIsDocsModalOpen(true);
  }, []);

  const onEditOffer = React.useCallback((rowData: any) => {
    const editOfferData = {
      ...rowData.originalData,
      investment_volume: parseKNumber(rowData?.originalData?.investment_volume),
    };

    setSelectedOfferForEdit(editOfferData);
    setIsEditOfferDialogOpen(true);
  }, []);

  const onOpenPdfModal = React.useCallback((rowData: any) => {
    // Check if PDF already exists
    const existingPdf = rowData?.files?.find(
      (file: any) => file?.type === DOCUMENT_TYPES?.OFFER_CONTRACT
    );

    if (existingPdf) {
      // PDF exists, show confirmation modal
      setSelectedRowForPdfConfirmation({ ...rowData, existingPdf });
      setIsPdfConfirmationModalOpen(true);
    } else {
      // No PDF exists, open PdfEmailModal directly
      setSelectedRowForPdf(rowData);
      setIsPdfModalOpen(true);
    }
  }, []);

  const handlePdfGenerated = React.useCallback(
    (data: any) => {
      // Close the PDF email modal first
      setIsPdfModalOpen(false);
      setSelectedRowForPdf(null);

      // Force grouped data refetch since files/PDFs may have changed grouping
      invalidateGroupedSummary();
      refetch?.();

      // Add a small delay to ensure PDF generation is complete before opening preview
      setTimeout(() => {
        openGeneratedPdfPreviewModal(data);
      }, 500);
    },
    [refetch, openGeneratedPdfPreviewModal]
  );

  // File upload handler with loading state
  const handleFileUpload = React.useCallback(
    async (
      id: string,
      files: File[] | null | undefined,
      table?: string,
      fileType?: string,
      fullItem?: any
    ) => {
      if (!files || !Array.isArray(files) || files?.length === 0) return;
      // Use preFetchedData when available, otherwise use apiData
      const currentData = preFetchedData?.data || apiData?.data;
      const resolvedItem =
        fullItem ||
        selectedOfferForDocs ||
        (Array.isArray(currentData)
          ? currentData?.find((x: any) => {
            const oid =
              x?._id ?? x?.offer_id?._id ?? x?.originalData?._id ?? (x as any)?.offer_id ?? x?.id;
            return String(oid) === String(id);
          })
          : undefined);

      try {
        const idToUpload =
          (resolvedItem?.originalData?.offer_id?._id as string | undefined) ??
          (resolvedItem?.offer_id?._id as string | undefined) ??
          (typeof resolvedItem?.offer_id === 'string'
            ? (resolvedItem?.offer_id as string)
            : undefined) ??
          (resolvedItem?._id as string | undefined) ??
          id;
        const d = await uploadFiles(
          config?.fileUploadTableName,
          idToUpload,
          files,
          fileType || 'contract'
        );
        if (
          d &&
          selectedProgressFilter === DashboardType?.OPENING &&
          fileType === DOCUMENT_TYPES?.PAYMENT_CONTRACT
        ) {
          handleCreateItem('payment-voucher', { files: files }, d?._id);
        }
        // Force grouped data refetch in grouped mode after successful upload
        invalidateGroupedSummary();
        refetch?.();
      } catch {
        // Error handling is managed by the mutation hook
      }
    },
    [uploadFiles, config.fileUploadTableName]
  );

  // Document action handler
  const handleDocumentAction = React.useCallback(
    (item: any, documentType: string, action: 'preview' | 'download' | 'delete') => {
      documentHandler.handleDocumentAction(item, documentType, action);
    },
    [documentHandler]
  );

  // Bulk document download: show confirmation popup, then download on confirm
  const handleBulkDownload = React.useCallback(
    (columnId: string) => {
      if (!selectedItems?.length) return;
      const ids = extractDocumentIdsFromItems(selectedItems, columnId);
      if (!ids.length) {
        toast.push(<Notification type="warning">No documents to download</Notification>);
        return;
      }
      const columnLabel = BULK_DOWNLOAD_COLUMN_LABELS[columnId] ?? columnId;
      setBulkDownloadConfirmData({
        columnId,
        columnLabel,
        documentCount: ids.length,
        ids,
      });
      setIsBulkDownloadConfirmOpen(true);
    },
    [selectedItems, setBulkDownloadConfirmData, setIsBulkDownloadConfirmOpen]
  );

  // Execute bulk download when user confirms in the popup
  const handleConfirmBulkDownload = React.useCallback(
    async (ids: string[], columnLabel?: string) => {
      if (!ids?.length) return;
      setIsBulkDownloading(true);
      try {
        await apiBulkDownloadDocuments(ids, columnLabel);
        toast.push(<Notification type="success">Download started</Notification>);
      } catch {
        toast.push(<Notification type="danger">Failed to download documents</Notification>);
      } finally {
        setIsBulkDownloading(false);
        setBulkDownloadConfirmData(null);
        setIsBulkDownloadConfirmOpen(false);
      }
    },
    [setBulkDownloadConfirmData, setIsBulkDownloadConfirmOpen, setIsBulkDownloading]
  );

  // Ticket assignment mutation (for offer_tickets dashboard)
  const assignTodoMutation = useAssignTodo();

  // Handler for self-assigning selected tickets (bulk action from action bar)
  const handleSelfAssignTickets = React.useCallback(() => {
    if (!session?.user?._id || !selectedItems?.length) return;

    // Get ticket IDs from selected items
    const ticketIds = selectedItems
      .map((item: any) => item?.ticket?._id || item?.originalData?.ticket?._id)
      .filter(Boolean);

    if (ticketIds.length === 0) return;

    // Assign each ticket to self
    ticketIds.forEach((ticketId: string) => {
      assignTodoMutation.mutate(
        {
          todoId: ticketId,
          data: { assignee_id: session?.user?._id as string },
        },
        {
          onSuccess: () => {
            // Invalidate offer tickets to refresh the data
            queryClient.invalidateQueries({ queryKey: ['offerTickets'] });
            refetch?.();
            clearSelectedItems();
          },
        }
      );
    });
  }, [
    session?.user?._id,
    selectedItems,
    assignTodoMutation,
    queryClient,
    refetch,
    clearSelectedItems,
  ]);

  // Handler for opening the assign to others dialog (for first selected ticket)
  const handleAssignTicketsToOther = React.useCallback(() => {
    if (!selectedItems?.length) return;

    // Get the first selected item's ticket
    const firstItem = selectedItems[0];
    const ticketId = firstItem?.ticket?._id || firstItem?.originalData?.ticket?._id;

    if (!ticketId) return;

    setSelectedTicketForAssign({ ticketId, rowData: firstItem });
    setIsAssignTicketDialogOpen(true);
  }, [selectedItems]);

  // Handler for when assignment dialog succeeds
  const handleAssignTicketSuccess = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['offerTickets'] });
    refetch?.();
  }, [queryClient, refetch]);

  // Handler for updating a todo (mark as done/undone, edit message)
  const handleUpdateTodo = React.useCallback(
    async (todoId: string, updates: { isDone?: boolean; message?: string }) => {
      try {
        await apiUpdateTodo(todoId, updates as UpdateTodoRequest);
        // Invalidate offer tickets and other related queries
        queryClient.invalidateQueries({ queryKey: ['offerTickets'] });
        queryClient.invalidateQueries({ queryKey: ['todos'] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['current-user'] });
        refetch?.();
        toast.push(
          <Notification type="success">
            {updates.isDone !== undefined
              ? `Ticket marked as ${updates.isDone ? 'done' : 'pending'}`
              : 'Ticket updated successfully'}
          </Notification>
        );
      } catch (error) {
        toast.push(<Notification type="danger">Failed to update ticket</Notification>);
        throw error;
      }
    },
    [queryClient, refetch]
  );

  // Handler for opening details
  const handleOpenOpeningDetails = React.useCallback((rowData: any) => {
    setSelectedOpeningForDetails(rowData);
    setIsOpeningDetailsOpen(true);
  }, []);

  // Handler for offer details
  const handleOpenOfferDetails = React.useCallback(
    (rowData: any) => {
      setSelectedOfferForDetails(rowData);
      setIsOfferDetailsOpen(true);
    },
    [setSelectedOfferForDetails, setIsOfferDetailsOpen]
  );

  // Action handlers
  const handleCreateOpening = React.useCallback(async () => {
    let offerIds: string[] = [];

    // Check if we are in offer details view
    if (isOfferDetailsOpen && selectedOfferForDetails) {
      const offerId =
        selectedOfferForDetails?.offer_id?._id ??
        selectedOfferForDetails?.originalData?._id ??
        selectedOfferForDetails?._id;
      if (offerId) {
        offerIds = [String(offerId)];
      }
    }

    // Fallback to selectedRows if no IDs from details view
    if (offerIds.length === 0 && selectedRows && selectedRows.length > 0) {
      offerIds = selectedRows;
    }

    if (offerIds.length === 0) return;

    try {
      await Promise.all(
        offerIds.map((id: string) => createOpeningMutation.mutateAsync({ offer_id: id }))
      );
      toast.push(
        React.createElement(
          Notification,
          { title: 'Openings created', type: 'success' },
          `Successfully created ${offerIds.length} opening${offerIds.length > 1 ? 's' : ''}`
        )
      );
      setCreateOpeningOpen(false);
      clearAllSelections();
      refetch?.();
      // Force grouped data refetch if in grouped view
      invalidateGroupedSummary();

      const leadIds = new Set<string>();
      if (isOfferDetailsOpen && selectedOfferForDetails) {
        const lid = resolveLeadIdFromOfferRow(selectedOfferForDetails);
        if (lid) leadIds.add(lid);
      } else if (selectedItems?.length) {
        for (const item of selectedItems) {
          const lid = resolveLeadIdFromOfferRow(item);
          if (lid) leadIds.add(lid);
        }
      }
      leadIds.forEach((leadId) => {
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      });
      offerIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: ['opening', id] });
      });
    } catch {
      // Error handled silently
    }
  }, [
    selectedRows,
    selectedItems,
    isOfferDetailsOpen,
    selectedOfferForDetails,
    createOpeningMutation,
    clearAllSelections,
    refetch,
    setCreateOpeningOpen,
    invalidateGroupedSummary,
    queryClient,
  ]);

  const handleRevertOffers = React.useCallback(async () => {
    const warn = (msg: string) =>
      toast.push(
        <Notification title="Revert Offers" type="warning">
          {msg}
        </Notification>
      );

    // Get offer IDs - check selectedOpeningForDetails first (from OpeningDetailsPopup), then selectedRows
    let offerIds: string[] = [];

    if (selectedOpeningForDetails) {
      // Extract offer ID from selectedOpeningForDetails
      const opening = selectedOpeningForDetails?.originalData || selectedOpeningForDetails;
      const offerId =
        opening?.offer_id?._id ??
        opening?.offer_id ??
        opening?._id ??
        selectedOpeningForDetails?.offer_id?._id ??
        selectedOpeningForDetails?.offer_id ??
        selectedOpeningForDetails?._id;

      if (offerId) {
        offerIds = [String(offerId)];
      }
    }

    // Fall back to selectedRows if no offerId found from selectedOpeningForDetails
    if (offerIds.length === 0 && selectedRows?.length > 0) {
      offerIds = selectedRows;
    }

    if (!offerIds.length) return;
    if (offerIds.length > 1) return warn('Please select only one offer to revert');
    if (selectedProgressFilter === DashboardType.NETTO)
      return warn('Please select Netto 1 or Netto 2 to revert');

    try {
      await revertOffers(offerIds, selectedProgressFilter);
    } catch {
      // Error handled silently
    }
  }, [selectedRows, selectedOpeningForDetails, selectedProgressFilter, revertOffers]);

  const handleCreateItem = React.useCallback(
    async (
      type: 'confirmation' | 'payment-voucher' | 'lost' | 'send-to-out' | 'revert-from-out',
      data: { reference_no?: string; notes?: string; files?: File[]; amount?: number },
      outOfferId?: string
    ) => {
      if (
        !outOfferId &&
        (!selectedRows || selectedRows?.length === 0) &&
        !selectedOpeningForDetails
      )
        return;
      try {
        if (type === 'confirmation') {
          let offerIds: string[] = (selectedItems || [])
            ?.map((item: any) => item?.offer_id?._id ?? item?.originalData?._id ?? item?._id)
            ?.filter(Boolean);
          if (offerIds.length === 0) offerIds = [outOfferId as string];
          if (offerIds?.length === 0) return;

          const confirmationRequests =
            offerIds?.length > 0
              ? offerIds?.map((offerId: string) => ({
                offer_id: offerId,
                notes: data?.notes || data?.reference_no || undefined,
                files: data?.files || undefined,
              }))
              : [];

          await bulkCreateConfirmationsMutation.mutateAsync(confirmationRequests);
          setCreateConfirmationDialogOpen(false);
        } else if (type === 'payment-voucher') {
          let offerIds: string[] = [];

          if (outOfferId) {
            offerIds = [outOfferId];
          } else {
            offerIds = (selectedItems || [])
              ?.map((item: any) => item?.offer_id?._id ?? item?.originalData?._id ?? item?._id)
              ?.filter(Boolean);
          }

          if (offerIds?.length === 0) {
            return;
          }

          const promises = offerIds?.map(async (offerId: string) => {
            const formData = new FormData();
            formData.append('offer_id', offerId);

            const refText = data?.reference_no || data?.notes;
            if (refText) {
              formData.append('reference_no', refText);
              formData.append('notes', refText);
            }

            if (data?.amount) formData.append('amount', data?.amount.toString());
            if (data?.files && Array.isArray(data?.files) && data?.files?.length > 0) {
              data?.files?.forEach((file) => formData.append('files', file));
            }

            return createPaymentVoucherMutation.mutateAsync(formData);
          });

          await Promise.all(promises);
          setIsPaymentVoucherDialogOpen(false);
          clearAllSelections();
          refetch?.();
          invalidateGroupedSummary();
          return;
        } else if (type === 'lost') {
          let offerIds: string[] = [];

          // Check if selectedOpeningForDetails exists (from OpeningDetailsPopup)
          if (selectedOpeningForDetails) {
            const opening = selectedOpeningForDetails?.originalData || selectedOpeningForDetails;
            const offerId =
              opening?.offer_id?._id ??
              opening?.offer_id ??
              opening?._id ??
              selectedOpeningForDetails?.offer_id?._id ??
              selectedOpeningForDetails?.offer_id ??
              selectedOpeningForDetails?._id;

            if (offerId) {
              offerIds = [String(offerId)];
            }
          }

          // Fall back to outOfferId if provided
          if (offerIds.length === 0 && outOfferId) {
            offerIds = [String(outOfferId)];
          }

          // Fall back to selectedItems if no offerId found
          if (offerIds.length === 0) {
            offerIds = (selectedItems || [])
              ?.map((item: any) => item?.offer_id?._id ?? item?.originalData?._id ?? item?._id)
              ?.filter(Boolean);
          }

          if (offerIds?.length === 0) {
            return;
          }

          await bulkCreateLostOffersMutation.mutateAsync(offerIds);
          setIsLostDialogOpen(false);
        } else if (type === 'send-to-out' || type === 'revert-from-out') {
          // Handle Send to Out or Revert from Out (based on pathname)
          const isRevert = pathname.includes('out-offers');
          let offerIds: string[] = [];

          // Check if selectedOpeningForDetails exists (from OpeningDetailsPopup)
          if (selectedOpeningForDetails) {
            const opening = selectedOpeningForDetails?.originalData || selectedOpeningForDetails;
            const offerId =
              opening?.offer_id?._id ??
              opening?.offer_id ??
              opening?._id ??
              selectedOpeningForDetails?.offer_id?._id ??
              selectedOpeningForDetails?.offer_id ??
              selectedOpeningForDetails?._id;

            if (offerId) {
              offerIds = [String(offerId)];
            }
          }

          // Fall back to outOfferId if provided
          if (offerIds.length === 0 && outOfferId) {
            offerIds = [String(outOfferId)];
          }

          // Fall back to selectedItems if no offerId found
          if (offerIds.length === 0) {
            offerIds = (selectedItems || [])
              ?.map((item: any) => item?.offer_id?._id ?? item?.originalData?._id ?? item?._id)
              ?.filter(Boolean);
          }

          if (offerIds?.length === 0) {
            return;
          }

          // Use appropriate mutation based on pathname
          if (isRevert) {
            await revertOffersFromOutMutation.mutateAsync(offerIds);
          } else {
            await moveOffersOutMutation.mutateAsync(offerIds);
          }
          setIsSendToOutDialogOpen(false);
        }
        clearAllSelections();
        refetch?.();
        // Force grouped data refetch if in grouped view
        invalidateGroupedSummary();
      } catch {
        // Error handled silently
      }
    },
    [
      selectedRows,
      clearAllSelections,
      refetch,
      bulkCreateConfirmationsMutation,
      selectedProgressFilter,
      createPaymentVoucherMutation,
      selectedItems,
      bulkCreateLostOffersMutation,
      selectedOpeningForDetails,
      moveOffersOutMutation,
      revertOffersFromOutMutation,
      pathname,
    ]
  );

  return {
    createOpeningMutation,
    createPaymentVoucherMutation,
    bulkCreateConfirmationsMutation,
    bulkCreateLostOffersMutation,
    moveOffersOutMutation,
    revertOffersFromOutMutation,
    documentHandler,
    uploadFiles,
    isUploading,
    revertOffers,
    isReverting,
    invalidateGroupedSummary,
    onOpenDocsModal,
    onEditOffer,
    onOpenPdfModal,
    handlePdfGenerated,
    handleFileUpload,
    handleDocumentAction,
    handleBulkDownload,
    handleConfirmBulkDownload,
    handleSelfAssignTickets,
    handleAssignTicketsToOther,
    handleAssignTicketSuccess,
    handleUpdateTodo,
    handleOpenOpeningDetails,
    handleOpenOfferDetails,
    handleCreateOpening,
    handleRevertOffers,
    handleCreateItem,
  };
};
