import type { ColumnDef } from '@tanstack/react-table';

/** Entity types that support agent/date filtering */
export type ActionBarEntityType =
  | 'Lead'
  | 'Offer'
  | 'User'
  | 'Team'
  | 'Opening'
  | 'Bank'
  | 'CashflowEntry'
  | 'CashflowTransaction'
  | 'Reclamation';

/** Props for the main CommonActionBar orchestrator */
export type CommonActionBarProps = {
  commonActionBarClasses?: string;
  actionBindUrlInQuery?: boolean;
  selectedItems: any[];
  handleClearSelection: () => void;
  onAppendQueryParams: (queryParams: any) => void;
  search: string;
  allColumns: any[];
  columnVisibility: any;
  handleColumnVisibilityChange: (key: string, isChecked: boolean) => void;
  setDeleteConfirmDialogOpen: (open: boolean) => void;
  setIsColumnOrderDialogOpen: (open: boolean) => void;
  isColumnOrderDialogOpen: boolean;
  children?: React.ReactNode;
  tableName?: string;
  tableId?: string;
  searchPlaceholder?: string;
  deleteButton?: boolean;
  filterData?: number | undefined;
  setFilterData?: (value: number | undefined) => void;
  selectedStatus?: string;
  onStatusChange?: (status: string | undefined) => void;
  selectedGroupBy?: string;
  onGroupByChange?: (groupBy: string | undefined) => void;
  selectedGroupByArray?: string[];
  onGroupByArrayChange?: (groupBy: string[]) => void;
  currentPage?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (pageNumber: number, newPageSize?: number) => void;
  showPagination?: boolean;
  extraActions?: React.ReactNode;
  showNavigation?: boolean;
  selectable?: boolean;
  showSearchInActionBar?: boolean;
  showActionsDropdown?: boolean;
  showSortingColumn?: boolean;
  onSelectAll?: () => void | Promise<void>;
  onClearFilterData?: () => void;
  onClearStatus?: () => void;
  onClearGroupBy?: () => void;
  onClearDynamicFilters?: () => void;
  hasFilterData?: boolean;
  hasSelectedStatus?: boolean;
  hasSelectedGroupBy?: boolean;
  hasDynamicFilters?: boolean;
  hasUserAddedGroupBy?: boolean;
  actionShowOptions?: boolean;
  showFiltersDropdown?: boolean;
  showSelectAllButton?: boolean;
  preservedFields?: string[];
  hideActionsForAgent?: boolean;
  buildApiFilters?: () => any[];
  isAllSelected?: boolean;
  bulkSearchPartnerIds?: string[];
  filterBtnComponent?: React.ReactNode;
  showStageGroupByButton?: boolean;
  isMultiLevelGroupingApplied?: boolean;
  onMultiLevelGrouping?: () => void;
  showProgressFilter?: boolean;
  selectedProgressFilter?: string;
  styleColumnSorting?: string;
  onProgressFilterChange?: (filter: string) => void;
  dashboardType?: string;
  showZoomButtons?: boolean;
  groupSortBy?: string;
  groupSortOrder?: 'asc' | 'desc';
  onGroupSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  hideProjectOption?: boolean;
  showTransferredOfferButton?: boolean;
  hasTransferredOffer?: boolean;
  onTransferredOfferToggle?: () => void;
  sectionTitle?: string;
  onBulkSearchOpen?: () => void;
  entityType?: ActionBarEntityType;
  leftCommonActions?: React.ReactNode;
  /** Shown in the left cluster only when SelectionBar and ActionsSection render nothing (e.g. no row selection). */
  idleLeftToolbar?: React.ReactNode;
  headerActionsPortalTargetId?: string;
  switchToActions?: React.ReactNode;
  externalCustomizeButtonRef?: React.RefObject<HTMLButtonElement | null>;
  compactSelectionButtons?: boolean;
};

/** Column key helper */
export const getColumnKey = (column: ColumnDef<any, any>): string | undefined => {
  if (column.id) return column.id;
  if ('accessorKey' in column && typeof column.accessorKey === 'string') return column.accessorKey;
  return undefined;
};

/** Column display label helper */
export const getColumnDisplayLabel = (column: ColumnDef<any, any>): string => {
  if (typeof column.header === 'string') return column.header;
  if (typeof column.header === 'function') {
    const headerResult = (column as any).header();
    if (headerResult?.props?.children) return headerResult.props.children;
    return column.id || 'Column';
  }
  if ('accessorKey' in column && typeof column.accessorKey === 'string') {
    return column.accessorKey
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  if (column.id) return column.id.charAt(0).toUpperCase() + column.id.slice(1);
  return 'Unnamed Column';
};
