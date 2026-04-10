import TicketModal from '@/app/(protected-pages)/dashboards/leads/[id]/_components/TicketModal';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import CreateConfirmationDialog from '../../../_components/CreateConfirmationDialog';
import CreatePaymentVoucherDialog from '../../../_components/CreatePaymentVoucherDialog';
import NettoModal from '../../../_components/NettoModal';
import BulkUpdateDialog from '../../../leads/_components/BulkUpdateDialog';
import BulkNettoDialog from '../../../netto/_components/BulkNettoDialog';
import PaymentHistoryModal from '../PaymentHistoryModal';
import AgentPaymentModal from './AgentPaymentModal';
import type { OpeningDetailsDialogsProps } from './types';

export function OpeningDetailsDialogs({
  dialogStates,
  dialogSetters,
  leadId,
  offerId,
  openingIdFromProp,
  opening,
  openingData,
  selectedRows,
  selectedItems,
  fetchedOpening,
  refetchOpening,
  onCreateItem,
  onNettoSuccess,
  onCreateOpening,
  isCreatingConfirmation,
  isCreatingPaymentVoucher,
  isCreatingLost,
  isCreatingOpening,
  dashboardType,
  splitPaymentAgentOptions,
  inboundPaymentAgentOptions,
  handleSplitPaymentSubmit,
  handleInboundPaymentSubmit,
  isPaymentMutationPending,
  documentHandler,
  taskTypeValue,
}: OpeningDetailsDialogsProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  return (
    <>
      {/* Create Ticket Modal */}
      {leadId && (
        <TicketModal
          isOpen={dialogStates.isTicketModalOpen}
          onClose={() => dialogSetters.setIsTicketModalOpen(false)}
          leadId={leadId}
          offers={opening?.offers ?? []}
          opening={opening}
          dashboardType={dashboardType === 'opening' ? 'opening' : 'offer'}
          taskType={taskTypeValue}
        />
      )}

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog {...documentHandler?.dialogProps} title="Document Preview" />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        type="warning"
        isOpen={documentHandler.deleteConfirmOpen}
        title="Delete Document"
        confirmText="Delete"
        onCancel={() => documentHandler.setDeleteConfirmOpen(false)}
        onConfirm={documentHandler.handleDeleteConfirm}
      >
        <p>
          Are you sure you want to delete{' '}
          <strong>{documentHandler.documentToDelete?.filename}</strong>? This action cannot be
          undone.
        </p>
      </ConfirmDialog>

      {/* Create Confirmation Dialog */}
      <CreateConfirmationDialog
        isOpen={dialogStates.createConfirmationDialogOpen}
        onClose={() => dialogSetters.setCreateConfirmationDialogOpen(false)}
        onCreate={async (reference_no?: string) => {
          await onCreateItem('confirmation', { reference_no }, offerId);
          dialogSetters.setCreateConfirmationDialogOpen(false);
        }}
        isCreating={isCreatingConfirmation}
      />

      {/* Create Payment Voucher Dialog */}
      <CreatePaymentVoucherDialog
        isOpen={dialogStates.isPaymentVoucherDialogOpen}
        onClose={() => dialogSetters.setIsPaymentVoucherDialogOpen(false)}
        onCreate={(data) => onCreateItem('payment-voucher', data, offerId)}
        isCreating={isCreatingPaymentVoucher}
        selectedCount={1}
      />

      {/* Netto Modal */}
      <NettoModal
        open={dialogStates.isNettoDialogOpen}
        onClose={() => dialogSetters.setIsNettoDialogOpen(false)}
        onSuccess={onNettoSuccess}
        offer={openingData}
      />

      {/* Bulk Netto Dialog */}
      <BulkNettoDialog
        isOpen={dialogStates.isBulkNettoDialogOpen}
        onClose={() => dialogSetters.setIsBulkNettoDialogOpen(false)}
        onSuccess={onNettoSuccess}
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
            : openingData
              ? [
                {
                  _id: offerId,
                  title: opening?.title || opening?.nametitle || '',
                  investment_volume: opening?.investment_volume || 0,
                  bonus_amount:
                    typeof opening?.bonus_amount === 'number'
                      ? opening.bonus_amount
                      : opening?.bonus_amount?.info?.amount || 0,
                },
              ]
              : []
        }
      />

      {/* Send to Lost Confirmation Dialog */}
      <ConfirmDialog
        type="warning"
        isOpen={dialogStates.isLostDialogOpen}
        title="Send to Lost"
        onCancel={() => dialogSetters.setIsLostDialogOpen(false)}
        onConfirm={async () => {
          await onCreateItem('lost', {}, offerId);
          dialogSetters.setIsLostDialogOpen(false);
        }}
        confirmButtonProps={{ disabled: isCreatingLost }}
      >
        <p>Are you sure you want to mark this offer as lost?</p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      {/* Create Opening Confirmation Dialog */}
      <ConfirmDialog
        type="warning"
        isOpen={dialogStates.isCreateOpeningDialogOpen}
        title="Create Opening"
        onCancel={() => dialogSetters.setIsCreateOpeningDialogOpen(false)}
        onConfirm={async () => {
          await onCreateOpening?.();
          dialogSetters.setIsCreateOpeningDialogOpen(false);
        }}
        confirmButtonProps={{ disabled: isCreatingOpening }}
      >
        <p>
          Are you sure you want to create openings for{' '}
          {selectedRows?.length > 0 ? selectedRows.length : 1} selected offer
          {(selectedRows?.length || 1) > 1 ? 's' : ''}?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      {/* Send to Out / Revert from Out Confirmation Dialog */}
      <ConfirmDialog
        type="warning"
        isOpen={dialogStates.isSendToOutDialogOpen}
        title={pathname.includes('out-offers') ? 'Revert from Out' : 'Send to Out'}
        onCancel={() => dialogSetters.setIsSendToOutDialogOpen(false)}
        onConfirm={async () => {
          await onCreateItem(
            pathname.includes('out-offers') ? 'revert-from-out' : 'send-to-out',
            {},
            offerId
          );
          dialogSetters.setIsSendToOutDialogOpen(false);
        }}
      >
        <p>
          Are you sure you want to {pathname.includes('out-offers') ? 'revert' : 'move'}{' '}
          {selectedRows?.length > 0 ? selectedRows.length : 1} selected offer
          {(selectedRows?.length || 1) > 1 ? 's' : ''}{' '}
          {pathname.includes('out-offers') ? 'from out' : 'to out'}?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      {/* Payment History Modal */}
      <PaymentHistoryModal
        isOpen={dialogStates.isPaymentHistoryModalOpen}
        onClose={() => {
          dialogSetters.setIsPaymentHistoryModalOpen(false);
          dialogSetters.setShouldOpenAddForm(false);
        }}
        offerId={String(offerId)}
        financials={fetchedOpening?.financials || {}}
        invalidateQueries={['opening', openingIdFromProp]}
        refetch={refetchOpening}
        onSuccess={() => { }}
        openAddFormByDefault={dialogStates.shouldOpenAddForm}
      />

      {/* Bulk Update Dialog */}
      <BulkUpdateDialog
        isOpen={dialogStates.isBulkUpdateDialogOpen}
        onClose={() => dialogSetters.setIsBulkUpdateDialogOpen(false)}
        selectedLeads={
          leadId
            ? [String(leadId)]
            : selectedItems?.length > 0
              ? selectedItems
                ?.map(
                  (item: any) =>
                    item?.leadId ??
                    item?.lead_id?._id ??
                    item?.lead_id ??
                    item?.offer_id?.lead_id?._id
                )
                ?.filter(Boolean)
                ?.map((id: any) => String(id))
              : []
        }
        onSuccess={() => {
          dialogSetters.setIsBulkUpdateDialogOpen(false);
          if (openingIdFromProp) {
            queryClient.invalidateQueries({ queryKey: ['opening', openingIdFromProp] });
          }
          queryClient.invalidateQueries({ queryKey: ['opening'] });
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }}
      />

      {/* Split Agent Payment Modal */}
      <AgentPaymentModal
        isOpen={dialogStates.isSplitPaymentModalOpen}
        onClose={() => dialogSetters.setIsSplitPaymentModalOpen(false)}
        onSubmit={handleSplitPaymentSubmit}
        agentOptions={splitPaymentAgentOptions}
        isLoading={isPaymentMutationPending}
        title="Record Split Agent Payment"
        agentType="split"
      />

      {/* Inbound Agent Payment Modal */}
      <AgentPaymentModal
        isOpen={dialogStates.isInboundPaymentModalOpen}
        onClose={() => dialogSetters.setIsInboundPaymentModalOpen(false)}
        onSubmit={handleInboundPaymentSubmit}
        agentOptions={inboundPaymentAgentOptions}
        isLoading={isPaymentMutationPending}
        title="Record Inbound Agent Payment"
        agentType="inbound"
      />
    </>
  );
}
