import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/useSession';
import useNotification from '@/utils/hooks/useNotification';
import { Role } from '@/configs/navigation.config/auth.route.config';
import ApiService from '../ApiService';
import EmailDraftService, {
  type SaveDraftToMailServerRequest,
} from '../emailSystem/EmailDraftService';
import type {
  GmailConversation,
  GmailConversationsResponse,
  GmailConversationFilters,
} from '@/app/(protected-pages)/dashboards/leads/[id]/emailTypes/gmail.types';
import {
  // New correct API endpoints
  apiGetAdminPendingEmails,
  apiGetAgentApprovedEmails,
  apiGetEmailById,
  apiApproveEmail,
  apiRejectEmail,
  apiApproveAttachments,
  apiAssignEmailToLead,
  apiAssignEmailToAgent,
  apiUnassignAgentFromEmail,
  apiGetEmailWorkflowHistory,
  apiAddWorkflowComment,
  apiMarkEmailAsRead,
  apiDownloadEmailAttachment,
  apiGetEmailsForLead,
  apiGetEmailStatistics,
  apiRefreshEmails,
  apiGetPotentialLeadMatches,
  apiGetAvailableMailServers, // NEW: Get available mail servers
  apiGetEmailStatisticsByMailServer, // NEW: Get mail server statistics
  apiReplyToEmail,
  // Legacy compatibility (to be removed - these are now aliased below)
  // apiGetEmailSystemStats,
  // apiGetAgentEmailStats,
  // Types
  type EmailSystemEmail,
  type EmailSystemResponse,
  type GetEmailSystemParams,
  type GetAgentEmailsParams,
  // type EmailRefreshResponse,
  type EmailStatistics,
  type WorkflowHistoryItem,
  type MailServer, // NEW: Mail server type
  type MailServerStatistics,
  apiGetAdminLeadsAllEmails,
  apiGetAdminAllEmailsPaginate, // NEW: Mail server statistics type
  type ReplyEmailRequest,
  // Gmail-style conversations
  apiGetGmailConversations,
  // Interactive Sync API functions and types
  apiStartInteractiveSync,
  apiStopInteractiveSync,
  apiGetInteractiveSyncStatus,
  type InteractiveSyncStartRequest,
  type InteractiveSyncStartResponse,
  type InteractiveSyncStopResponse,
  type InteractiveSyncStatus,
  apiUnmaskAttachment,
  type UnmaskAttachmentRequest,
  // type ApprovalRequest,
  // type RejectRequest,
  // type AssignLeadRequest,
  // type AssignAgentRequest,
  // type AddCommentRequest,
} from '../emailSystem/EmailSystemService';

// =============================================================================
// ROLE-BASED EMAIL SYSTEM HOOKS
// =============================================================================

export type UseEmailSystemParams = GetEmailSystemParams;
export type UseAgentEmailsParams = GetAgentEmailsParams;

/**
 * Hook to get emails based on user role
 * - Admin: Gets all emails with filtering options
 * - Agent: Gets only approved emails assigned to them
 */
export const useRoleBasedEmails = (params?: UseEmailSystemParams) => {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isAdmin = userRole === Role.ADMIN;
  const isAgent = userRole === Role.AGENT;

  // Admin query - get all emails with pagination support
  const adminQuery = useQuery<EmailSystemResponse>({
    queryKey: ['admin-emails', params],
    queryFn: () => apiGetAdminAllEmailsPaginate(params),
    enabled: isAdmin,
    placeholderData: (previousData) => previousData,
  });

  // Agent query - get approved emails only
  const agentQuery = useQuery<EmailSystemResponse>({
    queryKey: ['agent-approved-emails', params],
    queryFn: () => apiGetAgentApprovedEmails(params as GetAgentEmailsParams),
    enabled: isAgent,
    placeholderData: (previousData) => previousData,
  });

  // Fallback query for other roles
  const fallbackQuery = useQuery<EmailSystemResponse>({
    queryKey: ['no-emails'],
    queryFn: () =>
      Promise.resolve({ emails: [], pagination: { page: 1, pages: 1, total: 0, limit: 10 } }),
    enabled: !isAdmin && !isAgent,
  });

  // Return the appropriate query based on role
  if (isAdmin) return adminQuery;
  if (isAgent) return agentQuery;
  return fallbackQuery;
};

/**
 * Hook to get pending emails (admin only)
 */
export const useAdminPendingEmails = (params?: UseEmailSystemParams) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useQuery<EmailSystemResponse>({
    queryKey: ['admin-pending-emails', params],
    queryFn: () => apiGetAdminPendingEmails(params),
    enabled: isAdmin,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook to get all emails for admin
 */
export const useAdminAllEmails = (params?: UseEmailSystemParams) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useQuery<EmailSystemResponse>({
    queryKey: ['admin-all-emails', params],
    queryFn: () => apiGetAdminLeadsAllEmails(params),
    enabled: isAdmin,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook to get approved emails for agent
 */
export const useAgentApprovedEmails = (params?: UseAgentEmailsParams) => {
  const { data: session } = useSession();
  const isAgent = session?.user?.role === Role.AGENT;

  return useQuery<EmailSystemResponse>({
    queryKey: ['agent-approved-emails', params],
    queryFn: () => apiGetAgentApprovedEmails(params),
    enabled: isAgent,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Infinite query for role-based emails
 */
export const useInfiniteRoleBasedEmails = (params?: Omit<UseEmailSystemParams, 'page'>) => {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isAdmin = userRole === Role.ADMIN;
  const isAgent = userRole === Role.AGENT;

  // Admin infinite query
  const adminQuery = useInfiniteQuery<EmailSystemResponse>({
    queryKey: ['infinite-admin-emails', params],
    queryFn: ({ pageParam = 1 }) =>
      apiGetAdminLeadsAllEmails({
        ...params,
        page: pageParam as number,
        limit: params?.limit || 10,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage?.pagination || lastPage?.meta || { page: 1, pages: 1 };
      return page < pages ? page + 1 : undefined;
    },
    enabled: isAdmin,
  });

  // Agent infinite query
  const agentQuery = useInfiniteQuery<EmailSystemResponse>({
    queryKey: ['infinite-agent-emails', params],
    queryFn: ({ pageParam = 1 }) =>
      apiGetAgentApprovedEmails({
        ...params,
        page: pageParam as number,
        limit: params?.limit || 10,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage?.pagination || lastPage?.meta || { page: 1, pages: 1 };
      return page < pages ? page + 1 : undefined;
    },
    enabled: isAgent,
  });

  // Fallback infinite query for other roles
  const fallbackQuery = useInfiniteQuery<EmailSystemResponse>({
    queryKey: ['no-infinite-emails'],
    queryFn: () =>
      Promise.resolve({ emails: [], pagination: { page: 1, pages: 1, total: 0, limit: 10 } }),
    initialPageParam: 1,
    getNextPageParam: () => undefined,
    enabled: !isAdmin && !isAgent,
  });

  // Return the appropriate query based on role
  if (isAdmin) return adminQuery;
  if (isAgent) return agentQuery;
  return fallbackQuery;
};

/**
 * Hook to get email by ID (available to both admin and agent)
 */
export const useEmailById = (id: string) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery<EmailSystemEmail>({
    queryKey: ['email-by-id', id],
    queryFn: () => apiGetEmailById(id),
    enabled: !!id && isAuthenticated,
  });
};

/**
 * Hook to get email statistics based on role
 */
export const useRoleBasedEmailStats = (params?: { project_id?: string }) => {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isAdmin = userRole === Role.ADMIN;
  // const isAgent = userRole === Role.AGENT;

  return useQuery<EmailStatistics>({
    queryKey: ['email-statistics', params, userRole],
    queryFn: () => apiGetEmailStatistics(params),
    enabled: isAdmin,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // Consider stale after 25 seconds
  });
};

/**
 * Hook to get workflow history (admin only)
 */
export const useEmailWorkflowHistory = (emailId: string) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useQuery<WorkflowHistoryItem[]>({
    queryKey: ['email-workflow-history', emailId],
    queryFn: () => apiGetEmailWorkflowHistory(emailId),
    enabled: !!emailId && isAdmin,
  });
};

/**
 * Hook to get potential lead matches (admin only)
 */
export const usePotentialLeadMatches = (emailId: string) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useQuery({
    queryKey: ['potential-lead-matches', emailId],
    queryFn: () => apiGetPotentialLeadMatches(emailId),
    enabled: !!emailId && isAdmin,
  });
};

/**
 * Hook to get emails for a specific lead
 */
export const useEmailsForLead = (leadId: string, params?: UseAgentEmailsParams) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery<EmailSystemResponse>({
    queryKey: ['emails-for-lead', leadId, params],
    queryFn: () => apiGetEmailsForLead(leadId, params),
    enabled: !!leadId && isAuthenticated,
  });
};

/**
 * Infinite query hook to get emails for a specific lead
 */
export const useInfiniteEmailsForLead = (
  leadId: string,
  params?: Omit<UseAgentEmailsParams, 'page'>
) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useInfiniteQuery<EmailSystemResponse>({
    queryKey: ['infinite-emails-for-lead', leadId, params],
    queryFn: ({ pageParam = 1 }) => {
      return apiGetEmailsForLead(leadId, {
        ...params,
        page: pageParam as number,
        limit: params?.limit || 10,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage?.pagination || { page: 1, pages: 1 };
      return page < pages ? page + 1 : undefined;
    },
    enabled: !!leadId && isAuthenticated,
  });
};

/**
 * Hook to get available mail servers (admin only)
 */
export const useAvailableMailServers = () => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useQuery<MailServer[]>({
    queryKey: ['available-mail-servers'],
    queryFn: () => apiGetAvailableMailServers(),
    enabled: isAdmin,
    // Consider stale after 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
};

/**
 * Hook to get email statistics by mail server (admin only)
 */
export const useEmailStatisticsByMailServer = (params?: {
  project_id?: string;
  mailserver_id?: string;
}) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useQuery<MailServerStatistics>({
    queryKey: ['email-statistics-by-mailserver', params],
    queryFn: () => apiGetEmailStatisticsByMailServer(params),
    enabled: isAdmin,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // Consider stale after 25 seconds
  });
};

// =============================================================================
// ADMIN-ONLY MUTATION HOOKS
// =============================================================================

/**
 * Hook to approve email content (admin only)
 */
export const useApproveEmail = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      if (!id) {
        throw new Error('No email ID provided');
      }
      return await apiApproveEmail(id, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-emails'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-emails'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-statistics'] });
      openNotification({ type: 'success', massage: 'Email approved successfully' });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      openNotification({
        type: 'danger',
        massage: `Failed to approve email: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook to reject email (admin only)
 */
export const useRejectEmail = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useMutation({
    mutationFn: async ({
      id,
      reason,
      comments,
    }: {
      id: string;
      reason: string;
      comments?: string;
    }) => {
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      if (!id) {
        throw new Error('No email ID provided');
      }
      return await apiRejectEmail(id, { reason, comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-emails'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-emails'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-statistics'] });
      openNotification({ type: 'success', massage: 'Email rejected successfully' });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      openNotification({
        type: 'danger',
        massage: `Failed to reject email: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook to approve email attachments (admin only)
 */
export const useApproveAttachments = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      if (!id) {
        throw new Error('No email ID provided');
      }
      return await apiApproveAttachments(id, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-emails'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-emails'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-statistics'] });
      openNotification({ type: 'success', massage: 'Email attachments approved successfully' });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      openNotification({
        type: 'danger',
        massage: `Failed to approve email attachments: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook to assign email to lead (admin only)
 */
export const useAssignEmailToLead = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useMutation({
    mutationFn: async ({
      id,
      lead_id,
      reason,
      comments,
    }: {
      id: string;
      lead_id: string;
      reason?: string;
      comments?: string;
    }) => {
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      if (!id) {
        throw new Error('No email ID provided');
      }
      return await apiAssignEmailToLead(id, { lead_id, reason, comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-emails'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-emails'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-statistics'] });
      openNotification({ type: 'success', massage: 'Email assigned to lead successfully' });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      openNotification({
        type: 'danger',
        massage: `Failed to assign email to lead: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook to assign email to agent (admin only)
 */
export const useAssignEmailToAgent = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useMutation({
    mutationFn: async ({
      id,
      agent_id,
      comments,
    }: {
      id: string;
      agent_id: string;
      comments?: string;
    }) => {
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      if (!id) {
        throw new Error('No email ID provided');
      }
      return await apiAssignEmailToAgent(id, { agent_id, comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-emails'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-emails'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['agent-approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-statistics'] });
      openNotification({ type: 'success', massage: 'Email assigned to agent successfully' });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      openNotification({
        type: 'danger',
        massage: `Failed to assign email to agent: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook to unassign agent access from an email
 */
export const useUnassignAgentFromEmail = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const isAuthenticated = !!session?.user;

  return useMutation({
    mutationFn: async ({
      emailId,
      agentId,
      comments,
    }: {
      emailId: string;
      agentId: string;
      comments?: string;
    }) => {
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }
      if (!emailId) {
        throw new Error('No email ID provided');
      }
      if (!agentId) {
        throw new Error('No agent ID provided');
      }

      return await apiUnassignAgentFromEmail(emailId, {
        agent_id: agentId,
        comments,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-detail', variables.emailId] });
      queryClient.invalidateQueries({ queryKey: ['email-by-id', variables.emailId] });
      queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['agent-approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['gmail-conversation', variables.emailId] });
      openNotification({
        type: 'success',
        massage: 'Agent access removed successfully',
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      openNotification({
        type: 'danger',
        massage: `Failed to remove access: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook to add workflow comment (admin only)
 */
export const useAddWorkflowComment = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      if (!id) {
        throw new Error('No email ID provided');
      }
      return await apiAddWorkflowComment(id, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-workflow-history'] });
      queryClient.invalidateQueries({ queryKey: ['email-by-id'] });
      openNotification({ type: 'success', massage: 'Comment added successfully' });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      openNotification({
        type: 'danger',
        massage: `Failed to add comment: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook to refresh emails (admin only)
 */
export const useRefreshEmails = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useMutation({
    mutationFn: async () => {
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      return await apiRefreshEmails();
    },
    onSuccess: (data) => {
      // Invalidate all email queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-emails'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-emails'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['agent-approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-statistics'] });

      const { teamsProcessed, emailsProcessed, errors } = data.data || {};
      openNotification({
        type: 'success',
        massage: `Email refresh completed! Processed ${teamsProcessed || 0} teams, ${emailsProcessed || 0} emails. ${errors ? `${errors} errors occurred.` : ''}`,
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      openNotification({
        type: 'danger',
        massage: `Failed to refresh emails: ${errorMessage}`,
      });
    },
  });
};

// =============================================================================
// SHARED MUTATION HOOKS
// =============================================================================

/**
 * Hook to mark email as read (available to both admin and agent)
 */
export const useMarkEmailAsRead = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const isAuthenticated = !!session?.user;

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }
      if (!id) {
        throw new Error('No email ID provided');
      }
      return await apiMarkEmailAsRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['agent-approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-by-id'] });
      // Don't show notification for read status changes
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      openNotification({
        type: 'danger',
        massage: `Failed to mark email as read: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook to download email attachment (available to both admin and agent)
 */
export const useDownloadEmailAttachment = () => {
  const { data: session } = useSession();
  const { openNotification } = useNotification();
  const isAuthenticated = !!session?.user;

  return useMutation({
    mutationFn: async ({
      emailId,
      attachmentId,
      filename,
    }: {
      emailId: string;
      attachmentId: string;
      filename?: string;
    }) => {
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }
      if (!emailId || !attachmentId) {
        throw new Error('Email ID and attachment ID are required');
      }

      const blob = await apiDownloadEmailAttachment(emailId, attachmentId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `attachment_${attachmentId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return blob;
    },
    onSuccess: () => {
      openNotification({ type: 'success', massage: 'Attachment downloaded successfully' });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      openNotification({
        type: 'danger',
        massage: `Failed to download attachment: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook to reply to an email (admin and agent)
 */
export const useReplyToEmail = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const isAuthenticated = !!session?.user;

  return useMutation({
    mutationFn: async ({ emailId, payload }: { emailId: string; payload: ReplyEmailRequest }) => {
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }
      if (!emailId) {
        throw new Error('No email ID provided');
      }
      if (!payload?.subject || !payload?.html) {
        throw new Error('Subject and HTML are required');
      }
      return await apiReplyToEmail(emailId, payload);
    },
    onSuccess: (_data, { emailId }) => {
      // Refresh lists and detail
      queryClient.invalidateQueries({ queryKey: ['email-detail', emailId] });
      queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['agent-approved-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-by-id'] });
      // Refresh activities to show the new email sent activity card
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      openNotification({ type: 'success', massage: 'Reply sent successfully' });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      openNotification({
        type: 'danger',
        massage: `Failed to send reply: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook to save draft to mailserver (admin and agent)
 */
export const useSaveDraftToMailServer = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const isAuthenticated = !!session?.user;

  return useMutation({
    mutationFn: async (draftData: SaveDraftToMailServerRequest) => {
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }
      if (!draftData.to) {
        throw new Error('Recipient email (to) is required');
      }
      if (!draftData.mailserver_id) {
        throw new Error('Mail server ID is required');
      }
      return await EmailDraftService.saveDraftToMailServer(draftData);
    },
    onSuccess: (data) => {
      // Invalidate draft-related queries
      queryClient.invalidateQueries({ queryKey: ['email-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-emails-for-lead'] });
      queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });
      if (data?.data?.lead_id) {
        queryClient.invalidateQueries({
          queryKey: ['infinite-emails-for-lead', data.data.lead_id],
        });
      }
      openNotification({
        type: 'success',
        massage: data?.message || 'Draft saved successfully',
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to save draft';
      openNotification({
        type: 'danger',
        massage: errorMessage,
      });
    },
  });
};

/**
 * Hook to get emails for a specific lead with lead information
 */
export const useEmailsForLeadWithData = (leadId: string, params?: UseAgentEmailsParams) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery<{
    emails: EmailSystemEmail[];
    lead: any;
    pagination: {
      page: number;
      pages: number;
      total: number;
      limit: number;
    };
    metadata: {
      lead_id: string;
      user_role: string;
      direction_filter: string;
      access_level: string;
      total_unseen_emails: number;
      unseen_count_explanation: string;
    };
  }>({
    queryKey: ['emails-for-lead-with-data', leadId, params],
    queryFn: async () => {
      const response = await ApiService.fetchDataWithAxios<{
        status: string;
        message: string;
        data: {
          emails: EmailSystemEmail[];
          lead: any;
          pagination: {
            current_page: number;
            total_pages: number;
            total_items: number;
            items_per_page: number;
          };
          metadata: {
            lead_id: string;
            user_role: string;
            direction_filter: string;
            access_level: string;
            total_unseen_emails: number;
            unseen_count_explanation: string;
          };
        };
      }>({
        url: `/email-system/leads/${leadId}/emails`,
        method: 'get',
        params,
      });

      return {
        emails: response.data.emails,
        lead: response.data.lead,
        pagination: {
          page: response.data.pagination.current_page,
          pages: response.data.pagination.total_pages,
          total: response.data.pagination.total_items,
          limit: response.data.pagination.items_per_page,
        },
        metadata: response.data.metadata,
      };
    },
    enabled: !!leadId && isAuthenticated,
  });
};

// =============================================================================
// LEGACY COMPATIBILITY HOOKS (to be removed)
// =============================================================================

// Keep these for backward compatibility during transition
export const useEmailSystemEmails = useAdminAllEmails;
export const useInfiniteEmailSystemEmails = useInfiniteRoleBasedEmails;
export const useEmailSystemEmail = useEmailById;
export const useEmailSystemStats = useRoleBasedEmailStats;
export const useApproveEmailContent = useApproveEmail;
export const useRejectEmailContent = useRejectEmail;
export const useApproveEmailAttachments = useApproveAttachments;
export const useRejectEmailAttachments = useRejectEmail;
// useAssignEmailToAgent is already defined above
export const useMatchEmailToLead = useAssignEmailToLead;
export const useAgentEmails = useAgentApprovedEmails;
export const useInfiniteAgentEmails = useInfiniteRoleBasedEmails;
export const useAgentEmail = useEmailById;
export const useAgentEmailStats = useRoleBasedEmailStats;
export const useDownloadAgentEmailAttachment = useDownloadEmailAttachment;

// =============================================================================
// COMBINED MUTATION HOOKS
// =============================================================================

/**
 * Combined admin email mutations
 */
export function useAdminEmailMutations() {
  const approveEmail = useApproveEmail();
  const rejectEmail = useRejectEmail();
  const approveAttachments = useApproveAttachments();
  const assignToLead = useAssignEmailToLead();
  const assignToAgent = useAssignEmailToAgent();
  const unassignAgent = useUnassignAgentFromEmail();
  const addComment = useAddWorkflowComment();
  const refreshEmails = useRefreshEmails();
  const markAsRead = useMarkEmailAsRead();
  const downloadAttachment = useDownloadEmailAttachment();

  return {
    approveEmail,
    rejectEmail,
    approveAttachments,
    assignToLead,
    assignToAgent,
    unassignAgent,
    addComment,
    refreshEmails,
    markAsRead,
    downloadAttachment,
  };
}

/**
 * Combined agent email mutations
 */
export function useAgentEmailMutations() {
  const markAsRead = useMarkEmailAsRead();
  const downloadAttachment = useDownloadEmailAttachment();

  return {
    markAsRead,
    downloadAttachment,
  };
}

/**
 * Legacy combined mutations (to be removed)
 */
export function useEmailSystemMutations() {
  return useAdminEmailMutations();
}

// =============================================================================
// ATTACHMENT MASKING HOOKS
// =============================================================================

export function useUnmaskAttachment() {
  const { data: session } = useSession();
  const { openNotification } = useNotification();
  const isAuthenticated = !!session?.user;

  return useMutation({
    mutationFn: async (payload: UnmaskAttachmentRequest) => {
      if (!isAuthenticated) throw new Error('Authentication required');
      if (!payload?.documentId) throw new Error('documentId is required');
      if (typeof payload.unmask !== 'boolean') throw new Error('unmask must be boolean');
      if (!payload?.userId) throw new Error('userId is required');
      return apiUnmaskAttachment(payload);
    },
    onSuccess: (data: any) => {
      openNotification({
        type: 'success',
        massage: data?.message ? data.message : 'Attachment status updated',
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      openNotification({ type: 'danger', massage: `Failed to update attachment: ${errorMessage}` });
    },
  });
}

// =============================================================================
// INTERACTIVE SYNC HOOKS
// =============================================================================

/**
 * Hook to get current interactive sync status
 */
export const useInteractiveSyncStatus = () => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useQuery<InteractiveSyncStatus>({
    queryKey: ['interactive-sync-status'],
    queryFn: () => apiGetInteractiveSyncStatus(),
    enabled: isAdmin,
    // Only poll every 3 seconds if isRunning is true
    refetchInterval: (query) => {
      // If data is present and isRunning is true, refetch every 3 seconds.
      // Otherwise, don't refetch (return false)
      const current = query.state.data as InteractiveSyncStatus | undefined;

      if (current?.isRunning) {
        return 3000;
      }
      return false;
    },
    staleTime: 500, // Consider data stale after 500ms to be more responsive to socket updates
  });
};

/**
 * Hook to start interactive sync
 */
export const useStartInteractiveSync = () => {
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();

  return useMutation<InteractiveSyncStartResponse, Error, InteractiveSyncStartRequest>({
    mutationFn: apiStartInteractiveSync,
    onSuccess: (response) => {
      if (response.status === 'success') {
        openNotification({
          massage: `Interactive Sync Started: ${response.message}`,
          type: 'success',
        });
        // Invalidate sync status to refresh immediately
        queryClient.invalidateQueries({ queryKey: ['interactive-sync-status'] });
      } else {
        openNotification({
          massage: `Failed to Start Sync: ${response.message || 'Unknown error occurred'}`,
          type: 'danger',
        });
      }
    },
    onError: (error: any) => {
      openNotification({
        massage: `Sync Start Failed: ${error?.message || 'Failed to start interactive sync'}`,
        type: 'danger',
      });
    },
  });
};

/**
 * Hook to stop interactive sync
 */
export const useStopInteractiveSync = () => {
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();

  return useMutation<InteractiveSyncStopResponse, Error, void>({
    mutationFn: apiStopInteractiveSync,
    onSuccess: (response) => {
      if (response.status === 'success') {
        openNotification({
          massage: `Interactive Sync Stopped: ${response.message}`,
          type: 'success',
        });
        // Invalidate sync status to refresh immediately
        queryClient.invalidateQueries({ queryKey: ['interactive-sync-status'] });
      } else {
        openNotification({
          massage: `Failed to Stop Sync: ${response.message || 'Unknown error occurred'}`,
          type: 'danger',
        });
      }
    },
    onError: (error: any) => {
      openNotification({
        massage: `Sync Stop Failed: ${error?.message || 'Failed to stop interactive sync'}`,
        type: 'danger',
      });
    },
  });
};

// =============================================================================
// GMAIL-STYLE CONVERSATION HOOKS
// =============================================================================

/**
 * Hook to get Gmail-style conversations
 */
export const useGmailConversations = (filters?: GmailConversationFilters) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery<GmailConversationsResponse>({
    queryKey: ['gmail-conversations', filters],
    queryFn: () => apiGetGmailConversations(filters),
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to get infinite Gmail-style conversations with pagination
 */
export const useInfiniteGmailConversations = (filters?: Omit<GmailConversationFilters, 'page'>) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useInfiniteQuery<GmailConversationsResponse>({
    queryKey: ['gmail-conversations-infinite', filters],
    queryFn: ({ pageParam = 1 }) =>
      apiGetGmailConversations({ ...filters, page: pageParam as number }),
    enabled: isAuthenticated,
    initialPageParam: 1,
    getNextPageParam: (lastPage: GmailConversationsResponse) => {
      if (lastPage.meta.has_more && lastPage.meta.page < lastPage.meta.pages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to get a single Gmail conversation by ID
 */
export const useGmailConversation = (conversationId: string) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return useQuery<GmailConversation>({
    queryKey: ['gmail-conversation', conversationId],
    queryFn: async (): Promise<GmailConversation> => {
      // First get all conversations and find the one we need
      // This is temporary - in production you might want a dedicated endpoint
      const response = await apiGetGmailConversations({ limit: 1000 });
      const conversation = response.data.find((conv) => conv.id === conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      return conversation;
    },
    enabled: isAuthenticated && !!conversationId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
};
