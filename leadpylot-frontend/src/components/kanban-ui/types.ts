import { TLabel } from "@/services/TaskService";
import { Board } from "@/services/BoardService";

export interface Label {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  color: string;
  boardId?: string; // For future multi-board support
}

export interface Member {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string; // ISO date string
  dueTime?: string; // Time string (e.g., "12:58 PM")
  assignedMembers?: string[]; // Array of member IDs
  reminder?: ReminderOption;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  hideCheckedItems?: boolean;
  assignedMemberId?: string;
  dueDate?: string;
  dueTime?: string;
  isCompleted?: boolean;
}

export interface Comment {
  id: string;
  user: string;
  text: string;
  date: string;
  avatar?: string;
}

export interface Activity {
  id: string;
  type: 'created' | 'status_changed' | 'label_added' | 'label_removed' | 'due_date_set' | 'description_updated' | 'checklist_completed';
  user: string;
  date: string;
  description: string;
  avatar?: string;
}

export interface Email {
  id: string;
  from: string;
  fromEmail: string;
  to: string;
  date: string;
  subject: string;
  snippet: string;
  body: string;
  logo: string;
  isIncoming: boolean;
}

export interface Attachment {
  id: string;
  filename: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  url?: string;
}

export type RecurringOption =
  | 'never'
  | 'daily'
  | 'weekdays' // Monday to Friday
  | 'weekly'
  | 'monthly-day' // Monthly on the Xth day
  | 'monthly-weekday'; // Monthly on the Xth weekday

export type ReminderOption =
  | 'none'
  | 'at-time'
  | '5-minutes'
  | '15-minutes'
  | '1-hour'
  | '2-hours'
  | '1-day'
  | '2-days'
  | '1-week';

// Custom Field Types
export type CustomFieldType =
  | 'text' // Single line text
  | 'textarea' // Multi-line text
  | 'number' // Numeric value
  | 'date' // Date picker
  | 'select' // Dropdown with options
  | 'checkbox' // Boolean
  | 'member' // Reference to member
  | 'label' // Reference to label
  | 'todo'; // Todo/Task list

// Field Definition (template)
export interface CustomFieldDefinition {
  id: string;
  title: string; // User-defined title (e.g., "Priority", "Status", "Department")
  field_type: CustomFieldType;
  boardId?: string; // For future multi-board support
  options?: string[]; // For 'select' type - dropdown options
  required?: boolean;
  defaultValue?: any;
  createdAt: string;
}

// Field Value (actual value on a task)
export interface CustomFieldValue {
  fieldId: string; // Reference to CustomFieldDefinition.id
  value: any; // The actual value (string, number, date, etc.)
}

export interface CardDates {
  startDate?: string; // ISO date string
  dueDate?: string; // ISO date string with time
  startTime?: string; // Optional time for start date (e.g., "09:00")
  dueTime?: string; // Time for due date (e.g., "18:30")
  recurring?: RecurringOption;
  reminder?: ReminderOption;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  labels: TLabel[];
  members: string[];
  checklist: ChecklistItem[]; // Keep for backward compatibility
  checklists?: Checklist[]; // New checklists structure
  comments: Comment[];
  emails: Email[];
  attachments?: Attachment[];
  coverImage?: string;
  dueDate?: string; // Keep for backward compatibility
  dates?: CardDates; // New dates structure
  customFields?: CustomFieldValue[]; // Array of custom field values
  status: string;
  isCompleted: boolean;
  leadId: string;
  task_type?: string; // Task type: 'lead', 'opening', etc.
  agent: string;
  project: string;
  contact: string;
  phone: string;
  email: string;
  revenue: string;
  source: string;
}

export interface List {
  id: string;
  title: string;
  cardIds: string[];
  backgroundColor?: string;
  meta?: {
    total: number;
    taskCount?: number;
    totalBoardTaskCount?: number;
    page: number;
    limit: number;
    pages: number;
    offset?: number;
    hasMore?: boolean;
    accessLevel?: string;
  };
}

export interface BoardData {
  board?: Board;
  cards: Record<string, Task>;
  columns: Record<string, List>;
  columnOrder: string[];
  totalBoardTaskCount?: number;
}

export const LABEL_COLORS: Record<string, string> = {
  green: '#4bce97',
  yellow: '#f5cd47',
  orange: '#fea362',
  red: '#f87168',
  purple: '#9f8fef',
  blue: '#579dff',
  sky: '#6cc3e0',
};
