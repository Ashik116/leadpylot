/**
 * Email System Types - Missive-Inspired
 * Type-safe interfaces for the email system
 */

import type { InternalComment } from './comment.types';

export interface EmailParticipant {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: 'agent' | 'customer' | 'team';
}

export interface EmailAttachment {
  _id: string;
  document_id: string;
  filename: string;
  size: number;
  mime_type: string;
  approved: boolean;
  unmask?: boolean;
  path?: string;
}


export interface EmailAccessToAgent {
  _id: string;
  agent_id: {
    _id: string;
    login: string;
  };
  access_type: 'manual' | 'mentioned';
  assigned_at: string;
  assigned_by?: {
    _id: string;
    login: string;
  };
}

export interface EmailMessage {
  mailserver_id?: string | null;
  createdAt: string;
  _id: string;
  subject: string;
  from: string;
  from_address: string;
  to: string;
  to_address: string;
  body: string;
  html_body: string;
  direction: 'incoming' | 'outgoing';
  received_at: string;
  sent_at: string;
  attachments: EmailAttachment[];
  is_reply: boolean;
  is_draft?: boolean; // Draft status
  email_access_to_agent?: EmailAccessToAgent[];
}

export interface EmailConversation {
  _id: string;
  thread_id: string | null;
  subject: string;
  participants: EmailParticipant[];
  messages: EmailMessage[];
  latest_message_date: string;
  latest_message_snippet: string;
  unread_count: number;
  message_count: number;
  is_active: boolean;
  attachment_count: number;
  email_access_to_agent: EmailAccessToAgent[];
  // Email details (raw from API)
  direction?: 'incoming' | 'outgoing';
  external_id?: string;
  from?: string;
  from_address?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  body?: string;
  html_body?: string;
  original_body?: string;
  original_html_body?: string;
  received_at?: string;
  sent_at?: string | null;

  // Assignment & status
  assigned_agent?: {
    _id: string;
    name: string;
    login: string;
  };
  visible_to_agents: string[];

  // Approval
  needs_approval: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  email_approved: boolean;
  attachment_approved: boolean;

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

  // CRM
  lead_id?: {
    _id: string;
    contact_name: string;
    email_from: string;
  } | null;
  project_id?: {
    _id: string;
    name: string;
  } | null;
  draftOffers?: {
    offer_ids?: string[];
    lead_id?: string;
    email_template_id?: string;
  };

  // Mail Server
  mailserver_id?: string | null;

  // Metadata
  has_attachments: boolean;
  has_unread?: boolean;
  attachments?: EmailAttachment[];
  incoming_count: number;
  outgoing_count: number;

  // Email processing & status
  matched_by?: string;
  email_status?: string;
  priority?: string;
  category?: string;
  tags?: string[];
  spam_score?: number;
  spam_indicators?: string[];
  is_spam?: boolean;
  sentiment?: string;
  sentiment_score?: number;
  topics?: string[];
  delivery_status?: string;
  delivery_attempts?: number;
  delivery_errors?: any[];
  processed?: boolean;

  // Thread & Reply
  in_reply_to?: string | null;
  references?: string[];
  flagged?: boolean;
  reply_to_email?: string | null;
  reply_count?: number;
  is_reply?: boolean;
  is_forward?: boolean;

  // Collaboration
  internal_comments?: InternalComment[];
  comment_count?: number;
  reminders?: any[];

  // Snooze
  snoozed?: boolean;
  snoozed_until?: string;
  snoozed_by?: string;

  // Labels
  labels?: string[];

  // Agent visibility
  agent_viewed: boolean;
  admin_viewed: boolean;
  admin_viewed_at?: string;
  admin_viewed_by?: string;

  // Archive status
  archived?: boolean;
  status?: string;
  has_draft?: boolean;

  // Workflow history
  workflow_history?: Array<{
    action: string;
    performed_by: string;
    performed_at: string;
    comments?: string;
    _id: string;
  }>;

  // Nested conversation info (from API)
  conversation?: {
    reply_count: number;
    has_replies: boolean;
    latest_reply: any | null;
    replies: any[];
  };

  // Thread emails array (from API)
  thread_emails?: EmailMessage[];

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface EmailFolder {
  id: string;
  name: string;
  icon: string;
  count: number;
  unread_count: number;
  type: 'inbox' | 'sent' | 'starred' | 'snoozed' | 'archived' | 'trash' | 'all';
}

export interface EmailLabel {
  _id: string;
  name: string;
  color: string;
  count: number;
}

export interface CannedResponse {
  _id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
  hotkey?: string;
  created_by: string;
  is_shared: boolean;
}

export interface PresenceUser {
  _id: string;
  name: string;
  login: string;
  avatar?: string;
  is_viewing: boolean;
  is_composing: boolean;
  started_at: string;
}

export interface CollisionWarning {
  emailId: string;
  users: PresenceUser[];
  message: string;
}

// Filter types
export type EmailStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'incoming' | 'outgoing';
export type EmailView = 'inbox' | 'sent' | 'drafts' | 'starred' | 'snoozed' | 'archived' | 'all' | 'trash' | 'pending';

export interface EmailFilters {
  status?: EmailStatus;
  view?: EmailView;
  project_id?: string | null;
  mailserver_id?: string | null;
  search?: string;
  label?: string;
  agent_id?: string;
  stage?: string;
  has_attachments?: boolean;
  is_snoozed?: boolean;
  is_starred?: boolean;
  is_active?: boolean;
  flagged?: boolean;
  is_draft?: boolean;
  has_assigned_agent?: boolean;
  viewed?: boolean;
  date_filter?: string;
}

export interface EmailPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// URL State for routing
export interface UrlEmailState {
  view: 'inbox' | 'sent' | 'drafts' | 'starred' | 'snoozed' | 'archived' | 'all' | 'trash' | 'pending' | null;
  emailId: string | null;
}
