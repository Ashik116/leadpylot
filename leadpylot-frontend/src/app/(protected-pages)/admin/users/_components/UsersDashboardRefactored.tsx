'use client';

import { ColumnDef } from '@/components/shared/DataTable';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { useUsers } from '@/services/hooks/useUsers';
import { useUsersNavigationStore } from '@/stores/navigationStores';
import { useEffect, useMemo, useCallback, useRef } from 'react';
import ChangePasswordForm from './ChangePasswordForm';
import UserFormWrapperComponent from './UserFormWrapperComponent';
import TelegramBotManagement from './TelegramBotManagement';

import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import Card from '@/components/ui/Card';
import { getSidebarLayout } from '@/utils/transitions';
import { usePathname, useSearchParams } from 'next/navigation';
import UnmaskSwitcher from './UnmaskSwitcher';
import ViewTypeSegment from './ViewTypeSegment';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import { useDrawerStore } from '@/stores/drawerStore';
import { useActiveRow } from '@/hooks/useActiveRow';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { apiGetUsers } from '@/services/UsersService';
import { MdDelete } from 'react-icons/md';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useState } from 'react';
import { apiUpdateUser } from '@/services/UsersService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
// Grouping and filtering imports
import { useFilterChainLeads } from '@/hooks/useFilterChainLeads';
import { useGroupedSummary, useMetadataOptions } from '@/services/hooks/useLeads';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import type { DomainFilter } from '@/stores/filterStateStore';
import type {
  ColumnFilterValue,
  ColumnToFieldMap,
} from '@/components/shared/DataTable/components/ColumnHeaderFilter';
import type { ColumnHeaderFilterRenderers } from '@/components/shared/DataTable/types';
import {
  buildDomainFiltersForAdminPage,
  FILTER_OPERATOR_TO_API,
  filtersToQueryParams,
} from '@/utils/filterUtils';
import { useFilterProviderValue } from '@/hooks/useFilterProviderValue';
import { getActiveSubgroupPagination } from '@/utils/groupUtils';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { FilterProvider } from '@/contexts/FilterContext';
import { usePageInfoStore } from '@/stores/pageInfoStore';

// Default page size for users table
const USERS_PER_PAGE = 50;

const USER_COLUMN_TO_FIELD_MAP: ColumnToFieldMap = {
  status: 'active',
};

const USER_COLUMN_HEADER_FILTER_RENDERERS: ColumnHeaderFilterRenderers = {
  login: 'metadata_checkbox',
  name: 'metadata_checkbox',
  role: 'metadata_checkbox',
  status: 'metadata_checkbox',
};

const UsersDashboardRefactored = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { onAppendQueryParams } = useAppendQueryParams();
  const { setPageInfo } = usePageInfoStore();
  // State for delete confirmation dialog
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [hasManuallyClearedGroupFilter, setHasManuallyClearedGroupFilter] = useState(false);

  // Get selected items store methods
  const { clearSelectedItems } = useSelectedItemsStore();

  // Set entity type to User in store
  const { setEntityType: setStoreEntityType } = useUniversalGroupingFilterStore();
  useEffect(() => {
    setStoreEntityType('User');
  }, [setStoreEntityType]);

  // Filter chain hook integration
  const filterChain = useFilterChainLeads({
    onClearSelections: () => clearSelectedItems(),
    currentTab: 'users',
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
  } = filterChain;

  // Sync store changes back to useFilterChainLeads (one-way: store -> useFilterChainLeads)
  const storeGroupBy = useUniversalGroupingFilterStore((state) => state.groupBy);
  const isSyncingRef = useRef(false);
  const lastSyncedStoreValueRef = useRef<string>('');

  // Helper function to compare arrays by their sorted contents (order-independent)
  const arraysEqual = useCallback((a: string[], b: string[]): boolean => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }, []);

  // Helper function to get a stable string representation (order-independent)
  const getArrayKey = useCallback((arr: string[]): string => {
    if (!Array.isArray(arr)) return '';
    return [...arr].sort().join(',');
  }, []);

  // Sync store -> useFilterChainLeads (one-way)
  useEffect(() => {
    if (isSyncingRef.current) return;
    if (!Array.isArray(storeGroupBy)) return;

    const storeKey = getArrayKey(storeGroupBy);
    const lastSyncedKey = lastSyncedStoreValueRef.current;

    // Only sync when store has values (non-empty)
    if (
      storeGroupBy.length > 0 &&
      !arraysEqual(storeGroupBy, selectedGroupBy) &&
      storeKey !== lastSyncedKey
    ) {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      lastSyncedStoreValueRef.current = storeKey;

      setTimeout(() => {
        handleGroupByArrayChange(storeGroupBy);
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 50);
      }, 0);
    }
  }, [storeGroupBy, handleGroupByArrayChange, selectedGroupBy, arraysEqual, getArrayKey]);

  // Sync useFilterChainLeads -> store (one-way)
  const { setGroupBy: setStoreGroupBy } = useUniversalGroupingFilterStore();
  useEffect(() => {
    if (isSyncingRef.current) return;
    if (Array.isArray(selectedGroupBy)) {
      const selectedKey = getArrayKey(selectedGroupBy);
      const lastSyncedKey = lastSyncedStoreValueRef.current;

      if (!arraysEqual(selectedGroupBy, storeGroupBy) && selectedKey !== lastSyncedKey) {
        isSyncingRef.current = true;
        lastSyncedStoreValueRef.current = selectedKey;

        setTimeout(() => {
          setStoreGroupBy(selectedGroupBy);
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 50);
        }, 0);
      }
    }
  }, [selectedGroupBy, setStoreGroupBy, storeGroupBy, arraysEqual, getArrayKey]);

  // Enhanced clear group filter handler
  const handleClearGroupByFilter = useCallback(() => {
    clearSelectedItems();
    setHasManuallyClearedGroupFilter(true);
    chainHandleClearGroupByFilter();
  }, [clearSelectedItems, chainHandleClearGroupByFilter]);

  // Custom handler for group by changes
  const handleGroupByArrayChangeWithReset = useCallback(
    (newGroupBy: string[]) => {
      clearSelectedItems();
      handleGroupByArrayChange(newGroupBy);
    },
    [clearSelectedItems, handleGroupByArrayChange]
  );

  // Get domain filters from store
  const {
    userDomainFilters,
    setUserDomainFilters,
    pagination: storePagination,
    subgroupPagination: storeSubgroupPagination,
    sorting: storeSorting,
  } = useUniversalGroupingFilterStore();

  // Build domain filters (user + filter chain, normalized for API)
  const domainFilters = useMemo(
    () => buildDomainFiltersForAdminPage(buildGroupedLeadsFilters, userDomainFilters),
    [buildGroupedLeadsFilters, userDomainFilters]
  );
  const domainFiltersAsString = useMemo(
    () => (domainFilters.length > 0 ? JSON.stringify(domainFilters) : undefined),
    [domainFilters]
  );

  // Column header filter/group options from metadata (User model)
  const { data: metadataOptions } = useMetadataOptions('User');
  const columnFilterOptions = useMemo(
    () => metadataOptions?.filterOptions || [],
    [metadataOptions]
  );
  const columnGroupOptions = useMemo(
    () => metadataOptions?.groupOptions || [],
    [metadataOptions]
  );

  const activeColumnFilters = useMemo(() => {
    const filters: Record<string, ColumnFilterValue> = {};
    if (!userDomainFilters?.length) return filters;

    for (const [field, operator, value] of userDomainFilters) {
      if (field) {
        filters[field] = { operator, value };
      }
    }
    return filters;
  }, [userDomainFilters]);

  const handleColumnFilterApply = useCallback(
    (fieldName: string, operator: string, value: any) => {
      const apiOperator = FILTER_OPERATOR_TO_API[operator] ?? operator;
      const newFilter: DomainFilter = [fieldName, apiOperator, value];
      const updatedFilters = [
        ...(userDomainFilters || []).filter(([field]) => field !== fieldName),
        newFilter,
      ];
      setUserDomainFilters(updatedFilters);
    },
    [userDomainFilters, setUserDomainFilters]
  );

  const handleColumnFilterClear = useCallback(
    (fieldName: string) => {
      const updatedFilters = (userDomainFilters || []).filter(([field]) => field !== fieldName);
      setUserDomainFilters(updatedFilters);
    },
    [userDomainFilters, setUserDomainFilters]
  );

  const handleToggleGroupBy = useCallback(
    (field: string) => {
      const currentGroupBy = storeGroupBy || [];
      const isSelected = currentGroupBy.includes(field);
      const updatedGroupBy = isSelected
        ? currentGroupBy.filter((f) => f !== field)
        : [...currentGroupBy, field];
      setStoreGroupBy(updatedGroupBy);
    },
    [storeGroupBy, setStoreGroupBy]
  );

  // Clear selections when domain filters change
  useEffect(() => {
    clearSelectedItems();
  }, [clearSelectedItems, domainFilters]);

  // Use the drawer store for sidebar state management
  const {
    isOpen,
    sidebarType,
    selectedId,
    sidebarKey,
    resetDrawer,
    onOpenSidebar,
    onHandleSidebar,
  } = useDrawerStore();

  // Use the active row hook
  const { handleRowClick, handleAddNew, getRowClassName, handleFormSuccess } = useActiveRow({
    onHandleSidebar,
    resetDrawer,
  });

  // Delete user mutation (sets active to false)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Get current user data
      const currentUser = users?.data?.find((u: any) => u?._id === userId);
      if (!currentUser) {
        throw new Error('User not found');
      }
      const updatedUser = {
        ...currentUser,
        active: false,
      };

      return apiUpdateUser(userId, updatedUser);
    },
    onSuccess: () => {
      toast.push(
        <Notification title="Success" type="success">
          User has been deleted successfully
        </Notification>
      );
      queryClient.invalidateQueries({ queryKey: ['users'] });
      invalidateGroupedSummary();
      setDeleteConfirmDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to delete user'}
        </Notification>
      );
    },
  });

  // Activate user mutation (sets active to true)
  const activateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Get current user data
      const currentUser = users?.data?.find((u: any) => u?._id === userId);
      if (!currentUser) {
        throw new Error('User not found');
      }
      const updatedUser = {
        ...currentUser,
        active: true,
      };

      return apiUpdateUser(userId, updatedUser);
    },
    onSuccess: () => {
      toast.push(
        <Notification title="Success" type="success">
          User has been activated successfully
        </Notification>
      );
      queryClient.invalidateQueries({ queryKey: ['users'] });
      invalidateGroupedSummary();
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to activate user'}
        </Notification>
      );
    },
  });

  // Custom handlers for this component's specific needs
  const handleChangePassword = useCallback(
    (userId: string) => {
      handleRowClick(userId);
      onHandleSidebar(userId, 'changePassword');
    },
    [handleRowClick, onHandleSidebar]
  );

  // Handler for opening Telegram bot settings
  const handleManageTelegram = useCallback(
    (userId: string) => {
      handleRowClick(userId);
      onHandleSidebar(userId, 'telegram');
    },
    [handleRowClick, onHandleSidebar]
  );

  // Handle delete button click
  const handleDeleteClick = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setDeleteConfirmDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete?.id);
    }
  };

  // Handle activate user
  const handleActivateUser = useCallback(
    (userId: string) => {
      activateUserMutation.mutate(userId);
    },
    [activateUserMutation]
  );

  // Get URL search params with defaults
  const pageIndex = Math.max(1, parseInt(useSearchParams().get('pageIndex') || '1', 10) || 1);
  const pageSize = Math.max(
    1,
    parseInt(useSearchParams().get('pageSize') || String(USERS_PER_PAGE), 10) || USERS_PER_PAGE
  );
  const search = useSearchParams().get('search');
  const sortBy = useSearchParams().get('sortBy') || undefined;
  const sortOrder = useSearchParams().get('sortOrder') || undefined;
  const showInactive = useSearchParams().get('showInactive') === 'true';

  // Build default filters as query params
  const defaultFiltersAsQueryParams = useMemo(
    () => ({
      ...filtersToQueryParams(buildApiFilters?.() ?? []),
      ...(showInactive ? { active: false } : {}),
    }),
    [buildApiFilters, showInactive]
  );

  // Determine effective group by
  const effectiveGroupBy = useMemo(() => {
    return selectedGroupBy.length > 0 ? selectedGroupBy : [];
  }, [selectedGroupBy]);

  // Fetch grouped summary data
  const {
    data: groupedSummaryData,
    isLoading: groupedDataLoading,
    isFetching: isGroupedDataFetching,
  } = useGroupedSummary({
    entityType: 'User',
    domain: domainFilters,
    groupBy: effectiveGroupBy,
    page: storePagination?.page || pageIndex,
    limit: storePagination?.limit || pageSize,
    ...getActiveSubgroupPagination(storeSubgroupPagination),
    sortBy: storeSorting?.sortBy || 'count',
    sortOrder: (storeSorting?.sortOrder as 'asc' | 'desc') || 'desc',
    enabled: effectiveGroupBy.length > 0,
    defaultFilters: defaultFiltersAsQueryParams,
  });

  // Disable regular API hook when grouping is active
  const shouldDisableHook = effectiveGroupBy.length > 0;

  // Fetch users with pagination and search (disabled when grouping is active)
  const { data: users, isLoading, isFetching: isUsersFetching } = useUsers(
    {
      page: pageIndex,
      limit: pageSize,
      search: search || undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as string | undefined,
      showInactive: showInactive,
      domain: domainFiltersAsString,
    },
    {
      enabled: !shouldDisableHook, // Disable when grouping is active
    }
  );

  // Selection hooks for bulk operations
  const {
    selected: selectedUsers,
    setSelected: setSelectedUsers,
    handleSelectAll: handleSelectAllUsers,
  } = useSelectAllApi({
    apiFn: apiGetUsers,
    apiParams: {
      page: pageIndex,
      limit: pageSize,
      search: search || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      showInactive: showInactive,
      domain: domainFiltersAsString,
    },
    total: users?.meta?.total || 0,
    returnFullObjects: true,
  });

  // Get store methods
  const addItems = useUsersNavigationStore((state) => state.addItems);
  const setTotalItems = useUsersNavigationStore((state) => state.setTotalItems);

  // Update the navigation store when users data changes
  useEffect(() => {
    if (users?.data) {
      addItems(users?.data);
      if (users.meta?.total) {
        setTotalItems(users?.meta?.total);
      }
    }
  }, [users?.data, users?.meta?.total, addItems, setTotalItems]);

  // Define columns for DataTable
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'login',
        header: 'Login',
        accessorKey: 'login',
        columnWidth: 147,
        minSize: 60,
      },
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'info.name',
        enableSorting: true,
        columnWidth: 114,
        minSize: 60,
        cell: ({ row }) => <span>{row.original?.info?.name || '-'}</span>,
      },
      {
        id: 'email',
        header: 'Email',
        accessorKey: 'info.email',
        enableSorting: true,
        columnWidth: 160,
        minSize: 60,
        cell: ({ row }) => <span>{row.original?.info?.email || '-'}</span>,
      },
      {
        id: 'role',
        header: 'Role',
        accessorKey: 'role',
        enableSorting: true,
        columnWidth: 96,
        minSize: 60,
        cell: ({ row }) => <span>{row.original?.role || '-'}</span>,
      },
      {
        id: 'office',
        header: 'Office',
        accessorKey: 'primary_office',
        enableSorting: false,
        columnWidth: 93,
        minSize: 60,
        cell: ({ row }) => {
          const primary = row.original?.primary_office;
          const offices = row.original?.offices;
          const primaryName =
            primary && typeof primary === 'object' && 'name' in primary
              ? (primary as { name?: string }).name
              : null;
          const count = Array.isArray(offices) ? offices.length : 0;
          return (
            <span>
              {primaryName ?? (count > 0 ? `${count} office(s)` : '–')}
            </span>
          );
        },
      },
      {
        id: 'mail_servers',
        header: 'Mail Servers',
        accessorKey: 'mail_servers',
        enableSorting: false,
        columnWidth: 120,
        minSize: 120,
        cell: ({ row }) => {
          const mailServers = row.original?.mail_servers;
          if (!Array.isArray(mailServers) || mailServers.length === 0) {
            return <span className="text-gray-400">–</span>;
          }
          const firstName =
            typeof mailServers[0] === 'object' && mailServers[0]?.name
              ? typeof mailServers[0].name === 'string'
                ? mailServers[0].name
                : mailServers[0].name?.en_US || '—'
              : null;
          const count = mailServers.length;
          return (
            <span title={mailServers.map((ms: any) => (typeof ms === 'object' ? (typeof ms.name === 'string' ? ms.name : ms.name?.en_US) : ms) || '').filter(Boolean).join(', ')}>
              {firstName ?? `${count} server(s)`}
              {count > 1 && firstName ? ` +${count - 1}` : ''}
            </span>
          );
        },
      },
      {
        id: 'view_type',
        header: 'View Type',
        accessorKey: 'view_type',
        enableSorting: false,
        columnWidth: 150,
        minSize: 145,
        cell: ({ row }) => (
          <ViewTypeSegment
            userId={row.original?._id || ''}
            currentValue={row.original?.view_type}
          />
        ),
      },
      {
        id: 'unmask',
        header: 'Chapcharap',
        accessorKey: 'unmask',
        enableSorting: false,
        columnWidth: 105,
        minSize: 60,
        cell: ({ row }) => (
          <UnmaskSwitcher
            userId={row.original?._id || ''}
            currentValue={row.original?.unmask || false}
          />
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'active',
        enableSorting: true,
        columnWidth: 76,
        minSize: 60,
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold text-white ${row.original?.active ? 'bg-evergreen' : 'bg-rust'}`}
          >
            {row.original.active ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        id: 'telegram_bot',
        header: 'Telegram Bot',
        columnWidth: 140,
        minSize: 120,
        cell: ({ row }) => {
          const telegramCred = row.original?.other_platform_credentials?.find(
            (cred: any) => cred.platform_type === 'telegram'
          );
          const isLinked = !!telegramCred;
          const botEnabled = telegramCred?.bot_enabled ?? false;

          return (
            <div
              className="flex items-center gap-1.5"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {isLinked ? (
                <div className="flex items-center gap-1">
                  <ApolloIcon name="check-circle-task" className="w-4 h-4 text-emerald-600" />
                  <span
                    className={`text-xs font-semibold ${
                      botEnabled ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    {botEnabled ? 'On' : 'Off'}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">–</span>
              )}
              <Button
                variant="secondary"
                size="xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (row.original?._id) {
                    handleManageTelegram(row.original?._id);
                  }
                }}
                className="!h-5 !px-1.5 !text-xs"
              >
                Manage
              </Button>
            </div>
          );
        },
      },
      {
        id: 'actions_users',
        header: 'Actions',
        columnWidth: 207,
        minSize: 207,
        cell: ({ row }) => (
          <div
            className="flex items-center gap-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Button
              variant="default"
              size="xs"
              disabled={
                row.original?.role === Role.ADMIN &&
                user?.name?.toLowerCase() === row.original?.login?.toLowerCase()
              }
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (row.original?._id) {
                  handleChangePassword(row.original?._id);
                }
              }}
            >
              Change Password
            </Button>
            {showInactive ? (
              <Button
                variant="default"
                size="xs"
                disabled={
                  row.original?.role === Role.ADMIN &&
                  user?.name?.toLowerCase() === row.original?.login?.toLowerCase()
                }
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (row.original?._id) {
                    handleActivateUser(row.original?._id);
                  }
                }}
              >
                Activate
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="xs"
                disabled={
                  row.original?.role === Role.ADMIN &&
                  user?.name?.toLowerCase() === row.original?.login?.toLowerCase()
                }
                icon={<MdDelete />}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (row.original?._id) {
                    handleDeleteClick(
                      row.original?._id,
                      row.original?.info?.name || row.original?.login || 'User'
                    );
                  }
                }}
              >
                Delete
              </Button>
            )}
          </div>
        ),
      },
    ],
    [handleChangePassword, user?.name, showInactive, handleActivateUser]
  );

  const layout = getSidebarLayout(isOpen);
  // Helper function to invalidate grouped summary queries
  const invalidateGroupedSummary = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['grouped-summary'] });
  }, [queryClient]);

  // Update page info for grouped and flat views
  useEffect(() => {
    const isGroupedView = effectiveGroupBy.length > 0;
    if (isGroupedView) {
      if (groupedDataLoading) return;
      const total = (groupedSummaryData?.meta?.total ?? 0) as number;
      setPageInfo({
        title: showInactive ? 'Inactive Users' : 'Users',
        total,
        subtitle: `${showInactive ? 'Total Inactive Users' : 'Total Users'}: ${total}`,
      } as any);
    } else {
      if (isLoading) return;
      const total = (users?.meta?.total ?? 0) as number;
      setPageInfo({
        title: showInactive ? 'Inactive Users' : 'Users',
        total,
        subtitle: `${showInactive ? 'Total Inactive Users' : 'Total Users'}: ${total}`,
      } as any);
    }
  }, [
    effectiveGroupBy.length,
    groupedDataLoading,
    groupedSummaryData?.meta?.total,
    isLoading,
    users?.meta?.total,
    showInactive,
    setPageInfo,
  ]);

  // BaseTable configuration
  const tableLoading = effectiveGroupBy.length > 0
    ? groupedDataLoading || isGroupedDataFetching
    : isLoading || isUsersFetching;

  const tableConfig = useBaseTable({
    tableName: 'users',
    data: users?.data || [],
    loading: tableLoading,
    totalItems: users?.meta?.total || 0,
    pageSize: pageSize,
    pageIndex: pageIndex,
    showPagination: !isOpen,
    search: search || undefined,
    columns,
    searchPlaceholder: 'Search all users',
    isBackendSortingReady: true,
    selectable: true,
    onSelectAll: handleSelectAllUsers,
    returnFullObjects: true,
    selectedRows: selectedUsers?.filter((usr: any) => usr?._id !== user?.id),
    onSelectedRowsChange: setSelectedUsers,
    // this boolean is used to exclude the current user filter from the selection
    isMySelf: true,
    bulkActionsConfig: {
      entityName: 'users',
      deleteUrl: '/users',
      invalidateQueries: ['users'],
    },
    extraActions: (
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="xs"
          onClick={() => {
            onAppendQueryParams({
              showInactive: !showInactive,
            });
          }}
        >
          {showInactive ? 'Active Users' : 'Inactive Users'}
        </Button>
        <Button
          variant="solid"
          size="xs"
          icon={
            <ApolloIcon
              name={sidebarType !== 'create' ? 'plus' : 'arrow-right'}
              className="text-md"
            />
          }
          onClick={sidebarType !== 'create' ? handleAddNew : handleFormSuccess || onOpenSidebar}
        >
          {sidebarType !== 'create' ? (
            <>
              Create <span className="hidden md:inline"> User</span>
            </>
          ) : (
            ''
          )}
        </Button>
      </div>
    ),
    onRowClick: (row) => {
      if (row?._id) {
        handleRowClick(row?._id);
      }
    },
    rowClassName: getRowClassName,
    setPageInfoFromBaseTable: false, // We handle page info manually
    pageInfoTitle: showInactive ? 'Inactive Users' : 'Users',
    pageInfoSubtitlePrefix: showInactive ? 'Total Inactive Users' : 'Total Users',
    fixedHeight: '85dvh',
    headerSticky: true,
    // Grouping props
    selectedGroupBy: selectedGroupBy,
    onGroupByChange: handleGroupByArrayChangeWithReset,
    onClearGroupBy: handleClearGroupByFilter,
    hasSelectedGroupBy: hasSelectedGroupBy,
    hasUserAddedGroupBy: hasUserAddedGroupBy,
  });

  const filterContextValue = useFilterProviderValue(
    buildApiFilters,
    buildGroupedLeadsFilters,
    handleGroupByArrayChangeWithReset,
    handleClearGroupByFilter
  );

  return (
    <FilterProvider value={filterContextValue}>
      <div className="mx-2 flex flex-col gap-4 xl:mx-0">
        <div className={layout.container}>
          {/* Main content */}
          <div className={`${layout.mainContent} relative z-10 mt-4 lg:mt-0`}>
            <BaseTable
              {...tableConfig}
              buildApiFilters={buildApiFilters}
              columnFilterOptions={columnFilterOptions}
              activeColumnFilters={activeColumnFilters}
              onColumnFilterApply={handleColumnFilterApply}
              onColumnFilterClear={handleColumnFilterClear}
              columnToFieldMap={USER_COLUMN_TO_FIELD_MAP}
              columnHeaderFilterRenderers={USER_COLUMN_HEADER_FILTER_RENDERERS}
              columnGroupOptions={columnGroupOptions}
              activeGroupBy={effectiveGroupBy}
              onToggleGroupBy={handleToggleGroupBy}
              selectionResetKey={JSON.stringify(domainFilters)}
              // Pass grouped mode props
              groupedMode={effectiveGroupBy.length > 0}
              groupedData={groupedSummaryData?.data || []}
              entityType="User"
              groupByFields={effectiveGroupBy}
            />
          </div>
        {/* Right sidebar for create/edit */}
        <div
          className={`${layout.sidebar} border-gray-100 lg:border-l-2 lg:pl-2`}
          style={layout.sidebarStyles}
        >
          <Card className="border-none">
            <div className="w-full">
              <div className="flex h-full flex-col">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {sidebarType === 'create'
                      ? 'Add New User'
                      : sidebarType === 'edit'
                        ? `Edit ${users?.data?.find((user: any) => user?._id === selectedId)?.login || 'User'}`
                        : sidebarType === 'telegram'
                          ? `Telegram Settings - ${users?.data?.find((user: any) => user?._id === selectedId)?.login || 'User'}`
                          : `Change Password - ${users?.data?.find((user: any) => user?._id === selectedId)?.login || 'User'}`}
                  </h2>
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={<ApolloIcon name="times" className="text-md" />}
                    onClick={resetDrawer || onOpenSidebar}
                  ></Button>
                </div>

                {sidebarType === 'changePassword' && selectedId && (
                  <div className="w-full">
                    <ChangePasswordForm
                      key={`user-password-${selectedId}-${sidebarKey}`}
                      userId={selectedId}
                      onClose={handleFormSuccess || onOpenSidebar}
                      onSuccess={handleFormSuccess}
                    />
                  </div>
                )}

                {sidebarType === 'telegram' && selectedId && (
                  <div className="w-full">
                    <TelegramBotManagement
                      key={`user-telegram-${selectedId}-${sidebarKey}`}
                      userId={selectedId}
                      user={users?.data?.find((user: any) => user?._id === selectedId) || null}
                      onClose={handleFormSuccess || onOpenSidebar}
                    />
                  </div>
                )}

                {(sidebarType === 'create' || sidebarType === 'edit') && (
                  <div className="w-full">
                    <UserFormWrapperComponent
                      key={`user-${sidebarType}-${selectedId}-${sidebarKey}`}
                      type={sidebarType}
                      id={selectedId || undefined}
                      onClose={handleFormSuccess || onOpenSidebar}
                      isPage={false}
                      onSuccess={handleFormSuccess}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmDialogOpen}
        title="Delete User"
        onCancel={() => setDeleteConfirmDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonProps={{
          loading: deleteUserMutation.isPending,
          disabled: deleteUserMutation.isPending,
        }}
      >
        <p>
          Are you sure you want to delete <strong>{userToDelete?.name}</strong>? This will set their
          status to inactive.
        </p>
      </ConfirmDialog>
    </div>
    </FilterProvider>
  );
};

export default UsersDashboardRefactored;
