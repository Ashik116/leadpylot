'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Upload from '@/components/ui/Upload';
import { FcImageFile } from 'react-icons/fc';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { apiUploadLibraryDocuments } from '@/services/DocumentService';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useAttachmentPreviewFile } from '@/utils/hooks/useAttachMentPreviewFile';
import { FormItem } from '@/components/ui/Form';
import classNames from '@/utils/classNames';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface UserImageUploadProps {
  value?: string; // documentId (image_id)
  onChange?: (documentId: string | null) => void;
  disabled?: boolean;
  label?: string;
  error?: string;
  accept?: string;
  maxFileSize?: number;
  className?: string;
}

const UserImageUpload = ({
  value,
  onChange,
  disabled = false,
  label = 'User Image',
  error,
  accept = '.png,.jpg,.jpeg',
  className,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
}: UserImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Use attachment preview hook to get blob URL for preview
  // Only fetch if value exists and is not empty
  const { blobUrl } = useAttachmentPreviewFile(
    value && typeof value === 'string' && value.trim() !== '' ? value : undefined
  );

  const handleFileSelect = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      // Validate file size
      if (file.size > maxFileSize) {
        const errorMsg = `File "${file.name}" exceeds ${(maxFileSize / 1024 / 1024).toFixed(0)}MB limit`;
        setUploadError(errorMsg);
        toast.push(
          <Notification title="Error" type="danger">
            {errorMsg}
          </Notification>
        );
        return;
      }

      // Validate file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = accept.split(',').map((ext) => ext.trim().replace('.', ''));
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        const errorMsg = `File type not supported. Allowed types: ${accept}`;
        setUploadError(errorMsg);
        toast.push(
          <Notification title="Error" type="danger">
            {errorMsg}
          </Notification>
        );
        return;
      }

      try {
        setIsUploading(true);
        setUploadError(null);

        // Upload immediately using apiUploadLibraryDocuments
        const uploadResponse = (await apiUploadLibraryDocuments([file], 'extra')) as any;

        if (uploadResponse?.data?.successful && uploadResponse.data.successful.length > 0) {
          const documentId = uploadResponse.data.successful[0].documentId;

          if (documentId) {
            onChange?.(documentId);
            toast.push(
              <Notification title="Success" type="success">
                Image uploaded successfully
              </Notification>
            );
          } else {
            throw new Error('No document ID returned from upload');
          }
        } else {
          throw new Error(uploadResponse?.data?.message || 'Upload failed');
        }
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to upload image. Please try again.';
        setUploadError(errorMsg);
        toast.push(
          <Notification title="Error" type="danger">
            {errorMsg}
          </Notification>
        );
      } finally {
        setIsUploading(false);
      }
    },
    [onChange, maxFileSize, accept]
  );

  const handleRemove = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      onChange?.(null);
      setUploadError(null);
    },
    [onChange]
  );

  const imageSrc = value ? blobUrl : null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const size = 'size-32'; // 128px - circular profile avatar

  return (
    <FormItem
      label={label}
      invalid={!!error || !!uploadError}
      errorMessage={(error || uploadError) ?? undefined}
      className="flex flex-col items-center text-sm"
    >
      <div className={classNames('flex flex-col items-center justify-center w-full', className)}>
        {isUploading ? (
          <div
            className={classNames(
              'flex flex-col items-center justify-center rounded-full border-2 border-dashed border-gray-200 bg-gray-50',
              size
            )}
          >
            <LoadingSpinner size="md" />
            <p className="mt-2 text-xs text-gray-600">Uploading...</p>
          </div>
        ) : !imageSrc ? (
          <Upload
            showList={false}
            accept={accept}
            className={classNames(
              'flex flex-col items-center justify-center rounded-full border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-gray-300 hover:bg-gray-50/80',
              size,
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onChange={handleFileSelect}
            draggable
            disabled={disabled || isUploading}
          >
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <div className="mb-2 flex justify-center text-4xl">
                <FcImageFile />
              </div>
              <p className="text-xxs font-medium text-gray-700">
                <span className="text-gray-600">Drop or </span>
                <span className="text-blue-500">browse</span>
              </p>
              <p className="mt-1 text-xxs text-gray-500">
                {accept.replace(/\./g, '').toUpperCase()} · {(maxFileSize / 1024 / 1024).toFixed(0)}MB
              </p>
            </div>
          </Upload>
        ) : (
          <div
            className={classNames(
              'group relative rounded-full ring-2 ring-gray-200 cursor-pointer',
              size,
              disabled && 'cursor-default'
            )}
          >
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <Image
                src={imageSrc}
                alt="User image"
                fill
                className="rounded-full object-cover"
                sizes="128px"
              />
            </div>
            {!disabled && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={accept}
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files?.length) handleFileSelect(Array.from(files));
                    e.target.value = '';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="flex size-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md transition-transform hover:scale-105 hover:bg-white"
                    title="Change image"
                  >
                    <ApolloIcon name="cloud-upload" className="text-lg" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleRemove(e)}
                  className="opacity-0 group-hover:opacity-100 absolute bottom-3 right-3 z-50 flex size-4 items-center justify-center rounded-full bg-white text-red-900 shadow-md ring-1 ring-red-600 hover:bg-red-50 hover:shadow-lg"
                  title="Remove image"
                >
                  <ApolloIcon name="times" className="text-xs" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </FormItem>
  );
};

export default UserImageUpload;
