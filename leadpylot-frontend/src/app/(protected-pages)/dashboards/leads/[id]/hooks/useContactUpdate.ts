import { useCallback } from 'react';
import { useUpdateLead } from '@/services/hooks/useLeads';
import { Lead } from '@/services/LeadsService';

interface UseContactUpdateProps {
  leadId: string;
  onSuccess?: (updatedLead: Lead) => void;
  queryKey?: any;
}

export const useContactUpdate = ({ leadId, onSuccess }: UseContactUpdateProps) => {
  const { mutate: updateLead, isPending: isUpdating } = useUpdateLead(leadId);

  const updateContact = useCallback(
    async (updatedData: Partial<Lead>) => {
      if (!leadId) return;

      return new Promise<void>((resolve, reject) => {
        updateLead(updatedData, {
          onSuccess: (data) => {
            onSuccess?.(data);
            resolve();
          },
          onError: (error) => {
            console.error('Error updating contact:', error);
            reject(error);
          },
        });
      });
    },
    [leadId, updateLead, onSuccess]
  );

  return {
    updateContact,
    isUpdating,
  };
};
