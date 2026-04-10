import { isDev } from "./utils";

/**
 * Determine the preview type based on content type or file extension
 * @param contentType MIME type of the file
 * @param filename Optional filename to extract extension
 * @returns Preview type: 'image', 'pdf', or 'other'
 */
export const getDocumentPreviewType = (contentType: string, filename?: string): string => {
  // Clean up content type
  const cleanContentType = contentType?.toLowerCase().trim() || '';

  // Check content type first - more reliable for PDFs
  if (cleanContentType === 'application/pdf') return 'pdf';


  if (cleanContentType.startsWith('image/')) return 'image';


  // Check filename extension - important fallback
  if (filename) {
    const extension = filename.toLowerCase().split('.').pop();

    if (extension === 'pdf') return 'pdf';


    if (
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif'].includes(extension || '')
    ) {
      return 'image';
    }
  }

  // For unknown content types, check if filename suggests it's a PDF
  if (
    (!cleanContentType ||
      cleanContentType === 'application/octet-stream' ||
      cleanContentType === 'binary/octet-stream') &&
    filename?.toLowerCase().endsWith('.pdf')
  ) {
    isDev && console.log('Detected as PDF from filename fallback');
    return 'pdf';
  }

  isDev && console.log('Detected as other file type');
  return 'other';
};

/**
 * Format file size in human readable format
 * @param bytes File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Get a friendly name for document types
 * @param documentType Document type from the API
 * @returns Friendly display name
 */
export const getDocumentTypeName = (documentType: string): string => {
  const typeNames: Record<string, string> = {
    contract: 'Contract',
    id: 'ID Document',
    extra: 'Additional Document',
  };

  return typeNames[documentType] || 'Document';
};

/**
 * Find contract documents from opening files
 * @param files Array of opening files
 * @returns Array of contract documents
 */
export const findContractDocuments = (files: any[]): any[] => {
  // Filter files that might be contracts based on filename or document type
  const contractFiles = files.filter((file) => {
    // Check if there's a documentType field (this may vary based on API implementation)
    if (file.documentType === 'contract') {
      return true;
    }

    // Check filename for contract-related keywords
    const filename = file.document?.filename?.toLowerCase() || '';
    const contractKeywords = ['contract', 'agreement', 'deal', 'offer'];
    return contractKeywords.some((keyword) => filename.includes(keyword));
  });

  // If no specific contract files found, return empty array
  // The calling code will fall back to showing the first file
  return contractFiles;
};

/**
 * Download a document blob with proper filename
 * @param blob Document blob
 * @param filename Original filename
 * @param contentType MIME type
 */
export const downloadDocument = (blob: Blob, filename: string, contentType: string): void => {
  try {
    // Ensure proper file extension
    let finalFilename = filename;
    if (!finalFilename.includes('.')) {
      const extension = getFileExtensionFromContentType(contentType);
      if (extension) {
        finalFilename = `${finalFilename}.${extension}`;
      }
    }

    // Use direct download method
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = finalFilename;

    // Add to DOM, click, and remove
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
};

/**
 * Get file extension from content type
 * @param contentType MIME type of the file
 * @returns File extension without the dot
 */
export const getFileExtensionFromContentType = (contentType: string): string => {
  const types: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/msword': 'doc',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.ms-powerpoint': 'ppt',
    'text/plain': 'txt',
    'text/html': 'html',
    'text/css': 'css',
    'text/javascript': 'js',
    'text/csv': 'csv',
    'application/json': 'json',
    'application/xml': 'xml',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/x-7z-compressed': '7z',
  };

  return types[contentType] || '';
};
