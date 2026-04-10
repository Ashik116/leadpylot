'use client';

import React, { useMemo, useCallback } from 'react';
import { ColumnDef } from '@/components/shared/DataTable/types';
import DataTableOptimized from '@/components/shared/DataTableOptimizedVersion/DataTableOptimized';
import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';
import { formatFileSize } from '@/utils/documentUtils';
import { getFileIcon } from '@/utils/fileUtils';
import { getDocumentPreviewType } from '@/utils/documentUtils';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useDocumentHandler } from '@/hooks/useDocumentHandler';
import Link from 'next/link';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';

interface DocumentRow {
  _id?: string;
  filename?: string;
  filetype?: string;
  type?: string;
  size?: number;
  uploadedAt?: string;
  updatedAt?: string;
  assignments?: Array<{
    entity_type: string;
    entity_id: string;
    assigned_by?: {
      _id: string;
      login: string;
      role: string;
    };
    active: boolean;
    notes?: string;
    _id: string;
    assigned_at: string;
    lead_id?: string;
    lead_details?: {
      contact_name?: string;
      lead_source_no?: string;
    };
    offer_details?: {
      lead_id?: string;
      lead_details?: {
        contact_name?: string;
        lead_source_no?: string;
      };
    };
  }>;
}

interface DocumentsSectionTableProps {
  documents: any[];
}

const DocumentsSectionTable: React.FC<DocumentsSectionTableProps> = ({
  documents,
}) => {
    const documentHandler = useDocumentHandler();
 
  // Transform documents data - handle both nested (doc.document) and direct formats
  const transformedDocuments = useMemo<DocumentRow[]>(() => {
    if (!documents || !Array.isArray(documents)) return [];

    return documents.map((doc: any) => {
      // Extract document - could be doc.document or direct doc
      const document = doc?.document || doc;

      return {
        _id: document?._id || doc?._id,
        filename: document?.filename || doc?.filename || 'Unknown file',
        filetype: document?.filetype || doc?.filetype || '',
        type: document?.type || doc?.type || 'Unknown',
        size: document?.size || doc?.size || 0,
        uploadedAt:
          document?.uploadedAt || doc?.uploadedAt || document?.updatedAt || doc?.updatedAt,
        updatedAt: document?.updatedAt || doc?.updatedAt || document?.uploadedAt || doc?.uploadedAt,
        assignments: document?.assignments || doc?.assignments || [],
      };
    });
  }, [documents]);

  // Handle document preview
  const handleDocumentPreview = useCallback(
    (docId: string, filename: string, filetype: string) => {
      if (!docId) return;

      const previewType = getDocumentPreviewType(filetype, filename);
      documentHandler.documentPreview.openPreview(
        docId,
        filename,
        previewType as 'pdf' | 'image' | 'other'
      );
    },
    [documentHandler]
  );

  const columns = useMemo<ColumnDef<DocumentRow>[]>(
    () => [
      {
        id: 'filename',
        header: 'Document Name',
        accessorKey: 'filename',
        enableSorting: true,
        cell: ({ row }) => {
          const filename = row.original?.filename || 'Unknown file';
          const filetype = row.original?.filetype || '';
          const docId = row.original?._id;

          return (
            <div className="flex items-center gap-2">
              <ApolloIcon
                name={getFileIcon(filename, filetype) as any}
                className="h-5 w-5 shrink-0 text-gray-500"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (docId) {
                    handleDocumentPreview(docId, filename, filetype);
                  }
                }}
                className="cursor-pointer truncate text-left font-medium hover:text-blue-800"
                disabled={!docId}
                title={filename}
              >
                {filename}
              </button>
            </div>
          );
        },
      },
      {
        id: 'type',
        header: 'Type',
        accessorKey: 'type',
        enableSorting: true,
        cell: ({ row }) => {
          const type = row.original?.type || 'Unknown';
          return (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {type}
            </span>
          );
        },
      },
      {
        id: 'updatedAt',
        header: 'Updated At',
        accessorKey: 'updatedAt',
        enableSorting: true,
        cell: ({ row }) => {
          const date = row.original?.uploadedAt || row.original?.updatedAt;
          return (
            <span className="whitespace-nowrap">
              {date ? dateFormateUtils(date, DateFormatType.SHOW_TIME) : '-'}
            </span>
          );
        },
      },
      {
        id: 'size',
        header: 'Size',
        accessorKey: 'size',
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{formatFileSize(row.original?.size || 0)}</span>
        ),
      },
      {
        id: 'assigned',
        header: 'Assigned',
        accessorKey: 'assigned',
        enableSorting: false,
        cell: ({ row }) => {
          const assignments = row.original?.assignments || [];

          if (!assignments.length) {
            return <span className="text-sm text-gray-400">Not assigned</span>;
          }

          const last = assignments[assignments.length - 1];
          const { lead_id, lead_details, offer_details, entity_type } = last ?? {};

          let linkUrl = '';
          if (entity_type === 'lead') {
            linkUrl = `/dashboards/leads/${lead_id}`;
          } else if (entity_type === 'offer') {
            linkUrl = `/dashboards/leads/${offer_details?.lead_id}`;
          }

          const contactNameSlug = lead_details?.contact_name?.replace(/\s+/g, '-');
          const offerContactNameSlug = offer_details?.lead_details?.contact_name?.replace(
            /\s+/g,
            '-'
          );
          const leadUrl = `${contactNameSlug}-${lead_details?.lead_source_no}`;
          const offerLeadUrl = `${offerContactNameSlug}-${offer_details?.lead_details?.lead_source_no}`;
          const entityDisplay = (
            <span className="font-medium">
              {entity_type}: {entity_type === 'lead' ? leadUrl : offerLeadUrl}
            </span>
          );

          return (
            <div className="space-y-1">
              {linkUrl ? (
                <Link href={linkUrl} className="hover:text-blue-500">
                  <div>{entityDisplay}</div>
                </Link>
              ) : (
                <div>{entityDisplay}</div>
              )}
              <div className="text-xs text-gray-500">
                Assigned by: {last.assigned_by?.login || 'Unknown'}
              </div>
              <div className="text-xs text-gray-400">
                {last.assigned_at
                  ? new Date(last.assigned_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })
                  : 'N/A'}
              </div>
              {last.notes && <div className="mt-1 text-xs text-gray-500">Note: {last.notes}</div>}
            </div>
          );
        },
      },
    ],
    [handleDocumentPreview]
  );

  if (!transformedDocuments || transformedDocuments.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
        <div className="text-center">
          <ApolloIcon
            name="folder-open"
            className="mx-auto mb-2 flex items-center justify-center text-3xl text-gray-400"
          />
          <p className="text-sm text-gray-500">No documents available</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
      <DataTableOptimized
        className="max-h-[300px]"
        columns={columns}
        data={transformedDocuments}
        showPagination={false}
        showHeader={true}
        headerSticky={true}
        enableColumnResizing={true}
        selectable={false}
        compact={true}
        instanceId="documents-section-table"
        tableClassName="min-w-full"
        fixedHeight="100px"
        />
    </div>
    <DocumentPreviewDialog
        {...documentHandler.documentPreview.dialogProps}
        title="Document Preview"
      />
    </>
  );
};

export default DocumentsSectionTable;
