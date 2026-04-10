import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetchDocument } from '@/services/DocumentService';
import {
  getDocumentPreviewType,
  downloadDocument,
  findContractDocuments,
} from '@/utils/documentUtils';

interface DocumentPreviewState {
  isOpen: boolean;
  isLoading: boolean;
  isDownloading: boolean;
  previewUrl: string | null;
  documentName?: string;
  previewType: string;
  selectedDocumentId?: string;
}

interface UseDocumentPreviewProps {
  onDownload?: (documentId: string) => Promise<void>;
  getPreviewUrl?: (documentId: string) => Promise<string>;
}

export const useDocumentPreview = ({ onDownload, getPreviewUrl }: UseDocumentPreviewProps = {}) => {
  const [state, setState] = useState<DocumentPreviewState>({
    isOpen: false,
    isLoading: false,
    isDownloading: false,
    previewUrl: null,
    documentName: undefined,
    previewType: 'other',
    selectedDocumentId: undefined,
  });

  // Single document fetching query that handles both preview and download
  const { data: documentData, isLoading: isLoadingDocument } = useQuery({
    queryKey: ['document', state.selectedDocumentId],
    queryFn: () => apiFetchDocument(state.selectedDocumentId!),
    enabled: !!state.selectedDocumentId && state.isOpen,
  });

  // Handle document data for preview
  useEffect(() => {
    if (documentData && state.isOpen && state.selectedDocumentId) {
      try {
        // For PDF files, ensure the blob has the correct MIME type
        let blob = documentData;
        if (state.previewType === 'pdf' && blob.type !== 'application/pdf') {
          blob = new Blob([documentData], { type: 'application/pdf' });
        }

        const resolvedPreviewType =
          state.previewType === 'other'
            ? getDocumentPreviewType(blob.type || '', state.documentName)
            : state.previewType;

        const url = URL.createObjectURL(blob);

        setState((prev) => ({
          ...prev,
          previewUrl: url,
          isLoading: false,
          previewType: resolvedPreviewType,
        }));
      } catch (error) {
        console.error('Error creating blob URL:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    }
  }, [documentData, state.isOpen, state.selectedDocumentId, state.previewType, state.documentName]);

  // Update loading state based on document fetching
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isLoading: isLoadingDocument,
    }));
  }, [isLoadingDocument]);

  const openPreview = useCallback(
    async (
      documentId: string,
      documentName: string,
      previewType: 'pdf' | 'image' | 'other' = 'other'
    ) => {
      setState((prev) => ({
        ...prev,
        isOpen: true,
        isLoading: true,
        selectedDocumentId: documentId,
        documentName,
        previewType,
        previewUrl: null,
      }));

      // If custom getPreviewUrl is provided, use it instead of the built-in fetching
      if (getPreviewUrl) {
        try {
          const url = await getPreviewUrl(documentId);
          setState((prev) => ({
            ...prev,
            previewUrl: url,
            isLoading: false,
          }));
        } catch (error) {
          console.error('Error loading preview:', error);
          setState((prev) => ({
            ...prev,
            isLoading: false,
          }));
        }
      }
    },
    [getPreviewUrl]
  );

  const closePreview = useCallback(() => {
    // Clean up URL if it was created locally
    if (state.previewUrl && state.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(state.previewUrl);
      console.log('Revoked blob URL:', state.previewUrl);
    }

    setState({
      isOpen: false,
      isLoading: false,
      isDownloading: false,
      previewUrl: null,
      documentName: undefined,
      previewType: 'other',
      selectedDocumentId: undefined,
    });
  }, [state.previewUrl]);

  const handleDownload = useCallback(async () => {
    if (!state.selectedDocumentId) return;
    setState((prev) => ({ ...prev, isDownloading: true }));

    try {
      if (onDownload) {
        // Use custom download handler if provided
        await onDownload(state.selectedDocumentId);
      } else if (documentData) {
        // Use the already fetched document data for download
        const contentType = documentData.type || 'application/octet-stream';
        const filename = state.documentName || 'document';

        console.log('Downloading document:', {
          filename,
          contentType,
          size: documentData.size,
        });

        downloadDocument(documentData, filename, contentType);
      } else {
        console.warn('No document data available for download');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    } finally {
      setState((prev) => ({ ...prev, isDownloading: false }));
    }
  }, [state.selectedDocumentId, onDownload, documentData, state.documentName]);

  const setPreviewUrl = useCallback((url: string) => {
    setState((prev) => ({
      ...prev,
      previewUrl: url,
      isLoading: false,
    }));
  }, []);

  // Helper function to handle contract preview from opening data
  const openContractPreview = useCallback(
    (opening: any) => {
      console.log('Opening contract preview for opening:', opening._id);

      // Find the first contract document
      const contractFiles = findContractDocuments(opening.files || []);

      if (contractFiles.length > 0) {
        const contractDoc = contractFiles[0].document;
        console.log('Found contract document:', contractDoc);

        const fileType = contractDoc.type || 'application/octet-stream';
        const previewType = getDocumentPreviewType(fileType, contractDoc.filename);

        console.log('Contract preview type determined:', previewType);

        openPreview(
          contractDoc._id,
          contractDoc.filename,
          previewType as 'pdf' | 'image' | 'other'
        );
      } else {
        // If no specific contract files, show the first file
        const firstFile = opening.files?.[0];
        if (firstFile) {
          console.log('No contract found, using first file:', firstFile);

          const fileType = firstFile.document.type || 'application/octet-stream';
          const previewType = getDocumentPreviewType(fileType, firstFile.document.filename);

          console.log('First file preview type determined:', previewType);

          openPreview(
            firstFile.document._id,
            firstFile.document.filename,
            previewType as 'pdf' | 'image' | 'other'
          );
        } else {
          console.warn('No files found in opening');
        }
      }
    },
    [openPreview]
  );

  return {
    // State
    ...state,

    // Actions
    openPreview,
    closePreview,
    downloadDocument: handleDownload,
    setPreviewUrl,
    openContractPreview,

    // Dialog props (ready to spread into DocumentPreviewDialog)
    dialogProps: {
      isOpen: state.isOpen,
      onClose: closePreview,
      previewUrl: state.previewUrl,
      previewType: state.previewType,
      isLoading: state.isLoading,
      selectedDocumentId: state.selectedDocumentId,
      onDownload: handleDownload,
      isDownloading: state.isDownloading,
      documentName: state.documentName,
    },
  };
};
