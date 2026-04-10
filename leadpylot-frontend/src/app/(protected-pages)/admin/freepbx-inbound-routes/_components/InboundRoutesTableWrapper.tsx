'use client';

import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import { ColumnDef } from '@/components/shared/DataTable';
import Badge from '@/components/ui/Badge';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { useActiveRow } from '@/hooks/useActiveRow';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import { apiDeleteInboundRoute, apiGetInboundRoutes } from '@/services/FreePBXInboundRouteService';
import { useInboundRoutes } from '@/services/hooks/useFreePBXInboundRoutes';
import { useDrawerStore } from '@/stores/drawerStore';
import { getSidebarLayout } from '@/utils/transitions';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import InboundRouteForm from './InboundRouteForm';

const InboundRoutesTableWrapper = () => {
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

  // Pagination state management
  const searchParams = useSearchParams();
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;

  const { data: inboundRoutesData, isLoading } = useInboundRoutes({
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  });

  const inboundRoutes = inboundRoutesData?.data || [];
  const total = inboundRoutesData?.metadata?.total || 0;

  // Select all functionality
  const { selected: selectedRoutes, handleSelectAll: handleSelectAllRoutes } = useSelectAllApi({
    apiFn: apiGetInboundRoutes,
    apiParams: {
      page: pageIndex,
      limit: pageSize,
      search: search || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    },
    total: total,
    returnFullObjects: true,
  });

  // Define columns for the DataTable
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'didNumber',
        header: 'DID Number',
        accessorKey: 'extension',
        cell: (props: any) => (
          <span className="font-medium text-gray-800">{props.row.original?.extension}</span>
        ),
      },
      {
        id: 'description',
        header: 'Description',
        accessorKey: 'description',
        cell: (props: any) => (
          <span className="text-sm">{props.row.original?.description || '-'}</span>
        ),
      },
      {
        id: 'destinationType',
        header: 'Destination Type',
        accessorKey: 'destinationType',
        cell: (props: any) => (
          <Badge className="bg-ocean-9 text-ocean-2">
            {props.row.original?.destinationType || 'Unknown'}
          </Badge>
        ),
      },
      {
        id: 'destinationValue',
        header: 'Destination',
        accessorKey: 'destinationValue',
        cell: (props: any) => (
          <span className="text-sm font-medium">{props.row.original?.destinationValue || '-'}</span>
        ),
      },
      {
        id: 'cidnum',
        header: 'Caller ID Filter',
        accessorKey: 'cidnum',
        cell: (props: any) => (
          <span className="text-sm text-gray-600">
            {props.row.original?.cidnum || 'Any'}
          </span>
        ),
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
              icon={<ApolloIcon name="pen" className="text-md" />}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(props.row.original?.extension);
              }}
              title="Edit inbound route"
            />
          </div>
        ),
      },
    ],
    [handleEdit]
  );

  // BaseTable configuration
  const tableConfig = useBaseTable({
    tableName: 'freepbx-inbound-routes',
    data: inboundRoutes,
    loading: isLoading,
    totalItems: total,
    pageIndex,
    pageSize,
    search,
    columns,
    selectable: true,
    rowIdField: 'extension',
    returnFullObjects: true,
    isBackendSortingReady: true,
    selectedRows: selectedRoutes,
    onSelectAll: handleSelectAllRoutes,
    bulkActionsConfig: {
      entityName: 'inbound-routes',
      deleteUrl: '/freepbx/inbound-routes/',
      invalidateQueries: ['freepbx-inbound-routes', 'freepbx-inbound-route-statistics'],
      singleDeleteConfig: {
        deleteFunction: (id: string) => apiDeleteInboundRoute(id),
      },
    },
    showPagination: !isOpen,
    extraActions: (
      <>
        <Button
          variant="solid"
          icon={<ApolloIcon name="plus" className="text-md" />}
          onClick={handleAddNew}
        >
          Add <span className="hidden md:inline">Inbound Route</span>
        </Button>
      </>
    ),
    onRowClick: (row) => handleRowClick(row?.extension),
    rowClassName: getRowClassName,
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'FreePBX Inbound Routes',
    pageInfoSubtitlePrefix: 'Total Inbound Routes',
  });

  // Get common transition classes
  const layout = getSidebarLayout(isOpen);

  return (
    <div className="mx-2 flex flex-col gap-4 xl:mx-0">
      <div>
        <div className={layout.container}>
          {/* Main content */}
          <div className={`${layout.mainContent} relative z-10`}>
            <BaseTable {...tableConfig} />
          </div>

          {/* Right sidebar for create */}
          <div className={layout.sidebar} style={layout.sidebarStyles}>
            <InboundRouteForm
              key={`inbound-route-${sidebarType || 'create'}-${selectedId}-${sidebarKey}`}
              onSuccess={handleFormSuccess}
              onClose={onOpenSidebar}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboundRoutesTableWrapper;

