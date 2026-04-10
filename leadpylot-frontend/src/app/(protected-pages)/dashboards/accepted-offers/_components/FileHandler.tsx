import RoleGuard from '@/components/shared/RoleGuard';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';






























import { Role } from '@/configs/navigation.config/auth.route.config';
import React, { useRef } from 'react';
import { DOCUMENT_TYPES } from '@/components/shared/DocumentTypeOptions';

export const ActionCell = React.memo<{
  icon: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}>(({ icon, onClick, children, className }) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      e.preventDefault();
    }}
    data-no-navigate="true"
  >
    <Button
      icon={<ApolloIcon name={icon as any} className="text-md" />}
      className={`gap-2 ${className}`}
      size="xs"
      onClick={onClick}
    >
      {children}
    </Button>
  </div>
));
ActionCell.displayName = 'ActionCell';

type TFileHandlerProps = {
  ObjectData?: any;
  id?: string;
  section?: any;
  offerId?: string;
  table?: string;
  type: string;
  multiple?: boolean;
  headerInfo?: { column: string; leadName: string; table: string };
  isFileUploading?: (id: string, documentType: string, table: string) => boolean; // Add loading state prop
  columnId?: string;
  selectedItems?: any[];
  onBulkDownload?: (columnId: string) => void;
  handleDocumentAction: (
    confirmation: any,
    documentType: string,
    action: 'preview' | 'download' | 'delete'
  ) => void;
  handleFileUpload: (
    id: string,
    files: any[],
    table?: string,
    type?: string,
    fullItem?: any
  ) => void;
};

const FILE_UPLOAD_CONFIG = {
  accept: '.pdf,.doc,.docx,.png,.jpg,.jpeg',
} as const;

// File type mapping based on table names
// This mapping ensures that each table only uses its appropriate file types:
// - offers: offer-contract, offer-extra
// - openings: opening-contract, opening-id, opening-extra
// - confirmations: confirmation-contract, confirmation-extra
// - payment-vouchers: payment-contract, payment-extra
const FILE_TYPE_MAPPING = {
  offers: [DOCUMENT_TYPES.OFFER_CONTRACT, DOCUMENT_TYPES.OFFER_EXTRA],
  openings: [
    DOCUMENT_TYPES.OPENING_CONTRACT,
    DOCUMENT_TYPES.OPENING_ID,
    DOCUMENT_TYPES.OPENING_EXTRA,
  ],
  confirmations: [DOCUMENT_TYPES.CONFIRMATION_CONTRACT, DOCUMENT_TYPES.CONFIRMATION_EXTRA],
  paymentVouchers: [DOCUMENT_TYPES.PAYMENT_CONTRACT, DOCUMENT_TYPES.PAYMENT_EXTRA],
} as const;

/**
 * Get file types based on table name
 * @param tableName - The table name (offers, openings, confirmations, payment-vouchers)
 * @param fileType - Optional specific file type (contract, extra, id)
 * @returns Array of available file types for the table
 *
 * @example
 * getFileTypesByTable('offers') // Returns: ['offer-contract', 'offer-extra']
 * getFileTypesByTable('openings', 'contract') // Returns: ['opening-contract']
 * getFileTypesByTable('openings', 'id') // Returns: ['opening-id']
 */
const getFileTypesByTable = (tableName?: string, fileType?: string): string[] => {
  if (!tableName) return [];

  // Normalize table name to handle different variations
  const normalizeTableName = (tableName: string): keyof typeof FILE_TYPE_MAPPING => {
    const normalized = tableName.toLowerCase();
    // Handle different variations of payment vouchers
    if (
      normalized === 'paymentvouchers' ||
      normalized === 'payment_vouchers' ||
      normalized === 'payment-vouchers'
    ) {
      return 'paymentVouchers';
    }
    return normalized as keyof typeof FILE_TYPE_MAPPING;
  };

  const tableKey = normalizeTableName(tableName);
  const availableTypes = FILE_TYPE_MAPPING[tableKey] || [];

  if (fileType) {
    // Filter by specific file type if provided
    return availableTypes.filter((type) => type.includes(fileType));
  }

  return [...availableTypes];
};

/**
 * Get the appropriate file type based on table and context
 * @param table - Table name
 * @param type - Current type
 * @param fileType - Optional specific file type
 * @returns The appropriate file type string
 *
 * @example
 * getDocumentType('offers', 'contract') // Returns: 'offer-contract'
 * getDocumentType('openings', 'id') // Returns: 'opening-id'
 * getDocumentType('confirmations', 'extra') // Returns: 'confirmation-extra'
 */
const getDocumentType = (table?: string, type?: string, fileType?: string): string => {
  if (!table) return type || 'contract';

  // Normalize table name to handle different variations
  const normalizeTableName = (tableName: string): keyof typeof FILE_TYPE_MAPPING => {
    const normalized = tableName.toLowerCase();
    // Handle different variations of payment vouchers
    if (
      normalized === 'paymentvouchers' ||
      normalized === 'payment_vouchers' ||
      normalized === 'payment-vouchers'
    ) {
      return 'paymentVouchers';
    }
    return normalized as keyof typeof FILE_TYPE_MAPPING;
  };

  const tableKey = normalizeTableName(table);
  const availableTypes = FILE_TYPE_MAPPING[tableKey] || [];

  if (fileType) {
    // Find the matching type that includes the fileType
    const matchingType = availableTypes.find((t) => t.includes(fileType));
    return matchingType || availableTypes[0] || type || 'contract';
  }

  // If the type is already a full document type (like 'offer-email', 'offer-contract'), return it as is
  if (type && type.includes('-')) {
    return type;
  }

  // Default to first available type for the table
  return availableTypes[0] || type || 'contract';
};

export const FileHandler = React.memo<TFileHandlerProps>(
  ({
    section,
    offerId,
    table,
    type,
    handleDocumentAction,
    handleFileUpload,
    multiple = false,
    isFileUploading,
    columnId,
    selectedItems = [],
    onBulkDownload,
  }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const documentType = getDocumentType(table, type);

    const isLoading =
      typeof isFileUploading === 'function'
        ? isFileUploading(offerId || '', documentType, table || '')
        : isFileUploading || false;

    const handleUploadButtonClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      fileInputRef.current?.click();
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const fileArray = Array.from(files);
        handleFileUpload(offerId || '', fileArray, table, documentType);
      }
      e.target.value = '';
    };

    const documentActionItem = section ? { ...section, offerId } : null;

    return (
      <div
        className="flex items-center justify-start"
        onClick={(e) => {
          e.stopPropagation();
        }}
        data-no-navigate="true"
      >
        {section?._id ? (
          <div className="flex items-center gap-1">
            <RoleGuard role={Role.AGENT}>
              <Button
                variant="plain"
                size="xs"
                title="Preview"
                icon={<ApolloIcon name="eye-filled" className="text-sm text-blue-600" />}
                className="gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  if (documentActionItem) {
                    handleDocumentAction(documentActionItem, documentType, 'preview');
                  }
                }}
              >
                view
              </Button>
            </RoleGuard>
            <RoleGuard>
              <Button
                variant="plain"
                size="xs"
                title="Preview"
                icon={<ApolloIcon name="eye-filled" className="text-sm text-blue-600" />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (documentActionItem) {
                    handleDocumentAction(documentActionItem, documentType, 'preview');
                  }
                }}
              />
              <Button
                variant="plain"
                size="xs"
                title="Download"
                icon={<ApolloIcon name="download" className="text-sm text-emerald-500" />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedItems?.length > 0 && columnId && onBulkDownload) {
                    onBulkDownload(columnId);
                  } else if (documentActionItem) {
                    handleDocumentAction(documentActionItem, documentType, 'download');
                  }
                }}
              />
              <Button
                variant="plain"
                size="xs"
                title="Delete"
                icon={<ApolloIcon name="trash" className="text-sm text-red-500" />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (documentActionItem) {
                    handleDocumentAction(documentActionItem, documentType, 'delete');
                  }
                }}
              />
            </RoleGuard>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              asElement="div"
              size="xs"
              variant="secondary"
              loading={isLoading}
              onClick={handleUploadButtonClick}
              icon={<ApolloIcon name="upload" className="text-sm" />}
              className="cursor-pointer"
            >
              <span className="font-bold text-[13px]">Upload</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_UPLOAD_CONFIG.accept}
              multiple={multiple}
              className="hidden"
              onClick={(e) => e.stopPropagation()}
              onChange={handleFileInputChange}
            />
          </div>
        )}
      </div>
    );
  }
);
FileHandler.displayName = 'FileHandler';

// Export the utility functions for use in other components
export { getFileTypesByTable, getDocumentType };
