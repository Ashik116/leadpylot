'use client';

import React from 'react';
import ActionButtonsSection from '@/app/(protected-pages)/dashboards/_components/ActionButtonsSection';
import { DashboardType } from '@/app/(protected-pages)/dashboards/_components/dashboardTypes';
import { useLeadDetailsBulkActions } from './LeadDetailsBulkActionsContext';
import type { PageType } from '@/stores/selectedItemsStore';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';

interface LeadDetailsActionButtonsProps {
  tableName: PageType;
  onEditSelected?: (items: any[]) => void;
  onDeleteSelected?: (items: any[]) => void;
}

export function LeadDetailsActionButtons({
  tableName,
  onEditSelected,
  onDeleteSelected,
}: LeadDetailsActionButtonsProps) {
  const ctx = useLeadDetailsBulkActions();
  const getSelectedItems = useSelectedItemsStore((s) => s.getSelectedItems);
  const selectedItems = getSelectedItems(tableName);
  const selectedRows = selectedItems.map((i: any) => i?._id).filter(Boolean);

  const isOutOffers = tableName === 'lead-out-offers';
  const isOpenings = tableName === 'lead-openings';

  // Override config for openings: show Revert based on table we're rendering for
  const config =
    isOpenings && !ctx.config.showRevert
      ? { ...ctx.config, showRevert: true }
      : ctx.config;

  return (
    <ActionButtonsSection
      config={config}
      selectedRows={selectedRows}
      selectedItems={selectedItems}
      session={ctx.session}
      setIsBulkUpdateDialogOpen={ctx.setIsBulkUpdateDialogOpen}
      setCreateOpeningOpen={ctx.setCreateOpeningOpen}
      setCreateConfirmationDialogOpen={ctx.setCreateConfirmationDialogOpen}
      setIsPaymentVoucherDialogOpen={ctx.setIsPaymentVoucherDialogOpen}
      setIsLostDialogOpen={ctx.setIsLostDialogOpen}
      setIsSendToOutDialogOpen={ctx.setIsSendToOutDialogOpen}
      setIsNettoDialogOpen={ctx.setIsNettoDialogOpen}
      setIsBulkNettoDialogOpen={ctx.setIsBulkNettoDialogOpen}
      setIsBulkDeleteDialogOpen={ctx.setIsBulkDeleteDialogOpen}
      onEditSelected={onEditSelected}
      onDeleteSelected={onDeleteSelected}
      dashboardType={isOpenings ? DashboardType.OPENING : DashboardType.OFFER}
      selectedProgressFilter={isOpenings ? DashboardType.ALL : undefined}
      isOutOffersPageResolved={isOutOffers}
      onRevertOffers={isOpenings ? ctx.handleRevertOpening : undefined}
      isReverting={
        isOpenings
          ? (ctx.isRevertOpeningPending ?? false)
          : (ctx.revertOffersFromOutMutation.isPending ?? false)
      }
      dropdownButtonSize="xs"
      dropdownIconClassName="text-sm"
    />
  );
}
