/**
 * Build useBaseTable config for UnifiedDashboard.
 * Uses grouped params (selection, grouping, data) to reduce prop drilling.
 */
import React, { useCallback } from 'react';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { DashboardType, getTableNameForDashboardType, TDashboardType } from '../dashboardTypes';
import FilterBtn from '../FilterBtn';
import UnifiedDashboardActionButtons from './UnifiedDashboardActionButtons';
import type { UnifiedDashboardTableConfigParams } from './useUnifiedDashboardTableConfig.types';
import { useAuth } from '@/hooks/useAuth';

export function useUnifiedDashboardTableConfig(params: UnifiedDashboardTableConfigParams) {
  const {
    dashboardType,
    selectedProgressFilter,
    tableProgressFilter,
    sessionRole,
    selection,
    grouping,
    data,
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
  } = params;

  const {
    selectedOffers,
    onSelectedRowsChange,
    handleSelectAllSmart,
    isAllSelected,
    clearSelectedItems,
  } = selection;
  const { hasRole } = useAuth();
  const {
    effectiveGroupBy,
    isMultiTableMode,
    selectedGroupBy,
    hasSelectedGroupBy,
    hasUserAddedGroupBy,
    isMultiLevelGroupingApplied,
    handleGroupByArrayChangeWithReset,
    handleClearGroupByFilter,
    handleMultiLevelGrouping,
  } = grouping;

  const {
    transformedData,
    groupedDataLoading,
    preFetchedIsLoading,
    preFetchedData,
    apiData,
    isLoading,
    isFetching,
  } = data;

  const actionButtons = <UnifiedDashboardActionButtons />;
  const filterBtnComponent = <FilterBtn />;

  return useBaseTable({
    isBackendSortingReady: true,
    selectedRows: (selectedOffers ?? []) as any[],
    onSelectedRowsChange,
    tableName: tableProgressFilter
      ? getTableNameForDashboardType(dashboardType, tableProgressFilter)
      : getTableNameForDashboardType(dashboardType, selectedProgressFilter),
    data: transformedData,
    loading:
      effectiveGroupBy.length > 0 && !isMultiTableMode
        ? groupedDataLoading
        : preFetchedData && preFetchedIsLoading !== undefined
          ? preFetchedIsLoading
          : isLoading || isFetching,
    totalItems: preFetchedData?.meta?.total || apiData?.meta?.total || 0,
    pageSize,
    pageIndex,
    search: search || undefined,
    columns,
    returnFullObjects: true,
    searchPlaceholder: selectedProgressFilter ? `Search list...` : config?.searchPlaceholder,
    selectable:
      dashboardType === DashboardType.OFFER && sessionRole === Role?.AGENT
        ? true
        : sessionRole === Role?.ADMIN
          ? true
          : false,
    showActionsDropdown: tableProgressFilter
      ? false
      : dashboardType === DashboardType.OFFER && sessionRole === Role.AGENT
        ? true
        : sessionRole === Role.ADMIN
          ? true
          : false,
    showSearchInActionBar: tableProgressFilter ? false : true,
    showPagination: tableProgressFilter ? false : true,
    extraActions: undefined,
    onSelectAll: handleSelectAllSmart,
    bulkActionsConfig: config?.bulkActionsConfig,
    onRowClick: config.enableRowClick ? handleRowClick : undefined,
    rowClassName,
    deleteButton:
      dashboardType === DashboardType.OFFER && sessionRole === Role?.AGENT
        ? true
        : sessionRole === Role.ADMIN
          ? true
          : false,
    customActions: actionButtons,
    filterBtnComponent,
    showStageGroupByButton:
      dashboardType === DashboardType.OFFER || dashboardType === DashboardType.OPENING,
    renderExpandedRow: useCallback(
      (row: any) => <ExpandedRowComponent expandedRowId={expandedRowId || ''} row={row} />,
      [expandedRowId, ExpandedRowComponent]
    ),
    selectedGroupBy: isMultiTableMode ? [] : [...selectedGroupBy],
    onGroupByChange: isMultiTableMode ? undefined : handleGroupByArrayChangeWithReset,
    onClearGroupBy: isMultiTableMode ? undefined : handleClearGroupByFilter,
    hasSelectedGroupBy: isMultiTableMode ? false : hasSelectedGroupBy,
    hasUserAddedGroupBy: isMultiTableMode ? false : hasUserAddedGroupBy,
    isMultiLevelGroupingApplied: isMultiTableMode ? false : isMultiLevelGroupingApplied,
    onMultiLevelGrouping: isMultiTableMode ? undefined : handleMultiLevelGrouping,
    preservedFields: config.defaultColumn,
    setPageInfoFromBaseTable: false,
    pageInfoTitle: getDynamicTitle(),
    pageInfoSubtitlePrefix: config?.description,
    globalSelectAll: {
      enabled: true,
      onSelectAllData: async () => {
        await handleSelectAllSmart();
        return selectedOffers?.length > 0
          ? selectedOffers?.map((o: any) => o?._id || o?.id || o)
          : [];
      },
      onDeselectAllData: () => clearSelectedItems(),
    },
    isAllItemsSelected: isAllSelected,
    autoFitRowsOnZoom: false,
    enableZoom: !tableProgressFilter,
    showTransferredOfferButton: dashboardType === DashboardType.OFFER,
    hasTransferredOffer,
    onTransferredOfferToggle: handleTransferredOfferToggle,
    tableClassName: config.tableClassName,
    fixedHeight: config.fixedHeight,
    sectionTitle: config.sectionTitle,
    enableDragDrop: !!tableProgressFilter && sessionRole !== Role.AGENT,
    dragDropTableId: tableProgressFilter,
    enableColumnResizing: hasRole(Role.ADMIN) ? true : false,
    dynamicallyColumnSizeFit: hasRole(Role.ADMIN) ? false : true,
    tableLayout: 'fixed',
  });
}
