import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useDoumentLibrary,
  useUploadLibraryDocuments,
  useAssignDocumentsToOffer,
  useAssignDocumentsToLead,
  useBulkDeleteLibraryDocuments,
  useRestoreLibraryDocuments,
} from '@/services/hooks/useDocument';

import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { getDocumentPreviewType, downloadDocument as triggerDownload } from '@/utils/documentUtils';
import { apiFetchDocument, apiFetchLibraryDocuments } from '@/services/DocumentService';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import useNotification from '@/utils/hooks/useNotification';

export interface Document {
  id?: string;
  _id?: string;
  filename: string;
  filetype: string;
  size: number;
  type: string;
  source: string;
  uploadedAt: string;
  library_status?: string;
  assignments?: Array<{
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
  }>;
  assignment_history?: Array<{
    action: string;
    entity_type: string;
    entity_id: string;
    performed_by: string;
    notes: string;
    _id: string;
    performed_at: string;
  }>;
}

export const useDocumentsPage = () => {
  const searchParams = useSearchParams();
  const documentPreview = useDocumentPreview();
  const router = useRouter();
  const { openNotification } = useNotification();
  // Pagination and search state
  const page = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const search = searchParams.get('search') || '';
  const libraryStatus = searchParams.get('status') || '';
  const sortBy = searchParams.get('sortBy') || '';
  const sortOrder = searchParams.get('sortOrder') || '';
  const [resetTable, setResetTable] = useState(false);
  const toggleResetTable = () => {
    setResetTable((prev) => !prev);
  };

  // Upload state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Assignment dialog state
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignStep, setAssignStep] = useState<'choose' | 'offers'>('choose');
  const [selectedAssignType, setSelectedAssignType] = useState<'lead' | 'offer' | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Offer assignment state
  const [isOfferSelectionModalOpen, setIsOfferSelectionModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);

  // Lead assignment state
  const [isLeadSelectionModalOpen, setIsLeadSelectionModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  // Download state
  const [downloadDocument, setDownloadDocument] = useState<Document | null>(null);
  const [permanentDelete, setPermanentDelete] = useState(false);
  // Delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Query parameters for documents
  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search || undefined,
      library_status: libraryStatus || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    }),
    [page, pageSize, search, libraryStatus, sortBy, sortOrder]
  );

  // React Query hooks
  const { data: documentsResponse, isLoading, error } = useDoumentLibrary(queryParams);
  const uploadMutation = useUploadLibraryDocuments();
  const assignToOfferMutation = useAssignDocumentsToOffer();
  const assignToLeadMutation = useAssignDocumentsToLead();
  const bulkDeleteMutation = useBulkDeleteLibraryDocuments();
  const restoreMutation = useRestoreLibraryDocuments();
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const { selected: selectAllRows, handleSelectAll: handleSelectAllDocumentsApi } = useSelectAllApi(
    {
      apiFn: apiFetchLibraryDocuments,
      total: documentsResponse?.meta?.total || 0,
      apiParams: { ...queryParams },
      responseDataField: 'documents',
      returnFullObjects: true,
    }
  );

  const onFilterOptionChange = useCallback(
    (option: { value?: string } | null) => {
      const status = option?.value;
      const query = status ? `status=${encodeURIComponent(status)}` : '';
      router.push(`/dashboards/documents${query ? `?${query}` : ''}`);
      setSelectedRows([]);
    },
    [router]
  );

  // Handle offer selection
  const handleOfferSelection = (offer: any) => {
    setSelectedOffer(offer);
    setIsOfferSelectionModalOpen(false);
    setAssignStep('offers');
  };

  // Handle lead selection
  const handleLeadSelection = (lead: any) => {
    setSelectedLead(lead);
    setIsLeadSelectionModalOpen(false);
    setAssignStep('offers');
  };
  //   const handleSelectAll = async () => {
  //     const response = await apiFetchLibraryDocuments({
  //       pageSize: documentsResponse?.meta?.total || 0,
  //     });
  //     // setSelectedRows(response?.data?.documents?.map((d: any) => d._id) || []);
  //   };

  // Download logic
  useEffect(() => {
    const doDownload = async () => {
      if (downloadDocument) {
        try {
          const docId = downloadDocument?._id || downloadDocument?.id || '';
          if (!docId) return;
          const response = await apiFetchDocument(docId);
          // response is a Blob
          const contentType =
            response?.type || downloadDocument?.filetype || 'application/octet-stream';
          triggerDownload(response, downloadDocument?.filename, contentType);
        } catch (err) {
          // Optionally, show notification
          // eslint-disable-next-line no-console
          console.error('Download failed', err);
        } finally {
          setDownloadDocument(null);
        }
      }
    };
    doDownload();
  }, [downloadDocument]);

  // Document preview handler
  const handleDocumentPreview = useCallback(
    (docId: string) => {
      const doc = documentsResponse?.data?.documents?.find((d: any) => d?._id === docId);
      if (!doc) return;
      const previewType = getDocumentPreviewType(doc?.filetype || '', doc?.filename || '');
      documentPreview.openPreview(
        docId,
        doc?.filename || 'Unknown file',
        previewType as 'pdf' | 'image' | 'other'
      );
    },
    [documentPreview, documentsResponse]
  );

  // Document download handler
  const handleDocumentDownload = useCallback(
    (docId: string) => {
      const doc = documentsResponse?.data?.documents?.find((d: any) => d?._id === docId);
      if (!doc) return;
      setDownloadDocument(doc);
      // Implement download logic if needed
    },
    [documentsResponse]
  );

  // Upload handler
  const handleUpload = async (files: File | File[] | null) => {
    setUploadError(null);
    if (!files) return;
    const fileArray = Array.isArray(files) ? files : [files];

    try {
      await uploadMutation.mutateAsync(fileArray as File[]);
      if (!uploadMutation.isPending) {
        setIsUploadOpen(false);
      }
      // openNotification({
      //   type: 'success',
      //   massage: 'Documents uploaded successfully',
      // });
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
      openNotification({
        type: 'danger',
        massage: err?.message || 'Upload failed',
      });
    } finally {
      setIsUploadOpen(false);
    }
  };

  // Assignment handler
  const handleAssignSubmit = async () => {
    setAssignError(null);
    try {
      if (selectedAssignType === 'offer') {
        await assignToOfferMutation.mutateAsync({
          documentIds: selectedRows?.length > 0 ? selectedRows?.map((row: any) => row?._id) : [],
          offerId: selectedOffer?._id,
          type: selectedDocType!,
        });
      } else if (selectedAssignType === 'lead') {
        await assignToLeadMutation.mutateAsync({
          documentIds: selectedRows?.length > 0 ? selectedRows?.map((row: any) => row?._id) : [],
          leadIdentifier: selectedLead?._id,
        });
      }
      setIsAssignDialogOpen(false);
      setSelectedOffer(null);
      setSelectedDocType(null);
      setSelectedLead(null);
      setAssignStep('choose');
      setSelectedRows([]);
      toggleResetTable();
    } catch (err: any) {
      setAssignError(err?.message || 'Assignment failed');
    }
  };

  const handleDelete = (unassign?: boolean, filterAssigned?: boolean) => {
    const docIds = selectedRows?.length > 0 ? selectedRows?.map((doc: any) => doc?._id) : [];
    if (docIds?.length === 0) return;

    const filterUnassigned = selectedRows
      ?.filter((doc: any) => doc?.assignments?.length === 0)
      ?.map((doc: any) => doc?._id);

    // Build the payload, omitting 'unassign' if undefined
    const payload: any = {
      ids: filterAssigned ? filterUnassigned : docIds,
    };
    if (unassign) {
      payload.unassign = unassign;
    }
    if (permanentDelete) {
      payload.permanent = permanentDelete;
    }

    bulkDeleteMutation.mutate(payload, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setPermanentDelete(false);
      },
    });
    setSelectedRows([]);
    toggleResetTable();
  };

  const handleRestore = () => {
    const docIds = selectedRows?.length > 0 ? selectedRows?.map((doc: any) => doc?._id) : [];
    if (docIds?.length === 0) return;

    restoreMutation.mutate(docIds, {
      onSuccess: () => {
        // setSelectedRows([]);
      },
    });
  };

  // Reset assignment dialog
  const resetAssignmentDialog = () => {
    setIsAssignDialogOpen(false);
    setSelectedOffer(null);
    setSelectedDocType(null);
    setSelectedLead(null);
    setAssignStep('choose');
    setSelectedAssignType(null);
    setAssignError(null);
  };

  // Get file icon based on file type
  const getFileIcon = useCallback((filetype: string) => {
    if (!filetype) return 'file';
    const type = filetype.toLowerCase();
    if (type.includes('pdf')) return 'file';
    if (type.includes('image')) return 'picture';
    if (type.includes('word') || type.includes('document')) return 'file';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'file';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'file';
    return 'file';
  }, []);

  const onCloseAssignDialog = () => {
    setIsAssignDialogOpen(false);

    setSelectedAssignType(null);
    setSelectedOffer(null);
    setSelectedDocType(null);
    setSelectedLead(null);
    setAssignError(null);
    setAssignStep('choose');
  };

  const onSelectionChange = useCallback(
    (rows: any) => {
      setSelectedRows(rows);
    },
    [setSelectedRows]
  );

  return {
    // Data
    resetTable,
    documents: documentsResponse?.data?.documents || [],
    totalItems: documentsResponse?.meta?.total || 0,
    isLoading,
    error,
    selectAllRows,
    // Pagination
    page,
    pageSize,
    search,
    libraryStatus,

    // Upload
    isUploadOpen,
    setIsUploadOpen,
    uploadError,
    setUploadError,
    handleUpload,
    uploadMutation,
    onCloseAssignDialog,
    // Assignment
    isAssignDialogOpen,
    setIsAssignDialogOpen,
    assignStep,
    setAssignStep,
    selectedAssignType,
    setSelectedAssignType,
    selectedRows,
    setSelectedRows,
    assignError,
    setAssignError,
    handleAssignSubmit,
    resetAssignmentDialog,

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
    bulkDeleteMutation,
    restoreMutation,

    // Document handlers
    handleDocumentPreview,
    handleDocumentDownload,
    downloadDocument,
    setDownloadDocument,
    // Delete
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleDelete,
    // Restore
    handleRestore,

    // Utilities
    getFileIcon,
    documentPreview,
    handleSelectAllDocumentsApi,
    permanentDelete,
    setPermanentDelete,
    onSelectionChange,
    onFilterOptionChange,
  };
};

export const getAssignmentSummary = (documents: Document[]) => {
  let totalLeadAssigned = 0;
  let totalOfferAssigned = 0;
  let totalAssigned = 0;
  let totalUnassigned = 0;

  documents.forEach((doc) => {
    // Determine if the document is assigned or unassigned based on library_status or assignments array
    if (doc?.library_status === 'assigned' || (doc?.assignments && doc?.assignments?.length > 0)) {
      totalAssigned++;
    } else {
      totalUnassigned++;
    }

    // Count lead and offer assignments
    doc?.assignments?.forEach((assignment) => {
      if (assignment?.entity_type === 'lead') {
        totalLeadAssigned++;
      } else if (assignment?.entity_type === 'offer') {
        totalOfferAssigned++;
      }
    });
  });

  return {
    totalLeadAssigned,
    totalOfferAssigned,
    totalAssigned,
    totalUnassigned,
  };
};
