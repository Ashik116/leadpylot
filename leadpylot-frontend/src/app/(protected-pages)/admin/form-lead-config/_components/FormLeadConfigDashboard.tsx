'use client';

import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import { ColumnDef } from '@/components/shared/DataTable';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { useActiveRow } from '@/hooks/useActiveRow';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import RoleGuard from '@/components/shared/RoleGuard';
import { apiGetAllowedSites, apiDeleteAllowedSite } from '@/services/AllowedSiteService';
import { useAllowedSitesData } from '@/services/hooks/useAllowedSites';
import { useDrawerStore } from '@/stores/drawerStore';
import { getSidebarLayout } from '@/utils/transitions';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { AllowedSiteFormSidebar } from './AllowedSiteFormSidebar';

const FormLeadConfigDashboard = () => {
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

  const { handleRowClick, handleAddNew, handleEdit, getRowClassName, handleFormSuccess } =
    useActiveRow({ onHandleSidebar, resetDrawer });

  const searchParams = useSearchParams();
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;

  const { data: sitesData, isLoading } = useAllowedSitesData({
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
    showInactive: 'true',
  });

  const { selected: selectedSites, handleSelectAll: handleSelectAllSites } = useSelectAllApi({
    apiFn: apiGetAllowedSites,
    apiParams: {
      page: pageIndex,
      limit: pageSize,
      search: search || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      select: '_id',
    },
    total: sitesData?.meta?.total || 0,
    returnFullObjects: true,
  });

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'url',
        header: 'Site URL',
        accessorKey: 'url',
        sortable: true,
        cell: (props: any) => (
          <span className="max-w-[300px] truncate block" title={props.getValue()}>
            {props.getValue()}
          </span>
        ),
      },
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        sortable: true,
        cell: (props: any) => props.getValue() || '-',
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'active',
        sortable: false,
        enableSorting: false,
        cell: (props: any) =>
          props.getValue() ? (
            <span className="bg-evergreen rounded-full px-2 py-1 text-xs font-bold text-white">Active</span>
          ) : (
            <span className="bg-rust rounded-full px-2 py-1 text-xs font-bold text-white">Inactive</span>
          ),
      },
      {
        id: 'createdAt',
        header: 'Created',
        accessorKey: 'createdAt',
        sortable: true,
        cell: (props: any) => (props.getValue() ? dateFormateUtils(props.getValue()) : '-'),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (props: any) => (
          <div className="flex items-center gap-2">
            <Button
              variant="plain"
              size="xs"
              className="text-sand-2 hover:text-ocean-2"
              icon={<ApolloIcon name="pen" />}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(props.row.original?._id);
              }}
            />
          </div>
        ),
      },
    ],
    [handleEdit]
  );

  const tableConfig = useBaseTable({
    tableName: 'form-lead-config',
    data: sitesData?.data || [],
    loading: isLoading,
    totalItems: sitesData?.meta?.total || 0,
    pageIndex,
    pageSize,
    search,
    columns,
    selectable: true,
    selectedRows: selectedSites,
    onSelectAll: handleSelectAllSites,
    isBackendSortingReady: true,
    bulkActionsConfig: {
      entityName: 'allowed sites',
      deleteUrl: '/allowed-sites/',
      invalidateQueries: ['allowed-sites'],
      singleDeleteConfig: {
        deleteFunction: apiDeleteAllowedSite,
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
    showPagination: !isOpen,
    extraActions: (
      <div className="flex items-center">
        <Button
          variant="solid"
          icon={<ApolloIcon name={isOpen ? 'arrow-right' : 'plus'} />}
          onClick={!isOpen ? handleAddNew : onOpenSidebar}
          size="xs"
        >
          {!isOpen ? (<>Add <span className="hidden md:inline">Site</span></>) : ''}
        </Button>
      </div>
    ),
    onRowClick: (row) => handleRowClick(row?._id),
    rowClassName: getRowClassName,
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'Form Lead Config',
    pageInfoSubtitlePrefix: 'Total Sites',
  });

  const layout = getSidebarLayout(isOpen);

  return (
    <div className="flex flex-col gap-4 px-4">
      <div>
        <div className={layout.container}>
          <div className={`${layout.mainContent} relative z-10 mt-4 lg:mt-0`}>
            <BaseTable {...tableConfig} />
          </div>

          <div
            className={`${layout.sidebar} flex min-h-0 flex-col border-gray-100 text-sm lg:border-l-2 lg:pl-2`}
            style={layout.sidebarStyles}
          >
            <AllowedSiteFormSidebar
              key={`site-${sidebarType || 'create'}-${selectedId}-${sidebarKey}`}
              type={sidebarType || ('create' as any)}
              siteId={selectedId || undefined}
              onSuccess={handleFormSuccess}
              onClose={handleFormSuccess || onOpenSidebar}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormLeadConfigDashboard;
