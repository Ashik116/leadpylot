'use client';

import React, { useMemo, useCallback } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import { formatFileSize } from '@/utils/documentUtils';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import FileUploaderDialog from '@/components/ui/Upload/FileUploaderDialog';
import Dialog from '@/components/ui/Dialog/Dialog';
import Select from '@/components/ui/Select';
import { getDocumentTypeOptions } from '@/utils/utils';
import { useDocumentsPage, Document } from './hooks/useDocumentsPage';
import LeadSelectionModal from './components/LeadSelectionModal';
import OfferSelectionModal from './components/OfferSelectionModal';
import classNames from '@/utils/classNames';
import Link from 'next/link';
import DocumentDeleteModal from './components/DocumentDeleteModal';
import { usePathname } from 'next/navigation';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import { dateFormateUtils } from '@/utils/dateFormateUtils';

interface DocumentAssignment {
  entity_type: string;
  entity_id: string;
  assigned_by: {
    _id: string;
    login: string;
    role: string;
  };
  active: boolean;
  notes: string;
  _id: string;
  assigned_at: string;
  offer?: {
    lead_id: string;
  };
}

const DocumentsPage: React.FC = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  const {
    // Data
    documents,
    totalItems,
    isLoading,
    error,

    // Pagination
    page,
    pageSize,
    libraryStatus,

    // Upload
    isUploadOpen,
    setIsUploadOpen,
    handleUpload,
    uploadMutation,

    // Assignment
    isAssignDialogOpen,
    setIsAssignDialogOpen,
    assignStep,
    setAssignStep,
    selectedAssignType,
    setSelectedAssignType,
    selectedRows,
    assignError,
    handleAssignSubmit,

    // Offers
    selectedOffer,
    setSelectedOffer,
    selectedDocType,
    setSelectedDocType,
    isOfferSelectionModalOpen,
    setIsOfferSelectionModalOpen,
    handleOfferSelection,

    // Leads
    selectedLead,
    setSelectedLead,
    isLeadSelectionModalOpen,
    setIsLeadSelectionModalOpen,
    handleLeadSelection,

    // Mutations
    assignToOfferMutation,
    assignToLeadMutation,

    // Document handlers
    handleDocumentPreview,
    onCloseAssignDialog,
    // Delete
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleDelete,
    bulkDeleteMutation,
    // Restore
    handleRestore,
    restoreMutation,
    // Utilities
    getFileIcon,
    handleSelectAllDocumentsApi,
    documentPreview,
    permanentDelete,
    setPermanentDelete,
    onSelectionChange,
    selectAllRows,
    onFilterOptionChange,
    resetTable,
  } = useDocumentsPage();

  const [expandedRowIds, setExpandedRowIds] = React.useState<string[]>([]);

  const statusOptions = [
    { value: '', label: 'All' },
    { value: 'library', label: 'Library' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'archived', label: 'Archived' },
  ];

  // Expander content for assignment history
  const renderExpandedRow = (row: any) => {
    const assignments = row.original?.assignments || [];
    if (!assignments.length) return null;
    return (
      <div className="animate-fade-in overflow-hidden bg-gray-100 p-5 transition-all duration-300">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {assignments?.map((assignment: any, idx: number) => {
            const { lead_id, lead_details, offer_details }: any = assignment ?? {};
            let linkUrl = '';
            if (assignment.entity_type === 'lead') {
              linkUrl = `/dashboards/leads/${lead_id}`;
            } else if (assignment.entity_type === 'offer') {
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
              <span className="text-sm font-medium">
                {assignment.entity_type}:
                {assignment.entity_type === 'lead' ? leadUrl : offerLeadUrl}
              </span>
            );

            return (
              <Link
                href={linkUrl}
                key={assignment._id || idx}
                className="relative flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className={`absolute top-0 left-0 h-full w-1 rounded-l-lg`} />
                <div className="mb-1 flex items-center gap-2">{entityDisplay}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ApolloIcon name="user" className="h-4 w-4 text-gray-400" />
                  <span>Assigned by: {assignment.assigned_by?.login || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <ApolloIcon name="clock-eight" className="h-4 w-4" />
                  <span>
                    {assignment.assigned_at
                      ? new Date(assignment.assigned_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })
                      : 'N/A'}
                  </span>
                </div>
                {assignment.notes && (
                  <div className="mt-1 rounded border border-gray-100 bg-gray-50 px-2 py-1 text-xs text-gray-600">
                    <ApolloIcon name="notes" className="mr-1 inline-block h-3 w-3 text-gray-400" />
                    {assignment.notes}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const columns: ColumnDef<Document>[] = useMemo(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => (
          <div
            onClick={(e) => {
              if (row.original?.assignment_history?.length === 0) {
                return;
              }
              e.stopPropagation();
              e.preventDefault();
              const id = row.original?._id?.toString() || '';
              setExpandedRowIds((prev) =>
                prev.includes(id) ? prev.filter((id) => id !== id) : [...prev, id]
              );
            }}
            data-no-navigate="true"
            className={classNames(
              'flex h-full cursor-pointer items-center justify-center',

              row.original?.assignment_history?.length === 0 && 'cursor-not-allowed'
            )}
          >
            {expandedRowIds.includes(row.original?._id?.toString() || '') ? (
              <ApolloIcon name="chevron-arrow-down" className="text-2xl" />
            ) : (
              <ApolloIcon name="chevron-arrow-right" className="text-2xl" />
            )}
          </div>
        ),
      },
      {
        id: 'filename',
        header: 'Document Name',
        accessorKey: 'filename',
        columnWidth: 140,
        minSize: 140,
        cell: ({ row }) => {
          const filename = row.original?.filename || 'Unknown file';
          const filetype = row.original?.filetype || '';
          const docId = row.original?._id;
          return (
            <div className="flex items-center gap-2">
              <ApolloIcon name={getFileIcon(filetype)} className="h-5 w-5 text-gray-500" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (docId) {
                    handleDocumentPreview(docId);
                  }
                }}
                className="cursor-pointer truncate text-left font-medium hover:text-blue-800"
                disabled={!docId}
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
        columnWidth: 120,
        minSize: 60,
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
        columnWidth: 120,
        minSize: 100,
        cell: ({ row }) => {
          const type = row.original?.uploadedAt || 'Unknown';
          return <span className="whitespace-nowrap">{dateFormateUtils(type)}</span>;
        },
      },

      {
        id: 'size',
        header: 'Size',
        accessorKey: 'size',
        columnWidth: 60,
        minSize: 60,
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{formatFileSize(row.original?.size || 0)}</span>
        ),
      },

      {
        id: 'assigned',
        header: 'Assigned',
        accessorKey: 'assigned',
        columnWidth: 120,
        minSize: 120,
        cell: ({ row }) => {
          const assignments: DocumentAssignment[] = row.original?.assignments || [];

          if (!assignments.length) {
            return <span className="text-sm text-gray-400">Not assigned</span>;
          }
          const last = assignments[assignments.length - 1];
          const { lead_id, lead_details, offer_details, entity_type }: any = last ?? {};

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
            <Link href={linkUrl} className="space-y-1 hover:text-blue-500">
              <div>{entityDisplay}</div>
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
            </Link>
          );
        },
      },
    ],
    [expandedRowIds, getFileIcon, handleDocumentPreview]
  );

  const ExtraActions = useCallback(
    () => (
      <div className="flex items-center gap-2">
        <div className="w-36 xl:w-40 [&_.select-control]:h-6 [&_.select-control]:min-h-6 [&_.select-control]:rounded-md">
          <Select
            options={statusOptions}
            value={statusOptions.find((opt) => opt.value === libraryStatus) || statusOptions[0]}
            onChange={(option) => {
              onFilterOptionChange(option);
            }}
            placeholder="Filter by status"
            isClearable={libraryStatus === '' ? false : true}
            isSearchable={true}
          />
        </div>
        <Button
          variant="secondary"
          icon={<ApolloIcon name="plus" />}
          onClick={() => setIsUploadOpen(true)}
          disabled={uploadMutation.isPending}
          size="xs"
        >
          {uploadMutation.isPending ? (
            'Uploading...'
          ) : (
            <p className='before:content-["Create"] xl:before:content-["Create_document"]'></p>
          )}
        </Button>
        <Button
          variant="success"
          icon={<ApolloIcon name="plus" />}
          onClick={() => setIsAssignDialogOpen(true)}
          disabled={selectedRows.length === 0}
          gapClass="gap-0 xl:gap-1"
          size="xs"
        >
          <p className='xl:before:content-["Assign_to"]'></p>
        </Button>
        {libraryStatus === 'archived' ? (
          <Button
            variant="solid"
            icon={<ApolloIcon name="reply" />}
            onClick={handleRestore}
            disabled={selectedRows.length === 0}
            loading={restoreMutation.isPending}
            size="xs"
          >
            Restore
          </Button>
        ) : (
          <Button
            variant="destructive"
            icon={<ApolloIcon name="trash" />}
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={selectedRows.length === 0}
            gapClass="gap-0 xl:gap-1"
            size="xs"
          >
            <p className='xl:before:content-["Delete"]'></p>
          </Button>
        )}
      </div>
    ),
    [
      statusOptions,
      libraryStatus,
      uploadMutation.isPending,
      selectedRows.length,
      handleRestore,
      restoreMutation.isPending,
      onFilterOptionChange,
      setIsUploadOpen,
      setIsAssignDialogOpen,
      setIsDeleteDialogOpen,
    ]
  );

  const tableConfig = useBaseTable({
    tableName: 'library-documents',
    isBackendSortingReady: true,
    data: documents,
    loading: isLoading,
    totalItems: totalItems,
    pageIndex: page,
    pageSize: pageSize,
    pageSizes: [10, 20, 50, 100],
    defaultPageSize: 50,
    columns,
    returnFullObjects: true,
    selectedRows: selectAllRows,
    headerSticky: true,
    onSelectedRowsChange: onSelectionChange,
    onSelectAll: handleSelectAllDocumentsApi,
    extraActions: ExtraActions(),
    noData: !isLoading && documents.length === 0,
    showNavigation: false,
    selectable: true,
    showPagination: true,
    showSearchInActionBar: true,
    showActionsDropdown: false,
    renderExpandedRow: (row) => {
      const docId = row.original?._id;
      if (!docId || !expandedRowIds.includes(docId)) return null;
      return renderExpandedRow(row);
    },
    saveCurentPageColumnToStore: false,
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'Documents',
    pageInfoSubtitlePrefix: 'Total Documents',
    fixedHeight: '90dvh',
  });
  const onCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setPermanentDelete(false);
  };
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <ApolloIcon name="alert-circle" className="mb-4 h-12 w-12 text-red-400" />
        <h3 className="mb-2 text-lg font-medium text-gray-900">Error Loading Documents</h3>
        <p className="text-gray-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="w-full space-y-4 px-4">
      <BaseTable {...tableConfig} key={libraryStatus + resetTable} />
      <DocumentPreviewDialog {...documentPreview.dialogProps} title="Document Preview" />
      <FileUploaderDialog
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
        }}
        onUpload={handleUpload}
        title="Upload Documents"
        multiple={true}
        accept=".jpeg,.png,.pdf,.jpg"
        supportPlaceholder="Supported formats: JPEG, PNG, PDF, JPG (max 50MB each)"
        triggerButtonProps={{ style: { display: 'none' } }}
        maxFileSize={50 * 1024 * 1024} // 50MB
        uploadButtonProps={{
          disabled: uploadMutation.isPending,
          children: uploadMutation.isPending ? 'Uploading...' : 'Upload',
          loading: uploadMutation.isPending,
        }}
      />
      <DocumentDeleteModal
        onClose={onCloseDeleteDialog}
        isOpen={isDeleteDialogOpen}
        selectedRows={selectedRows}
        handleDelete={handleDelete}
        bulkDeleteMutation={bulkDeleteMutation}
        permanentDelete={permanentDelete}
        setPermanentDelete={setPermanentDelete}
      />
      <Dialog isOpen={isAssignDialogOpen} onClose={onCloseAssignDialog} width={500}>
        <div className="">
          <h4 className="mb-2 text-xl font-semibold text-gray-900">Assign Documents</h4>
          {assignError && (
            <div className="mb-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex">
                <ApolloIcon name="alert-circle" className="mt-0.5 mr-2 h-5 w-5 text-red-400" />
                <div className="text-sm text-red-600">{assignError}</div>
              </div>
            </div>
          )}

          {assignStep === 'choose' && (
            <div className="space-y-4">
              <p className="mb-2 text-sm text-gray-600">
                Choose where you want to assign the selected {selectedRows.length} document
                {selectedRows.length !== 1 ? 's' : ''}:
              </p>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => {
                    setSelectedAssignType('lead');
                    setIsLeadSelectionModalOpen(true);
                  }}
                  className="group relative overflow-hidden rounded-lg border-2 border-gray-200 bg-white p-2 text-left shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md focus:border-blue-500 focus:ring-offset-2 focus:outline-none"
                >
                  <div className="flex items-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 group-hover:bg-blue-200">
                      <ApolloIcon name="user" className="text-blue-600" />
                    </div>
                    <div className="flex w-full items-center justify-between">
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-900">
                          Assign to Lead
                        </h3>
                        <p className="text-sm text-gray-500">
                          Attach documents directly to a specific lead
                        </p>
                      </div>
                      <ApolloIcon
                        name="chevron-arrow-right"
                        className="h-5 w-5 text-gray-400 group-hover:text-blue-500"
                      />
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSelectedAssignType('offer');
                    setIsOfferSelectionModalOpen(true);
                  }}
                  className="group relative overflow-hidden rounded-lg border-2 border-gray-200 bg-white p-2 text-left shadow-sm transition-all duration-200 hover:border-green-300 hover:shadow-md focus:border-green-500"
                >
                  <div className="flex items-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-green-100 group-hover:bg-green-200">
                      <ApolloIcon name="file" className="text-green-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 group-hover:text-green-900">
                        Assign to Offer
                      </h3>
                      <p className="text-sm text-gray-500">
                        Attach documents to a specific offer/proposal
                      </p>
                    </div>
                    <ApolloIcon
                      name="chevron-arrow-right"
                      className="ml-auto h-5 w-5 text-gray-400 group-hover:text-green-500"
                    />
                  </div>
                </button>
              </div>
            </div>
          )}

          {assignStep === 'offers' && selectedAssignType === 'offer' && selectedOffer && (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center justify-center rounded-full bg-green-100 p-2">
                      <ApolloIcon name="file" className="text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{selectedOffer.title || 'N/A'}</h4>
                      <p className="text-sm text-gray-500">
                        Lead: {selectedOffer.lead_id?.contact_name || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Project: {selectedOffer.project_id?.name || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="plain"
                    size="sm"
                    onClick={() => {
                      setSelectedOffer(null);
                      setAssignStep('choose');
                    }}
                    icon={<ApolloIcon name="cross" className="h-4 w-4" />}
                  >
                    Change
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Document Type <span className="text-red-500">*</span>
                </label>
                <Select
                  options={getDocumentTypeOptions}
                  value={
                    getDocumentTypeOptions.find((opt) => opt.value === selectedDocType) || null
                  }
                  onChange={(option) => setSelectedDocType(option?.value || null)}
                  placeholder="Select Document Type"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                <Button variant="plain" onClick={() => setIsAssignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="solid"
                  onClick={handleAssignSubmit}
                  disabled={!selectedOffer || !selectedDocType || assignToOfferMutation.isPending}
                  loading={assignToOfferMutation.isPending}
                >
                  Assign Documents
                </Button>
              </div>
            </div>
          )}

          {assignStep === 'offers' && selectedAssignType === 'lead' && selectedLead && (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <ApolloIcon name="user" className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {selectedLead.contact_name || 'N/A'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Partner ID: {selectedLead.lead_source_no || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Email: {selectedLead.email_from || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="plain"
                    size="sm"
                    onClick={() => {
                      setSelectedLead(null);
                      setAssignStep('choose');
                    }}
                    icon={<ApolloIcon name="cross" className="h-4 w-4" />}
                  >
                    Change
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                <Button variant="plain" onClick={() => setIsAssignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="solid"
                  onClick={handleAssignSubmit}
                  disabled={!selectedLead || assignToLeadMutation.isPending}
                  loading={assignToLeadMutation.isPending}
                >
                  Assign Documents
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      <LeadSelectionModal
        isOpen={isLeadSelectionModalOpen}
        onClose={() => setIsLeadSelectionModalOpen(false)}
        onSelectLead={handleLeadSelection}
      />

      <OfferSelectionModal
        isOpen={isOfferSelectionModalOpen}
        onClose={() => setIsOfferSelectionModalOpen(false)}
        onSelectOffer={handleOfferSelection}
      />
    </div>
  );
};

export default DocumentsPage;
