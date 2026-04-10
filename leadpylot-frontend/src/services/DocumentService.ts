import { isDev } from '@/utils/utils';
import ApiService from './ApiService';

export interface DocumentResponse {
  data: Blob;
  contentType: string;
}

/**
 * Fetch a document with authentication
 * @param documentId The ID of the document to fetch
 * @returns A promise that resolves to the document blob
 */
export async function apiFetchDocument(documentId: string) {

  try {
    const response = await ApiService.fetchDataWithAxios<Blob>({
      url: `/attachments/${documentId}/view`,
      method: 'get',
      responseType: 'blob',
    });

    isDev &&
      console.log('Document fetch response:', {
        type: response.type,
        size: response.size,
        url: `/attachments/${documentId}/view`,
      });

    return response;
  } catch (error) {
    console.error('Error fetching document:', error);
    throw error;
  }
}

/**
 * Fetch documents from the library
 * @returns A promise that resolves to the documents and pagination info
 */
export async function apiFetchLibraryDocuments(params: any) {
  const isArchived = params.library_status === 'archived';
  try {
    const response: any = await ApiService.fetchDataWithAxios({
      url: `/attachments/library${isArchived ? '/archived' : ''}`,
      method: 'get',
      params: {
        page: params.page || 1,
        limit: params.pageSize || params.limit,
        search: params.search || '',
        library_status: isArchived ? undefined : params.library_status,
      },
    });

    // Map the API response to the frontend Document type
    if (response.data && response.data.documents) {
      const mappedDocuments = response.data.documents.map((doc: any) => ({
        _id: doc._id,
        filename: doc.filename,
        filetype: doc.filetype,
        size: doc.size,
        type: doc.type,
        source: doc.uploader_id?.login || 'Unknown',
        uploadedAt: doc.createdAt,
        library_status: doc.library_status,
        assignments: doc.assignments,
        assignment_history: doc.assignment_history,
      }));

      return {
        ...response,
        data: {
          ...response?.data,
          documents: mappedDocuments,
        },
        meta: response?.data?.pagination,
        documents: mappedDocuments,
      };
    }

    return response;
  } catch (error) {
    console.error('Error fetching library documents:', error);
    throw error;
  }
}

/**
 * Upload documents to the library
 * @param files Array of File objects to upload
 * @param type Document type (optional, defaults to 'extra')
 * @param tags Array of tags (optional)
 * @param notes Notes string (optional)
 * @returns A promise that resolves to the upload response
 */
export async function apiUploadLibraryDocuments(
  files: File[],
  type: string = 'extra',
  tags: string[] = [],
  notes: string = '',
  isPublic?: boolean
) {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  // Add document type
  formData.append('type', type);
  if (isPublic) {
    formData.append('is_public', 'true');
  }
  // Add tags if provided
  tags.forEach((tag) => {
    formData.append('tags', tag);
  });

  // Add notes if provided
  if (notes) {
    formData.append('notes', notes);
  }

  try {
    const response = await ApiService.fetchDataWithAxios({
      url: '/attachments/library/upload',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.error('Error uploading library documents:', error);
    throw error;
  }
}

/**
 * Assign documents to an offer
 * @param documentIds Array of document IDs to assign
 * @param offerId The offer ID to assign documents to
 * @param type The document type
 * @returns A promise that resolves to the assignment response
 */
export async function apiAssignDocumentsToOffer(
  documentIds: string[],
  offerId: string,
  type: string
) {
  try {
    const response = await ApiService.fetchDataWithAxios({
      url: '/attachments/assign/offer',
      method: 'post',
      data: {
        document_ids: documentIds,
        offer_id: offerId,
        type: type,
      },
    });
    return response;
  } catch (error) {
    console.error('Error assigning documents to offer:', error);
    throw error;
  }
}

/**
 * Assign documents to a lead
 * @param documentIds Array of document IDs to assign
 * @param leadIdentifier The lead identifier to assign documents to
 * @returns A promise that resolves to the assignment response
 */
export async function apiAssignDocumentsToLead(documentIds: string[], leadIdentifier: string) {
  try {
    const response = await ApiService.fetchDataWithAxios({
      url: '/attachments/assign/lead',
      method: 'post',
      data: {
        document_ids: documentIds,
        lead_identifier: leadIdentifier,
      },
    });
    return response;
  } catch (error) {
    console.error('Error assigning documents to lead:', error);
    throw error;
  }
}

export async function apiBulkDeleteLibraryDocuments(data: {
  ids: string[];
  unassign: boolean;
  permanent?: boolean;
}) {
  return ApiService.fetchDataWithAxios({
    url: `/attachments/library/bulk?${data.unassign ? 'unassign=true' : ''}${data.permanent ? '&permanent=true' : ''
      }`,
    method: 'delete',
    data,
  });
}

export async function apiRestoreLibraryDocuments(ids: string[]) {
  return ApiService.fetchDataWithAxios({
    url: `/attachments/library/restore/bulk`,
    method: 'post',
    data: { ids },
  });
}

/**
 * Bulk download documents as a zip file
 * @param ids Array of document IDs to download
 * @param columnName Optional column name for filename (e.g. "email", "offer") - sanitized for safe filename
 * @returns Promise that resolves when download is triggered (creates blob and triggers browser download)
 */
export async function apiBulkDownloadDocuments(
  ids: string[],
  columnName?: string
): Promise<void> {
  if (!ids?.length) return;

  const AxiosBase = (await import('./axios/AxiosBase')).default;
  const response = await AxiosBase.post('/attachments/bulk-download', { ids }, { responseType: 'blob' });

  const safeColumn = columnName
    ? `-${columnName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
    : '';
  const filename = `documents${safeColumn}-${Date.now()}.zip`;

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
