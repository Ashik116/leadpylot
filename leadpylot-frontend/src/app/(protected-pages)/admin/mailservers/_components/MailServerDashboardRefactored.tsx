'use client';

import { useMemo } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useSettings } from '@/services/hooks/useSettings';
import { useDrawerStore } from '@/stores/drawerStore';
import MailServerFormWrapperComponent from './MailServerFormWrapperComponent';
import { apiDeleteMailServer, apiGetMailServers, MailServerInfo } from '@/services/SettingsService';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import Card from '@/components/ui/Card';
import { usePathname, useSearchParams } from 'next/navigation';
import { useActiveRow } from '@/hooks/useActiveRow';
import { getSidebarLayout } from '@/utils/transitions';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import RoleGuard from '@/components/shared/RoleGuard';

const MailServerDashboardRefactored = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);
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
  const { handleRowClick, handleAddNew, handleEdit, getRowClassName, handleFormSuccess } =
    useActiveRow({ onHandleSidebar, resetDrawer });

  // Pagination and sorting state management
  const searchParams = useSearchParams();
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;

  const { data: servers, isLoading } = useSettings('mailservers', {
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  });

  const { selected: selectedMailServers, handleSelectAll: handleSelectAllMailServer } =
    useSelectAllApi({
      apiFn: apiGetMailServers,
      apiParams: {
        page: pageIndex,
        limit: pageSize,
        search: search || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        select: '_id',
      },
      total: servers?.meta?.total || 0,
      returnFullObjects: true,
    });

  // Define columns for the DataTable
  const columns: ColumnDef<MailServerInfo>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        sortable: true,
        cell: (props) => {
          const name = props.row.original?.name;
          return typeof name === 'string' ? name : name?.en_US;
        },
      },
      {
        id: 'details',
        header: 'SMTP/IMAP Details',
        cell: (props) => (
          <div>
            <strong>SMTP:</strong> {props.row.original?.info?.smtp}
            <br />
            <strong>IMAP:</strong> {(props.row.original?.info as any)?.imap || '-'}
            <br />
          </div>
        ),
      },
      {
        id: 'email',
        header: 'Admin Email',
        columnWidth: 100,
        minSize: 100,
        cell: (props) => (
          <div className="text-sm">
            {props.row.original?.info?.admin_email || 'Not configured'}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (props) => (
          <div className="flex items-center gap-2">
            <Button
              variant="plain"
              size="xs"
              className="text-sand-2 hover:text-ocean-2"
              icon={<ApolloIcon name="pen" className="text-md" />}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(props.row.original._id);
              }}
            />
          </div>
        ),
      },
    ],
    [handleEdit]
  );

  // BaseTable configuration
  const tableConfig = useBaseTable({
    tableName: 'mailservers',
    data: servers?.data || [],
    loading: isLoading,
    totalItems: servers?.meta?.total || 0,
    pageIndex,
    isBackendSortingReady: true,
    pageSize,
    search,
    columns,
    showPagination: !isOpen,
    selectable: true,
    deleteButton: true,
    selectedRows: selectedMailServers,
    onSelectAll: handleSelectAllMailServer,
    bulkActionsConfig: {
      entityName: 'mailservers',
      deleteUrl: '/settings/mailservers/',
      invalidateQueries: ['mailservers', 'settings'],
      singleDeleteConfig: {
        deleteFunction: apiDeleteMailServer,
      },
    },
    customActions: ({ setDeleteConfirmOpen }: { setDeleteConfirmOpen: (open: boolean) => void }) => (
      <RoleGuard>
        <Button
          variant="destructive"
          size="xs"
          icon={<ApolloIcon name="trash" className="text-md" />}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setDeleteConfirmOpen(true);
          }}
        >
          Delete
        </Button>
      </RoleGuard>
    ),
    extraActions: (
      <div className="flex items-center">
        <Button
          variant="solid"
          icon={<ApolloIcon name={isOpen ? "arrow-right" : "plus"} />}
          onClick={!isOpen ? handleAddNew : onOpenSidebar}
          size="xs"
        >
          {!isOpen ? (<>Add <span className="hidden md:inline">Server</span> </>) : ''}
        </Button>
      </div>
    ),
    onRowClick: (row) => {
      handleRowClick(row._id);
    },
    rowClassName: getRowClassName,
    returnFullObjects: true,
    searchPlaceholder: 'Search mail servers...',
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'Mail Servers',
    pageInfoSubtitlePrefix: 'Total Servers',
    sortKey: sortBy,
    order: sortOrder,
    fixedHeight: '80dvh',
  });

  // Get common transition classes
  const layout = getSidebarLayout(isOpen);

  return (
    <div className="mx-2 flex flex-col gap-4 xl:mx-0 px-4">
      <div className={layout.container}>
        {/* Main content */}
        <div className={`${layout.mainContent} relative z-10 mt-4 lg:mt-0`}>
          <BaseTable {...tableConfig} />
        </div>

        {/* Right sidebar for create/edit */}
        <div
          className={`${layout.sidebar} border-gray-100 text-sm flex min-h-0 flex-col lg:border-l-2 lg:pl-2`}
          style={layout.sidebarStyles}
        >
          <Card
            className="flex max-h-[calc(100vh-3rem)] min-h-0 flex-col overflow-hidden border-none"
            bodyClass="flex min-h-0 flex-1 flex-col"
          >
            <MailServerFormWrapperComponent
              key={`mailserver-${sidebarType || 'create'}-${selectedId}-${sidebarKey}`}
              type={sidebarType || ('create' as any)}
              id={selectedId || undefined}
              onSuccess={handleFormSuccess}
              isPage={true}
              onClose={onOpenSidebar}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MailServerDashboardRefactored;
