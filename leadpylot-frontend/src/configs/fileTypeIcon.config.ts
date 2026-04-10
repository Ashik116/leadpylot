export type FileTypeCategory = 'pdf' | 'image' | 'other';

/**
 * Get file type category based on filename and/or MIME type
 * Used to select icon: pdf -> PdfIcon, image -> ImageIcon, other -> OthersFileIcon
 */
export function getFileTypeIcon(
  filename?: string,
  mimeType?: string
): FileTypeCategory {
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'pdf') return 'pdf';
    if (
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif'].includes(
        ext || ''
      )
    )
      return 'image';
  }
  const cleanMime = mimeType?.toLowerCase().trim() || '';
  if (cleanMime === 'application/pdf') return 'pdf';
  if (cleanMime.startsWith('image/')) return 'image';
  return 'other';
}

/**
 * Alias for consistency (same as getFileTypeIcon)
 */
export function getFileTypeCategory(
  filename?: string,
  mimeType?: string
): FileTypeCategory {
  return getFileTypeIcon(filename, mimeType);
}

const FILE_TYPE_COLORS: Record<FileTypeCategory, string> = {
  pdf: 'text-red-500',
  image: 'text-blue-500',
  other: 'text-gray-500',
};

/**
 * Get Tailwind text color class for file type icon
 */
export function getFileTypeColor(
  filename?: string,
  mimeType?: string
): string {
  return FILE_TYPE_COLORS[getFileTypeIcon(filename, mimeType)];
}
