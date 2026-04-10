import { useCallback, useEffect, useState } from 'react';
import { useDocument } from '@/services/hooks/useDocument';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { useDeleteAttachment } from '@/services/hooks/useAttachments';
import { getDocumentPreviewType, downloadDocument } from '@/utils/documentUtils';

interface DocumentFile {
    document: {
        _id: string;
        type: string;
        filename: string;
    };
}

interface UseDocumentHandlerProps {
    onDownload?: (documentId: string) => Promise<void>;
    getPreviewUrl?: (documentId: string) => Promise<string>;
}

export const useDocumentHandler = ({ onDownload, getPreviewUrl }: UseDocumentHandlerProps = {}) => {
    // Document preview state
    const [downloadDocumentId, setDownloadDocumentId] = useState<string | undefined>(undefined);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [previewFiles, setPreviewFiles] = useState<DocumentFile[]>([]);

    // Delete confirmation state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<{
        id: string;
        filename: string;
        documentType: string;
        offerId?: string;
    } | null>(null);

    // Document preview hook
    const documentPreview = useDocumentPreview({
        onDownload,
        getPreviewUrl,
    });

    // Delete attachment mutation
    const deleteAttachmentMutation = useDeleteAttachment({
        onSuccess: () => {
            setDeleteConfirmOpen(false);
            setDocumentToDelete(null);
        },
        onError: (error) => {
            console.error('Failed to delete attachment:', error);
            setDeleteConfirmOpen(false);
            setDocumentToDelete(null);
        },
    });

    // Fetch document for preview
    const { data: documentData } = useDocument(
        documentPreview.selectedDocumentId
    );

    // Fetch document for download
    const { data: downloadDocumentData, isLoading: isLoadingDownload } =
        useDocument(downloadDocumentId);

    /**
     * Handle delete confirmation
     */
    const handleDeleteConfirm = useCallback(() => {
        if (documentToDelete) {
            deleteAttachmentMutation.mutate({ attachmentId: documentToDelete.id, offerId: documentToDelete.offerId || '' });
        }
    }, [documentToDelete, deleteAttachmentMutation]);

    /**
     * Generic document handler for multiple document types
     * 
     * Handles preview, download, and delete actions for documents based on their type.
     * Supports both single file and multi-file scenarios.
     * 
     * @param item - The item containing files (must have a files property)
     * @param documentType - The type of document to handle (e.g., 'contract', 'id', 'payment_voucher')
     * @param action - The action to perform ('preview', 'download', 'delete')
     */
    const handleDocumentAction = useCallback((
        item: any,
        documentType: string,
        action: 'preview' | 'download' | 'delete'
    ) => {
        // console.log('handleDocumentAction', item);
        switch (action) {
            case 'preview':
                // Single file - use existing preview
                const file = (item?.files && item.files[0]) || item;
                const fileType = file?.type || 'application/octet-stream';
                const previewType = getDocumentPreviewType(fileType, file?.filename);
                documentPreview.openPreview(file?._id, file?.filename, previewType as 'pdf' | 'image' | 'other');
                break;
            case 'download':
                setDownloadDocumentId(item?._id);
                break;
            case 'delete':
                // console.log(`Delete ${documentType}:`, item?._id);
                // Set up delete confirmation dialog
                setDocumentToDelete({
                    id: item?._id,
                    offerId: item?.offerId,
                    filename: item?.filename,
                    documentType: documentType
                });
                setDeleteConfirmOpen(true);
                break;
            default:
                break;
        }

    },
        [documentPreview, setPreviewFiles, setCurrentFileIndex]
    );

    /**
     * Navigate to the next file in multi-file preview
     */
    const handleNextFile = useCallback(() => {
        if (previewFiles.length > 0 && currentFileIndex < previewFiles.length - 1) {
            const nextIndex = currentFileIndex + 1;
            const nextDoc = previewFiles[nextIndex].document;
            setCurrentFileIndex(nextIndex);

            const fileType = nextDoc.type || 'application/octet-stream';
            const previewType = getDocumentPreviewType(fileType, nextDoc.filename);
            documentPreview.openPreview(nextDoc._id, nextDoc.filename, previewType as 'pdf' | 'image' | 'other');
        }
    }, [previewFiles, currentFileIndex, documentPreview]);

    /**
     * Navigate to the previous file in multi-file preview
     */
    const handlePreviousFile = useCallback(() => {
        if (previewFiles.length > 0 && currentFileIndex > 0) {
            const prevIndex = currentFileIndex - 1;
            const prevDoc = previewFiles[prevIndex].document;
            setCurrentFileIndex(prevIndex);

            const fileType = prevDoc.type || 'application/octet-stream';
            const previewType = getDocumentPreviewType(fileType, prevDoc.filename);
            documentPreview.openPreview(prevDoc._id, prevDoc.filename, previewType as 'pdf' | 'image' | 'other');
        }
    }, [previewFiles, currentFileIndex, documentPreview]);

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
                const contentType = downloadDocumentData.type || 'application/octet-stream';
                downloadDocument(downloadDocumentData, documentPreview.documentName || '', contentType);
            } catch (error) {
                console.error('Error downloading document:', error);
            } finally {
                setDownloadDocumentId(undefined);
            }
        }
    }, [downloadDocumentData, downloadDocumentId, documentPreview.documentName]);

    return {
        // State
        downloadDocumentId,
        currentFileIndex,
        previewFiles,
        isLoadingDownload,

        // Actions
        handleDocumentAction,
        handleNextFile,
        handlePreviousFile,
        setDownloadDocumentId,

        // Document preview
        documentPreview,

        // Delete mutation
        deleteAttachmentMutation,

        // Delete confirmation
        deleteConfirmOpen,
        setDeleteConfirmOpen,
        documentToDelete,
        handleDeleteConfirm,

        // Dialog props for DocumentPreviewDialog
        dialogProps: {
            ...documentPreview.dialogProps,
            isLoading: documentPreview.isLoading,
            isDownloading:
                downloadDocumentId === documentPreview.selectedDocumentId && isLoadingDownload,
            showNavigation: previewFiles.length > 1,
            currentIndex: currentFileIndex,
            totalFiles: previewFiles.length,
            onNext: handleNextFile,
            onPrevious: handlePreviousFile,
        },
    };
}; 