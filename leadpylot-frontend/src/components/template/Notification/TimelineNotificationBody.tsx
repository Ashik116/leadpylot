'use client';

/**
 * TimelineNotificationBody Component
 * 
 * Displays notifications in a chronological timeline view grouped by date.
 * Used inside the notification drawer.
 * 
 * Features:
 * - Chronological ordering (newest first)
 * - Date grouping (Today, Yesterday, or formatted date)
 * - Mark all as read functionality
 * - Scrollable list with sticky date headers
 * - Empty state display
 * 
 * @example
 * <TimelineNotificationBody
 *   notificationList={notifications}
 *   notificationHeight="h-[calc(100vh-180px)]"
 *   loading={false}
 *   handleNotificationClick={handleClick}
 *   onMarkAllAsRead={markAllRead}
 *   userRole="Admin"
 * />
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';
import classNames from 'classnames';
import Spinner from '@/components/ui/Spinner';
import { HiBell } from 'react-icons/hi';
import TimelineNotificationCard from './_components/TimelineNotificationCard';
import NotificationFilter, { DateRangeFilter } from './_components/NotificationFilter';
import { NotificationCategory } from '@/configs/notification.config';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface NotificationItem {
  id: string;
  target: string;
  description: string;
  date: string;
  timestamp?: string;
  image: string;
  type: number;
  location: string;
  locationLabel: string;
  status: string;
  readed: boolean;
  offerId?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  isRealtime?: boolean;
  notificationType?: string;
  leadId?: string;
  projectId?: string;
  metadata?: any;
}

interface TimelineNotificationBodyProps {
  /** Array of notification objects */
  notificationList: NotificationItem[];
  /** Tailwind height class for the scrollable area */
  notificationHeight: string;
  /** Loading state flag */
  loading: boolean;
  /** Unused - kept for interface compatibility */
  noResult: boolean;
  /** Handler when a notification is clicked */
  handleNotificationClick: (item: NotificationItem) => void;
  /** Handler to mark single notification as read */
  onMarkAsRead: (id: string) => void;
  /** Handler to mark all notifications as read */
  onMarkAllAsRead: () => void;
  /** User role for conditional display */
  userRole?: string;
  /** Currently selected category filter */
  selectedCategory?: NotificationCategory | null;
  /** Currently selected date range filter */
  selectedDateRange?: DateRangeFilter;
  /** Callback when category changes */
  onCategoryChange?: (category: NotificationCategory | null) => void;
  /** Callback when date range changes */
  onDateRangeChange?: (range: DateRangeFilter) => void;
  /** Callback to clear all filters */
  onClearFilters?: () => void;
  /** Whether to show filters */
  showFilters?: boolean;
  /** Whether there are more notifications to load */
  hasMore?: boolean;
  /** Whether more notifications are currently being loaded */
  isLoadingMore?: boolean;
  /** Callback to load more notifications */
  onLoadMore?: () => void;
}

// ============================================
// CONSTANTS
// ============================================

/** Scroll threshold in pixels to trigger load more */
const SCROLL_THRESHOLD = 100;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get date group label for a notification
 * @returns "Today", "Yesterday", or formatted date like "Mon, Jan 5"
 */
const getDateGroupLabel = (
  notificationDate: Date,
  todayStr: string,
  yesterdayStr: string
): string => {
  const dateStr = notificationDate.toDateString();

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  return notificationDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Sort notifications by date (newest first)
 */
const sortByDateDesc = (a: NotificationItem, b: NotificationItem): number => {
  const dateA = new Date(a?.timestamp || a?.date || 0).getTime();
  const dateB = new Date(b?.timestamp || b?.date || 0).getTime();
  return dateB - dateA;
};

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Quick actions bar with mark all read button
 * Only shows when there are unread notifications
 */
const QuickActionsBar: React.FC<{
  unreadCount: number;
  onMarkAllRead: () => void;
}> = ({ unreadCount, onMarkAllRead }) => {
  // Don't render if no unread notifications
  if (unreadCount === 0) return null;

  return (
    <div className="flex items-center justify-end px-4 py-2 bg-gray-50 border-b border-gray-100">
      <button
        onClick={onMarkAllRead}
        className="text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
      >
        Mark all read
      </button>
    </div>
  );
};

/**
 * Date group header (sticky)
 */
const DateHeader: React.FC<{ label: string; count: number }> = ({ label, count }) => (
  <div className="px-4 py-2 bg-gray-50 sticky top-0 z-10">
    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
      {label} · {count}
    </span>
  </div>
);

/**
 * Empty state when no notifications
 */
const EmptyState: React.FC<{ hasFilters?: boolean }> = ({ hasFilters = false }) => (
  <div className="flex h-[200px] items-center justify-center">
    <div className="text-center">
      <HiBell className="mx-auto mb-2 h-12 w-12 text-gray-300" />
      <p className="font-semibold text-gray-900">
        {hasFilters ? 'No matching notifications' : 'No notifications'}
      </p>
      {hasFilters && (
        <p className="text-sm text-gray-500">Try adjusting your filters</p>
      )}
    </div>
  </div>
);

/**
 * Loading spinner
 */
const LoadingState: React.FC<{ height: string }> = ({ height }) => (
  <div className={classNames('flex items-center justify-center', height)}>
    <Spinner size={32} />
  </div>
);

/**
 * Load more indicator at bottom of list
 */
const LoadMoreIndicator: React.FC<{ isLoading: boolean }> = ({ isLoading }) => (
  <div className="flex items-center justify-center py-4">
    {isLoading ? (
      <div className="flex items-center gap-2 text-gray-500">
        <Spinner size={16} />
        <span className="text-xs">Loading more...</span>
      </div>
    ) : (
      <span className="text-xs text-gray-400">Scroll for more</span>
    )}
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const TimelineNotificationBody: React.FC<TimelineNotificationBodyProps> = ({
  notificationList,
  notificationHeight,
  loading,
  handleNotificationClick,
  onMarkAllAsRead,
  userRole = 'Admin',
  selectedCategory = null,
  selectedDateRange = 'all',
  onCategoryChange,
  onDateRangeChange,
  onClearFilters,
  showFilters = true,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}) => {
  // ----------------------------------------
  // Refs
  // ----------------------------------------
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ----------------------------------------
  // Memoized Data Processing
  // ----------------------------------------

  /**
   * Sort notifications by date (newest first)
   * Note: Filtering and pagination are handled by backend API
   */
  const sortedNotifications = useMemo(() => {
    return [...notificationList].sort(sortByDateDesc);
  }, [notificationList]);

  /**
   * Count of unread notifications
   */
  const unreadCount = useMemo(() => {
    return sortedNotifications.filter((item) => !item?.readed).length;
  }, [sortedNotifications]);

  /**
   * Group notifications by date for timeline display
   */
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, NotificationItem[]> = {};

    // Pre-calculate date strings for comparison
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    // Group each notification
    sortedNotifications.forEach((notification) => {
      const date = new Date(notification?.timestamp || notification?.date || now.getTime());
      const groupKey = getDateGroupLabel(date, todayStr, yesterdayStr);

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    return groups;
  }, [sortedNotifications]);

  // ----------------------------------------
  // Event Handlers
  // ----------------------------------------

  const handleMarkAllRead = useCallback(() => {
    if (unreadCount > 0) {
      onMarkAllAsRead();
    }
  }, [unreadCount, onMarkAllAsRead]);

  /**
   * Handle scroll to detect when user reaches bottom
   */
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !hasMore || isLoadingMore || !onLoadMore) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Trigger load more when within threshold of bottom
    if (distanceFromBottom < SCROLL_THRESHOLD) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  // ----------------------------------------
  // Effects
  // ----------------------------------------

  /**
   * Attach scroll listener to detect end of scroll
   */
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // ----------------------------------------
  // Render
  // ----------------------------------------

  // Loading state
  if (loading) {
    return <LoadingState height={notificationHeight} />;
  }

  return (
    <div className="flex w-full flex-col">
      {/* Filter Bar */}
      {showFilters && onCategoryChange && onDateRangeChange && onClearFilters && (
        <NotificationFilter
          selectedCategory={selectedCategory}
          selectedDateRange={selectedDateRange}
          onCategoryChange={onCategoryChange}
          onDateRangeChange={onDateRangeChange}
          onClearFilters={onClearFilters}
        />
      )}

      {/* Quick Actions Bar */}
      <QuickActionsBar
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* Notification List */}
      {sortedNotifications.length > 0 ? (
        <div 
          ref={scrollContainerRef}
          className={classNames('overflow-y-auto', notificationHeight)}
        >
          <div className="divide-y divide-gray-100">
            {Object.entries(groupedNotifications).map(([dateGroup, notifications]) => (
              <div key={dateGroup}>
                {/* Date Group Header */}
                <DateHeader label={dateGroup} count={notifications.length} />

                {/* Notification Items */}
                <div className="divide-y divide-gray-50">
                  {notifications.map((item) => (
                    <TimelineNotificationCard
                      key={item.id}
                      notification={item}
                      onClick={() => handleNotificationClick(item)}
                      userRole={userRole}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Load More Indicator */}
          {(hasMore || isLoadingMore) && (
            <LoadMoreIndicator isLoading={isLoadingMore} />
          )}
        </div>
      ) : (
        <EmptyState hasFilters={selectedCategory !== null || selectedDateRange !== 'all'} />
      )}
    </div>
  );
};

export default TimelineNotificationBody;
