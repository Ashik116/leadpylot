'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBulkCreateConfirmations } from '@/services/hooks/useConfirmations';
import { useCreatePaymentVoucher } from '@/services/hooks/usePaymentVouchers';
import { useBulkCreateLostOffers } from '@/services/hooks/useLostOffers';
import { useMoveOffersOut, useRevertOffersFromOut } from '@/services/hooks/useOffers';
import { useBulkDeleteOffers } from '@/services/hooks/useLeads';
import { useCreateOpeningWithoutFiles } from '@/services/hooks/useOpenings';
import { useRevertOffers } from '@/hooks/useRevertOffers';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import type { PageType } from '@/stores/selectedItemsStore';
import { useAuth } from '@/hooks/useAuth';
import { useLeadDetailsContext } from '../LeadDetailsContext';

export const LEAD_TABLE_NAMES = {
  OFFERS: 'lead-offers' as PageType,
  OUT_OFFERS: 'lead-out-offers' as PageType,
  OPENINGS: 'lead-openings' as PageType,
} as const;

function getOfferIds(items: any[]): string[] {
  return items
    .map((item: any) => item?.offer_id?._id ?? item?.offer_id ?? item?._id)
    .filter(Boolean);
}

/**
 * Extract offer IDs from opening table items.
 * Items may be: (1) offers with progress (_id = offer id), (2) openings (offer_id needed),
 * or (3) have _id = opening id - use openingsList to resolve offer_id.
 */
function getOfferIdsFromOpenings(
  items: any[],
  openingsList: any[] = []
): string[] {
  const offerIds: string[] = [];
  for (const item of items) {
    let offerId =
      item?.offer_id?._id ??
      item?.offer_id ??
      item?.offerId ??
      item?.originalData?.offer_id?._id ??
      item?.originalData?.offer_id ??
      item?.progression?.offer_id?._id ??
      item?.progression?.offer_id;
    if (!offerId && openingsList.length > 0) {
      const openingId = item?._id ?? item?.opening_id?._id ?? item?.opening_id;
      if (openingId) {
        const opening = openingsList.find(
          (o: any) => String(o?._id ?? o?.id ?? '') === String(openingId)
        );
        offerId = opening?.offer_id?._id ?? opening?.offer_id ?? opening?.offerId;
      }
    }
    if (!offerId && item?._id) {
      offerId = item._id;
    }
    if (offerId) offerIds.push(String(offerId));
  }
  return offerIds;
}

export interface LeadDetailsBulkActionsContextValue {
  config: {
    showCreateOpening: boolean;
    showCreateConfirmation: boolean;
    showCreatePaymentVoucher: boolean;
    showLost: boolean;
    showRevert: boolean;
    showSendToOut: boolean;
    showBulkUpdate?: boolean;
    showNetto?: boolean;
    showBulkNetto?: boolean;
    showPinToSlot?: boolean;
  };
  selectedRows: string[];
  selectedItems: any[];
  session: { user?: { role?: string } };
  createConfirmationDialogOpen: boolean;
  setCreateConfirmationDialogOpen: (v: boolean) => void;
  isPaymentVoucherDialogOpen: boolean;
  setIsPaymentVoucherDialogOpen: (v: boolean) => void;
  createOpeningOpen: boolean;
  setCreateOpeningOpen: (v: boolean) => void;
  isLostDialogOpen: boolean;
  setIsLostDialogOpen: (v: boolean) => void;
  isSendToOutDialogOpen: boolean;
  setIsSendToOutDialogOpen: (v: boolean) => void;
  isNettoDialogOpen: boolean;
  setIsNettoDialogOpen: (v: boolean) => void;
  isBulkNettoDialogOpen: boolean;
  setIsBulkNettoDialogOpen: (v: boolean) => void;
  isBulkUpdateDialogOpen: boolean;
  setIsBulkUpdateDialogOpen: (v: boolean) => void;
  isBulkDeleteDialogOpen: boolean;
  setIsBulkDeleteDialogOpen: (v: boolean) => void;
  handleCreateOpening: () => void;
  handleCreateItem: (
    type: 'confirmation' | 'payment-voucher' | 'lost' | 'send-to-out' | 'revert-from-out',
    data: { reference_no?: string; notes?: string; files?: File[]; amount?: number }
  ) => Promise<void>;
  clearAllSelections: () => void;
  bulkCreateConfirmationsMutation: { isPending?: boolean };
  createPaymentVoucherMutation: { isPending?: boolean };
  bulkCreateLostOffersMutation: { isPending?: boolean };
  createOpeningMutation: { isPending?: boolean };
  moveOffersOutMutation: { isPending?: boolean };
  revertOffersFromOutMutation: { isPending?: boolean };
  /** Revert opening(s) - calls POST /offers/{id}/revert/opening. For openings table only. Accepts items when passed from ActionButtonsSection. */
  handleRevertOpening: (items?: any[]) => Promise<void>;
  isRevertOpeningPending: boolean;
  bulkDeleteOffersMutation: {
    mutateAsync: (ids: string[]) => Promise<unknown>;
    isPending?: boolean;
  };
  getSelectedItemsForTable: (tableName: PageType) => any[];
  /** Increments when a switch action completes - use as selectionResetKey to clear table selection */
  selectionResetKey: number;
  /** Returns offerIds and documentIds for bulk pin to slot. Null if no valid selection. */
  getPinToSlotPayload: (tableName: PageType) => { offerIds: string[]; documentIds: string[] } | null;
  /** Call after successful pin to slot - clears selection and invalidates queries */
  onPinToSlotSuccess: () => void;
}

const LeadDetailsBulkActionsContext = createContext<LeadDetailsBulkActionsContextValue | null>(null);

interface LeadDetailsBulkActionsProviderProps {
  children: React.ReactNode;
  /** Openings data for the lead - used to resolve opening IDs when offers don't have opening populated */
  openingsData?: { data?: any[] };
}

export function LeadDetailsBulkActionsProvider({ children, openingsData }: LeadDetailsBulkActionsProviderProps) {
  const { lead } = useLeadDetailsContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const leadId = lead?._id;

  const [createConfirmationDialogOpen, setCreateConfirmationDialogOpen] = useState(false);
  const [isPaymentVoucherDialogOpen, setIsPaymentVoucherDialogOpen] = useState(false);
  const [createOpeningOpen, setCreateOpeningOpen] = useState(false);
  const [isLostDialogOpen, setIsLostDialogOpen] = useState(false);
  const [isSendToOutDialogOpen, setIsSendToOutDialogOpen] = useState(false);
  const [isNettoDialogOpen, setIsNettoDialogOpen] = useState(false);
  const [isBulkNettoDialogOpen, setIsBulkNettoDialogOpen] = useState(false);
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectionResetKey, setSelectionResetKey] = useState(0);

  const { getSelectedItems, getCurrentPage, clearSelectedItems } = useSelectedItemsStore();

  const triggerSelectionReset = useCallback(() => {
    clearSelectedItems();
    setSelectionResetKey((k) => k + 1);
  }, [clearSelectedItems]);

  const bulkCreateConfirmationsMutation = useBulkCreateConfirmations({
    onSuccess: () => {
      setCreateConfirmationDialogOpen(false);
      triggerSelectionReset();
      if (leadId) queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
    },
  });

  const createPaymentVoucherMutation = useCreatePaymentVoucher();
  const bulkCreateLostOffersMutation = useBulkCreateLostOffers({
    onSuccess: () => {
      setIsLostDialogOpen(false);
      triggerSelectionReset();
      if (leadId) queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
    },
  });

  const createOpeningMutation = useCreateOpeningWithoutFiles({
    onSuccess: () => {
      setCreateOpeningOpen(false);
      triggerSelectionReset();
      if (leadId) queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
    },
  });

  const moveOffersOutMutation = useMoveOffersOut();
  const revertOffersFromOutMutation = useRevertOffersFromOut();
  const { revertOffers, isLoading: isRevertOpeningPending } = useRevertOffers({
    onSuccess: () => {
      triggerSelectionReset();
      if (leadId) queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
    },
  });

  const openingsList = React.useMemo(
    () => openingsData?.data ?? [],
    [openingsData?.data]
  );

  const handleRevertOpening = useCallback(
    async (itemsFromAction?: any[]) => {
      const items =
        itemsFromAction && itemsFromAction.length > 0
          ? itemsFromAction
          : getSelectedItems(LEAD_TABLE_NAMES.OPENINGS);
      const offerIds = getOfferIdsFromOpenings(items ?? [], openingsList);
      if (!offerIds.length) return;
      await revertOffers(offerIds, 'opening');
    },
    [getSelectedItems, revertOffers, openingsList]
  );

  const bulkDeleteOffersMutationRaw = useBulkDeleteOffers();
  const bulkDeleteOffersMutation = {
    mutateAsync: bulkDeleteOffersMutationRaw.mutateAsync,
    isPending: bulkDeleteOffersMutationRaw.isPending,
  };

  const clearAllSelections = useCallback(() => {
    triggerSelectionReset();
  }, [triggerSelectionReset]);

  const getSelectedItemsForTable = useCallback(
    (tableName: PageType) => getSelectedItems(tableName),
    [getSelectedItems]
  );

  const getPinToSlotPayload = useCallback(
    (tableName: PageType): { offerIds: string[]; documentIds: string[] } | null => {
      const items = getSelectedItems(tableName);
      if (!items?.length) return null;

      if (tableName === LEAD_TABLE_NAMES.OFFERS) {
        const offerIds: string[] = [];
        const documentIds: string[] = [];
        for (const item of items) {
          const offerId = item?._id ?? item?.offer_id?._id ?? item?.offer_id;
          let openingId =
            item?.opening?._id ??
            item?.opening_id?._id ??
            item?.opening_id ??
            item?.progression?.opening?._id;
          if (!openingId && offerId && openingsList.length > 0) {
            const opening = openingsList.find(
              (o: any) => String(o?.offer_id?._id ?? o?.offer_id ?? '') === String(offerId)
            );
            openingId = opening?._id ?? opening?.id;
          }
          if (offerId && openingId) {
            offerIds.push(String(offerId));
            documentIds.push(String(openingId));
          }
        }
        return offerIds.length > 0 ? { offerIds, documentIds } : null;
      }

      if (tableName === LEAD_TABLE_NAMES.OPENINGS) {
        const offerIds: string[] = [];
        const documentIds: string[] = [];
        for (const item of items) {
          const offerId =
            item?.offer_id?._id ??
            item?.offer_id ??
            item?.offerId;
          const openingId =
            item?._id ??
            item?.opening_id?._id ??
            item?.opening_id ??
            item?.progression?.opening?._id;
          if (offerId && openingId) {
            offerIds.push(String(offerId));
            documentIds.push(String(openingId));
          } else if (openingId && openingsList.length > 0) {
            const opening = openingsList.find(
              (o: any) => String(o?._id ?? o?.id ?? '') === String(openingId)
            );
            const resolvedOfferId = opening?.offer_id?._id ?? opening?.offer_id ?? opening?.offerId;
            if (resolvedOfferId) {
              offerIds.push(String(resolvedOfferId));
              documentIds.push(String(openingId));
            }
          }
        }
        return offerIds.length > 0 && documentIds.length > 0 ? { offerIds, documentIds } : null;
      }

      return null;
    },
    [getSelectedItems, openingsList]
  );

  const onPinToSlotSuccess = useCallback(() => {
    triggerSelectionReset();
    if (leadId) queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
    queryClient.invalidateQueries({ queryKey: ['offer-document-slots'] });
  }, [triggerSelectionReset, leadId, queryClient]);

  const handleCreateItem = useCallback(
    async (
      type: 'confirmation' | 'payment-voucher' | 'lost' | 'send-to-out' | 'revert-from-out',
      data: { reference_no?: string; notes?: string; files?: File[]; amount?: number }
    ) => {
      const currentPage = getCurrentPage();
      if (!currentPage) return;
      const items = getSelectedItems(currentPage);
      const offerIds = getOfferIds(items);
      if (offerIds.length === 0) return;

      if (type === 'confirmation') {
        const requests = offerIds.map((offerId) => ({
          offer_id: offerId,
          notes: data?.notes || data?.reference_no,
          files: data?.files,
        }));
        await bulkCreateConfirmationsMutation.mutateAsync(requests);
      } else if (type === 'payment-voucher') {
        const promises = offerIds.map((offerId) => {
          const formData = new FormData();
          formData.append('offer_id', offerId);
          const refText = data?.reference_no || data?.notes;
          if (refText) {
            formData.append('reference_no', refText);
            formData.append('notes', refText);
          }
          if (data?.amount) formData.append('amount', String(data.amount));
          if (data?.files?.length) data.files.forEach((f) => formData.append('files', f));
          return createPaymentVoucherMutation.mutateAsync(formData);
        });
        await Promise.all(promises);
        setIsPaymentVoucherDialogOpen(false);
        triggerSelectionReset();
        if (leadId) queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      } else if (type === 'lost') {
        await bulkCreateLostOffersMutation.mutateAsync(offerIds);
      } else if (type === 'send-to-out') {
        await moveOffersOutMutation.mutateAsync(offerIds);
        setIsSendToOutDialogOpen(false);
        triggerSelectionReset();
        if (leadId) queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      } else if (type === 'revert-from-out') {
        await revertOffersFromOutMutation.mutateAsync(offerIds);
        setIsSendToOutDialogOpen(false);
        triggerSelectionReset();
        if (leadId) queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      }
    },
    [
      getCurrentPage,
      getSelectedItems,
      bulkCreateConfirmationsMutation,
      createPaymentVoucherMutation,
      bulkCreateLostOffersMutation,
      moveOffersOutMutation,
      revertOffersFromOutMutation,
      triggerSelectionReset,
      leadId,
      queryClient,
    ]
  );

  const handleCreateOpening = useCallback(async () => {
    const currentPage = getCurrentPage();
    if (!currentPage) return;
    const items = getSelectedItems(currentPage);
    const offerIds = getOfferIds(items);
    if (offerIds.length === 0) return;

    const promises = offerIds.map((offerId) =>
      createOpeningMutation.mutateAsync({ offer_id: offerId })
    );
    await Promise.all(promises);
    setCreateOpeningOpen(false);
    triggerSelectionReset();
    if (leadId) queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
  }, [
    getCurrentPage,
    getSelectedItems,
    createOpeningMutation,
    triggerSelectionReset,
    leadId,
    queryClient,
  ]);

  const currentPage = getCurrentPage();
  const selectedItems = currentPage ? getSelectedItems(currentPage) : [];
  const selectedRows = selectedItems.map((i: any) => i?._id).filter(Boolean);

  // Config aligned with dashboard pages: offers, out-offers, openings
  const isOpenings = currentPage === LEAD_TABLE_NAMES.OPENINGS;
  const isOffers = currentPage === LEAD_TABLE_NAMES.OFFERS;
  const config = {
    showCreateOpening: !isOpenings,
    showCreateConfirmation: true,
    showCreatePaymentVoucher: true,
    showLost: true,
    showRevert: isOpenings,
    showSendToOut: true,
    showBulkUpdate: true,
    showNetto: true,
    showBulkNetto: true,
    showPinToSlot: isOffers || isOpenings,
  };

  const value: LeadDetailsBulkActionsContextValue = {
    config,
    selectedRows,
    selectedItems,
    session: { user: user ? { role: user.role } : undefined },
    createConfirmationDialogOpen,
    setCreateConfirmationDialogOpen,
    isPaymentVoucherDialogOpen,
    setIsPaymentVoucherDialogOpen,
    createOpeningOpen,
    setCreateOpeningOpen,
    isLostDialogOpen,
    setIsLostDialogOpen,
    isSendToOutDialogOpen,
    setIsSendToOutDialogOpen,
    isNettoDialogOpen,
    setIsNettoDialogOpen,
    isBulkNettoDialogOpen,
    setIsBulkNettoDialogOpen,
    isBulkUpdateDialogOpen,
    setIsBulkUpdateDialogOpen,
    isBulkDeleteDialogOpen,
    setIsBulkDeleteDialogOpen,
    bulkDeleteOffersMutation,
    handleCreateOpening,
    handleCreateItem,
    clearAllSelections,
    bulkCreateConfirmationsMutation,
    createPaymentVoucherMutation,
    bulkCreateLostOffersMutation,
    createOpeningMutation,
    moveOffersOutMutation,
    revertOffersFromOutMutation,
    handleRevertOpening,
    isRevertOpeningPending,
    getSelectedItemsForTable,
    selectionResetKey,
    getPinToSlotPayload,
    onPinToSlotSuccess,
  };

  return (
    <LeadDetailsBulkActionsContext.Provider value={value}>
      {children}
    </LeadDetailsBulkActionsContext.Provider>
  );
}

export function useLeadDetailsBulkActions() {
  const ctx = useContext(LeadDetailsBulkActionsContext);
  if (!ctx) throw new Error('useLeadDetailsBulkActions must be used within LeadDetailsBulkActionsProvider');
  return ctx;
}

/** Returns context or null when outside provider - use for optional features like Pin to Slot in RightSidebar */
export function useOptionalLeadDetailsBulkActions() {
  return useContext(LeadDetailsBulkActionsContext);
}
