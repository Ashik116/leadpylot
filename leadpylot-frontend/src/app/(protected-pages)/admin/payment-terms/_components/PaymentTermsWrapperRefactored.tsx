'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { usePaymentTerms, useDeletePaymentTerm } from '@/services/hooks/settings/usePaymentsTerm';

import ConfirmDialog from '@/components/shared/ConfirmDialog';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import Card from '@/components/ui/Card';
import PaymentTermFormWrapper from './PaymentTermFormWrapper';
import { useDrawerStore } from '@/stores/drawerStore';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import { usePathname, useSearchParams } from 'next/navigation';
import { useActiveRow } from '@/hooks/useActiveRow';
import { getSidebarLayout } from '@/utils/transitions';
import { apiGetPaymentTerms } from '@/services/settings/PaymentsTerm';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import RoleGuard from '@/components/shared/RoleGuard';

const PaymentTermsWrapperRefactored = () => {
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

  const { data: paymentTermsData, isLoading } = usePaymentTerms({
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  });
  const deletePaymentTerm = useDeletePaymentTerm();

  const { selected: selectedPaymentTerms, handleSelectAll: handleSelectAllPaymentTerm } =
    useSelectAllApi({
      apiFn: apiGetPaymentTerms,
      apiParams: {
        page: pageIndex,
        limit: pageSize,
        search: search || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
      },
      total: paymentTermsData?.meta?.total || 0,
      returnFullObjects: true,
    });

  const terms = paymentTermsData?.data || [];

  // Define columns for the DataTable
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'type',
        header: 'Type',
        accessorKey: 'info.type',
        cell: (props) => props.row.original?.info?.type,
        sortable: true,
      },
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        sortable: true,
      },
      {
        id: 'months',
        header: 'Months',
        accessorKey: 'info.info.months',
        cell: (props) => props.row.original?.info?.info?.months,
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
    tableName: 'payment-terms',
    data: terms,
    loading: isLoading,
    totalItems: paymentTermsData?.meta?.total || 0,
    pageIndex,
    pageSize,
    isBackendSortingReady: true,
    search,
    columns,
    selectable: true,
    returnFullObjects: true,
    selectedRows: selectedPaymentTerms,
    onSelectAll: handleSelectAllPaymentTerm,
    bulkActionsConfig: {
      entityName: 'payment-terms',
      deleteUrl: '/settings/payment-terms',
      invalidateQueries: ['payment-terms'],
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
    onRowClick: (row) => handleRowClick(row._id),
    rowClassName: getRowClassName,
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'Payment Terms',
    showPagination: !isOpen,
    pageInfoSubtitlePrefix: 'Total Payment Terms',
    extraActions: (
      <div className="flex items-center">
        <Button
          variant="solid"
          size="xs"
          icon={<ApolloIcon name={isOpen ? "arrow-right" : "plus"} />}
          onClick={!isOpen ? handleAddNew : onOpenSidebar}
        >
          {!isOpen ? (<>Add  <span className="hidden md:inline">Payment</span> </>) : ''}
        </Button>
      </div>
    ),
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
              <PaymentTermFormWrapper
                key={`payment-term-${sidebarType || 'create'}-${selectedId}-${sidebarKey}`}
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
            deletePaymentTerm.mutate(selected.id, {
              onSuccess: () => {
                setDeleteConfirmDialogOpen(false);
                setSelected(null);
                // Use the hook's handleDelete function
                handleDelete();
              },
            });
          }
        }}
        confirmButtonProps={{ disabled: deletePaymentTerm.isPending }}
      >
        <p>Are you sure you want to delete {selected?.name}?</p>
      </ConfirmDialog>
    </div>
  );
};

export default PaymentTermsWrapperRefactored;
