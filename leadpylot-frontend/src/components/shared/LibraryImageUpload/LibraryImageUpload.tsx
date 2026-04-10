'use client';

import { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { apiUploadLibraryDocuments } from '@/services/DocumentService';
import { useBulkDeleteLibraryDocuments } from '@/services/hooks/useDocument';
import { useAttachmentPreviewFile } from '@/utils/hooks/useAttachMentPreviewFile';
import useNotification from '@/utils/hooks/useNotification';
import { apiGetFileAttachment, apiCloudinaryUploadSingle, apiDeleteAttachment } from '@/services/AttachmentService';
import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';

export interface LibraryImageUploadProps {
  value: string | null;
  /** When uploadMethod is cloudinary, publicUrl is passed after upload to avoid extra /view API call */
  onChange: (documentId: string | null, publicUrl?: string) => void;
  label?: string;
  documentType?: string;
  accept?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  maxFileSize?: number;
  /** Use cloudinary upload API (POST /attachments/cloudinary/upload) instead of library documents */
  uploadMethod?: 'library' | 'cloudinary';
  /** When parent provides this (e.g. BankForm), avoids duplicate cache - single source of truth */
  cachedPreviewUrl?: string | null;
}

const DEFAULT_ACCEPT = '.jpg,.jpeg,.png';
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** Image-upload loading animation: frame with shimmer */
function ImageUploadLoading() {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-gray-100"
      aria-label="Uploading image"
    >
      <div className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
        <ApolloIcon name="picture" className="relative z-10 text-xxs text-violet-600" />
      </div>
    </div>
  );
}

export function LibraryImageUpload({
  value,
  onChange,
  label,
  documentType = 'extra',
  accept = DEFAULT_ACCEPT,
  disabled = false,
  error,
  className,
  maxFileSize = DEFAULT_MAX_SIZE,
  uploadMethod = 'library',
  cachedPreviewUrl,
}: LibraryImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingCloudinary, setIsDeletingCloudinary] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [publicUrlCache, setPublicUrlCache] = useState<Record<string, string>>({});
  const { openNotification } = useNotification();
  const { mutate: bulkDelete, isPending: isDeletingLibrary } = useBulkDeleteLibraryDocuments();
  const isDeleting = uploadMethod === 'cloudinary' ? isDeletingCloudinary : isDeletingLibrary;

  const valueStr = value && typeof value === 'string' && value.trim() !== '' ? value : null;
  const parentCache = cachedPreviewUrl ?? null;
  const localCache = uploadMethod === 'cloudinary' && valueStr ? publicUrlCache[valueStr] : null;
  const previewUrl = parentCache ?? localCache;
  const shouldFetchPreview = valueStr && !previewUrl;
  const { blobUrl } = useAttachmentPreviewFile(shouldFetchPreview ? valueStr : undefined);

  const imageSrc = valueStr ? (previewUrl ?? blobUrl) : null;
  const previewLoading = !!(valueStr && !imageSrc);

  const handleChooseClick = useCallback(() => {
    if (disabled || isUploading || isDeleting) return;
    inputRef.current?.click();
  }, [disabled, isUploading, isDeleting]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = accept.split(',').map((ext) => ext.trim().replace(/^\./, ''));
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        openNotification({
          type: 'danger',
          massage: `File type not supported. Allowed: ${accept.replace(/\./g, '').toUpperCase()}`,
        });
        return;
      }
      if (file.size > maxFileSize) {
        openNotification({
          type: 'danger',
          massage: `File exceeds ${(maxFileSize / 1024 / 1024).toFixed(0)}MB limit`,
        });
        return;
      }

      setSelectedFileName(file.name);
      setIsUploading(true);
      try {
        let documentId: string;
        if (uploadMethod === 'cloudinary') {
          const result = await apiCloudinaryUploadSingle(file);
          documentId = result.documentId;
          if (result.public_url && !cachedPreviewUrl) {
            setPublicUrlCache((prev) => ({ ...prev, [documentId]: result.public_url }));
          }
          onChange(documentId, result.public_url);
        } else {
          const response = (await apiUploadLibraryDocuments([file], documentType)) as {
            data?: { successful?: { documentId: string }[]; message?: string };
          };
          if (response?.data?.successful?.length) {
            documentId = response.data.successful[0].documentId;
          } else {
            throw new Error(response?.data?.message || 'Upload failed');
          }
        }
        if (uploadMethod !== 'cloudinary') onChange(documentId);
        openNotification({ type: 'success', massage: 'Image uploaded successfully' });
      } catch (err: unknown) {
        openNotification({
          type: 'danger',
          massage: (err as Error)?.message || 'Failed to upload image',
        });
      } finally {
        setIsUploading(false);
        setSelectedFileName(null);
        e.target.value = '';
      }
    },
    [accept, documentType, maxFileSize, onChange, openNotification, uploadMethod, cachedPreviewUrl]
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!value || disabled || isDeleting) return;
      if (uploadMethod === 'cloudinary') {
        setIsDeletingCloudinary(true);
        try {
          await apiDeleteAttachment(value);
          if (!cachedPreviewUrl) {
            setPublicUrlCache((prev) => {
              const next = { ...prev };
              delete next[value];
              return next;
            });
          }
          onChange(null);
          openNotification({ type: 'success', massage: 'Image removed' });
        } catch {
          openNotification({ type: 'danger', massage: 'Failed to remove image' });
        } finally {
          setIsDeletingCloudinary(false);
        }
      } else {
        bulkDelete(
          { ids: [value], unassign: true },
          {
            onSuccess: () => {
              onChange(null);
            },
          }
        );
      }
    },
    [value, disabled, isDeleting, bulkDelete, onChange, openNotification, uploadMethod, cachedPreviewUrl]
  );

  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewOpen(true);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!value || typeof value !== 'string') return;
    setIsDownloading(true);
    try {
      const blob = await apiGetFileAttachment(value);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${value}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      openNotification({ type: 'danger', massage: 'Failed to download image' });
    } finally {
      setIsDownloading(false);
    }
  }, [value, openNotification]);

  const isBusy = isUploading || isDeleting;
  const fileChosenLabel = value ? '1 file chosen' : selectedFileName || 'No file chosen';

  return (
    <div className={classNames('flex flex-col', className)}>
      {label && (
        <label className="pb-1.5 block text-sm font-medium opacity-70">{label}</label>
      )}
      <div className="flex items-center gap-3">
        {/* Left: input block (Choose File + label) in bordered rectangular container */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-md border border-gray-300 bg-white pr-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || isBusy}
            aria-hidden
          />
          <button
            type="button"
            onClick={handleChooseClick}
            disabled={disabled || isBusy}
            className={classNames(
              'rounded px-3 py-1.5 text-sm font-semibold transition-colors',
              'bg-violet-100 text-violet-800 hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            Choose File
          </button>
          <span className="text-sm text-gray-500">{fileChosenLabel}</span>
        </div>

        {/* Right: rectangular preview; overflow-visible so delete button at -right-1 -top-1 is not clipped */}
        <div className="group relative h-9 w-9 shrink-0 rounded-md border border-gray-200 bg-gray-100">
          <div className="relative h-full w-full overflow-hidden rounded-md">
            {isBusy ? (
              <ImageUploadLoading />
            ) : imageSrc ? (
              <button
                type="button"
                onClick={handlePreviewClick}
                className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1 rounded-md"
                title="Click to preview"
                aria-label="Preview image"
              >
                <Image
                  src={imageSrc}
                  alt="Preview"
                  fill
                  className="object-cover pointer-events-none rounded-md"
                  sizes="64px"
                />
              </button>
            ) : (
              <div className="h-full w-full bg-gray-200 flex items-center justify-center" aria-hidden >
                <ApolloIcon name="picture" className="text-xl text-gray-400" />
              </div>
            )}
          </div>
          {!disabled && imageSrc && !isBusy && (
            <button
              type="button"
              onClick={handleDelete}
              className="hidden absolute -right-1 -top-1 z-10 group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
              title="Remove image"
              aria-label="Remove image"
            >
              <ApolloIcon name="times" className="text-xs" />
            </button>
          )}
        </div>
      </div>
      {error && <span className="mt-1 text-sm text-red-500">{error}</span>}

      <DocumentPreviewDialog
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        previewUrl={imageSrc}
        previewType="image"
        isLoading={previewLoading}
        selectedDocumentId={value ?? undefined}
        onDownload={handleDownload}
        isDownloading={isDownloading}
        title="Image Preview"
      />
    </div>
  );
}

export default LibraryImageUpload;
