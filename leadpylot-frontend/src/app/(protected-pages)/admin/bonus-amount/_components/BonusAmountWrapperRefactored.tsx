'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useBonusAmounts, useDeleteBonusAmount } from '@/services/hooks/settings/useBonus';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Card from '@/components/ui/Card';
import BonusAmountFormWrapper from './BonusAmountFormWrapper';
import { useDrawerStore } from '@/stores/drawerStore';
import { usePathname, useSearchParams } from 'next/navigation';
import { useActiveRow } from '@/hooks/useActiveRow';
import { getSidebarLayout } from '@/utils/transitions';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { apiGetBonusAmounts } from '@/services/settings/BonusService';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import RoleGuard from '@/components/shared/RoleGuard';

const BonusAmountWrapperRefactored = () => {
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
  const [selected, setSelected] = useState<{ bonus_amount: string; id: string } | null>(null);

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
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;

  const { data: bonusAmountsData, isLoading } = useBonusAmounts({
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  });
  const { selected: selectedBonusAmounts, handleSelectAll: handleSelectAllBonusAmount } =
    useSelectAllApi({
      apiFn: apiGetBonusAmounts,
      apiParams: {
        page: pageIndex,
        limit: pageSize,
        search: search || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        select: '_id',
      },
      total: bonusAmountsData?.meta?.total || 0,
      returnFullObjects: true,
    });
  const deleteBonusAmount = useDeleteBonusAmount();

  const bonuses = bonusAmountsData?.data || [];
  // Define columns for the DataTable
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'bonus_amount',
        header: 'Bonus Amount',
        accessorKey: 'bonus_amount',
        sortable: true,
        cell: (props) => props.row.original?.name,
      },
      {
        id: 'amount',
        header: 'Amount',
        accessorKey: 'info.amount',
        cell: (props) => props.row.original?.info?.amount,
        sortable: true,
      },
      {
        id: 'code',
        header: 'Code',
        accessorKey: 'info.code',
        cell: (props) => props.row.original?.info?.code,
        sortable: true,
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
                setSelected({
                  bonus_amount: props.row.original?.name,
                  id: props.row.original?._id,
                });
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
    tableName: 'bonus-amounts',
    data: bonuses,
    loading: isLoading,
    totalItems: bonusAmountsData?.meta?.total || 0,
    pageIndex,
    isBackendSortingReady: true,
    pageSize,
    search,
    columns,
    showPagination: !isOpen,
    selectable: true,
    returnFullObjects: true,
    selectedRows: selectedBonusAmounts,
    onSelectAll: handleSelectAllBonusAmount,
    bulkActionsConfig: {
      entityName: 'bonus-amounts',
      deleteUrl: '/settings/bonus_amount',
      invalidateQueries: ['bonus-amounts'],
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
      <div className="min-h-6 max-h-6 overflow-hidden">
        <Button
          variant="solid"
          icon={<ApolloIcon name={isOpen ? 'arrow-right' : 'plus'} className="text-xs" />}
          onClick={!isOpen ? handleAddNew : onOpenSidebar}
          size="xs"
        >
          {!isOpen ? (
            <>
              Add <span className="hidden md:inline">Bonus</span>{' '}
            </>
          ) : (
            ''
          )}
        </Button>
      </div>
    ),
    onRowClick: (row) => handleRowClick(row._id),
    rowClassName: getRowClassName,
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'Bonus Amounts',
    pageInfoSubtitlePrefix: 'Total Bonuses',
    hybridResize: false,
    dynamicallyColumnSizeFit: true,
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
              <BonusAmountFormWrapper
                key={`bonus-amount-${sidebarType || 'create'}-${selectedId}-${sidebarKey}`}
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
            deleteBonusAmount.mutate(selected?.id, {
              onSuccess: () => {
                setDeleteConfirmDialogOpen(false);
                setSelected(null);
                // Use the hook's handleDelete function
                handleDelete();
              },
            });
          }
        }}
        confirmButtonProps={{ disabled: deleteBonusAmount.isPending }}
      >
        <p>Are you sure you want to delete {selected?.bonus_amount}?</p>
      </ConfirmDialog>
    </div>
  );
};

export default BonusAmountWrapperRefactored;
