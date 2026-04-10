/**
 * useEmailData Hook
 * Fetches and manages email conversations using React Query
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmailApiService } from '../_services';
import { EmailFilters } from '../_types/email.types';
import { useEmailStore } from '../_stores/emailStore';
import { useSession } from '@/hooks/useSession';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export function useEmailData(filters: EmailFilters = {}, page = 1, limit = 20) {
  const queryClient = useQueryClient();
  const { selectConversation, setConversations } = useEmailStore();
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  // Fetch conversations
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['email-conversations', filters, page, limit, userRole],
    queryFn: () => EmailApiService.getConversations(filters as any, page, limit, userRole),
    // No cache - always fetch fresh
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    enabled: !!userRole, // Only fetch when we have user role
  });

  // Update store when data changes
  // useEffect(() => {
  //   if (data?.conversations) {
  //     setConversations(data.conversations as any);

  //   }
  // }, [data, setConversations]);

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: EmailApiService.sendEmail.bind(EmailApiService),
    onSuccess: () => {
      toast.push(
        <Notification title="Success" type="success">
          Email sent successfully
        </Notification>
      );
      queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error.response?.data?.message || 'Failed to send email'}
        </Notification>
      );
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: ({
      emailId,
      data,
      isFormData,
    }: {
      emailId: string;
      data: any;
      isFormData?: boolean;
    }) => EmailApiService.replyToEmail(emailId, data, isFormData),
    onSuccess: (data, { emailId }) => {
      toast.push(
        <Notification title="Success" type="success">
          Reply sent successfully
        </Notification>
      );
      queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['email-detail', emailId] });
      queryClient.invalidateQueries({ queryKey: ['thread-drafts'] });
      
      // ✅ CRITICAL: Invalidate activities queries to refresh activity cards
      // This ensures the new email sent activity appears immediately without page reload
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error.response?.data?.message || 'Failed to send reply'}
        </Notification>
      );
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ emailId, comments }: { emailId: string; comments?: string }) =>
      EmailApiService.approveEmail(emailId, { comments }),
    onSuccess: () => {
      toast.push(
        <Notification title="Success" type="success">
          Email approved
        </Notification>
      );
      queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({
      emailId,
      reason,
      comments,
    }: {
      emailId: string;
      reason: string;
      comments?: string;
    }) => EmailApiService.rejectEmail(emailId, reason, comments),
    onSuccess: () => {
      toast.push(
        <Notification title="Success" type="success">
          Email rejected
        </Notification>
      );
      queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (emailId: string) => EmailApiService.archiveEmail(emailId),
    onSuccess: () => {
      // Remove from current view
      selectConversation(null);
      queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });

      toast.push(
        <Notification title="Success" type="success">
          Email archived
        </Notification>
      );
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error.response?.data?.message || 'Failed to archive email'}
        </Notification>
      );
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (emailId: string) => EmailApiService.restoreEmail(emailId),
    onSuccess: () => {
      // Remove from current view
      selectConversation(null);
      queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });

      toast.push(
        <Notification title="Success" type="success">
          Email restored
        </Notification>
      );
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error.response?.data?.message || 'Failed to restore email'}
        </Notification>
      );
    },
  });

  // Log any errors
  useEffect(() => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Email fetch error:', error);
      toast.push(
        <Notification title="Error" type="danger">
          Failed to load emails: {(error as any)?.message || 'Unknown error'}
        </Notification>
      );
    }
  }, [error]);

  return {
    // Data
    conversations: data?.conversations || [],
    pagination: data?.meta,
    isLoading,
    error,

    // Actions
    refetch,
    sendEmail: sendEmailMutation.mutate,
    replyToEmail: replyMutation.mutate,
    approveEmail: approveMutation.mutate,
    rejectEmail: rejectMutation.mutate,
    archiveEmail: archiveMutation.mutate,
    restoreEmail: restoreMutation.mutate,

    // Mutation states
    isSending: sendEmailMutation.isPending,
    isReplying: replyMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

export function useEmailDetail(emailId: string | null) {
  return useQuery({
    queryKey: ['email-detail', emailId],
    queryFn: async () => {
      if (!emailId) return null;

      // Fetch email details
      const response = await EmailApiService.getEmailById(emailId);

      // Handle different response formats from backend
      const emailData = response.email || response.data || response;

      // Always try to fetch thread (backend will return single email if no thread exists)
      try {
        const threadResponse = await EmailApiService.getEmailThread(emailId);

        // Extract emails from response - try multiple possible locations
        const threadEmails = threadResponse.emails ||
          threadResponse.thread ||
          threadResponse.data?.emails ||
          threadResponse.data?.thread || [emailData];

        // Filter out any null/undefined values
        const validThreadEmails = Array.isArray(threadEmails)
          ? threadEmails.filter((email) => email !== null && email !== undefined && email._id)
          : [emailData];

        return {
          email: emailData,
          thread: validThreadEmails,
          thread_id: threadResponse.thread_id,
          participants: threadResponse.participants,
        };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to fetch thread, using single email:', error);
        return {
          email: emailData,
          thread: [emailData],
        };
      }
    },
    enabled: !!emailId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch complete lead details by lead ID
 */
export function useLeadDetails(leadId: string | null | undefined) {
  return useQuery({
    queryKey: ['lead-details', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      return await EmailApiService.getLeadDetails(leadId);
    },
    enabled: !!leadId,
    staleTime: 0, // Always consider stale to allow refetching after assignment
    refetchOnMount: true, // Refetch when component mounts (e.g., modal opens)
  });
}
