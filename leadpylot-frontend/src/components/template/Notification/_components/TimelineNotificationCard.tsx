'use client';

/**
 * TimelineNotificationCard Component
 * 
 * A compact notification card for the drawer timeline view.
 * Displays notification type, message, timestamp, and unread indicator.
 * 
 * Features:
 * - Color-coded icons based on notification type
 * - Emoji icons for business details (lead, amount, bank, bonus)
 * - Unread dot indicator
 * - Click to navigate to related page
 * 
 * @example
 * <TimelineNotificationCard
 *   notification={notificationData}
 *   onClick={() => handleClick(notification)}
 *   userRole="Admin"
 * />
 */

import React from 'react';
import classNames from '@/utils/classNames';
import {
  HiOutlineUserAdd,
  HiOutlineUsers,
  HiOutlineRefresh,
  HiOutlineDocumentText,
  HiOutlineFolderOpen,
  HiOutlineCheckCircle,
  HiOutlineCreditCard,
  HiOutlineMail,
  HiOutlineLogin,
  HiOutlineLogout,
  HiOutlineAtSymbol,
  HiOutlineChatAlt2,
  HiOutlineFolderAdd,
  HiOutlineClipboardList,
  HiOutlineClipboardCheck,
  HiOutlineBell,
  HiChevronRight,
} from 'react-icons/hi';
import { extractBusinessDetails, isBusinessNotification } from '../TabbedNotificationBody';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface NotificationItem {
  id: string;
  target?: string;
  description?: string;
  date?: string;
  timestamp?: string;
  readed?: boolean;
  read?: boolean;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  isRealtime?: boolean;
  notificationType?: string;
  leadId?: string;
  projectId?: string;
  offerId?: string;
  metadata?: {
    formattedMessage?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

interface TimelineNotificationCardProps {
  /** Notification data object */
  notification: NotificationItem;
  /** Click handler - typically navigates to related page */
  onClick: () => void;
  /** User role for conditional display (Admin sees agent names) */
  userRole?: string;
}

interface NotificationStyle {
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  dotColor: string;
  hoverBg: string;
}

// ============================================
// CONSTANTS - Notification Type Labels
// ============================================

/**
 * Human-readable labels for notification types
 * Maps snake_case backend types to display labels
 */
const TYPE_LABELS: Record<string, string> = {
  // Lead notifications
  lead_assigned: 'Lead Assigned',
  lead_assignment_admin: 'Lead Assignment',
  lead_transferred: 'Lead Transferred',
  bulk_lead_transferred: 'Bulk Transfer',
  
  // Business process notifications
  offer_created: 'New Offer',
  offer_created_admin: 'New Offer',
  opening_created: 'Opening Created',
  opening_created_admin: 'Opening Created',
  confirmation_created: 'Confirmation',
  payment_voucher_created: 'Payment',
  netto1_created: 'Netto 1',
  netto2_created: 'Netto 2',
  
  // Email notifications
  email: 'New Email',
  email_received: 'New Email',
  email_system_received: 'New Email',
  email_agent_assigned: 'Email Assigned',
  email_comment_mention: 'Mentioned',
  email_comment_added: 'New Comment',
  email_approved: 'Email Approved',
  
  // Authentication notifications
  agent_login: 'Login',
  agent_logout: 'Logout',
  
  // Task/Ticket notifications
  todo_created: 'New Ticket',
  todo_assigned: 'Ticket Assigned',
  todo_agent_assignment: 'Ticket Assignment',
  todo_completed: 'Ticket Completed',
  todo_completed_admin: 'Ticket Completed',
  todo_updated: 'Ticket Updated',
  
  // Project notifications
  project_created: 'New Project',
  project_assigned: 'Project Assigned',
  project_updated: 'Project Updated',
  
  // Appointment notifications
  appointment_created: 'Appointment',
  appointment_updated: 'Appointment Updated',
  appointment_deleted: 'Appointment Cancelled',
};

// ============================================
// CONSTANTS - Notification Styles
// ============================================

/**
 * Visual styles for each notification type
 * - icon: React icon component
 * - bgColor: Background color for icon container
 * - dotColor: Unread indicator dot color
 * - hoverBg: Background color on hover
 */
const NOTIFICATION_STYLES: Record<string, NotificationStyle> = {
  // Lead - Blue shades
  lead_assigned: {
    icon: HiOutlineUserAdd,
    bgColor: 'bg-blue-500',
    dotColor: 'bg-blue-500',
    hoverBg: 'hover:bg-blue-50/50',
  },
  lead_assignment_admin: {
    icon: HiOutlineUserAdd,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },
  lead_transferred: {
    icon: HiOutlineRefresh,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },
  bulk_lead_transferred: {
    icon: HiOutlineUsers,
    bgColor: 'bg-pink-500',
    dotColor: 'bg-pink-500',
    hoverBg: 'hover:bg-pink-50/50',
  },

  // Business - Green/Purple/Amber shades
  offer_created: {
    icon: HiOutlineDocumentText,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },
  offer_created_admin: {
    icon: HiOutlineDocumentText,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },
  opening_created: {
    icon: HiOutlineFolderOpen,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },
  opening_created_admin: {
    icon: HiOutlineFolderOpen,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },
  confirmation_created: {
    icon: HiOutlineCheckCircle,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },
  payment_voucher_created: {
    icon: HiOutlineCreditCard,
    bgColor: 'bg-amber-500',
    dotColor: 'bg-amber-500',
    hoverBg: 'hover:bg-amber-50/50',
  },
  netto1_created: {
    icon: HiOutlineDocumentText,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },
  netto2_created: {
    icon: HiOutlineDocumentText,
    bgColor: 'bg-cyan-500',
    dotColor: 'bg-cyan-500',
    hoverBg: 'hover:bg-cyan-50/50',
  },

  // Email - Cyan/Blue shades
  email: {
    icon: HiOutlineMail,
    bgColor: 'bg-cyan-500',
    dotColor: 'bg-cyan-500',
    hoverBg: 'hover:bg-cyan-50/50',
  },
  email_received: {
    icon: HiOutlineMail,
    bgColor: 'bg-cyan-500',
    dotColor: 'bg-cyan-500',
    hoverBg: 'hover:bg-cyan-50/50',
  },
  email_system_received: {
    icon: HiOutlineMail,
    bgColor: 'bg-cyan-500',
    dotColor: 'bg-cyan-500',
    hoverBg: 'hover:bg-cyan-50/50',
  },
  email_agent_assigned: {
    icon: HiOutlineMail,
    bgColor: 'bg-blue-500',
    dotColor: 'bg-blue-500',
    hoverBg: 'hover:bg-blue-50/50',
  },
  email_comment_mention: {
    icon: HiOutlineAtSymbol,
    bgColor: 'bg-orange-500',
    dotColor: 'bg-orange-500',
    hoverBg: 'hover:bg-orange-50/50',
  },
  email_comment_added: {
    icon: HiOutlineChatAlt2,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },
  email_approved: {
    icon: HiOutlineCheckCircle,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },

  // Authentication - Gray (subdued)
  agent_login: {
    icon: HiOutlineLogin,
    bgColor: 'bg-slate-400',
    dotColor: 'bg-slate-400',
    hoverBg: 'hover:bg-slate-50',
  },
  agent_logout: {
    icon: HiOutlineLogout,
    bgColor: 'bg-slate-400',
    dotColor: 'bg-slate-400',
    hoverBg: 'hover:bg-slate-50',
  },

  // Tasks/Tickets - Violet
  todo_created: {
    icon: HiOutlineClipboardList,
    bgColor: 'bg-blue-500',
    dotColor: 'bg-blue-500',
    hoverBg: 'hover:bg-blue-50/50',
  },
  todo_assigned: {
    icon: HiOutlineClipboardList,
    bgColor: 'bg-violet-500',
    dotColor: 'bg-violet-500',
    hoverBg: 'hover:bg-violet-50/50',
  },
  todo_agent_assignment: {
    icon: HiOutlineClipboardList,
    bgColor: 'bg-violet-500',
    dotColor: 'bg-violet-500',
    hoverBg: 'hover:bg-violet-50/50',
  },
  todo_completed: {
    icon: HiOutlineClipboardCheck,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },
  todo_completed_admin: {
    icon: HiOutlineClipboardCheck,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },
  todo_updated: {
    icon: HiOutlineClipboardList,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },

  // Projects - Green/Teal
  project_created: {
    icon: HiOutlineFolderAdd,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },
  project_assigned: {
    icon: HiOutlineFolderAdd,
    bgColor: 'bg-green-500',
    dotColor: 'bg-green-500',
    hoverBg: 'hover:bg-green-50/50',
  },

  // Default fallback
  default: {
    icon: HiOutlineBell,
    bgColor: 'bg-gray-400',
    dotColor: 'bg-gray-400',
    hoverBg: 'hover:bg-gray-50',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get style configuration for a notification type
 */
const getStyle = (type: string): NotificationStyle => {
  return NOTIFICATION_STYLES[type] || NOTIFICATION_STYLES.default;
};

/**
 * Get human-readable label for a notification type
 * Falls back to title-cased type if not found
 */
const getLabel = (type: string): string => {
  return TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Format timestamp to compact relative time
 * @returns "now", "2m", "1h", "3d", or "Jan 5"
 */
const formatTime = (dateValue: string | number | undefined): string => {
  if (!dateValue) return '';

  const date = typeof dateValue === 'string' 
    ? new Date(dateValue) 
    : new Date(dateValue > 10000000000 ? dateValue : dateValue * 1000);

  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return 'now';

  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Business notification description with emoji icons
 * Line 1: agent → lead name, amount
 * Line 2: bank (under lead), bonus (under amount)
 */
const BusinessDescription: React.FC<{
  notification: NotificationItem;
  businessDetails: ReturnType<typeof extractBusinessDetails>;
  userRole: string;
}> = ({ notification, businessDetails, userRole }) => {
  const hasBank = businessDetails.bank && businessDetails.bank !== 'N/A';
  const hasBonus = businessDetails.bonus && businessDetails.bonus !== 'N/A';
  const hasSecondLine = hasBank || hasBonus;

  return (
    <div className="flex flex-col gap-0.5 text-xs text-gray-600">
      {/* Line 1: Agent → Lead Name, Amount */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 truncate">
          {/* Agent name (Admin only) */}
          {userRole === 'Admin' && notification.target && (
            <span className="font-medium shrink-0">{notification.target} →</span>
          )}

          {/* Lead name */}
          {businessDetails.leadName && businessDetails.leadName !== 'Unknown Lead' && (
            <span className="flex items-center gap-0.5 truncate">
              <span className="shrink-0">👤</span>
              <span className="font-medium truncate">{businessDetails.leadName}</span>
            </span>
          )}
        </div>

        {/* Investment amount */}
        {businessDetails.amount && businessDetails.amount !== 'N/A' && (
          <span className="flex items-center gap-0.5 shrink-0 ml-2">
            <span>💰</span>
            <span>{businessDetails.amount}</span>
          </span>
        )}
      </div>

      {/* Line 2: Bank (under lead), Bonus (under amount) */}
      {hasSecondLine && (
        <div className="flex items-center justify-between">
          {/* Bank name */}
          {hasBank ? (
            <span
              className="flex items-center gap-0.5 truncate max-w-[160px]"
              title={businessDetails.bank}
            >
              <span className="shrink-0">🏦</span>
              <span className="truncate">{businessDetails.bank}</span>
            </span>
          ) : (
            <span />
          )}

          {/* Bonus (highlighted in green) */}
          {hasBonus && (
            <span className="flex items-center gap-0.5 text-green-600 shrink-0 ml-2">
              <span>🎁</span>
              <span>{businessDetails.bonus}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Simple text description for non-business notifications
 */
const SimpleDescription: React.FC<{ message: string }> = ({ message }) => (
  <p className="text-xs text-gray-600 truncate">{message}</p>
);

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * Compact notification card for timeline/drawer view
 */
const TimelineNotificationCard: React.FC<TimelineNotificationCardProps> = ({
  notification,
  onClick,
  userRole = 'Admin',
}) => {
  // Get notification type and styles
  const notificationType = notification.notificationType || '';
  const style = getStyle(notificationType);
  const Icon = style.icon;

  // Determine read status
  const isRead = notification.read || notification.readed;

  // Check if business notification and extract details
  const isBusiness = isBusinessNotification(notificationType);
  const businessDetails = isBusiness ? extractBusinessDetails(notification as any) : null;

  // Get timestamp and message
  const timestamp = notification.timestamp || notification.metadata?.timestamp || notification.date;
  const message = notification.metadata?.formattedMessage || notification.description || '';

  return (
    <div
      onClick={onClick}
      className={classNames(
        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-all',
        style.hoverBg
      )}
    >
      {/* Icon Container */}
      <div
        className={classNames(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
          style.bgColor
        )}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header: Title + Unread Dot + Time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {getLabel(notificationType)}
            </span>
            {/* Unread indicator dot */}
            {!isRead && (
              <span className={classNames('w-2 h-2 rounded-full shrink-0', style.dotColor)} />
            )}
          </div>
          <span className="text-xs text-gray-400 shrink-0">{formatTime(timestamp)}</span>
        </div>

        {/* Description */}
        <div className="mt-0.5">
          {isBusiness && businessDetails ? (
            <BusinessDescription
              notification={notification}
              businessDetails={businessDetails}
              userRole={userRole}
            />
          ) : (
            <SimpleDescription message={message} />
          )}
        </div>
      </div>

      {/* Arrow Indicator */}
      <HiChevronRight className="w-4 h-4 shrink-0 text-gray-400" />
    </div>
  );
};

export default TimelineNotificationCard;
