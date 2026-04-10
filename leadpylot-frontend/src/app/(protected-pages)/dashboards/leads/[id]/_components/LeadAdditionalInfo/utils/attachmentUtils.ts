import { Attachment } from '../hooks/useEmailAttachments';

/**
 * Extract document attachment IDs from attachments array
 */
export const extractDocumentAttachmentIds = (attachments: Attachment[]): string[] => {
  return attachments
    .filter((attachment) => attachment?.type && attachment?.id)
    .map((attachment) => attachment.id);
};

/**
 * Extract file attachments (non-document attachments) from attachments array
 */
export const extractFileAttachments = (attachments: Attachment[]): File[] => {
  return attachments
    .filter((attachment) => !attachment?.type)
    .map((attachment) => attachment.file)
    .filter((file): file is File => file instanceof File);
};

