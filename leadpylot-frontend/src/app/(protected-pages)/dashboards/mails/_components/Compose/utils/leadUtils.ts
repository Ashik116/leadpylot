import { Lead } from '@/services/LeadsService';

/**
 * Extended Lead type that includes offers and project details
 */
export interface LeadWithOffers extends Omit<Lead, 'project'> {
  offers?: Array<{
    _id: string;
    active: boolean;
    files?: Array<{
      _id?: string;
      type?: string;
      document?: {
        _id: string;
        filename: string;
        filetype?: string;
        size?: number;
        type?: string;
      };
    }>;
  }>;
  project?: Array<{
    _id: string;
    agent?: {
      _id: string;
    };
  }>;
}

/**
 * Extract project ID from lead
 */
export const getProjectId = (lead: LeadWithOffers | null): string => {
  if (!lead?.project) return '';
  // Handle both array and single object formats
  if (Array.isArray(lead.project)) {
    return lead.project[0]?._id || '';
  }
  return (lead.project as any)?._id || '';
};

/**
 * Extract agent ID from lead
 */
export const getAgentId = (lead: LeadWithOffers | null): string => {
  if (!lead?.project) return '';
  // Handle both array and single object formats
  if (Array.isArray(lead.project)) {
    return lead.project[0]?.agent?._id || '';
  }
  return (lead.project as any)?.agent?._id || '';
};

/**
 * Check if lead has active offers
 */
export const hasActiveOffers = (lead: LeadWithOffers | null): boolean => {
  if (!lead?.offers || !Array.isArray(lead.offers)) {
    return false;
  }
  return lead.offers.some((offer) => offer.active === true);
};

/**
 * Get active offers from lead
 */
export const getActiveOffers = (lead: LeadWithOffers | null) => {
  if (!lead?.offers || !Array.isArray(lead.offers)) {
    return [];
  }
  return lead.offers.filter((offer) => offer.active === true);
};
