import React, { useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { Upload as UploadIcon } from 'lucide-react';
import { apiUploadLibraryDocuments } from '@/services/DocumentService';
import { useUpdateTask } from '@/hooks/useTasks';
import useNotification from '@/utils/hooks/useNotification';
import { UploadLoader } from '@/components/shared/loaders';

interface CompactFileUploadProps {
  taskId: string;
  currentAttachments?: string[];
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onUploadComplete?: () => void;
  variant?: 'dropzone' | 'button';
  label?: string;
  buttonClassName?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}


export const CompactFileUpload: React.FC<CompactFileUploadProps> = ({
  taskId,
  currentAttachments = [],
  accept = '*',
  multiple = true,
  disabled = false,
  onUploadComplete,
  variant = 'dropzone',
  label = 'Add attachment',
  buttonClassName,
  inputRef,
}) => {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = inputRef ?? internalInputRef;
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { mutate: updateTask } = useUpdateTask();
  const { openNotification } = useNotification();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    setIsUploading(true);

    try {
      // Upload files to library
      const uploadResponse = await apiUploadLibraryDocuments(fileArray);
      const arrayIds = (uploadResponse as any)?.data?.successful?.map((doc: any) => doc.documentId || doc.id || doc._id);
      // Extract document IDs from response

      if (arrayIds.length === 0) {
        openNotification({
          type: 'danger',
          massage: 'Failed to upload files. No document IDs returned.',
        });
        setIsUploading(false);
        return;
      }

      // Merge new document IDs with existing attachments
      const existingIds = Array.isArray(currentAttachments) ? currentAttachments : [];
      const updatedAttachments = [...existingIds, ...arrayIds];

      // Update task with merged attachment array
      updateTask(
        {
          id: taskId,
          data: { attachment: updatedAttachments },
        },
        {
          onSuccess: () => {
            openNotification({
              type: 'success',
              massage: `Successfully uploaded ${arrayIds.length} file(s)`,
            });
            onUploadComplete?.();
          },
          onError: (error: any) => {
            openNotification({
              type: 'danger',
              massage: error?.message || 'Failed to update task with attachments',
            });
          },
        }
      );
    } catch (error: any) {
      openNotification({
        type: 'danger',
        massage: error?.message || error?.response?.data?.message || 'Failed to upload files',
      });
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
      {variant === 'button' ? (
        <Button
          type="button"
          size="xs"
          onClick={handleClick}
          disabled={disabled || isUploading}
          className={`flex items-center gap-2 rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-1 text-sm font-semibold text-black transition-colors hover:bg-gray-100 ${buttonClassName || ''}`}
        >
          {isUploading ? <UploadLoader /> : <UploadIcon className="h-4 w-4 text-gray-500" />}
          {!isUploading && <span>{label}</span>}
        </Button>
      ) : (
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-gray-50 p-3 text-center transition-all duration-200
          ${isDragging ? 'border-ocean-2 bg-ocean-2/10' : 'border-ocean-2/50 hover:border-ocean-2 hover:bg-ocean-2/10'}
          ${disabled || isUploading ? 'cursor-not-allowed opacity-50' : ''}
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        {isUploading ? (
          <UploadLoader />
        ) : (
          <>
            <UploadIcon className={`h-4 w-4 transition-colors duration-200 ${isDragging ? 'text-ocean-2' : 'text-gray-500'}`} />
            <span className="text-xs font-medium text-gray-600">
              {isDragging ? 'Drop files here' : 'Drop files or click to upload'}
            </span>
          </>
        )}
        {isUploading && (
          <div className="absolute inset-0 rounded-xl bg-ocean-2/5 animate-pulse"></div>
        )}
      </div>
      )}
    </>
  );
};
