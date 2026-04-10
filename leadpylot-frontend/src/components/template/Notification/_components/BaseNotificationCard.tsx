/**
 * Base Notification Card Component
 * A composable, reusable notification card with slot pattern for customization
 * 
 * FEATURES:
 * - Configuration-driven rendering from notification.config.ts
 * - Slot pattern for header, content, footer customization
 * - Built-in navigation with useNotificationRouter
 * - Action required badge display
 * - Read/unread visual states
 * - Realtime indicator support
 */

import React from 'react';
import classNames from '@/utils/classNames';
import { 
  useNotificationRouter, 
  getNotificationIcon, 
  getNotificationColors,
  shouldShowActionBadge,
  type NotificationNavigationData 
} from '@/hooks/useNotificationRouter';
import { getNotificationConfig } from '@/configs/notification.config';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface BaseNotificationCardProps {
  /** Notification data object */
  notification: NotificationNavigationData & {
    title?: string;
    message?: string;
    description?: string;
    timestamp?: string;
    date?: string;
    isRealtime?: boolean;
    priority?: 'low' | 'medium' | 'high';
    category?: string;
    target?: string;
    locationLabel?: string;
    data?: any;
  };
  
  /** Custom header renderer - receives notification and config */
  renderHeader?: (notification: any, config: any) => React.ReactNode;
  
  /** Custom content renderer - receives notification */
  renderContent?: (notification: any) => React.ReactNode;
  
  /** Custom footer renderer - receives notification */
  renderFooter?: (notification: any) => React.ReactNode;
  
  /** Custom action badge renderer - receives action text */
  renderActionBadge?: (actionText: string) => React.ReactNode;
  
  /** Custom click handler - overrides default navigation */
  onClick?: (notification: any) => void;
  
  /** Show view details link */
  showViewDetails?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// HELPER COMPONENTS
// ============================================

/**
 * Format notification time - relative for recent, formatted date for older
 */
const formatNotificationTime = (dateValue: any): string => {
  if (!dateValue) return 'Recently';

  let date: Date;

  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === 'number') {
    date = new Date(dateValue > 10000000000 ? dateValue : dateValue * 1000);
  } else if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else {
    return 'Recently';
  }

  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return 'Just now';

  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };

  if (diffDays > 7) {
    options.year = 'numeric';
  }

  return date.toLocaleDateString('en-US', options);
};

/**
 * Realtime notification indicator
 */
const RealtimeIndicator: React.FC = () => (
  <div className="relative ml-1.5">
    <div className="absolute h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75" />
    <div className="relative h-2 w-2 rounded-full bg-green-500" />
  </div>
);

/**
 * Priority badge component
 */
const PriorityBadge: React.FC<{ priority: 'low' | 'medium' | 'high' }> = ({ priority }) => {
  const priorityStyles = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        priorityStyles[priority]
      )}
    >
      {priority}
    </span>
  );
};

/**
 * Action required badge
 */
const ActionRequiredBadge: React.FC<{ text: string }> = ({ text }) => (
  <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1">
    <svg
      className="h-3.5 w-3.5 text-amber-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
    <span className="text-xs font-medium text-amber-700">{text}</span>
  </div>
);

/**
 * Unread dot indicator
 */
const UnreadIndicator: React.FC = () => (
  <div className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
);

// ============================================
// DEFAULT RENDERERS
// ============================================

/**
 * Default header renderer
 */
const DefaultHeader: React.FC<{ notification: any; config: any }> = ({ notification, config }) => {
  const isRead = notification.read || notification.readed;
  const Icon = config.ui.icon;
  const { color, bgColor } = getNotificationColors(notification.notificationType || notification.type);

  return (
    <div className="mb-2 flex items-start gap-3">
      {/* Icon */}
      <div
        className={classNames(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          bgColor
        )}
      >
        <Icon className={classNames('h-4.5 w-4.5', color)} />
      </div>

      {/* Title and metadata */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={classNames(
              'text-sm font-semibold',
              isRead ? 'text-gray-500' : 'text-gray-900'
            )}
          >
            {notification.target || notification.title || config.label}
          </span>
          {notification.isRealtime && !isRead && <RealtimeIndicator />}
          {notification.priority && notification.priority !== 'medium' && (
            <PriorityBadge priority={notification.priority} />
          )}
        </div>
        <span className="text-xs text-gray-400">
          {formatNotificationTime(
            notification.timestamp || notification.metadata?.timestamp || notification.date
          )}
        </span>
      </div>
    </div>
  );
};

/**
 * Default content renderer
 */
const DefaultContent: React.FC<{ notification: any }> = ({ notification }) => {
  const isRead = notification.read || notification.readed;
  const message =
    notification.message ||
    notification.description ||
    notification.metadata?.formattedMessage ||
    'You have a new notification';

  return (
    <div
      className={classNames(
        'mb-2 text-sm leading-relaxed',
        isRead ? 'text-gray-500' : 'text-gray-700'
      )}
    >
      {message}
    </div>
  );
};

/**
 * Default footer renderer
 */
const DefaultFooter: React.FC<{ notification: any; showViewDetails: boolean }> = ({
  notification,
  showViewDetails,
}) => {
  const hasNavigableContent = !!(
    notification.leadId ||
    notification.offerId ||
    notification.projectId ||
    notification.metadata?.leadId ||
    notification.metadata?.offerId
  );

  if (!showViewDetails || !hasNavigableContent) return null;

  return (
    <div className="mt-2 flex items-center justify-end">
      <span className="cursor-pointer text-xs font-medium text-blue-600 transition-colors hover:text-blue-700">
        View Details →
      </span>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const BaseNotificationCard: React.FC<BaseNotificationCardProps> = ({
  notification,
  renderHeader,
  renderContent,
  renderFooter,
  renderActionBadge,
  onClick,
  showViewDetails = true,
  className,
}) => {
  const { handleNotificationClick } = useNotificationRouter();
  const notificationType = notification.notificationType || notification.type || '';
  const config = getNotificationConfig(notificationType);

  const isRead = notification.read || notification.readed;
  const isUnreadRealtime = notification.isRealtime && !isRead;

  // Get action required text from metadata or config
  const actionRequired =
    notification.metadata?.actionRequired ||
    notification.data?.metadata?.actionRequired ||
    (shouldShowActionBadge(notificationType) ? config.ui.showActionBadge : null);

  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    } else {
      handleNotificationClick(notification);
    }
  };

  return (
    <div
      className={classNames(
        'group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 p-3 transition-all duration-200',
        'hover:border-gray-300 hover:shadow-sm active:bg-gray-100',
        {
          'border-l-4 border-l-blue-500 bg-blue-50/30': isUnreadRealtime,
          'bg-white': !isUnreadRealtime && !isRead,
          'bg-gray-50/50': isRead,
        },
        className
      )}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!isRead && !isUnreadRealtime && <UnreadIndicator />}

      {/* Header */}
      {renderHeader ? (
        renderHeader(notification, config)
      ) : (
        <DefaultHeader notification={notification} config={config} />
      )}

      {/* Content */}
      {renderContent ? renderContent(notification) : <DefaultContent notification={notification} />}

      {/* Location label if available */}
      {notification.locationLabel && (
        <div className="mb-2 truncate text-xs text-gray-400">
          <span className="font-medium">📍</span> {notification.locationLabel}
        </div>
      )}

      {/* Action Required Badge */}
      {actionRequired &&
        typeof actionRequired === 'string' &&
        (renderActionBadge ? (
          renderActionBadge(actionRequired)
        ) : (
          <ActionRequiredBadge text={actionRequired} />
        ))}

      {/* Footer */}
      {renderFooter ? (
        renderFooter(notification)
      ) : (
        <DefaultFooter notification={notification} showViewDetails={showViewDetails} />
      )}
    </div>
  );
};

// ============================================
// EXPORTS
// ============================================

export default BaseNotificationCard;

// Export helper components for custom renders
export {
  RealtimeIndicator,
  PriorityBadge,
  ActionRequiredBadge,
  UnreadIndicator,
  formatNotificationTime,
  DefaultHeader,
  DefaultContent,
  DefaultFooter,
};
