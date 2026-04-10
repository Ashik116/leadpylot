import CommonActionBar from '@/components/shared/ActionBar/CommonActionBar';
import DataTable from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useColumnCustomization } from '@/hooks/useColumnCustomization';
import { useFilterChainLeads } from '@/hooks/useFilterChainLeads';
import { useGroupDetailsByDomain } from '@/services/hooks/useLeads';
import { GroupedLeadsGroup, GroupedLeadsSubGroup } from '@/services/LeadsService';
import { useFilterAwareLeadsNavigationStore } from '@/stores/navigationStores';
import { useApiUrlStore } from '@/stores/apiUrlStore';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import {
  getTableZoomContainerStyles,
  getTableZoomStyles,
  useTableZoomStore,
} from '@/stores/tableZoomStore';
import { getPaginationOptions } from '@/utils/paginationNumber';
import type { ColumnSort } from '@tanstack/react-table';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import OfferShortDetails from './OfferShortDetails';
// Add imports for bulk delete
import ConfirmDialog from '@/components/shared/ConfirmDialog';

import { useBulkActions } from '@/hooks/useBulkActions';
import { DashboardType } from '../../_components/dashboardTypes';
// Add import for group sorting store
import { useGroupSortingStore } from '@/stores/groupSortingStore';
import { useGroupedSortingStore } from '@/stores/groupedSortingStore';
import { formatGroupNameIfDate } from '@/utils/dateFormateUtils';
import { computeUniqueGroupId, extractGroupPathFromHierarchy } from '@/utils/groupUtils';
import {
  transformConfirmationsData,
  transformNettoData,
  transformOffersData,
  transformOpeningsData,
  transformPaymentData,
} from '../../_components/DataTransformUtils';
import useClient from '@/utils/hooks/useClient';
import { toDomainFiltersForApi } from '@/utils/filterUtils';

// Function to transform column names to display names (like in GroupedLeadsTable)
const getDisplayColumnName = (columnName: string): string => {
  const columnMappings: Record<string, string> = {
    contact_name: 'Contact',
    lead_source_no: 'Partner Id',
    investment_volume: 'Investment',
    interest_rate: 'Rate',
    payment_terms: 'Payment Terms',
    updated_at: 'Updated',
    status: 'Status',
    bankName: 'Bank',
  };

  return columnMappings[columnName] || columnName;
};

// Helper function to get the correct data key based on entity type
const getDataKey = (entityType: string) => {
  switch (entityType) {
    case 'offer':
      return 'offers';
    case 'opening':
      return 'openings';
    case 'confirmation':
      return 'confirmations';
    case 'payment':
      return 'payments';
    case 'netto':
    case 'netto1':
    case 'netto2':
      return 'offers';
    default:
      return entityType;
  }
};

interface GroupedOffersTableProps {
  data: GroupedLeadsGroup[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPaginationChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (offer: any) => void;
  onGroupClick?: (field: string, groupId: string, groupName: string) => void;
  renderableColumns: any[];
  expandedRowId?: string | null;
  onExpandedRowChange?: (expandedRowId: string | null) => void;
  isGroupedByFilter?: boolean;
  onGroupOffersDataChange?: (data: any, loading: boolean) => void;
  groupingFields?: string[];
  pendingOffersComponent?: boolean;
  groupedOffersFilters?: any[];
  onOfferSelectionChange?: (selectedOffers: any[]) => void;
  clearSelectionsSignal?: number;
  selectAllSignal?: number;
  entityType?: string;
  // Global selection state props
  selectedItems?: any[];
  selectedRows?: string[];
  // Action bar props - same as BaseTable
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  searchPlaceholder?: string;
  customActions?: React.ReactNode;
  headerActions?: React.ReactNode;
  selectedGroupBy?: string[];
  onGroupByChange?: (groupBy: string[]) => void;
  onClearGroupBy?: () => void;
  hasSelectedGroupBy?: boolean;
  hasUserAddedGroupBy?: boolean;
  // Additional props for proper action bar functionality
  search?: string;
  pageIndex?: number;
  totalItems?: number;
  showPagination?: boolean;
  showNavigation?: boolean;
  showSearchInActionBar?: boolean;
  showActionsDropdown?: boolean;
  selectable?: boolean;
  actionBindUrlInQuery?: boolean;
  // Data transformation function
  transformData?: (data: any[]) => any[];
  // NEW: Control whether Actions dropdown requires selection first
  actionShowOptions?: boolean;
  // NEW: External signal to force refetch after actions
  refreshSignal?: number;
  // Add sorting props
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  extraActions?: React.ReactNode;
  // New prop for FilterBtn component (for UnifiedDashboard)
  filterBtnComponent?: React.ReactNode;
  // Multi Level Grouping functionality
  isMultiLevelGroupingApplied?: boolean;
  onMultiLevelGrouping?: () => void;
  // NEW: Allow disabling internal action bar when hoisted externally
  showActionBar?: boolean;
  // Table zoom functionality
  enableZoom?: boolean;
  // Add apiUrl prop for navigation
  apiUrl?: string | null;
  // Transferred Offer filter props
  showTransferredOfferButton?: boolean;
  hasTransferredOffer?: boolean;
  onTransferredOfferToggle?: () => void;
  // Table height configuration
  tableClassName?: string;
  fixedHeight?: string | number;
}

const GroupedOffersTable: React.FC<GroupedOffersTableProps> = ({
  data,
  loading = false,
  total = 0,
  page = 1,
  pageSize = 10,
  onPaginationChange,
  onPageSizeChange,
  onRowClick,
  onGroupClick,
  renderableColumns,
  isGroupedByFilter = false,
  onGroupOffersDataChange,
  groupingFields = [],
  pendingOffersComponent = false,
  groupedOffersFilters,
  onOfferSelectionChange,
  clearSelectionsSignal,
  selectAllSignal,
  expandedRowId,
  entityType = 'offer',
  // Action bar props - same as BaseTable
  title,
  description,
  searchPlaceholder = 'Search...',
  customActions,
  headerActions,
  selectedGroupBy = [],
  onGroupByChange,
  onClearGroupBy,
  hasSelectedGroupBy = false,
  hasUserAddedGroupBy = false,
  // Additional props for proper action bar functionality
  search = '',
  pageIndex = 1,
  totalItems = 0,
  showPagination = true,
  showNavigation = true,
  showSearchInActionBar = true,
  showActionsDropdown = true,
  selectable = false,
  actionBindUrlInQuery = true,
  // Data transformation function
  transformData,
  actionShowOptions = true,
  refreshSignal = 0,
  // Global selection state props
  selectedItems,
  selectedRows,
  // Add sorting props
  sortBy = 'count',
  sortOrder = 'desc',
  onSortChange,
  extraActions,
  filterBtnComponent,
  // Multi Level Grouping functionality
  isMultiLevelGroupingApplied,
  onMultiLevelGrouping,
  showActionBar = true,
  // Table zoom functionality
  enableZoom = true,
  // Add apiUrl prop for navigation
  apiUrl = null,
  // Transferred Offer filter props
  showTransferredOfferButton = false,
  hasTransferredOffer = false,
  onTransferredOfferToggle,
  // Table height configuration
  tableClassName,
  fixedHeight,
}) => {
  // Table zoom functionality - memoize to prevent unnecessary re-renders
  const { zoomLevel } = useTableZoomStore();
  const zoomStyles = useMemo(
    () => (enableZoom ? getTableZoomStyles(zoomLevel) : {}),
    [enableZoom, zoomLevel]
  );
  const zoomContainerStyles = useMemo(
    () => (enableZoom ? getTableZoomContainerStyles(zoomLevel) : {}),
    [enableZoom, zoomLevel]
  );

  const [isColumnOrderDialogOpen, setIsColumnOrderDialogOpen] = useState(false);
  // State to track the expanded path through the hierarchy
  const [expandedPath, setExpandedPath] = useState<string[]>([]);
  // Local selection state per group (keyed by unique group id with context path)
  const [groupSelections, setGroupSelections] = useState<Record<string, any[]>>({});

  // State to trigger API call for offers
  const [selectedGroupPath, setSelectedGroupPath] = useState<{
    fields: string[];
    path: string[];
  } | null>(null);

  // State to track multiple selected group paths for independent API calls
  const [selectedGroupPaths, setSelectedGroupPaths] = useState<
    Record<
      string,
      {
        fields: string[];
        path: string[];
      }
    >
  >({});

  // Pagination state for each group - tracked by groupId (like GroupedLeadsTable)
  const [groupOffersPages, setGroupOffersPages] = useState<Record<string, number>>({});
  const [groupOffersPageSizes, setGroupOffersPageSizes] = useState<Record<string, number>>({});

  // Pagination state for group offers (main table - for backward compatibility)
  const [groupOffersPage, setGroupOffersPage] = useState(1);
  const [groupOffersPageSize, setGroupOffersPageSize] = useState(50);
  const [paginationKey, setPaginationKey] = useState(0);

  // Use global sorting store
  const { sortBy: globalSortBy, sortOrder: globalSortOrder, setSorting } = useGroupedSortingStore();

  // Use props if provided, otherwise use global store
  const currentSortBy = sortBy || globalSortBy;
  const currentSortOrder = sortOrder || globalSortOrder;

  // Sync global store with props when they change
  useEffect(() => {
    if (sortBy && sortOrder) {
      setSorting(sortBy, sortOrder);
    }
  }, [sortBy, sortOrder, setSorting]);

  // Add grouped offers page and page size state
  const [groupedOffersPage, setGroupedOffersPage] = useState(1);
  const [groupedOffersPageSize, setGroupedOffersPageSize] = useState(50);

  // Add state to track sorting for each group
  const [groupSortingStates, setGroupSortingStates] = useState<
    Record<string, { sortBy: string; sortOrder: 'asc' | 'desc' }>
  >({});

  // Use global selection store instead of internal state
  const { addSelectedItem, removeSelectedItem, clearSelectedItems, getSelectedItems } =
    useSelectedItemsStore();
  // Use different table names for different entity types to avoid conflicts
  const tableName = React.useMemo(() => {
    switch (entityType) {
      case DashboardType.OFFER:
        return 'offers';
      case DashboardType.OPENING:
        return 'openings';
      case DashboardType.CONFIRMATION:
        return 'confirmations';
      case DashboardType.PAYMENT:
        return 'payments';
      case 'netto':
      case 'netto1':
      case 'netto2':
        return 'offers';
      default:
        return 'offers';
    }
  }, [entityType]);

  // Use refs to queue parent notifications
  const pendingNotificationRef = useRef<any[] | null>(null);
  const isProcessingNotificationRef = useRef(false);

  // Navigation store methods
  const setFilteredItems = useFilterAwareLeadsNavigationStore((state) => state.setFilteredItems);
  const setCurrentFilteredIndex = useFilterAwareLeadsNavigationStore(
    (state) => state.setCurrentFilteredIndex
  );
  const setFilterState = useFilterAwareLeadsNavigationStore((state) => state.setFilterState);

  // Use the filter chain hook for consistent filter building
  const { buildApiFilters } = useFilterChainLeads({
    pendingLeadsComponent: pendingOffersComponent,
    // NEW: Pass the entityType as currentTab to enable proper page detection and Agent default filters
    currentTab: entityType,
    // NEW: Add support for Agent users to apply default group filters
    hasManuallyClearedGroupFilter: false,
  });

  // Column customization for action bar - same as BaseTable
  const {
    columnVisibility,
    handleColumnVisibilityChange,
    renderableColumns: visibleColumns,
  } = useColumnCustomization({
    tableName: tableName,
    columns: renderableColumns,
  });

  // Columns for CommonActionBar - same as BaseTable
  const columnsForActionBar = React.useMemo(
    () =>
      renderableColumns?.map((col: any) => ({
        id: col?.id || (col as any)?.accessorKey,
        header: () => (
          <span className="whitespace-nowrap">
            {typeof col?.header === 'string' ? col?.header : col?.id || 'Column'}
          </span>
        ),
      })),
    [renderableColumns]
  );

  // Customize button ref for action bar
  const customizeButtonRef = React.useRef<HTMLButtonElement>(null);

  // Setup bulk delete actions
  const deleteUrl = React.useMemo(() => {
    switch (entityType) {
      case 'offer':
        return '/offers/';
      case 'opening':
        return '/openings/';
      case 'confirmation':
        return '/confirmations/';
      case 'payment':
        return '/payment-vouchers/';
      case 'netto':
      case 'netto1':
      case 'netto2':
        return '/offers/';
      default:
        return '/offers/';
    }
  }, [entityType]);

  const bulkActions = useBulkActions({
    entityName: tableName,
    deleteUrl,
    invalidateQueries: [tableName, 'leads', 'grouped-leads', 'group-leads'],
    selectedRows: selectedRows || getSelectedItems(tableName)?.map((i: any) => i?._id),
    onClearSelection: () => {
      clearSelectedItems();
      setGroupSelections({});
      pendingNotificationRef.current = [];
    },
  });

  // Process pending notifications
  React.useEffect(() => {
    if (pendingNotificationRef.current !== null && !isProcessingNotificationRef.current) {
      isProcessingNotificationRef.current = true;
      const notification = pendingNotificationRef.current;
      pendingNotificationRef.current = null;
      setTimeout(() => {
        onOfferSelectionChange?.(notification);
        isProcessingNotificationRef.current = false;
      }, 0);
    }
  }, [onOfferSelectionChange]);

  // Helper function to queue parent notification - removed to fix infinite loop

  // Clear all selections when clearSelectionsSignal changes
  React.useEffect(() => {
    if (clearSelectionsSignal && clearSelectionsSignal > 0) {
      clearSelectedItems();
      // Also clear local per-group selections so headers update
      setGroupSelections({});
      // Call notification directly instead of using queueParentNotification
      pendingNotificationRef.current = [];
    }
  }, [clearSelectionsSignal, clearSelectedItems]);

  // Clear selections when group by filters are cleared
  React.useEffect(() => {
    if (!hasSelectedGroupBy && getSelectedItems(tableName)?.length > 0) {
      clearSelectedItems();
      // Call notification directly instead of using queueParentNotification
      pendingNotificationRef.current = [];
    }
  }, [hasSelectedGroupBy, clearSelectedItems, getSelectedItems, tableName]);

  // Build API filters
  const apiFilters = groupedOffersFilters || buildApiFilters();

  // API call to get offers data when a group is selected (domain-based API)
  const { data: offersData, isLoading: groupOffersLoading } = useGroupDetailsByDomain({
    entityType: entityType || 'offer',
    fields: selectedGroupPath?.fields || [],
    path: selectedGroupPath?.path || [],
    apiFilters: apiFilters as Array<{ field: string; operator: string; value: any }>,
    page: groupOffersPage,
    limit: groupOffersPageSize,
    sortBy: selectedGroupPath
      ? (() => {
          const currentGroupId = selectedGroupPath?.path[selectedGroupPath?.path?.length - 1];
          const groupSorting = groupSortingStates?.[currentGroupId];
          return groupSorting?.sortBy || undefined;
        })()
      : undefined,
    sortOrder: selectedGroupPath
      ? (() => {
          const currentGroupId = selectedGroupPath?.path[selectedGroupPath?.path?.length - 1];
          const groupSorting = groupSortingStates?.[currentGroupId];
          return (groupSorting?.sortOrder as 'asc' | 'desc') || undefined;
        })()
      : undefined,
    enabled: !!selectedGroupPath,
  });

  // CRITICAL FIX: Store paginated data for navigation (no need to fetch ALL offers)
  // Similar to regular offers page, we use pagination metadata for navigation
  React.useEffect(() => {
    const fetchAllGroupOffersForNavigation = async () => {
      // Only fetch if we have a selected group path and the group is expanded
      if (
        !selectedGroupPath ||
        !selectedGroupPath?.fields?.length ||
        !selectedGroupPath?.path?.length
      ) {
        return;
      }
      // Only update if we have a selected group path and data
      if (
        !selectedGroupPath ||
        !selectedGroupPath.fields.length ||
        !selectedGroupPath.path.length ||
        !offersData
      ) {
        return;
      }

      try {
        // Use domain-based API to fetch ALL offers in this group for navigation
        const { apiGetGroupDetails } = await import('@/services/LeadsService');

        const currentGroupId = selectedGroupPath?.path[selectedGroupPath?.path?.length - 1];
        const groupSorting = groupSortingStates?.[currentGroupId];

        const allGroupOffersResponse = await apiGetGroupDetails({
          entityType: entityType || 'offer',
          fields: selectedGroupPath?.fields || [],
          path: selectedGroupPath?.path || [],
          apiFilters: apiFilters as Array<{ field: string; operator: string; value: any }>,
          page: 1,
          limit: 999999,
          sortBy: groupSorting?.sortBy,
          sortOrder: groupSorting?.sortOrder,
        });

        const dataKey = getDataKey(entityType);
        const allGroupOffers =
          allGroupOffersResponse?.data?.[dataKey] || allGroupOffersResponse?.data?.offers || [];
        // Use the CURRENT PAGE data (already fetched by useGroupDetailsByDomain hook)

        // Map to lead-based IDs for next/prev navigation in lead details
        const leadsForNav = allGroupOffers
          ?.map((item: any) => ({ _id: item?.lead_id?._id || item?.offer_id?.lead_id?._id }))
          ?.filter((x: any) => Boolean(x?._id));

        // Deduplicate by _id while preserving order
        const seenIds = new Set<string>();
        const dedupedLeadsForNav = leadsForNav?.reduce(
          (acc: Array<{ _id: string }>, curr: { _id: string }) => {
            const id = String(curr?._id);
            if (!seenIds.has(id)) {
              seenIds.add(id);
              acc.push({ _id: id });
            }
            return acc;
          },
          []
        );

        // Update the navigation store with ALL offers in this group
        if (dedupedLeadsForNav?.length > 0) {
          setFilteredItems(dedupedLeadsForNav as any);
          setFilterState({
            groupBy: 'grouped',
            dynamicFilters: apiFilters,
            isGroupedMode: true,
            groupPath: selectedGroupPath?.path,
            groupFields: selectedGroupPath?.fields,
          });
          setCurrentFilteredIndex(-1);
        }
      } catch (error) {
        // Failed to fetch all group offers for navigation
        // Fallback to current page data
        const dataKey = getDataKey(entityType);
        const currentData = offersData?.data?.[dataKey] || [];
        const leadsForNav = currentData
          ?.map((item: any) => ({ _id: item?.lead_id?._id || item?.offer_id?.lead_id?._id }))
          ?.filter((x: any) => Boolean(x?._id));

        const seenIds = new Set<string>();
        const dedupedLeadsForNav = leadsForNav?.reduce(
          (acc: Array<{ _id: string }>, curr: { _id: string }) => {
            const id = String(curr._id);
            if (!seenIds.has(id)) {
              seenIds.add(id);
              acc.push({ _id: id });
            }
            return acc;
          },
          []
        );

        if (dedupedLeadsForNav?.length > 0) {
          setFilteredItems(dedupedLeadsForNav as any);
          setFilterState({
            groupBy: 'grouped',
            dynamicFilters: apiFilters,
            isGroupedMode: true,
            groupPath: selectedGroupPath?.path,
            groupFields: selectedGroupPath?.fields,
          });
        }
      }
    };

    fetchAllGroupOffersForNavigation();
    // Get pagination metadata from the response
    const paginationMeta = offersData?.meta
      ? {
        page: offersData.meta.page || 1,
        limit: offersData.meta.limit || 50,
        total: offersData.meta.total || 0,
        pages:
          offersData.meta.pages ||
          Math.ceil((offersData.meta.total || 0) / (offersData.meta.limit || 50)),
      }
      : undefined;

    // Update the navigation store with CURRENT PAGE data + pagination metadata
    const setFilteredItems = useFilterAwareLeadsNavigationStore.getState().setFilteredItems;
    const setFilterState = useFilterAwareLeadsNavigationStore.getState().setFilterState;

    // Fix: define dataKey for use here
    const dataKey = getDataKey(entityType);
    // Pass paginationMeta as second parameter to setFilteredItems
    setFilteredItems(offersData?.data?.[dataKey] || offersData?.data?.offers || [], paginationMeta);
    setFilterState({
      groupBy: 'grouped',
      dynamicFilters: apiFilters,
      isGroupedMode: true,
      groupPath: selectedGroupPath?.path || [],
      groupFields: selectedGroupPath?.fields || [],
      paginationMeta: paginationMeta, // Include pagination metadata in filterState
    });
  }, [
    selectedGroupPath,
    apiFilters,
    entityType,
    offersData,
    groupSortingStates,
    setCurrentFilteredIndex,
  ]);

  // Effect to clear navigation store when group is collapsed
  React.useEffect(() => {
    if (!selectedGroupPath && onGroupOffersDataChange) {
      // Clear the navigation store when no group is selected
      const clearFilterState = useFilterAwareLeadsNavigationStore.getState().clearFilterState;
      clearFilterState();
    }
  }, [selectedGroupPath, onGroupOffersDataChange]);

  // Select all visible offers when selectAllSignal changes
  React.useEffect(() => {
    if (selectAllSignal && selectAllSignal > 0 && offersData?.data) {
      const dataKey = getDataKey(entityType);
      const allVisibleItems = offersData?.data?.[dataKey] || [];
      if (allVisibleItems && allVisibleItems?.length > 0 && selectedGroupPath) {
        const currentGroupId = selectedGroupPath?.path[selectedGroupPath?.path?.length - 1];
        if (currentGroupId) {
          allVisibleItems?.forEach((item: any) => addSelectedItem(item, tableName));
          // Call notification directly instead of using queueParentNotification
          pendingNotificationRef.current = getSelectedItems(tableName);
        }
      }
    }
  }, [
    selectAllSignal,
    offersData,
    selectedGroupPath,
    addSelectedItem,
    entityType,
    tableName,
    getSelectedItems,
  ]);

  // Handle selection change for a specific group
  const handleGroupSelectionChange = React.useCallback(
    (groupId: string, checked: boolean, item: any) => {
      if (!selectable) {
        return;
      }
      // Update global store
      if (checked) {
        addSelectedItem(item, tableName);
      } else {
        removeSelectedItem(item?._id, tableName);
      }
      // Update local per-group selections (using unique group id provided by caller)
      setGroupSelections((prev) => {
        const current = prev[groupId] || [];
        const updated = checked ? [...current, item] : current?.filter((i) => i?._id !== item?._id);
        return { ...prev, [groupId]: updated };
      });
      // Notify parent
      pendingNotificationRef.current = getSelectedItems(tableName);
    },
    [addSelectedItem, removeSelectedItem, getSelectedItems, tableName, selectable]
  );

  // Handle select all for a specific group
  const handleGroupSelectAll = React.useCallback(
    (groupId: string, checked: boolean, allItems: any[]) => {
      if (!selectable) {
        return;
      }
      if (checked) {
        allItems?.forEach((item: any) => addSelectedItem(item, tableName));
      } else {
        allItems?.forEach((item: any) => removeSelectedItem(item?._id, tableName));
      }
      // Update local selections for the whole page
      setGroupSelections((prev) => {
        const updated = { ...prev };
        if (checked) {
          const existingIds = new Set((updated[groupId] || [])?.map((i: any) => i?._id));
          const merged = [
            ...(updated[groupId] || []),
            ...allItems?.filter((i) => !existingIds.has(i?._id)),
          ];
          updated[groupId] = merged;
        } else {
          const removeIds = new Set(allItems?.map((i) => i?._id));
          updated[groupId] = (updated[groupId] || [])?.filter((i: any) => !removeIds.has(i?._id));
        }
        return updated;
      });
      // Notify parent
      pendingNotificationRef.current = getSelectedItems(tableName);
    },
    [addSelectedItem, removeSelectedItem, getSelectedItems, tableName, selectable]
  );

  // Check if an item is selected in its group
  const isOfferSelected = React.useCallback(
    (groupId: string, itemId: string) => {
      const selectedItems = getSelectedItems(tableName);
      return selectedItems?.some((item) => item?._id === itemId);
    },
    [getSelectedItems, tableName]
  );

  // Check if all items in a group are selected
  const areAllOffersSelected = React.useCallback(
    (groupId: string, allItems: any[]) => {
      return allItems?.length > 0 && allItems?.every((item) => isOfferSelected(groupId, item?._id));
    },
    [isOfferSelected]
  );

  // Helper function to build the parent path hierarchy
  const buildParentPathHierarchy = (
    targetGroupId: string,
    targetOfferIds: string[],
    groups: GroupedLeadsGroup[],
    contextPath: string[] = []
  ): GroupedLeadsGroup | null => {
    const findPath = (
      group: GroupedLeadsGroup | GroupedLeadsSubGroup,
      path: (GroupedLeadsGroup | GroupedLeadsSubGroup)[] = []
    ): GroupedLeadsGroup | null => {
      const currentPath = [...path, group];

      if (
        group.groupId === targetGroupId &&
        'leadIds' in group &&
        Array.isArray(group.leadIds) &&
        group?.leadIds?.length > 0 &&
        JSON.stringify(group?.leadIds?.sort()) === JSON.stringify(targetOfferIds?.sort())
      ) {
        const currentPathIds = currentPath?.map((p) => p?.groupId)?.filter(Boolean);
        if (
          contextPath?.length === 0 ||
          (currentPathIds?.length >= contextPath?.length &&
            currentPathIds?.slice(0, contextPath?.length)?.join('|') === contextPath?.join('|'))
        ) {
          const rootGroup = {
            ...currentPath[0],
            subGroups: [],
          } as GroupedLeadsGroup;

          let currentLevel: GroupedLeadsGroup | GroupedLeadsSubGroup = rootGroup;
          for (let i = 1; i < currentPath?.length; i++) {
            const pathGroup = currentPath[i];
            const newSubGroup = {
              ...pathGroup,
              subGroups: [],
            } as GroupedLeadsSubGroup;

            currentLevel.subGroups = [newSubGroup];
            currentLevel = newSubGroup;
          }

          return rootGroup;
        }
      }

      if (group?.subGroups) {
        for (const subGroup of group.subGroups) {
          const result = findPath(subGroup, currentPath);
          if (result) return result;
        }
      }

      return null;
    };

    for (const group of groups) {
      const result = findPath(group);
      if (result) return result;
    }

    return null;
  };

  const toggleGroup = (
    groupId: string | null,
    group: GroupedLeadsGroup,
    contextPath: string[] = []
  ) => {
    if (!groupId) return;

    const uniqueGroupId = computeUniqueGroupId(contextPath, groupId);
    const currentIndex = expandedPath.indexOf(uniqueGroupId);

    if (currentIndex !== -1) {
      // Remove this group and all its children from the expanded path
      const newExpandedPath = expandedPath?.filter((path) => {
        // Keep paths that don't start with the current group's path
        return !path.startsWith(uniqueGroupId + '|') && path !== uniqueGroupId;
      });
      setExpandedPath(newExpandedPath);

      // If this was a leaf group, clear the API call for this specific group
      if (currentIndex === expandedPath?.length - 1) {
        const groupId = uniqueGroupId?.split('|')?.pop();
        if (groupId) {
          setSelectedGroupPaths((prev) => {
            const updated = { ...prev };
            delete updated[groupId];
            return updated;
          });

          // Clear the main selectedGroupPath if this was the last group
          if (Object?.keys(selectedGroupPaths)?.length === 1) {
            setSelectedGroupPath(null);
          }
        }
      }
      return;
    }

    const hasOfferIds =
      'leadIds' in group && Array.isArray(group?.leadIds) && group?.leadIds?.length > 0;
    const hasSubGroups = group?.subGroups && group?.subGroups?.length > 0;

    const findPathToGroup = (
      targetId: string,
      groups: GroupedLeadsGroup[],
      contextPath: string[] = []
    ): string[] => {
      const findInGroup = (
        group: GroupedLeadsGroup | GroupedLeadsSubGroup,
        path: string[] = []
      ): string[] | null => {
        const currentPath = [...path, group?.groupId!];

        if (group?.groupId === targetId) {
          if (
            contextPath?.length === 0 ||
            (currentPath?.length >= contextPath?.length &&
              currentPath?.slice(0, contextPath?.length)?.join('|') === contextPath?.join('|'))
          ) {
            return currentPath;
          }
        }

        if (group?.subGroups) {
          for (const subGroup of group?.subGroups) {
            const result = findInGroup(subGroup, currentPath);
            if (result) return result;
          }
        }

        return null;
      };

      for (const group of groups) {
        const result = findInGroup(group);
        if (result) return result;
      }

      return [];
    };

    const pathToGroup = findPathToGroup(groupId, data, contextPath);
    const pathIdentifiers = pathToGroup?.map((id, index) => {
      const partialPath = pathToGroup?.slice(0, index + 1);
      return partialPath?.join('|');
    });

    // Add the new path identifiers to the existing expanded path (don't replace)
    setExpandedPath((prevExpandedPath) => {
      const newExpandedPath = [...prevExpandedPath];

      // Add each path identifier if it's not already in the expanded path
      pathIdentifiers.forEach((pathId) => {
        if (!newExpandedPath?.includes(pathId)) {
          newExpandedPath.push(pathId);
        }
      });

      return newExpandedPath;
    });

    if (hasOfferIds) {
      const parentPathHierarchy = buildParentPathHierarchy(
        groupId,
        group?.leadIds as string[],
        data,
        contextPath
      );
      if (parentPathHierarchy) {
        const groupPath = extractGroupPathFromHierarchy(parentPathHierarchy);

        if (groupPath?.length > 0 && groupingFields?.length > 0) {
          const groupId = groupPath[groupPath?.length - 1];
          setSelectedGroupPaths((prev) => ({
            ...prev,
            [groupId]: {
              fields: groupingFields,
              path: groupPath,
            },
          }));

          // Set the main selectedGroupPath for the first expanded group (for pagination)
          if (!selectedGroupPath) {
            setSelectedGroupPath({
              fields: groupingFields,
              path: groupPath,
            });
          }

          setGroupOffersPage(1);
        }
      }
    } else if (hasSubGroups) {
      // For intermediate groups, just expand them to show subgroups
      // No API call needed as we're just showing the hierarchy structure
    }
  };

  // Pagination handlers
  const handlePaginationChange = (pageNumber: number) => {
    onPaginationChange?.(pageNumber);
  };

  const handlePageSizeChange = (option: any) => {
    onPageSizeChange?.(Number(option.value));
  };
  // test

  // Pagination handlers for group offers
  const handleGroupOffersPaginationChange = (pageNumber: number) => {
    setGroupOffersPage(pageNumber);
    setPaginationKey((prev) => prev + 1);
  };

  const handleGroupOffersPageSizeChange = (newPageSize: number) => {
    if (isNaN(newPageSize) || newPageSize <= 0) {
      return;
    }
    setGroupOffersPageSize(newPageSize);
    setGroupOffersPage(1);
    setPaginationKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main Card - same as BaseTable */}
      <Card>
        {(title || description || headerActions) && (
          <div className="flex items-center justify-between">
            <div className="mb-4 w-full">
              {title && typeof title === 'string' ? <h1 className="text-xl">{title}</h1> : title}
              {description && typeof description === 'string' ? <p>{description}</p> : description}
            </div>
            {headerActions && <div className="mb-4 flex items-center gap-2">{headerActions}</div>}
          </div>
        )}

        {showActionBar &&
          (isGroupedByFilter ||
            getSelectedItems(tableName)?.length > 0 ||
            selectedGroupBy?.length > 0) && (
            <Card>
              <div className="w-full">
                <div className="flex items-center justify-between gap-4">
                  <div className="grow">
                    <CommonActionBar
                      showActionsDropdown={showActionsDropdown}
                      showSearchInActionBar={showSearchInActionBar}
                      selectable={selectable}
                      selectedItems={getSelectedItems(tableName)}
                      handleClearSelection={() => {
                        clearSelectedItems();
                        setGroupSelections({});
                        // Call notification directly instead of using queueParentNotification
                        pendingNotificationRef.current = [];
                      }}
                      deleteButton={true}
                      onAppendQueryParams={() => { }}
                      actionBindUrlInQuery={actionBindUrlInQuery}
                      search={search}
                      searchPlaceholder={searchPlaceholder}
                      allColumns={columnsForActionBar}
                      columnVisibility={columnVisibility}
                      handleColumnVisibilityChange={handleColumnVisibilityChange}
                      setDeleteConfirmDialogOpen={bulkActions.setDeleteConfirmOpen}
                      setIsColumnOrderDialogOpen={setIsColumnOrderDialogOpen}
                      // customizeButtonRef={customizeButtonRef}
                      isColumnOrderDialogOpen={isColumnOrderDialogOpen}
                      tableName={tableName}
                      showPagination={showPagination}
                      currentPage={pageIndex}
                      pageSize={pageSize}
                      total={totalItems}
                      onPageChange={onPaginationChange}
                      showNavigation={showNavigation}
                      actionShowOptions={actionShowOptions}
                      isAllSelected={(() => {
                        const dataKey = getDataKey(entityType);
                        const allVisibleItems =
                          (offersData?.data && (offersData.data as any)[dataKey]) || [];
                        const selectedCount = getSelectedItems(tableName)?.length;
                        return (
                          selectedCount > 0 && selectedCount === (allVisibleItems?.length || 0)
                        );
                      })()}
                      // Add Group By filter props
                      selectedGroupByArray={selectedGroupBy}
                      onGroupByArrayChange={onGroupByChange}
                      onClearGroupBy={onClearGroupBy}
                      hasSelectedGroupBy={hasSelectedGroupBy}
                      hasUserAddedGroupBy={hasUserAddedGroupBy}
                      extraActions={extraActions}
                      // Add select all functionality
                      onSelectAll={() => {
                        if (offersData?.data) {
                          const dataKey = getDataKey(entityType);
                          const allVisibleItems = offersData?.data?.[dataKey] || [];
                          if (allVisibleItems?.length > 0 && selectedGroupPath) {
                            const currentGroupId =
                              selectedGroupPath?.path[selectedGroupPath?.path?.length - 1];
                            if (currentGroupId) {
                              allVisibleItems?.forEach((item: any) =>
                                addSelectedItem(item, tableName)
                              );
                              // Call notification directly instead of using queueParentNotification
                              pendingNotificationRef.current = getSelectedItems(tableName);
                            }
                          }
                        }
                      }}
                      // Add FilterBtn component for UnifiedDashboard
                      filterBtnComponent={filterBtnComponent}
                      // Add Multi Level Grouping props
                      isMultiLevelGroupingApplied={isMultiLevelGroupingApplied}
                      onMultiLevelGrouping={onMultiLevelGrouping}
                      // Group sorting controls for grouped tables
                      groupSortBy={currentSortBy}
                      groupSortOrder={currentSortOrder}
                      onGroupSortChange={(sortBy, sortOrder) => {
                        // Update global store
                        setSorting(sortBy, sortOrder);
                        setGroupedOffersPage(1);
                        onSortChange?.(sortBy, sortOrder);
                      }}
                      // Transferred Offer filter props
                      showTransferredOfferButton={showTransferredOfferButton}
                      hasTransferredOffer={hasTransferredOffer}
                      onTransferredOfferToggle={onTransferredOfferToggle}
                    >
                      {customActions}
                    </CommonActionBar>
                  </div>
                </div>
              </div>
            </Card>
          )}

        {/* Scrollable container with fixed height - similar to BaseTable */}
        <div
          className={`${tableClassName || 'max-h-[70dvh]'} space-y-4 overflow-y-auto pb-4`}
          style={
            fixedHeight
              ? { maxHeight: typeof fixedHeight === 'string' ? fixedHeight : `${fixedHeight}px` }
              : undefined
          }
        >
          <div
            className="table-zoom-container [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={zoomContainerStyles}
          >
            <div className="table-zoom-content" style={zoomStyles}>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Card key={index} bodyClass="p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton width="200px" height="20px" />
                        <Skeleton width="100px" height="16px" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : !data || data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-3">
                  <div className="text-base font-medium text-gray-500">No grouped offers found</div>
                  <div className="mt-0.5 text-xs text-gray-400">
                    Try adjusting your filters or search criteria
                  </div>
                </div>
              ) : (
                data?.map((group) => (
                  <GroupItem
                    key={group?.groupId || `group-${group?.groupName}`}
                    group={group}
                    level={0}
                    groupingFields={groupingFields}
                    expandedRowId={expandedRowId}
                    expandedPath={expandedPath}
                    contextPath={[]}
                    onToggleGroup={toggleGroup}
                    onGroupClick={onGroupClick}
                    onRowClick={onRowClick}
                    renderableColumns={visibleColumns}
                    onGroupOffersDataChange={onGroupOffersDataChange}
                    isGroupedByFilter={isGroupedByFilter}
                    offersData={offersData}
                    isLoading={groupOffersLoading}
                    onPaginationChange={handleGroupOffersPaginationChange}
                    onPageSizeChange={handleGroupOffersPageSizeChange}
                    page={groupOffersPage}
                    pageSize={groupedOffersPageSize}
                    total={offersData?.meta?.total || 0}
                    // groupSelections prop removed - using global store instead
                    onGroupSelectionChange={handleGroupSelectionChange}
                    onGroupSelectAll={handleGroupSelectAll}
                    isOfferSelected={isOfferSelected}
                    areAllOffersSelected={areAllOffersSelected}
                    apiFilters={apiFilters}
                    entityType={offersData?.meta?.entityType || entityType}
                    selectable={selectable}
                    groupSelections={groupSelections}
                    refreshSignal={refreshSignal}
                    // Add individual group pagination state props (like GroupedLeadsTable)
                    groupOffersPages={groupOffersPages}
                    groupOffersPageSizes={groupOffersPageSizes}
                    setGroupOffersPages={setGroupOffersPages}
                    setGroupOffersPageSizes={setGroupOffersPageSizes}
                    // Pass breadcrumb path props
                    parentGroupNames={[]}
                    // Table zoom functionality
                    enableZoom={enableZoom}
                    // Table height configuration
                    tableClassName={tableClassName}
                    fixedHeight={fixedHeight}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Fixed pagination at bottom - similar to BaseTable */}
        {data?.length > 0 && total > 0 && total > 10 && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Pagination
                pageSize={pageSize}
                currentPage={page}
                total={total}
                onChange={handlePaginationChange}
              />
              <div style={{ minWidth: 130 }}>
                <Select
                  size="sm"
                  menuPlacement="top"
                  isSearchable={false}
                  value={getPaginationOptions(total)
                    ?.map((size) => ({
                      value: size,
                      label: `${size} per page`,
                    }))
                    ?.filter((option) => option?.value === pageSize)}
                  options={getPaginationOptions(total)?.map((size) => ({
                    value: size,
                    label: `${size} per page`,
                  }))}
                  onChange={handlePageSizeChange}
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        type="warning"
        isOpen={bulkActions?.deleteConfirmOpen}
        title="Warning"
        onCancel={() => bulkActions.setDeleteConfirmOpen(false)}
        onConfirm={bulkActions.handleDeleteConfirm}
        confirmButtonProps={{ disabled: bulkActions?.isDeleting }}
      >
        <p>
          Are you sure you want to delete {getSelectedItems(tableName)?.length} {tableName}?
        </p>
      </ConfirmDialog>
    </div>
  );
};

// Component to handle group offers content with API call
const GroupOffersContent: React.FC<{
  groupingFields: string[];
  group: GroupedLeadsGroup;
  onRowClick?: (offer: any) => void;
  renderableColumns: any[];
  onGroupOffersDataChange?: (data: any, loading: boolean) => void;
  enableApiCall?: boolean;
  offersData?: any;
  isLoading?: boolean;
  onPaginationChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  page?: number;
  pageSize?: number;
  total?: number;
  groupId: string;
  onGroupSelectionChange: (groupId: string, checked: boolean, offer: any) => void;
  onGroupSelectAll: (groupId: string, checked: boolean, allOffers: any[]) => void;
  isOfferSelected: (groupId: string, offerId: string) => boolean;
  areAllOffersSelected: (groupId: string, allOffers: any[]) => boolean;
  expandedRowId?: string | null;
  selectedGroupPath?: { fields: string[]; path: string[] } | null;
  apiFilters?: any;
  entityType?: string;
  isGroupedByFilter?: boolean;
  transformData?: (data: any[]) => any[];
  selectable?: boolean;
  // Add individual group pagination state props (like GroupedLeadsTable)
  groupOffersPages?: Record<string, number>;
  groupOffersPageSizes?: Record<string, number>;
  setGroupOffersPages?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setGroupOffersPageSizes?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  refreshSignal?: number;
  // Table zoom functionality
  enableZoom?: boolean;
  // Add apiUrl prop for navigation
  apiUrl?: string | null;
  // Table height configuration
  tableClassName?: string;
  fixedHeight?: string | number;
}> = ({
  renderableColumns,
  offersData,
  isLoading = false,
  onPaginationChange,
  onPageSizeChange,
  page = 1,
  pageSize = 50,
  total = 0,
  onRowClick,
  groupId,
  onGroupSelectionChange,
  onGroupSelectAll,
  isOfferSelected,
  areAllOffersSelected,
  entityType = 'offer',
  isGroupedByFilter = false,
  transformData,
  selectable = false,
  expandedRowId,
  selectedGroupPath,
  apiFilters,
  // Add individual group pagination state props
  groupOffersPages,
  groupOffersPageSizes,
  setGroupOffersPages,
  setGroupOffersPageSizes,
  refreshSignal = 0,
  // Table zoom functionality
  enableZoom = true,
  // Add apiUrl prop for navigation
  apiUrl = null,
  // Table height configuration
  tableClassName,
  fixedHeight,
}) => {
    // Use persistent sorting store for this specific group (like GroupedLeadsTable)
    const { setGroupSorting, getGroupSorting } = useGroupSortingStore();
    const groupSortingData = getGroupSorting(groupId);
    const { sortBy: currentSortBy, sortOrder: currentSortOrder, sortClickCount } = groupSortingData;

    // Add state for individual group's API call (moved up to be accessible in callbacks)
    const [groupPaginationKey, setGroupPaginationKey] = useState(0);
    const [currentApiUrl, setCurrentApiUrl] = useState<string>('');

    // Enhanced columns with onRowClick prop for CellInlineEdit components
    const enhancedColumns = React.useMemo(() => {
      return renderableColumns?.map((column: any) => {
        // Check if this column uses CellInlineEdit
        if (column?.cell && typeof column?.cell === 'function') {
          const originalCell = column?.cell;
          return {
            ...column,
            cell: (props: any) => {
              const cellElement = originalCell(props);

              // Check if the cell element is CellInlineEdit
              if (cellElement && cellElement?.type && cellElement?.type?.name === 'CellInlineEdit') {
                // Clone the element and add onRowClick prop
                return React.cloneElement(cellElement, {
                  ...cellElement?.props,
                  onRowClick: (offer: any) => {
                    // Use the stored API URL from state and pass it to parent's onRowClick
                    if (currentApiUrl && onRowClick) {
                      // Add the API URL as a parameter to the offer object for navigation
                      const offerWithApiUrl = {
                        ...offer,
                        _apiUrl: currentApiUrl,
                      };

                      // Call the parent's onRowClick with the enhanced offer data (for details page navigation)
                      onRowClick(offerWithApiUrl);
                    } else if (onRowClick) {
                      // Fallback to regular row click without API URL
                      onRowClick(offer);
                    }
                  },
                  // Pass the API URL directly to CellInlineEdit so it can access it
                  apiUrl: currentApiUrl,
                });
              }

              return cellElement;
            },
          };
        }

        return column;
      });
    }, [renderableColumns, currentApiUrl, onRowClick]);

    // Convert group sorting state to DataTable format
    const externalSorting: ColumnSort[] = useMemo(() => {
      if (currentSortBy && currentSortBy?.trim() !== '') {
        return [{ id: currentSortBy, desc: currentSortOrder === 'desc' }];
      }
      return [];
    }, [currentSortBy, currentSortOrder]);

    // Handle external sorting changes from DataTable
    const handleExternalSortingChange = useCallback(
      (newSorting: ColumnSort[]) => {
        if (newSorting?.length > 0) {
          const sort = newSorting[0];
          // Safety check to ensure sort object has expected properties
          if (!sort || typeof sort?.id === 'undefined') {
            return;
          }
          const newSortBy = sort?.id;
          const newSortOrder = sort?.desc ? 'desc' : 'asc';

          // Calculate new click count for 3-state sorting
          const currentCount = sortClickCount || 0;
          let newCount = currentCount + 1;

          // If switching to a different column, reset count to 1
          if (currentSortBy !== newSortBy) {
            newCount = 1;
          }

          setGroupSorting(groupId, newSortBy, newSortOrder, newCount);

          // Reset page and force refetch
          if (setGroupOffersPages) {
            setGroupOffersPages((prev) => ({ ...prev, [groupId]: 1 }));
            setGroupPaginationKey((prev) => prev + 1);
          }
        } else {
          // Clear sorting
          setGroupSorting(groupId, '', 'asc', 0);

          // Reset page and force refetch
          if (setGroupOffersPages) {
            setGroupOffersPages((prev) => ({ ...prev, [groupId]: 1 }));
            setGroupPaginationKey((prev) => prev + 1);
          }
        }
      },
      [
        groupId,
        currentSortBy,
        sortClickCount,
        setGroupSorting,
        setGroupOffersPages,
        setGroupPaginationKey,
      ]
    );

    // Column mapping function to convert frontend column names to API field names
    const getApiFieldName = (columnName: string): string => {
      const columnMapping: Record<string, string> = {
        leadName: 'contact_name',
        partnerId: 'lead_source_no',
        bankName: 'bankName',
        investment_volume: 'investment_volume',
        interest_rate: 'interest_rate',
        interestMonth: 'payment_terms',
        updatedAt: 'updated_at',
        status: 'status',
      };
      return columnMapping[columnName] || columnName;
    };

    // State for pagination - use global state to persist across collapse/expand (like GroupedLeadsTable)
    const groupPage = groupOffersPages?.[groupId] || page || 1;
    const groupPageSize = groupOffersPageSizes?.[groupId] || pageSize || 50;

    // Individual group API call with sorting (domain-based API)
    const { data: individualGroupData, isLoading: individualGroupLoading } = useGroupDetailsByDomain({
      entityType: entityType || 'offer',
      fields: selectedGroupPath?.fields || [],
      path: selectedGroupPath?.path || [],
      apiFilters: apiFilters as Array<{ field: string; operator: string; value: any }>,
      page: groupPage,
      limit: groupPageSize,
      sortBy: currentSortBy ? getApiFieldName(currentSortBy) : undefined,
      sortOrder: currentSortOrder,
      enabled: !!selectedGroupPath,
    });

    // Build API URL for navigation (domain-based format)
    React.useEffect(() => {
      if (
        selectedGroupPath &&
        selectedGroupPath?.fields?.length > 0 &&
        selectedGroupPath?.path?.length > 0
      ) {
        // Build domain from group path: [[field1, "=", path1], [field2, "=", path2], ...]
        const groupDomain = selectedGroupPath.fields.map((field, i) => [
          field,
          '=',
          selectedGroupPath.path[i] || '',
        ]);
        const filterDomain = toDomainFiltersForApi(apiFilters || []);
        const domain = [...groupDomain, ...filterDomain];

        const hasProgress = ['opening', 'confirmation', 'payment', 'netto1', 'netto2'].includes(
          entityType || ''
        );
        const baseUrl = hasProgress ? '/offers/progress' : '/offers';

        const queryParams = new URLSearchParams({
          page: groupPage.toString(),
          limit: groupPageSize.toString(),
          includeAll: 'true',
          domain: JSON.stringify(domain),
          ...(hasProgress && { has_progress: entityType === 'netto' ? 'netto1' : entityType || '' }),
          ...(currentSortBy && { sortBy: currentSortBy, sortOrder: currentSortOrder }),
        });

        const fullApiUrl = `${baseUrl}?${queryParams.toString()}`;
        setCurrentApiUrl(fullApiUrl);

        const { setApiUrl } = useApiUrlStore.getState();
        setApiUrl(fullApiUrl);
      }
    }, [
      selectedGroupPath,
      groupPage,
      groupPageSize,
      groupPaginationKey,
      apiFilters,
      currentSortBy,
      currentSortOrder,
      groupId,
    ]);

    // Trigger refetch when external refreshSignal changes
    React.useEffect(() => {
      setGroupPaginationKey((prev) => prev + 1);
    }, [refreshSignal]);

    // Use individual group's data if available, otherwise fall back to parent's data
    const groupOffersData = individualGroupData || offersData;
    const groupOffersLoading = individualGroupLoading || isLoading;

    // Pagination handlers for this group - use global state setters (like GroupedLeadsTable)
    const handleGroupPaginationChange = (pageNumber: number) => {
      if (setGroupOffersPages) {
        setGroupOffersPages((prev) => ({ ...prev, [groupId]: pageNumber }));
        setGroupPaginationKey((prev) => prev + 1); // Force query refetch
      } else {
        onPaginationChange?.(pageNumber);
      }
    };

    const handleGroupPageSizeChange = (newPageSize: number) => {
      // Validate the page size
      if (isNaN(newPageSize) || newPageSize <= 0) {
        return;
      }
      if (setGroupOffersPageSizes && setGroupOffersPages) {
        setGroupOffersPageSizes((prev) => ({ ...prev, [groupId]: newPageSize }));
        setGroupOffersPages((prev) => ({ ...prev, [groupId]: 1 })); // Reset to first page when changing page size
        setGroupPaginationKey((prev) => prev + 1); // Force query refetch
      } else {
        onPageSizeChange?.(newPageSize);
      }
    };

    if (groupOffersLoading) {
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {Array.from({ length: renderableColumns?.length }, (_, colIndex) => (
                  <th key={`header-${colIndex}`} className="px-4 py-3 text-left">
                    <Skeleton width="80px" height="16px" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }, (_, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-b border-gray-100">
                  {Array.from({ length: renderableColumns?.length }, (_, colIndex) => (
                    <td key={`cell-${rowIndex}-${colIndex}`} className="px-4 py-3">
                      <Skeleton width="100px" height="16px" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    const dataKey = getDataKey(entityType);
    if (!groupOffersData?.data?.[dataKey] || groupOffersData?.data?.[dataKey]?.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-2">
          <div className="text-xs text-gray-500">No {entityType}s found in this group</div>
        </div>
      );
    }

    // Page size options for the select dropdown
    const pageSizeOptions = getPaginationOptions(groupOffersData?.meta?.total || total);
    const allOffers = groupOffersData?.data?.[dataKey];

    // Handle sorting change for group details (same pattern as GroupLeadsTable)
    const handleSort = (sort: { order: 'asc' | 'desc' | ''; key: string | number }) => {
      // 3-state sorting cycle: asc -> desc -> no sort
      if (sort?.key) {
        const newCount = sortClickCount + 1;
        let newSortBy = '';
        let newSortOrder: 'asc' | 'desc' = 'asc';

        if (newCount % 3 === 1) {
          // First click: asc
          newSortBy = sort?.key as string;
          newSortOrder = 'asc';
        } else if (newCount % 3 === 2) {
          // Second click: desc
          newSortBy = sort?.key as string;
          newSortOrder = 'desc';
        } else if (newCount % 3 === 0) {
          // Third click: no sort (remove sorting)
          newSortBy = '';
          newSortOrder = 'asc';
        }

        setGroupSorting(groupId, newSortBy, newSortOrder, newCount);

        // Reset page and force refetch
        if (onPaginationChange) {
          onPaginationChange(1);
        }

        // Force individual group API refetch by updating pagination key
        setGroupPaginationKey((prev) => prev + 1);
      } else {
        // No sort key provided - ignore
      }
    };
    // Transform the data using the provided transformData function or fallback to DataTransformUtils
    const transformedOffers = transformData
      ? transformData(allOffers)
      : (() => {
        // Handle different entity types and use appropriate transformation function
        let transformFunction;
        switch (entityType) {
          case 'offer':
            transformFunction = transformOffersData;
            break;
          case 'opening':
            transformFunction = transformOpeningsData;
            break;
          case 'confirmation':
            transformFunction = transformConfirmationsData;
            break;
          case 'payment':
            transformFunction = transformPaymentData;
            break;
          case 'netto':
          case 'netto1':
          case 'netto2':
            transformFunction = transformNettoData;
            break;
          default:
            transformFunction = transformOffersData;
        }

        // For non-offer entity types, we need to extract the offer data from offer_id
        const dataToTransform =
          entityType === 'offer'
            ? allOffers
            : allOffers?.map((item: any) => item?.offer_id || item)?.filter(Boolean);

        return transformFunction(dataToTransform);
      })();

    // Create a mapping from transformed item _id to original item for selection handlers
    const originalItemMap = new Map();
    allOffers?.forEach((item: any) => {
      originalItemMap.set(item?._id, item);
    });

    // Calculate dynamic height based on number of rows
    // Use custom fixedHeight if provided, otherwise use dynamic calculation
    const calculateDynamicHeight = (rowCount: number) => {
      if (fixedHeight) {
        return typeof fixedHeight === 'string' ? fixedHeight : `${fixedHeight}px`;
      }
      if (rowCount < 10) return 'auto';
      return '50vh';
    };

    // Calculate the dynamic height based on the number of rows
    const dynamicHeight = calculateDynamicHeight(allOffers?.length);

    return (
      <div className="space-y-2" key={`group-offers-${groupId}-${groupPage}`}>
        <DataTable
          data={transformedOffers}
          loading={groupOffersLoading}
          columns={enhancedColumns}
          showPagination={(groupOffersData?.meta?.total || total) > 10}
          selectable={selectable}
          noData={!allOffers?.length}
          rowClassName={(row: any) =>
            isOfferSelected(groupId, String(row?.original?._id ?? '')) ? 'bg-gray-300' : ''
          }
          pagingData={{
            pageIndex: groupPage,
            pageSize: groupPageSize,
            total: groupOffersData?.meta?.total || total,
          }}
          renderExpandedRow={(row: any) => {
            return <OfferShortDetails expandedRowId={expandedRowId || ''} row={row} />;
          }}
          pageSizes={pageSizeOptions}
          onPaginationChange={handleGroupPaginationChange}
          onRowClick={onRowClick}
          onSort={handleSort} // Keep for backward compatibility
          fixedHeight={dynamicHeight}
          // External sorting props
          externalSorting={externalSorting}
          onExternalSortingChange={handleExternalSortingChange}
          enableZoom={enableZoom}
          // Selection handlers - same as GroupedLeadsTable
          checkboxChecked={(transformedItem: any) => isOfferSelected(groupId, transformedItem?._id)}
          onCheckBoxChange={(checked: boolean, transformedItem: any) => {
            const originalItem = originalItemMap.get(transformedItem?._id);
            if (originalItem) {
              onGroupSelectionChange(groupId, checked, originalItem);
            }
          }}
          onIndeterminateCheckBoxChange={(checked: boolean, rows: any[]) => {
            const originalItems = rows
              ?.map((row) => originalItemMap.get(row?.original?._id))
              ?.filter(Boolean);
            if (originalItems?.length > 0) {
              onGroupSelectAll(groupId, checked, originalItems);
            }
          }}
          indeterminateCheckboxChecked={(rows: any[]) => {
            const originalItems = rows
              ?.map((row) => originalItemMap.get(row?.original?._id))
              ?.filter(Boolean);
            return areAllOffersSelected(groupId, originalItems);
          }}
          onSelectChange={handleGroupPageSizeChange}
        />
      </div>
    );
  };

// Recursive component to render group items and their subgroups
const GroupItem: React.FC<{
  group: GroupedLeadsGroup | GroupedLeadsSubGroup;
  level: number;
  expandedRowId?: string | null;
  groupingFields: string[];
  expandedPath: string[];
  contextPath: string[];
  onToggleGroup: (groupId: string | null, group: GroupedLeadsGroup, contextPath: string[]) => void;
  onGroupClick?: (field: string, groupId: string, groupName: string) => void;
  onRowClick?: (offer: any) => void;
  renderableColumns: any[];
  onGroupOffersDataChange?: (data: any, loading: boolean) => void;
  isGroupedByFilter?: boolean;
  offersData?: any;
  isLoading?: boolean;
  onPaginationChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  page?: number;
  pageSize?: number;
  total?: number;
  onGroupSelectionChange: (groupId: string, checked: boolean, offer: any) => void;
  onGroupSelectAll: (groupId: string, checked: boolean, allOffers: any[]) => void;
  isOfferSelected: (groupId: string, offerId: string) => boolean;
  areAllOffersSelected: (groupId: string, allOffers: any[]) => boolean;
  apiFilters?: any;
  entityType?: string;
  transformData?: (data: any[]) => any[];
  selectable?: boolean;
  // new: local per-group selection map (unique id => items)
  groupSelections: Record<string, any[]>;
  // Add individual group pagination state props (like GroupedLeadsTable)
  groupOffersPages: Record<string, number>;
  groupOffersPageSizes: Record<string, number>;
  setGroupOffersPages: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setGroupOffersPageSizes: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  refreshSignal?: number;
  // Add props for breadcrumb path
  parentGroupNames?: string[];
  // Table zoom functionality
  enableZoom?: boolean;
  // Add apiUrl prop for navigation
  apiUrl?: string | null;
  // Table height configuration
  tableClassName?: string;
  fixedHeight?: string | number;
}> = ({
  group,
  level,
  groupingFields,
  expandedPath,
  contextPath,
  onToggleGroup,
  onGroupClick,
  onRowClick,
  renderableColumns,
  onGroupOffersDataChange,
  isGroupedByFilter = false,
  offersData,
  isLoading = false,
  onPaginationChange,
  onPageSizeChange,
  page = 1,
  pageSize = 50,
  total = 0,
  onGroupSelectionChange,
  onGroupSelectAll,
  isOfferSelected,
  areAllOffersSelected,
  apiFilters,
  entityType = 'offer',
  transformData,
  selectable = false,
  expandedRowId,
  groupSelections,
  // Add individual group pagination state props
  groupOffersPages,
  groupOffersPageSizes,
  setGroupOffersPages,
  setGroupOffersPageSizes,
  refreshSignal = 0,
  // Add props for breadcrumb path
  parentGroupNames = [],
  // Table zoom functionality
  enableZoom = true,
  // Add apiUrl prop for navigation
  apiUrl = null,
  // Table height configuration
  tableClassName,
  fixedHeight,
}) => {
    const uniqueGroupId =
      contextPath?.length > 0 ? [...contextPath, group?.groupId!].join('|') : group?.groupId!;
    const isExpanded = group?.groupId ? expandedPath?.includes(uniqueGroupId) : false;
    const hasSubGroups = group?.subGroups && group?.subGroups?.length > 0;
    const hasOfferIds = 'leadIds' in group && group?.leadIds && group?.leadIds?.length > 0;

    // Generate breadcrumb path with last segment colored green
    const generateGroupPathWithColoredLastSegment = (level: number, groupName: string) => {
      if (level === 0) {
        return formatGroupNameIfDate(groupName);
      }

      // Build the path by combining parent group names with current group name
      const pathSegments = [...parentGroupNames, groupName];

      if (pathSegments.length === 1) {
        return <span className="text-green-600">{formatGroupNameIfDate(pathSegments[0])}</span>;
      }

      return (
        <>
          {pathSegments?.slice(0, -1)?.map((segment, index) => (
            <span key={index}>
              {formatGroupNameIfDate(segment)}
              {index < pathSegments?.length - 2 && ' > '}
            </span>
          ))}
          <span className="text-green-600">
            {' > '}
            {formatGroupNameIfDate(pathSegments[pathSegments.length - 1])}
          </span>
        </>
      );
    };

    return (
      <Card
        bodyClass="p-0"
        className={`${isExpanded && hasOfferIds && group?.count > 10 ? 'mb-14' : 'mb-1'} ${level === 0 ? 'my-2' : ''}`}
      >
        {/*  <div className="flex items-center justify-between border-b bg-gray-50 p-1"> */}
        <div
          className={`flex items-center justify-between border-b bg-gray-50 p-1 ${hasSubGroups || hasOfferIds ? 'cursor-pointer hover:bg-gray-100' : ''
            }`}
          onClick={(e) => {
            if (hasSubGroups || hasOfferIds) {
              e.stopPropagation();
              e.preventDefault();
              if (group?.groupId) {
                onToggleGroup(group?.groupId, group as GroupedLeadsGroup, contextPath);
              }
            }
          }}
        >
          {/* Left side: Arrow + Group name + Offer count */}
          <div
            className="flex items-center gap-1"
            style={{
              marginLeft: `${level * 80}px`,
            }}
          >
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-semibold text-gray-900 capitalize">
                {formatGroupNameIfDate(group?.groupName)}
              </h3>
              <p className="text-xs text-gray-600">
                {group?.count} {group?.count === 1 ? entityType : 'offers'}
                {(() => {
                  const currentUniqueId =
                    contextPath?.length > 0
                      ? [...contextPath, group?.groupId!].join('|')
                      : group?.groupId!;
                  const direct = groupSelections[currentUniqueId]?.length || 0;
                  let descendant = 0;
                  const hasSubGroupsLocal = group?.subGroups && group?.subGroups?.length > 0;
                  const traverse = (subs: any[], ctx: string[]) => {
                    subs?.forEach((sg) => {
                      const id = ctx?.length > 0 ? [...ctx, sg?.groupId!].join('|') : sg?.groupId!;
                      descendant += groupSelections[id]?.length || 0;
                      if (sg.subGroups?.length) traverse(sg.subGroups, [...ctx, sg.groupId!]);
                    });
                  };
                  if (hasSubGroupsLocal)
                    traverse(group?.subGroups!, [...contextPath, group?.groupId!]);
                  const totalSel = direct + descendant;

                  // Show sorting info when group has offer IDs (regardless of expanded state)
                  const sortingText = (() => {
                    if (!hasOfferIds) return null;

                    // Get sorting info from Zustand store (the actual source of truth)
                    const { getGroupSorting } = useGroupSortingStore.getState();
                    const sortingInfo = getGroupSorting(currentUniqueId);
                    const sortingText =
                      sortingInfo && sortingInfo?.sortBy
                        ? `${getDisplayColumnName(sortingInfo?.sortBy)} = ${sortingInfo?.sortOrder}`
                        : '';

                    return sortingText;
                  })();

                  return (
                    <>
                      {totalSel > 0 && (
                        <span className="ml-1 font-medium text-blue-600">({totalSel} selected)</span>
                      )}
                      {sortingText && (
                        <span className="ml-1 font-medium text-green-600">{sortingText}</span>
                      )}
                    </>
                  );
                })()}
              </p>
            </div>
            {(hasSubGroups || hasOfferIds) && (
              <Button
                variant="plain"
                size="sm"
                icon={
                  <ApolloIcon
                    name={isExpanded ? 'arrow-down' : 'arrow-right'}
                    className="text-base"
                  />
                }
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (group?.groupId) {
                    onToggleGroup(group?.groupId, group as GroupedLeadsGroup, contextPath);
                  }
                }}
              />
            )}
          </div>

          {/* Right side: Breadcrumb path */}
          {level > 0 && (
            <div className="text-xs font-normal text-gray-500">
              {generateGroupPathWithColoredLastSegment(level, group?.groupName)}
            </div>
          )}
        </div>

        {/* Group Content */}
        {isExpanded && (
          <div className={`${isGroupedByFilter ? 'p-0' : 'p-1'} ${level >= 0 ? 'mt-2' : ''}`}>
            {hasOfferIds ? (
              <GroupOffersContent
                groupingFields={groupingFields}
                group={group as GroupedLeadsGroup}
                onRowClick={onRowClick}
                renderableColumns={renderableColumns}
                expandedRowId={expandedRowId}
                onGroupOffersDataChange={onGroupOffersDataChange}
                enableApiCall={!isGroupedByFilter}
                offersData={offersData}
                isLoading={isLoading}
                onPaginationChange={onPaginationChange}
                onPageSizeChange={onPageSizeChange}
                page={page}
                pageSize={pageSize}
                total={total}
                groupId={uniqueGroupId}
                onGroupSelectionChange={onGroupSelectionChange}
                onGroupSelectAll={onGroupSelectAll}
                isOfferSelected={isOfferSelected}
                areAllOffersSelected={areAllOffersSelected}
                selectedGroupPath={{
                  fields: groupingFields,
                  path: [...contextPath, group?.groupId!],
                }}
                apiFilters={apiFilters}
                entityType={entityType}
                isGroupedByFilter={isGroupedByFilter}
                transformData={transformData}
                selectable={selectable}
                // Add individual group pagination state props (like GroupedLeadsTable)
                groupOffersPages={groupOffersPages}
                groupOffersPageSizes={groupOffersPageSizes}
                setGroupOffersPages={setGroupOffersPages}
                setGroupOffersPageSizes={setGroupOffersPageSizes}
                refreshSignal={refreshSignal}
                // Table zoom functionality
                enableZoom={enableZoom}
                // Add apiUrl prop for navigation
                apiUrl={apiUrl}
                // Table height configuration
                tableClassName={tableClassName}
                fixedHeight={fixedHeight}
              />
            ) : hasSubGroups ? (
              <div className="space-y-0">
                {group?.subGroups?.map((subGroup) => (
                  <GroupItem
                    key={subGroup?.groupId || `subgroup-${subGroup?.groupName}`}
                    group={subGroup}
                    level={level + 1}
                    expandedRowId={expandedRowId}
                    groupingFields={groupingFields}
                    expandedPath={expandedPath}
                    contextPath={[...contextPath, group?.groupId!]}
                    onToggleGroup={onToggleGroup}
                    onGroupClick={onGroupClick}
                    onRowClick={onRowClick}
                    renderableColumns={renderableColumns}
                    onGroupOffersDataChange={onGroupOffersDataChange}
                    isGroupedByFilter={isGroupedByFilter}
                    offersData={offersData}
                    isLoading={isLoading}
                    onPaginationChange={onPaginationChange}
                    onPageSizeChange={onPageSizeChange}
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onGroupSelectionChange={onGroupSelectionChange}
                    onGroupSelectAll={onGroupSelectAll}
                    isOfferSelected={isOfferSelected}
                    areAllOffersSelected={areAllOffersSelected}
                    apiFilters={apiFilters}
                    entityType={entityType}
                    transformData={transformData}
                    selectable={selectable}
                    groupSelections={groupSelections}
                    // Add individual group pagination state props
                    groupOffersPages={groupOffersPages}
                    groupOffersPageSizes={groupOffersPageSizes}
                    setGroupOffersPages={setGroupOffersPages}
                    setGroupOffersPageSizes={setGroupOffersPageSizes}
                    refreshSignal={refreshSignal}
                    // Pass breadcrumb path props
                    parentGroupNames={[...parentGroupNames, group?.groupName]}
                    // Table zoom functionality
                    enableZoom={enableZoom}
                    // Add apiUrl prop for navigation
                    apiUrl={apiUrl}
                    // Table height configuration
                    tableClassName={tableClassName}
                    fixedHeight={fixedHeight}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="text-xs text-gray-500">
                  {group?.count} {group?.count === 1 ? entityType : `${entityType}s`} in this group
                  {(() => {
                    const currentUniqueId =
                      contextPath?.length > 0
                        ? [...contextPath, group?.groupId!]?.join('|')
                        : group?.groupId!;

                    // Calculate total selected count for this group and all its descendants
                    const calculateTotalSelectedCount = (
                      currentGroupId: string,
                      contextPath: string[]
                    ): number => {
                      // Direct selections for this group
                      const directSelections = groupSelections?.[currentGroupId]?.length || 0;

                      // If this group has subgroups, calculate selections from all descendants
                      if (hasSubGroups && group?.subGroups) {
                        let descendantSelections = 0;

                        const traverseSubGroups = (subGroups: any[], subContextPath: string[]) => {
                          subGroups?.forEach((subGroup) => {
                            const subGroupUniqueId =
                              subContextPath?.length > 0
                                ? [...subContextPath, subGroup?.groupId!]?.join('|')
                                : subGroup?.groupId!;

                            // Add direct selections from this subgroup
                            descendantSelections += groupSelections[subGroupUniqueId]?.length || 0;

                            // Recursively traverse deeper subgroups
                            if (subGroup?.subGroups && subGroup?.subGroups?.length > 0) {
                              traverseSubGroups(subGroup?.subGroups, [
                                ...subContextPath,
                                subGroup?.groupId!,
                              ]);
                            }
                          });
                        };

                        traverseSubGroups(group?.subGroups, [...contextPath, group?.groupId!]);
                        return directSelections + descendantSelections;
                      }

                      return directSelections;
                    };

                    const totalSelectedCount = calculateTotalSelectedCount(
                      currentUniqueId,
                      contextPath
                    );

                    // Get sorting info from Zustand store (the actual source of truth)
                    const { getGroupSorting } = useGroupSortingStore.getState();
                    const sortingInfo = getGroupSorting(currentUniqueId);
                    const sortingText =
                      sortingInfo && sortingInfo?.sortBy
                        ? `${getDisplayColumnName(sortingInfo?.sortBy)} = ${sortingInfo?.sortOrder}`
                        : 'no sort';

                    return (
                      <>
                        {totalSelectedCount > 0 && (
                          <span className="ml-1 font-medium text-blue-600">
                            ({totalSelectedCount} selected)
                          </span>
                        )}
                        <span className="ml-1 font-medium text-green-600">{sortingText}</span>
                      </>
                    );
                  })()}
                </div>
                <div className="mt-0.5 text-xs text-gray-400">
                  Click the arrow to expand and view {entityType}s
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

// Client-side only wrapper to prevent hydration issues
const ClientOnlyGroupedOffersTable: React.FC<GroupedOffersTableProps> = (props) => {
  const isClient = useClient();

  if (!isClient) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        </Card>
      </div>
    );
  }

  return <GroupedOffersTable {...props} />;
};

export default ClientOnlyGroupedOffersTable;
