import { apiUploadLibraryDocuments } from '@/services/DocumentService';
import { Attachment } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/hooks/useEmailAttachments';

const DOCUMENT_TYPE = 'email';
const DOCUMENT_TAGS = ['email', 'attachment'];
const DOCUMENT_DESCRIPTION = 'Email draft attachment';

/**
 * Extract document IDs from upload response
 */
export const extractDocumentIds = (uploadResponse: any): string[] => {
  const successful = uploadResponse?.data?.successful;
  if (Array.isArray(successful) && successful.length > 0) {
    return successful
      .map((item: any) => item.documentId || item._id || item.id)
      .filter((id: string) => id);
  }
  if (uploadResponse?.data?.data) {
    const d = uploadResponse.data.data;
    if (d._id) return [d._id];
    if (Array.isArray(d)) {
      return d.map((doc: any) => doc._id || doc.id || doc.documentId).filter((id: string) => id);
    }
  }
  if (uploadResponse?.data?._id) return [uploadResponse.data._id];
  return [];
};

/**
 * Upload files to document library and return document IDs
 */
export const uploadFilesToLibrary = async (
  files: File[]
): Promise<{ documentIds: string[]; error?: string }> => {
  try {
    const uploadResponse = await apiUploadLibraryDocuments(
      files,
      DOCUMENT_TYPE,
      DOCUMENT_TAGS,
      DOCUMENT_DESCRIPTION
    );

    const documentIds = extractDocumentIds(uploadResponse);
    return { documentIds };
  } catch (error: any) {
    return {
      documentIds: [],
      error: error?.message || error?.response?.data?.message || 'Failed to upload files',
    };
  }
};

/**
 * Create attachment objects from files and document IDs
 */
export const createAttachmentsFromFiles = (
  files: File[],
  documentIds: string[],
  formatFileSize: (size: number) => string
): Attachment[] => {
  const attachments: Attachment[] = [];

  files.forEach((file, index) => {
    const documentId = documentIds[index];
    if (documentId) {
      attachments.push({
        id: documentId,
        file,
        name: file.name,
        size: formatFileSize(file.size),
        type: 'document' as const,
      });
    }
  });

  return attachments;
};
