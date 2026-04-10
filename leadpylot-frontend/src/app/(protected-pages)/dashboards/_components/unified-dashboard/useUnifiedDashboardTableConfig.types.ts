/**
 * Grouped parameter types for useUnifiedDashboardTableConfig.
 */

import { TDashboardType } from "../dashboardTypes";

 

export interface UnifiedDashboardTableSelectionConfig {
  selectedOffers: any;
  onSelectedRowsChange: (rows: any[]) => void;
  handleSelectAllSmart: () => Promise<void>;
  isAllSelected: boolean;
  clearSelectedItems: () => void;
}

export interface UnifiedDashboardTableGroupingConfig {
  effectiveGroupBy: string[];
  isMultiTableMode: boolean;
  selectedGroupBy: readonly string[];
  hasSelectedGroupBy: boolean;
  hasUserAddedGroupBy: boolean;
  isMultiLevelGroupingApplied: boolean;
  handleGroupByArrayChangeWithReset: (groupBy: string[]) => void;
  handleClearGroupByFilter: () => void;
  handleMultiLevelGrouping: () => void;
}

export interface UnifiedDashboardTableDataConfig {
  transformedData: any[];
  groupedDataLoading: boolean;
  preFetchedIsLoading?: boolean;
  preFetchedData: { meta?: { total?: number } } | undefined;
  apiData: { meta?: { total?: number } } | null;
  isLoading: boolean;
  isFetching: boolean;
}

export interface UnifiedDashboardTableConfigParams {
  dashboardType: TDashboardType;
  selectedProgressFilter: TDashboardType;
  tableProgressFilter?: TDashboardType;
  sessionRole?: string;
  selection: UnifiedDashboardTableSelectionConfig;
  grouping: UnifiedDashboardTableGroupingConfig;
  data: UnifiedDashboardTableDataConfig;
  pageIndex: number;
  pageSize: number;
  search: string | null;
  columns: any[];
  expandedRowId: string | null;
  ExpandedRowComponent: React.ComponentType<{ expandedRowId: string; row: any }>;
  config: any;
  rowClassName: (row: any) => string;
  handleRowClick?: (row: any) => void;
  handleTransferredOfferToggle: () => void;
  hasTransferredOffer: boolean;
  getDynamicTitle: () => string;
}
