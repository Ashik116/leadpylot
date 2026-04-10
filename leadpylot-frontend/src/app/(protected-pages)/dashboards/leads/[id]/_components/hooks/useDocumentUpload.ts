import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiUploadLibraryDocuments, apiAssignDocumentsToLead } from '@/services/DocumentService';
import useNotification from '@/utils/hooks/useNotification';

export interface UseDocumentUploadOptions {
  leadId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UploadState {
  [documentType: string]: boolean;
}

export const useDocumentUpload = ({ leadId, onSuccess, onError }: UseDocumentUploadOptions) => {
  const [uploadStates, setUploadStates] = useState<UploadState>({});
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  const uploadDocuments = useCallback(
    async (files: File[], documentType: string) => {
      if (!files || files.length === 0) return;

      const uploadKey = documentType;

      try {
        // Set loading state
        setUploadStates((prev) => ({ ...prev, [uploadKey]: true }));

        // Step 1: Upload to document library with document type
        const uploadResponse = (await apiUploadLibraryDocuments(files, documentType)) as any;

        if (uploadResponse?.data?.successful && uploadResponse.data.successful.length > 0) {
          // Step 2: Assign documents to lead
          const documentIds = uploadResponse.data.successful.map((doc: any) => doc.documentId);
          const assignmentResponse = (await apiAssignDocumentsToLead(documentIds, leadId)) as any;

          // Success - refresh the attachments data
          queryClient.invalidateQueries({ queryKey: ['leadAttachments', leadId] });

          // Show success notification
          // openNotification({
          //   type: 'success',
          //   massage:
          //     assignmentResponse?.data?.message || 'Documents uploaded and assigned successfully',
          // });

          onSuccess?.();
        }
      } catch (error) {
        console.error('File upload failed:', error);

        openNotification({
          type: 'danger',
          massage: (error as any)?.message || 'Failed to upload documents',
        });

        onError?.(error as Error);
      } finally {
        // Clear loading state
        setUploadStates((prev) => ({ ...prev, [uploadKey]: false }));
      }
    },
    [leadId, queryClient, openNotification, onSuccess, onError]
  );

  const isUploading = useCallback(
    (documentType: string): boolean => {
      return uploadStates[documentType] || false;
    },
    [uploadStates]
  );

  return {
    uploadDocuments,
    isUploading,
    uploadStates,
  };
};
