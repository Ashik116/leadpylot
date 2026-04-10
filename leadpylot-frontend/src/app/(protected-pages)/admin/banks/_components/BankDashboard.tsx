'use client';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ScrollBar from '@/components/ui/ScrollBar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import DataTable from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { useDeleteBank, useBanks } from '@/services/hooks/useSettings';
import { Bank } from '@/services/SettingsService';
import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from 'classnames';
import LogoPreview from '@/components/shared/LogoPreview/LogoPreview';
import { TableShimmer } from '@/components/shared/loaders';

const BankDashboard = () => {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: banksResponse, isLoading } = useBanks({
    page,
    limit: pageSize,
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  // Always call the hook, but only use it when we have a selected bank ID
  // We use a default empty string to avoid passing null
  const deleteBank = useDeleteBank(selectedBankId || '');

  const handleDeleteConfirmation = async () => {
    if (!selectedBankId) {
      //console.error('No bank selected for deletion');
      return;
    }

    try {
      await deleteBank.mutateAsync();
      toast.push(
        <Notification title="Bank Deleted" type="success">
          Bank has been successfully deleted
        </Notification>
      );
      setIsDeleteDialogOpen(false);
      setSelectedBankId(null);
    } catch (error: any) {
      // Extract more detailed error information
      const statusCode = error?.response?.status || '';
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        (error instanceof Error ? error?.message : 'Unknown error');

      toast.push(
        <Notification title={`Deletion Failed (${statusCode})`} type="danger">
          {errorMessage}
        </Notification>
      );
      //console.error('Delete bank error:', error);

      // Log additional details for debugging
      if (error.response) {
        /* console.error('Error response:', {
          status: error.response.status,
          data: error.response.data,
        });*/
      }
    }
  };

  const handleRowClick = (id: string) => {
    router.push(`/admin/banks/${id}`);
  };

  const columns: ColumnDef<Bank>[] = [
    {
      header: () => <span>Status</span>,
      accessorKey: 'state',
      cell: (props) => (
        <div>
          <Badge
            className={classNames(
              'block w-14 text-center',
              props.row.original?.state === 'active' ? 'bg-evergreen' : 'bg-rust'
            )}
            content={props.row.original?.state}
          />
        </div>
      ),
    },
    {
      header: () => <span>Logo</span>,
      accessorKey: 'logo',
      cell: (props) => {
        return (
          <LogoPreview
            attachmentId={props.row.original?.logo}
            size="md"
            alt={`${props.row.original?.name} Logo`}
          />
        );
      },
    },
    {
      header: () => <span>Name</span>,
      accessorKey: 'name',
    },
    {
      header: () => <span>Details</span>,
      id: 'details',
      cell: (props) => (
        <div>
          {props.row.original?.country}
          <br />
          <strong>LEI:</strong> {props.row.original?.lei_code}
        </div>
      ),
    },
    {
      header: () => <span>Limits</span>,
      id: 'limits',
      cell: (props) => (
        <div>
          <strong>Min:</strong> {props.row.original?.min_limit}
          <br />
          <strong>Max:</strong> {props.row.original?.max_limit}
        </div>
      ),
    },
    {
      header: () => <span>Actions</span>,
      id: 'actions',
      cell: (props) => (
        <div>
          <Button
            variant="plain"
            size="xs"
            className="text-gray-500 hover:text-blue-700"
            icon={<ApolloIcon name="pen" className="text-md" />}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/banks/${props.row.original?._id}`);
            }}
          />
          <Button
            variant="plain"
            size="xs"
            className="text-gray-500 hover:text-red-700"
            icon={<ApolloIcon name="trash" className="text-md" />}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBankId(props.row.original?._id);
              setIsDeleteDialogOpen(true);
            }}
          />
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 overflow-hidden lg:flex-row">
          <div className="w-full">
            <TableShimmer
              rows={10}
              headers={['Status', 'Logo', 'Name', 'Details', 'Limits', 'Actions']}
              showCard={true}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <div className="mb-4">
            <h1>Banks</h1>
          </div>
          <Link href="/admin/banks/create" className="mb-4">
            <Button variant="solid" icon={<ApolloIcon name="plus" className="text-md" />}>
              Create Bank Account
            </Button>
          </Link>
        </div>
        <ScrollBar>
          <div className="min-w-max">
            <DataTable
              data={banksResponse?.data || []}
              columns={columns}
              loading={isLoading}
              pagingData={{
                total: banksResponse?.meta?.total || 0,
                pageIndex: page,
                pageSize,
              }}
              onPaginationChange={setPage}
              onSelectChange={setPageSize}
              onRowClick={(row) => handleRowClick(row.original?._id)}
            />
          </div>
        </ScrollBar>
      </Card>

      <ConfirmDialog
        type="warning"
        isOpen={isDeleteDialogOpen}
        title="Confirm Deletion"
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setSelectedBankId(null);
        }}
        onConfirm={handleDeleteConfirmation}
        confirmButtonProps={{ disabled: deleteBank?.isPending }}
      >
        <p>Are you sure you want to delete this bank?</p>
      </ConfirmDialog>
    </div>
  );
};

export default BankDashboard;
