/**
 * Notification Configuration
 * Centralized configuration for notification types, navigation, and UI
 * 
 * ARCHITECTURE:
 * - Single source of truth for frontend notification handling
 * - Configuration-driven navigation (click-to-navigate)
 * - Type-safe with TypeScript interfaces
 * 
 * To add a new notification type:
 * 1. Add the type to NotificationType union
 * 2. Add configuration to NOTIFICATION_CONFIG
 * 3. That's it! Navigation and UI will work automatically
 */

import { IconType } from 'react-icons';
import {
  HiOutlineUserAdd,
  HiOutlineDocumentText,
  HiOutlineFolderOpen,
  HiOutlineCheckCircle,
  HiOutlineCreditCard,
  HiOutlineMail,
  HiOutlineLogin,
  HiOutlineLogout,
  HiOutlineBell,
  HiOutlineUsers,
  HiOutlineRefresh,
  HiOutlineTrendingUp,
  HiOutlineStar,
  HiOutlineCalculator,
  HiOutlineMailOpen,
  HiOutlineAtSymbol,
  HiOutlineChatAlt2,
  HiOutlineFolderAdd,
  HiOutlineClipboardCheck,
  HiOutlineExclamation,
  HiOutlineDocumentAdd,
  HiOutlineShieldCheck,
  HiOutlineBriefcase,
  HiOutlineCog,
  HiOutlineViewBoards,
  HiOutlineClipboardList,
} from 'react-icons/hi';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * All supported notification types
 */
export type NotificationType =
  // Lead Management
  | 'lead_assigned'
  | 'lead_assignment_admin'
  | 'lead_transferred'
  | 'bulk_lead_transferred'
  | 'lead_status_changed'
  | 'lead_converted'
  // Business Process
  | 'offer_created'
  | 'opening_created'
  | 'confirmation_created'
  | 'payment_voucher_created'
  | 'netto1_created'
  | 'netto2_created'
  // Email & Communication
  | 'email'
  | 'email_approved'
  | 'email_agent_assigned'
  | 'email_comment_mention'
  | 'email_comment_added'
  // Authentication
  | 'agent_login'
  | 'agent_logout'
  // Project
  | 'project_created'
  | 'project_updated'
  | 'project_assigned'
  // Task
  | 'task_assigned'
  | 'task_overdue'
  // Todo/Kanban
  | 'todo_created'
  | 'todo_assigned'
  | 'todo_completed'
  | 'todo_updated'
  | 'todo_agent_assignment'
  | 'todo_completed_admin'
  // Document
  | 'document_uploaded'
  | 'document_signed'
  // System
  | 'system_maintenance'
  | 'security_alert';

/**
 * Notification categories for filtering/grouping
 */
export type NotificationCategory =
  | 'leads'
  | 'offers'
  | 'email'
  | 'login'
  | 'project'
  | 'task'
  | 'todo'
  | 'document'
  | 'system'
  | 'other';

/**
 * Navigation configuration for a notification type
 */
export interface NotificationNavigation {
  /** Route pattern with param placeholders (e.g., '/dashboards/leads/:leadId') */
  route: string;
  /** List of params to extract from notification data */
  params: string[];
  /** Tab to open on the target page */
  tab?: string | null;
  /** Element to highlight/scroll to on the target page */
  highlight?: {
    type: string;
    param: string;
  } | null;
  /** Fallback route if required params are missing */
  fallback: string;
}

/**
 * UI configuration for a notification type
 */
export interface NotificationUI {
  /** React icon component */
  icon: IconType;
  /** Tailwind text color class */
  color: string;
  /** Tailwind background color class */
  bgColor: string;
  /** Whether to show action required badge */
  showActionBadge: boolean;
}

/**
 * Complete configuration for a notification type
 */
export interface NotificationTypeConfig {
  type: NotificationType;
  category: NotificationCategory;
  label: string;
  navigation: NotificationNavigation;
  ui: NotificationUI;
}

// ============================================
// NOTIFICATION CONFIGURATION REGISTRY
// ============================================

export const NOTIFICATION_CONFIG: Record<NotificationType, NotificationTypeConfig> = {
  // ============================================
  // LEAD MANAGEMENT
  // ============================================
  lead_assigned: {
    type: 'lead_assigned',
    category: 'leads',
    label: 'Lead Assigned',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: null,
      highlight: null,
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineUserAdd,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      showActionBadge: true
    }
  },

  lead_assignment_admin: {
    type: 'lead_assignment_admin',
    category: 'leads',
    label: 'Lead Assignment',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: null,
      highlight: null,
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineUserAdd,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      showActionBadge: false
    }
  },

  lead_transferred: {
    type: 'lead_transferred',
    category: 'leads',
    label: 'Lead Transferred',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: null,
      highlight: null,
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineRefresh,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: true
    }
  },

  bulk_lead_transferred: {
    type: 'bulk_lead_transferred',
    category: 'leads',
    label: 'Bulk Transfer',
    navigation: {
      route: '/dashboards/projects/:projectId',
      params: ['projectId'],
      tab: 'leads',
      highlight: null,
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineUsers,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: true
    }
  },

  lead_status_changed: {
    type: 'lead_status_changed',
    category: 'leads',
    label: 'Status Changed',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: null,
      highlight: null,
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineTrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: false
    }
  },

  lead_converted: {
    type: 'lead_converted',
    category: 'leads',
    label: 'Lead Converted',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: null,
      highlight: null,
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineStar,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: true
    }
  },

  // ============================================
  // BUSINESS PROCESS (Offers, Openings, etc.)
  // ============================================
  offer_created: {
    type: 'offer_created',
    category: 'offers',
    label: 'New Offer',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: 'offers',
      highlight: { type: 'Offer', param: 'offerId' },
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineDocumentText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: true
    }
  },

  opening_created: {
    type: 'opening_created',
    category: 'offers',
    label: 'New Opening',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: 'offers',
      highlight: { type: 'Opening', param: 'openingId' },
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineFolderOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: true
    }
  },

  confirmation_created: {
    type: 'confirmation_created',
    category: 'offers',
    label: 'Confirmation',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: 'offers',
      highlight: { type: 'Confirmation', param: 'confirmationId' },
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineCheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: true
    }
  },

  payment_voucher_created: {
    type: 'payment_voucher_created',
    category: 'offers',
    label: 'Payment',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: 'offers',
      highlight: { type: 'Payment', param: 'paymentId' },
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineCreditCard,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      showActionBadge: true
    }
  },

  netto1_created: {
    type: 'netto1_created',
    category: 'offers',
    label: 'Netto 1',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: 'offers',
      highlight: { type: 'Netto1', param: 'netto1Id' },
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineCalculator,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: true
    }
  },

  netto2_created: {
    type: 'netto2_created',
    category: 'offers',
    label: 'Netto 2',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: 'offers',
      highlight: { type: 'Netto2', param: 'netto2Id' },
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineCalculator,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      showActionBadge: true
    }
  },

  // ============================================
  // EMAIL & COMMUNICATION
  // ============================================
  email: {
    type: 'email',
    category: 'email',
    label: 'Email',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: 'emails',
      highlight: { type: 'Email', param: 'emailId' },
      fallback: '/dashboards/email-system'
    },
    ui: {
      icon: HiOutlineMail,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      showActionBadge: false
    }
  },

  email_approved: {
    type: 'email_approved',
    category: 'email',
    label: 'Email Approved',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: 'emails',
      highlight: null,
      fallback: '/dashboards/email-system'
    },
    ui: {
      icon: HiOutlineMailOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: false
    }
  },

  email_agent_assigned: {
    type: 'email_agent_assigned',
    category: 'email',
    label: 'Email Assigned',
    navigation: {
      route: '/dashboards/email-system',
      params: [],
      tab: null,
      highlight: null,
      fallback: '/dashboards/email-system'
    },
    ui: {
      icon: HiOutlineMail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      showActionBadge: true
    }
  },

  email_comment_mention: {
    type: 'email_comment_mention',
    category: 'email',
    label: 'Mentioned',
    navigation: {
      route: '/dashboards/email-system',
      params: [],
      tab: null,
      highlight: { type: 'Email', param: 'emailId' },
      fallback: '/dashboards/email-system'
    },
    ui: {
      icon: HiOutlineAtSymbol,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      showActionBadge: true
    }
  },

  email_comment_added: {
    type: 'email_comment_added',
    category: 'email',
    label: 'Comment Added',
    navigation: {
      route: '/dashboards/email-system',
      params: [],
      tab: null,
      highlight: { type: 'Email', param: 'emailId' },
      fallback: '/dashboards/email-system'
    },
    ui: {
      icon: HiOutlineChatAlt2,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      showActionBadge: false
    }
  },

  // ============================================
  // AUTHENTICATION
  // ============================================
  agent_login: {
    type: 'agent_login',
    category: 'login',
    label: 'Agent Login',
    navigation: {
      route: '/dashboards/users',
      params: [],
      tab: null,
      highlight: null,
      fallback: '/dashboards'
    },
    ui: {
      icon: HiOutlineLogin,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      showActionBadge: false
    }
  },

  agent_logout: {
    type: 'agent_logout',
    category: 'login',
    label: 'Agent Logout',
    navigation: {
      route: '/dashboards/users',
      params: [],
      tab: null,
      highlight: null,
      fallback: '/dashboards'
    },
    ui: {
      icon: HiOutlineLogout,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      showActionBadge: false
    }
  },

  // ============================================
  // PROJECT MANAGEMENT
  // ============================================
  project_created: {
    type: 'project_created',
    category: 'project',
    label: 'New Project',
    navigation: {
      route: '/dashboards/projects/:projectId',
      params: ['projectId'],
      tab: null,
      highlight: null,
      fallback: '/dashboards/projects'
    },
    ui: {
      icon: HiOutlineFolderAdd,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      showActionBadge: false
    }
  },

  project_updated: {
    type: 'project_updated',
    category: 'project',
    label: 'Project Updated',
    navigation: {
      route: '/dashboards/projects/:projectId',
      params: ['projectId'],
      tab: null,
      highlight: null,
      fallback: '/dashboards/projects'
    },
    ui: {
      icon: HiOutlineBriefcase,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      showActionBadge: false
    }
  },

  project_assigned: {
    type: 'project_assigned',
    category: 'project',
    label: 'Project Assigned',
    navigation: {
      route: '/dashboards/projects/:projectId',
      params: ['projectId'],
      tab: null,
      highlight: null,
      fallback: '/dashboards/projects'
    },
    ui: {
      icon: HiOutlineUserAdd,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: true
    }
  },

  // ============================================
  // TASK MANAGEMENT
  // ============================================
  task_assigned: {
    type: 'task_assigned',
    category: 'task',
    label: 'Task Assigned',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: 'tasks',
      highlight: { type: 'Task', param: 'taskId' },
      fallback: '/dashboards/tasks'
    },
    ui: {
      icon: HiOutlineClipboardCheck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      showActionBadge: true
    }
  },

  task_overdue: {
    type: 'task_overdue',
    category: 'task',
    label: 'Task Overdue',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: 'tasks',
      highlight: { type: 'Task', param: 'taskId' },
      fallback: '/dashboards/tasks'
    },
    ui: {
      icon: HiOutlineExclamation,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      showActionBadge: true
    }
  },

  // ============================================
  // TODO/KANBAN MANAGEMENT
  // ============================================
  todo_created: {
    type: 'todo_created',
    category: 'todo',
    label: 'New Ticket',
    navigation: {
      route: '/dashboards/kanban',
      params: [],
      tab: null,
      highlight: { type: 'Task', param: 'taskId' },
      fallback: '/dashboards/kanban'
    },
    ui: {
      icon: HiOutlineViewBoards,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      showActionBadge: true
    }
  },

  todo_assigned: {
    type: 'todo_assigned',
    category: 'todo',
    label: 'Ticket Assigned',
    navigation: {
      route: '/dashboards/kanban',
      params: [],
      tab: null,
      highlight: { type: 'Task', param: 'taskId' },
      fallback: '/dashboards/kanban'
    },
    ui: {
      icon: HiOutlineClipboardList,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      showActionBadge: true
    }
  },

  todo_agent_assignment: {
    type: 'todo_agent_assignment',
    category: 'todo',
    label: 'Ticket Assigned',
    navigation: {
      route: '/dashboards/kanban',
      params: [],
      tab: null,
      highlight: { type: 'Task', param: 'taskId' },
      fallback: '/dashboards/kanban'
    },
    ui: {
      icon: HiOutlineClipboardList,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      showActionBadge: false
    }
  },

  todo_completed: {
    type: 'todo_completed',
    category: 'todo',
    label: 'Ticket Completed',
    navigation: {
      route: '/dashboards/kanban',
      params: [],
      tab: null,
      highlight: { type: 'Task', param: 'taskId' },
      fallback: '/dashboards/kanban'
    },
    ui: {
      icon: HiOutlineCheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: false
    }
  },

  todo_completed_admin: {
    type: 'todo_completed_admin',
    category: 'todo',
    label: 'Ticket Completed',
    navigation: {
      route: '/dashboards/kanban',
      params: [],
      tab: null,
      highlight: { type: 'Task', param: 'taskId' },
      fallback: '/dashboards/kanban'
    },
    ui: {
      icon: HiOutlineCheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: false
    }
  },

  todo_updated: {
    type: 'todo_updated',
    category: 'todo',
    label: 'Ticket Updated',
    navigation: {
      route: '/dashboards/kanban',
      params: [],
      tab: null,
      highlight: { type: 'Task', param: 'taskId' },
      fallback: '/dashboards/kanban'
    },
    ui: {
      icon: HiOutlineViewBoards,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: false
    }
  },

  // ============================================
  // DOCUMENT MANAGEMENT
  // ============================================
  document_uploaded: {
    type: 'document_uploaded',
    category: 'document',
    label: 'Document Uploaded',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: 'documents',
      highlight: { type: 'Document', param: 'documentId' },
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineDocumentAdd,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      showActionBadge: false
    }
  },

  document_signed: {
    type: 'document_signed',
    category: 'document',
    label: 'Document Signed',
    navigation: {
      route: '/dashboards/leads/:leadId',
      params: ['leadId'],
      tab: 'documents',
      highlight: { type: 'Document', param: 'documentId' },
      fallback: '/dashboards/leads'
    },
    ui: {
      icon: HiOutlineDocumentText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      showActionBadge: true
    }
  },

  // ============================================
  // SYSTEM
  // ============================================
  system_maintenance: {
    type: 'system_maintenance',
    category: 'system',
    label: 'Maintenance',
    navigation: {
      route: '/dashboards',
      params: [],
      tab: null,
      highlight: null,
      fallback: '/dashboards'
    },
    ui: {
      icon: HiOutlineCog,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      showActionBadge: true
    }
  },

  security_alert: {
    type: 'security_alert',
    category: 'system',
    label: 'Security Alert',
    navigation: {
      route: '/dashboards/settings/security',
      params: [],
      tab: null,
      highlight: null,
      fallback: '/dashboards/settings'
    },
    ui: {
      icon: HiOutlineShieldCheck,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      showActionBadge: true
    }
  }
};

// ============================================
// DEFAULT CONFIGURATION
// ============================================

/**
 * Default configuration for unknown notification types
 */
export const DEFAULT_NOTIFICATION_CONFIG: NotificationTypeConfig = {
  type: 'lead_assigned', // fallback type
  category: 'other',
  label: 'Notification',
  navigation: {
    route: '/dashboards',
    params: [],
    tab: null,
    highlight: null,
    fallback: '/dashboards'
  },
  ui: {
    icon: HiOutlineBell,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    showActionBadge: false
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get notification configuration by type
 * @param type - Notification type
 * @returns Configuration object
 */
export const getNotificationConfig = (type: string): NotificationTypeConfig => {
  return NOTIFICATION_CONFIG[type as NotificationType] || DEFAULT_NOTIFICATION_CONFIG;
};

/**
 * Get all notification types for a specific category
 * @param category - Category to filter by
 * @returns Array of notification configs
 */
export const getTypesByCategory = (category: NotificationCategory): NotificationTypeConfig[] => {
  return Object.values(NOTIFICATION_CONFIG).filter(config => config.category === category);
};

/**
 * Get all categories
 * @returns Array of unique categories
 */
export const getAllCategories = (): NotificationCategory[] => {
  return [...new Set(Object.values(NOTIFICATION_CONFIG).map(config => config.category))];
};

/**
 * Map category to display label
 */
export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  leads: 'Leads',
  offers: 'Offers',
  email: 'Email',
  login: 'Login',
  project: 'Projects',
  task: 'Tasks',
  todo: 'Kanban',
  document: 'Documents',
  system: 'System',
  other: 'Other'
};

/**
 * Build navigation URL from notification data
 * @param type - Notification type
 * @param data - Notification data containing IDs
 * @returns Navigation object with url, tab, and highlight info
 */
export const buildNavigationUrl = (
  type: string,
  data: Record<string, any>
): { url: string; tab: string | null; highlight: { type: string; id: string } | null } => {
  const config = getNotificationConfig(type);
  const { route, params, tab, highlight, fallback } = config.navigation;

  // Build URL with params
  let url = route;
  for (const param of params) {
    const value = data[param] || data.metadata?.[param] || data.data?.[param];
    if (!value) {
      return { url: fallback, tab: null, highlight: null };
    }
    url = url.replace(`:${param}`, String(value));
  }

  // Build highlight info
  let highlightInfo: { type: string; id: string } | null = null;
  if (highlight) {
    const highlightId = data[highlight.param] || data.metadata?.[highlight.param];
    if (highlightId) {
      highlightInfo = {
        type: highlight.type,
        id: String(highlightId)
      };
    }
  }

  return { url, tab: tab || null, highlight: highlightInfo };
};

/**
 * Check if a notification type is valid
 * @param type - Type to check
 * @returns Boolean
 */
export const isValidNotificationType = (type: string): type is NotificationType => {
  return type in NOTIFICATION_CONFIG;
};
