import React, { useCallback, useMemo } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { FileHandler } from '../../../accepted-offers/_components/FileHandler';

interface DocumentsListSectionProps {
  files: any[];
  offerId: string;
  opening: any;
  lead: any;
  handleDocumentAction: (
    item: any,
    documentType: string,
    action: 'preview' | 'download' | 'delete'
  ) => void;
  handleFileUpload: (
    id: string,
    files: File[] | null,
    table?: string,
    fileType?: string,
    fullItem?: any
  ) => void;
}

export const DocumentsListSection: React.FC<DocumentsListSectionProps> = ({
  files,
  offerId,
  opening,
  lead,
  handleDocumentAction,
  handleFileUpload,
}) => {
  // Format document type for display (e.g., "opening-contract" -> "CONTRACT")
  const formatTypeDisplayName = useCallback((type: string): string => {
    if (!type) return '';
    // Extract the part after the dash
    const parts = type.split('-');
    if (parts.length > 1) {
      return parts[parts.length - 1].toUpperCase();
    }
    return type.toUpperCase();
  }, []);

  // Group files by document type - only include types that have files
  const filesByType = useMemo(() => {
    const grouped: Record<string, any[]> = {};

    // Group existing files by type
    files.forEach((file: any) => {
      const fileType = file?.type;
      if (fileType) {
        if (!grouped[fileType]) {
          grouped[fileType] = [];
        }
        grouped[fileType].push(file);
      }
    });

    return grouped;
  }, [files]);

  // Get only document types that have files
  const typesWithFiles = useMemo(() => {
    return Object.keys(filesByType).filter((type) => filesByType[type].length > 0);
  }, [filesByType]);

  return (
    <div className="col-span-2 mt-4">
      <div className="border-t pt-4">
        <h6 className="mb-3 text-sm font-semibold">
          Documents {files.length > 0 && `(${files.length})`}
        </h6>
        {typesWithFiles.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <ApolloIcon name="file" className="mx-auto mb-2 text-3xl text-gray-400" />
              <p className="text-sm text-gray-500">No documents available</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {typesWithFiles.map((docType) => {
              const typeFiles = filesByType[docType] || [];
              const displayName = formatTypeDisplayName(docType);
              return (
                <div key={docType} className="space-y-2">
                  {/* Type Header */}
                  <div className="border-b border-gray-300 pb-1">
                    <p className="text-xs uppercase">
                      {docType.replace('-', ' ') || 'Unknown type'}
                    </p>
                  </div>

                  {/* Files for this type */}
                  <div className="space-y-1">
                    {typeFiles.map((file: any) => (
                      <div key={file._id} className="flex items-center justify-between gap-2">
                        {typeFiles.length > 1 && (
                          <span
                            className="flex-1 truncate text-xs text-gray-600"
                            title={file?.filename}
                          >
                            {file?.filename || 'Unknown file'}
                          </span>
                        )}
                        <FileHandler
                          section={file}
                          offerId={offerId}
                          table="openings"
                          type={docType}
                          handleDocumentAction={handleDocumentAction}
                          handleFileUpload={(id, files, table, fileType) =>
                            handleFileUpload(id, files, table, fileType, opening)
                          }
                          headerInfo={{
                            column: displayName,
                            leadName: lead?.name || '',
                            table: 'opening',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
