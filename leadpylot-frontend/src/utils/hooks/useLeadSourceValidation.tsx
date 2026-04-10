import { useMemo } from 'react';

interface UseLeadSourceValidationProps {
  leads: any[];
  selectedLeadIds: string[];
}

export const useLeadSourceValidation = ({
  leads,
  selectedLeadIds,
}: UseLeadSourceValidationProps) => {
  const selectedLeads = useMemo(() => {
    return leads.filter((lead) => selectedLeadIds.includes(lead._id));
  }, [leads, selectedLeadIds]);

  const uniqueSourceIds = useMemo(() => {
    return [...new Set(selectedLeads.map((lead) => lead.source_id))];
  }, [selectedLeads]);

  const isSameSource = uniqueSourceIds.length === 1;

  // Get price from the first selected lead if all are from same source
  const sourceLeadPrice = isSameSource ? leads[0]?.leadPrice || null : null;

  return {
    isSameSource, // true if all selected leads have same source
    sourceLeadPrice, // price from lead[0] if valid
    selectedLeads, // full selected lead objects
  };
};
