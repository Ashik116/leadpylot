/**
 * Determine file type for DocumentPreviewDialog based on filename or MIME type
 */
export const getFileType = (filename: string, mimeType?: string): 'pdf' | 'image' | 'other' => {
  // Check MIME type first if available
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
  }

  // Check file extension
  const extension = filename.toLowerCase().split('.').pop();

  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif'];
  const pdfExtensions = ['pdf'];

  if (extension && imageExtensions.includes(extension)) return 'image';
  if (extension && pdfExtensions.includes(extension)) return 'pdf';

  return 'other';
};

/**
 * Get a user-friendly file type name
 */
export const getFileTypeName = (filename: string, mimeType?: string): string => {
  const type = getFileType(filename, mimeType);

  const typeNames: Record<string, string> = {
    pdf: 'PDF Document',
    image: 'Image',
    other: 'Document',
  };

  return typeNames[type];
};

/**
 * Get appropriate icon name for file type
 */
export const getFileIcon = (filename: string, mimeType?: string): string => {
  const type = getFileType(filename, mimeType);

  const iconNames: Record<string, string> = {
    pdf: 'file-pdf',
    image: 'image',
    other: 'file',
  };

  return iconNames[type];
};
