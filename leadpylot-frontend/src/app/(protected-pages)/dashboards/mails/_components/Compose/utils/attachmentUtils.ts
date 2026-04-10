import { Attachment } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/hooks/useEmailAttachments';

/**
 * Extract document attachment IDs from attachments array
 */
export const extractAttachmentIds = (attachments: Attachment[]): string[] => {
  return attachments
    .filter((attachment) => attachment?.type === 'document' && attachment?.id)
    .map((attachment) => attachment.id);
};

