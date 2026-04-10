import { useQuery } from '@tanstack/react-query';
import { apiGetAttachmentsByLead } from '../../notifications/NotificationsService';

export interface LeadAttachment {
  id: string;
  filename: string;
  filetype: string;
  size: number;
  type: string;
  source: string;
  uploadedAt: string;
  metadata: {
    openingId?: string;
    offerId?: string;
  };
}

export interface LeadAttachmentsResponse {
  status: string;
  data: {
    leadId: string;
    attachments: LeadAttachment[];
    summary: {
      total: number;
      byType: Record<string, number>;
      bySource: Record<string, number>;
      totalSize: number;
    };
  };
}

/**
 * Hook to fetch attachments for a specific lead
 */
export const useLeadAttachments = (leadId?: string) => {
  return useQuery<LeadAttachmentsResponse>({
    queryKey: ['leadAttachments', leadId],
    queryFn: async () => {
      if (!leadId) {
        throw new Error('No lead ID provided');
      }
      
      const response = await apiGetAttachmentsByLead(leadId);
      return response;
    },
    enabled: !!leadId,
  });
};
