import { format, formatDistanceToNow, parseISO } from 'date-fns';

// Priority color utilities
export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

// Status color utilities
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-blue-500';
    case 'completed':
      return 'bg-green-500';
    case 'pending':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    case 'warning':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
};

// Category mapping utilities
export const mapNotificationCategory = (type?: string): string => {
  switch (type) {
    case 'email':
      return 'email';
    case 'email_comment_mention':
    case 'email_comment_added':
      return 'system'; // Maps to "others" section
    case 'lead_assigned':
    case 'lead_assignment_admin':
    case 'lead_status_changed':
    case 'lead_converted':
    case 'opening_created':
      return 'lead';
    case 'offer_created':
      return 'offer';
    case 'project_created':
    case 'project_updated':
    case 'project_assigned':
      return 'project';
    case 'agent_login':
    case 'agent_logout':
      return 'authentication';
    case 'user_role_changed':
      return 'admin';
    case 'provider_approved':
    case 'provider_rejected':
    case 'provider_payment':
      return 'provider';
    case 'commission_earned':
    case 'revenue_target_met':
      return 'financial';
    case 'system_maintenance':
      return 'system';
    case 'todo_assigned':
    case 'todo_created':
    case 'todo_agent_assignment':
    case 'todo_updated':
      return 'todo';
    default:
      return 'system';
  }
};

export const mapActivityCategory = (subjectType?: string): string => {
  switch ((subjectType || '').toLowerCase()) {
    case 'lead':
    case 'opening':
    case 'reclamation':
      return 'lead';
    case 'offer':
      return 'offer';
    case 'project':
    case 'bank':
      return 'project';
    case 'user':
    case 'team':
    case 'settings':
    case 'system':
    case 'mailservers':
    case 'voipservers':
      return 'admin';
    case 'transaction':
    case 'payment_terms':
    case 'bonus_amount':
      return 'financial';
    case 'source':
      return 'provider';
    default:
      return 'system';
  }
};

// Timestamp formatting utilities
export const formatTimestamp = (timestamp: string) => {
  const date = parseISO(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return formatDistanceToNow(date, { addSuffix: true });
  } else if (diffInHours < 168) {
    // 7 days
    return format(date, 'EEEE, MMM d');
  } else {
    return format(date, 'MMM d, yyyy');
  }
};

// Date range utilities
export const getDateRangeStartDate = (range: string): string | undefined => {
  const now = new Date();

  switch (range) {
    case 'today':
      return format(now, 'yyyy-MM-dd');
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return format(weekAgo, 'yyyy-MM-dd');
    case 'month':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return format(monthAgo, 'yyyy-MM-dd');
    default:
      return undefined;
  }
};
