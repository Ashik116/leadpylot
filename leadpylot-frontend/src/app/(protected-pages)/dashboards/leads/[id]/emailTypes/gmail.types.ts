export interface GmailParticipant {
  email: string;
  name: string;
  role: 'agent' | 'external' | 'recipient';
  agent?: {
    _id: string;
    name: string;
    login: string;
  };
}

export interface GmailConversationEmail {
  _id: string;
  external_id: string;
  subject: string;
  from: string;
  from_address: string;
  to: string;
  to_address: string;
  cc?: string;
  bcc?: string;
  body: string;
  html_body: string;
  original_body?: string;
  original_html_body?: string;
  direction: 'incoming' | 'outgoing';
  received_at: string;
  sent_at: string;
  is_reply: boolean;
  thread_id?: string;
  reply_to_email?: {
    _id: string;
    subject: string;
    external_id: string;
  };
  attachments: Array<{
    _id: string;
    filename: string;
    size: number;
    contentType: string;
    url?: string;
  }>;
  email_approved: boolean;
  attachment_approved: boolean;
  admin_viewed: boolean;
  agent_viewed: boolean;
  sent_by_agent?: {
    _id: string;
    name: string;
    login: string;
  };
  assigned_agent?: {
    _id: string;
    name: string;
    login: string;
  };
  lead_id?: {
    _id: string;
    contact_name: string;
    email_from: string;
    display_name: string;
  };
  project_id?: {
    _id: string;
    name: string;
  };
  mailserver_id?: {
    _id: string;
    name: string;
  };
}

export interface GmailConversation {
  id: string;
  thread_id: string;
  subject: string;
  participants: GmailParticipant[];
  message_count: number;
  unread_count: number;
  latest_message_date: string;
  latest_message_snippet: string;
  needs_approval: boolean;
  has_attachments: boolean;
  project?: {
    _id: string;
    name: string;
  };
  lead?: {
    _id: string;
    contact_name: string;
    email_from: string;
    display_name: string;
  };
  mailserver?: {
    _id: string;
    name: string;
  };
  emails: GmailConversationEmail[];
  approval_status: 'pending' | 'approved' | 'rejected';
  incoming_count: number;
  outgoing_count: number;
}

export interface GmailConversationsResponse {
  status: 'success' | 'error';
  message: string;
  data: GmailConversation[];
  meta: {
    page: number;
    pages: number;
    total: number;
    limit: number;
    has_more: boolean;
  };
}

export interface GmailConversationFilters {
  project_id?: string;
  mailserver_id?: string;
  status?: 'all' | 'pending' | 'approved' | 'rejected' | 'incoming' | 'outgoing';
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'latest_activity' | 'subject' | 'received_at' | 'sent_at';
  sortOrder?: 'asc' | 'desc';
}
