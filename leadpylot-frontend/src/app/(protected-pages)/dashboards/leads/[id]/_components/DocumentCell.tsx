import React from 'react';
import Button from '@/components/ui/Button';
import RoleGuard from '@/components/shared/RoleGuard';
import FileUploaderDialog from '@/components/ui/Upload/FileUploaderDialog';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import type { Attachment } from './hooks/useDocumentActions';

interface DocumentCellProps {
  attachment?: Attachment;
  documentType: string;
  sectionLabel: string;
  columnLabel: string;
  isUploading: boolean;
  onPreview: (attachment: Attachment) => void;
  onDownload: (attachment: Attachment) => void;
  onUpload: (files: File[], documentType: string) => void;
  onDelete?: () => void;
}

const FILE_UPLOAD_CONFIG = {
  accept: '.pdf,.doc,.docx,.png,.jpg,.jpeg',
  supportPlaceholder: 'Support: PDF, DOC, DOCX, PNG, JPG, JPEG',
} as const;

export const DocumentCell: React.FC<DocumentCellProps> = ({
  attachment,
  documentType,
  sectionLabel,
  columnLabel,
  isUploading,
  onPreview,
  onDownload,
  onUpload,
  onDelete,
}) => {
  if (attachment) {
    // Document exists - show View/Download actions
    return (
      <div className="flex gap-1">
        <RoleGuard role={Role?.AGENT}>
          <Button
            icon={<ApolloIcon name="eye-filled" />}
            className="gap-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(attachment);
            }}
          >
            View
          </Button>
          {onDelete && (
            <Button
              icon={<ApolloIcon name="trash" />}
              className="gap-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete"
            >
              Delete
            </Button>
          )}
        </RoleGuard>

        <RoleGuard role={Role?.ADMIN}>
          <div className="flex items-center gap-1">
            <Button
              variant="plain"
              size="xs"
              className="h-8 w-8 p-0 hover:bg-blue-50"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(attachment);
              }}
              title="Preview"
              icon={<ApolloIcon name="eye-filled" className="h-4 w-4" />}
            ></Button>
            <Button
              variant="plain"
              size="xs"
              className="h-8 w-8 p-0 hover:bg-green-50"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(attachment);
              }}
              icon={<ApolloIcon name="download" className="h-4 w-4 text-green-600" />}
            ></Button>
            {onDelete && (
              <Button
                variant="plain"
                size="xs"
                className="h-8 w-8 p-0 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Delete"
                icon={<ApolloIcon name="trash" className="h-4 w-4 text-red-600" />}
              ></Button>
            )}
          </div>
        </RoleGuard>
      </div>
    );
  }

  // No document - show Upload button
  return (
    <div className="flex h-10 items-center">
      <FileUploaderDialog
        title={`Upload ${sectionLabel} ${columnLabel}`}
        onClose={() => {}}
        accept={FILE_UPLOAD_CONFIG?.accept}
        supportPlaceholder={FILE_UPLOAD_CONFIG?.supportPlaceholder}
        loading={isUploading}
        uploadButtonProps={{
          loading: isUploading,
        }}
        onUpload={(files) => {
          if (files) {
            const fileArray = Array.isArray(files) ? files : [files];
            onUpload(fileArray, documentType);
          }
        }}
      />
    </div>
  );
};

export default DocumentCell;
