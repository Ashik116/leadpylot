'use client';

import { useBanks } from '@/services/hooks/useSettings';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import SimpleBankCard from './SimpleBankCard';
import { usePageInfoStore } from '@/stores/pageInfoStore';
import CommonActionBar from '@/components/shared/ActionBar/CommonActionBar';
import BankFilterActions from './BankFilterActions';
import BankListHeader from './BankListHeader';
import BankSkeletonGrid from './BankCardSkeleton';
import FileNotFound from '@/assets/svg/FileNotFound';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import { useBanksNavigationStore } from '@/stores/navigationStores';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import { useSelectedRows } from '@/components/shared/BaseTable/useSelectedRows';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { apiGetBanks, apiDeleteBank } from '@/services/SettingsService';
import { useBulkActions } from '@/hooks/useBulkActions';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import { buildDomainFiltersFromChain } from '@/utils/filterUtils';
import { useFilterProviderValue } from '@/hooks/useFilterProviderValue';
import { getActiveSubgroupPagination } from '@/utils/groupUtils';
import { useGroupedSummary } from '@/services/hooks/useLeads';
import { useFilterChainLeads } from '@/hooks/useFilterChainLeads';
import { FilterProvider } from '@/contexts/FilterContext';
import BankGroupSummary from './BankGroupSummary';
import ApolloIcon from '@/components/ui/ApolloIcon';
import RoleGuard from '@/components/shared/RoleGuard';

const BankDashboardCardRefactor = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  const router = useRouter();
  const { pageInfo, setPageInfo } = usePageInfoStore();

  // State for checkbox visibility
  const [showCheckboxes, setShowCheckboxes] = useState(false);

  // Get navigation store data
  const setFilteredItems = useBanksNavigationStore((state) => state.setItems);
  const setCurrentIndex = useBanksNavigationStore((state) => state.setCurrentIndex);
  const findItemIndexById = useBanksNavigationStore((state) => state.findIndexById);

  // Pagination state management and query params management
  const searchParams = useSearchParams();
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '55', 10);
  const sortBy = searchParams.get('sortBy') || 'state';
  const sortOrder = searchParams.get('sortOrder') || 'asc';
  const search = searchParams.get('search') || '';
  const selectedState = searchParams.get('status') || undefined;

  // Set entity type in store
  const { setEntityType } = useUniversalGroupingFilterStore();
  useEffect(() => {
    setEntityType('Bank');
  }, [setEntityType]);

  // Filter chain for grouping and filtering
  const filterChain = useFilterChainLeads({
    onClearSelections: () => {
      // Clear selections when filters change
    },
    currentTab: 'banks',
  });

  const {
    selectedGroupBy,
    buildApiFilters,
    buildGroupedLeadsFilters,
    handleGroupByArrayChange,
    handleClearGroupByFilter,
  } = filterChain;

  const handleGroupByArrayChangeWithReset = useCallback(
    (newGroupBy: string[]) => {
      handleGroupByArrayChange(newGroupBy);
    },
    [handleGroupByArrayChange]
  );

  // Get grouping and pagination from store
  const {
    pagination: storePagination,
    sorting,
    subgroupPagination: storeSubgroupPagination,
  } = useUniversalGroupingFilterStore();

  // Convert filter chain filters to domain filters
  const domainFilters = useMemo(
    () => buildDomainFiltersFromChain(buildGroupedLeadsFilters),
    [buildGroupedLeadsFilters]
  );

  // Effective group by (from filter chain)
  const effectiveGroupBy = useMemo(() => {
    return selectedGroupBy.length > 0 ? selectedGroupBy : [];
  }, [selectedGroupBy]);

  // Fetch grouped summary data
  const { data: groupedSummaryData, isLoading: groupedDataLoading } = useGroupedSummary({
    entityType: 'Bank',
    domain: domainFilters,
    groupBy: effectiveGroupBy,
    page: storePagination?.page || pageIndex,
    limit: storePagination?.limit || pageSize,
    ...getActiveSubgroupPagination(storeSubgroupPagination),
    sortBy: sorting?.sortBy || 'count',
    sortOrder: (sorting?.sortOrder as 'asc' | 'desc') || 'desc',
    enabled: effectiveGroupBy.length > 0,
    search: search || undefined,
  });

  // Disable regular API hook when grouping is active
  const shouldDisableHook = effectiveGroupBy.length > 0;

  // Always fetch banks data for display (pagination, filters, etc.) - only when not grouped
  const { data: banksResponse, isLoading } = useBanks(
    {
      page: pageIndex,
      limit: pageSize,
      search: search,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      status: selectedState || undefined,
    },
    {
      enabled: !shouldDisableHook,
    }
  );

  // Always use API data for display (pagination, filters, etc.)
  const banks = banksResponse?.data || [];
  const total = banksResponse?.meta?.total || 0;

  // Page size options
  const pageSizeOptions = [
    { value: 25, label: '25 / page' },
    { value: 44, label: '44 / page' },
    { value: 100, label: '100 / page' },
    { value: total || 25, label: 'All / page' },
  ];
  //Action Bar Row selection management using useSelectedRows hook (following BaseTable pattern)
  const { selectedRows, handleRowCheckboxChange, clearSelection } = useSelectedRows({
    selectable: showCheckboxes,
    rowIdField: '_id',
    returnFullObjects: false,
    tableName: 'banks',
  });
  // Select all API functionality following MailDashboardRefactored pattern
  const { selected: selectedBanks, handleSelectAll: handleSelectAllBanks } = useSelectAllApi({
    apiFn: apiGetBanks,
    apiParams: {
      page: pageIndex,
      limit: pageSize,
      search: search || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      status: selectedState || undefined,
      select: '_id'
    },
    total: total,
    returnFullObjects: true,
  });

  //Action Bar Bulk actions configuration following MailDashboardRefactored pattern
  const bulkActions = useBulkActions({
    entityName: 'banks',
    deleteUrl: '/banks',
    invalidateQueries: ['banks'],
    apiData: banks,
    selectedRows: selectedRows,
    onClearSelection: clearSelection,
    singleDeleteConfig: {
      deleteFunction: apiDeleteBank,
    },
  });
  // Effect to update navigation store with current filtered results (following leads pattern)
  useEffect(() => {
    let currentFilteredData: any[] = [];

    // Determine which data to use based on current state
    if (banksResponse?.data) {
      // Use current page data (may be filtered by API)
      currentFilteredData = banksResponse?.data;
    }

    // Update navigation store with current filtered results
    if (currentFilteredData?.length > 0) setFilteredItems(currentFilteredData);
  }, [banksResponse?.data, setFilteredItems]);

  // Update page header info (title/subtitle/total)
  useEffect(() => {
    const total = banksResponse?.meta?.total;
    if (typeof total === 'number') {
      const title = pageInfo?.title || 'Banks';
      setPageInfo({
        title,
        total,
        subtitle: `Total Banks: ${total}`,
      } as any);
    }
  }, [banksResponse?.meta?.total, setPageInfo, pageInfo?.title]);

  // Checkbox functionality following BaseTable patterns
  const isCheckboxChecked = (bank: any) => {
    if (!showCheckboxes) return false;
    const bankId = bank._id?.toString();
    return bankId ? selectedRows?.includes(bankId) : false;
  };

  const handleDataTableCheckboxChange = (checked: boolean, bank: any) => {
    if (!showCheckboxes) return;
    handleRowCheckboxChange(checked, bank);
  };

  const handleToggleCheckboxes = (show: boolean) => {
    setShowCheckboxes(show);
    if (!show) {
      clearSelection(); // Clear selection when hiding checkboxes
    }
  };

  // Sync selectedBanks from useSelectAllApi with selectedRows from useSelectedRows
  useEffect(() => {
    if (selectedBanks && selectedBanks?.length > 0 && selectedRows?.length > 0) {
      // Convert selected banks to IDs and update the selection
      const bankIds = selectedBanks?.map((bank: any) => bank._id?.toString())?.filter(Boolean);
      // Clear current selection and add all selected banks
      clearSelection();
      bankIds?.forEach((bankId: string) => {
        const bank = selectedBanks?.find((b: any) => b._id?.toString() === bankId);
        if (bank) {
          handleRowCheckboxChange(true, bank);
        }
      });
    }
  }, [selectedBanks, clearSelection, handleRowCheckboxChange]);

  const onAppendQueryParams = (queryParams: any) => {
    const params = new URLSearchParams(searchParams.toString());

    Object?.entries(queryParams)?.forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) params.delete(key);
      else params.set(key, String(value));
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (pageNumber: number, newPageSize?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageIndex', pageNumber.toString());

    if (newPageSize) params.set('pageSize', newPageSize.toString());

    router.push(`${pathname}?${params.toString()}`);
  };

  // Handle pagination change
  const handlePaginationChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageIndex', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', newPageSize.toString());
    params.set('pageIndex', '1'); // Reset to first page
    router.push(`${pathname}?${params.toString()}`);
  };

  // Handle bank row click - set navigation index before navigating (following leads pattern)
  const handleBankClick = (bank: any) => {
    const bankId = bank?._id?.toString();

    // Update navigation position to clicked bank before navigating
    try {
      const index = findItemIndexById(bankId);

      if (index >= 0) {
        setCurrentIndex(index);
      } else {
        // Try to find it in the current page data as fallback
        const currentData = banksResponse?.data || [];
        const fallbackIndex = currentData?.findIndex((item: any) => item?._id === bankId);
        if (fallbackIndex >= 0) {
          // Calculate the global index based on current page
          const globalIndex = (pageIndex - 1) * pageSize + fallbackIndex;
          setCurrentIndex(globalIndex);
        }
      }
    } catch {
      // Error handling without console.log
    }

    router.push(`/admin/banks/${bankId}`);
  };

  const filterContextValue = useFilterProviderValue(
    buildApiFilters,
    buildGroupedLeadsFilters,
    handleGroupByArrayChangeWithReset,
    handleClearGroupByFilter
  );

  return (
    <FilterProvider value={filterContextValue}>
      <div className="mx-2 flex flex-col gap-2 rounded-lg bg-white xl:mx-0">
        <div className="rounded-lg bg-white px-4 py-2">
          {/* CommonActionBar */}
          <CommonActionBar
            handleClearSelection={clearSelection}
            onAppendQueryParams={onAppendQueryParams}
            search={search}
            allColumns={[]} // No columns needed for bank cards
            columnVisibility={{}}
            handleColumnVisibilityChange={() => { }} // Not needed
            selectedItems={selectedRows}
            setDeleteConfirmDialogOpen={bulkActions.setDeleteConfirmOpen}
            searchPlaceholder="Search bank accounts..."
            setIsColumnOrderDialogOpen={() => { }}
            // customizeButtonRef={{ current: null }}
            isColumnOrderDialogOpen={false}
            deleteButton={true} // Show delete button for banks
            showPagination={true}
            currentPage={pageIndex}
            pageSize={pageSize}
            total={total}
            onPageChange={handlePageChange}
            showSelectAllButton={showCheckboxes} // Show select all when checkboxes are visible
            onSelectAll={handleSelectAllBanks} // Use the select all API function
            showActionsDropdown={true} // Hide actions dropdown
            showSortingColumn={false} // Hide column sorting
            selectable={showCheckboxes} // Make selectable when checkboxes are visible
            extraActions={
              <BankFilterActions
                selectedState={selectedState}
                showCheckboxes={showCheckboxes}
                onToggleCheckboxes={handleToggleCheckboxes}
              />
            }
          >
            <RoleGuard> <Button variant="destructive" size="xs" onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              bulkActions.setDeleteConfirmOpen(true);
            }}
              icon={<ApolloIcon name="trash" />}
            >
              Delete
            </Button>
            </RoleGuard>
          </CommonActionBar>
        </div>
        {/* Grouped View */}
        {effectiveGroupBy.length > 0 ? (
          <>
            {(groupedDataLoading || isLoading) && <BankSkeletonGrid count={pageSize} />}
            {!groupedDataLoading && !isLoading && (!groupedSummaryData?.data || groupedSummaryData.data.length === 0) && (
              <div className="max-h-[85dvh] overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="flex h-full flex-col items-center justify-center">
                  <FileNotFound />
                  <span className="font-semibold">No groups found!</span>
                </div>
              </div>
            )}
            {!groupedDataLoading && !isLoading && groupedSummaryData?.data && groupedSummaryData.data.length > 0 && (
              <div className="mx-2 h-full overflow-y-auto rounded-lg border border-gray-200 xl:mx-4 max-h-[calc(93dvh-100px)]">
                <BankListHeader leftLabel="Name" rightLabel="Limits" columnCount={4} />

                {/* Scrollable Grouped Banks Container */}
                <div className="h-full overflow-y-auto">
                  <div className="w-full">
                    {groupedSummaryData.data.map((group) => (
                      <BankGroupSummary
                        key={group.groupId}
                        group={group}
                        onBankClick={handleBankClick}
                        level={0}
                        parentPath={[]}
                        groupByFields={effectiveGroupBy}
                        search={search}
                        isCheckboxChecked={isCheckboxChecked}
                        onCheckboxChange={handleDataTableCheckboxChange}
                        showCheckboxes={showCheckboxes}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Flat View (No Grouping) */
          <>
            {isLoading && <BankSkeletonGrid count={pageSize} />}
            {!isLoading && banks?.length === 0 && (
              <div className="max-h-[85dvh] overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="flex h-full flex-col items-center justify-center">
                  <FileNotFound />
                  <span className="font-semibold">No data found!</span>
                </div>
              </div>
            )}
            {!isLoading && banks?.length !== 0 && banks?.length > 0 && (
              <div className="mx-2 h-full overflow-y-auto rounded-lg border border-gray-200 xl:mx-4 max-h-[calc(93dvh-100px)]">
                <BankListHeader leftLabel="Info" rightLabel="Allow" columnCount={4} />

                {/* Scrollable Bank Cards Container */}
                <div className="h-full overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
                    {banks?.length > 0 &&
                      banks?.map((bank) => (
                        <div
                          key={bank?._id}
                          className="relative flex justify-between border-r border-b border-gray-200 last:border-b-0 hover:bg-gray-100"
                        >
                          {showCheckboxes && (
                            <div
                              className="absolute top-0 right-1"
                              onClick={(e) => e.stopPropagation()} // Prevent link navigation when clicking checkbox
                            >
                              <Checkbox
                                checked={isCheckboxChecked(bank)}
                                onChange={(checked) => handleDataTableCheckboxChange(checked, bank)}
                              />
                            </div>
                          )}
                          <div
                            className="flex w-full cursor-pointer justify-between"
                            onClick={() => handleBankClick(bank)}
                          >
                            <SimpleBankCard bank={bank} showCheckBox={showCheckboxes} />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {pageSize && (
          <div className="flex items-center justify-between px-6 py-4">
            <Pagination
              currentPage={pageIndex}
              total={total}
              pageSize={pageSize}
              onChange={handlePaginationChange}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Show:</span>
              <Select
                size="sm"
                isSearchable={false}
                value={pageSizeOptions.find((option) => option?.value === pageSize)}
                options={pageSizeOptions}
                onChange={(option) => handlePageSizeChange(option?.value || 12)}
                className="w-24"
                menuPlacement="top"
              />
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation Dialog */}
        <ConfirmDialog
          type="warning"
          isOpen={bulkActions.deleteConfirmOpen}
          title="Warning"
          onCancel={() => bulkActions.setDeleteConfirmOpen(false)}
          onConfirm={bulkActions.handleDeleteConfirm}
          confirmButtonProps={{ disabled: bulkActions.isDeleting }}
        >
          <p>Are you sure you want to delete {selectedRows?.length} banks?</p>
        </ConfirmDialog>
      </div>
    </FilterProvider>
  );
};

export default BankDashboardCardRefactor;
