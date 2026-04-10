import React, { useCallback } from 'react';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { FileDocumentCard } from '@/components/shared/FileDocumentCard';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { apiFetchDocument } from '@/services/DocumentService';
import { getDocumentPreviewType, downloadDocument } from '@/utils/documentUtils';
import useNotification from '@/utils/hooks/useNotification';
import { Attachment } from '../hooks/useEmailAttachments';

interface EmailAttachmentsSectionProps {
  attachments: Attachment[];
  isLoadingAttachments: boolean;
  leadAttachmentsData: any;
  formatFileSize: (bytes: number) => string;
  onDocumentSelect: (option: any) => void;
  onRemoveAttachment: (id: string) => void;
  onAttachClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EmailAttachmentsSection: React.FC<EmailAttachmentsSectionProps> = ({
  attachments,
  isLoadingAttachments,
  leadAttachmentsData,
  formatFileSize,
  onDocumentSelect,
  onRemoveAttachment,
  fileInputRef,
  onFileUpload,
}) => {
  const documentPreview = useDocumentPreview();
  const { openNotification } = useNotification();

  const handlePreview = useCallback(
    (attachment: Attachment) => {
      if (attachment.type === 'document' || attachment.type === 'library') {
        const previewType = getDocumentPreviewType(
          attachment.file?.type || '',
          attachment.name
        ) as 'pdf' | 'image' | 'other';
        documentPreview.openPreview(attachment.id, attachment.name, previewType);
      } else if (attachment.file?.size) {
        const url = URL.createObjectURL(attachment.file);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    },
    [documentPreview]
  );

  const handleDownload = useCallback(
    async (attachment: Attachment, e: React.MouseEvent) => {
      e?.stopPropagation();
      try {
        if (attachment.type === 'document' || attachment.type === 'library') {
          const blob = await apiFetchDocument(attachment.id);
          const contentType = blob.type || attachment.file?.type || 'application/octet-stream';
          downloadDocument(blob, attachment.name, contentType);
        } else if (attachment.file?.size) {
          downloadDocument(
            attachment.file,
            attachment.name,
            attachment.file.type || 'application/octet-stream'
          );
        }
      } catch {
        openNotification({ type: 'danger', massage: 'Failed to download document' });
      }
    },
    [openNotification]
  );

  return (
    <div className="w-full">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-2 text-xs">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs uppercase tracking-wide font-medium text-slate-500">
              Select Documents:
            </label>
            <span className="shrink-0 text-xs text-slate-400">
              {leadAttachmentsData?.data?.attachments?.length || 0} available
            </span>
          </div>
          <Select
            classNamePrefix="react-select"
            placeholder="Select a document"
            menuPlacement="top"

            isDisabled={isLoadingAttachments}
            isClearable
            onChange={onDocumentSelect}
            options={
              leadAttachmentsData?.data?.attachments?.map((attachment: any) => ({
                value: attachment?.id,
                label: `${attachment?.filename} (${formatFileSize(attachment?.size)})`,
              })) || []
            }
          />
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="mt-2 rounded-xl border border-gray-100  shadow-xs bg-gray-50/50">
          <div className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            {attachments.length} file(s) attached
          </div>
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((attachment) => (
              <FileDocumentCard
                key={attachment.id}
                filename={attachment.name}
                mimeType={attachment.file?.type || 'application/octet-stream'}
                variant="row"
                className="shrink-0 max-w-60 truncate"
                onClick={(e) => {
                  e?.stopPropagation();
                  handlePreview(attachment);
                }}
                actions={
                  <div className="flex items-center gap-0.5 -mr-1">
                    <Button
                      variant="plain"
                      size="xs"
                      title="Preview"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(attachment);
                      }}
                      className="text-gray-500 hover:text-blue-600 hover:bg-gray-50 hover:scale-105"
                      aria-label={`Preview ${attachment.name}`}
                    >
                      <ApolloIcon name="eye-filled" className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="plain"
                      size="xs"
                      title="Download"
                      onClick={(e) => handleDownload(attachment, e)}
                      className="text-gray-500 hover:text-emerald-600 hover:bg-transparent"
                      aria-label={`Download ${attachment.name}`}
                    >
                      <ApolloIcon name="download" className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="plain"
                      size="xs"
                      title="Remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveAttachment(attachment.id);
                      }}
                      className="text-gray-500 hover:text-red-500 hover:bg-transparent"
                      aria-label={`Remove ${attachment.name}`}
                    >
                      <ApolloIcon name="trash" className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={onFileUpload} className="hidden" multiple />

      <DocumentPreviewDialog {...documentPreview.dialogProps} />
    </div>
  );
};
