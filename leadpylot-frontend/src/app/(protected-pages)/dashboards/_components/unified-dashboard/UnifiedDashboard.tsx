'use client';

/**
 * UnifiedDashboard - Single dashboard component for Offers, Openings, Confirmations, Payments, Netto, Lost, Offer Tickets.
 *
 * Architecture:
 * - UnifiedDashboardProvider (context) wraps BaseTable + UnifiedDashboardDialogs
 * - useUnifiedDashboardState: dialog state, progress filter, selection
 * - useDashboardFilters: builds hookParams, domainFilters for API
 * - useDashboardActions: mutations, handlers (create, edit, docs, PDF, details)
 * - useDashboardNavigation: row click → open details, URL sync
 * - useDashboardDragDrop: drag-drop → confirmation/payment/netto/lost dialogs
 * - useFilterChainLeads + useGroupBySync: grouping, filters
 *
 * Modes:
 * - Single-table: full search, pagination, grouping (offers, confirmation, payment, etc.)
 * - Multi-table: tableProgressFilter set, preFetchedData, no per-table API (openings page)
 */
import { ColumnDef } from '@/components/shared/DataTable';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useFilterChainLeads } from '@/hooks/useFilterChainLeads';
import { useGroupedSummary, useMetadataOptions } from '@/services/hooks/useLeads';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import type { DomainFilter } from '@/stores/universalGroupingFilterStore';
import { FILTER_OPERATOR_TO_API } from '@/utils/filterUtils';
import type { ColumnFilterValue, ColumnToFieldMap } from '@/components/shared/DataTable/components/ColumnHeaderFilter';
import type { ColumnHeaderFilterRenderers } from '@/components/shared/DataTable/types';
import { useBackNavigationStore } from '@/stores/backNavigationStore';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { useApiUrlStore } from '@/stores/apiUrlStore';
import { useSession } from '@/hooks/useSession';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import { usePathname } from 'next/navigation';
import React, { useCallback, useMemo } from 'react';
import { usePageInfoStore } from '@/stores/pageInfoStore';
import useDoubleTapDataUpdateChanges from '@/hooks/useDoubleTapDataUpdateChanges';
import { useGeneratedPdfStore } from '@/stores/generatedPdfStore';
import { useSharedColumnConfig } from '../SharedColumnConfig';
import UnifiedDashboardDialogs from './UnifiedDashboardDialogs';
import { DashboardType, TDashboardType, getTableNameForDashboardType } from '../dashboardTypes';
import { UnifiedDashboardProvider } from './UnifiedDashboardContext';
import { UnifiedDashboardStoreProvider } from './unifiedDashboardStore';
import { useUnifiedDashboardStateFromStore } from './useUnifiedDashboardStateFromStore';
import {
  GROUPED_OFFERS_PAGE,
  GROUPED_OFFERS_PAGE_SIZE,
  GROUPED_SORT_BY,
  GROUPED_SORT_ORDER,
} from './unifiedDashboardConstants';
import { useDashboardFilters } from '../useDashboardFilters';
import { useDashboardNavigation } from '../useDashboardNavigation';
import { useDashboardActions } from '../useDashboardActions';
import { useGroupBySync } from '../useGroupBySync';
import { getActiveSubgroupPagination } from '@/utils/groupUtils';
import { useFilterProviderValue } from '@/hooks/useFilterProviderValue';
import { useDetailsUrlSync } from './useDetailsUrlSync';
import { useUnifiedDashboardHandlers } from './useUnifiedDashboardHandlers';
import { useUnifiedDashboardSelection } from './useUnifiedDashboardSelection';
import { buildDashboardApiUrl } from './buildDashboardApiUrl';
import {
  getDynamicTitle as getDynamicTitleUtil,
  getDynamicSubtitle as getDynamicSubtitleUtil,
} from './unifiedDashboardUtils';
import { UnifiedDashboardTable } from './UnifiedDashboardTable';
import { useUnifiedDashboardUrlParams } from './useUnifiedDashboardUrlParams';
import { useUnifiedDashboardEffects } from './useUnifiedDashboardEffects';
import { useUnifiedDashboardTableConfig } from './useUnifiedDashboardTableConfig';
import { useUnifiedDashboardRowClassName } from './useUnifiedDashboardRowClassName';
import { useUnifiedDashboardPageInfo } from './useUnifiedDashboardPageInfo';
import { FilterProvider } from '@/contexts/FilterContext';

// import { apiGetOffers } from '@/services/LeadsService';

/**
 * Maps table column IDs to their corresponding Offer metadata API field names.
 * Only entries where the column ID differs from the API field name are needed.
 */
const OFFER_COLUMN_TO_FIELD_MAP: ColumnToFieldMap = {
  'agent ': 'agent_id',
  agent: 'agent_id',
  projectName: 'project_id',
  offer_status: 'current_stage',
  source_id: 'lead_id.source_id',
  leadName: 'lead_id',
  offer_calls: 'current_stage',
  bankName: 'bank_id',
  bonusAmount: 'bonus_amount',
  load_and_opening: 'load_and_opening',
  partnerId: 'lead_id.lead_source_no',
  interestMonth: 'payment_terms',
  leadEmail: 'lead_id.email_from',
  phone: 'lead_id.phone',
  payment_terms: 'payment_terms',
  nickName: 'bank_id.nickName',
  
};



const OFFER_COLUMN_HEADER_FILTER_RENDERERS: ColumnHeaderFilterRenderers = {
  agent_id: 'metadata_checkbox',
  project_id: 'metadata_checkbox',
  'lead_id.status_id': 'metadata_checkbox',
  status: 'metadata_checkbox',
  current_stage: 'metadata_checkbox',
  payment_terms: 'metadata_checkbox',
  bank_id: 'metadata_checkbox',
  'bank_id.nickName': 'metadata_checkbox',
  bonus_amount: 'metadata_checkbox',
  nametitle:'metadata_checkbox',
  'lead_id.source_id':'metadata_checkbox'
};

// (Types/constants moved to dashboardTypes.ts)

/**
 * Props for UnifiedDashboard. Passed by page-specific configs (e.g. offersHookConfig, openingsHookConfig).
 */
interface UnifiedDashboardProps {
  /** Dashboard type: offer, opening, confirmation, payment, netto, lost, offer_tickets */
  dashboardType: TDashboardType;
  /** Hook for fetching data (e.g. useOffersProgress). Receives hookParams from useDashboardFilters. */
  useDataHook: any;
  /** API function for select-all (e.g. apiGetOffersProgress). */
  apiFn: any;
  /** Base params passed to useDataHook. Merged with filters, pagination, domain. */
  dataHookParams?: any;
  /** Pre-fetched data for multi-table mode (openings page). Avoids per-table API calls. */
  preFetchedData?: {
    data: any[];
    meta: {
      total: number;
      page: number;
      limit: number;
    };
  };
  preFetchedIsLoading?: boolean;
  preFetchedRefetch?: () => void;
  /** Transforms raw API data for table display. Attaches _apiUrl when not grouped. */
  transformData: (data: any[]) => any[];
  /** Renders expanded row content when a row is expanded. */
  ExpandedRowComponent: React.ComponentType<{ expandedRowId: string; row: any }>;
  /** Page config: pageSize, tableName, bulk actions, feature flags (showCreateOpening, etc.). */
  config: {
    pageSize: number;
    tableName: string;
    searchPlaceholder: string;
    title: string;
    description: string;
    invalidateQueries: string[];
    bulkActionsConfig: {
      entityName: string;
      deleteUrl: string;
      invalidateQueries: string[];
    };
    // Action buttons configuration
    showCreateOpening?: boolean;
    showCreateConfirmation?: boolean;
    showCreatePaymentVoucher?: boolean;
    showProgressFilter?: boolean;
    initialProgressFilter?: TDashboardType; // NEW: Initial filter value
    // File upload configuration
    fileUploadTableName: string;
    // Row click configuration
    enableRowClick?: boolean;
    getRowClickPath?: (row: any) => string;
    defaultColumn?: string[];
    // Table height configuration
    tableClassName?: string;
    fixedHeight?: string | number;
    // Section title to show in action bar when expanded
    sectionTitle?: string;
    // Disable drag-drop dialogs (for multi-table mode where dialogs are handled at parent level)
    disableDragDropDialogs?: boolean;
  };
}

const UnifiedDashboard = (
  props: UnifiedDashboardProps & { tableProgressFilter?: TDashboardType }
) => {
  const { dashboardType, config } = props;
  return (
    <UnifiedDashboardStoreProvider dashboardType={dashboardType} config={config}>
      <UnifiedDashboardContent {...props} />
    </UnifiedDashboardStoreProvider>
  );
};

const UnifiedDashboardContent = ({
  dashboardType,
  useDataHook,
  apiFn,
  dataHookParams = {},
  preFetchedData,
  preFetchedIsLoading,
  transformData,
  ExpandedRowComponent,
  config,
  tableProgressFilter,
}: UnifiedDashboardProps & { tableProgressFilter?: TDashboardType }) => {
  // ─── State & context ─────────────────────────────────────────────────────
  const { data: session } = useSession();
  const {
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
    isBulkDownloadConfirmOpen,
    setIsBulkDownloadConfirmOpen,
    isBulkDownloading,
    setIsBulkDownloading,
    bulkDownloadConfirmData,
    setBulkDownloadConfirmData,
    isNavigating,
  } = useUnifiedDashboardStateFromStore();

  // ─── Routing & stores ───────────────────────────────────────────────────
  const pathname = usePathname();
  const { setBackUrl } = useBackNavigationStore();
  const { setPageInfo } = usePageInfoStore();

  const groupedSortBy = GROUPED_SORT_BY;
  const groupedSortOrder = GROUPED_SORT_ORDER;
  const groupedOffersPage = GROUPED_OFFERS_PAGE;
  const groupedOffersPageSize = GROUPED_OFFERS_PAGE_SIZE;

  // Generated PDF preview modal state
  const {
    isOpen: isGeneratedPdfPreviewOpen,
    pdfData: generatedPdfData,
    closeModal: setIsGeneratedPdfPreviewOpen,
    openModal: openGeneratedPdfPreviewModal,
  } = useGeneratedPdfStore();
  // const [isNettoLoading, setIsNettoLoading] = useState(false);

  // Get selected items from global store
  const { getSelectedIds, clearSelectedItems, getSelectedItems, addSelectedItem } =
    useSelectedItemsStore();

  // ─── Handlers (drag-drop, dialogs, selection) ───────────────────────────
  const { clearAllSelections } = useUnifiedDashboardHandlers({
    dashboardType,
    selectedProgressFilter,
    tableProgressFilter,
    sessionRole: session?.user?.role,
    clearSelectedItems,
    addSelectedItem,
    setForceUpdate,
    setCreateConfirmationDialogOpen,
    setIsPaymentVoucherDialogOpen,
    setIsNettoDialogOpen,
    setIsLostDialogOpen,
  });
  const selectedRows = getSelectedIds(
    getTableNameForDashboardType(dashboardType, selectedProgressFilter) as any
  );
  const selectedItems = getSelectedItems(
    getTableNameForDashboardType(dashboardType, selectedProgressFilter) as any
  );

  // Filter chain hook integratio
  // ─── Filters & grouping ──────────────────────────────────────────────────
  const filterChain = useFilterChainLeads({
    onClearSelections: () => clearSelectedItems(),
    // NEW: Pass the dashboard type as currentTab to enable proper page detection and Agent default filters
    currentTab: config.showProgressFilter ? selectedProgressFilter : dashboardType,
    // NEW: Track if user has manually cleared group filter
    hasManuallyClearedGroupFilter,
  });
  const {
    selectedGroupBy,
    buildApiFilters,
    buildGroupedLeadsFilters,
    handleGroupByArrayChange,
    handleClearGroupByFilter: chainHandleClearGroupByFilter,
    hasSelectedGroupBy,
    hasUserAddedGroupBy,
    isOffersPage,
    isOpeningsPage,
    isConfirmationsPage,
    isPaymentsPage,
  } = filterChain;
  const {
    storeGroupBy,
    handleClearGroupByFilter,
    handleGroupByArrayChangeWithReset,
    handleMultiLevelGrouping,
  } = useGroupBySync({
    selectedGroupBy,
    handleGroupByArrayChange,
    chainHandleClearGroupByFilter,
    clearSelectedItems,
    setHasManuallyClearedGroupFilter,
    setIsMultiLevelGroupingApplied,
  });

  const isMultiTableMode = !!tableProgressFilter;

  const { searchParamsKey, pageIndex, pageSize, search, status, sortBy, sortOrder } =
    useUnifiedDashboardUrlParams(config?.pageSize ?? 10);

  const { bonusAmountOptions, paymentTermOptions, allStatus } = useDoubleTapDataUpdateChanges({
    bonusAmountsApi: true,
    paymentTermsApi: true,
    stagesApi: true,
  });

  // Get entity type and filters from universal grouping filter store (must be before domainFilters)
  const {
    userDomainFilters,
    lockedDomainFilters, // Immutable filters for agents
    entityType: storeEntityType,
    pagination: storePagination,
    subgroupPagination: storeSubgroupPagination,
    sorting: storeSorting,
    setEntityType: setStoreEntityType,
    setUserDomainFilters,
    setGroupBy: setStoreGroupBy,
  } = useUniversalGroupingFilterStore();

  // Get selected project for Agent role
  const { selectedProject } = useSelectedProjectStore();
  const projectId = selectedProject?._id;
  const effectiveProjectId = projectId === 'all' ? undefined : projectId;

  const {
    domainFilters,
    hookParams,
    hookParamsWithEnabled,
    shouldSkipFlatViewApi,
    hasProgressForGrouping,
    finalDomainFilters,
    cleanedDefaultFiltersForGrouping,
  } = useDashboardFilters({
    dashboardType,
    dataHookParams,
    selectedProgressFilter,
    hasTransferredOffer,
    sessionRole: session?.user?.role,
    buildGroupedLeadsFilters,
    buildApiFilters,
    lockedDomainFilters,
    userDomainFilters,
    storeSorting,
    storeSubgroupPagination,
    pageIndex,
    pageSize,
    search,
    status,
    sortBy,
    sortOrder,
    pathname,
    isMultiTableMode,
    selectedGroupBy,
    effectiveProjectId,
    tableProgressFilter,
  });

  // Clear selections when domain filters change (filtered dataset changes)
  React.useEffect(() => {
    clearSelectedItems();
  }, [clearSelectedItems, domainFilters]);

  // Fetch data using the provided hook
  // Note: _filterHash is included in hookParams for React Query queryKey (to trigger refetch when filters change)
  // but it's filtered out in apiGetOffersProgress before sending to API
  // ─── Data fetching ──────────────────────────────────────────────────────
  const { data: apiData, isLoading, isFetching, refetch } = useDataHook(hookParamsWithEnabled);

  // Determine entity type based on dashboard type
  // Note: For UnifiedDashboard pages (offers, openings, confirmations, payments), we always set "Offer" in store
  // This ensures all UnifiedDashboard pages call /api/metadata/options/Offer
  const entityType = React.useMemo(() => {
    if (storeEntityType) return storeEntityType;
    // Map dashboard types to entity types (for internal use, but store will be set to "Offer" for UnifiedDashboard pages)
    switch (dashboardType) {
      case DashboardType.OFFER:
        return 'Offer';
      case DashboardType.OPENING:
        return 'Opening';
      case DashboardType.CONFIRMATION:
        return 'Confirmation';
      case DashboardType.PAYMENT:
        return 'Payment';
      default:
        return 'Offer';
    }
  }, [storeEntityType, dashboardType]);

  // Set entity type in store when it changes - always use "Offer" for UnifiedDashboard pages
  // This ensures all components using the store will call /api/metadata/options/Offer
  React.useEffect(() => {
    // For UnifiedDashboard pages (offers, openings, confirmations, payments), always set "Offer" in store
    // This ensures consistent metadata API calls: /api/metadata/options/Offer
    const isUnifiedDashboardPage = [
      DashboardType.OFFER,
      DashboardType.OPENING,
      DashboardType.CONFIRMATION,
      DashboardType.PAYMENT,
    ].includes(dashboardType);

    if (isUnifiedDashboardPage) {
      // Always set "Offer" in store for UnifiedDashboard pages
      if (storeEntityType !== 'Offer') {
        setStoreEntityType('Offer' as any);
      }
    } else if (entityType && entityType !== storeEntityType) {
      // For non-UnifiedDashboard pages, use the determined entityType
      if (['Offer', 'User', 'Team', 'Opening'].includes(entityType)) {
        setStoreEntityType(entityType as any);
      }
    }
  }, [entityType, storeEntityType, setStoreEntityType, dashboardType]);

  // Set table progress filter in store when it changes (for multi-table mode on openings page)
  const setTableProgressFilter = useUniversalGroupingFilterStore(
    (state) => state.setTableProgressFilter
  );
  React.useEffect(() => {
    if (tableProgressFilter) {
      setTableProgressFilter(tableProgressFilter);
    } else {
      setTableProgressFilter(undefined);
    }
  }, [tableProgressFilter, setTableProgressFilter]);

  // Disable grouping in multi-table mode (openings page)
  // Use ref to track previous non-empty value to prevent flickering during sync
  const previousGroupByRef = React.useRef<string[]>([]);
  const effectiveGroupBy = React.useMemo(() => {
    // Disable grouping in multi-table mode
    if (isMultiTableMode) {
      previousGroupByRef.current = [];
      return [];
    }
    // Default grouping for Agent role is handled by useFilterChainLeads hook via filter.config.ts
    // Update ref with current value if it's not empty
    if (selectedGroupBy.length > 0) {
      previousGroupByRef.current = selectedGroupBy;
      return selectedGroupBy;
    }
    // If selectedGroupBy is empty, check if store has values (might be during sync)
    // Only return previous value if store also has values (indicating sync in progress)
    if (previousGroupByRef.current.length > 0 && storeGroupBy.length > 0) {
      // Store has values but selectedGroupBy is empty - likely sync in progress
      // Return previous value to prevent flickering
      return previousGroupByRef.current;
    }
    // Clear previous ref when explicitly cleared (both store and selectedGroupBy are empty)
    previousGroupByRef.current = [];
    return [];
  }, [selectedGroupBy, isMultiTableMode, storeGroupBy]);

  // Use useGroupedSummary for new grouping system (works with all entity types)
  // Only use valid EntityType values
  const validEntityType = ['Offer', 'User', 'Team', 'Opening'].includes(entityType)
    ? entityType
    : 'Offer'; // Default to Offer since UnifiedDashboard is for offers/openings/confirmations/payments

  const { data: groupedSummaryData, isLoading: groupedDataLoading } = useGroupedSummary({
    entityType: validEntityType,
    domain: finalDomainFilters,
    groupBy: effectiveGroupBy,
    page: storePagination?.page || groupedOffersPage,
    limit: storePagination?.limit || groupedOffersPageSize,
    ...getActiveSubgroupPagination(storeSubgroupPagination),
    sortBy: storeSorting?.sortBy || groupedSortBy,
    sortOrder: (storeSorting?.sortOrder as 'asc' | 'desc') || groupedSortOrder,
    enabled: effectiveGroupBy.length > 0 && !isMultiTableMode,
    defaultFilters: cleanedDefaultFiltersForGrouping, // Use cleaned filters without project_id
    hasProgress: hasProgressForGrouping, // Pass has_progress value for progress pages
    ...(dashboardType === DashboardType.OFFER && { includeAll: false }),
  });
  const {
    createOpeningMutation,
    createPaymentVoucherMutation,
    bulkCreateConfirmationsMutation,
    bulkCreateLostOffersMutation,
    moveOffersOutMutation,
    revertOffersFromOutMutation,
    documentHandler,
    isUploading,
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
  } = useDashboardActions({
    dashboardType,
    selectedProgressFilter,
    selectedRows,
    selectedItems,
    selectedOpeningForDetails,
    selectedOfferForDocs,
    preFetchedData,
    apiData,
    config,
    isOfferDetailsOpen,
    selectedOfferForDetails,
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
  });

  // ─── API URL, transformed data, URL sync ────────────────────────────────
  const buildApiUrl = useCallback(
    () =>
      buildDashboardApiUrl({
        dashboardType,
        pageIndex,
        pageSize,
        search,
        status,
        sortBy,
        sortOrder,
        hasTransferredOffer,
        selectedProgressFilter,
        domainFilters,
        dataHookParams,
      }),
    [
      dashboardType,
      pageIndex,
      pageSize,
      search,
      status,
      sortBy,
      sortOrder,
      hasTransferredOffer,
      selectedProgressFilter,
      domainFilters,
      dataHookParams,
    ]
  );

  // Transform data for the table
  // Use preFetchedData when available (multi-table mode), otherwise use apiData
  const transformedData = useMemo(() => {
    const dataSource = preFetchedData?.data || apiData?.data;
    if (!dataSource) return [];
    const transformed = transformData(dataSource);

    // ✅ Attach _apiUrl to each item when NOT in grouped mode (flat view)
    // This ensures CellInlineEdit can use the correct API URL for navigation
    // ✅ Priority: Preserve existing _apiUrl from item > storedApiUrl > buildApiUrl()
    if (effectiveGroupBy.length === 0 && transformed && Array.isArray(transformed)) {
      const { apiUrl: storedApiUrl } = useApiUrlStore.getState();
      const fallbackApiUrl = storedApiUrl || buildApiUrl();

      if (fallbackApiUrl) {
        return transformed.map((item: any) => ({
          ...item,
          // ✅ Preserve existing _apiUrl if item already has it (from custom filters, etc.)
          // Otherwise use storedApiUrl or buildApiUrl()
          _apiUrl: item._apiUrl || fallbackApiUrl,
        }));
      }
    }

    return transformed;
  }, [preFetchedData?.data, apiData?.data, transformData, effectiveGroupBy.length, buildApiUrl]);

  const { clearDetailsParams, handleOpenOpeningDetailsWithUrl, handleOpenOfferDetailsWithUrl } =
    useDetailsUrlSync({
      pathname,
      searchParamsKey,
      dashboardType,
      transformedData,
      isOfferDetailsOpen,
      isOpeningDetailsOpen,
      selectedOfferForDetails,
      selectedOpeningForDetails,
      setIsOfferDetailsOpen,
      setIsOpeningDetailsOpen,
      setSelectedOfferForDetails,
      setSelectedOpeningForDetails,
    });

  // ─── Navigation & row click ─────────────────────────────────────────────
  const { handleRowClick } = useDashboardNavigation({
    config,
    dashboardType,
    entityType,
    selectedProgressFilter,
    domainFilters,
    dataHookParams,
    pageIndex,
    pageSize,
    search,
    sortBy,
    sortOrder,
    transformedData,
    preFetchedData,
    apiData,
    shouldSkipFlatViewApi,
    selectedGroupByLength: selectedGroupBy.length,
    handleOpenOpeningDetails: handleOpenOpeningDetailsWithUrl,
    handleOpenOfferDetails: handleOpenOfferDetailsWithUrl,
  });

  useUnifiedDashboardEffects({
    pathname,
    searchParamsKey,
    dashboardType,
    isMultiTableMode,
    shouldSkipFlatViewApi,
    selectedGroupByLength: selectedGroupBy.length,
    apiData,
    domainFilters,
    buildApiUrl,
    setBackUrl,
    setHasManuallyClearedGroupFilter,
    setIsMultiLevelGroupingApplied,
    sessionRole: session?.user?.role,
    isOffersPage,
    isOpeningsPage,
    isConfirmationsPage,
    isPaymentsPage,
    selectedGroupBy,
    isMultiLevelGroupingApplied,
  });

  // Handle expander toggle
  const handleExpanderToggle = useCallback((id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  }, []);

  // Define columns for DataTable using the optimized hook
  // ─── Table config (columns, base table, selection) ───────────────────────
  const columns: ColumnDef<any>[] = useSharedColumnConfig({
    expandedRowId: expandedRowId || '',
    handleExpanderToggle,
    onOpenDocsModal,
    onEditOffer,
    dashboardType: selectedProgressFilter,
    selectedProgressFilter,
    userRole: session?.user?.role,
    isFileUploading: isUploading,
    handleFileUpload,
    handleDocumentAction,
    handleBulkDownload,
    selectedItems,
    onOpenPdfModal,
    bonusAmountOptions,
    paymentTermOptions,
    negativeAndPrivatOptions: allStatus,
    // Props for offer_tickets Todo column
    updateTodo: handleUpdateTodo,
    sessionUserName: session?.user?.name || (session?.user as any)?.login || '',
    onOpenOpeningDetails:
      dashboardType === DashboardType.OFFER
        ? handleOpenOfferDetailsWithUrl
        : handleOpenOpeningDetailsWithUrl,
  });

  // Handler for transferred offer filter toggle
  const handleTransferredOfferToggle = useCallback(() => {
    // Clear selections when filter changes
    clearAllSelections();
    // Toggle the filter
    setHasTransferredOffer((prev) => !prev);
  }, [clearAllSelections, setHasTransferredOffer]);

  // Handle progress filter change (only for openings)
  const handleProgressFilterChange = useCallback(
    (filter: TDashboardType) => {
      setSelectedProgressFilter(filter);
      clearAllSelections();
    },
    [setSelectedProgressFilter, clearAllSelections]
  );

  const getDynamicTitle = useCallback(
    () => getDynamicTitleUtil(dashboardType, selectedProgressFilter, config),
    [dashboardType, selectedProgressFilter, config]
  );

  const getDynamicSubtitle = useCallback(
    (total: number) => getDynamicSubtitleUtil(total, dashboardType, selectedProgressFilter, config),
    [dashboardType, selectedProgressFilter, config]
  );

  const { selectedOffers, handleSelectAllSmart, isAllSelected, onSelectedRowsChange } =
    useUnifiedDashboardSelection({
      dashboardType,
      selectedProgressFilter,
      selectedRows,
      effectiveGroupBy,
      groupedSummaryData: groupedSummaryData ?? null,
      apiFn,
      hookParams,
      shouldSkipFlatViewApi,
      apiData,
      clearSelectedItems,
      addSelectedItem,
    });

  const rowClassName = useUnifiedDashboardRowClassName({
    selectedRows,
    dashboardType,
    enableRowClick: config.enableRowClick,
    glowingItemId: (config as any).glowingItemId,
  });

  const tableConfig = useUnifiedDashboardTableConfig({
    dashboardType,
    selectedProgressFilter,
    tableProgressFilter,
    sessionRole: session?.user?.role,
    selection: {
      selectedOffers: Array.isArray(selectedOffers) ? [...selectedOffers] : [],
      onSelectedRowsChange,
      handleSelectAllSmart,
      isAllSelected,
      clearSelectedItems,
    },
    grouping: {
      effectiveGroupBy,
      isMultiTableMode,
      selectedGroupBy,
      hasSelectedGroupBy,
      hasUserAddedGroupBy,
      isMultiLevelGroupingApplied,
      handleGroupByArrayChangeWithReset,
      handleClearGroupByFilter,
      handleMultiLevelGrouping,
    },
    data: {
      transformedData,
      groupedDataLoading,
      preFetchedIsLoading,
      preFetchedData,
      apiData,
      isLoading,
      isFetching,
    },
    pageIndex,
    pageSize,
    search,
    columns,
    expandedRowId,
    ExpandedRowComponent,
    config,
    rowClassName,
    handleRowClick,
    handleTransferredOfferToggle,
    hasTransferredOffer,
    getDynamicTitle,
  });

  // For Agent role: Force grouped view when transferred offer filter is active (even if no group by selected)
  const shouldForceGroupedView = React.useMemo(
    () =>
      session?.user?.role === Role.AGENT &&
      hasTransferredOffer &&
      dashboardType === DashboardType.OFFER,
    [session?.user?.role, hasTransferredOffer, dashboardType]
  );

  useUnifiedDashboardPageInfo({
    effectiveGroupByLength: effectiveGroupBy.length,
    shouldForceGroupedView,
    groupedDataLoading,
    groupedTotal: groupedSummaryData?.meta?.total ?? 0,
    preFetchedIsLoading,
    isLoading,
    flatTotal: preFetchedData?.meta?.total ?? apiData?.meta?.total ?? 0,
    getDynamicTitle,
    getDynamicSubtitle,
    setPageInfo,
  });

  // Determine if checkboxes should be shown (selection enabled)
  const isSelectionEnabled =
    session?.user?.role === Role?.ADMIN
      ? true
      : session?.user?.role === Role.AGENT &&
        (dashboardType === DashboardType.OFFER || pathname?.startsWith('/dashboards/offers'));

  // ─── Column header filter & group-by ──────────────────────────────────────
  const { data: offerMetadataOptions } = useMetadataOptions('Offer');

  const columnFilterOptions = useMemo(
    () => offerMetadataOptions?.filterOptions || [],
    [offerMetadataOptions]
  );

  const columnGroupOptions = useMemo(
    () => offerMetadataOptions?.groupOptions || [],
    [offerMetadataOptions]
  );

  const activeColumnFilters = useMemo(() => {
    const filters: Record<string, ColumnFilterValue> = {};
    if (!userDomainFilters?.length) return filters;
    for (const df of userDomainFilters) {
      const [field, op, val] = df;
      if (field) {
        filters[field] = { operator: op, value: val };
      }
    }
    return filters;
  }, [userDomainFilters]);

  const handleColumnFilterApply = useCallback(
    (columnId: string, operator: string, value: any) => {
      const apiOperator = FILTER_OPERATOR_TO_API[operator] ?? operator;
      const newFilter: DomainFilter = [columnId, apiOperator, value];
      const updated = [
        ...(userDomainFilters || []).filter(([field]) => field !== columnId),
        newFilter,
      ];
      setUserDomainFilters(updated);
    },
    [userDomainFilters, setUserDomainFilters]
  );

  const handleColumnFilterClear = useCallback(
    (columnId: string) => {
      const updated = (userDomainFilters || []).filter(([field]) => field !== columnId);
      setUserDomainFilters(updated);
    },
    [userDomainFilters, setUserDomainFilters]
  );

  const handleToggleGroupBy = useCallback(
    (field: string) => {
      const current = storeGroupBy || [];
      const isSelected = current.includes(field);
      const updated = isSelected
        ? current.filter((f) => f !== field)
        : [...current, field];
      setStoreGroupBy(updated);
    },
    [storeGroupBy, setStoreGroupBy]
  );

  // ─── Context value for dialogs & child components ────────────────────────
  const dashboardContextValue = {
    config,
    dashboardType,
    selectedProgressFilter,
    selectedRows,
    selectedItems,
    session,
    handleProgressFilterChange,
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
    handleBulkDownload,
    handleConfirmBulkDownload,
    isBulkDownloadConfirmOpen,
    setIsBulkDownloadConfirmOpen,
    isBulkDownloading,
    setBulkDownloadConfirmData,
    bulkDownloadConfirmData,
    refetch,
    sessionRole: session?.user?.role,
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
    handleSelfAssignTickets,
    handleAssignTicketsToOther,
    isAssignTicketDialogOpen,
    setIsAssignTicketDialogOpen,
    selectedTicketForAssign,
    setSelectedTicketForAssign,
    handleAssignTicketSuccess,
    pathname,
    clearDetailsParams,
  };

  const filterContextValue = useFilterProviderValue(
    buildApiFilters,
    buildGroupedLeadsFilters,
    handleGroupByArrayChangeWithReset,
    handleClearGroupByFilter
  );

  return (
    <UnifiedDashboardProvider value={dashboardContextValue}>
      <FilterProvider value={filterContextValue}>
        <div className="flex flex-col gap-4 px-3">
          <div className="relative">
            <UnifiedDashboardTable
              tableConfig={tableConfig}
              forceUpdate={forceUpdate}
              domainFilters={domainFilters}
              effectiveGroupBy={effectiveGroupBy}
              isMultiTableMode={isMultiTableMode}
              groupedData={groupedSummaryData?.data || []}
              entityType={entityType}
              hasProgressForGrouping={hasProgressForGrouping}
              search={search}
              columnFilterOptions={columnFilterOptions}
              activeColumnFilters={activeColumnFilters}
              onColumnFilterApply={handleColumnFilterApply}
              onColumnFilterClear={handleColumnFilterClear}
              columnToFieldMap={OFFER_COLUMN_TO_FIELD_MAP}
              columnHeaderFilterRenderers={OFFER_COLUMN_HEADER_FILTER_RENDERERS}
              columnGroupOptions={columnGroupOptions}
              activeGroupBy={effectiveGroupBy}
              onToggleGroupBy={handleToggleGroupBy}
            />
          </div>

          <UnifiedDashboardDialogs />
        </div>
      </FilterProvider>
    </UnifiedDashboardProvider>
  );
};

export default UnifiedDashboard;
