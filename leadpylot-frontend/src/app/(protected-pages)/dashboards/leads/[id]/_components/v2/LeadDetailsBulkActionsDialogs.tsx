'use client';

import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import CreateConfirmationDialog from '@/app/(protected-pages)/dashboards/_components/CreateConfirmationDialog';
import CreatePaymentVoucherDialog from '@/app/(protected-pages)/dashboards/_components/CreatePaymentVoucherDialog';
import BulkNettoDialog from '@/app/(protected-pages)/dashboards/netto/_components/BulkNettoDialog';
import BulkUpdateDialog from '@/app/(protected-pages)/dashboards/leads/_components/BulkUpdateDialog';
import NettoModal from '@/app/(protected-pages)/dashboards/_components/NettoModal';
import { useLeadDetailsBulkActions } from './LeadDetailsBulkActionsContext';
import { useLeadDetailsContext } from '../LeadDetailsContext';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';

function mapSelectedItemsToOffers(
  selectedItems: any[]
): Array<{ _id: string; title?: string; investment_volume: number; bonus_amount: number }> {
  return selectedItems
    .map((item: any) => {
      const offer = item?.offer_id ?? item;
      const offerId = offer?._id ?? item?._id;
      if (!offerId) return null;
      const bonusAmount =
        typeof item?.bonus_amount === 'number'
          ? item.bonus_amount
          : typeof offer?.bonus_amount === 'number'
            ? offer.bonus_amount
            : offer?.bonus_amount?.info?.amount ?? item?.bonus_amount?.info?.amount ?? 0;
      return {
        _id: String(offerId),
        title: offer?.nametitle ?? item?.nametitle ?? offer?.title ?? item?.title,
        investment_volume:
          offer?.investment_volume ?? item?.investment_volume ?? item?.investmentVolume ?? 0,
        bonus_amount: bonusAmount,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

export function LeadDetailsBulkActionsDialogs() {
  const ctx = useLeadDetailsBulkActions();
  const { lead } = useLeadDetailsContext();
  const queryClient = useQueryClient();
  const leadId = lead?._id;
  const count = ctx.selectedItems.length;
  const currentPage = useSelectedItemsStore((s) => s.getCurrentPage());
  const isRevertFromOut = currentPage === 'lead-out-offers';
  const selectedOffersForNetto = mapSelectedItemsToOffers(ctx.selectedItems);

  const handleNettoSuccess = () => {
    ctx.clearAllSelections();
    if (leadId) queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
  };

  const handleBulkUpdateSuccess = () => {
    ctx.clearAllSelections();
    if (leadId) queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
  };

  return (
    <>
      <CreateConfirmationDialog
        isOpen={ctx.createConfirmationDialogOpen}
        onClose={() => ctx.setCreateConfirmationDialogOpen(false)}
        onCreate={(reference_no?: string) =>
          ctx.handleCreateItem('confirmation', { reference_no })
        }
        isCreating={ctx.bulkCreateConfirmationsMutation.isPending ?? false}
      />

      <CreatePaymentVoucherDialog
        isOpen={ctx.isPaymentVoucherDialogOpen}
        onClose={() => ctx.setIsPaymentVoucherDialogOpen(false)}
        onCreate={(data) => ctx.handleCreateItem('payment-voucher', data)}
        isCreating={ctx.createPaymentVoucherMutation.isPending ?? false}
        selectedCount={count}
      />

      <ConfirmDialog
        type="warning"
        isOpen={ctx.createOpeningOpen}
        title="Create Opening"
        onCancel={() => ctx.setCreateOpeningOpen(false)}
        onConfirm={ctx.handleCreateOpening}
        confirmButtonProps={{ disabled: ctx.createOpeningMutation.isPending ?? false }}
      >
        <p>
          Are you sure you want to create openings for {count} selected offer
          {count !== 1 ? 's' : ''}?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      <ConfirmDialog
        type="warning"
        isOpen={ctx.isLostDialogOpen}
        title="Send to Lost"
        onCancel={() => ctx.setIsLostDialogOpen(false)}
        onConfirm={() => ctx.handleCreateItem('lost', {})}
        confirmButtonProps={{ disabled: ctx.bulkCreateLostOffersMutation.isPending ?? false }}
      >
        <p>
          Are you sure you want to mark {count} selected offer{count !== 1 ? 's' : ''}{' '}
          as lost?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      <ConfirmDialog
        type="warning"
        isOpen={ctx.isSendToOutDialogOpen}
        title={isRevertFromOut ? 'Revert from Out' : 'Send to Out'}
        onCancel={() => ctx.setIsSendToOutDialogOpen(false)}
        onConfirm={() =>
          ctx.handleCreateItem(isRevertFromOut ? 'revert-from-out' : 'send-to-out', {})
        }
        confirmButtonProps={{
          disabled:
            isRevertFromOut
              ? ctx.revertOffersFromOutMutation.isPending ?? false
              : ctx.moveOffersOutMutation.isPending ?? false,
        }}
      >
        <p>
          Are you sure you want to {isRevertFromOut ? 'revert' : 'move'}{' '}
          {count} selected offer{count !== 1 ? 's' : ''}{' '}
          {isRevertFromOut ? 'from out' : 'to out'}?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      <NettoModal
        open={ctx.isNettoDialogOpen}
        onClose={() => ctx.setIsNettoDialogOpen(false)}
        onSuccess={handleNettoSuccess}
        offer={
          selectedOffersForNetto[0]
            ? {
                _id: selectedOffersForNetto[0]._id,
                title: selectedOffersForNetto[0].title,
                investment_volume: selectedOffersForNetto[0].investment_volume,
                bonus_amount: selectedOffersForNetto[0].bonus_amount,
              }
            : undefined
        }
      />

      <BulkNettoDialog
        isOpen={ctx.isBulkNettoDialogOpen}
        onClose={() => ctx.setIsBulkNettoDialogOpen(false)}
        onSuccess={handleNettoSuccess}
        selectedOffers={selectedOffersForNetto}
      />

      <BulkUpdateDialog
        isOpen={ctx.isBulkUpdateDialogOpen}
        onClose={() => ctx.setIsBulkUpdateDialogOpen(false)}
        selectedLeads={leadId ? [leadId] : []}
        onSuccess={handleBulkUpdateSuccess}
      />

      <ConfirmDialog
        type="warning"
        isOpen={ctx.isBulkDeleteDialogOpen}
        title="Delete Offers"
        onCancel={() => ctx.setIsBulkDeleteDialogOpen(false)}
        onConfirm={() => {
          const offerIds = ctx.selectedItems
            .map((item: any) => item?.offer_id?._id ?? item?.offer_id ?? item?._id)
            .filter(Boolean);
          if (offerIds.length > 0) {
            ctx.bulkDeleteOffersMutation.mutateAsync(offerIds).then(
              () => {
                ctx.setIsBulkDeleteDialogOpen(false);
                ctx.clearAllSelections();
                if (leadId) queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
                queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
              },
              () => {}
            );
          }
        }}
        confirmButtonProps={{
          disabled: ctx.bulkDeleteOffersMutation.isPending ?? false,
        }}
      >
        <p>
          Are you sure you want to delete {count} selected offer
          {count !== 1 ? 's' : ''}? This action cannot be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}
