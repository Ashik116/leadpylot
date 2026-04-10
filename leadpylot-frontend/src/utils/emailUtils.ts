/**
 * Utility functions for Gmail-style email components
 */

/**
 * Generate consistent background colors for email avatars
 */
export const getBackgroundColor = (name: string): string => {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500'
  ];

  // Generate consistent color based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

/**
 * Get initials from a name or email
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';

  const clean = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '');
  const source = name.includes('@') ? name.split('@')[0] : name;
  const parts = source.split(/[.\s_-]+/).map(clean).filter(Boolean);

  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return '?';
};

/**
 * Format email address for display
 */
export const formatEmailAddress = (email: string, name?: string): string => {
  if (!email) return '';

  if (name && name !== email) {
    return `${name} <${email}>`;
  }

  return email;
};

/**
 * Extract domain from email address
 */
export const extractDomain = (email: string): string => {
  if (!email || !email.includes('@')) return '';
  return email.split('@')[1];
};

/**
 * Check if email is from a known provider
 */
export const isKnownProvider = (email: string): boolean => {
  const knownProviders = [
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'protonmail.com'
  ];

  const domain = extractDomain(email);
  return knownProviders.includes(domain);
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Get file type icon name based on file extension or mime type
 */
export const getFileTypeIcon = (filename: string, mimeType?: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension) || mimeType?.startsWith('image/')) {
    return 'picture';
  }

  // Document files
  if (['pdf'].includes(extension) || mimeType === 'application/pdf') {
    return 'document';
  }

  if (['doc', 'docx'].includes(extension) || mimeType?.includes('word')) {
    return 'document';
  }

  if (['xls', 'xlsx'].includes(extension) || mimeType?.includes('sheet')) {
    return 'table';
  }

  if (['ppt', 'pptx'].includes(extension) || mimeType?.includes('presentation')) {
    return 'presentation';
  }

  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
    return 'archive';
  }

  // Text files
  if (['txt', 'md', 'json', 'xml', 'csv'].includes(extension)) {
    return 'text';
  }

  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'cpp'].includes(extension)) {
    return 'code';
  }

  // Default
  return 'attachment';
};

/**
 * Check if file is an image that can be previewed
 */
export const isPreviewableImage = (filename: string, mimeType?: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

  return imageExtensions.includes(extension) || (mimeType?.startsWith('image/') ?? false);
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Download a file from a URL or blob
 */
export const downloadFile = (url: string | Blob, filename: string): void => {
  try {
    const link = document.createElement('a');

    if (url instanceof Blob) {
      // Handle blob downloads
      const blobUrl = URL.createObjectURL(url);
      link.href = blobUrl;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    } else {
      // Handle URL downloads
      link.href = url;
      link.download = filename;
      link.target = '_blank';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    console.error('Failed to download file:', error);
    // Fallback: open in new tab
    window.open(url instanceof Blob ? URL.createObjectURL(url) : url, '_blank');
  }
};