'use client';

/**
 * AttachmentList Component
 * Displays a list of attachments with download and optional delete functionality
 *
 * Features:
 * - Download attachments
 * - Optional delete button (when showDelete=true and onAttachmentDelete provided)
 * - Responsive sizing (xs, sm, md)
 * - Displays file name and size
 */

import { useCallback, useState } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { formatFileSize } from '@/utils/documentUtils';
import { useAttachmentDownload } from '../../_hooks/useAttachmentDownload';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

interface BaseAttachment {
  _id?: string;
  document_id?: string;
  filename: string;
  filetype?: string;
  size?: number;
  metadata?: {
    original_filename?: string;
  };
}

interface AttachmentListProps<T extends BaseAttachment> {
  attachments: T[];
  onAttachmentClick?: (attachment: T) => void;
  onAttachmentDelete?: (attachment: T) => void;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  showDelete?: boolean;
}

export default function AttachmentList<T extends BaseAttachment>({
  attachments,
  onAttachmentClick,
  onAttachmentDelete,
  size = 'sm',
  className = '',
  showDelete = false,
}: AttachmentListProps<T>) {
  const { downloadAttachment } = useAttachmentDownload();
  const [attachmentToDelete, setAttachmentToDelete] = useState<T | null>(null);

  const handleClick = useCallback(
    (attachment: T, e: React.MouseEvent) => {
      e.stopPropagation();
      onAttachmentClick?.(attachment);
    },
    [onAttachmentClick]
  );

  const handleDownload = useCallback(
    (attachment: T, e: React.MouseEvent) => {
      downloadAttachment(attachment, e);
    },
    [downloadAttachment]
  );

  const handleDeleteClick = useCallback((attachment: T, e: React.MouseEvent) => {
    e.stopPropagation();
    setAttachmentToDelete(attachment);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (attachmentToDelete) {
      onAttachmentDelete?.(attachmentToDelete);
      setAttachmentToDelete(null);
    }
  }, [attachmentToDelete, onAttachmentDelete]);

  const handleCancelDelete = useCallback(() => {
    setAttachmentToDelete(null);
  }, []);

  if (!attachments || attachments.length === 0) return null;

  const sizeClasses = {
    xs: {
      container: 'mt-2 space-y-1',
      item: 'gap-2 p-2',
      icon: 'text-xs',
      filename: 'text-xs',
      size: 'text-xs',
    },
    sm: {
      container: 'mt-3 space-y-2',
      item: 'gap-3 p-2',
      icon: 'text-sm',
      filename: 'text-sm',
      size: 'text-xs',
    },
    md: {
      container: 'mt-4 space-y-2',
      item: 'gap-3 p-3',
      icon: 'text-base',
      filename: 'text-base',
      size: 'text-sm',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`${classes.container} ${className}`}>
      {attachments.map((attachment) => {
        const attachmentId = attachment.document_id || attachment._id;
        if (!attachmentId) return null;

        return (
          <div
            key={attachmentId}
            className={`flex cursor-pointer items-center rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:bg-gray-100 ${classes.item}`}
            onClick={(e) => handleClick(attachment, e)}
            title={attachment.filename}
          >
            <ApolloIcon name="file" className={`shrink-0 text-gray-400 ${classes.icon}`} />
            <div className="min-w-0 flex-1">
              <div className={`truncate font-medium text-gray-900 ${classes.filename}`}>
                {attachment.filename}
              </div>
              {typeof attachment.size === 'number' && (
                <div className={`text-gray-500 ${classes.size}`}>
                  {formatFileSize(attachment.size)}
                </div>
              )}
            </div>
            <button
              className="shrink-0 rounded p-1 hover:bg-gray-200"
              onClick={(e) => handleDownload(attachment, e)}
              title="Download attachment"
            >
              <ApolloIcon name="download" className={`text-gray-600 ${classes.icon}`} />
            </button>
            {showDelete && onAttachmentDelete && (
              <button
                className="shrink-0 rounded p-1 hover:bg-red-100"
                onClick={(e) => handleDeleteClick(attachment, e)}
                title="Delete attachment"
              >
                <ApolloIcon name="trash" className={`text-red-600 ${classes.icon}`} />
              </button>
            )}
          </div>
        );
      })}
      {attachmentToDelete && (
        <ConfirmDialog
          isOpen={!!attachmentToDelete}
          onClose={handleCancelDelete}
          onCancel={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="Delete Attachment"
          confirmText="Delete"
          cancelText="Cancel"
          confirmButtonProps={{ variant: 'destructive' }}
        >
          <p className="text-sm text-gray-700">
            Are you sure you want to delete{' '}
            <span className="font-medium text-gray-900">{attachmentToDelete.filename}</span>?
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
