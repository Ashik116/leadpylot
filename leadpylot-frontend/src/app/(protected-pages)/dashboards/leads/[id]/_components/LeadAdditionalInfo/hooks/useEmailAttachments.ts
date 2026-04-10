import { useState, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import { useLeadAttachments } from '@/services/hooks/notifications/useLeadAttachments';
import { useGeneratedPdfStore } from '@/stores/generatedPdfStore';
import {
  apiUploadLibraryDocuments,
  apiBulkDeleteLibraryDocuments,
} from '@/services/DocumentService';
import useNotification from '@/utils/hooks/useNotification';

export interface Attachment {
  id: string;
  file: File;
  name: string;
  size: string;
  type?: 'document' | 'library';
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
};

export const useEmailAttachments = (leadId?: string) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploadingLibrary, setIsUploadingLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;
  const { data: leadAttachmentsData, isLoading: isLoadingAttachments } = useLeadAttachments(leadId);
  const { assignedPdfData, clearAssignedPdfData } = useGeneratedPdfStore();
  const { openNotification } = useNotification();

  // Automatically add assigned PDF as attachment
  useEffect(() => {
    if (assignedPdfData && !attachments.some((att) => att.id === assignedPdfData.id)) {
      queueMicrotask(() => setAttachments(() => [assignedPdfData]));
      clearAssignedPdfData();
    }
  }, [assignedPdfData, attachments, clearAssignedPdfData]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!files.length) return;
    await handleFilesAdded(files);
  };

  const handleFilesAdded = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      try {
        setIsUploadingLibrary(true);
        const response = (await apiUploadLibraryDocuments(files, 'extra')) as any;
        const successful = response?.data?.successful || [];
        if (!successful.length) {
          openNotification({ type: 'danger', massage: 'Failed to upload files' });
          return;
        }
        const newAttachments: Attachment[] = successful.map((item: any, index: number) => {
          const file = files[index];
          return {
            id: item.documentId || item.id || item._id,
            file: file || new File([], item.filename || 'document', { type: item.filetype }),
            name: item.filename || file?.name || 'Document',
            size: file ? formatFileSize(file.size) : (item.size ? formatFileSize(item.size) : '0 B'),
            type: 'library',
          };
        });
        setAttachments((prev) => [...prev, ...newAttachments]);
      } catch (error: any) {
        openNotification({
          type: 'danger',
          massage: error?.message || 'Failed to upload attachments',
        });
      } finally {
        setIsUploadingLibrary(false);
      }
    },
    [openNotification]
  );

  const handleDocumentSelect = (option: any) => {
    const documentId = option?.value;

    if (!documentId || !leadAttachmentsData?.data?.attachments) return;

    const selectedAttachment = leadAttachmentsData.data.attachments.find(
      (attachment: any) => attachment.id === documentId
    );

    if (!selectedAttachment) return;

    setAttachments((prev) => {
      if (prev.some((att) => att.id === selectedAttachment.id)) return prev;
      return [
        ...prev,
        {
          id: selectedAttachment.id,
          name: selectedAttachment.filename,
          type: 'document',
          size: formatFileSize(selectedAttachment.size),
          file: new File([], selectedAttachment.filename, {
            type: selectedAttachment.filetype,
          }),
        },
      ];
    });
  };

  const handleRemoveAttachment = useCallback(
    async (id: string) => {
      const attachment = attachments.find((a) => a.id === id);
      if (attachment?.type === 'library') {
        try {
          await apiBulkDeleteLibraryDocuments({
            ids: [id],
            unassign: false,
            permanent: true,
          });
        } catch (error: any) {
          openNotification({
            type: 'danger',
            massage: error?.message || 'Failed to delete attachment',
          });
          return;
        }
      }
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    },
    [attachments, openNotification]
  );

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const addAttachment = useCallback((attachment: Attachment) => {
    setAttachments((prev) => {
      if (prev.some((att) => att.id === attachment.id)) return prev;
      return [...prev, attachment];
    });
  }, []);

  const addAttachments = useCallback((newAttachments: Attachment[]) => {
    setAttachments((prev) => {
      const existingIds = new Set(prev.map((att) => att.id));
      const uniqueNewAttachments = newAttachments.filter(
        (att) => !existingIds.has(att.id)
      );
      if (uniqueNewAttachments.length === 0) return prev;
      return [...prev, ...uniqueNewAttachments];
    });
  }, []);

  const removeAttachmentsByIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const idsSet = new Set(ids);
    setAttachments((prev) => prev.filter((att) => !idsSet.has(att.id)));
  }, []);

  const reset = () => {
    setAttachments([]);
  };

  return {
    attachments,
    fileInputRef,
    isLoadingAttachments,
    isUploadingLibrary,
    leadAttachmentsData,
    handleFileUpload,
    handleFilesAdded,
    handleDocumentSelect,
    handleRemoveAttachment,
    handleAttachClick,
    addAttachment,
    addAttachments,
    removeAttachmentsByIds,
    reset,
    formatFileSize,
  };
};
