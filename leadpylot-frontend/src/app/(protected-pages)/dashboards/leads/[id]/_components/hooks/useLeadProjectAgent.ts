import { useMemo } from 'react';
import { TLead } from '@/services/LeadsService';

/**
 * Hook to check if lead has project and agent assigned
 */
export function useLeadProjectAgent(lead: TLead) {
  const hasProject = useMemo(
    () =>
      !!(
        (Array.isArray(lead?.project) && lead?.project?.length > 0 && lead?.project[0]?._id) ||
        (lead?.project && !Array.isArray(lead?.project) && (lead?.project as any)?._id)
      ),
    [lead?.project]
  );

  const hasAgent = useMemo(
    () =>
      !!(
        (Array.isArray(lead?.project) && lead?.project?.[0]?.agent?._id) ||
        (lead?.project && !Array.isArray(lead?.project) && (lead?.project as any)?.agent?._id)
      ),
    [lead?.project]
  );

  const isOfferDisabled = !hasProject || !hasAgent;

  return {
    hasProject,
    hasAgent,
    isOfferDisabled,
  };
}
