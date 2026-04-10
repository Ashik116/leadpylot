import ApiService from '../ApiService';

// Types for Email System
export interface EmailSystemEmail {
  _id: string;
  direction: string;
  external_id: string;
  subject: string;
  from: string;
  from_address: string;
  to: string;
  cc: string;
  bcc: string;
  body: string;
  html_body: string;
  received_at: string;
  project_id: {
    _id: string;
    name: string;
  };
  mailserver_id: string;
  lead_id: {
    _id: string;
    contact_name: string;
    email_from: string;
    phone: string;
  };
  matched_by: string;
  assignment_reason: string;
  email_status: string;
  email_approved: boolean;
  email_approved_by?: {
    _id: string;
    login: string;
  };
  email_approved_at?: string;
  attachment_approved: boolean;
  attachment_approved_by?: {
    _id: string;
    login: string;
  };
  attachment_approved_at?: string;
  visible_to_agents: string[];
  assigned_agent?: {
    _id: string;
    login: string;
  };
  agent_viewed: boolean;
  admin_viewed: boolean;
  attachments: EmailAttachment[];
  priority: string;
  category: string;
  tags: string[];
  spam_score: number;
  spam_indicators: string[];
  is_spam: boolean;
  sentiment: string;
  sentiment_score: number;
  topics: string[];
  delivery_status: string;
  delivery_attempts: number;
  workflow_history: WorkflowHistoryItem[];
  is_active: boolean;
  archived: boolean;
  references: string[];
  flagged: boolean;
  delivery_errors: string[];
  processed: boolean;
  createdAt: string;
  updatedAt: string;
  sent_at?: string;
  __v: number;
  admin_viewed_at?: string;
  admin_viewed_by?: {
    _id: string;
    login: string;
  };
  // Intelligence fields
  intelligence_metadata?: {
    analyzedAt: string;
    processingTime: number;
    wordCount: number;
  };
  conversation: any[];
  // Draft fields
  is_draft?: boolean;
  draft_created_by?: {
    _id: string;
    name: string;
    login: string;
  };
  draft_last_saved_at?: string;
  draft_synced_to_imap?: boolean;
  draft_imap_uid?: string;
  draft_parent_email_id?: string;
  // Additional fields
  to_address?: string;
  original_body?: string;
  original_html_body?: string;
}

export interface EmailAttachment {
  _id: string;
  filename: string;
  content_type: string;
  size: number;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
}

export interface EmailSystemReply {
  _id: string;
  direction: 'incoming' | 'outgoing';
  subject: string;
  from: string;
  from_address: string;
  to: string;
  cc?: string;
  bcc?: string;
  body?: string;
  html_body?: string;
  received_at?: string;
  sent_at?: string;
}

export interface WorkflowHistoryItem {
  _id: string;
  action: string;
  performed_by: string;
  timestamp: string;
  details?: any;
  comments?: string;
}

// Request/Response interfaces based on backend API
export interface GetEmailSystemParams {
  project_id?: string;
  mailserver_id?: string; // NEW: Mail server filter
  status?: 'pending' | 'approved' | 'rejected' | 'incoming' | 'outgoing' | 'all';
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  lead_id?: string;
}

export interface GetAgentEmailsParams {
  project_id?: string;
  mailserver_id?: string; // NEW: Mail server filter
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface EmailSystemResponse {
  emails: EmailSystemEmail[];
  pagination?: {
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
  meta?: {
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
  metadata?: {
    lead_id: string;
    user_role: string;
    direction_filter: string;
    access_level: string;
    total_unseen_emails: number;
    unseen_count_explanation: string;
  };
}

export interface EmailSystemApiResponse {
  status: string;
  message: string;
  data: EmailSystemEmail[];
  meta?: {
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
  pagination?: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}
export interface TEmailSystemApiResponse {
  status: string;
  message: string;
  data: EmailSystemEmail[];
  meta: {
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
}
export interface LeadEmailsApiResponse {
  status: string;
  message: string;
  data: {
    emails: EmailSystemEmail[];
    lead: {
      _id: string;
      use_status: string;
      reclamation_status: string;
      duplicate_status: number;
      checked: boolean;
      lead_source_no: string;
      contact_name: string;
      email_from: string;
      phone: string;
      expected_revenue: number;
      leadPrice: number;
      lead_date: string;
      source_id: string;
      stage_id: string;
      status_id: string;
      stage: string;
      status: string;
      active: boolean;
      tags: any[];
      project_closed_date: string | null;
      closure_reason: string | null;
      closed_by_user_id: string | null;
      write_date: string;
      voip_extension: string;
      createdAt: string;
      updatedAt: string;
      __v: number;
      transaction_id: string;
      assigned_date: string;
      team_id: number;
      user_id: number;
    };
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
}

export interface ApprovalRequest extends Record<string, unknown> {
  comments?: string;
}

export interface RejectRequest extends Record<string, unknown> {
  reason: string;
  comments?: string;
}

export interface AssignLeadRequest extends Record<string, unknown> {
  lead_id: string;
  reason?: string;
  comments?: string;
}

export interface AssignAgentRequest extends Record<string, unknown> {
  agent_id: string;
  comments?: string;
}

export interface AddCommentRequest extends Record<string, unknown> {
  comment: string;
}

export interface UnassignAgentRequest extends Record<string, unknown> {
  agent_id: string;
  comments?: string;
}

// Reply to email request
export interface ReplyEmailRequest extends Record<string, unknown> {
  subject: string;
  html: string;
  cc?: string;
  bcc?: string;
  reply_type?: string;
  attachments?: File[];
}

export interface EmailStatistics {
  total_emails: number;
  pending_approval: number;
  approved: number;
  rejected: number;
  pending_attachments: number;
  approved_attachments: number;
  rejected_attachments: number;
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

// NEW: Mail server types
export interface MailServer {
  _id: string;
  name: string;
  adminEmail: string;
  imapHost: string;
  autoApproval: {
    emails: boolean;
    attachments: boolean;
  };
  emailCounts: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  // Interactive Sync Fields
  syncStatus: {
    isCompleted: boolean;
    completedAt: string | null;
    lastSync: string | null;
    emailsCount: number;
    status: 'completed' | 'completed_legacy' | 'not_started' | 'error';
  };
  requiresFirstSync: boolean;
  isReadyForEmails: boolean;
}

// Interactive Sync Types
export interface InteractiveSyncStatus {
  isRunning: boolean;
  syncId?: string;
  startedAt?: string;
  startedBy?: string;
  stoppedAt?: string;
  stoppedBy?: string;
  completedAt?: string;
  error?: string;
  mailServers?: InteractiveSyncMailServer[];
  progress?: InteractiveSyncProgress;
  lastUpdate?: string;
  message?: string;
}

export interface InteractiveSyncMailServer {
  id: string;
  name: string;
  status: 'pending' | 'connecting' | 'processing' | 'completed' | 'error';
  totalEmails: number;
  processedEmails: number;
  successfulEmails: number;
  failedEmails: number;
  currentEmail: {
    subject: string;
    from: string;
    folder: string;
    hasAttachments: boolean;
  } | null;
  documentsUploaded: number;
  attachmentErrors: number;
  error?: string;
}

export interface InteractiveSyncProgress {
  totalMailServers: number;
  completedMailServers: number;
  totalEmails: number;
  processedEmails: number;
  successfulEmails: number;
  failedEmails: number;
  documentsUploaded: number;
  estimatedTimeRemaining: number | null;
}

export interface InteractiveSyncStartRequest extends Record<string, unknown> {
  mailserver_ids?: string[];
}

export interface InteractiveSyncStartResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    syncId?: string;
    mailServers?: { id: string; name: string }[];
    canStop?: boolean;
  };
  error?: string;
}

export interface InteractiveSyncStopResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    syncId?: string;
    stoppedAt?: string;
  };
  error?: string;
}

export interface InteractiveSyncProgressUpdate {
  type:
  | 'sync_started'
  | 'mailserver_started'
  | 'mailserver_completed'
  | 'sync_completed'
  | 'sync_error'
  | 'sync_stopped'
  | 'email_processing'
  | 'email_success'
  | 'email_error';
  message: string;
  syncId: string;
  timestamp: string;
  isInteractiveSync: boolean;
  mailServer?: InteractiveSyncMailServer;
  currentEmail?: {
    subject: string;
    from: string;
    folder: string;
    hasAttachments: boolean;
  };
  progress?: InteractiveSyncProgress;
  finalStats?: InteractiveSyncProgress;
  duration?: number;
  error?: string;
}

export interface MailServerStatistics {
  overall: {
    totalEmails: number;
    pendingApproval: number;
    emailApproved: number;
    fullyApproved: number;
    rejected: number;
    withAttachments: number;
    leadMatched: number;
    leadMatchRate: string;
    approvalRate: string;
  };
  byMailServer: Array<{
    mailserverId: string;
    mailserverName: string;
    adminEmail: string;
    totalEmails: number;
    pendingApproval: number;
    emailApproved: number;
    fullyApproved: number;
    rejected: number;
    withAttachments: number;
    leadMatched: number;
    leadMatchRate: number;
    approvalRate: number;
  }>;
}

// =============================================================================
// ATTACHMENT MASKING MANAGEMENT
// =============================================================================

export interface UnmaskAttachmentRequest extends Record<string, unknown> {
  documentId: string;
  unmask: boolean;
  userId: string;
}

// =============================================================================
// ADMIN EMAIL MANAGEMENT APIs
// =============================================================================

/**
 * Get emails requiring admin approval
 */
export const apiGetAdminPendingEmails = async (
  params?: GetEmailSystemParams
): Promise<EmailSystemResponse> => {
  const response = await ApiService.fetchDataWithAxios<EmailSystemApiResponse>({
    url: '/email-system/admin/pending',
    method: 'get',
    params,
  });
  return {
    emails: response.data,
    pagination: {
      page: response?.pagination?.current_page || 1,
      pages: response?.pagination?.total_pages || 1,
      total: response?.pagination?.total_items || 0,
      limit: response?.pagination?.items_per_page || 10,
    },
  };
};

/**
 * Get all emails for admin with filters
 */
export const apiGetAdminAllEmails = async (
  params?: GetEmailSystemParams
): Promise<EmailSystemResponse> => {
  const response = await ApiService.fetchDataWithAxios<EmailSystemApiResponse>({
    url: `/email-system/admin/all`,
    method: 'get',
    params,
  });
  return {
    emails: response.data,
    pagination: {
      page: response?.pagination?.current_page || 1,
      pages: response?.pagination?.total_pages || 1,
      total: response?.pagination?.total_items || 0,
      limit: response?.pagination?.items_per_page || 10,
    },
  };
};
export const apiGetAdminLeadsAllEmails = async (
  params?: GetEmailSystemParams
): Promise<EmailSystemResponse> => {
  const response = await ApiService.fetchDataWithAxios<EmailSystemApiResponse>({
    url: `/email-system/leads/${params?.lead_id}/emails`,
    method: 'get',
  });
  return {
    emails: response.data,
    pagination: {
      page: response?.pagination?.current_page || 1,
      pages: response?.pagination?.total_pages || 1,
      total: response?.pagination?.total_items || 0,
      limit: response?.pagination?.items_per_page || 10,
    },
  };
};

export const apiGetAdminAllEmailsPaginate = async (
  params?: GetEmailSystemParams
): Promise<EmailSystemResponse> => {
  const response = await ApiService.fetchDataWithAxios<TEmailSystemApiResponse>({
    url: '/email-system/admin/all',
    method: 'get',
    params,
  });
  return {
    emails: response.data,
    meta: {
      page: response.meta.page,
      pages: response.meta.pages,
      total: response.meta.total,
      limit: response.meta.limit,
    },
  };
};
/**
 * Approve email content
 */
export const apiApproveEmail = async (
  id: string,
  data?: ApprovalRequest
): Promise<EmailSystemEmail> => {
  return ApiService.fetchDataWithAxios<EmailSystemEmail>({
    url: `/email-system/${id}/approve-email`,
    method: 'post',
    data,
  });
};

/**
 * Approve email attachments
 */
export const apiApproveAttachments = async (
  id: string,
  data?: ApprovalRequest
): Promise<EmailSystemEmail> => {
  return ApiService.fetchDataWithAxios<EmailSystemEmail>({
    url: `/email-system/${id}/approve-attachments`,
    method: 'post',
    data,
  });
};

/**
 * Reject email
 */
export const apiRejectEmail = async (
  id: string,
  data: RejectRequest
): Promise<EmailSystemEmail> => {
  return ApiService.fetchDataWithAxios<EmailSystemEmail>({
    url: `/email-system/${id}/reject`,
    method: 'post',
    data,
  });
};

/**
 * Assign email to lead
 */
export const apiAssignEmailToLead = async (
  id: string,
  data: AssignLeadRequest
): Promise<EmailSystemEmail> => {
  return ApiService.fetchDataWithAxios<EmailSystemEmail>({
    url: `/email-system/${id}/assign-lead`,
    method: 'post',
    data,
  });
};

/**
 * Assign email to agent
 */
export const apiAssignEmailToAgent = async (
  id: string,
  data: AssignAgentRequest
): Promise<EmailSystemEmail> => {
  return ApiService.fetchDataWithAxios<EmailSystemEmail>({
    url: `/email-system/${id}/assign-agent`,
    method: 'post',
    data,
  });
};

/**
 * Unassign agent access from email
 */
export const apiUnassignAgentFromEmail = async (
  id: string,
  data: UnassignAgentRequest
): Promise<EmailSystemEmail> => {
  return ApiService.fetchDataWithAxios<EmailSystemEmail>({
    url: `/email-system/${id}/unassign-agent`,
    method: 'post',
    data,
  });
};

/**
 * Get email workflow history
 */
export const apiGetEmailWorkflowHistory = async (id: string): Promise<WorkflowHistoryItem[]> => {
  return ApiService.fetchDataWithAxios<WorkflowHistoryItem[]>({
    url: `/email-system/${id}/workflow-history`,
    method: 'get',
  });
};

/**
 * Add workflow comment to email
 */
export const apiAddWorkflowComment = async (
  id: string,
  data: AddCommentRequest
): Promise<EmailSystemEmail> => {
  return ApiService.fetchDataWithAxios<EmailSystemEmail>({
    url: `/email-system/${id}/add-comment`,
    method: 'post',
    data,
  });
};

/**
 * Get email statistics (admin only)
 */
export const apiGetEmailStatistics = async (params?: {
  project_id?: string;
}): Promise<EmailStatistics> => {
  return ApiService.fetchDataWithAxios<EmailStatistics>({
    url: '/email-system/stats',
    method: 'get',
    params,
  });
};

/**
 * Manually trigger IMAP email processing (admin only)
 */
export const apiRefreshEmails = async (timeout: number = 300000): Promise<EmailRefreshResponse> => {
  return ApiService.fetchDataWithAxios<EmailRefreshResponse>({
    url: '/email-system/admin/refresh',
    method: 'post',
    timeout,
  });
};

/**
 * Get available mail servers for filtering (admin only)
 */
export const apiGetAvailableMailServers = async (): Promise<MailServer[]> => {
  const response = await ApiService.fetchDataWithAxios<{ data: MailServer[] }>({
    url: '/email-system/admin/mailservers',
    method: 'get',
  });
  return response.data;
};

/**
 * Get email statistics by mail server (admin only)
 */
export const apiGetEmailStatisticsByMailServer = async (params?: {
  project_id?: string;
  mailserver_id?: string;
}): Promise<MailServerStatistics> => {
  const response = await ApiService.fetchDataWithAxios<{ data: MailServerStatistics }>({
    url: '/email-system/stats/mailservers',
    method: 'get',
    params,
  });
  return response.data;
};

/**
 * Send a reply to an email
 */
export const apiReplyToEmail = async (emailId: string, data: ReplyEmailRequest | FormData): Promise<any> => {
  // If data is already FormData, use it directly
  if (data instanceof FormData) {
    return ApiService.fetchDataWithAxios<any, FormData>({
      url: `/email-system/${emailId}/reply`,
      method: 'post',
      data: data,
    });
  }

  // Otherwise, convert to FormData to support attachments
  const formData = new FormData();
  formData.append('subject', data.subject);
  formData.append('html', data.html);
  if (data.cc) formData.append('cc', data.cc);
  if (data.bcc) formData.append('bcc', data.bcc);
  if (data.reply_type) formData.append('reply_type', data.reply_type);
  if (data.attachments && data.attachments.length > 0) {
    data.attachments.forEach((file) => formData.append('attachments', file));
  }

  return ApiService.fetchDataWithAxios<any, FormData>({
    url: `/email-system/${emailId}/reply`,
    method: 'post',
    data: formData,
  });
};

// =============================================================================
// INTERACTIVE SYNC API FUNCTIONS
// =============================================================================

/**
 * Start interactive email sync for mail servers
 */
export const apiStartInteractiveSync = async (
  data: InteractiveSyncStartRequest = {}
): Promise<InteractiveSyncStartResponse> => {
  const response = await ApiService.fetchDataWithAxios<InteractiveSyncStartResponse>({
    url: '/email-system/admin/interactive-sync/start',
    method: 'post',
    data,
  });
  return response;
};

/**
 * Stop interactive email sync
 */
export const apiStopInteractiveSync = async (): Promise<InteractiveSyncStopResponse> => {
  const response = await ApiService.fetchDataWithAxios<InteractiveSyncStopResponse>({
    url: '/email-system/admin/interactive-sync/stop',
    method: 'post',
  });
  return response;
};

/**
 * Get current interactive sync status
 */
export const apiGetInteractiveSyncStatus = async (): Promise<InteractiveSyncStatus> => {
  const response = await ApiService.fetchDataWithAxios<{
    status: string;
    data: InteractiveSyncStatus;
  }>({
    url: '/email-system/admin/interactive-sync/status',
    method: 'get',
  });
  return response.data;
};

/**
 * Unmask or mask an attachment (admin only)
 */
export const apiUnmaskAttachment = async (
  data: UnmaskAttachmentRequest
): Promise<{ success: boolean }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean }, UnmaskAttachmentRequest>({
    url: '/email-system/admin/attachment/unmask',
    method: 'put',
    data,
  });
};

// =============================================================================
// AGENT EMAIL ACCESS APIs
// =============================================================================

/**
 * Get approved emails for agent
 */
export const apiGetAgentApprovedEmails = async (
  params?: GetAgentEmailsParams
): Promise<EmailSystemResponse> => {
  const response = await ApiService.fetchDataWithAxios<EmailSystemApiResponse>({
    url: '/email-system/agent/approved',
    method: 'get',
    params,
  });
  return {
    emails: response.data,
    meta: {
      page: response?.meta?.page || 1,
      pages: response?.meta?.pages || 1,
      total: response?.meta?.total || 0,
      limit: response?.meta?.limit || 10,
    },
  };
};

// =============================================================================
// SHARED APIs (Admin and Agent)
// =============================================================================

/**
 * Get email by ID
 */
export const apiGetEmailById = async (id: string): Promise<EmailSystemEmail> => {
  const response = await ApiService.fetchDataWithAxios<{
    status: string;
    message: string;
    data: EmailSystemEmail;
  }>({
    url: `/email-system/${id}`,
    method: 'get',
  });
  return response.data;
};

/**
 * Mark email as read
 */
export const apiMarkEmailAsRead = async (id: string): Promise<void> => {
  return ApiService.fetchDataWithAxios<void>({
    url: `/email-system/${id}/mark-read`,
    method: 'post',
  });
};

/**
 * Download email attachment
 */
export const apiDownloadEmailAttachment = async (
  emailId: string,
  attachmentId: string
): Promise<Blob> => {
  return ApiService.fetchDataWithAxios<Blob>({
    url: `/email-system/${emailId}/attachments/${attachmentId}`,
    method: 'get',
    responseType: 'blob',
  });
};

/**
 * Get emails for a specific lead
 */
export const apiGetEmailsForLead = async (
  leadId: string,
  params?: GetAgentEmailsParams
): Promise<EmailSystemResponse> => {
  try {
    const response = await ApiService.fetchDataWithAxios<any>({
      url: `/email-system/leads/${leadId}/emails`,
      method: 'get',
      params,
    });

    // Handle different possible response structures
    let emails = [];
    let pagination = {
      page: 1,
      pages: 1,
      total: 0,
      limit: params?.limit || 10,
    };
    let metadata = response?.metadata;

    // Check if response has the expected structure
    if (response.data) {
      // If response.data is an array, it's the emails directly
      if (Array.isArray(response.data)) {
        emails = response.data;
        pagination.total = emails.length;
      }
      // If response.data has emails property
      else if (response.data.emails && Array.isArray(response.data.emails)) {
        emails = response.data.emails;

        // Handle pagination
        if (response.data.pagination) {
          pagination = {
            page: response.data.pagination.current_page || 1,
            pages: response.data.pagination.total_pages || 1,
            total: response.data.pagination.total_items || emails.length,
            limit: response.data.pagination.items_per_page || params?.limit || 10,
          };
        } else {
          pagination.total = emails.length;
        }

        // Handle metadata
        if (response.data.metadata) {
          metadata = response.data.metadata;
        }
      }
      // If response.data is the emails array directly
      else if (Array.isArray(response.data.emails)) {
        emails = response.data.emails;
        pagination.total = emails.length;
      }
      // If response is the emails array directly
      else if (Array.isArray(response)) {
        emails = response;
        pagination.total = emails.length;
      } else {
        throw new Error('Invalid API response structure');
      }
    } else {
      throw new Error('No data received from API');
    }

    return {
      emails,
      pagination,
      metadata,
    };
  } catch (error) {
    throw error;
  }
};

// =============================================================================
// GMAIL-STYLE CONVERSATIONS API
// =============================================================================

import {
  GmailConversationsResponse,
  GmailConversationFilters,
} from '../../app/(protected-pages)/dashboards/leads/[id]/emailTypes/gmail.types';

/**
 * Get Gmail-style conversations
 * @param filters - Filters for conversations
 * @returns Promise<GmailConversationsResponse>
 */
export const apiGetGmailConversations = async (
  filters?: GmailConversationFilters
): Promise<GmailConversationsResponse> => {
  try {
    const params = new URLSearchParams();

    if (filters?.project_id) params.append('project_id', filters.project_id);
    if (filters?.mailserver_id) params.append('mailserver_id', filters.mailserver_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await ApiService.fetchDataWithAxios<GmailConversationsResponse>({
      method: 'GET',
      url: `/email-system/gmail/conversations?${params.toString()}`,
    });
    return response;
  } catch (error) {
    throw error;
  }
};

// =============================================================================
// EMAIL PROJECT SYNCHRONIZATION
// =============================================================================

// Email Sync Response Types
export interface EmailSyncResult {
  success: boolean;
  emailsUpdated: number;
  emailsFound: number;
  leadId: string;
  leadName?: string;
  newProjectId: string;
  newProjectName: string;
  processingTime: number;
  adminUserId: string;
}

export interface ProjectEmailSyncResult {
  projectName: string;
  leadsProcessed: number;
  totalEmailsUpdated: number;
  results: Array<{
    leadId: string;
    leadName: string;
    emailsUpdated: number;
    success: boolean;
    error?: string;
  }>;
  successfulSyncs: number;
  failedSyncs: number;
}

export interface EmailSyncStatus {
  leadId: string;
  leadName: string;
  currentProject: {
    id: string;
    name: string;
  } | null;
  totalEmails: number;
  syncedEmails: number;
  unsyncedEmails: number;
  emailDetails: Array<{
    emailId: string;
    subject: string;
    direction: string;
    receivedAt: string;
    currentEmailProject: {
      id: string;
      name: string;
    } | null;
    isSynced: boolean;
  }>;
}

// Sync emails for a specific lead
export const apiSyncLeadEmails = async (
  leadId: string,
  reason?: string
): Promise<EmailSyncResult> => {
  try {
    const response = await ApiService.fetchDataWithAxios<{
      status: 'success' | 'error';
      message: string;
      data: EmailSyncResult;
      error?: string;
    }>({
      method: 'POST',
      url: `/email-system/admin/sync-lead-emails/${leadId}`,
      data: { reason },
    });

    if (response.status === 'error') {
      throw new Error(response.error || response.message);
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

// Sync emails for all leads in a project
export const apiSyncProjectEmails = async (
  projectId: string,
  reason?: string
): Promise<ProjectEmailSyncResult> => {
  try {
    const response = await ApiService.fetchDataWithAxios<{
      status: 'success' | 'error';
      message: string;
      data: ProjectEmailSyncResult;
      error?: string;
    }>({
      method: 'POST',
      url: `/email-system/admin/sync-project-emails/${projectId}`,
      data: { reason },
    });

    if (response.status === 'error') {
      throw new Error(response.error || response.message);
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get email sync status for a lead
export const apiGetEmailSyncStatus = async (leadId: string): Promise<EmailSyncStatus> => {
  try {
    const response = await ApiService.fetchDataWithAxios<{
      status: 'success' | 'error';
      message: string;
      data: EmailSyncStatus;
      error?: string;
    }>({
      method: 'GET',
      url: `/email-system/admin/sync-status/${leadId}`,
    });

    if (response.status === 'error') {
      throw new Error(response.error || response.message);
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

// =============================================================================
// LEGACY/COMPATIBILITY APIs (to be removed)
// =============================================================================

// Keep these for backward compatibility during transition
export const apiGetEmailSystemEmails = apiGetAdminAllEmails;
export const apiGetEmailSystemEmail = apiGetEmailById;
export const apiApproveEmailContent = apiApproveEmail;
export const apiRejectEmailContent = apiRejectEmail;
export const apiApproveEmailAttachments = apiApproveAttachments;
export const apiRejectEmailAttachments = apiRejectEmail; // Backend uses single reject endpoint
export const apiMatchEmailToLead = apiAssignEmailToLead;
export const apiGetAgentEmails = apiGetAgentApprovedEmails;
export const apiGetAgentEmail = apiGetEmailById;
export const apiDownloadAgentEmailAttachment = apiDownloadEmailAttachment;
export const apiGetEmailSystemStats = apiGetEmailStatistics;
export const apiGetAgentEmailStats = apiGetEmailStatistics;

// Manual Email Refresh API Response
export interface EmailRefreshResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    teamsProcessed: number;
    emailsProcessed: number;
    errors: number;
    timestamp: string;
  };
  error?: string;
}

// Utility function to get potential lead matches (placeholder)
export const apiGetPotentialLeadMatches = async (emailId: string) => {
  // This would be implemented based on backend lead matching logic
  return ApiService.fetchDataWithAxios<any>({
    url: `/email-system/${emailId}/potential-leads`,
    method: 'get',
  });
};

// Utility function to format email for display
export const formatEmailForDisplay = (email: EmailSystemEmail) => {
  return {
    id: email._id,
    subject: email.subject,
    from: email.from_address,
    to: email.to,
    body: email.body,
    attachments: email.attachments,
    approval_status: email.email_approved ? 'approved' : 'pending',
    attachment_approval_status: email.attachment_approved ? 'approved' : 'pending',
    created_at: email.received_at || email.createdAt,
    updated_at: email.updatedAt,
    received_at: email.received_at || email.createdAt,
  };
};
