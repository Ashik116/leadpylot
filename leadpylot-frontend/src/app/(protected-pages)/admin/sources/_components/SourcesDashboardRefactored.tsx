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
import Notification from '@/components/ui/Notification';
import { toast } from '@/components/ui/toast';
import { apiDeleteSource, apiGetSourcesData, apiUpdateSource } from '@/services/SourceService';
import { useSourcesData } from '@/services/hooks/useSources';
import { useDrawerStore } from '@/stores/drawerStore';
import { getSidebarLayout } from '@/utils/transitions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { SourceColorTableCell } from './SourceColorTableCell';
import { SourceFormSidebar } from './SourceFormSidebar';

const SourcesDashboardRefactored = () => {
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
  const pageSize = parseInt(searchParams.get('pageSize') || '80', 10);
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;

  const { data: sourcesData, isLoading } = useSourcesData({
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  });

  const queryClient = useQueryClient();
  const { mutate: updateSourceColor, isPending: isColorUpdatePending, variables: colorUpdateVars } =
    useMutation({
      mutationFn: ({ id, color }: { id: string; color: string | null }) =>
        apiUpdateSource(id, { color }),
      onSuccess: (_data, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['sources'] });
        queryClient.invalidateQueries({ queryKey: ['source', id] });
      },
      onError: () => {
        toast.push(<Notification type="danger">Failed to update source color</Notification>);
      },
    });

  const { selected: selectedSources, handleSelectAll: handleSelectAllSource } = useSelectAllApi({
    apiFn: apiGetSourcesData,
    apiParams: {
      page: pageIndex,
      limit: pageSize,
      search: search || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      select: '_id',
    },
    total: sourcesData?.meta?.total || 0,
    returnFullObjects: true,
  });
  // Define columns for the DataTable
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        sortable: true,
      },
      {
        id: 'color',
        header: 'Color',
        accessorKey: 'color',
        sortable: false,
        enableSorting: false,
        cell: (props: any) => {
          const rowId = props.row.original?._id as string | undefined;
          const color = props.row.original?.color as string | null | undefined;
          const rowColorPending = isColorUpdatePending && colorUpdateVars?.id === rowId;

          if (!rowId) {
            return <span className="text-xs text-gray-400 dark:text-gray-500">-</span>;
          }

          return (
            <SourceColorTableCell
              sourceId={rowId}
              sourceName={props.row.original?.name}
              color={color}
              isSaving={rowColorPending}
              onSaveColor={(id, nextColor, opts) => {
                updateSourceColor(
                  { id, color: nextColor },
                  {
                    onSuccess: () => {
                      opts?.onSuccess?.();
                    },
                  }
                );
              }}
            />
          );
        },
      },
      {
        id: 'price',
        header: 'Price',
        accessorKey: 'price',
        cell: (props: any) => `€${props?.getValue()}`,
        sortable: true,
      },
      {
        id: 'provider',
        header: 'Provider',
        accessorKey: 'provider.name',
        cell: (props: any) => {
          const provider = props.row.original?.provider;
          return provider?.name || '-';
        },
        sortable: true,
      },
      {
        id: 'lead_count',
        header: 'Lead Count',
        accessorKey: 'lead_count',
        sortable: true,
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'active',
        sortable: false,
        enableSorting: false,
        cell: (props: any) =>
          props.getValue() ? (
            <span className="bg-evergreen rounded-full px-2 py-1 text-xs font-bold text-white">
              Active
            </span>
          ) : (
            <span className="bg-rust rounded-full px-2 py-1 text-xs font-bold text-white">
              Inactive
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
    [handleEdit, updateSourceColor, isColorUpdatePending, colorUpdateVars?.id]
  );

  // BaseTable configuration
  const tableConfig = useBaseTable({
    tableName: 'sources',
    data: sourcesData?.data || [],
    loading: isLoading,
    totalItems: sourcesData?.meta?.total || 0,
    pageIndex,
    pageSize,
    search,
    columns,
    selectable: true,
    selectedRows: selectedSources,
    onSelectAll: handleSelectAllSource,
    isBackendSortingReady: true,
    bulkActionsConfig: {
      entityName: 'sources',
      deleteUrl: '/sources/',
      invalidateQueries: ['sources'],
      singleDeleteConfig: {
        deleteFunction: apiDeleteSource,
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
          {!isOpen ? (<>Add <span className="hidden md:inline">Source</span> </>) : ''}
        </Button>
      </div>
    ),
    onRowClick: (row) => handleRowClick(row?._id),
    rowClassName: getRowClassName,
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'Sources',
    pageInfoSubtitlePrefix: 'Total Sources',
  });

  // Get common transition classes
  const layout = getSidebarLayout(isOpen);

  return (
    <div className="flex flex-col gap-4 px-4">
      <div>
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

            <SourceFormSidebar
              key={`source-${sidebarType || 'create'}-${selectedId}-${sidebarKey}`}
              type={sidebarType || ('create' as any)}
              sourceId={selectedId || undefined}
              onSuccess={handleFormSuccess}
              onClose={handleFormSuccess || onOpenSidebar}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourcesDashboardRefactored;
