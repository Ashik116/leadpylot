import { useState, useMemo } from 'react';
import { useSession } from '@/hooks/useSession';
import { useQueryClient } from '@tanstack/react-query';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { apiSubmitReclamation } from '@/services/LeadsService';
import { isDev } from '@/utils/utils';
import { useStages, useStagesLoading } from '@/stores/stagesStore';
import { z } from 'zod';
import { FieldDefinition } from '@/components/shared/form/types';
import { invalidateGroupedLeadQueries } from '@/utils/queryInvalidation';

// Define the schema for the reclamation form
const reclamationSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  notes: z.string().optional(),
});

export type ReclamationFormData = z.infer<typeof reclamationSchema>;

interface UseReclamationModalProps {
  leadId: string;
  projectId?: string;
  agentId?: string;
  invalidateQueries?: string[];
}

export const useReclamationModal = ({
  leadId,
  projectId,
  agentId,
  invalidateQueries,
}: UseReclamationModalProps) => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const isAdmin = session?.user?.role === 'Admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read stages from global store (already initialized in PostLoginLayout)
  const stages = useStages();
  const isLoadingStages = useStagesLoading();

  // Find the "Reklamation" stage and its statuses
  const reclamationStageData = useMemo(() => {
    const reklamationStage = stages?.find(
      (stage) =>
        stage?.name?.toLowerCase() === 'reklamation' || stage?.name?.toLowerCase() === 'reclamation'
    );

    if (!reklamationStage) {
      return { stage: null, statuses: [] };
    }

    const statuses =
      reklamationStage?.info?.statuses?.map((statusItem) => ({
        value: statusItem?._id || statusItem?.name,
        label: statusItem?.name,
      })) || [];

    return { stage: reklamationStage, statuses };
  }, [stages]);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (data: ReclamationFormData) => {
    setIsSubmitting(true);
    try {
      // Create the base payload with required fields
      const reclamationData: {
        reason: string;
        lead_id: string;
        project_id?: string;
        agent_id?: string | number;
        status?: string;
        notes?: string;
      } = {
        reason: data?.notes || 'Reclamation submitted', // Use notes as reason if provided
        lead_id: leadId,
        status: data?.status,
        notes: data?.notes,
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
      if (response && response.success !== false) {
        toast.push(
          <Notification title="Reclamation submitted" type="success">
            Reclamation submitted successfully
          </Notification>
        );
        
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

        closeModal();
      } else {
        // Handle case where API returns success: false or other error indicators
        throw new Error(response?.message || 'Reclamation submission failed');
      }
    } catch (error) {
      // Show more specific error message if available
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (isDev) {
        // eslint-disable-next-line no-console
        console.error('Reclamation submission error:', error);
      }

      toast.push(
        <Notification title="Error" type="danger">
          Failed to submit reclamation: {errorMessage}. Please try again.
        </Notification>
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Memoize field definitions for the form
  const fields = useMemo(
    (): FieldDefinition[] => [
      {
        name: 'status',
        label: 'Reclamation Status',
        type: 'select',
        placeholder: 'Select status',
        className: 'col-span-12',
        options: reclamationStageData?.statuses || [],
      },
      {
        name: 'notes',
        label: 'Notes (Optional)',
        type: 'textarea',
        placeholder: 'Add any additional notes...',
        className: 'col-span-12',
      },
    ],
    [reclamationStageData?.statuses]
  );

  return {
    isModalOpen,
    openModal,
    closeModal,
    isSubmitting,
    handleSubmit,
    reclamationStageData,
    isLoadingStages,
    schema: reclamationSchema,
    fields,
  };
};
