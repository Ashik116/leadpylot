/**
 * Internal Comment Types
 * For team collaboration on emails
 */

export interface CommentUser {
  _id: string;
  name: string;
  login: string;
  avatar?: string;
}

export interface CommentAttachment {
  _id: string;
  filename: string;
  filetype: string;
  name?: string;
  size?: number;
  path?: string;
  metadata?: {
    original_filename?: string;
  };
  url?: string;
  created_at?: string;
  document_id?: string;
}

export interface EditHistoryEntry {
  _id: string;
  text: string;
  mentioned_users: string[];
  attachments?: CommentAttachment[];
  edited_at: string;
  edited_by: {
    _id: string;
    info?: {
      name: string;
    };
    login: string;
  };
}

export interface InternalComment {
  _id: string;
  email_id: string;
  user_id: string;
  user: CommentUser;
  text: string;
  html_text?: string;
  mentioned_users: string[];
  mentions?: CommentUser[];
  attachments?: CommentAttachment[];
  created_at: string;
  updated_at?: string;
  edited: boolean;
  is_internal: true;
  edit_history?: EditHistoryEntry[];
}

export interface CreateCommentInput {
  email_id: string;
  text: string;
  mentioned_users?: string[];
  attachment_ids?: string[];
}

export interface UpdateCommentInput {
  text?: string;
  mentioned_users?: string[];
  attachment_ids?: string[];
}

export interface CommentNotification {
  _id: string;
  type: 'mention' | 'reply' | 'new_comment';
  comment: InternalComment;
  email_id: string;
  email_subject: string;
  read: boolean;
  created_at: string;
}

