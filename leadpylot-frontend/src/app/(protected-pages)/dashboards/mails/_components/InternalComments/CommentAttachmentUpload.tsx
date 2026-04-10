'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import {
  apiUploadLibraryDocuments,
  apiBulkDeleteLibraryDocuments,
} from '@/services/DocumentService';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { getDocumentPreviewType } from '@/utils/documentUtils';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';

interface ExistingAttachment {
  id: string;
  filename: string;
  size?: number;
}

interface CommentAttachmentUploadProps {
  value?: string[];
  onChange?: (attachmentIds: string[]) => void;
  disabled?: boolean;
  maxFileSize?: number;
  existingAttachments?: ExistingAttachment[];
  label?: string;
  onUploadStateChange?: (isUploading: boolean) => void;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
}

export default function CommentAttachmentUpload({
  value = [],
  onChange,
  disabled = false,
  maxFileSize = 4 * 1024 * 1024,
  existingAttachments = [],
  label,
  onUploadStateChange,
}: CommentAttachmentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const documentPreview = useDocumentPreview();

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const filesArray = Array.from(files);

      for (const file of filesArray) {
        if (file.size > maxFileSize) {
          toast.push(
            <Notification title="Error" type="danger">
              File &quot;{file.name}&quot; exceeds {(maxFileSize / 1024 / 1024).toFixed(0)}MB limit
            </Notification>
          );
          return;
        }
      }

      try {
        setIsUploading(true);
        onUploadStateChange?.(true);
        const uploadResponse = (await apiUploadLibraryDocuments(filesArray, 'extra')) as any;

        if (uploadResponse?.data?.successful && uploadResponse.data.successful.length > 0) {
          const newDocumentIds = uploadResponse.data.successful.map((doc: any) => doc.documentId);
          const newFiles = uploadResponse.data.successful.map((doc: any) => ({
            id: doc.documentId,
            name: doc.filename,
            size: doc.size,
          }));

          const updatedIds = [...value, ...newDocumentIds];
          const updatedFiles = [...uploadedFiles, ...newFiles];

          setUploadedFiles(updatedFiles);
          onChange?.(updatedIds);
        }
      } catch (error) {
        console.error('Failed to upload attachments:', error);
        toast.push(
          <Notification title="Error" type="danger">
            Failed to upload attachments
          </Notification>
        );
      } finally {
        setIsUploading(false);
        onUploadStateChange?.(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [value, onChange, uploadedFiles, maxFileSize]
  );

  const handleRemove = useCallback(
    async (attachmentId: string) => {
      try {
        await apiBulkDeleteLibraryDocuments({
          ids: [attachmentId],
          unassign: false,
          permanent: true,
        });

        const updatedIds = value.filter((id) => id !== attachmentId);
        const updatedFiles = uploadedFiles.filter((file) => file.id !== attachmentId);

        setUploadedFiles(updatedFiles);
        onChange?.(updatedIds);

        toast.push(
          <Notification title="Success" type="success">
            Attachment removed
          </Notification>
        );
      } catch (error) {
        console.error('Failed to delete attachment:', error);
        toast.push(
          <Notification title="Error" type="danger">
            Failed to remove attachment
          </Notification>
        );
      }
    },
    [value, onChange, uploadedFiles]
  );

  const handleRemoveAll = useCallback(async () => {
    if (value.length === 0) return;

    try {
      await apiBulkDeleteLibraryDocuments({
        ids: value,
        unassign: false,
        permanent: true,
      });

      setUploadedFiles([]);
      onChange?.([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.push(
        <Notification title="Success" type="success">
          All attachments removed
        </Notification>
      );
    } catch (error) {
      console.error('Failed to delete attachments:', error);
      toast.push(
        <Notification title="Error" type="danger">
          Failed to remove attachments
        </Notification>
      );
    }
  }, [value, onChange]);

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const handlePreview = useCallback(
    (file: UploadedFile) => {
      const previewType = getDocumentPreviewType('', file.name) as 'pdf' | 'image' | 'other';
      documentPreview.openPreview(file.id, file.name, previewType);
    },
    [documentPreview]
  );

  // Sync uploadedFiles with existingAttachments when editing starts
  useEffect(() => {
    if (existingAttachments.length > 0 && uploadedFiles.length === 0) {
      // Only set on initial mount or when uploadedFiles is empty
      // Convert existing attachments to UploadedFile format
      const existingFiles: UploadedFile[] = existingAttachments.map((att) => ({
        id: att.id,
        name: att.filename,
        size: att.size || 0,
      }));
      setUploadedFiles(existingFiles);
    }
  }, [existingAttachments]);

  // Reset uploadedFiles when value is cleared
  useEffect(() => {
    if (value.length === 0 && uploadedFiles.length > 0) {
      setUploadedFiles([]);
    }
  }, [value.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        disabled={disabled || isUploading}
      />

      <button
        type="button"
        className={`${label ? 'border' : ''} inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1 transition-colors ${disabled || isUploading
          ? 'cursor-not-allowed text-gray-400 opacity-50'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        title="Attach files"
      >
        {isUploading ? (
          <ApolloIcon name="loading" className="animate-spin" />
        ) : (
          <ApolloIcon name="paperclip" className="size-5" />
        )}
        {label && <span className="text-xs text-gray-500">{label}</span>}
        {value.length > 0 && <span className="text-xs">{value.length}</span>}
      </button>

      {value.length > 0 && (
        <>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={disabled || isUploading}
            title="View attachments"
          >
            <ApolloIcon
              name={showDropdown ? 'chevron-arrow-up' : 'chevron-arrow-down'}
              className="size-4"
            />
          </button>

          <Button
            type="button"
            variant="plain"
            size="sm"
            icon={<ApolloIcon name="cross" className="size-4 text-red-500" />}
            onClick={handleRemoveAll}
            disabled={disabled || isUploading}
            title="Remove all attachments"
          />
        </>
      )}

      {showDropdown && uploadedFiles.length > 0 && (
        <div className="absolute bottom-full left-0 z-50 mb-2 max-h-64 w-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="rounded-t-lg border-b border-gray-200 bg-gray-50 p-2">
            <span className="text-xs font-medium text-gray-700">
              Attachments ({uploadedFiles.length})
            </span>
          </div>
          <div className="space-y-2 p-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="bg-evergreen/10 border-evergreen group flex items-center gap-2 rounded-lg border p-2 transition-colors"
              >
                <ApolloIcon name="file" className="text-evergreen shrink-0" />
                <button
                  type="button"
                  onClick={() => handlePreview(file)}
                  className="min-w-0 flex-1 text-left hover:underline"
                  title="Click to preview"
                >
                  <p className="truncate text-sm font-medium text-amber-900">{file.name}</p>
                  <p className="text-xs text-amber-600">{formatFileSize(file.size)}</p>
                </button>
                <button
                  type="button"
                  onClick={() => handlePreview(file)}
                  className="text-evergreen shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-amber-200 hover:text-amber-800"
                  disabled={disabled || isUploading}
                  title="Preview"
                >
                  <ApolloIcon name="eye-filled" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(file.id)}
                  className="shrink-0 rounded p-1 text-amber-600 hover:bg-amber-200 hover:text-amber-800"
                  disabled={disabled || isUploading}
                  title="Remove"
                >
                  <ApolloIcon name="trash" className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog {...documentPreview.dialogProps} title="Attachment Preview" />
    </div>
  );
}
