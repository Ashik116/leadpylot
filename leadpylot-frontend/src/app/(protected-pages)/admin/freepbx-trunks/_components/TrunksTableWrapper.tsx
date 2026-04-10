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
import { apiDeleteTrunk, apiGetTrunks } from '@/services/FreePBXTrunkService';
import { useTrunks } from '@/services/hooks/useFreePBXTrunks';
import { useDrawerStore } from '@/stores/drawerStore';
import { getSidebarLayout } from '@/utils/transitions';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import TrunkForm from './TrunkForm';

const TrunksTableWrapper = () => {
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

  const { data: trunksData, isLoading } = useTrunks({
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  });

  const trunks = trunksData?.data || [];
  const total = trunksData?.metadata?.total || 0;

  // Select all functionality
  const { selected: selectedTrunks, handleSelectAll: handleSelectAllTrunks } = useSelectAllApi({
    apiFn: apiGetTrunks,
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
        id: 'name',
        header: 'Trunk Name',
        accessorKey: 'name',
        cell: (props: any) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{props.row.original?.name}</span>
            {props.row.original?.disabled === 'on' && (
              <Badge className="bg-rust-9 text-rust-2">Disabled</Badge>
            )}
          </div>
        ),
      },
      {
        id: 'channelid',
        header: 'Channel ID',
        accessorKey: 'channelid',
      },
      {
        id: 'tech',
        header: 'Technology',
        accessorKey: 'tech',
        cell: (props: any) => (
          <Badge className="bg-ocean-9 text-ocean-2 uppercase">{props.row.original?.tech}</Badge>
        ),
      },
      {
        id: 'sip_server',
        header: 'SIP Server',
        accessorKey: 'sip_server',
        cell: (props: any) => (
          <span className="text-sm text-gray-600">{props.row.original?.sip_server || '-'}</span>
        ),
      },
      {
        id: 'outcid',
        header: 'Outbound CID',
        accessorKey: 'outcid',
      },
      {
        id: 'pjsip_settings_count',
        header: 'Settings',
        accessorKey: 'pjsip_settings_count',
        cell: (props: any) => (
          <span className="text-sm text-gray-600">
            {props.row.original?.pjsip_settings_count || 0} PJSIP
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
                handleEdit(props.row.original?.trunkid.toString());
              }}
              title="Edit trunk"
            />
          </div>
        ),
      },
    ],
    [handleEdit]
  );

  // BaseTable configuration
  const tableConfig = useBaseTable({
    tableName: 'freepbx-trunks',
    data: trunks,
    loading: isLoading,
    totalItems: total,
    pageIndex,
    pageSize,
    search,
    columns,
    selectable: true,
    rowIdField: 'trunkid',
    returnFullObjects: true,
    isBackendSortingReady: true,
    selectedRows: selectedTrunks,
    onSelectAll: handleSelectAllTrunks,
    bulkActionsConfig: {
      entityName: 'trunks',
      deleteUrl: '/freepbx/trunks/',
      invalidateQueries: ['freepbx-trunks', 'freepbx-trunk-statistics'],
      singleDeleteConfig: {
        deleteFunction: (id: string) => apiDeleteTrunk(parseInt(id)),
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
          Add <span className="hidden md:inline">Trunk</span>
        </Button>
      </>
    ),
    onRowClick: (row) => handleRowClick(row?.trunkid?.toString()),
    rowClassName: getRowClassName,
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'FreePBX Trunks',
    pageInfoSubtitlePrefix: 'Total Trunks',
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
          <div className={`${layout.sidebar} border-b-2 lg:border-b-0 lg:border-l-2 border-gray-100 lg:pl-2 text-sm`} style={layout.sidebarStyles}>
            <TrunkForm
              key={`trunk-${sidebarType || 'create'}-${selectedId}-${sidebarKey}`}
              onSuccess={handleFormSuccess}
              onClose={onOpenSidebar}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrunksTableWrapper;
