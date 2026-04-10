import { useState, useCallback, useEffect } from 'react';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { useDocument } from '@/services/hooks/useDocument';
import { formatFileSize, getDocumentPreviewType } from '@/utils/documentUtils';
import { downloadFile } from '@/utils/emailUtils';
import { isDev } from '@/utils/utils';

export interface Attachment {
  id: string;
  filename: string;
  filetype: string;
  size: number;
  type: string;
  source: string;
  uploadedAt: string;
  assignedAt?: string;
  tags?: string[];
  notes?: string;
  metadata?: {
    assignmentNotes?: string;
    uploader?: string;
    offerId?: string;
    originalFilename?: string;
    fileHash?: string;
    [key: string]: any;
  };
}

export const useDocumentActions = () => {
  const [downloadDocumentId, setDownloadDocumentId] = useState<string | undefined>(undefined);

  // Document preview hook
  const documentPreview = useDocumentPreview();

  // Fetch document for download
  const { data: downloadDocumentData } = useDocument(downloadDocumentId);

  // Handle document preview
  const handleDocumentPreview = useCallback(
    (attachment: Attachment) => {
      try {
        if (!attachment?.id) {
          isDev && console.error('No attachment ID provided');
          return;
        }

        const previewType = getDocumentPreviewType(
          attachment.filetype || '',
          attachment.filename || ''
        );

        documentPreview.openPreview(
          attachment.id,
          attachment.filename || 'Unknown file',
          previewType as 'pdf' | 'image' | 'other'
        );
      } catch (err) {
        isDev && console.error('Error previewing document:', err);
      }
    },
    [documentPreview]
  );

  // Handle document download
  const handleDocumentDownload = useCallback((attachment: Attachment) => {
    if (!attachment?.id) {
      isDev && console.error('No attachment ID provided for download');
      return;
    }
    setDownloadDocumentId(attachment.id);
  }, []);

  // Handle download when document data is loaded
  useEffect(() => {
    if (downloadDocumentData && downloadDocumentId) {
      try {
        // const contentType = downloadDocumentData.type || 'application/octet-stream';
        const filename = `download_${downloadDocumentId}`;
        downloadFile(downloadDocumentData, filename);
      } catch (error) {
        isDev && console.error('Failed to download document:', error);
        alert('Failed to download document. Please try again.');
      } finally {
        setDownloadDocumentId(undefined);
      }
    }
  }, [downloadDocumentData, downloadDocumentId]);

  // Format file size helper
  const getFormattedFileSize = useCallback((size: number) => {
    return formatFileSize(size || 0);
  }, []);

  return {
    handleDocumentPreview,
    handleDocumentDownload,
    getFormattedFileSize,
    documentPreview,
  };
};
