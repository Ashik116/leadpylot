'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useStages } from '@/services/hooks/useStages';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useDrawerStore } from '@/stores/drawerStore';
import { StageFormSidebar } from './StageFormSidebar';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Card from '@/components/ui/Card';
import { apiDeleteStage, apiGetStages } from '@/services/StagesService';
import useNotification from '@/utils/hooks/useNotification';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname, useSearchParams } from 'next/navigation';
import { useActiveRow } from '@/hooks/useActiveRow';
import { getSidebarLayout } from '@/utils/transitions';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import { useRefreshStages } from '@/stores/stagesStore';
import RoleGuard from '@/components/shared/RoleGuard';

const StagesDashboardRefactored = () => {
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
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [selected, setSelected] = useState<{ name: string; id: string } | null>(null);
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  // Use the active row hook
  const {
    handleRowClick,
    handleAddNew,
    handleEdit,
    handleDelete,
    getRowClassName,
    handleFormSuccess,
  } = useActiveRow({ onHandleSidebar, resetDrawer });

  // Pagination state management
  const searchParams = useSearchParams();
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;

  const { data: stagesData, isLoading } = useStages({
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  });

  const { selected: selectedStages, handleSelectAll: handleSelectAllStage } = useSelectAllApi({
    apiFn: apiGetStages,
    apiParams: {
      page: pageIndex,
      limit: pageSize,
      search: search || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      select: '_id',
    },
    total: stagesData?.meta?.total || 0,
    returnFullObjects: true,
  });
  const refreshStages = useRefreshStages();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteStage(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['stages'] });
      const previousStages = queryClient.getQueryData(['stages']);
      queryClient.setQueryData(['stages'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData?.filter((stage: any) => stage?._id !== deletedId);
      });
      return { previousStages };
    },
    onSuccess: () => {
      openNotification({ type: 'success', massage: 'Stage deleted successfully' });
      setDeleteConfirmDialogOpen(false);
      setSelected(null);
      // Use the hook's handleDelete function
      handleDelete();
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      // Refresh global Zustand store
      refreshStages();
    },
    onError: (err, deletedId, context) => {
      if (context?.previousStages) {
        queryClient.setQueryData(['stages'], context.previousStages);
      }
      openNotification({ type: 'danger', massage: 'Failed to delete Stage' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    },
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
                handleEdit(props.row.original?._id);
              }}
            />
            <Button
              variant="plain"
              size="xs"
              className="text-sand-2 hover:text-rust"
              icon={<ApolloIcon name="trash" className="text-md" />}
              onClick={(e) => {
                e.stopPropagation();
                setSelected({ name: props.row.original?.name, id: props.row.original?._id });
                setDeleteConfirmDialogOpen(true);
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
    tableName: 'stages',
    data: stagesData?.data || [],
    loading: isLoading,
    totalItems: stagesData?.meta?.total || 0,
    pageIndex,
    pageSize,
    search,
    columns,
    returnFullObjects: true,
    selectable: true,
    selectedRows: selectedStages,
    onSelectAll: handleSelectAllStage,
    isBackendSortingReady: true,
    bulkActionsConfig: {
      entityName: 'stages',
      deleteUrl: '/settings/stage',
      invalidateQueries: ['stages'],
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
    deleteButton: true,
    showPagination: !isOpen,
    extraActions: (
      <div className="min-h-6 max-h-6 overflow-hidden">
        <Button
          variant="solid"
          icon={<ApolloIcon name={isOpen ? 'arrow-right' : 'plus'} className="text-xs" />}
          onClick={!isOpen ? handleAddNew : onOpenSidebar}
          size="xs"
        >
          {!isOpen ? (
            <>
              Add <span className="hidden md:inline">Stage</span>{' '}
            </>
          ) : (
            ''
          )}
        </Button>
      </div>
    ),
    onRowClick: (row) => handleRowClick(row?._id),
    rowClassName: getRowClassName,
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'Stages',
    pageInfoSubtitlePrefix: 'Total Stages',
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
            className={`${layout.sidebar} border-gray-100 text-sm lg:border-l-2 lg:pl-2`}
            style={layout.sidebarStyles}
          >
            <Card className="border-none">
              <div className="flex h-full flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg capitalize">
                    {sidebarType === 'create'
                      ? 'Add New Stage'
                      : `${stagesData?.data?.find((stage: any) => stage._id === selectedId)?.name || 'Stage'} Edit`}
                  </h2>
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={<ApolloIcon name="times" className="text-md" />}
                    onClick={resetDrawer || onOpenSidebar}
                  />
                </div>
                <div className="w-full">
                  {sidebarType && (
                    <StageFormSidebar
                      key={`stage-${sidebarType}-${selectedId}-${sidebarKey}`}
                      type={sidebarType as any}
                      stageId={selectedId || undefined}
                      onClose={handleFormSuccess}
                    />
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        type="warning"
        isOpen={deleteConfirmDialogOpen}
        title="Warning"
        onCancel={() => {
          setDeleteConfirmDialogOpen(false);
          setSelected(null);
        }}
        onConfirm={async () => {
          if (selected) {
            deleteMutation.mutate(selected?.id);
          }
        }}
        confirmButtonProps={{ disabled: deleteMutation.isPending }}
      >
        <p>Are you sure you want to delete {selected?.name}?</p>
      </ConfirmDialog>
    </div>
  );
};

export default StagesDashboardRefactored;
