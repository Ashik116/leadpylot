'use client';

import React, { useMemo, useRef, useCallback } from 'react';
import classNames from 'classnames';
import { DragDropContext } from '@hello-pangea/dnd';
import { DragDropProvider } from './DragDropContext';
import { OpeningsMultiTableProvider, useOpeningsMultiTable } from './OpeningsMultiTableContext';
import { useOpeningsMultiTableDragDrop } from './hooks/useOpeningsMultiTableDragDrop';
import { useOpeningsMultiTableHandlers } from './hooks/useOpeningsMultiTableHandlers';
import { UnifiedDashboard } from '../../_components/unified-dashboard';
import { openingsHookConfig, getOpeningsColumns } from './OpeningsDashboardConfig';
import { TDashboardType } from '../../_components/dashboardTypes';
import { TDashboardType as DragDropTDashboardType } from './DragDropContext';
import { useOffersProgressAll } from '@/services/hooks/useOffersProgress';
import ActionDropDown from '@/components/shared/ActionBar/ActionDropDown';
import ActionButtonsSection from '../../_components/ActionButtonsSection';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { SmartDropdown } from '@/components/shared/SmartDropdown';
import { DraggableColumnList } from '@/app/(protected-pages)/dashboards/leads/_components/DraggableColumnList';
import { useColumnCustomization } from '@/hooks/useColumnCustomization';
import { ColumnDef } from '@/components/shared/DataTable';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { DashboardType } from '../../_components/dashboardTypes';
import CreateConfirmationDialog from '../../_components/CreateConfirmationDialog';
import CreatePaymentVoucherDialog from '../../_components/CreatePaymentVoucherDialog';
import NettoModal from '../../_components/NettoModal';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import BulkUpdateDialog from '../../leads/_components/BulkUpdateDialog';
import BulkNettoDialog from '../../netto/_components/BulkNettoDialog';
import RoleGuard from '@/components/shared/RoleGuard';
import { useQueryClient } from '@tanstack/react-query';
import {
  PROGRESS_FILTERS,
  TABLE_TITLES,
  getPageTypeFromProgressFilter,
  getActionConfig,
  getTableIndex,
  getStageNameFromTableType,
  isValidDragMovement,
  getColumnKey,
  getColumnDisplayLabel,
  extractOfferId,
} from './openingsMultiTableUtils';
import { searchOpeningsData } from './openingsSearchUtils';
import DebouceInput from '@/components/shared/DebouceInput';
import Select from '@/components/ui/Select';

// Memoized table wrapper to prevent unnecessary re-renders
const TableWrapper = React.memo(
  ({
    progressFilter,
    isDraggedOver,
    preFetchedData,
    preFetchedIsLoading,
    preFetchedRefetch,
    clearSelectionsSignal,
    glowingItemId,
  }: {
    progressFilter: TDashboardType;
    isDraggedOver?: boolean;
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
    clearSelectionsSignal?: number;
    glowingItemId?: string | null;
  }) => {
    const uniqueTableName = getPageTypeFromProgressFilter(progressFilter);

    return (
      <div
        className={classNames(
          '-mx-2 rounded-lg transition-all duration-300 xl:mx-0',
          isDraggedOver && 'ring-opacity-75 animate-pulse shadow-lg ring-4 ring-blue-500'
        )}
        style={{
          position: 'relative',
          overflow: 'visible',
          minHeight: '300px',
          transform: 'none',
          willChange: 'auto',
        }}
      >
        <UnifiedDashboard
          key={`table-${progressFilter}-${clearSelectionsSignal || 0}`}
          dashboardType="opening"
          {...openingsHookConfig}
          preFetchedData={preFetchedData}
          preFetchedIsLoading={preFetchedIsLoading}
          preFetchedRefetch={preFetchedRefetch}
          config={
            {
              ...openingsHookConfig.config,
              showProgressFilter: false,
              initialProgressFilter: progressFilter,
              tableName: uniqueTableName,
              tableClassName: 'max-h-[300px]',
              fixedHeight: '300px',
              disableDragDropDialogs: true,
              glowingItemId: glowingItemId || undefined,
            } as typeof openingsHookConfig.config & {
              tableClassName: string;
              fixedHeight: string;
              disableDragDropDialogs?: boolean;
              glowingItemId?: string;
            }
          }
          tableProgressFilter={progressFilter}
        />
      </div>
    );
  },
  (prevProps, nextProps) => {
    const preFetchedDataEqual =
      prevProps.preFetchedData === nextProps.preFetchedData ||
      (prevProps.preFetchedData === undefined && nextProps.preFetchedData === undefined) ||
      (prevProps.preFetchedData !== undefined &&
        nextProps.preFetchedData !== undefined &&
        prevProps.preFetchedData.meta.total === nextProps.preFetchedData.meta.total &&
        prevProps.preFetchedData.meta.page === nextProps.preFetchedData.meta.page &&
        prevProps.preFetchedData.meta.limit === nextProps.preFetchedData.meta.limit &&
        prevProps.preFetchedData.data.length === nextProps.preFetchedData.data.length);

    return (
      prevProps.progressFilter === nextProps.progressFilter &&
      prevProps.isDraggedOver === nextProps.isDraggedOver &&
      preFetchedDataEqual &&
      prevProps.preFetchedIsLoading === nextProps.preFetchedIsLoading &&
      prevProps.clearSelectionsSignal === nextProps.clearSelectionsSignal &&
      prevProps.glowingItemId === nextProps.glowingItemId
    );
  }
);

TableWrapper.displayName = 'TableWrapper';

// Inner component that uses context and hooks
const OpeningsMultiTableContent = () => {
  const { data: session } = useSession();
  const { getSelectedItems } = useSelectedItemsStore();
  const queryClient = useQueryClient();

  // Single search query and table selector
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedSearchTable, setSelectedSearchTable] = React.useState<TDashboardType | 'all'>(
    'all'
  );

  // Context state and actions
  const {
    isConfirmationDialogOpen,
    isPaymentVoucherDialogOpen,
    isNettoDialogOpen,
    isLostDialogOpen,
    isBulkUpdateDialogOpen,
    isBulkNettoDialogOpen,
    createOpeningOpen,
    isDeleteDialogOpen,
    deleteTableType,
    columnDialogOpenFor,
    clearSelectionsSignal,
    destinationTable,
    sourceTable,
    isDragging,
    draggedItemAvailableReverts,
    dragDropSelectedItems,
    glowingItem,
    updatingTable,
    setIsConfirmationDialogOpen,
    setIsPaymentVoucherDialogOpen,
    setIsNettoDialogOpen,
    setIsLostDialogOpen,
    setIsBulkUpdateDialogOpen,
    setIsBulkNettoDialogOpen,
    setCreateOpeningOpen,
    setIsDeleteDialogOpen,
    setDeleteTableType,
    setColumnDialogOpenFor,
    dragOperationRef,
    resetDragStates,
  } = useOpeningsMultiTable();

  // Handlers hook
  const {
    handleRevert,
    handleBulkDelete,
    handleCreateOpening,
    handleCreateItem,
    handleDragEnd,
    handleClearSelection,
    getSelectedItemsForTable,
    triggerGlowEffect,
    isReverting,
    bulkDeleteOpeningsMutation,
    bulkDeleteConfirmationsMutation,
    bulkDeletePaymentVouchersMutation,
    bulkDeleteOffersMutation,
    createOpeningMutation,
    createPaymentVoucherMutation,
    bulkCreateConfirmationsMutation,
    bulkCreateLostOffersMutation,
  } = useOpeningsMultiTableHandlers();

  // Drag-drop hook
  const { handleDragStart, handleDragUpdate, tableRefs, scrollContainerRef } =
    useOpeningsMultiTableDragDrop();

  // Fetch all progress types in a single API call
  const allProgressQuery = useOffersProgressAll({});

  // Map of counts for each filter type
  const counts: Record<any, number> = useMemo(
    () => ({
      opening: allProgressQuery.data?.data?.opening?.meta?.total || 0,
      confirmation: allProgressQuery.data?.data?.confirmation?.meta?.total || 0,
      payment: allProgressQuery.data?.data?.payment?.meta?.total || 0,
      netto2: allProgressQuery.data?.data?.netto2?.meta?.total || 0,
      lost: allProgressQuery.data?.data?.lost?.meta?.total || 0,
      offer: 0,
      netto: 0,
      netto1: 0,
    }),
    [allProgressQuery.data]
  );

  // Pre-compute and memoize pre-fetched data for all tables
  const preFetchedDataMap = useMemo(() => {
    const map = new Map<
      TDashboardType,
      | {
          data: any[];
          meta: {
            total: number;
            page: number;
            limit: number;
          };
        }
      | undefined
    >();

    if (!allProgressQuery.data?.data) {
      return map;
    }

    const validFilters: Array<
      'opening' | 'confirmation' | 'payment' | 'netto1' | 'netto2' | 'lost'
    > = ['opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost'];

    validFilters.forEach((filter) => {
      const tableData = allProgressQuery.data.data[filter];
      if (tableData) {
        map.set(filter, {
          data: tableData.data || [],
          meta: {
            total: tableData.meta?.total || 0,
            page: tableData.meta?.page || 1,
            limit: tableData.meta?.limit || 50,
          },
        });
      } else {
        map.set(filter, undefined);
      }
    });

    return map;
  }, [allProgressQuery.data]);

  // Helper to get pre-fetched data for a specific table type with search filtering
  const getPreFetchedData = useCallback(
    (progressFilter: TDashboardType) => {
      const originalData = preFetchedDataMap.get(progressFilter);
      if (!originalData) {
        return undefined;
      }

      // If no search query, return original data
      if (!searchQuery.trim()) {
        return originalData;
      }

      // If table selector is set to a specific table, only search that table
      // If "all" is selected, search applies to all tables
      if (selectedSearchTable !== 'all' && selectedSearchTable !== progressFilter) {
        return originalData; // Return unfiltered data for tables not selected
      }

      // Filter data based on search query
      const filteredData = searchOpeningsData(originalData.data, searchQuery);

      return {
        ...originalData,
        data: filteredData,
        meta: {
          ...originalData.meta,
          total: filteredData.length,
        },
      };
    },
    [preFetchedDataMap, searchQuery, selectedSearchTable]
  );

  // Handler to update search query
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // Handler to update selected search table
  const handleSearchTableChange = useCallback((value: TDashboardType | 'all') => {
    setSelectedSearchTable(value);
  }, []);

  // Table options for search selector
  const searchTableOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Tables' },
      ...PROGRESS_FILTERS.map((filter) => ({
        value: filter,
        label: TABLE_TITLES[filter],
      })),
    ];
  }, []);

  // Reorder tables based on search results - tables with results appear first
  const orderedTables = useMemo(() => {
    // If no search query, return original order
    if (!searchQuery.trim()) {
      return PROGRESS_FILTERS;
    }

    // Separate tables into those with results and those without
    const tablesWithResults: TDashboardType[] = [];
    const tablesWithoutResults: TDashboardType[] = [];

    PROGRESS_FILTERS.forEach((filter) => {
      const originalData = preFetchedDataMap.get(filter);

      // Check if this table should be searched based on selectedSearchTable
      const shouldSearchThisTable = selectedSearchTable === 'all' || selectedSearchTable === filter;

      if (!shouldSearchThisTable || !originalData) {
        tablesWithoutResults.push(filter);
        return;
      }

      // Filter data based on search query
      const filteredData = searchOpeningsData(originalData.data, searchQuery);

      if (filteredData.length > 0) {
        tablesWithResults.push(filter);
      } else {
        tablesWithoutResults.push(filter);
      }
    });

    // Return tables with results first, then tables without results
    return [...tablesWithResults, ...tablesWithoutResults];
  }, [searchQuery, selectedSearchTable, preFetchedDataMap]);

  // Create individual refs for each table's customize button
  const openingCustomizeButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmationCustomizeButtonRef = useRef<HTMLButtonElement | null>(null);
  const paymentCustomizeButtonRef = useRef<HTMLButtonElement | null>(null);
  const netto2CustomizeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lostCustomizeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Helper to get the ref for a specific table type
  const getCustomizeButtonRef = useCallback(
    (progressFilter: TDashboardType): React.RefObject<HTMLButtonElement | null> => {
      switch (progressFilter) {
        case 'opening':
          return openingCustomizeButtonRef;
        case 'confirmation':
          return confirmationCustomizeButtonRef;
        case 'payment':
          return paymentCustomizeButtonRef;
        case 'netto2':
          return netto2CustomizeButtonRef;
        case 'lost':
          return lostCustomizeButtonRef;
        default:
          return openingCustomizeButtonRef;
      }
    },
    []
  );

  // Generate columns for column customization
  const allColumns: ColumnDef<any>[] = useMemo(
    () =>
      getOpeningsColumns({
        expandedRowId: '',
        handleExpanderToggle: () => {},
        onOpenDocsModal: () => {},
        onEditOffer: undefined,
        dashboardType: 'opening',
        userRole: session?.user?.role,
      }),
    [session?.user?.role]
  );

  // Column customization for each table
  const openingColumnCustomization = useColumnCustomization({
    tableName: 'openings',
    columns: allColumns,
    disableStorage: false,
  });

  const confirmationColumnCustomization = useColumnCustomization({
    tableName: 'confirmations',
    columns: allColumns,
    disableStorage: false,
  });

  const paymentColumnCustomization = useColumnCustomization({
    tableName: 'payments',
    columns: allColumns,
    disableStorage: false,
  });

  const netto2ColumnCustomization = useColumnCustomization({
    tableName: 'offers-netto2',
    columns: allColumns,
    disableStorage: false,
  });

  const lostColumnCustomization = useColumnCustomization({
    tableName: 'offers-lost',
    columns: allColumns,
    disableStorage: false,
  });

  // Function to get the appropriate column customization based on table type
  const getColumnCustomization = useCallback(
    (tableType: TDashboardType) => {
      switch (tableType) {
        case 'opening':
          return openingColumnCustomization;
        case 'confirmation':
          return confirmationColumnCustomization;
        case 'payment':
          return paymentColumnCustomization;
        case 'netto2':
          return netto2ColumnCustomization;
        case 'lost':
          return lostColumnCustomization;
        default:
          return openingColumnCustomization;
      }
    },
    [
      openingColumnCustomization,
      confirmationColumnCustomization,
      paymentColumnCustomization,
      netto2ColumnCustomization,
      lostColumnCustomization,
    ]
  );

  return (
    <DragDropContext
      onDragEnd={handleDragEnd}
      onDragUpdate={handleDragUpdate}
      onDragStart={handleDragStart}
    >
      {/* Sticky Search Bar - Always visible at top */}
      <div className="sticky top-0 z-50 mb-3 bg-white py-3 shadow-sm">
        <div className="flex items-center justify-end gap-2">
          <div className="w-[350px]">
            <DebouceInput
              prefix={<ApolloIcon name="search" className="text-md" />}
              placeholder={
                selectedSearchTable === 'all'
                  ? 'Search all tables...'
                  : `Search ${TABLE_TITLES[selectedSearchTable]?.toLowerCase()}...`
              }
              onChange={(e) => handleSearchChange(e.target.value)}
              defaultValue={searchQuery || ''}
              className="w-full"
              wait={300}
            />
          </div>
          <div className="w-[180px]">
            <Select
              instanceId="search-table-selector"
              placeholder="Select table"
              options={searchTableOptions}
              value={searchTableOptions.find((opt) => opt.value === selectedSearchTable)}
              onChange={(selectedOption) => {
                handleSearchTableChange((selectedOption?.value as TDashboardType | 'all') || 'all');
              }}
            />
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="space-y-1"
        style={{
          position: 'relative',
          minHeight: '100vh',
          paddingBottom: '50px',
        }}
      >
        {/* Tables - Each with its own action bar */}
        {orderedTables.map((progressFilter) => {
          const tableTitle = TABLE_TITLES[progressFilter];
          const tableCount = counts[progressFilter] || 0;
          const isLoading = allProgressQuery?.isLoading ?? false;

          // Get selected items for THIS specific table
          const tableStoreName = getPageTypeFromProgressFilter(progressFilter);
          const tableSelectedItems = getSelectedItems(tableStoreName as any);

          // Get action config for THIS specific table
          const tableActionConfig = getActionConfig(progressFilter);

          // Get the column customization for THIS specific table
          const { columnVisibility, handleColumnVisibilityChange } =
            getColumnCustomization(progressFilter);
          const uniqueTableName = getPageTypeFromProgressFilter(progressFilter);

          // Check if we should disable this table during reverse drag
          const currentStage = getStageNameFromTableType(progressFilter);
          const sourceIndex = sourceTable ? getTableIndex(sourceTable) : -1;
          const currentTableIndex = getTableIndex(progressFilter);
          const isReverseDrag = isDragging && sourceIndex >= 0 && currentTableIndex < sourceIndex;
          const isTableDisabled =
            isReverseDrag &&
            draggedItemAvailableReverts &&
            draggedItemAvailableReverts.length > 0 &&
            !draggedItemAvailableReverts.includes(currentStage);

          // Get filtered data for count display
          const filteredData = getPreFetchedData(progressFilter);
          const displayCount = isLoading
            ? '...'
            : filteredData
              ? filteredData.meta.total
              : tableCount;

          return (
            <React.Fragment key={`opening-table-${progressFilter}`}>
              <div
                className={classNames(
                  'flex items-center justify-center gap-1 py-0',
                  isTableDisabled && 'pointer-events-none opacity-40'
                )}
              >
                {/* Table Title with Actions Dropdown */}

                <h2 className="inline-flex items-center gap-1 text-base font-semibold text-gray-900">
                  {tableTitle}
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                    {displayCount}
                  </span>
                </h2>

                {/* Selected Items Count with Clear Button */}
                {tableSelectedItems?.length > 0 && (
                  <div className="flex items-center justify-center rounded-md">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex items-center rounded-md"
                      onClick={handleClearSelection}
                    >
                      <span className="text-xs">
                        {tableSelectedItems?.length}{' '}
                        {tableSelectedItems?.length === 1 ? 'item' : 'items'} selected
                      </span>
                      <ApolloIcon name="cross" className="ml-1 text-sm" />
                    </Button>
                  </div>
                )}

                {/* Actions Dropdown */}
                <RoleGuard role={Role.ADMIN}>
                  <ActionDropDown
                    key={`action-dropdown-${progressFilter}-${tableSelectedItems.length}-${clearSelectionsSignal}`}
                    selectedItems={tableSelectedItems}
                    deleteButton={true}
                    setDeleteConfirmDialogOpen={() => {
                      (window as any).__currentTableStoreName = tableStoreName;
                      setDeleteTableType(progressFilter as DragDropTDashboardType);
                      setIsDeleteDialogOpen(true);
                    }}
                    actionShowOptions={true}
                  >
                    <ActionButtonsSection
                      config={tableActionConfig}
                      selectedRows={tableSelectedItems.map((item: any) => item._id)}
                      selectedItems={tableSelectedItems}
                      session={session}
                      setIsBulkUpdateDialogOpen={() => {
                        (window as any).__currentTableStoreName = tableStoreName;
                        setIsBulkUpdateDialogOpen(true);
                      }}
                      setCreateOpeningOpen={() => {
                        (window as any).__currentTableStoreName = tableStoreName;
                        setCreateOpeningOpen(true);
                      }}
                      setCreateConfirmationDialogOpen={() => {
                        (window as any).__currentTableStoreName = tableStoreName;
                        setIsConfirmationDialogOpen(true);
                      }}
                      setIsPaymentVoucherDialogOpen={() => {
                        (window as any).__currentTableStoreName = tableStoreName;
                        setIsPaymentVoucherDialogOpen(true);
                      }}
                      setIsNettoDialogOpen={() => {
                        (window as any).__currentTableStoreName = tableStoreName;
                        setIsNettoDialogOpen(true);
                      }}
                      setIsBulkNettoDialogOpen={() => {
                        (window as any).__currentTableStoreName = tableStoreName;
                        setIsBulkNettoDialogOpen(true);
                      }}
                      setIsLostDialogOpen={() => {
                        (window as any).__currentTableStoreName = tableStoreName;
                        setIsLostDialogOpen(true);
                      }}
                      allowAgentGroupedActions={session?.user.role === Role.AGENT}
                      selectedProgressFilter={progressFilter}
                      dashboardType={DashboardType.OPENING}
                      onRevertOffers={() =>
                        handleRevert(progressFilter as DragDropTDashboardType, tableStoreName)
                      }
                      isReverting={isReverting}
                    />
                  </ActionDropDown>
                </RoleGuard>

                {/* Column Customization Button */}
                <div className="relative" title="Customize Columns">
                  <Button
                    ref={getCustomizeButtonRef(progressFilter)}
                    icon={<ApolloIcon name="sliders-settings" className="px-2 text-lg font-bold" />}
                    onClick={() => setColumnDialogOpenFor(progressFilter as DragDropTDashboardType)}
                  />
                  <SmartDropdown
                    isOpen={columnDialogOpenFor === progressFilter}
                    onClose={() => setColumnDialogOpenFor(null)}
                    triggerRef={getCustomizeButtonRef(progressFilter)}
                    dropdownWidth={384}
                    dropdownHeight={500}
                    offset={8}
                  >
                    <DraggableColumnList
                      columns={allColumns
                        ?.filter((col) => {
                          const key = getColumnKey(col);
                          return key && !['checkbox', 'action', 'expander'].includes(key);
                        })
                        .map((col) => {
                          const key = getColumnKey(col)!;
                          const label = getColumnDisplayLabel(col);
                          return {
                            key,
                            label,
                            isVisible: columnVisibility?.[key] !== false,
                          };
                        })}
                      onColumnVisibilityChange={handleColumnVisibilityChange}
                      onClose={() => setColumnDialogOpenFor(null)}
                      tableName={uniqueTableName}
                      preservedFields={[]}
                    />
                  </SmartDropdown>
                </div>
              </div>

              {/* Table Component */}
              <div
                ref={(el) => {
                  if (el && progressFilter in tableRefs.current) {
                    (tableRefs.current as any)[progressFilter] = el;
                  }
                }}
                data-table-type={progressFilter}
                className={classNames(isTableDisabled && 'pointer-events-none opacity-40')}
                style={{
                  marginBottom: '5px',
                  position: 'relative',
                  transform: 'none',
                  willChange: 'auto',
                }}
              >
                <TableWrapper
                  progressFilter={progressFilter}
                  isDraggedOver={
                    !isTableDisabled &&
                    destinationTable === progressFilter &&
                    sourceTable !== null &&
                    isValidDragMovement(
                      sourceTable,
                      progressFilter,
                      draggedItemAvailableReverts || undefined
                    )
                  }
                  preFetchedData={getPreFetchedData(progressFilter)}
                  preFetchedIsLoading={allProgressQuery.isLoading}
                  preFetchedRefetch={allProgressQuery.refetch}
                  clearSelectionsSignal={clearSelectionsSignal}
                  glowingItemId={
                    glowingItem && glowingItem.tableId === progressFilter
                      ? glowingItem.itemId
                      : null
                  }
                />
                {/* Loading Spinner Overlay */}
                {updatingTable === progressFilter && progressFilter !== 'netto2' && (
                  <div
                    className="bg-opacity-75 absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-white backdrop-blur-sm"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: '0.5rem',
                    }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium text-gray-700">Updating...</span>
                    </div>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Dialogs */}
      <CreateConfirmationDialog
        isOpen={isConfirmationDialogOpen}
        onClose={() => {
          setIsConfirmationDialogOpen(false);
          handleClearSelection();
          delete (window as any).__currentTableStoreName;
        }}
        onCreate={async (reference_no?: string) => {
          const storeName = (window as any).__currentTableStoreName;
          await handleCreateItem('confirmation', { reference_no }, storeName);
          setIsConfirmationDialogOpen(false);
          delete (window as any).__currentTableStoreName;
        }}
        isCreating={bulkCreateConfirmationsMutation.isPending}
      />

      <CreatePaymentVoucherDialog
        isOpen={isPaymentVoucherDialogOpen}
        onClose={() => {
          setIsPaymentVoucherDialogOpen(false);
          handleClearSelection();
          delete (window as any).__currentTableStoreName;
        }}
        onCreate={async (data) => {
          const storeName = (window as any).__currentTableStoreName;
          await handleCreateItem('payment-voucher', data, storeName);
          setIsPaymentVoucherDialogOpen(false);
          delete (window as any).__currentTableStoreName;
        }}
        isCreating={createPaymentVoucherMutation.isPending}
        selectedCount={
          typeof window !== 'undefined'
            ? getSelectedItemsForTable((window as any).__currentTableStoreName).length
            : 0
        }
      />

      <NettoModal
        open={isNettoDialogOpen}
        onClose={() => {
          setIsNettoDialogOpen(false);
          handleClearSelection();
          delete (window as any).__currentTableStoreName;

          // Reset drag states on close
          if (dragOperationRef.current) {
            resetDragStates();
          }
        }}
        onSuccess={() => {
          // Trigger glow effect on the dropped item
          if (dragOperationRef.current?.itemData && dragOperationRef.current.destTable) {
            const itemId = extractOfferId(dragOperationRef.current.itemData);
            if (itemId && dragOperationRef.current.destTable) {
              triggerGlowEffect(itemId, dragOperationRef.current.destTable);
            }
          }

          handleClearSelection();
          setIsNettoDialogOpen(false);
          delete (window as any).__currentTableStoreName;
          dragOperationRef.current = null;
          resetDragStates();
          queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
        }}
        offer={(() => {
          const items =
            typeof window !== 'undefined'
              ? getSelectedItemsForTable((window as any).__currentTableStoreName)
              : [];
          const selectedItem =
            items.length > 0
              ? items[0]
              : dragDropSelectedItems.length > 0
                ? dragDropSelectedItems[0]
                : null;
          return selectedItem
            ? {
                _id: extractOfferId(selectedItem) || selectedItem?._id,
                title:
                  selectedItem?.offer_id?.title ??
                  selectedItem?.title ??
                  selectedItem?.originalData?.title,
                investment_volume:
                  selectedItem?.offer_id?.investment_volume ??
                  selectedItem?.investmentVolume ??
                  selectedItem?.originalData?.investment_volume,
                bonus_amount:
                  typeof selectedItem?.bonusAmount === 'number'
                    ? selectedItem?.bonusAmount
                    : typeof selectedItem?.offer_id?.bonus_amount === 'number'
                      ? selectedItem?.offer_id?.bonus_amount
                      : (selectedItem?.offer_id?.bonus_amount?.info?.amount ??
                        (typeof selectedItem?.originalData?.bonus_amount === 'number'
                          ? selectedItem?.originalData?.bonus_amount
                          : (selectedItem?.originalData?.bonus_amount?.info?.amount ?? 0))),
                bankerRate:
                  selectedItem?.offer_id?.bankerRate ?? selectedItem?.originalData?.bankerRate,
                agentRate:
                  selectedItem?.offer_id?.agentRate ?? selectedItem?.originalData?.agentRate,
              }
            : undefined;
        })()}
      />

      <ConfirmDialog
        type="warning"
        isOpen={isLostDialogOpen}
        title="Create Lost Offers"
        onCancel={() => {
          setIsLostDialogOpen(false);
          handleClearSelection();
          delete (window as any).__currentTableStoreName;
        }}
        onConfirm={() => {
          const storeName = (window as any).__currentTableStoreName;
          handleCreateItem('lost', {}, storeName)
            .then(() => {
              setIsLostDialogOpen(false);
              delete (window as any).__currentTableStoreName;
            })
            .catch(() => {
              // Error handled by mutation
            });
        }}
        confirmButtonProps={{ disabled: bulkCreateLostOffersMutation.isPending }}
      >
        <p>
          Are you sure you want to create lost offers for{' '}
          {typeof window !== 'undefined'
            ? getSelectedItemsForTable((window as any).__currentTableStoreName).length
            : 0}{' '}
          selected item
          {typeof window !== 'undefined' &&
          getSelectedItemsForTable((window as any).__currentTableStoreName).length > 1
            ? 's'
            : ''}
          ?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      <BulkUpdateDialog
        isOpen={isBulkUpdateDialogOpen}
        onClose={() => {
          setIsBulkUpdateDialogOpen(false);
          delete (window as any).__currentTableStoreName;
        }}
        selectedLeads={(typeof window !== 'undefined'
          ? getSelectedItemsForTable((window as any).__currentTableStoreName)
          : []
        )
          .map(
            (item: any) =>
              item?.leadId ?? item?.lead_id?._id ?? item?.lead_id ?? item?.offer_id?.lead_id?._id
          )
          .filter(Boolean)}
        onSuccess={() => {
          handleClearSelection();
          setIsBulkUpdateDialogOpen(false);
          delete (window as any).__currentTableStoreName;
          queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
        }}
      />

      <ConfirmDialog
        type="warning"
        isOpen={createOpeningOpen}
        title="Create Opening"
        onCancel={() => {
          setCreateOpeningOpen(false);
          delete (window as any).__currentTableStoreName;
        }}
        onConfirm={() => handleCreateOpening((window as any).__currentTableStoreName)}
        confirmButtonProps={{ disabled: createOpeningMutation.isPending }}
      >
        <p>
          Are you sure you want to create openings for{' '}
          {typeof window !== 'undefined'
            ? getSelectedItemsForTable((window as any).__currentTableStoreName).length
            : 0}{' '}
          selected offer
          {typeof window !== 'undefined' &&
          getSelectedItemsForTable((window as any).__currentTableStoreName).length > 1
            ? 's'
            : ''}
          ?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      <BulkNettoDialog
        isOpen={isBulkNettoDialogOpen}
        onClose={() => {
          setIsBulkNettoDialogOpen(false);
          delete (window as any).__currentTableStoreName;
        }}
        onSuccess={() => {
          handleClearSelection();
          setIsBulkNettoDialogOpen(false);
          delete (window as any).__currentTableStoreName;
          queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
        }}
        selectedOffers={(typeof window !== 'undefined'
          ? getSelectedItemsForTable((window as any).__currentTableStoreName)
          : []
        ).map((item) => ({
          _id: extractOfferId(item) || item?._id,
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
        }))}
      />

      <ConfirmDialog
        type="warning"
        isOpen={isDeleteDialogOpen}
        title="Delete Items"
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setDeleteTableType(null);
          delete (window as any).__currentTableStoreName;
        }}
        onConfirm={() => {
          if (deleteTableType) {
            handleBulkDelete(deleteTableType, (window as any).__currentTableStoreName);
          }
        }}
        confirmButtonProps={{
          disabled:
            bulkDeleteOpeningsMutation.isPending ||
            bulkDeleteConfirmationsMutation.isPending ||
            bulkDeletePaymentVouchersMutation.isPending ||
            bulkDeleteOffersMutation.isPending,
        }}
      >
        <p>
          Are you sure you want to delete{' '}
          {typeof window !== 'undefined'
            ? getSelectedItemsForTable((window as any).__currentTableStoreName).length
            : 0}{' '}
          selected
          {deleteTableType === 'opening'
            ? ' opening'
            : deleteTableType === 'confirmation'
              ? ' confirmation'
              : deleteTableType === 'payment'
                ? ' payment voucher'
                : deleteTableType === 'netto1' ||
                    deleteTableType === 'netto2' ||
                    deleteTableType === 'lost'
                  ? ' offer'
                  : ' item'}
          {typeof window !== 'undefined' &&
          getSelectedItemsForTable((window as any).__currentTableStoreName).length > 1
            ? 's'
            : ''}
          ?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>
    </DragDropContext>
  );
};

// Main component that wraps with providers
const OpeningsMultiTable = () => {
  return (
    <DragDropProvider>
      <OpeningsMultiTableProvider>
        <OpeningsMultiTableContent />
      </OpeningsMultiTableProvider>
    </DragDropProvider>
  );
};

export default OpeningsMultiTable;
