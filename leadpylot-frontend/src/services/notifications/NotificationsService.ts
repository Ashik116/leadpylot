import ApiService from '../ApiService';

export interface NotificationInfo {
  project_id: {
    _id: string;
    name: string;
    agents?: {
      active: boolean;
      alias_name: string;
      email_address: string;
      lead_receive: boolean;
      _id: string;
    }[];
  } | null;
  agent_id:
  | {
    _id: string;
    login: string;
  }
  | string
  | null;
  lead_id: {
    _id: string;
    contact_name?: string;
    email_from?: string;
    phone?: string;
    expected_revenue?: number;
  } | null;
  name: string;
}

export interface NotificationMetadata {
  subject: string;
  from: string;
  to: string;
  date: string;
  from_address: string;
  body: string;
  attachments: any[];
}

export interface Notification {
  info: NotificationInfo;
  metadata: NotificationMetadata;
  read: boolean;
  _id: string;
  external_id: string;
  type: string;
  inbox?: string;
  __v: number;
  created_at: string;
  attachments: any[];
}

export interface NotificationsResponse {
  data: Notification[];
  /** Pagination info - can be under 'pagination' or 'meta' depending on endpoint */
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  /** Pagination info (alternative field name) */
  meta?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  /** Backend sort key (e.g. createdAt) */
  sort?: string;
  /** Backend sort order */
  order?: 'asc' | 'desc';
  type?: string;
  lead_id?: string;
  project_id?: string;
  agent_id?: string;
  read?: boolean;
  /** Backend filter: return only unread notifications */
  unread?: boolean;
  /** Backend filter: return only assigned notifications */
  assigned?: boolean;
  /** Search term to filter by notification content */
  search?: string;
  /** Filter by notification category */
  category?:
  | 'leads'
  | 'offers'
  | 'email'
  | 'login'
  | 'project'
  | 'task'
  | 'todo'
  | 'document'
  | 'system';
  /** Filter by date range */
  dateRange?: 'all' | 'today' | 'yesterday' | 'week' | 'month';
}

/**
 * Get all notifications
 */
export async function apiGetNotifications(params?: GetNotificationsParams) {
  return ApiService.fetchDataWithAxios<NotificationsResponse>({
    url: '/notifications',
    method: 'get',
    params,
  });
}

/**
 * Get a specific notification by ID
 */
export async function apiGetNotification(id: string) {
  return ApiService.fetchDataWithAxios<Notification>({
    url: `/notifications/${id}`,
    method: 'get',
  });
}

/**
 * Mark a notification as read
 */
export async function apiMarkNotificationAsRead(id: string) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/notifications/${id}/read`,
    method: 'patch',
  });
}

/**
 * Mark all notifications as read by providing their IDs
 */
export async function apiMarkAllNotificationsAsRead(ids: string[]) {
  return ApiService.fetchDataWithAxios<{
    message: string;
    modifiedCount: number;
  }>({
    url: '/notifications/read',
    method: 'patch',
    data: {
      ids,
    },
  });
}

/**
 * Get pending notifications (unread notifications since last sync)
 */
export async function apiGetPendingNotifications(
  since?: string,
  limit?: number,
  priority?: string
) {
  return ApiService.fetchDataWithAxios<{
    success: boolean;
    data: any[];
    count: number;
    hasMore: boolean;
    syncTimestamp: string;
  }>({
    url: '/notifications/pending',
    method: 'get',
    params: {
      since,
      limit: limit || 50,
      priority,
    },
  });
}

/**
 * Get unread notification count
 */
export async function apiGetUnreadNotificationsCount() {
  return ApiService.fetchDataWithAxios<{
    count: number;
  }>({
    url: '/notifications/unread-count',
    method: 'get',
  });
}

/**
 * Delete notifications by IDs
 */
export async function apiDeleteNotifications(ids: string[]) {
  return ApiService.fetchDataWithAxios<{
    message: string;
    deletedCount: number;
  }>({
    url: '/notifications',
    method: 'delete',
    data: {
      ids,
    },
  });
}

export interface SendProjectEmailParams {
  project_id?: string;
  agent_id?: string;
  lead_id?: string;
  subject: string;
  html: string;
  cc?: string;
  bcc?: string;
  attachments?: File[];
  attachment_ids?: string[];
  lead_ids?: string[];
  mailserver_id?: string;
  files?: File[];
  to?: string;
  scheduled_at?: string; // ISO 8601, e.g. "2026-02-25T10:00:00.000Z"
}

export interface SendProjectEmailResponse {
  success: boolean;
  messageId: string;
  status?: string;
  info: {
    from: string;
    to: string;
    subject: string;
    lead_id: string;
    lead_name: string;
    attachments?: string[];
  };
}

/**
 * Send an email from an agent using the project's SMTP settings
 */
export async function apiSendProjectEmail(data: SendProjectEmailParams) {
  const formData = new FormData();

  // Append required fields
  const requiredFields = [
    'project_id',
    'agent_id',
    'lead_id',
    'subject',
    'html',
    'mailserver_id',
  ] as const;
  requiredFields.forEach((field) => {
    const value = data[field];
    if (value !== undefined) formData.append(field, value);
  });

  // Append optional fields
  if (data.to) formData.append('to', data.to);
  if (data.cc) formData.append('cc', data.cc);
  if (data.bcc) formData.append('bcc', data.bcc);
  if (data.scheduled_at) formData.append('scheduled_at', data.scheduled_at);

  // Append attachment IDs - use array notation for proper handling
  if (data.attachment_ids && data.attachment_ids.length > 0) {
    data.attachment_ids.forEach((id) => formData.append('attachment_ids[]', id));
  }

  // Append files
  if (data.attachments && data.attachments.length > 0) {
    data.attachments.forEach((file) => formData.append('attachments', file));
  }

  try {
    const response = await ApiService.fetchDataWithAxios<SendProjectEmailResponse, any>({
      url: '/email-system/send-project-email',
      method: 'post',
      data: formData, // Send FormData directly instead of converting to object
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    console.log('Email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function apiSendBulkLeadEmail(data: SendProjectEmailParams) {
  const formData = new FormData();

  // Append required fields
  const requiredFields = ['subject', 'html', 'mailserver_id', 'cc', 'bcc', 'to'] as const;
  requiredFields.forEach((field) => {
    const value = data[field];
    if (value !== undefined) formData.append(field, value);
  });
  if (data.lead_ids && data.lead_ids.length > 0) {
    data.lead_ids.forEach((id) => formData.append('lead_ids[]', id));
  }
  if (data.scheduled_at) formData.append('scheduled_at', data.scheduled_at);

  // Append files
  if (data.files && data.files.length > 0) {
    data.files.forEach((file) => formData.append('files', file));
  }

  try {
    const response = await ApiService.fetchDataWithAxios<SendProjectEmailResponse, any>({
      url: '/email-system/send-bulk-email',
      method: 'post',
      data: formData, // Send FormData directly instead of converting to object
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    console.log('Email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
export interface DocumentResponse {
  data: Blob;
  contentType: string;
}

export async function apiGetAttachments(id: string) {
  return ApiService.fetchDataWithAxios<Blob>({
    url: `emails/attachments/${id}/download`,
    method: 'get',
    responseType: 'blob',
  });
}
export interface LeadAttachment {
  id: string;
  filename: string;
  filetype: string;
  size: number;
  type: string;
  source: string;
  uploadedAt: string;
  metadata: {
    openingId?: string;
    offerId?: string;
  };
}

export interface LeadAttachmentsResponse {
  status: string;
  data: {
    leadId: string;
    attachments: LeadAttachment[];
    summary: {
      total: number;
      byType: Record<string, number>;
      bySource: Record<string, number>;
      totalSize: number;
    };
  };
}

export async function apiGetAttachmentsByLead(id: string) {
  return ApiService.fetchDataWithAxios<LeadAttachmentsResponse>({
    url: `/attachments/lead/${id}`,
    method: 'get',
  });
}
