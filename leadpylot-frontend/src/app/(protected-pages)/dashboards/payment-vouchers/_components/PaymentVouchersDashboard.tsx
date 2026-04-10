'use client';

import CommonActionBar from '@/components/shared/ActionBar/CommonActionBar';
import DataTable, { ColumnDef } from '@/components/shared/DataTable';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Card from '@/components/ui/Card';
import ScrollBar from '@/components/ui/ScrollBar';
// import FileUploaderDialog from '@/components/ui/Upload/FileUploaderDialog';
import { useDocumentHandler } from '@/hooks/useDocumentHandler';
import { useColumnCustomization } from '@/hooks/useColumnCustomization';
import { useSearchAndPaganation } from '@/hooks/useSearchPagination';
import { useBulkActions } from '@/hooks/useBulkActions';
import {
  useAddDocumentsToPaymentVoucher,
  usePaymentVouchers,
} from '@/services/hooks/usePaymentVouchers';
import type { PaymentVoucher } from '@/services/PaymentVouchersService';
import classNames from '@/utils/classNames';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
import { getPaginationOptions } from '@/utils/paginationNumber';
import { getStatusBadgeColor } from '@/utils/utils';
import { useRouter } from 'next/navigation';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import PaymentVoucherShortDetails from './PaymentVoucherShortDetails';
import { FileHandler } from '../../accepted-offers/_components/FileHandler';
import { useUpdateOffer } from '@/services/hooks/useLeads';
import { useUpdateOpening } from '@/services/hooks/useOpenings';
import { OpeningFileType } from '@/services/OpeningsService';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

// Memoized Components
const StatusBadge = React.memo<{ status: string }>(({ status }) => {
  const statusName = status.toLowerCase();
  const badgeColor = getStatusBadgeColor(statusName);

  return (
    <div>
      <Badge
        className={classNames('block w-20 text-center capitalize', badgeColor)}
        innerClass="text-nowrap"
        content={statusName}
      />
    </div>
  );
});
StatusBadge.displayName = 'StatusBadge';

const ActionCell = React.memo<{ icon: string; onClick: () => void; children: React.ReactNode }>(
  ({ icon, onClick, children }) => (
    <div
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      data-no-navigate="true"
    >
      <Button
        icon={<ApolloIcon name={icon as any} className="text-md" />}
        className="gap-2"
        size="xs"
        onClick={onClick}
      >
        {children}
      </Button>
    </div>
  )
);
ActionCell.displayName = 'ActionCell';

const ExpanderCell = React.memo<{ isExpanded: boolean; onToggle: () => void }>(
  ({ isExpanded, onToggle }) => (
    <div
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      data-no-navigate="true"
      className="flex h-full cursor-pointer items-center justify-center"
    >
      <ApolloIcon
        name={isExpanded ? 'chevron-arrow-down' : 'chevron-arrow-right'}
        className="text-2xl"
      />
    </div>
  )
);
ExpanderCell.displayName = 'ExpanderCell';

// Main Component
export const PaymentVouchersDashboard = React.memo(() => {
  const router = useRouter();
  const { onAppendQueryParams } = useAppendQueryParams();

  // State
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isColumnOrderOpen, setIsColumnOrderOpen] = useState(false);
  const customizeButtonRef = useRef<HTMLButtonElement>(null);

  // Bulk actions hook
  const {
    selectedItems: selectedVouchers,
    deleteConfirmOpen,
    handleCheckboxChange,
    handleSelectAll,
    handleClearSelection,
    setDeleteConfirmOpen,
    handleDeleteConfirm,
    isDeleting,
  } = useBulkActions({
    entityName: 'payment vouchers',
    deleteUrl: '/payment-vouchers/',
    invalidateQueries: ['payment-vouchers', 'leads'],
  });

  // URL params and pagination
  const { page, pageSize, setPage, setPageSize, search } = useSearchAndPaganation();
  const limit = pageSize;

  // API data
  const {
    data: paymentVouchersResponse,
    isLoading,
    refetch,
  } = usePaymentVouchers({
    page,
    limit,
  });

  const paymentVouchers = paymentVouchersResponse?.data || [];
  const totalVouchers = paymentVouchersResponse?.meta?.total || 0;

  // Mutations
  const addDocumentsToPaymentVoucherMutation = useAddDocumentsToPaymentVoucher();
  const updateOfferMutation = useUpdateOffer({
    onSuccess: () => {
      // Refetch payment vouchers data when offer is updated
      refetch();
    },
  });
  const updateOpeningMutation = useUpdateOpening({
    onSuccess: () => {
      // Refetch payment vouchers data when opening is updated
      refetch();
    },
  });
  // Document handling hook
  const documentHandler = useDocumentHandler();
  // Filtered data
  const filteredVouchers = useMemo(() => {
    if (!paymentVouchers) return [];
    if (!search || !search.trim()) return paymentVouchers;

    const term = search?.toLowerCase()?.trim();
    return paymentVouchers?.filter((voucher) => {
      const leadName = voucher?.lead?.contact_name || voucher?.lead?.display_name || '';
      const email = voucher?.lead?.email_from || '';
      const phone = voucher?.lead?.phone || '';
      const offerTitle = voucher?.offer?.title || '';
      const investmentVolume = voucher?.offer?.investment_volume?.toString() || '';
      const interestRate = voucher?.offer?.interest_rate?.toString() || '';
      const paymentTerms = voucher?.offer?.payment_terms?.name || '';
      const status = voucher?.active ? 'Active' : 'Inactive';

      return (
        leadName?.toLowerCase()?.includes(term) ||
        email?.toLowerCase()?.includes(term) ||
        phone?.toLowerCase()?.includes(term) ||
        offerTitle?.toLowerCase()?.includes(term) ||
        investmentVolume?.includes(term) ||
        interestRate?.includes(term) ||
        paymentTerms?.toLowerCase()?.includes(term) ||
        status?.toLowerCase()?.includes(term)
      );
    });
  }, [paymentVouchers, search]);

  const handleRowClick = (row: any) => {
    if (row?.lead?._id) {
      router.push(`/dashboards/leads/${row?.lead?._id}`);
    }
  };
  // Handlers

  const handleExpanderToggle = useCallback((id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  }, []);

  // Columns for CommonActionBar (static structure only)
  const columnsForActionBar: ColumnDef<PaymentVoucher>[] = useMemo(
    () => [
      { id: 'expander', header: () => <span className="whitespace-nowrap">Expander</span> },
      { id: 'checkbox', header: () => <span className="whitespace-nowrap">Select</span> },
      { id: 'leadName', header: () => <span className="whitespace-nowrap">Lead</span> },
      { id: 'createdOn', header: () => <span className="whitespace-nowrap">Created on</span> },
      { id: 'email', header: () => <span className="whitespace-nowrap">Email</span> },
      { id: 'contract', header: () => <span className="whitespace-nowrap">Contract</span> },
      {
        id: 'signedContract',
        header: () => <span className="whitespace-nowrap">Signed Contract</span>,
      },
      { id: 'idDocs', header: () => <span className="whitespace-nowrap">ID Docs</span> },
      {
        id: 'acceptedOffer',
        header: () => <span className="whitespace-nowrap">Accepted Offer</span>,
      },
      {
        id: 'paymentVoucher',
        header: () => <span className="whitespace-nowrap">Payment Voucher</span>,
      },
      { id: 'Status', header: () => <span className="whitespace-nowrap">Status</span> },
      {
        id: 'investmentVolume',
        header: () => <span className="whitespace-nowrap">Investment Amount</span>,
      },
      {
        id: 'interestRate',
        header: () => <span className="whitespace-nowrap">Rate</span>,
      },
      {
        id: 'paymentTerms',
        header: () => <span className="whitespace-nowrap">Payment Terms</span>,
      },
    ],
    []
  );
  const handleFileUpload = useCallback(
    async (id: string, files: File[] | null, table?: string, type?: string) => {
      if (!files || files?.length === 0) return;

      try {
        // Create FormData for file upload
        const fileArray = Array.isArray(files) ? files : [files];
        const formData = new FormData();
        fileArray?.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('documentType', type as string);
        // Upload files to payment voucher
        if (table === 'offer') {
          await updateOfferMutation.mutateAsync({
            id: id,
            data: formData as any,
          });
        } else if (table === 'opening') {
          await updateOpeningMutation.mutateAsync({
            id: id,
            data: { files: fileArray as any, documentType: type as OpeningFileType },
          });
        } else {
          await addDocumentsToPaymentVoucherMutation.mutateAsync({
            id: id,
            data: formData,
          });
        }
        // Optionally show success message or refresh data
        console.log('Files uploaded successfully for payment voucher:', id);
      } catch (error) {
        console.error('Error uploading files:', error);
        // Error handling is managed by the mutation hook
      }
    },
    [addDocumentsToPaymentVoucherMutation, updateOfferMutation, updateOpeningMutation]
  );

  // Generic document handler for multiple document types
  const handleDocumentAction = useCallback(
    (
      paymentVoucher: PaymentVoucher,
      documentType: string,
      action: 'preview' | 'download' | 'delete'
    ) => {
      documentHandler.handleDocumentAction(paymentVoucher, documentType, action);
    },
    [documentHandler]
  );
  // Static column definitions (without dynamic content)
  const staticColumns: ColumnDef<PaymentVoucher>[] = useMemo(
    () => [
      {
        id: 'expander',
        maxSize: 40,
        enableResizing: false,
        header: () => null,
        cell: ({ row }) => (
          <ExpanderCell
            isExpanded={expandedRowId === row.original._id}
            onToggle={() => handleExpanderToggle(row.original._id)}
          />
        ),
      },
      {
        id: 'checkbox',
        maxSize: 30,
        enableResizing: false,
        header: () => {
          const visibleIds = filteredVouchers.map((voucher) => voucher._id);
          const allSelected =
            visibleIds.length > 0 && visibleIds.every((id) => selectedVouchers.includes(id));
          return (
            <div className="flex items-center justify-center">
              <Checkbox checked={allSelected} onChange={() => handleSelectAll(visibleIds)} />
            </div>
          );
        },
        cell: ({ row }) => (
          <div
            className="flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <Checkbox
              checked={selectedVouchers.includes(row.original._id)}
              onChange={() => handleCheckboxChange(row.original._id)}
            />
          </div>
        ),
      },
      {
        id: 'leadName',
        header: () => <span className="whitespace-nowrap">Lead</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.lead?.contact_name || row.original.lead?.display_name || 'N/A'}
          </span>
        ),
      },

      {
        id: 'createdOn',
        header: () => <span className="whitespace-nowrap">Created on</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : 'N/A'}
          </span>
        ),
      },
      {
        id: 'email',
        header: () => <span className="whitespace-nowrap">Email</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original.lead?.email_from || 'N/A'}</span>
        ),
      },
      {
        id: 'contract',
        header: () => <span className="whitespace-nowrap">Contract</span>,
        cell: ({ row }) => (
          <FileHandler
            ObjectData={paymentVouchersResponse}
            id={row.original._id}
            type="contract"
            table="offer"
            handleDocumentAction={handleDocumentAction}
            handleFileUpload={handleFileUpload}
          />
        ),
      },
      {
        id: 'signedContract',
        header: () => <span className="whitespace-nowrap">Signed Contract</span>,
        cell: ({ row }) => (
          <FileHandler
            ObjectData={paymentVouchersResponse}
            id={row.original._id}
            type="contract"
            table="opening"
            handleDocumentAction={handleDocumentAction}
            handleFileUpload={handleFileUpload}
          />
        ),
      },
      {
        id: 'idDocs',
        header: () => <span className="whitespace-nowrap">ID Docs</span>,
        cell: ({ row }) => (
          <FileHandler
            ObjectData={paymentVouchersResponse}
            id={row.original._id}
            type="id"
            table="opening"
            handleDocumentAction={handleDocumentAction}
            handleFileUpload={handleFileUpload}
            multiple={true}
          />
        ),
      },
      {
        id: 'acceptedOffer',
        header: () => <span className="whitespace-nowrap">Accepted Offer</span>,
        cell: () => (
          <ActionCell icon="eye-filled" onClick={() => { }}>
            View
          </ActionCell>
        ),
      },
      {
        id: 'paymentVoucher',
        header: () => <span className="whitespace-nowrap">Payment Voucher</span>,
        cell: ({ row }) => (
          <FileHandler
            ObjectData={paymentVouchersResponse}
            id={row.original._id}
            type="payment_voucher"
            handleDocumentAction={handleDocumentAction}
            handleFileUpload={handleFileUpload}
          />
        ),
      },
      {
        id: 'Status',
        header: () => <span className="whitespace-nowrap">Status</span>,
        cell: ({ row }) => <StatusBadge status={row.original.active ? 'Active' : 'Inactive'} />,
      },
      {
        id: 'investmentVolume',
        header: () => <span className="whitespace-nowrap">Investment Amount</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.offer?.investment_volume?.toFixed(2) || 'N/A'}
          </span>
        ),
      },
      {
        id: 'interestRate',
        header: () => <span className="whitespace-nowrap">Rate</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original.offer?.interest_rate || 'N/A'}</span>
        ),
      },
      {
        id: 'paymentTerms',
        header: () => <span className="whitespace-nowrap">Payment Terms</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.offer?.payment_terms?.name || 'N/A'}
          </span>
        ),
      },
    ],
    [
      expandedRowId,
      handleExpanderToggle,
      filteredVouchers,
      selectedVouchers,
      handleSelectAll,
      handleCheckboxChange,
      router,
      handleFileUpload,
    ]
  );

  // Use the common column customization hook
  const { columnVisibility, renderableColumns, handleColumnVisibilityChange } =
    useColumnCustomization({
      tableName: 'payment-vouchers',
      columns: staticColumns,
    });

  return (
    <Card>
      <div className="mb-4">
        <h1>Payment Vouchers</h1>
        <p>Total Payment Vouchers: {totalVouchers}</p>
      </div>

      <div>
        <CommonActionBar
          selectedItems={selectedVouchers}
          handleClearSelection={handleClearSelection}
          onAppendQueryParams={onAppendQueryParams}
          search={search || ''}
          allColumns={columnsForActionBar}
          columnVisibility={columnVisibility}
          handleColumnVisibilityChange={handleColumnVisibilityChange}
          setDeleteConfirmDialogOpen={setDeleteConfirmOpen}
          setIsColumnOrderDialogOpen={setIsColumnOrderOpen}
          // customizeButtonRef={customizeButtonRef}
          isColumnOrderDialogOpen={isColumnOrderOpen}
          tableName="payment-vouchers"
        />

        <div className="min-w-max">
          <style jsx global>{`
            .payment-vouchers-table tbody tr {
              cursor: pointer;
              position: relative;
            }
            .payment-vouchers-table tbody tr:hover {
              background-color: rgba(0, 0, 0, 0.04);
            }
            .payment-vouchers-table tbody tr td:first-child {
              position: relative;
              z-index: 10;
            }
            .payment-vouchers-table tbody tr td:first-child * {
              position: relative;
              z-index: 10;
            }
            .payment-vouchers-table tbody tr[data-expanded='true'] {
              cursor: default;
            }
            .payment-vouchers-table tbody tr[data-expanded='true']:hover {
              background-color: transparent;
            }
            .payment-vouchers-table tbody tr.expanded-row:hover {
              background-color: transparent !important;
            }
            .payment-vouchers-table tbody tr.expanded-row td {
              background-color: transparent !important;
            }
            .payment-vouchers-table tbody tr.expanded-row:hover td {
              background-color: transparent !important;
            }
          `}</style>
          <ScrollBar>
            <div className="payment-vouchers-table">
              <DataTable
                data={filteredVouchers}
                loading={isLoading}
                onRowClick={(row: any) => handleRowClick(row.original)}
                columns={renderableColumns}
                pagingData={{
                  total: paymentVouchersResponse?.meta?.total || 0,
                  pageIndex: page,
                  pageSize: pageSize,
                }}
                pageSizes={getPaginationOptions(paymentVouchersResponse?.meta?.total || 0)}
                renderExpandedRow={(row) => (
                  <PaymentVoucherShortDetails expandedRowId={expandedRowId || ''} row={row} />
                )}
                onPaginationChange={setPage}
                onSelectChange={setPageSize}
                noData={!filteredVouchers?.length || !paymentVouchersResponse?.data?.length}
              />
            </div>
          </ScrollBar>
        </div>
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        type="warning"
        isOpen={deleteConfirmOpen}
        title="Delete Payment Vouchers"
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        confirmButtonProps={{ disabled: isDeleting }}
      >
        <p>Are you sure you want to delete {selectedVouchers.length} payment voucher(s)?</p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog {...documentHandler.dialogProps} title="Payment Voucher Document" />

      {/* Document Delete Confirmation Dialog */}
      <ConfirmDialog
        type="warning"
        isOpen={documentHandler.deleteConfirmOpen}
        title="Delete Document"
        onCancel={() => documentHandler.setDeleteConfirmOpen(false)}
        onConfirm={documentHandler.handleDeleteConfirm}
        confirmButtonProps={{ disabled: documentHandler.deleteAttachmentMutation.isPending }}
      >
        <p>
          Are you sure you want to delete the document &ldquo;
          {documentHandler?.documentToDelete?.filename}&rdquo;?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>
    </Card>
  );
});

PaymentVouchersDashboard.displayName = 'PaymentVouchersDashboard';
