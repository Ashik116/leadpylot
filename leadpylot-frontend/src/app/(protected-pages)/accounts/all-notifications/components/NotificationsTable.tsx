'use client';

import React, { useRef, useLayoutEffect } from 'react';
import { NotificationData } from '@/stores/notificationStore';
import EnhancedNotificationTableRow from '@/app/(protected-pages)/accounts/all-notifications/components/EnhancedNotificationTableRow';
import NotificationsTableSkeleton from '@/app/(protected-pages)/accounts/all-notifications/components/NotificationsTableSkeleton';
import { HiBell } from 'react-icons/hi';
import Spinner from '@/components/ui/Spinner';

export interface NotificationsTableProps {
  listLoading?: boolean;
  notifications: NotificationData[];
  selectedIds: Set<string>;
  hasActiveFilters: boolean;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  userRole: string;
  currentUser?: { name?: string; login?: string } | null;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  onNotificationClick: (notification: NotificationData) => void;
  onMarkAsRead: (id: string) => void;
  onDelete?: (id: string) => void;
  pagination?: {
    hasMore: boolean;
    isLoadingMore: boolean;
    currentPage: number;
    totalPages: number;
  };
  onLoadMore?: () => void;
}

const NotificationsTable: React.FC<NotificationsTableProps> = ({
  listLoading = false,
  notifications,
  selectedIds,
  hasActiveFilters,
  isAllSelected,
  isSomeSelected,
  userRole,
  currentUser,
  onSelectAll,
  onSelectRow,
  onNotificationClick,
  onMarkAsRead,
  onDelete,
  pagination,
  onLoadMore,
}) => {
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef<boolean>(pagination?.hasMore ?? false);
  const isLoadingMoreRef = useRef<boolean>(pagination?.isLoadingMore ?? false);

  useLayoutEffect(() => {
    // Keep refs in sync with current pagination so observer callback always sees latest values
    // (critical when switching filters: refs must be updated before observer runs)
    hasMoreRef.current = pagination?.hasMore ?? false;
    isLoadingMoreRef.current = pagination?.isLoadingMore ?? false;
  }, [pagination?.hasMore, pagination?.isLoadingMore]);

  useLayoutEffect(() => {
    if (listLoading || !onLoadMore || !pagination?.hasMore || notifications.length === 0) return;

    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    // Re-sync refs so callback sees current state when sentinel intersects
    hasMoreRef.current = pagination?.hasMore ?? false;
    isLoadingMoreRef.current = pagination?.isLoadingMore ?? false;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (!hasMoreRef.current || isLoadingMoreRef.current) return;
        // Set ref immediately to prevent duplicate calls before state propagates
        isLoadingMoreRef.current = true;
        onLoadMore();
      },
      { root: null, rootMargin: '200px', threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [listLoading, onLoadMore, pagination?.hasMore, pagination?.isLoadingMore, notifications.length]);

  return (
    <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
      {listLoading ? (
        <NotificationsTableSkeleton />
      ) : notifications.length === 0 ? (
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <HiBell className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <p className="font-semibold text-gray-900 text-lg mb-2">
              {hasActiveFilters ? 'No matching notifications' : 'No notifications'}
            </p>
            {hasActiveFilters && (
              <p className="text-sm text-gray-500">Try adjusting your filters</p>
            )}
          </div>
        </div>
      ) : (
        <table
          className="w-full min-w-[900px]"
          role="table"
          aria-label="Notifications"
          aria-rowcount={notifications.length}
        >
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white">
            <tr className="h-8">
              <th className="sticky left-0 z-20 w-12 bg-white px-2">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeSelected;
                    }}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    aria-label="Select all notifications"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectAll(!isAllSelected);
                      }
                    }}
                  />
                </div>
              </th>
              <th className="w-12 px-1">
                <span className="sr-only">Icon</span>
              </th>
              <th className="min-w-0 flex-1 px-2 text-left">
                <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  Message
                </span>
              </th>
              <th className="w-48 px-2 text-left">
                <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  Entity & Details
                </span>
              </th>
              <th className="w-28 px-2 text-left">
                <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  Date
                </span>
              </th>
              <th className="w-32 px-2 text-left">
                <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  Time
                </span>
              </th>
              <th className="w-32 px-1 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notification) => (
              <EnhancedNotificationTableRow
                key={notification.id}
                notification={notification}
                isSelected={selectedIds.has(notification.id)}
                onSelect={(checked) => onSelectRow(notification.id, checked)}
                onClick={() => onNotificationClick(notification)}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
                userRole={userRole}
                currentUser={currentUser}
              />
            ))}

            {pagination?.isLoadingMore && (
              <tr>
                <td colSpan={7} className="px-4 py-2 bg-gray-50">
                  <div className="flex items-center justify-center gap-2 text-gray-700">
                    <Spinner size={14} />
                    <span className="text-xs font-medium">Loading more...</span>
                  </div>
                </td>
              </tr>
            )}

            {pagination?.hasMore &&
              !pagination?.isLoadingMore &&
              notifications.length > 0 &&
              onLoadMore && (
                <tr>
                  <td colSpan={7} className="px-4 py-2 bg-white">
                    <div
                      ref={loadMoreSentinelRef}
                      className="flex items-center justify-center"
                      aria-hidden
                    >
                      <span className="text-xs text-gray-500">Scroll to load more</span>
                    </div>
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default NotificationsTable;
