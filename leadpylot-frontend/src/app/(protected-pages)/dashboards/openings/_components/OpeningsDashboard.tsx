'use client';

import CommonActionBar from '@/components/shared/ActionBar/CommonActionBar';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import DataTable, { ColumnDef } from '@/components/shared/DataTable';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Card from '@/components/ui/Card';
import ScrollBar from '@/components/ui/ScrollBar';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { useBulkCreateConfirmations } from '@/services/hooks/useConfirmations';
import { useDocument } from '@/services/hooks/useDocument';
import { useOpenings, useUpdateOpening } from '@/services/hooks/useOpenings';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CreateConfirmationDialog from './CreateConfirmationDialog';
import OpeningShortDetails from './OpeningShortDetails';
// import { useSession } from 'next-auth/react';‰
import { useColumnCustomization } from '@/hooks/useColumnCustomization';
import { useSearchAndPaganation } from '@/hooks/useSearchPagination';
import { useBulkActions } from '@/hooks/useBulkActions';
import type { Opening, OpeningFileType } from '@/services/OpeningsService';
import { downloadDocument, getDocumentPreviewType } from '@/utils/documentUtils';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
import { getPaginationOptions } from '@/utils/paginationNumber';
import { FileHandler } from '../../accepted-offers/_components/FileHandler';
import { useUpdateOffer } from '@/services/hooks/useLeads';
import { useRouter } from 'next/navigation';

// Memoized Components
const StatusBadge = React.memo<{ active: boolean }>(({ active }) => (
  <span className={`whitespace-nowrap ${active ? 'text-green-600' : 'text-red-600'}`}>
    {active ? 'Active' : 'Inactive'}
  </span>
));
StatusBadge.displayName = 'StatusBadge';

const ActionCell = React.memo<{
  icon: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}>(({ icon, onClick, children, disabled, title }) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      e.preventDefault();
    }}
    data-no-navigate="true"
  >
    <Button
      icon={<ApolloIcon name={icon as any} className="text-md" />}
      className={`gap-2 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      size="xs"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  </div>
));
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
export const OpeningsDashboard = React.memo(() => {
  const { onAppendQueryParams } = useAppendQueryParams();
  const router = useRouter();
  const updateOfferMutation = useUpdateOffer();
  // State
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [createConfirmationDialogOpen, setCreateConfirmationDialogOpen] = useState(false);
  const [isPreparingConfirmations, setIsPreparingConfirmations] = useState(false);
  const [isColumnOrderOpen, setIsColumnOrderOpen] = useState(false);
  const customizeButtonRef = useRef<HTMLButtonElement>(null);

  // URL params

  const { page, pageSize, setPage, setPageSize, search } = useSearchAndPaganation();
  const limit = pageSize;

  // Fetch openings data
  const { data: openingsResponse, isLoading } = useOpenings({
    page,
    limit,
    search: search || undefined,
  });
  const openings = openingsResponse?.data || [];

  // Bulk actions hook
  const {
    selectedItems: selectedRow,
    deleteConfirmOpen,
    handleCheckboxChange,
    handleSelectAll,
    handleClearSelection,
    setDeleteConfirmOpen,
    handleDeleteConfirm,
    isDeleting,
  } = useBulkActions({
    entityName: 'openings',
    deleteUrl: '/openings/',
    invalidateQueries: ['openings', 'leads'],
  });

  // Update opening mutation (for existing openings)
  const updateOpeningMutation = useUpdateOpening({
    onSuccess: () => {
      // Files uploaded successfully - data will refresh automatically
    },
    onError: (error) => {
      console.error('Failed to update opening:', error);
    },
  });

  const handleRowClick = (opening: any) => {
    const id = opening?.lead?._id.toString();
    if (id) {
      router.push(`/dashboards/leads/${id}`);
    }
  };
  // Bulk create confirmations mutation
  const bulkCreateConfirmationsMutation = useBulkCreateConfirmations({
    onSuccess: () => {
      console.log('Confirmations created successfully!');
      setCreateConfirmationDialogOpen(false);
      handleClearSelection();
      setIsPreparingConfirmations(false);
    },
    onError: (error: any) => {
      console.error('Failed to create confirmations:', error);
      setIsPreparingConfirmations(false);
    },
  });

  // Document preview hook
  const documentPreview = useDocumentPreview({
    onDownload: async (documentId: string) => {
      setDownloadDocumentId(documentId);
    },
  });

  // State for downloading documents
  const [downloadDocumentId, setDownloadDocumentId] = useState<string | undefined>(undefined);

  // Fetch document for preview
  const { data: documentData, isLoading: isLoadingDocument } = useDocument(
    documentPreview.selectedDocumentId
  );

  // Fetch document for download
  const { data: downloadDocumentData, isLoading: isLoadingDownload } =
    useDocument(downloadDocumentId);

  // Check if opening has a contract file (required for ID docs upload)
  const hasContractFile = useCallback((opening: Opening) => {
    return opening?.files?.some((file) => file?.document?.type === 'contract') || false;
  }, []);

  // Handlers

  const handleExpanderToggle = useCallback((id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  }, []);

  // Handle ID document upload - update existing opening
  const handleUploadFiles = useCallback(
    (id: string, files: File | File[] | null, table?: string, type?: string) => {
      if (!id || !files) return;

      const fileArray = Array.isArray(files) ? files : [files];
      if (fileArray?.length === 0) return;
      const formData = new FormData();
      fileArray?.forEach((file) => {
        formData.append('files', file);
      });

      if (table === 'offer') {
        formData.append('documentType', 'contract');

        updateOfferMutation.mutateAsync({
          id: id,
          data: formData as any, // The API expects FormData for file uploads
        });
      } else {
        updateOpeningMutation.mutate({
          id: id,
          data: {
            files: fileArray,
            documentType: type as OpeningFileType,
          },
        });
      }
    },
    [updateOpeningMutation, updateOfferMutation]
  );

  // State for multi-file preview
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [previewFiles, setPreviewFiles] = useState<any[]>([]);

  // Generic document handler for multiple document types
  const handleDocumentAction = useCallback(
    (opening: Opening, documentType: string, action: 'preview' | 'download' | 'delete') => {
      const files = opening?.files?.filter((file) => file?.document?.type === documentType) || [];

      if (files?.length > 0) {
        const doc = files[0]?.document;

        switch (action) {
          case 'preview':
            if (files?.length === 1) {
              // Single file - use existing preview
              const fileType = doc?.type || 'application/octet-stream';
              const previewType = getDocumentPreviewType(fileType, doc?.filename);
              documentPreview.openPreview(
                doc?._id,
                doc?.filename,
                previewType as 'pdf' | 'image' | 'other'
              );
            } else {
              // Multiple files - set up multi-file preview
              setPreviewFiles(files);
              setCurrentFileIndex(0);
              const firstDoc = files[0]?.document;
              const fileType = firstDoc?.type || 'application/octet-stream';
              const previewType = getDocumentPreviewType(fileType, firstDoc?.filename);
              documentPreview.openPreview(
                firstDoc?._id,
                firstDoc?.filename,
                previewType as 'pdf' | 'image' | 'other'
              );
            }
            break;
          case 'download':
            setDownloadDocumentId(doc?._id);
            break;
          case 'delete':
            console.log(`Delete ${documentType}:`, doc?._id);
            // TODO: Implement delete functionality
            break;
          default:
            break;
        }
      }
    },
    [documentPreview, setPreviewFiles, setCurrentFileIndex]
  );

  // Navigation functions for multi-file preview
  const handleNextFile = useCallback(() => {
    if (previewFiles?.length > 0 && currentFileIndex < previewFiles?.length - 1) {
      const nextIndex = currentFileIndex + 1;
      const nextDoc = previewFiles[nextIndex]?.document;
      setCurrentFileIndex(nextIndex);

      const fileType = nextDoc?.type || 'application/octet-stream';
      const previewType = getDocumentPreviewType(fileType, nextDoc?.filename);
      documentPreview.openPreview(
        nextDoc?._id,
        nextDoc?.filename,
        previewType as 'pdf' | 'image' | 'other'
      );
    }
  }, [previewFiles, currentFileIndex, documentPreview]);

  const handlePreviousFile = useCallback(() => {
    if (previewFiles?.length > 0 && currentFileIndex > 0) {
      const prevIndex = currentFileIndex - 1;
      const prevDoc = previewFiles[prevIndex]?.document;
      setCurrentFileIndex(prevIndex);

      const fileType = prevDoc?.type || 'application/octet-stream';
      const previewType = getDocumentPreviewType(fileType, prevDoc?.filename);
      documentPreview.openPreview(
        prevDoc?._id,
        prevDoc?.filename,
        previewType as 'pdf' | 'image' | 'other'
      );
    }
  }, [previewFiles, currentFileIndex, documentPreview]);

  // Handler for creating confirmations
  const handleCreateConfirmation = useCallback(
    async (notes?: string) => {
      if (selectedRow?.length === 0) return;

      setIsPreparingConfirmations(true);

      try {
        const confirmationRequests = selectedRow?.map((openingId) => ({
          opening_id: openingId,
          notes: notes || undefined,
        }));

        bulkCreateConfirmationsMutation.mutate(confirmationRequests as any);
      } catch (error) {
        console.error('Error preparing confirmation requests:', error);
        setIsPreparingConfirmations(false);
      }
    },
    [selectedRow, bulkCreateConfirmationsMutation]
  );

  // Static column definitions (without dynamic content)
  const staticColumns: ColumnDef<Opening>[] = useMemo(
    () => [
      {
        id: 'expander',
        maxSize: 40,
        enableResizing: false,
        header: () => null,
        cell: ({ row }) => (
          <ExpanderCell
            isExpanded={expandedRowId === row.original?._id?.toString()}
            onToggle={() => handleExpanderToggle(row.original?._id?.toString() || '')}
          />
        ),
      },
      {
        id: 'checkbox',
        maxSize: 30,
        enableResizing: false,
        header: () => {
          const visibleIds = openings
            ?.map((opening) => opening?._id?.toString())
            ?.filter(Boolean) as string[];
          const allSelected =
            visibleIds?.length > 0 && visibleIds?.every((id) => selectedRow?.includes(id));
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
              checked={selectedRow?.includes(row.original?._id?.toString() || '')}
              onChange={() => handleCheckboxChange(row.original?._id?.toString() || '')}
            />
          </div>
        ),
      },
      {
        id: 'offerName',
        header: () => <span className="whitespace-nowrap">Offer</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original?.offer?.title || ''}</span>
        ),
      },
      {
        id: 'status',
        header: () => <span className="whitespace-nowrap">Status</span>,
        cell: ({ row }) => <StatusBadge active={row.original?.active || false} />,
      },
      {
        id: 'filesCount',
        header: () => <span className="whitespace-nowrap">Files</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original?.files?.length || 0} file(s)</span>
        ),
      },
      {
        id: 'createdAt',
        header: () => <span className="whitespace-nowrap">Created At</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original?.createdAt ? new Date(row.original?.createdAt).toLocaleString() : ''}
          </span>
        ),
      },
      {
        id: 'contract',
        header: () => <span className="whitespace-nowrap">Contract</span>,
        cell: ({ row }) => (
          <FileHandler
            ObjectData={openingsResponse}
            id={row.original?._id}
            type="contract"
            table="offer"
            handleDocumentAction={handleDocumentAction}
            handleFileUpload={handleUploadFiles}
          />
        ),
      },
      {
        id: 'signedContract',
        header: () => <span className="whitespace-nowrap">Signed Contract</span>,
        cell: ({ row }) => (
          <FileHandler
            ObjectData={openingsResponse}
            id={row.original?._id}
            type="contract"
            handleDocumentAction={handleDocumentAction}
            handleFileUpload={handleUploadFiles}
          />
        ),
      },
      {
        id: 'idDocs',
        header: () => <span className="whitespace-nowrap">ID Docs</span>,
        cell: ({ row }) => (
          <FileHandler
            ObjectData={openingsResponse}
            id={row.original?._id}
            type="id"
            handleDocumentAction={handleDocumentAction}
            handleFileUpload={handleUploadFiles}
            multiple={true}
          />
        ),
      },
    ],
    [
      expandedRowId,
      handleExpanderToggle,
      openings,
      selectedRow,
      handleSelectAll,
      handleCheckboxChange,
      handleDocumentAction,
      handleUploadFiles,
      hasContractFile,
      handleNextFile,
      handlePreviousFile,
    ]
  );

  // Columns for CommonActionBar (static structure only)
  const columnsForActionBar: ColumnDef<Opening>[] = useMemo(
    () => [
      { id: 'expander', header: () => <span className="whitespace-nowrap">Expander</span> },
      { id: 'checkbox', header: () => <span className="whitespace-nowrap">Select</span> },
      { id: 'offerName', header: () => <span className="whitespace-nowrap">Offer</span> },
      { id: 'creatorName', header: () => <span className="whitespace-nowrap">Creator</span> },
      { id: 'email', header: () => <span className="whitespace-nowrap">Creator Email</span> },
      { id: 'status', header: () => <span className="whitespace-nowrap">Status</span> },
      { id: 'filesCount', header: () => <span className="whitespace-nowrap">Files</span> },
      { id: 'createdAt', header: () => <span className="whitespace-nowrap">Created At</span> },
      { id: 'contract', header: () => <span className="whitespace-nowrap">Contract</span> },
      {
        id: 'signedContract',
        header: () => <span className="whitespace-nowrap">Signed Contract</span>,
      },
      { id: 'idDocs', header: () => <span className="whitespace-nowrap">ID Docs</span> },
    ],
    []
  );

  // Use the common column customization hook
  const { columnVisibility, renderableColumns, handleColumnVisibilityChange } =
    useColumnCustomization({
      tableName: 'openings',
      columns: staticColumns,
    });

  // Effects for document handling
  useEffect(() => {
    if (documentData && documentPreview.isOpen) {
      try {
        const url = URL.createObjectURL(documentData);
        documentPreview.setPreviewUrl(url);
      } catch (error) {
        console.error('Error creating blob URL:', error);
      }
    }
  }, [documentData, documentPreview.isOpen, documentPreview.documentName]);

  // Reset preview files when dialog closes
  useEffect(() => {
    if (!documentPreview.isOpen) {
      setPreviewFiles([]);
      setCurrentFileIndex(0);
    }
  }, [documentPreview.isOpen]);

  useEffect(() => {
    if (downloadDocumentData && downloadDocumentId) {
      try {
        const contentType = downloadDocumentData?.type || 'application/octet-stream';
        downloadDocument(downloadDocumentData, documentPreview?.documentName || '', contentType);
      } catch (error) {
        console.error('Error downloading document:', error);
      } finally {
        setDownloadDocumentId(undefined);
      }
    }
  }, [downloadDocumentData, downloadDocumentId, documentPreview?.documentName]);

  return (
    <Card>
      <div className="mb-4">
        <h1>Openings</h1>
        <p>
          Total Openings:
          {openingsResponse?.meta?.total && (
            <span className="ml-2 text-sm text-gray-600">{openingsResponse?.meta?.total}</span>
          )}
        </p>
      </div>

      <div>
        <CommonActionBar
          selectedItems={selectedRow}
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
          tableName="openings"
        >
          {selectedRow?.length > 0 && (
            <div className="my-4 flex items-center gap-2">
              <Button
                variant="secondary"
                icon={<ApolloIcon name="send-inclined" className="text-md" />}
                onClick={() => setCreateConfirmationDialogOpen(true)}
                disabled={!selectedRow?.length}
              >
                Send to Confirmation
              </Button>
            </div>
          )}
        </CommonActionBar>

        <div className="min-w-max">
          <style jsx global>{`
            .openings-table tbody tr {
              cursor: pointer;
              position: relative;
            }
            .openings-table tbody tr:hover {
              background-color: rgba(0, 0, 0, 0.04);
            }
            .openings-table tbody tr td:first-child {
              position: relative;
              z-index: 10;
            }
            .openings-table tbody tr td:first-child * {
              position: relative;
              z-index: 10;
            }
            .openings-table tbody tr[data-expanded='true'] {
              cursor: default;
            }
            .openings-table tbody tr[data-expanded='true']:hover {
              background-color: transparent;
            }
            .openings-table tbody tr.expanded-row:hover {
              background-color: transparent !important;
            }
            .openings-table tbody tr.expanded-row td {
              background-color: transparent !important;
            }
            .openings-table tbody tr.expanded-row:hover td {
              background-color: transparent !important;
            }
          `}</style>
          <ScrollBar>
            <div className="openings-table">
              <DataTable
                onRowClick={(row) => handleRowClick(row.original)}
                data={openings}
                loading={isLoading}
                columns={renderableColumns}
                pagingData={{
                  total: openingsResponse?.meta?.total || 0,
                  pageIndex: page,
                  pageSize: limit,
                }}
                pageSizes={getPaginationOptions(openingsResponse?.meta?.total || 0)}
                renderExpandedRow={(row) => (
                  <OpeningShortDetails expandedRowId={expandedRowId || ''} row={row} />
                )}
                noData={!openings?.length || !openingsResponse?.data?.length}
                onPaginationChange={setPage}
                onSelectChange={setPageSize}
                tableClassName="max-h-[65dvh]"
              />
            </div>
          </ScrollBar>
        </div>
      </div>

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog
        {...documentPreview.dialogProps}
        isLoading={isLoadingDocument}
        isDownloading={
          downloadDocumentId === documentPreview?.selectedDocumentId && isLoadingDownload
        }
        title="Contract Document"
        showNavigation={previewFiles?.length > 1}
        currentIndex={currentFileIndex}
        totalFiles={previewFiles?.length}
        onNext={handleNextFile}
        onPrevious={handlePreviousFile}
      />

      <ConfirmDialog
        type="warning"
        isOpen={deleteConfirmOpen}
        title="Delete Openings"
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        confirmButtonProps={{ disabled: isDeleting }}
      >
        <p>Are you sure you want to delete {selectedRow?.length} Opening(s)?</p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>

      {/* Create Confirmation Dialog */}
      <CreateConfirmationDialog
        isOpen={createConfirmationDialogOpen}
        onClose={() => {
          setCreateConfirmationDialogOpen(false);
          handleClearSelection();
        }}
        onCreate={handleCreateConfirmation}
        isCreating={bulkCreateConfirmationsMutation.isPending || isPreparingConfirmations}
      />
    </Card>
  );
});

OpeningsDashboard.displayName = 'OpeningsDashboard';
