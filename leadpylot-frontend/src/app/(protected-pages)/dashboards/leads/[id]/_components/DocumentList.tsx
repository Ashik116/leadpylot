'use client';

import React, { useMemo, useState, useEffect } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { isDev, isDocument } from '@/utils/utils';

// Hooks and Components
import { useDocumentActions, type Attachment } from './hooks/useDocumentActions';
import DocumentCell from './DocumentCell';

// UI Components
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { ColumnDef } from '@/components/shared/DataTable';
import useDocumentUploaderColumns from './hooks/useDocumentUploaderColumns';

// Services and Hooks
import {
  useOfferDocuments,
  useUploadOfferDocuments,
  useDeleteOfferDocument,
} from '@/services/hooks/useOfferDocuments';
import { OfferDocument } from '@/services/OffersService';
import NotFoundData from './LeadAdditionalInfo/NotFoundData';

interface DocumentListProps {
  lead?: any;
}

interface DocumentRow {
  id: string;
  documentType: string;
  contract?: Attachment;
  contractType?: string;
  id_doc?: Attachment;
  idType?: string;
  mail?: Attachment;
  mailType?: string;
  extra?: Attachment;
  extraType?: string;
}

// Convert OfferDocument to Attachment type
const offerDocumentToAttachment = (offerDoc: OfferDocument): Attachment => {
  return {
    id: offerDoc?._id,
    filename: offerDoc?.filename,
    filetype: offerDoc?.filetype,
    size: offerDoc?.size,
    type: offerDoc?.type,
    source: offerDoc?.source,
    uploadedAt: offerDoc?.assigned_at,
    assignedAt: offerDoc?.assigned_at,
  };
};

const DocumentList: React.FC<DocumentListProps> = ({ lead }) => {
  // State
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    documentId: string | null;
    documentName: string | null;
  }>({
    isOpen: false,
    documentId: null,
    documentName: null,
  });

  const offers = React.useMemo(() => lead?.offers || [], [lead?.offers]);

  // Track uploading state per document type so only the relevant button shows loading
  const [uploadingTypes, setUploadingTypes] = useState<Record<string, boolean>>({});
  const isUploadingType = React.useCallback(
    (type?: string) => !!(type && uploadingTypes[type]),
    [uploadingTypes]
  );

  // Auto-select first offer if available
  useEffect(() => {
    if (offers?.length > 0 && !selectedOfferId) {
      setSelectedOfferId(offers?.[0]?._id);
    }
  }, [offers, selectedOfferId]);

  // Hooks
  const documentUploaderColumns = useDocumentUploaderColumns();
  const documentActions = useDocumentActions();

  // Offer documents hooks
  const {
    data: offerDocuments = [],
    isLoading,
    error,
  } = useOfferDocuments(selectedOfferId || undefined);
  const uploadDocumentsMutation = useUploadOfferDocuments();
  const deleteDocumentMutation = useDeleteOfferDocument();

  // Transform offer documents into organized format by type
  const documentsByType = useMemo(() => {
    if (!offerDocuments) return {};

    const organized: Record<string, Attachment> = {};
    offerDocuments?.forEach((doc: OfferDocument) => {
      if (doc?.type) {
        organized[doc?.type] = offerDocumentToAttachment(doc);
      }
    });

    return organized;
  }, [offerDocuments]);

  // Transform document sections into table data
  const tableData = useMemo(() => {
    if (!documentUploaderColumns) return [];

    return documentUploaderColumns?.map((section) => {
      const row: DocumentRow = {
        id: section?.id,
        documentType: section?.label,
      };

      // Map each column to the row
      section?.columns?.length > 0 &&
        section?.columns?.forEach((column) => {
          const document = documentsByType[column?.type];

          switch (column?.key) {
            case 'contract':
              row.contract = document;
              row.contractType = column?.type;
              break;
            case 'id':
              row.id_doc = document;
              row.idType = column?.type;
              break;
            case 'mail':
              row.mail = document;
              row.mailType = column?.type;
              break;
            case 'extra':
              row.extra = document;
              row.extraType = column?.type;
              break;
            default:
              // Handle any unknown column keys
              break;
          }
        });

      return row;
    });
  }, [documentUploaderColumns, documentsByType]);

  // Upload handler

  const handleUpload = React.useCallback(
    async (files: File[], documentType: string) => {
      if (!selectedOfferId) return;

      try {
        // Set loading for only the specific document type
        setUploadingTypes((prev) => ({ ...prev, [documentType]: true }));
        await uploadDocumentsMutation.mutateAsync({
          offerId: selectedOfferId,
          files,
          documentType,
        });
      } catch (error) {
        isDev && console.error('Upload failed:', error);
      } finally {
        // Reset loading for this document type
        setUploadingTypes((prev) => ({ ...prev, [documentType]: false }));
      }
    },
    [selectedOfferId, uploadDocumentsMutation]
  );

  // Delete handler with confirmation

  const handleDeleteConfirm = async () => {
    if (!selectedOfferId || !deleteConfirmation.documentId) return;

    try {
      await deleteDocumentMutation.mutateAsync({
        offerId: selectedOfferId,
        documentId: deleteConfirmation.documentId,
      });
      // Close confirmation dialog
      setDeleteConfirmation({
        isOpen: false,
        documentId: null,
        documentName: null,
      });
    } catch (error) {
      isDev && console.error('Delete failed:', error);
    }
  };

  // Show delete confirmation
  const handleDeleteClick = (documentId: string, documentName?: string) => {
    setDeleteConfirmation({
      isOpen: true,
      documentId,
      documentName: documentName || 'this document',
    });
  };

  // Create offer options for select
  const offerOptions = useMemo(() => {
    return (
      offers?.length > 0 &&
      offers?.map((offer: any) => ({
        label: `${offer?.investment_volume || 0} - ${offer?.interest_rate || 0}% - ${offer?.offerType || ''} - ${offer?.bank_id?.name || ''}`,
        value: offer?._id,
      }))
    );
  }, [offers]);

  // Get selected offer value for select
  const selectedOfferValue = useMemo(() => {
    if (!selectedOfferId) return null;
    return (
      (offerOptions?.length > 0 &&
        offerOptions?.find(
          (option: { label: string; value: string }) => option?.value === selectedOfferId
        )) ||
      null
    );
  }, [selectedOfferId, offerOptions]);

  // Create column definitions for BaseTable
  const columns: ColumnDef<DocumentRow>[] = useMemo(
    () => [
      {
        id: 'documentType',
        accessorKey: 'documentType',
        header: 'Document Type',
        enableSorting: false,
        columnWidth: 200,
        enableResizing: true,
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">{row?.original?.documentType}</span>
        ),
      },
      {
        id: 'contract',
        enableSorting: false,
        accessorKey: 'contract',
        header: 'Contract',
        columnWidth: 150,
        enableResizing: true,
        cell: ({ row }) => {
          const { contract, contractType, documentType } = row.original;
          const section = documentUploaderColumns?.find((s) => s?.label === documentType);
          const column = section?.columns?.find((col) => col?.key === 'contract');

          if (!column || column?.visible === false || !column?.type) {
            return <span className="text-sm text-gray-400">-</span>;
          }

          return (
            <DocumentCell
              attachment={contract}
              documentType={contractType || ''}
              sectionLabel={documentType}
              columnLabel="Contract"
              isUploading={isUploadingType(contractType)}
              onPreview={documentActions.handleDocumentPreview}
              onDownload={documentActions.handleDocumentDownload}
              onUpload={handleUpload}
              onDelete={
                contract ? () => handleDeleteClick(contract?.id, contract?.filename) : undefined
              }
            />
          );
        },
      },
      {
        id: 'id',
        enableSorting: false,
        accessorKey: 'id_doc',
        header: 'ID',
        columnWidth: 150,
        enableResizing: true,
        cell: ({ row }) => {
          const { id_doc, idType, documentType } = row.original;
          const section = documentUploaderColumns?.find((s) => s?.label === documentType);
          const column = section?.columns?.find((col) => col?.key === 'id');

          // Handle special case for netto section (Netto2)
          if (section?.id === 'netto') {
            const netto2Column = section?.columns?.find((col) => col?.key === 'id');
            if (netto2Column && netto2Column?.type) {
              const netto2Doc = documentsByType[netto2Column?.type];
              return (
                <DocumentCell
                  attachment={netto2Doc}
                  documentType={netto2Column?.type}
                  sectionLabel={section?.label}
                  columnLabel="Netto2"
                  isUploading={isUploadingType(netto2Column?.type)}
                  onPreview={documentActions.handleDocumentPreview}
                  onDownload={documentActions.handleDocumentDownload}
                  onUpload={handleUpload}
                  onDelete={
                    netto2Doc
                      ? () => handleDeleteClick(netto2Doc?.id, netto2Doc?.filename)
                      : undefined
                  }
                />
              );
            }
          }

          if (!column || column?.visible === false || !column?.type) {
            return <span className="text-sm text-gray-400">-</span>;
          }

          return (
            <DocumentCell
              attachment={id_doc}
              documentType={idType || ''}
              sectionLabel={documentType}
              columnLabel="ID"
              isUploading={isUploadingType(idType)}
              onPreview={documentActions.handleDocumentPreview}
              onDownload={documentActions.handleDocumentDownload}
              onUpload={handleUpload}
              onDelete={id_doc ? () => handleDeleteClick(id_doc?.id, id_doc?.filename) : undefined}
            />
          );
        },
      },
      {
        id: 'mail',
        enableSorting: false,
        accessorKey: 'mail',
        header: 'Mail',
        columnWidth: 150,
        enableResizing: true,
        cell: ({ row }) => {
          const { mail, mailType, documentType } = row.original;
          const section = documentUploaderColumns?.find((s) => s?.label === documentType);
          const column = section?.columns?.find((col) => col?.key === 'mail');

          // Handle special case for netto section (Netto1)
          if (section?.id === 'netto') {
            const netto1Column = section?.columns?.find((col) => col?.key === 'mail');
            if (netto1Column && netto1Column?.type) {
              const netto1Doc = documentsByType[netto1Column?.type];
              return (
                <DocumentCell
                  attachment={netto1Doc}
                  documentType={netto1Column?.type}
                  sectionLabel={section?.label}
                  columnLabel="Netto1"
                  isUploading={isUploadingType(netto1Column?.type)}
                  onPreview={documentActions.handleDocumentPreview}
                  onDownload={documentActions.handleDocumentDownload}
                  onUpload={handleUpload}
                  onDelete={
                    netto1Doc
                      ? () => handleDeleteClick(netto1Doc?.id, netto1Doc?.filename)
                      : undefined
                  }
                />
              );
            }
          }

          if (!column || column?.visible === false || !column?.type) {
            return <span className="text-sm text-gray-400">-</span>;
          }

          return (
            <DocumentCell
              attachment={mail}
              documentType={mailType || ''}
              sectionLabel={documentType}
              columnLabel="Mail"
              isUploading={isUploadingType(mailType)}
              onPreview={documentActions.handleDocumentPreview}
              onDownload={documentActions.handleDocumentDownload}
              onUpload={handleUpload}
              onDelete={mail ? () => handleDeleteClick(mail?.id, mail?.filename) : undefined}
            />
          );
        },
      },
      {
        id: 'extra',
        accessorKey: 'extra',
        header: 'Extra',
        enableSorting: false,
        columnWidth: 150,
        enableResizing: true,
        cell: ({ row }) => {
          const { extra, extraType, documentType } = row.original;
          const section = documentUploaderColumns?.find((s) => s?.label === documentType);
          const column = section?.columns?.find((col) => col?.key === 'extra');

          if (!column || column?.visible === false || !column?.type) {
            return <span className="text-sm text-gray-400">-</span>;
          }

          return (
            <DocumentCell
              attachment={extra}
              documentType={extraType || ''}
              sectionLabel={documentType}
              columnLabel="Extra"
              isUploading={isUploadingType(extraType)}
              onPreview={documentActions.handleDocumentPreview}
              onDownload={documentActions.handleDocumentDownload}
              onUpload={handleUpload}
              onDelete={extra ? () => handleDeleteClick(extra?.id, extra?.filename) : undefined}
            />
          );
        },
      },
    ],
    [
      documentUploaderColumns,
      isUploadingType,
      documentActions.handleDocumentPreview,
      documentActions.handleDocumentDownload,
      handleUpload,
      documentsByType,
    ]
  );

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 rounded-full bg-red-50 p-3">
          <ApolloIcon name="alert-circle" className="text-red-500" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">Error Loading Documents</h3>
        <p className="max-w-md text-center text-gray-600">
          {(error as any)?.message || 'Failed to load documents. Please try again.'}
        </p>
      </div>
    );
  }

  // Show no offers state
  if (!offers?.length) {
    return <NotFoundData message="No documents available for this lead." />;
  }

  return (
    <Card className="space-y-6" bodyClass="p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Documents</h3>
          <p className="mt-1 text-sm text-gray-600">Total: {offerDocuments?.length} files</p>
        </div>
        <div className="h-10 w-1/3">
          <Select
            options={offerOptions}
            value={selectedOfferValue}
            onChange={(option: { label: string; value: string } | null) =>
              setSelectedOfferId(option?.value || null)
            }
            aria-label="Select Offer"
            placeholder="Select Offer"
            menuPortalTarget={isDocument ? document?.body : null}
          />
        </div>
      </div>

      {/* Documents table using BaseTable */}
      <BaseTable
        tableName="documents"
        data={tableData || []}
        columns={columns}
        loading={isLoading}
        totalItems={tableData?.length}
        pageIndex={1}
        pageSize={tableData?.length}
        showPagination={false}
        showSearchInActionBar={false}
        showActionsDropdown={false}
        selectable={false}
        showActionComponent={false}
        saveCurentPageColumnToStore={false}
        tableClassName="max-h-none bg-none"
        headerSticky={false}
        fixedHeight="auto"
        enableColumnResizing={true}
        dynamicallyColumnSizeFit={false}
      />

      {/* Document preview dialog */}
      <DocumentPreviewDialog
        {...documentActions.documentPreview.dialogProps}
        title="Document Preview"
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
        title="Delete Document"
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
        confirmButtonProps={{ disabled: deleteDocumentMutation.isPending }}
      >
        <p>
          Are you sure you want to delete <strong>{deleteConfirmation?.documentName}</strong>? This
          action cannot be undone.
        </p>
      </ConfirmDialog>
    </Card>
  );
};

export default DocumentList;
