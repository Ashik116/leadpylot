'use client';

import CommonActionBar from '@/components/shared/ActionBar/CommonActionBar';
import DataTable, { ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Card from '@/components/ui/Card';
import ScrollBar from '@/components/ui/ScrollBar';
// import FileUploaderDialog from '@/components/ui/Upload/FileUploaderDialog';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import { useColumnCustomization } from '@/hooks/useColumnCustomization';
import { useDocumentHandler } from '@/hooks/useDocumentHandler';
import { useSearchAndPaganation } from '@/hooks/useSearchPagination';
import type { Opening } from '@/services/ConfirmationsService';
import { useConfirmations, useUpdateConfirmation } from '@/services/hooks/useConfirmations';
import { useUpdateOpening } from '@/services/hooks/useOpenings';
import { useCreatePaymentVoucher } from '@/services/hooks/usePaymentVouchers';
import { OpeningFileType } from '@/services/OpeningsService';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
import { getPaginationOptions } from '@/utils/paginationNumber';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import AcceptedOfferShortDetails from './AcceptedOfferShortDetails';
import CreatePaymentVoucherDialog from './CreatePaymentVoucherDialog';
import { FileHandler } from './FileHandler';
import { useUpdateOffer } from '@/services/hooks/useLeads';
import { useBulkActions } from '@/hooks/useBulkActions';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useRouter } from 'next/navigation';

// Types
interface AcceptedOfferTableData {
  _id: string;
  leadName: string;
  createdOn: string;
  email: string;
  offerTitle: string;
  investmentVolume: number;
  interestRate: number;
  agentName: string;
  agentEmail: string;
  filesCount: number;
  notes: string;
  status: string;
  leadId?: string;
}

interface ConfirmationData {
  _id: string;
  opening?: Opening;
  lead?: { contact_name?: string; _id?: string };
  creator_id?: { email?: string };
  offer?: {
    title?: string;
    investment_volume?: number;
    interest_rate?: number;
    agent_id?: { login?: string; email?: string };
  };
  files?: any[];
  notes?: string;
  active?: boolean;
  createdAt: string;
}

// Memoized Components
const StatusBadge = React.memo<{ status: string }>(({ status }) => (
  <span className={`whitespace-nowrap ${status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
    {status === 'active' ? 'Active' : 'Inactive'}
  </span>
));
StatusBadge.displayName = 'StatusBadge';

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

// Utility functions
const transformConfirmationData = (confirmation: ConfirmationData): AcceptedOfferTableData => ({
  _id: confirmation._id,
  leadName: confirmation.lead?.contact_name || 'Unknown Lead',
  leadId: confirmation.lead?._id || '',
  createdOn: new Date(confirmation.createdAt).toLocaleString(),
  email: confirmation.creator_id?.email || '',
  offerTitle: confirmation.offer?.title || 'Unknown Offer',
  investmentVolume: confirmation.offer?.investment_volume || 0,
  interestRate: confirmation.offer?.interest_rate || 0,
  agentName: confirmation.offer?.agent_id?.login || 'Unknown Agent',
  agentEmail: confirmation.offer?.agent_id?.email || '',
  filesCount: confirmation.files?.length || 0,
  notes: confirmation.notes || 'No notes',
  status: confirmation.active ? 'active' : 'inactive',
});

// Main Component
export const AcceptedOffersDashboard = React.memo(() => {
  const router = useRouter();
  const { onAppendQueryParams } = useAppendQueryParams();

  // State
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isColumnOrderOpen, setIsColumnOrderOpen] = useState(false);
  const [isPaymentVoucherDialogOpen, setIsPaymentVoucherDialogOpen] = useState(false);
  const customizeButtonRef = useRef<HTMLButtonElement>(null);

  // Bulk actions hook for both delete and payment voucher operations
  const {
    selectedItems: selectedOffers,
    deleteConfirmOpen,
    handleCheckboxChange,
    handleSelectAll,
    handleClearSelection,
    setDeleteConfirmOpen,
    handleDeleteConfirm,
    isDeleting,
  } = useBulkActions({
    entityName: 'confirmations',
    deleteUrl: '/confirmations/',
    invalidateQueries: ['confirmations', 'leads'],
  });

  // Payment voucher creation mutation
  const createPaymentVoucherMutation = useCreatePaymentVoucher();

  // Confirmation update mutation for file uploads
  const updateConfirmationMutation = useUpdateConfirmation();

  // Document handling hook
  const documentHandler = useDocumentHandler();

  // URL params

  const { page, pageSize, setPage, setPageSize, search } = useSearchAndPaganation();
  const limit = pageSize;

  // API hook to fetch confirmations
  const {
    data: confirmationsData,
    isLoading,
    error,
    refetch,
  } = useConfirmations({
    page,
    limit,
    search: search || undefined,
  }) as {
    data: { data?: ConfirmationData[]; meta?: { total?: number } } | undefined;
    isLoading: boolean;
    error: any;
    refetch: () => void;
  };

  // Transform confirmations data for the table
  const transformedOffers = useMemo(() => {
    if (!confirmationsData?.data) return [];
    return confirmationsData.data.map(transformConfirmationData);
  }, [confirmationsData?.data]);

  // Handlers

  const handleExpanderToggle = useCallback((id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  }, []);

  // Payment voucher handlers
  const handleCreatePaymentVoucher = useCallback(
    async (data: { notes?: string; files?: File[] }) => {
      try {
        // Create payment vouchers for each selected confirmation
        const promises = selectedOffers.map(async (confirmationId) => {
          const formData = new FormData();
          formData.append('confirmation_id', confirmationId);
          formData.append('notes', data.notes || '');

          // Add files to form data
          if (data.files && data.files.length > 0) {
            data.files.forEach((file) => {
              formData.append('files', file);
            });
          }

          return createPaymentVoucherMutation.mutateAsync(formData);
        });

        await Promise.all(promises);

        // Close dialog and clear selection on success
        setIsPaymentVoucherDialogOpen(false);
        handleClearSelection();
      } catch (error) {
        console.error('Error creating payment vouchers:', error);
        // Error handling is managed by the mutation hook
      }
    },
    [selectedOffers, createPaymentVoucherMutation, handleClearSelection]
  );

  const handleSendToPaymentVouchers = useCallback(() => {
    setIsPaymentVoucherDialogOpen(true);
  }, []);

  const updateOpeningMutation = useUpdateOpening({
    onSuccess: () => {
      // Files uploaded successfully - refetch confirmations to update the table
      refetch();
    },
    onError: (error) => {
      console.error('Failed to update opening:', error);
    },
  });
  const updateOfferMutation = useUpdateOffer({
    onSuccess: () => {
      // Refetch openings data when offer is updated
      refetch();
    },
  });
  // File upload handler for individual confirmations
  const handleFileUpload = useCallback(
    async (id: string, files: File[] | null, table?: string, type?: string) => {
      if (!files?.length) return;

      try {
        if (table === 'offer') {
          const formData = new FormData();
          files.forEach((file) => formData.append('files', file));
          formData.append('documentType', type || 'contract');

          await updateOfferMutation.mutateAsync({
            id,
            data: formData as any,
          });
        } else if (table === 'opening') {
          updateOpeningMutation.mutate({
            id,
            data: { files, documentType: type as OpeningFileType },
          });
        } else {
          await updateConfirmationMutation.mutateAsync({
            id,
            data: { files },
          });
        }
      } catch (err) {
        console.error('File upload error:', err);
      }
    },
    [updateOfferMutation, updateOpeningMutation, updateConfirmationMutation]
  );

  // Generic document handler for multiple document types
  const handleDocumentAction = useCallback(
    (
      confirmation: ConfirmationData,
      documentType: string,
      action: 'preview' | 'download' | 'delete'
    ) => {
      documentHandler.handleDocumentAction(confirmation, documentType, action);
    },
    [documentHandler]
  );

  // Columns for CommonActionBar (static structure only)
  const columnsForActionBar: ColumnDef<AcceptedOfferTableData>[] = useMemo(
    () => [
      { id: 'expander', header: () => <span className="whitespace-nowrap">Expander</span> },
      { id: 'checkbox', header: () => <span className="whitespace-nowrap">Select</span> },
      { id: 'leadName', header: () => <span className="whitespace-nowrap">Lead</span> },

      { id: 'createdOn', header: () => <span className="whitespace-nowrap">Created on</span> },
      { id: 'contract', header: () => <span className="whitespace-nowrap">Contract</span> },
      {
        id: 'signedContract',
        header: () => <span className="whitespace-nowrap">Signed Contract</span>,
      },
      { id: 'idDocs', header: () => <span className="whitespace-nowrap">ID Docs</span> },
      { id: 'offerTitle', header: () => <span className="whitespace-nowrap">Offer Title</span> },
      { id: 'agentName', header: () => <span className="whitespace-nowrap">Agent</span> },
      {
        id: 'investmentVolume',
        header: () => <span className="whitespace-nowrap">Investment Amount</span>,
      },
      {
        id: 'interestRate',
        header: () => <span className="whitespace-nowrap">Rate</span>,
      },
      { id: 'filesCount', header: () => <span className="whitespace-nowrap">Files</span> },
      { id: 'notes', header: () => <span className="whitespace-nowrap">Notes</span> },
      { id: 'status', header: () => <span className="whitespace-nowrap">Status</span> },
      {
        id: 'acceptedOffer',
        header: () => <span className="whitespace-nowrap">Upload Documents</span>,
      },
    ],
    []
  );

  const handleRowClick = (row: any) => {
    if (row?.leadId) {
      router.push(`/dashboards/leads/${row.leadId}`);
    }
  };

  // Static column definitions (without dynamic content)
  const staticColumns: ColumnDef<AcceptedOfferTableData>[] = useMemo(
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
          const visibleIds = transformedOffers.map((offer) => offer._id);
          const allSelected =
            visibleIds.length > 0 && visibleIds.every((id) => selectedOffers.includes(id));
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
              checked={selectedOffers.includes(row.original._id)}
              onChange={() => handleCheckboxChange(row.original._id)}
            />
          </div>
        ),
      },
      {
        id: 'leadName',
        header: () => <span className="whitespace-nowrap">Lead</span>,
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.leadName}</span>,
      },

      {
        id: 'createdOn',
        header: () => <span className="whitespace-nowrap">Created on</span>,
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.createdOn}</span>,
      },

      {
        id: 'contract',
        header: () => <span className="whitespace-nowrap">Contract</span>,
        cell: ({ row }) => (
          <FileHandler
            ObjectData={confirmationsData}
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
            ObjectData={confirmationsData}
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
            ObjectData={confirmationsData}
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
        id: 'offer',
        header: () => <span className="whitespace-nowrap">Upload Documents</span>,
        cell: ({ row }) => (
          <FileHandler
            ObjectData={confirmationsData}
            id={row.original._id}
            type="confirmation"
            handleDocumentAction={handleDocumentAction}
            handleFileUpload={handleFileUpload}
          />
        ),
      },
      {
        id: 'offerTitle',
        header: () => <span className="whitespace-nowrap">Offer Title</span>,
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.offerTitle}</span>,
      },

      {
        id: 'agentName',
        header: () => <span className="whitespace-nowrap">Agent</span>,
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.agentName}</span>,
      },
      {
        id: 'investmentVolume',
        header: () => <span className="whitespace-nowrap">Investment Amount</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original.investmentVolume.toFixed(2)}</span>
        ),
      },
      {
        id: 'interestRate',
        header: () => <span className="whitespace-nowrap">Rate</span>,
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.interestRate}%</span>,
      },
      {
        id: 'filesCount',
        header: () => <span className="whitespace-nowrap">Files</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original.filesCount} file(s)</span>
        ),
      },
      {
        id: 'notes',
        header: () => <span className="whitespace-nowrap">Notes</span>,
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.notes}</span>,
      },
      {
        id: 'status',
        header: () => <span className="whitespace-nowrap">Status</span>,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [
      expandedRowId,
      handleExpanderToggle,
      transformedOffers,
      selectedOffers,
      handleSelectAll,
      handleCheckboxChange,
      confirmationsData,
      handleDocumentAction,
      handleFileUpload,
    ]
  );

  // Use the common column customization hook
  const { columnVisibility, renderableColumns, handleColumnVisibilityChange } =
    useColumnCustomization({
      tableName: 'accepted-offers',
      columns: staticColumns,
    });

  if (error) {
    return (
      <Card>
        <div className="mb-4">
          <h1>Accepted Offers</h1>
          <p>Total Accepted Offers: {confirmationsData?.meta?.total ?? 0}</p>
        </div>
        <div className="py-8 text-center text-red-600">
          <p>Error loading accepted offers. Please try again.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4">
        <h1>Accepted Offers</h1>
        <p>Total Accepted Offers: {confirmationsData?.meta?.total ?? 0}</p>
      </div>

      <div>
        <CommonActionBar
          selectedItems={selectedOffers}
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
          tableName="accepted-offers"
        >
          {selectedOffers.length > 0 && (
            <div className="my-4 flex items-center gap-2">
              <Button
                variant="secondary"
                icon={<ApolloIcon name="send-inclined" className="text-md" />}
                disabled={!selectedOffers.length}
                onClick={handleSendToPaymentVouchers}
              >
                Send to Payment Vouchers
              </Button>
            </div>
          )}
        </CommonActionBar>

        <div className="min-w-max">
          <style jsx global>{`
            .accepted-offers-table tbody tr {
              cursor: pointer;
              position: relative;
            }
            .accepted-offers-table tbody tr:hover {
              background-color: rgba(0, 0, 0, 0.04);
            }
            .accepted-offers-table tbody tr td:first-child {
              position: relative;
              z-index: 10;
            }
            .accepted-offers-table tbody tr td:first-child * {
              position: relative;
              z-index: 10;
            }
            .accepted-offers-table tbody tr.expanded-row {
              cursor: default !important;
            }
            .accepted-offers-table tbody tr.expanded-row:hover {
              background-color: transparent !important;
            }
            .accepted-offers-table tbody tr.expanded-row td {
              background-color: transparent !important;
            }
            .accepted-offers-table tbody tr.expanded-row:hover td {
              background-color: transparent !important;
            }
          `}</style>
          <ScrollBar>
            <div className="accepted-offers-table">
              <DataTable
                data={transformedOffers}
                loading={isLoading}
                columns={renderableColumns}
                onRowClick={(row: any) => handleRowClick(row.original)}
                pagingData={{
                  total: confirmationsData?.meta?.total || 0,
                  pageIndex: page,
                  pageSize: pageSize,
                }}
                pageSizes={getPaginationOptions(confirmationsData?.meta?.total || 0)}
                renderExpandedRow={(row) => (
                  <AcceptedOfferShortDetails expandedRowId={expandedRowId || ''} row={row} />
                )}
                onPaginationChange={setPage}
                onSelectChange={setPageSize}
                noData={!transformedOffers?.length || !confirmationsData?.data?.length}
              />
            </div>
          </ScrollBar>
        </div>
      </div>

      <ConfirmDialog
        type="warning"
        isOpen={deleteConfirmOpen}
        title="Delete Confirmations"
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        confirmButtonProps={{ disabled: isDeleting }}
      >
        <p>Are you sure you want to delete {selectedOffers.length} Confirmation(s)?</p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog {...documentHandler.dialogProps} title="Accepted Offer Document" />

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
          {documentHandler.documentToDelete?.filename}&rdquo;?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      {/* Create Payment Voucher Dialog */}
      <CreatePaymentVoucherDialog
        isOpen={isPaymentVoucherDialogOpen}
        onClose={() => setIsPaymentVoucherDialogOpen(false)}
        onCreate={handleCreatePaymentVoucher}
        isCreating={createPaymentVoucherMutation.isPending}
        selectedCount={selectedOffers.length}
        type="payment-voucher"
      />
    </Card>
  );
});

AcceptedOffersDashboard.displayName = 'AcceptedOffersDashboard';
