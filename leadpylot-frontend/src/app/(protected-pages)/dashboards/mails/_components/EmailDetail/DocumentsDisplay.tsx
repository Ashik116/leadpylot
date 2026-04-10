'use client';

import React, { useMemo } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useDocumentHandler } from '@/hooks/useDocumentHandler';
import { getDocumentPreviewType } from '@/utils/documentUtils';

interface DocumentsDisplayProps {
  documents: any[];
  documentHandler?: ReturnType<typeof useDocumentHandler>;
}

// Predefined document categories to display
const DOCUMENT_CATEGORIES = [
  { type: 'payment-contract', label: 'PAYMENT CONTRACT' },
  { type: 'payment-email', label: 'PAYMENT EMAIL' },
  { type: 'opening-id', label: 'OPENING ID' },
  { type: 'offer-contract', label: 'OFFER CONTRACT' },
  { type: 'opening-email', label: 'OPENING EMAIL' },
  { type: 'confirmation-contract', label: 'CONFIRMATION CONTRACT' },
  { type: 'opening-contract', label: 'OPENING CONTRACT' },
];

const DocumentsDisplay: React.FC<DocumentsDisplayProps> = ({
  documents,
  documentHandler: providedHandler,
}) => {
  const defaultHandler = useDocumentHandler();
  const documentHandler = providedHandler || defaultHandler;

  // Create a map of documents by type with deduplication - store arrays of documents
  const documentsByType = useMemo(() => {
    const map = new Map<string, any[]>();
    const seenIds = new Set<string>();

    documents.forEach((doc) => {
      const document = doc?.document || doc;
      const docId = document?._id as string | undefined;
      const docType = document?.type || doc?.type;

      // Skip duplicates
      if (docId && seenIds.has(docId)) {
        return;
      }

      if (docId) {
        seenIds.add(docId);
      }

      if (docType) {
        if (!map.has(docType)) {
          map.set(docType, []);
        }
        map.get(docType)!.push(document);
      }
    });

    return map;
  }, [documents]);

  const handleView = (document: any) => {
    if (!document?._id) return;

    const fileType = document?.filetype || document?.type || 'application/octet-stream';
    const filename = document?.filename || 'Unknown file';
    const previewType = getDocumentPreviewType(fileType, filename);

    documentHandler.documentPreview.openPreview(
      document._id,
      filename,
      previewType as 'pdf' | 'image' | 'other'
    );
  };

  // Count total documents
  const totalDocuments = Array.from(documentsByType.values()).reduce(
    (sum, docs) => sum + docs.length,
    0
  );

  if (totalDocuments === 0) {
    return null;
  }

  return (
    <div>
      {/* Header with count */}
      <div className="mb-4">
        <h6 className="text-lg font-semibold text-gray-900">Documents ({totalDocuments})</h6>
      </div>

      {/* Document categories grid - Two column layout */}
      <div className="grid grid-cols-2 gap-4">
        {DOCUMENT_CATEGORIES.map((category) => {
          const documents = documentsByType.get(category.type) || [];
          const count = documents.length;
          const hasDocument = count > 0;
          const firstDocument = documents[0]; // Use first document for viewing

          return (
            <div key={category.type} className="space-y-2">
              {/* Category Label with count */}
              <div className="border-b border-gray-300 pb-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-600 uppercase">{category.label}</p>
                  {/* {count > 0 && (
                    <span className="text-xs font-medium text-gray-500">({count})</span>
                  )} */}
                </div>
              </div>

              {/* View Button */}
              <button
                onClick={() => hasDocument && handleView(firstDocument)}
                disabled={!hasDocument}
                className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors ${
                  hasDocument
                    ? 'cursor-pointer border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                }`}
                title={
                  hasDocument
                    ? count > 1
                      ? `View document (${count} available)`
                      : 'View document'
                    : 'No document available'
                }
              >
                <ApolloIcon name="eye-filled" className="text-sm" />
                <span>view</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentsDisplay;
