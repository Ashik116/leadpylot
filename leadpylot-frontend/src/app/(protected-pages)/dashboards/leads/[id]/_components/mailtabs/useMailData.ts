import { useMemo, useState, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import { useSearchParams, useRouter } from 'next/navigation';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import { Email } from '../../emailTypes/types';
import { mapEmailSystemToEmails } from './utils';
import { useEmailApproval } from '@/hooks/useEmailApproval';
import useNotification from '@/utils/hooks/useNotification';
import {
  useRoleBasedEmails,
  useRoleBasedEmailStats,
  useAdminEmailMutations,
  useRefreshEmails,
  useAvailableMailServers,
  useAssignEmailToLead,
} from '@/services/hooks/useEmailSystem';
import { useQueryClient } from '@tanstack/react-query';

import {
  apiGetAdminAllEmailsPaginate,
  apiGetAgentApprovedEmails,
} from '@/services/emailSystem/EmailSystemService';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
const INITIAL_PAGE_SIZE = 50;
export type ActiveTab =
  | 'all'
  | 'incoming'
  | 'outgoing'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'compose';

export const TAB_TYPE: Record<string, ActiveTab> = {
  all: 'all',
  inbox: 'incoming',
  outgoing: 'outgoing',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  compose: 'compose',
};
export type THandleQuickAction = {
  emailId: string;
  isApprove: boolean;
  attachments?: string[];
  reason?: string;
  comments?: string;
};
const getTabFromParam = (type: string | null): ActiveTab => TAB_TYPE[type ?? ''] ?? TAB_TYPE.inbox;

const getStatusFromTab = (
  tab: ActiveTab
): 'pending' | 'approved' | 'rejected' | 'all' | 'incoming' =>
  ['pending', 'approved', 'rejected', 'outgoing', 'all', 'incoming'].includes(tab)
    ? (tab as any)
    : 'all';

export const useMailData = () => {
  const { data: session } = useSession();
  const { selectedProject } = useSelectedProjectStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openNotification } = useNotification();
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;
  const userRole = session?.user?.role;
  const isAdmin = userRole === Role.ADMIN;
  const isAgent = userRole === Role.AGENT;

  // Get URL search params with defaults
  const currentPage = Math.max(1, parseInt(searchParams.get('pageIndex') || '1', 10) || 1);
  const pageSize = Math.max(
    1,
    parseInt(searchParams.get('pageSize') || INITIAL_PAGE_SIZE.toString(), 10) || INITIAL_PAGE_SIZE
  );
  const search = searchParams.get('search');

  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    getTabFromParam(searchParams.get('type'))
  );
  const [mailServerFilter, setMailServerFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState(undefined);

  const emailParams = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      project: projectFilter || undefined,
      mailserver_id: mailServerFilter || undefined,
      status: getStatusFromTab(activeTab),
      search: search || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    }),
    [currentPage, pageSize, mailServerFilter, activeTab, search, sortBy, sortOrder, projectFilter]
  );

  const { data: emailSystemResponse, isLoading: isEmailSystemLoading, isFetching: isEmailSystemFetching } = useRoleBasedEmails(emailParams);
  const { data: emailStats } = useRoleBasedEmailStats({
    project_id: selectedProject?.value || undefined,
  });

  const { data: mailServers, isLoading: mailServersLoading } = useAvailableMailServers();
  const adminMutations = useAdminEmailMutations();
  const refreshEmailsMutation = useRefreshEmails();
  const assignEmailToLeadMutation = useAssignEmailToLead();
  const queryClient = useQueryClient();

  const { selected: selectedEmails, handleSelectAll: handleSelectAllEmails } = useSelectAllApi({
    apiFn: isAdmin ? apiGetAdminAllEmailsPaginate : apiGetAgentApprovedEmails,
    apiParams: {
      page: currentPage,
      limit: pageSize,
      search: search || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      select: "_id"
    },
    total: emailSystemResponse?.meta?.total || 0,
    returnFullObjects: true,
  });

  // Function to update email view status in the cache
  const updateEmailViewStatus = useCallback(
    (emailId: string, isAdminView: boolean) => {
      queryClient.setQueryData(['admin-emails', emailParams], (oldData: any) => {
        if (!oldData?.emails) return oldData;

        const updatedEmails = oldData.emails.map((email: any) => {
          if (email._id === emailId) {
            return {
              ...email,
              admin_viewed: isAdminView ? true : email.admin_viewed,
              agent_viewed: !isAdminView ? true : email.agent_viewed,
              admin_viewed_at: isAdminView ? new Date().toISOString() : email.admin_viewed_at,
              agent_viewed_at: !isAdminView ? new Date().toISOString() : email.agent_viewed_at,
            };
          }
          return email;
        });

        return {
          ...oldData,
          emails: updatedEmails,
        };
      });

      // Also update agent emails cache if needed
      queryClient.setQueryData(['agent-approved-emails', emailParams], (oldData: any) => {
        if (!oldData?.emails) return oldData;

        const updatedEmails = oldData.emails.map((email: any) => {
          if (email._id === emailId) {
            return {
              ...email,
              admin_viewed: isAdminView ? true : email.admin_viewed,
              agent_viewed: !isAdminView ? true : email.agent_viewed,
              admin_viewed_at: isAdminView ? new Date().toISOString() : email.admin_viewed_at,
              agent_viewed_at: !isAdminView ? new Date().toISOString() : email.agent_viewed_at,
            };
          }
          return email;
        });

        return {
          ...oldData,
          emails: updatedEmails,
        };
      });
    },
    [queryClient, emailParams]
  );

  const newSystemEmails: Email[] = useMemo(() => (emailSystemResponse?.emails ? mapEmailSystemToEmails(emailSystemResponse, session) : []),
    [emailSystemResponse, session]);

  const { approveEmail, isLoading: isEmailApprovalLoading } = useEmailApproval();

  const handleQuickAction = useCallback(
    async ({ emailId, isApprove, attachments, reason, comments }: THandleQuickAction) => {
      if (!isAdmin) return;

      try {
        await approveEmail(emailId, {
          approve_email: isApprove,
          approve_attachments: attachments && attachments.length > 0 ? isApprove : undefined,
          attachment_ids: attachments && attachments.length > 0 ? attachments : undefined,
          reason: isApprove ? undefined : reason,
          comments: comments ? comments : undefined,
        });

        // Show success notification
        openNotification({
          type: 'success',
          massage: isApprove ? 'Email approved successfully!' : 'Email rejected successfully!',
        });
      } catch (err) {
        console.error(`Failed to ${isApprove ? 'approve' : 'reject'} email:`, err);

        // Show error notification
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        openNotification({
          type: 'danger',
          massage: `Failed to ${isApprove ? 'approve' : 'reject'} email: ${errorMessage}`,
        });
      }
    },
    [isAdmin, approveEmail, openNotification]
  );

  // Wrapper functions for backward compatibility
  const handleQuickApproveContent = useCallback(
    ({ emailId, isApprove, attachments, reason, comments }: THandleQuickAction) =>
      handleQuickAction({
        emailId,
        isApprove,
        attachments,
        reason: isApprove ? undefined : reason,
        comments: comments ? comments : undefined,
      }),
    [handleQuickAction]
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      const newTab = tab as ActiveTab;
      if (newTab === activeTab) return;

      setActiveTab(newTab);
      const params = new URLSearchParams(searchParams);
      params.set('pageIndex', '1');
      params.set('type', newTab);
      router.replace(`${window.location.pathname}?${params.toString()}`);
    },
    [activeTab, searchParams, router]
  );

  const handleRefresh = useCallback(async () => {
    if (isAdmin) {
      try {
        await refreshEmailsMutation.mutateAsync();
      } catch (e) {
        console.error('Failed to refresh emails:', e);
      }
    } else {
      // Refetch the agent emails query to trigger loading state
      try {
        await queryClient.refetchQueries({
          queryKey: ['agent-approved-emails', emailParams]
        });
      } catch (e) {
        console.error('Failed to refetch emails:', e);
      }
    }
  }, [isAdmin, refreshEmailsMutation, queryClient, emailParams]);


  const handleAssignEmailToLead = useCallback(
    async ({
      emailId,
      leadId,
      reason,
      comments,
    }: {
      emailId: string;
      leadId: string;
      reason?: string;
      comments?: string;
    }) => {
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      try {
        const result = await assignEmailToLeadMutation.mutateAsync({
          id: emailId,
          lead_id: leadId,
          reason,
          comments,
        });

        // Also invalidate individual email queries for immediate UI update
        queryClient.invalidateQueries({ queryKey: ['email-by-id', emailId] });
        queryClient.invalidateQueries({ queryKey: ['admin-email', emailId] });
        queryClient.invalidateQueries({ queryKey: ['agent-email', emailId] });

        return result;
      } catch (error) {
        console.error('Failed to assign email to lead:', error);
        throw error;
      }
    },
    [isAdmin, assignEmailToLeadMutation, queryClient]
  );

  return {
    emails: newSystemEmails,
    pagination: emailSystemResponse?.meta,
    emailStats,
    mailServers,
    isEmailSystemLoading,
    isEmailSystemFetching,
    mailServersLoading,
    isEmailApprovalLoading,
    refreshEmailsMutation,
    isAdmin,
    isAgent,
    activeTab,
    currentPage,
    pageSize,
    search,
    mailServerFilter,
    setMailServerFilter,
    projectFilter,
    setProjectFilter,
    handleTabChange,
    handleRefresh,
    handleQuickApproveContent,
    adminMutations,
    handleAssignEmailToLead,
    assignEmailToLeadMutation,
    updateEmailViewStatus,
    selectedEmails,
    handleSelectAllEmails,
  };
};
