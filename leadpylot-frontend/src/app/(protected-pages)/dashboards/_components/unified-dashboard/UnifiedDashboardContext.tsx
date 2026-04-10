'use client';

/**
 * UnifiedDashboardContext - Provides dashboard state and handlers to child components.
 *
 * Consumers: FilterBtn, UnifiedDashboardActionButtons, UnifiedDashboardDialogs, OpeningDetailsPopup.
 * Exposes: config, selection, dialog state, mutations, refetch, URL helpers.
 */
import React, { createContext, useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { TDashboardType } from '../dashboardTypes';
import { VALID_PROGRESS_FILTERS } from './unifiedDashboardConstants';

export type UnifiedDashboardContextValue = {
  config: any;
  dashboardType: TDashboardType;
  selectedProgressFilter: TDashboardType;
  selectedRows: string[];
  selectedItems: any[];
  session?: any;
  handleProgressFilterChange: (filter: TDashboardType) => void;
  createConfirmationDialogOpen: boolean;
  setCreateConfirmationDialogOpen: (value: boolean) => void;
  isPaymentVoucherDialogOpen: boolean;
  setIsPaymentVoucherDialogOpen: (value: boolean) => void;
  createOpeningOpen: boolean;
  setCreateOpeningOpen: (value: boolean) => void;
  handleCreateOpening: () => void;
  createOpeningMutation: { isPending?: boolean };
  handleCreateItem: (
    type: 'confirmation' | 'payment-voucher' | 'lost' | 'send-to-out' | 'revert-from-out',
    data: { reference_no?: string; notes?: string; files?: File[]; amount?: number },
    outOfferId?: string
  ) => Promise<void>;
  bulkCreateConfirmationsMutation: { isPending?: boolean };
  createPaymentVoucherMutation: { isPending?: boolean };
  bulkCreateLostOffersMutation: { isPending?: boolean };
  isLostDialogOpen: boolean;
  setIsLostDialogOpen: (value: boolean) => void;
  isSendToOutDialogOpen: boolean;
  setIsSendToOutDialogOpen: (value: boolean) => void;
  moveOffersOutMutation: { isPending?: boolean };
  revertOffersFromOutMutation: { isPending?: boolean };
  selectedOfferForDocs: any;
  isDocsModalOpen: boolean;
  setIsDocsModalOpen: (value: boolean) => void;
  setSelectedOfferForDocs: (value: any) => void;
  apiData: any;
  handleDocumentAction: (
    item: any,
    documentType: string,
    action: 'preview' | 'download' | 'delete'
  ) => void;
  handleBulkDownload?: (columnId: string) => void;
  handleConfirmBulkDownload?: (ids: string[], columnLabel?: string) => Promise<void>;
  isBulkDownloadConfirmOpen?: boolean;
  setIsBulkDownloadConfirmOpen?: (value: boolean) => void;
  isBulkDownloading?: boolean;
  setBulkDownloadConfirmData?: (value: {
    columnId: string;
    columnLabel: string;
    documentCount: number;
    ids: string[];
  } | null) => void;
  bulkDownloadConfirmData?: {
    columnId: string;
    columnLabel: string;
    documentCount: number;
    ids: string[];
  } | null;
  handleFileUpload: (
    id: string,
    files: File[] | null | undefined,
    table?: string,
    fileType?: string,
    fullItem?: any
  ) => Promise<void>;
  refetch?: () => void;
  sessionRole?: Role;
  isEditOfferDialogOpen: boolean;
  setIsEditOfferDialogOpen: (value: boolean) => void;
  selectedOfferForEdit: any;
  setSelectedOfferForEdit: (value: any) => void;
  documentHandler: any;
  isBulkUpdateDialogOpen: boolean;
  setIsBulkUpdateDialogOpen: (value: boolean) => void;
  invalidateGroupedSummary: () => void;
  clearAllSelections: () => void;
  isNettoDialogOpen: boolean;
  setIsNettoDialogOpen: (value: boolean) => void;
  isBulkNettoDialogOpen: boolean;
  setIsBulkNettoDialogOpen: (value: boolean) => void;
  isPdfConfirmationModalOpen: boolean;
  setIsPdfConfirmationModalOpen: (value: boolean) => void;
  selectedRowForPdfConfirmation: any;
  setSelectedRowForPdfConfirmation: (value: any) => void;
  setSelectedRowForPdf: (value: any) => void;
  isPdfModalOpen: boolean;
  setIsPdfModalOpen: (value: boolean) => void;
  selectedRowForPdf: any;
  handlePdfGenerated: (data: any) => void;
  isGeneratedPdfPreviewOpen: boolean;
  setIsGeneratedPdfPreviewOpen: () => void;
  generatedPdfData: any;
  isNavigating: boolean;
  isOpeningDetailsOpen: boolean;
  setIsOpeningDetailsOpen: (value: boolean) => void;
  selectedOpeningForDetails: any;
  setSelectedOpeningForDetails: (value: any) => void;
  isOfferDetailsOpen: boolean;
  setIsOfferDetailsOpen: (value: boolean) => void;
  selectedOfferForDetails: any;
  setSelectedOfferForDetails: (value: any) => void;
  handleRevertOffers: () => void;
  isReverting: boolean;
  handleSelfAssignTickets: () => void;
  handleAssignTicketsToOther: () => void;
  isAssignTicketDialogOpen: boolean;
  setIsAssignTicketDialogOpen: (value: boolean) => void;
  selectedTicketForAssign: { ticketId: string; rowData: any } | null;
  setSelectedTicketForAssign: (value: { ticketId: string; rowData: any } | null) => void;
  handleAssignTicketSuccess: () => void;
  pathname: string;
  clearDetailsParams: () => void;
};

const UnifiedDashboardContext = createContext<UnifiedDashboardContextValue | null>(null);

export const UnifiedDashboardProvider = ({
  value,
  children,
}: {
  value: UnifiedDashboardContextValue;
  children: React.ReactNode;
}) => <UnifiedDashboardContext.Provider value={value}>{children}</UnifiedDashboardContext.Provider>;

export const useUnifiedDashboardContext = () => {
  const context = useContext(UnifiedDashboardContext);
  return context;
};

type UnifiedDashboardStateArgs = {
  dashboardType: TDashboardType;
  config: {
    showProgressFilter?: boolean;
    initialProgressFilter?: TDashboardType;
  };
};

export const useUnifiedDashboardState = ({ dashboardType, config }: UnifiedDashboardStateArgs) => {
  const [selectedProgressFilter, setSelectedProgressFilter] = React.useState<TDashboardType>(() => {
    if (!config.showProgressFilter && config.initialProgressFilter) {
      return config.initialProgressFilter;
    }

    if (typeof window === 'undefined') {
      return config.initialProgressFilter || dashboardType;
    }

    const storageKey = `dashboard_filter_${dashboardType}`;
    const storedFilter = localStorage.getItem(storageKey);
    if (storedFilter && VALID_PROGRESS_FILTERS.includes(storedFilter as any)) {
      return storedFilter as TDashboardType;
    }

    return config.initialProgressFilter || dashboardType;
  });

  const [createOpeningOpen, setCreateOpeningOpen] = React.useState(false);
  const [createConfirmationDialogOpen, setCreateConfirmationDialogOpen] = React.useState(false);
  const [isPaymentVoucherDialogOpen, setIsPaymentVoucherDialogOpen] = React.useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = React.useState(false);
  const [selectedOfferForDocs, setSelectedOfferForDocs] = React.useState<any>(null);
  const [isEditOfferDialogOpen, setIsEditOfferDialogOpen] = React.useState(false);
  const [selectedOfferForEdit, setSelectedOfferForEdit] = React.useState<any>(null);
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = React.useState(0);
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = React.useState(false);
  const [isNettoDialogOpen, setIsNettoDialogOpen] = React.useState(false);
  const [isBulkNettoDialogOpen, setIsBulkNettoDialogOpen] = React.useState(false);
  const [isLostDialogOpen, setIsLostDialogOpen] = React.useState(false);
  const [isSendToOutDialogOpen, setIsSendToOutDialogOpen] = React.useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = React.useState(false);
  const [selectedRowForPdf, setSelectedRowForPdf] = React.useState<any>(null);
  const [isOpeningDetailsOpen, setIsOpeningDetailsOpen] = React.useState(false);
  const [selectedOpeningForDetails, setSelectedOpeningForDetails] = React.useState<any>(null);
  const [isOfferDetailsOpen, setIsOfferDetailsOpen] = React.useState(false);
  const [selectedOfferForDetails, setSelectedOfferForDetails] = React.useState<any>(null);
  const [isPdfConfirmationModalOpen, setIsPdfConfirmationModalOpen] = React.useState(false);
  const [selectedRowForPdfConfirmation, setSelectedRowForPdfConfirmation] =
    React.useState<any>(null);
  const [hasManuallyClearedGroupFilter, setHasManuallyClearedGroupFilter] = React.useState(false);
  const [isMultiLevelGroupingApplied, setIsMultiLevelGroupingApplied] = React.useState(false);
  const [hasTransferredOffer, setHasTransferredOffer] = React.useState(false);
  const [isAssignTicketDialogOpen, setIsAssignTicketDialogOpen] = React.useState(false);
  const [selectedTicketForAssign, setSelectedTicketForAssign] = React.useState<{
    ticketId: string;
    rowData: any;
  } | null>(null);

  React.useEffect(() => {
    if (!config.showProgressFilter) return;
    const storageKey = `dashboard_filter_${dashboardType}`;
    localStorage.setItem(storageKey, selectedProgressFilter);
  }, [selectedProgressFilter, dashboardType, config.showProgressFilter]);

  React.useEffect(() => {
    if (!config.showProgressFilter) return;
    const storageKey = `dashboard_filter_${dashboardType}`;
    const storedFilter = localStorage.getItem(storageKey);
    if (
      storedFilter &&
      VALID_PROGRESS_FILTERS.includes(storedFilter as any) &&
      storedFilter !== selectedProgressFilter
    ) {
      setSelectedProgressFilter(storedFilter as TDashboardType);
    }
  }, [config.showProgressFilter, dashboardType, selectedProgressFilter]);

  return {
    selectedProgressFilter,
    setSelectedProgressFilter,
    createOpeningOpen,
    setCreateOpeningOpen,
    createConfirmationDialogOpen,
    setCreateConfirmationDialogOpen,
    isPaymentVoucherDialogOpen,
    setIsPaymentVoucherDialogOpen,
    isDocsModalOpen,
    setIsDocsModalOpen,
    selectedOfferForDocs,
    setSelectedOfferForDocs,
    isEditOfferDialogOpen,
    setIsEditOfferDialogOpen,
    selectedOfferForEdit,
    setSelectedOfferForEdit,
    expandedRowId,
    setExpandedRowId,
    forceUpdate,
    setForceUpdate,
    isBulkUpdateDialogOpen,
    setIsBulkUpdateDialogOpen,
    isNettoDialogOpen,
    setIsNettoDialogOpen,
    isBulkNettoDialogOpen,
    setIsBulkNettoDialogOpen,
    isLostDialogOpen,
    setIsLostDialogOpen,
    isSendToOutDialogOpen,
    setIsSendToOutDialogOpen,
    isPdfModalOpen,
    setIsPdfModalOpen,
    selectedRowForPdf,
    setSelectedRowForPdf,
    isOpeningDetailsOpen,
    setIsOpeningDetailsOpen,
    selectedOpeningForDetails,
    setSelectedOpeningForDetails,
    isOfferDetailsOpen,
    setIsOfferDetailsOpen,
    selectedOfferForDetails,
    setSelectedOfferForDetails,
    isPdfConfirmationModalOpen,
    setIsPdfConfirmationModalOpen,
    selectedRowForPdfConfirmation,
    setSelectedRowForPdfConfirmation,
    hasManuallyClearedGroupFilter,
    setHasManuallyClearedGroupFilter,
    isMultiLevelGroupingApplied,
    setIsMultiLevelGroupingApplied,
    hasTransferredOffer,
    setHasTransferredOffer,
    isAssignTicketDialogOpen,
    setIsAssignTicketDialogOpen,
    selectedTicketForAssign,
    setSelectedTicketForAssign,
    isNavigating: false,
  };
};

export type UnifiedImportDashboardType = 'recent-imports' | 'offers-import-history';

export type UnifiedImportDashboardConfig = {
  pageSize: number;
  tableName: string;
  searchPlaceholder: string;
  title: string;
  description: string;
  onRevertClick?: (objectId: string, fileName: string) => void;
};

export type UnifiedImportDashboardContextValue = {
  dashboardType: UnifiedImportDashboardType;
  config: UnifiedImportDashboardConfig;
  dataHookParams?: Record<string, any>;
  customActions?: React.ReactNode;
  headerTabs: boolean;
  showPagination: boolean;
  isOffersTab: boolean;
  pageIndex: number;
  pageSize: number;
  search: string | null;
  sort: string | null;
  orderBy: string | null;
  hookParams: Record<string, any>;
  handleTabChange: (isOffers: boolean) => void;
};

const UnifiedImportDashboardContext = createContext<UnifiedImportDashboardContextValue | null>(
  null
);

type UnifiedImportDashboardProviderProps = {
  dashboardType: UnifiedImportDashboardType;
  config: UnifiedImportDashboardConfig;
  dataHookParams?: Record<string, any>;
  customActions?: React.ReactNode;
  headerTabs?: boolean;
  showPagination?: boolean;
  children: React.ReactNode;
};

export const UnifiedImportDashboardProvider = ({
  dashboardType,
  config,
  dataHookParams = {},
  customActions,
  headerTabs = false,
  showPagination = true,
  children,
}: UnifiedImportDashboardProviderProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isOffersTab = searchParams.get('offer') === 'true';

  const pageIndex = Math.max(1, parseInt(searchParams.get('pageIndex') || '1', 10) || 1);
  const pageSize = Math.max(
    1,
    parseInt(searchParams.get('pageSize') || String(config?.pageSize), 10) || config?.pageSize
  );
  const search = searchParams.get('search');
  const sort = searchParams.get('sort');
  const orderBy = searchParams.get('orderBy');

  const hookParams = React.useMemo(
    () => ({
      page: pageIndex,
      limit: pageSize,
      search: search || undefined,
      sort: sort || undefined,
      orderBy: orderBy || undefined,
      ...dataHookParams,
    }),
    [pageIndex, pageSize, search, sort, orderBy, dataHookParams]
  );

  const handleTabChange = React.useCallback(
    (isOffers: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (isOffers) {
        params.set('offer', 'true');
      } else {
        params.delete('offer');
      }
      router.push(`/admin/recent-imports?${params.toString()}`);
    },
    [router, searchParams]
  );

  const value = React.useMemo(
    () => ({
      dashboardType,
      config,
      dataHookParams,
      customActions,
      headerTabs,
      showPagination,
      isOffersTab,
      pageIndex,
      pageSize,
      search,
      sort,
      orderBy,
      hookParams,
      handleTabChange,
    }),
    [
      dashboardType,
      config,
      dataHookParams,
      customActions,
      headerTabs,
      showPagination,
      isOffersTab,
      pageIndex,
      pageSize,
      search,
      sort,
      orderBy,
      hookParams,
      handleTabChange,
    ]
  );

  return (
    <UnifiedImportDashboardContext.Provider value={value}>
      {children}
    </UnifiedImportDashboardContext.Provider>
  );
};

export const useUnifiedImportDashboardContext = () => {
  const context = useContext(UnifiedImportDashboardContext);
  if (!context) {
    throw new Error(
      'useUnifiedImportDashboardContext must be used within UnifiedImportDashboardProvider'
    );
  }
  return context;
};
