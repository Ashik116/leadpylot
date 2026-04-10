'use client';

import { useState, useCallback } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useDocumentHandler } from '@/hooks/useDocumentHandler';
import { useSession } from '@/hooks/useSession';
import { useUnifiedDashboardContext } from '../../../_components/unified-dashboard/UnifiedDashboardContext';
import { useEmailViewStore } from '@/stores/emailViewStore';
import { DashboardType } from '../../../_components/dashboardTypes';
import { useOpeningDetailsDialogs } from './useOpeningDetailsDialogs';
import { useOpeningDetailsData } from './useOpeningDetailsData';
import { OpeningDetailsContent } from './OpeningDetailsContent';
import { OpeningDetailsDialogs } from './OpeningDetailsDialogs';
import type { OpeningDetailsPopupProps } from './types';

const OpeningDetailsPopup = ({
  title,
  isOpen,
  onClose: onCloseProp,
  openingData,
  config,
  selectedRows,
  selectedItems,
  onRevertOffers: _onRevertOffers,
  onCreateItem,
  onNettoSuccess,
  isReverting,
  isCreatingConfirmation,
  isCreatingPaymentVoucher,
  isCreatingLost,
  dashboardType,
  selectedProgressFilter,
  setIsLostDialogOpen: setIsLostDialogOpenProp,
  setIsBulkUpdateDialogOpen: setIsBulkUpdateDialogOpenProp,
  setCreateConfirmationDialogOpen: setCreateConfirmationDialogOpenProp,
  setIsPaymentVoucherDialogOpen: setIsPaymentVoucherDialogOpenProp,
  setIsNettoDialogOpen: setIsNettoDialogOpenProp,
  setIsBulkNettoDialogOpen: setIsBulkNettoDialogOpenProp,
  onCreateOpening,
  isCreatingOpening = false,
  hideActionButtons = false,
  renderWithoutDialog = false,
  className = '',
  taskType,
}: OpeningDetailsPopupProps) => {
  const { data: session } = useSession();
  const context = useUnifiedDashboardContext();
  const documentHandler = useDocumentHandler();
  const { clearEmailView, data } = useEmailViewStore();
  const hasEmailView = !!data;

  const [viewState, setViewState] = useState<'table' | 'details' | 'form'>('table');

  const onClose = useCallback(() => {
    clearEmailView();
    onCloseProp?.();
  }, [clearEmailView, onCloseProp]);

  // Dialog state management
  const { dialogStates, dialogSetters } = useOpeningDetailsDialogs({
    setCreateConfirmationDialogOpenProp,
    setIsPaymentVoucherDialogOpenProp,
    setIsNettoDialogOpenProp,
    setIsBulkNettoDialogOpenProp,
    setIsLostDialogOpenProp,
    setIsBulkUpdateDialogOpenProp,
  });

  // Data management
  const {
    opening,
    lead,
    leadId,
    offerId,
    openingIdFromProp,
    fetchedOpening,
    refetchOpening,
    transformedOpeningData,
    splitPaymentAgentOptions,
    inboundPaymentAgentOptions,
    filteredConfig,
    handleSplitPaymentSubmit,
    handleInboundPaymentSubmit,
    isPaymentMutationPending,
  } = useOpeningDetailsData({
    openingData,
    isOpen,
    dashboardType,
    config,
  });

  const taskTypeValue = dashboardType === DashboardType.OPENING ? 'opening' : 'offer';

  // Edit offer handler
  const handleEditOffer = useCallback(() => {
    if (context?.setSelectedOfferForEdit && context?.setIsEditOfferDialogOpen) {
      context.setSelectedOfferForEdit(opening);
      context.setIsEditOfferDialogOpen(true);
    }
  }, [opening, context]);

  // Main content
  const content = (
    <div className={`flex h-full flex-1 flex-col overflow-hidden ${className}`}>
      <OpeningDetailsContent
        title={title}
        hideActionButtons={hideActionButtons}
        config={filteredConfig}
        selectedRows={selectedRows}
        selectedItems={selectedItems}
        selectedProgressFilter={selectedProgressFilter}
        dialogSetters={dialogSetters}
        isReverting={isReverting}
        opening={opening}
        lead={lead}
        leadId={leadId}
        offerId={offerId}
        openingIdFromProp={openingIdFromProp}
        transformedOpeningData={transformedOpeningData}
        session={session}
        dashboardType={dashboardType}
        handleEditOffer={handleEditOffer}
        taskTypeValue={taskTypeValue}
        taskType={taskType}
        viewState={viewState}
        setViewState={setViewState}
        setIsTicketModalOpen={dialogSetters.setIsTicketModalOpen}
        propsClassName="mr-8"
      />
    </div>
  );

  // All dialogs
  const dialogs = (
    <OpeningDetailsDialogs
      dialogStates={dialogStates}
      dialogSetters={dialogSetters}
      leadId={leadId}
      offerId={offerId}
      openingIdFromProp={openingIdFromProp}
      opening={opening}
      openingData={openingData}
      selectedRows={selectedRows}
      selectedItems={selectedItems}
      fetchedOpening={fetchedOpening}
      refetchOpening={refetchOpening}
      onCreateItem={onCreateItem}
      onNettoSuccess={onNettoSuccess}
      onCreateOpening={onCreateOpening}
      isCreatingConfirmation={isCreatingConfirmation}
      isCreatingPaymentVoucher={isCreatingPaymentVoucher}
      isCreatingLost={isCreatingLost}
      isCreatingOpening={isCreatingOpening}
      dashboardType={dashboardType}
      splitPaymentAgentOptions={splitPaymentAgentOptions}
      inboundPaymentAgentOptions={inboundPaymentAgentOptions}
      handleSplitPaymentSubmit={handleSplitPaymentSubmit}
      handleInboundPaymentSubmit={handleInboundPaymentSubmit}
      isPaymentMutationPending={isPaymentMutationPending}
      documentHandler={documentHandler}
      taskTypeValue={taskTypeValue}
    />
  );

  // If rendering without dialog wrapper (for embedding)
  if (renderWithoutDialog) {
    return (
      <>
        {content}
        {dialogs}
      </>
    );
  }

  // Default: wrap in Dialog
  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={hasEmailView ? clearEmailView : onClose}
        height="95dvh"
        className="min-w-[99dvw] 2xl:min-w-[95dvw]"
        contentClassName="!p-0 !my-5"
      >
        {content}
      </Dialog>
      {dialogs}
    </>
  );
};

export default OpeningDetailsPopup;
