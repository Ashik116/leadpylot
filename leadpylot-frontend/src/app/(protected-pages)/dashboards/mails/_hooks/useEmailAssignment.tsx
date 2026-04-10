/**
 * useEmailAssignment Hook
 * Handles email assignment to lead with cache updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import EmailApiService from '../_services/EmailApiService';
import { Lead } from '@/services/LeadsService';

interface UseEmailAssignmentOptions {
  emailId: string;
  onSuccess?: () => void;
}

interface AssignmentData {
  lead: Lead;
  reason?: string;
  comments?: string;
}

/**
 * Updates all email-related query caches after assignment
 */
function updateEmailCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  emailId: string,
  selectedLead: Lead
) {
  // Update email-detail query cache immediately for instant UI update
  queryClient.setQueryData(['email-detail', emailId], (oldData: any) => {
    if (!oldData) return oldData;
    return {
      ...oldData,
      email: {
        ...oldData.email,
        lead_id: selectedLead,
      },
    };
  });

  // Update email-conversations-infinite cache
  queryClient.setQueriesData({ queryKey: ['email-conversations-infinite'] }, (oldData: any) => {
    if (!oldData?.pages) return oldData;
    return {
      ...oldData,
      pages: oldData.pages.map((page: any) => ({
        ...page,
        conversations: page.conversations.map((conv: any) =>
          conv._id === emailId ? { ...conv, lead_id: selectedLead } : conv
        ),
      })),
    };
  });

  // Update regular email-conversations cache
  queryClient.setQueriesData({ queryKey: ['email-conversations'] }, (oldData: any) => {
    if (!oldData?.conversations) return oldData;
    return {
      ...oldData,
      conversations: oldData.conversations.map((conv: any) =>
        conv._id === emailId ? { ...conv, lead_id: selectedLead } : conv
      ),
    };
  });
}

/**
 * Invalidates email-related queries as fallback to ensure consistency
 */
function invalidateEmailQueries(queryClient: ReturnType<typeof useQueryClient>, emailId: string) {
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ['emails'] });
    queryClient.invalidateQueries({ queryKey: ['email', emailId] });
    queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
    queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });
    queryClient.invalidateQueries({ queryKey: ['email-detail', emailId] });
    queryClient.invalidateQueries({ queryKey: ['internal-comments', emailId] });
  }, 100);
}

interface UseEmailAssignmentReturn {
  assignEmail: (data: AssignmentData) => void;
  isAssigning: boolean;
}

export function useEmailAssignment({
  emailId,
  onSuccess,
}: UseEmailAssignmentOptions): UseEmailAssignmentReturn {
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: async ({ lead, reason, comments }: AssignmentData) => {
      return await EmailApiService.assignToLead(emailId, lead._id, reason, comments);
    },
    onSuccess: (data, variables) => {
      toast.push(
        <Notification title="Success" type="success">
          {data.message || 'Email assigned to lead successfully'}
        </Notification>
      );

      // Update caches immediately for instant UI update
      updateEmailCaches(queryClient, emailId, variables.lead);

      // Explicitly fetch lead details to trigger the /leads/{leadId}/complete API call
      // This ensures the complete API is called immediately after assignment
      queryClient.fetchQuery({
        queryKey: ['lead-details', variables.lead._id],
        queryFn: async () => {
          return await EmailApiService.getLeadDetails(variables.lead._id);
        },
      });

      // Also invalidate all lead-details queries to ensure any active queries refetch
      queryClient.invalidateQueries({
        queryKey: ['lead-details'],
        refetchType: 'active', // Force refetch of active queries immediately
      });

      // Refetch conversations queries to update the conversation prop in real-time
      // This ensures the modal shows updated conversation with new lead_id immediately
      queryClient.invalidateQueries({
        queryKey: ['email-conversations'],
        refetchType: 'active', // Force refetch of active queries
      });
      queryClient.invalidateQueries({
        queryKey: ['email-conversations-infinite'],
        refetchType: 'active', // Force refetch of active queries
      });

      // Call success callback
      onSuccess?.();

      // Invalidate queries as fallback to ensure consistency
      invalidateEmailQueries(queryClient, emailId);
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.message || error?.response?.data?.message || 'Failed to assign email to lead'}
        </Notification>
      );
    },
  });

  return {
    assignEmail: assignMutation.mutate,
    isAssigning: assignMutation.isPending,
  };
}
