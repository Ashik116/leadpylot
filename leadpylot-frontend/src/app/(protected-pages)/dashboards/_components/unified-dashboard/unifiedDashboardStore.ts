/**
 * Zustand store for UnifiedDashboard state.
 * Uses createContext pattern for scoped stores - each UnifiedDashboardProvider gets its own store instance.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { createStore, useStore } from 'zustand';
import { TDashboardType } from '../dashboardTypes';
import { VALID_PROGRESS_FILTERS } from './unifiedDashboardConstants';

export interface UnifiedDashboardState {
  selectedProgressFilter: TDashboardType;
  createOpeningOpen: boolean;
  createConfirmationDialogOpen: boolean;
  isPaymentVoucherDialogOpen: boolean;
  isDocsModalOpen: boolean;
  selectedOfferForDocs: any;
  isEditOfferDialogOpen: boolean;
  selectedOfferForEdit: any;
  expandedRowId: string | null;
  forceUpdate: number;
  isBulkUpdateDialogOpen: boolean;
  isNettoDialogOpen: boolean;
  isBulkNettoDialogOpen: boolean;
  isLostDialogOpen: boolean;
  isSendToOutDialogOpen: boolean;
  isPdfModalOpen: boolean;
  selectedRowForPdf: any;
  isOpeningDetailsOpen: boolean;
  selectedOpeningForDetails: any;
  isOfferDetailsOpen: boolean;
  selectedOfferForDetails: any;
  isPdfConfirmationModalOpen: boolean;
  selectedRowForPdfConfirmation: any;
  hasManuallyClearedGroupFilter: boolean;
  isMultiLevelGroupingApplied: boolean;
  hasTransferredOffer: boolean;
  isAssignTicketDialogOpen: boolean;
  selectedTicketForAssign: { ticketId: string; rowData: any } | null;
  isBulkDownloadConfirmOpen: boolean;
  isBulkDownloading: boolean;
  bulkDownloadConfirmData: {
    columnId: string;
    columnLabel: string;
    documentCount: number;
    ids: string[];
  } | null;
}

export interface UnifiedDashboardActions {
  setSelectedProgressFilter: (value: TDashboardType | ((prev: TDashboardType) => TDashboardType)) => void;
  setCreateOpeningOpen: (value: boolean) => void;
  setCreateConfirmationDialogOpen: (value: boolean) => void;
  setIsPaymentVoucherDialogOpen: (value: boolean) => void;
  setIsDocsModalOpen: (value: boolean) => void;
  setSelectedOfferForDocs: (value: any) => void;
  setIsEditOfferDialogOpen: (value: boolean) => void;
  setSelectedOfferForEdit: (value: any) => void;
  setExpandedRowId: (value: string | null | ((prev: string | null) => string | null)) => void;
  setForceUpdate: (fn: (prev: number) => number) => void;
  setIsBulkUpdateDialogOpen: (value: boolean) => void;
  setIsNettoDialogOpen: (value: boolean) => void;
  setIsBulkNettoDialogOpen: (value: boolean) => void;
  setIsLostDialogOpen: (value: boolean) => void;
  setIsSendToOutDialogOpen: (value: boolean) => void;
  setIsPdfModalOpen: (value: boolean) => void;
  setSelectedRowForPdf: (value: any) => void;
  setIsOpeningDetailsOpen: (value: boolean) => void;
  setSelectedOpeningForDetails: (value: any) => void;
  setIsOfferDetailsOpen: (value: boolean) => void;
  setSelectedOfferForDetails: (value: any) => void;
  setIsPdfConfirmationModalOpen: (value: boolean) => void;
  setSelectedRowForPdfConfirmation: (value: any) => void;
  setHasManuallyClearedGroupFilter: (value: boolean | ((prev: boolean) => boolean)) => void;
  setIsMultiLevelGroupingApplied: (value: boolean | ((prev: boolean) => boolean)) => void;
  setHasTransferredOffer: (value: boolean | ((prev: boolean) => boolean)) => void;
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
}

export type UnifiedDashboardStore = UnifiedDashboardState & UnifiedDashboardActions;

const createUnifiedDashboardStore = (initialState: Partial<UnifiedDashboardState>) =>
  createStore<UnifiedDashboardStore>((set) => ({
    selectedProgressFilter: initialState.selectedProgressFilter ?? 'opening',
    createOpeningOpen: false,
    createConfirmationDialogOpen: false,
    isPaymentVoucherDialogOpen: false,
    isDocsModalOpen: false,
    selectedOfferForDocs: null,
    isEditOfferDialogOpen: false,
    selectedOfferForEdit: null,
    expandedRowId: null,
    forceUpdate: 0,
    isBulkUpdateDialogOpen: false,
    isNettoDialogOpen: false,
    isBulkNettoDialogOpen: false,
    isLostDialogOpen: false,
    isSendToOutDialogOpen: false,
    isPdfModalOpen: false,
    selectedRowForPdf: null,
    isOpeningDetailsOpen: false,
    selectedOpeningForDetails: null,
    isOfferDetailsOpen: false,
    selectedOfferForDetails: null,
    isPdfConfirmationModalOpen: false,
    selectedRowForPdfConfirmation: null,
    hasManuallyClearedGroupFilter: false,
    isMultiLevelGroupingApplied: false,
    hasTransferredOffer: false,
    isAssignTicketDialogOpen: false,
    selectedTicketForAssign: null,
    isBulkDownloadConfirmOpen: false,
    isBulkDownloading: false,
    bulkDownloadConfirmData: null,

    setSelectedProgressFilter: (value) =>
      set((s) => ({
        selectedProgressFilter:
          typeof value === 'function' ? value(s.selectedProgressFilter) : value,
      })),
    setCreateOpeningOpen: (value) => set({ createOpeningOpen: value }),
    setCreateConfirmationDialogOpen: (value) => set({ createConfirmationDialogOpen: value }),
    setIsPaymentVoucherDialogOpen: (value) => set({ isPaymentVoucherDialogOpen: value }),
    setIsDocsModalOpen: (value) => set({ isDocsModalOpen: value }),
    setSelectedOfferForDocs: (value) => set({ selectedOfferForDocs: value }),
    setIsEditOfferDialogOpen: (value) => set({ isEditOfferDialogOpen: value }),
    setSelectedOfferForEdit: (value) => set({ selectedOfferForEdit: value }),
    setExpandedRowId: (value) =>
      set((s) => ({
        expandedRowId: typeof value === 'function' ? value(s.expandedRowId) : value,
      })),
    setForceUpdate: (fn) => set((s) => ({ forceUpdate: fn(s.forceUpdate) })),
    setIsBulkUpdateDialogOpen: (value) => set({ isBulkUpdateDialogOpen: value }),
    setIsNettoDialogOpen: (value) => set({ isNettoDialogOpen: value }),
    setIsBulkNettoDialogOpen: (value) => set({ isBulkNettoDialogOpen: value }),
    setIsLostDialogOpen: (value) => set({ isLostDialogOpen: value }),
    setIsSendToOutDialogOpen: (value) => set({ isSendToOutDialogOpen: value }),
    setIsPdfModalOpen: (value) => set({ isPdfModalOpen: value }),
    setSelectedRowForPdf: (value) => set({ selectedRowForPdf: value }),
    setIsOpeningDetailsOpen: (value) => set({ isOpeningDetailsOpen: value }),
    setSelectedOpeningForDetails: (value) => set({ selectedOpeningForDetails: value }),
    setIsOfferDetailsOpen: (value) => set({ isOfferDetailsOpen: value }),
    setSelectedOfferForDetails: (value) => set({ selectedOfferForDetails: value }),
    setIsPdfConfirmationModalOpen: (value) => set({ isPdfConfirmationModalOpen: value }),
    setSelectedRowForPdfConfirmation: (value) => set({ selectedRowForPdfConfirmation: value }),
    setHasManuallyClearedGroupFilter: (value) =>
      set((s) => ({
        hasManuallyClearedGroupFilter:
          typeof value === 'function' ? value(s.hasManuallyClearedGroupFilter) : value,
      })),
    setIsMultiLevelGroupingApplied: (value) =>
      set((s) => ({
        isMultiLevelGroupingApplied:
          typeof value === 'function' ? value(s.isMultiLevelGroupingApplied) : value,
      })),
    setHasTransferredOffer: (value) =>
      set((s) => ({
        hasTransferredOffer: typeof value === 'function' ? value(s.hasTransferredOffer) : value,
      })),
    setIsAssignTicketDialogOpen: (value) => set({ isAssignTicketDialogOpen: value }),
    setSelectedTicketForAssign: (value) => set({ selectedTicketForAssign: value }),
    setIsBulkDownloadConfirmOpen: (value) => set({ isBulkDownloadConfirmOpen: value }),
    setIsBulkDownloading: (value) => set({ isBulkDownloading: value }),
    setBulkDownloadConfirmData: (value) => set({ bulkDownloadConfirmData: value }),
  }));

type StoreApi = ReturnType<typeof createUnifiedDashboardStore>;

const UnifiedDashboardStoreContext = createContext<StoreApi | null>(null);

export interface UnifiedDashboardStoreProviderProps {
  dashboardType: TDashboardType;
  config: { showProgressFilter?: boolean; initialProgressFilter?: TDashboardType };
  children: React.ReactNode;
}

export function UnifiedDashboardStoreProvider({
  dashboardType,
  config,
  children,
}: UnifiedDashboardStoreProviderProps) {
  const [store] = useState(() => {
    let initialFilter: TDashboardType = config.initialProgressFilter ?? dashboardType;
    if (typeof window !== 'undefined' && config.showProgressFilter) {
      const storageKey = `dashboard_filter_${dashboardType}`;
      const stored = localStorage.getItem(storageKey);
      if (stored && VALID_PROGRESS_FILTERS.includes(stored as any)) {
        initialFilter = stored as TDashboardType;
      }
    }
    return createUnifiedDashboardStore({ selectedProgressFilter: initialFilter });
  });

  const selectedProgressFilter = useStore(store, (s) => s.selectedProgressFilter);

  useEffect(() => {
    if (!config.showProgressFilter || typeof window === 'undefined') return;
    localStorage.setItem(`dashboard_filter_${dashboardType}`, selectedProgressFilter);
  }, [selectedProgressFilter, dashboardType, config.showProgressFilter]);

  return React.createElement(UnifiedDashboardStoreContext.Provider, { value: store }, children);
}

export function useUnifiedDashboardStore<T>(selector: (state: UnifiedDashboardStore) => T): T {
  const store = useContext(UnifiedDashboardStoreContext);
  if (!store) throw new Error('useUnifiedDashboardStore must be used within UnifiedDashboardStoreProvider');
  return useStore(store, selector);
}

export function useUnifiedDashboardStoreApi() {
  const store = useContext(UnifiedDashboardStoreContext);
  if (!store) throw new Error('useUnifiedDashboardStoreApi must be used within UnifiedDashboardStoreProvider');
  return store;
}
