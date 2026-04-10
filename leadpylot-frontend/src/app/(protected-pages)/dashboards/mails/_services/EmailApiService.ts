/**
 * Email API Service
 * Handles all email-related API calls to backend
 */

import { Role } from '@/configs/navigation.config/auth.route.config';
import AxiosBase from '@/services/axios/AxiosBase';

// Email type definitions
export interface EmailParticipant {
  _id: string;
  name: string;
  email: string;
  role: 'agent' | 'customer' | 'admin';
}

export interface EmailMessage {
  _id: string;
  external_id?: string;
  subject: string;
  from: string;
  from_address: string;
  to: string;
  to_address?: string;
  cc?: string;
  bcc?: string;
  body: string;
  html_body?: string;
  direction: 'incoming' | 'outgoing';
  received_at?: string;
  sent_at?: string;
  attachments?: any[];
  email_approved?: boolean;
  attachment_approved?: boolean;
  admin_viewed?: boolean;
  agent_viewed?: boolean;
}

export interface EmailConversation {
  _id: string;
  thread_id: string;
  subject: string;
  participants: EmailParticipant[];
  messages: EmailMessage[];
  latest_message_date: string;
  latest_message_snippet: string;
  unread_count: number;
  message_count: number;
  assigned_agent?: any;
  visible_to_agents?: any[];
  needs_approval: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  email_approved?: boolean;
  attachment_approved?: boolean;
  admin_viewed?: boolean;
  agent_viewed?: boolean;
  mailserver_id?: any;
  lead_id?: any;
  project_id?: any;
  has_attachments?: boolean;
  direction?: string;
}

export interface EmailFilters {
  project_id?: string | null;
  mailserver_id?: string | null;
  status?: 'all' | 'pending' | 'approved' | 'rejected' | 'incoming' | 'outgoing';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  view?: string;
  assigned_to?: string;
  opening_type?: string;
  is_active?: boolean;
  is_draft?: boolean;
  has_assigned_agent?: boolean;
}

export interface EmailPagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
  has_more?: boolean;
}

export interface GetEmailsResponse {
  conversations: EmailConversation[];
  meta: EmailPagination;
}

export interface GetEmailByIdResponse {
  data(data: any): unknown;
  email: EmailConversation;
  replies: any[];
  reply_count: number;
}

class EmailApiService {
  private baseUrl = '/email-system';

  /**
   * Get starred emails
   * Uses role-based endpoints: /starred-all for Admin, /starred for Agent
   */
  async getStarredEmails(
    filters: EmailFilters = {},
    page = 1,
    limit = 20,
    userRole?: string
  ): Promise<GetEmailsResponse> {
    const params: Record<string, any> = {
      ...filters,
      page,
      limit,
    };

    // Remove view from params as it's handled by endpoint
    delete params.view;

    // Include approval status filters if provided
    if (filters.status) {
      params.status = filters.status;
    }

    if (typeof filters.is_active === 'boolean') {
      params.is_active = filters.is_active;
    }

    try {
      // Use appropriate endpoint based on role
      const endpoint =
        userRole === 'Admin' ? `${this.baseUrl}/starred-all` : `${this.baseUrl}/starred`;
      const response = await AxiosBase.get(endpoint, { params });

      return this.transformConversationsResponse(response);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Fetch starred failed:', error);
      throw error;
    }
  }

  /**
   * Transform backend response to frontend format
   */
  private transformConversationsResponse(response: any): GetEmailsResponse {
    const emails = response.data.data || response.data.emails || [];

    const conversations = emails.map((conversation: any) => {
      const threadEmails = conversation.thread_emails || [conversation];

      // Collect unique participants
      const participantSet = new Set<string>();
      threadEmails.forEach((email: any) => {
        participantSet.add(email.from_address);
      });

      return {
        _id: conversation._id || conversation.id,
        thread_id: conversation.thread_id || conversation._id,
        subject: conversation.subject,
        participants: Array.from(participantSet).map((email) => ({
          _id: email,
          name: threadEmails.find((e: any) => e.from_address === email)?.from || email,
          email: email,
          role: 'customer' as const,
        })),
        messages: threadEmails,
        latest_message_date:
          conversation.latest_message_date || conversation.received_at || conversation.sent_at,
        latest_message_snippet:
          conversation.latest_message_snippet || conversation.body?.substring(0, 100) || '',
        unread_count: conversation.unread_count || (conversation.admin_viewed ? 0 : 1),
        message_count: conversation.message_count || threadEmails.length,
        assigned_agent: conversation.assigned_agent,
        visible_to_agents: conversation.visible_to_agents || [],
        needs_approval:
          !conversation.email_approved ||
          (conversation.attachments?.length > 0 && !conversation.attachment_approved),
        approval_status: conversation.email_approved ? ('approved' as const) : ('pending' as const),
        email_approved: conversation.email_approved,
        attachment_approved: conversation.attachment_approved,
        lead_id: conversation.lead_id,
        project_id: conversation.project_id,
        has_attachments: conversation.attachments?.length > 0 || conversation.has_attachments,
        incoming_count:
          conversation.incoming_count || (conversation.direction === 'incoming' ? 1 : 0),
        outgoing_count:
          conversation.outgoing_count || (conversation.direction === 'outgoing' ? 1 : 0),
        agent_viewed: conversation.agent_viewed,
        admin_viewed: conversation.admin_viewed || conversation.has_unread === false,
        is_active: conversation.is_active,
        archived: conversation.archived,
        status: conversation.status,
        workflow_history: conversation.workflow_history,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        __v: conversation.__v,
        flagged: conversation.flagged,
        starred_by: conversation.starred_by,
        attachment_count: conversation.attachment_count || 0,
        email_access_to_agent: conversation.email_access_to_agent,
        snoozed: conversation.snoozed,
        snoozed_at: conversation.snoozed_at,
        snoozed_by: conversation.snoozed_by,
        snoozed_until: conversation.snoozed_until,
        has_draft: conversation.has_draft,
        is_draft: conversation.is_draft,
      };
    });

    return {
      conversations,
      meta: response.data.meta || { page: 1, pages: 0, total: 0, limit: 20 },
    };
  }

  /**
   * Get Gmail-style conversations
   * Uses appropriate endpoint based on user role
   */
  async getConversations(
    filters: EmailFilters = {},
    page = 1,
    limit = 20,
    userRole?: string
  ): Promise<GetEmailsResponse> {
    const params: Record<string, any> = {
      ...filters,
      status: filters.status ?? 'all',
      page,
      limit,
    };

    if (typeof filters.is_active === 'boolean') params.is_active = filters.is_active;

    try {
      // Handle starred view with role-based endpoints
      if (filters.view === 'starred') {
        return this.getStarredEmails(filters, page, limit, userRole);
      }

      // Use appropriate endpoint based on role
      const endpoint =
        userRole === Role.AGENT ? `${this.baseUrl}/agent/approved` : `${this.baseUrl}/admin/all`;
      const response = await AxiosBase.get(endpoint, { params });

      return this.transformConversationsResponse(response);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Fetch failed:', error);
      throw error;
    }
  }

  /**
   * Get email by ID with full details
   */
  async getEmailById(emailId: string): Promise<GetEmailByIdResponse> {
    // eslint-disable-next-line no-console
    console.log('🌐 API: Fetching email by ID:', emailId);
    const response = await AxiosBase.get(`${this.baseUrl}/${emailId}`);
    // eslint-disable-next-line no-console
    console.log('🌐 API: Email response:', response.data);
    return response.data;
  }

  /**
   * Get email thread/conversation
   */
  async getEmailThread(emailId: string) {
    const response = await AxiosBase.get(`${this.baseUrl}/${emailId}/thread`);
    return response.data.data || response.data;
  }

  /**
   * Send email to lead
   */
  async sendEmail(data: {
    project_id: string;
    agent_id: string;
    lead_id: string;
    subject: string;
    html: string;
    cc?: string;
    bcc?: string;
    attachment_ids?: string[];
  }) {
    const response = await AxiosBase.post(`${this.baseUrl}/send`, data);
    return response.data;
  }

  /**
   * Reply to email
   */
  async replyToEmail(
    emailId: string,
    data:
      | FormData
      | {
          subject: string;
          html: string;
          cc?: string;
          bcc?: string;
          reply_type?: 'reply' | 'reply_all';
          files?: File[];
          attachment_ids?: string[];
        },
    isFormData?: boolean
  ) {
    const config =
      isFormData || data instanceof FormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : {};
    const response = await AxiosBase.post(`${this.baseUrl}/${emailId}/reply`, data, config);
    return response.data;
  }

  /**
   * Forward email
   */
  async forwardEmail(
    emailId: string,
    data: {
      to: string;
      subject: string;
      html: string;
      cc?: string;
      bcc?: string;
    }
  ) {
    const response = await AxiosBase.post(`${this.baseUrl}/${emailId}/forward`, data);
    return response.data;
  }

  /**
   * Approve email (combined approval)
   */
  async approveEmail(
    emailId: string,
    options?: {
      approve_email?: boolean;
      approve_attachments?: boolean;
      attachment_ids?: string[];
      comments?: string;
    }
  ) {
    const response = await AxiosBase.post(`${this.baseUrl}/${emailId}/approve`, options || {});
    return response.data;
  }

  /**
   * Quick approve both email and attachments
   */
  async quickApprove(emailId: string, comments?: string) {
    const response = await AxiosBase.post(`${this.baseUrl}/${emailId}/approve`, {
      approve_email: true,
      approve_attachments: true,
      comments,
    });
    return response.data;
  }

  /**
   * Reject email
   */
  async rejectEmail(emailId: string, reason: string, comments?: string) {
    const response = await AxiosBase.post(`${this.baseUrl}/${emailId}/reject`, {
      reason,
      comments,
    });
    return response.data;
  }

  /**
   * Mark multiple emails as viewed (batch - one API call instead of N)
   * Uses role-based endpoint: admin or agent
   */
  async markMultipleAsViewed(emailIds: string[], userRole?: string) {
    const endpoint =
      userRole === Role.ADMIN
        ? `${this.baseUrl}/admin/mark-multiple-viewed`
        : `${this.baseUrl}/agent/mark-multiple-viewed`;
    const response = await AxiosBase.post(endpoint, {
      email_ids: emailIds,
    });
    return response.data;
  }

  /**
   * Assign email to a lead (Admin)
   */
  async assignToLead(emailId: string, leadId: string, reason?: string, comments?: string) {
    const response = await AxiosBase.post(`${this.baseUrl}/${emailId}/assign-lead`, {
      lead_id: leadId,
      reason,
      comments,
    });
    return response.data;
  }

  /**
   * Unapprove/Remove approval from attachments (Admin)
   */
  async unapproveAttachments(emailId: string, attachmentIds: string[], reason?: string) {
    const response = await AxiosBase.post(`${this.baseUrl}/${emailId}/unapprove-attachments`, {
      attachment_ids: attachmentIds,
      reason,
    });
    return response.data;
  }

  /**
   * Get email workflow history
   */
  async getWorkflowHistory(emailId: string) {
    const response = await AxiosBase.get(`${this.baseUrl}/${emailId}/workflow-history`);
    return response.data;
  }

  /**
   * Assign email to agent
   */
  async assignToAgent(emailId: string, agentId: string, comments?: string) {
    const response = await AxiosBase.post(`${this.baseUrl}/${emailId}/assign-agent`, {
      agent_id: agentId,
      comments,
    });
    return response.data;
  }

  /**
   * Archive email(s) - supports single or bulk operations
   */
  async archiveEmail(emailId: string | string[]) {
    const ids = Array.isArray(emailId) ? emailId : [emailId];
    const response = await AxiosBase.post(`${this.baseUrl}/archive`, { ids });
    return response.data;
  }

  /**
   * Restore archived email(s) - supports single or bulk operations
   */
  async restoreEmail(emailId: string | string[]) {
    const ids = Array.isArray(emailId) ? emailId : [emailId];
    const response = await AxiosBase.post(`${this.baseUrl}/restore`, { ids });
    return response.data;
  }

  /**
   * Mark email as viewed
   */
  async markAsViewed(emailId: string) {
    const response = await AxiosBase.post(`${this.baseUrl}/${emailId}/mark-viewed`);
    return response.data;
  }

  /**
   * Get email statistics
   */
  async getStatistics(projectId?: string) {
    const params = projectId ? { project_id: projectId } : {};
    const response = await AxiosBase.get(`${this.baseUrl}/statistics`, { params });
    return response.data;
  }

  // ========================================================================
  // MISSIVE-STYLE COLLABORATION FEATURES
  // ========================================================================

  /**
   * Snooze email
   */
  async snoozeEmail(emailId: string, snoozeUntil: string, reason?: string) {
    const response = await AxiosBase.post(`${this.baseUrl}/${emailId}/snooze`, {
      snooze_until: snoozeUntil,
      reason,
    });
    return response.data;
  }

  /**
   * Unsnooze email
   */
  async unsnoozeEmail(emailId: string) {
    const response = await AxiosBase.post(`${this.baseUrl}/${emailId}/unsnooze`);
    return response.data;
  }

  /**
   * Get snoozed emails
   */
  async getSnoozedEmails(projectId?: string) {
    const params = projectId ? { project_id: projectId } : {};
    const response = await AxiosBase.get(`${this.baseUrl}/snoozed`, { params });
    return response.data;
  }

  /**
   * Add reminder to email
   */
  async addReminder(emailId: string, remindAt: string, note?: string) {
    const response = await AxiosBase.post(`${this.baseUrl}/${emailId}/reminders`, {
      remind_at: remindAt,
      note,
    });
    return response.data;
  }

  /**
   * Complete reminder
   */
  async completeReminder(emailId: string, reminderId: string) {
    const response = await AxiosBase.post(
      `${this.baseUrl}/${emailId}/reminders/${reminderId}/complete`
    );
    return response.data;
  }

  /**
   * Get presence for email
   */
  async getEmailPresence(emailId: string) {
    const response = await AxiosBase.get(`${this.baseUrl}/${emailId}/presence`);
    return response.data;
  }

  // ========================================================================
  // TASK MANAGEMENT
  // ========================================================================

  /**
   * Create task from email
   */
  async createEmailTask(
    emailId: string,
    data: {
      message: string;
      assigned_to?: string;
      priority?: number;
      due_date?: string;
      lead_id?: string;
    }
  ) {
    const response = await AxiosBase.post(`${this.baseUrl}/${emailId}/tasks`, data);
    return response.data;
  }

  /**
   * Get tasks for email
   */
  async getEmailTasks(emailId: string) {
    const response = await AxiosBase.get(`${this.baseUrl}/${emailId}/tasks`);
    return response.data;
  }

  /**
   * Get task details with email and lead info
   */
  async getTaskDetails(taskId: string) {
    const response = await AxiosBase.get(`${this.baseUrl}/tasks/${taskId}/details`);
    return response.data;
  }

  /**
   * Update task status (mark as done/undone)
   */
  async updateEmailTask(taskId: string, isDone: boolean) {
    const response = await AxiosBase.patch(`${this.baseUrl}/tasks/${taskId}`, { isDone });
    return response.data;
  }

  // ========================================================================
  // EMAIL SYNC (IMAP IMPORT)
  // ========================================================================

  /**
   * Start email sync from mail server
   */
  async startSync(mailServerIds?: string[]) {
    const response = await AxiosBase.post(`${this.baseUrl}/sync/start`, {
      mailserver_ids: mailServerIds,
    });
    return response.data;
  }

  /**
   * Stop email sync
   */
  async stopSync() {
    const response = await AxiosBase.post(`${this.baseUrl}/sync/stop`);
    return response.data;
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    const response = await AxiosBase.get(`${this.baseUrl}/sync/status`);
    return response.data;
  }

  /**
   * Get calendar view - emails grouped by date with counts
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   */
  async getCalendarView(startDate: string, endDate: string) {
    const response = await AxiosBase.get(`${this.baseUrl}/admin/calendar-view`, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
    return response.data;
  }

  /**
   * Get complete lead details by lead ID
   * @param leadId - Lead ID
   */
  async getLeadDetails(leadId: string) {
    const response = await AxiosBase.get(`${this.baseUrl}/leads/${leadId}/complete`);
    return response.data;
  }
}

const emailApiService = new EmailApiService();
export default emailApiService;
