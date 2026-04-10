/**
 * UnifiedDashboard selection logic.
 * Handles select-all (flat + grouped), row selection sync with store, and isAllSelected state.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { getTableNameForDashboardType, TDashboardType } from '../dashboardTypes';

interface UseUnifiedDashboardSelectionParams {
  dashboardType: TDashboardType;
  selectedProgressFilter: TDashboardType;
  selectedRows: string[];
  effectiveGroupBy: string[];
  groupedSummaryData: { data?: any[] } | null | undefined;
  apiFn: any;
  hookParams: any;
  shouldSkipFlatViewApi: boolean;
  apiData: { meta?: { total?: number } } | null;
  clearSelectedItems: () => void;
  addSelectedItem: (item: any, tableName: any) => void;
}

export function useUnifiedDashboardSelection({
  dashboardType,
  selectedProgressFilter,
  selectedRows,
  effectiveGroupBy,
  groupedSummaryData,
  apiFn,
  hookParams,
  shouldSkipFlatViewApi,
  apiData,
  clearSelectedItems,
  addSelectedItem,
}: UseUnifiedDashboardSelectionParams) {
  const tableName = getTableNameForDashboardType(
    dashboardType,
    selectedProgressFilter
  ) as any;

  const applyItemsToSelection = useCallback(
    (items: any[]) => {
      clearSelectedItems();
      items?.forEach((item: any) => addSelectedItem(item, tableName));
    },
    [clearSelectedItems, addSelectedItem, tableName]
  );

  const { selected: selectedOffers, handleSelectAll: handleSelectAllOffer } = useSelectAllApi({
    apiFn,
    apiParams: shouldSkipFlatViewApi ? { page: 1, limit: 1 } : hookParams,
    total: shouldSkipFlatViewApi ? 0 : apiData?.meta?.total || 0,
    returnFullObjects: true,
  });

  useEffect(() => {
    if (selectedOffers && selectedOffers?.length > 0) {
      applyItemsToSelection([...selectedOffers]);
    }
  }, [selectedOffers, applyItemsToSelection]);

  const handleSelectAllSmart = useCallback(async () => {
    try {
      if (effectiveGroupBy.length > 0) {
        const allGroupedItems = groupedSummaryData?.data || [];
        if (allGroupedItems?.length > 0) {
          applyItemsToSelection(allGroupedItems);
        }
        return;
      }
      await handleSelectAllOffer();
    } catch {
      // Error handled silently
    }
  }, [
    effectiveGroupBy.length,
    groupedSummaryData?.data,
    handleSelectAllOffer,
    applyItemsToSelection,
  ]);

  const isAllSelected = useMemo(() => {
    if (effectiveGroupBy.length > 0) {
      const allGroupedItems = groupedSummaryData?.data || [];
      return selectedRows?.length === allGroupedItems?.length && allGroupedItems?.length > 0;
    }
    return (
      selectedRows.length === (apiData?.meta?.total || 0) && (apiData?.meta?.total || 0) > 0
    );
  }, [
    effectiveGroupBy.length,
    groupedSummaryData?.data,
    selectedRows.length,
    apiData?.meta?.total,
  ]);

  const onSelectedRowsChange = useCallback(
    (rows: any[]) => {
      if (rows && rows?.length > 0) {
        applyItemsToSelection(rows);
      } else {
        clearSelectedItems();
      }
    },
    [applyItemsToSelection, clearSelectedItems]
  );

  return {
    selectedOffers,
    handleSelectAllSmart,
    isAllSelected,
    onSelectedRowsChange,
  };
}
