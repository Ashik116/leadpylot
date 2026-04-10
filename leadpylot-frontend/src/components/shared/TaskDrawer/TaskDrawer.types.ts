/**
 * Type definitions for TaskDrawer component
 */

export type TaskFilter = 'all' | 'pending' | 'completed';
export type TaskPriority = number | 'low' | 'medium' | 'high';
export type EmailDirection = 'incoming' | 'outgoing';

export interface TodoTypeId {
  _id: string;
  todoTypeId: string | { _id: string; name?: string; description?: string };
  isDone: boolean;
}

export interface Task {
  _id: string;
  message: string; // The actual field name in the database
  todo_message?: string; // Backup field name (might be used elsewhere)
  isDone: boolean;
  priority: TaskPriority; // Database uses numbers 1-5
  due_date?: string;
  email_id?: string;
  lead_id?: string | { _id: string; contact_name?: string; email_from?: string; phone?: string }; // Can be string or populated object
  assigned_to?: {
    _id: string;
    login: string;
  };
  creator_id?: {
    _id: string;
    login: string;
  };
  created_by?: {
    _id: string;
    login: string;
  }; // Legacy field, prefer creator_id
  createdAt: string;
  updatedAt?: string;
  email_task_type?: string;
  type?: 'Todo' | 'Ticket'; // Type of todo - Ticket when assigned, Todo when not assigned
  completion_duration?: string; // Human-readable duration from creation to completion
  dateOfDone?: string; // Date when the todo was marked as done
  todoTypesids?: TodoTypeId[]; // Array of sub-tasks/todo types
  documents_ids?: string[]; // Array of document IDs
  admin_only?: boolean; // Whether task is admin-only
  active?: boolean; // Whether task is active
}

export interface EmailAttachment {
  document_id: string;
  filename: string;
  size: number;
  mime_type: string;
  approved: boolean;
}

export interface EmailThread {
  _id: string;
  subject: string;
  from: string;
  from_address: string;
  body: string;
  html_body: string;
  received_at?: string;
  sent_at?: string;
  direction: EmailDirection;
  attachments?: EmailAttachment[];
}

export interface InternalComment {
  _id: string;
  text: string;
  user: {
    _id: string;
    name: string;
    login: string;
  };
  created_at: string;
}

export interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPendingCountChange?: (count: number) => void;
}

export interface MyTasksResponse {
  data: Task[];
  meta?: {
    pending?: number;
    total?: number;
  };
}

export interface EmailThreadResponse {
  status: 'success';
  data: {
    thread_id: string;
    emails: EmailThread[];
    participants?: any[];
    email_count?: number;
  };
}

export interface EmailCommentsResponse {
  data?: InternalComment[];
  comments?: InternalComment[];
}
