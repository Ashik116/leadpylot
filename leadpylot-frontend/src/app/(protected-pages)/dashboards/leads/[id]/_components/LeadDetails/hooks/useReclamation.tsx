import { useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useQueryClient } from '@tanstack/react-query';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { apiSubmitReclamation } from '@/services/LeadsService';
import { isDev } from '@/utils/utils';
import { invalidateGroupedLeadQueries } from '@/utils/queryInvalidation';

interface UseReclamationProps {
  leadId: string;
  projectId?: string;
  agentId?: string;
  invalidateQueries?: string[];
}

export const useReclamation = ({
  leadId,
  projectId,
  agentId,
  invalidateQueries,
}: UseReclamationProps) => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const isAdmin = session?.user?.role === 'Admin';

  const [isReclamationOpen, setIsReclamationOpen] = useState(false);
  const [isSubmittingReclamation, setIsSubmittingReclamation] = useState(false);
  const [reclamationReason, setReclamationReason] = useState('');

  const handleReclamationClick = () => {
    setIsReclamationOpen((prev) => !prev);
  };

  const handleReclamationSubmit = async () => {
    if (!reclamationReason.trim()) {
      toast.push(
        <Notification title="Error" type="danger">
          Please enter a reason for reclamation
        </Notification>
      );
      return;
    }

    setIsSubmittingReclamation(true);
    try {
      // Create the base payload with required fields
      const reclamationData: {
        reason: string;
        lead_id: string;
        project_id?: string;
        agent_id?: string | number;
      } = {
        reason: reclamationReason,
        lead_id: leadId,
      };

      // Only add project_id and agent_id if not admin or if they exist
      if (!isAdmin) {
        // For non-admin users, these fields are required
        if (projectId) reclamationData.project_id = projectId;
        if (agentId) reclamationData.agent_id = agentId;
      } else if (projectId) {
        // For admin users, only include these fields if they exist
        reclamationData.project_id = projectId;
        if (agentId) reclamationData.agent_id = agentId;
      }

      const response = await apiSubmitReclamation(reclamationData);

      // Validate API response
      if (response && response?.success !== false) {
        toast.push(
          <Notification title="Reclamation submitted" type="success">
            Reclamation submitted successfully
          </Notification>
        );
        isDev && console.log('invalidateQueries', invalidateQueries);
        
        // CRITICAL: Always invalidate basic leads queries
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
        queryClient.invalidateQueries({ queryKey: ['current-top-lead'] });
        queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
        
        // CRITICAL: Invalidate filtered leads queries (with filter parameters)
        // This ensures StatusFilter and DynamicFilters refresh when they use GET /leads API
        queryClient.invalidateQueries({
          predicate: (query) => {
            return Boolean(
              query.queryKey[0] === 'leads' &&
                query.queryKey.length > 1 &&
                query.queryKey[1] &&
                typeof query.queryKey[1] === 'object'
            );
          },
        });
        
        // CRITICAL: Always invalidate grouped leads queries (same as useUpdateLeadStatus)
        // This ensures GroupByFilter and GroupedLeadsTable refresh
        invalidateGroupedLeadQueries(queryClient);
        
        // Also invalidate custom queries if provided
        if (invalidateQueries) {
          queryClient.invalidateQueries({ queryKey: invalidateQueries });
        }

        // If there's project-specific data, invalidate that too
        if (projectId) {
          queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        }

        // CRITICAL: Refetch dynamic filters POST request if active (StatusFilter or DynamicFilters)
        // This ensures UI updates immediately when data comes from POST /dynamic-filters/apply
        // Same pattern as useUpdateLeadStatus
        const { useDynamicFiltersStore } = await import('@/stores/dynamicFiltersStore');
        const dynamicFiltersStore = useDynamicFiltersStore.getState();
        if (dynamicFiltersStore.isDynamicFilterMode && dynamicFiltersStore.refetchDynamicFilters) {
          await dynamicFiltersStore.refetchDynamicFilters(
            dynamicFiltersStore.page,
            dynamicFiltersStore.pageSize
          );
        }

        setIsReclamationOpen(false);
        setReclamationReason('');
      } else {
        // Handle case where API returns success: false or other error indicators
        throw new Error(response?.message || 'Reclamation submission failed');
      }
    } catch (error) {
      console.error('Reclamation submission error:', error);

      // Show more specific error message if available
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      toast.push(
        <Notification title="Error" type="danger">
          Failed to submit reclamation: {errorMessage}. Please try again.
        </Notification>
      );
    } finally {
      setIsSubmittingReclamation(false);
    }
  };

  const cancelReclamation = () => {
    setReclamationReason('');
    setIsReclamationOpen(false);
  };

  return {
    isReclamationOpen,
    setIsReclamationOpen,
    isSubmittingReclamation,
    reclamationReason,
    setReclamationReason,
    handleReclamationClick,
    handleReclamationSubmit,
    cancelReclamation,
  };
};
