import React from 'react';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Role } from '@/configs/navigation.config/auth.route.config';
import AssignTicketDialog from '../../tickets/_components/AssignTicketDialog';
import BulkUpdateDialog from '../../leads/_components/BulkUpdateDialog';
import BulkNettoDialog from '../../netto/_components/BulkNettoDialog';
import EditOfferDialog from '../../offers/_components/EditOfferDialog';

import CreateConfirmationDialog from '../CreateConfirmationDialog';
import CreatePaymentVoucherDialog from '../CreatePaymentVoucherDialog';
import NettoModal from '../NettoModal';
import PdfEmailModal from '../PdfEmailModal';
import UploadFilesModal from '../UploadFilesModal';
import GeneratedPdfPreviewModal from '../pdfModal/GeneratedPdfPreviewModal';
import { DashboardType } from '../dashboardTypes';
import { useUnifiedDashboardContext } from './UnifiedDashboardContext';
import OpeningDetailsPopup from '../../openings/_components/opening_details/OpeningDetailsPopup';

const UnifiedDashboardDialogs = () => {
  const context = useUnifiedDashboardContext();

  if (!context) return null;

  const {
    config,
    dashboardType,
    selectedProgressFilter,
    selectedRows,
    selectedItems,
    createConfirmationDialogOpen,
    setCreateConfirmationDialogOpen,
    isPaymentVoucherDialogOpen,
    setIsPaymentVoucherDialogOpen,
    createOpeningOpen,
    setCreateOpeningOpen,
    handleCreateOpening,
    createOpeningMutation,
    handleCreateItem,
    bulkCreateConfirmationsMutation,
    createPaymentVoucherMutation,
    bulkCreateLostOffersMutation,
    isLostDialogOpen,
    setIsLostDialogOpen,
    isSendToOutDialogOpen,
    setIsSendToOutDialogOpen,
    moveOffersOutMutation,
    revertOffersFromOutMutation,
    selectedOfferForDocs,
    isDocsModalOpen,
    setIsDocsModalOpen,
    setSelectedOfferForDocs,
    apiData,
    handleDocumentAction,
    handleFileUpload,
    refetch,
    sessionRole,
    isEditOfferDialogOpen,
    setIsEditOfferDialogOpen,
    selectedOfferForEdit,
    setSelectedOfferForEdit,
    documentHandler,
    isBulkUpdateDialogOpen,
    setIsBulkUpdateDialogOpen,
    invalidateGroupedSummary,
    clearAllSelections,
    isNettoDialogOpen,
    setIsNettoDialogOpen,
    isBulkNettoDialogOpen,
    setIsBulkNettoDialogOpen,
    isPdfConfirmationModalOpen,
    setIsPdfConfirmationModalOpen,
    selectedRowForPdfConfirmation,
    setSelectedRowForPdfConfirmation,
    setSelectedRowForPdf,
    isPdfModalOpen,
    setIsPdfModalOpen,
    selectedRowForPdf,
    handlePdfGenerated,
    isGeneratedPdfPreviewOpen,
    setIsGeneratedPdfPreviewOpen,
    generatedPdfData,
    isNavigating,
    isOpeningDetailsOpen,
    setIsOpeningDetailsOpen,
    selectedOpeningForDetails,
    setSelectedOpeningForDetails,
    isOfferDetailsOpen,
    setIsOfferDetailsOpen,
    selectedOfferForDetails,
    setSelectedOfferForDetails,
    handleRevertOffers,
    isReverting,
    isAssignTicketDialogOpen,
    setIsAssignTicketDialogOpen,
    selectedTicketForAssign,
    setSelectedTicketForAssign,
    handleAssignTicketSuccess,
    pathname,
    clearDetailsParams,
    handleBulkDownload,
    handleConfirmBulkDownload,
    isBulkDownloadConfirmOpen,
    setIsBulkDownloadConfirmOpen,
    isBulkDownloading,
    setBulkDownloadConfirmData,
    bulkDownloadConfirmData,
  } = context;

  const detailsSelectionCount =
    (isOfferDetailsOpen && selectedOfferForDetails) ||
    (isOpeningDetailsOpen && selectedOpeningForDetails)
      ? 1
      : selectedRows.length;
  const isDetailsDialogOpen = isOfferDetailsOpen || isOpeningDetailsOpen;
  const detailsDialogOverlayClass = isDetailsDialogOpen ? '!z-[70]' : undefined;
  const detailsDialogClass = isDetailsDialogOpen ? '!z-[70]' : undefined;
  return (
    <>
      {!config.disableDragDropDialogs && (
        <>
          <CreateConfirmationDialog
            isOpen={createConfirmationDialogOpen}
            onClose={() => setCreateConfirmationDialogOpen(false)}
            onCreate={(reference_no?: string) => handleCreateItem('confirmation', { reference_no })}
            isCreating={bulkCreateConfirmationsMutation.isPending ?? false}
          />

          <CreatePaymentVoucherDialog
            isOpen={isPaymentVoucherDialogOpen}
            onClose={() => setIsPaymentVoucherDialogOpen(false)}
            onCreate={(data) => handleCreateItem('payment-voucher', data)}
            isCreating={createPaymentVoucherMutation.isPending ?? false}
            selectedCount={selectedRows.length}
          />
        </>
      )}

      {/* Create Opening Dialog */}
      {(config.showCreateOpening || isOfferDetailsOpen) && (
        <ConfirmDialog
          type="warning"
          isOpen={createOpeningOpen}
          title="Create Opening"
          onCancel={() => setCreateOpeningOpen(false)}
          onConfirm={handleCreateOpening}
          confirmButtonProps={{ disabled: createOpeningMutation.isPending }}
          overlayClassName={detailsDialogOverlayClass}
          className={detailsDialogClass}
        >
          <p>
            Are you sure you want to create openings for{' '}
            {detailsSelectionCount} selected offer
            {detailsSelectionCount > 1 ? 's' : ''}?
          </p>
          <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
        </ConfirmDialog>
      )}

      {/* Bulk Download Confirmation */}
      <ConfirmDialog
        type="info"
        isOpen={isBulkDownloadConfirmOpen ?? false}
        title="Bulk Download Documents"
        cancelText="Cancel"
        confirmText="Download"
        onCancel={() => {
          if (!isBulkDownloading) {
            setIsBulkDownloadConfirmOpen?.(false);
            setBulkDownloadConfirmData?.(null);
          }
        }}
        onConfirm={() => {
          const ids = bulkDownloadConfirmData?.ids ?? [];
          const columnLabel = bulkDownloadConfirmData?.columnLabel;
          handleConfirmBulkDownload?.(ids, columnLabel);
        }}
        confirmButtonProps={{
          disabled: isBulkDownloading ?? false,
          loading: isBulkDownloading ?? false,
        }}
        cancelButtonProps={{
          disabled: isBulkDownloading ?? false,
        }}
      >
        {bulkDownloadConfirmData && (
          <div className="space-y-2">
            <p>
              You are about to download{' '}
              <strong>{bulkDownloadConfirmData.documentCount}</strong> document
              {bulkDownloadConfirmData.documentCount !== 1 ? 's' : ''} from the{' '}
              <strong>{bulkDownloadConfirmData.columnLabel}</strong> column.
            </p>
            <p className="text-sm text-gray-600">
              Documents from all selected rows will be bundled into a single zip file.
            </p>
          </div>
        )}
      </ConfirmDialog>

      {/* Docs Modal */}
      <UploadFilesModal
        selectedOfferForDocs={selectedOfferForDocs}
        isDocsModalOpen={isDocsModalOpen}
        setIsDocsModalOpen={setIsDocsModalOpen}
        setSelectedOfferForDocs={setSelectedOfferForDocs}
        apiData={apiData}
        handleDocumentAction={handleDocumentAction}
        handleFileUpload={(id, files, table, fileType) =>
          handleFileUpload(id, files ?? null, table, fileType)
        }
        onDataRefresh={refetch}
        uploadPermission={sessionRole === Role?.ADMIN ? true : false}
      />

      {/* Edit Offer Dialog */}
      <EditOfferDialog
        isOpen={isEditOfferDialogOpen}
        dashboardType={dashboardType}
        onClose={() => {
          setIsEditOfferDialogOpen(false);
          setSelectedOfferForEdit(null);
        }}
        onSuccess={() => {
          refetch?.();
          invalidateGroupedSummary();
        }}
        offer={selectedOfferForEdit}
      />

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog {...documentHandler?.dialogProps} title="Document Preview" />

      {/* Document Delete Confirmation Dialog */}
      <ConfirmDialog
        type="warning"
        isOpen={documentHandler?.deleteConfirmOpen}
        title="Delete Document"
        onCancel={() => documentHandler.setDeleteConfirmOpen(false)}
        onConfirm={documentHandler.handleDeleteConfirm}
        confirmButtonProps={{ disabled: documentHandler.deleteAttachmentMutation.isPending }}
      >
        <p className="line-clamp-1">
          Are you sure you want to delete the document &ldquo;
          {documentHandler?.documentToDelete?.filename}&rdquo;?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      <BulkUpdateDialog
        isOpen={isBulkUpdateDialogOpen}
        onClose={() => setIsBulkUpdateDialogOpen(false)}
        selectedLeads={
          selectedItems?.length > 0
            ? selectedItems
                ?.map(
                  (item: any) =>
                    item?.leadId ??
                    item?.lead_id?._id ??
                    item?.lead_id ??
                    item?.offer_id?.lead_id?._id
                )
                ?.filter(Boolean)
            : []
        }
        onSuccess={() => {
          clearAllSelections();
          refetch?.();
          invalidateGroupedSummary();
        }}
      />

      {!config.disableDragDropDialogs && (
        <NettoModal
          open={isNettoDialogOpen}
          onClose={() => setIsNettoDialogOpen(false)}
          onSuccess={() => {
            // Refresh the table data and clear selections
            refetch?.();
            invalidateGroupedSummary();
            clearAllSelections();
            setIsNettoDialogOpen(false);
          }}
          offer={
            selectedItems.length > 0
              ? {
                  _id:
                    selectedItems?.[0]?.offer_id?._id ??
                    selectedItems?.[0]?.originalData?._id ??
                    selectedItems?.[0]?._id,
                  title:
                    selectedItems?.[0]?.offer_id?.title ??
                    selectedItems?.[0]?.title ??
                    selectedItems?.[0]?.originalData?.title,
                  investment_volume:
                    selectedItems?.[0]?.offer_id?.investment_volume ??
                    selectedItems?.[0]?.investmentVolume ??
                    selectedItems?.[0]?.originalData?.investment_volume,
                  bonus_amount:
                    typeof selectedItems[0]?.bonusAmount === 'number'
                      ? selectedItems[0]?.bonusAmount
                      : typeof selectedItems[0]?.offer_id?.bonus_amount === 'number'
                        ? selectedItems[0]?.offer_id?.bonus_amount
                        : (selectedItems[0]?.offer_id?.bonus_amount?.info?.amount ??
                          (typeof selectedItems[0]?.originalData?.bonus_amount === 'number'
                            ? selectedItems[0]?.originalData?.bonus_amount
                            : (selectedItems[0]?.originalData?.bonus_amount?.info?.amount ?? 0))),
                  bankerRate:
                    selectedItems[0]?.offer_id?.bankerRate ??
                    selectedItems[0]?.originalData?.bankerRate,
                  agentRate:
                    selectedItems[0]?.offer_id?.agentRate ??
                    selectedItems[0]?.originalData?.agentRate,
                }
              : undefined
          }
        />
      )}

      <BulkNettoDialog
        isOpen={isBulkNettoDialogOpen}
        onClose={() => setIsBulkNettoDialogOpen(false)}
        onSuccess={() => {
          refetch?.();
          invalidateGroupedSummary();
          clearAllSelections();
          setIsBulkNettoDialogOpen(false);
        }}
        selectedOffers={
          selectedItems?.length > 0
            ? selectedItems?.map((item: any) => ({
                _id: item?.offer_id?._id ?? item?.originalData?._id ?? item?._id,
                title: item?.offer_id?.title ?? item?.title ?? item?.originalData?.title,
                investment_volume:
                  item?.offer_id?.investment_volume ??
                  item?.investmentVolume ??
                  item?.originalData?.investment_volume,
                bonus_amount:
                  typeof item?.bonusAmount === 'number'
                    ? item?.bonusAmount
                    : typeof item?.offer_id?.bonus_amount === 'number'
                      ? item?.offer_id?.bonus_amount
                      : (item?.offer_id?.bonus_amount?.info?.amount ??
                        (typeof item?.originalData?.bonus_amount === 'number'
                          ? item?.originalData?.bonus_amount
                          : (item?.originalData?.bonus_amount?.info?.amount ?? 0))),
              }))
            : []
        }
      />

      {/* PDF Confirmation Modal when existing pdf is found  offer-contract*/}
      <ConfirmDialog
        type="info"
        isOpen={isPdfConfirmationModalOpen}
        title="PDF Already Exists"
        onCancel={() => {
          setIsPdfConfirmationModalOpen(false);
          setSelectedRowForPdfConfirmation(null);
        }}
        onConfirm={() => {
          setIsPdfConfirmationModalOpen(false);
          setSelectedRowForPdf(selectedRowForPdfConfirmation);
          setSelectedRowForPdfConfirmation(null);
          setIsPdfModalOpen(true);
        }}
      >
        <div className="space-y-3">
          {selectedRowForPdfConfirmation && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-600">
                <strong>File:</strong>{' '}
                {selectedRowForPdfConfirmation?.existingPdf?.filename || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Lead:</strong> {selectedRowForPdfConfirmation.leadName || 'N/A'}
              </p>
            </div>
          )}
        </div>
      </ConfirmDialog>

      {/* PDF Email Modal */}
      <PdfEmailModal
        isOpen={isPdfModalOpen}
        onClose={() => {
          setIsPdfModalOpen(false);
          setSelectedRowForPdf(null);
        }}
        rowData={selectedRowForPdf}
        onPdfGenerated={handlePdfGenerated}
        onSuccess={() => {
          refetch?.();
          invalidateGroupedSummary();
        }}
      />

      {/* Generated PDF Preview Modal */}
      <GeneratedPdfPreviewModal
        isOpen={isGeneratedPdfPreviewOpen}
        onClose={() => setIsGeneratedPdfPreviewOpen()}
        generatedPdfData={generatedPdfData}
      />

      {/* Lost Confirmation Dialog */}
      {!config.disableDragDropDialogs && (
        <ConfirmDialog
          type="warning"
          isOpen={isLostDialogOpen}
          title="Send to Lost"
          onCancel={() => setIsLostDialogOpen(false)}
          onConfirm={() => handleCreateItem('lost', {})}
          confirmButtonProps={{ disabled: bulkCreateLostOffersMutation.isPending ?? false }}
          overlayClassName={detailsDialogOverlayClass}
          className={detailsDialogClass}
        >
          <p>
            Are you sure you want to mark {detailsSelectionCount} selected offer
            {detailsSelectionCount > 1 ? 's' : ''} as lost?
          </p>
          <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
        </ConfirmDialog>
      )}

      {/* Send to Out / Revert from Out Confirmation Dialog */}
      <ConfirmDialog
        type="warning"
        isOpen={isSendToOutDialogOpen}
        title={pathname.includes('out-offers') ? 'Revert from Out' : 'Send to Out'}
        onCancel={() => setIsSendToOutDialogOpen(false)}
        onConfirm={() =>
          handleCreateItem(pathname.includes('out-offers') ? 'revert-from-out' : 'send-to-out', {})
        }
        confirmButtonProps={{
          disabled: pathname.includes('out-offers')
            ? revertOffersFromOutMutation.isPending
            : moveOffersOutMutation.isPending,
        }}
        overlayClassName={detailsDialogOverlayClass}
        className={detailsDialogClass}
      >
        <p>
          Are you sure you want to {pathname.includes('out-offers') ? 'revert' : 'move'}{' '}
          {detailsSelectionCount} selected offer{detailsSelectionCount > 1 ? 's' : ''}{' '}
          {pathname.includes('out-offers') ? 'from out' : 'to out'}?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      {isNavigating && <LoadingSpinner />}

      {/* Opening Details Popup */}
      {OpeningDetailsPopup && dashboardType === DashboardType.OPENING && (
        <OpeningDetailsPopup
          isOpen={isOpeningDetailsOpen}
          title="Opening Details"
          onClose={() => {
            clearDetailsParams();
            setIsOpeningDetailsOpen(false);
            setSelectedOpeningForDetails(null);
          }}
          openingData={selectedOpeningForDetails}
          config={config}
          selectedRows={
            selectedOpeningForDetails
              ? [
                  selectedOpeningForDetails?.offer_id?._id ??
                    selectedOpeningForDetails?.originalData?.offer_id?._id ??
                    selectedOpeningForDetails?.originalData?._id ??
                    selectedOpeningForDetails?._id,
                ].filter(Boolean)
              : []
          }
          selectedItems={
            selectedOpeningForDetails
              ? [selectedOpeningForDetails?.originalData || selectedOpeningForDetails].filter(
                  Boolean
                )
              : []
          }
          onRevertOffers={handleRevertOffers}
          onCreateItem={handleCreateItem}
          onNettoSuccess={() => {
            refetch?.();
            invalidateGroupedSummary();
            clearAllSelections();
          }}
          handleDocumentAction={handleDocumentAction}
          handleFileUpload={handleFileUpload}
          isReverting={isReverting}
          isCreatingConfirmation={bulkCreateConfirmationsMutation.isPending ?? false}
          isCreatingPaymentVoucher={createPaymentVoucherMutation.isPending ?? false}
          isCreatingLost={bulkCreateLostOffersMutation.isPending ?? false}
          onCreateOpening={handleCreateOpening}
          isCreatingOpening={createOpeningMutation.isPending ?? false}
          dashboardType={dashboardType}
          selectedProgressFilter={selectedProgressFilter}
          setCreateOpeningOpen={setCreateOpeningOpen}
          setIsSendToOutDialogOpen={setIsSendToOutDialogOpen}
          setIsLostDialogOpen={setIsLostDialogOpen}
          setIsBulkUpdateDialogOpen={setIsBulkUpdateDialogOpen}
          setCreateConfirmationDialogOpen={setCreateConfirmationDialogOpen}
          setIsPaymentVoucherDialogOpen={setIsPaymentVoucherDialogOpen}
          setIsNettoDialogOpen={setIsNettoDialogOpen}
          setIsBulkNettoDialogOpen={setIsBulkNettoDialogOpen}
        />
      )}

      {/* Offer Details Popup */}
      {OpeningDetailsPopup && dashboardType === DashboardType.OFFER && (
        <OpeningDetailsPopup
          isOpen={isOfferDetailsOpen}
          title="Offer Details"
          onClose={() => {
            clearDetailsParams();
            setIsOfferDetailsOpen(false);
            setSelectedOfferForDetails(null);
          }}
          openingData={selectedOfferForDetails}
          config={config}
          selectedRows={
            selectedOfferForDetails
              ? [
                  selectedOfferForDetails?.offer_id?._id ??
                    selectedOfferForDetails?.originalData?._id ??
                    selectedOfferForDetails?._id,
                ].filter(Boolean)
              : []
          }
          selectedItems={
            selectedOfferForDetails
              ? [selectedOfferForDetails?.originalData || selectedOfferForDetails].filter(Boolean)
              : []
          }
          onRevertOffers={handleRevertOffers}
          onCreateItem={handleCreateItem}
          onNettoSuccess={() => {
            refetch?.();
            invalidateGroupedSummary();
            clearAllSelections();
          }}
          handleDocumentAction={handleDocumentAction}
          handleFileUpload={handleFileUpload}
          isReverting={isReverting}
          isCreatingConfirmation={bulkCreateConfirmationsMutation.isPending ?? false}
          isCreatingPaymentVoucher={createPaymentVoucherMutation.isPending ?? false}
          isCreatingLost={bulkCreateLostOffersMutation.isPending ?? false}
          onCreateOpening={handleCreateOpening}
          isCreatingOpening={createOpeningMutation.isPending ?? false}
          dashboardType={dashboardType}
          selectedProgressFilter={selectedProgressFilter}
          setCreateOpeningOpen={setCreateOpeningOpen}
          setIsSendToOutDialogOpen={setIsSendToOutDialogOpen}
        />
      )}

      {/* Ticket Assignment Dialog (for offer_tickets dashboard) */}
      {dashboardType === DashboardType.OFFER_TICKETS && (
        <AssignTicketDialog
          isOpen={isAssignTicketDialogOpen}
          onClose={() => {
            setIsAssignTicketDialogOpen(false);
            setSelectedTicketForAssign(null);
          }}
          ticketId={selectedTicketForAssign?.ticketId || ''}
          ticketData={selectedTicketForAssign?.rowData}
          onSuccess={handleAssignTicketSuccess}
        />
      )}
    </>
  );
};

export default UnifiedDashboardDialogs;
