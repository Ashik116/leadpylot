'use client';

import React from 'react';
import { NotificationData } from '@/stores/notificationStore';
import { NotificationCategory } from '@/configs/notification.config';
import { DateRangeFilter } from '@/components/template/Notification/_components/NotificationFilter';
import { SortOption } from '@/components/template/Notification/_components/NotificationSort';
import { QuickTab } from '@/components/template/Notification/_components/InboxQuickTabs';
import NotificationFilter from '@/components/template/Notification/_components/NotificationFilter';
import NotificationSearch from '@/components/template/Notification/_components/NotificationSearch';
import NotificationSort from '@/components/template/Notification/_components/NotificationSort';
import InboxQuickTabs from '@/components/template/Notification/_components/InboxQuickTabs';
import NotificationBulkActions from '@/components/template/Notification/_components/NotificationBulkActions';
import NotificationsTable from '@/app/(protected-pages)/accounts/all-notifications/components/NotificationsTable';
import { useSession } from '@/hooks/useSession';
import { isNotificationRead } from '@/stores/notificationStore';
import Button from '@/components/ui/Button';

interface AllNotificationsContentProps {
  notifications: NotificationData[];
  listLoading?: boolean;
  filters: {
    selectedCategory: NotificationCategory | null;
    selectedDateRange: DateRangeFilter;
  };
  selectedIds: Set<string>;
  searchQuery: string;
  sortOption: SortOption;
  quickTab: QuickTab;
  unreadCount: number;
  assignedCount: number;
  mentionsCount: number;
  onFilterChange: (category: NotificationCategory | null, dateRange: DateRangeFilter) => void;
  onSearch: (query: string) => void;
  onSortChange: (option: SortOption) => void;
  onQuickTabChange: (tab: QuickTab) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  onBulkMarkRead: () => void;
  onBulkDelete: () => void;
  onDelete: (id: string) => void;
  onClearSelection: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: NotificationData) => void;
  onClearFilters: () => void;
  pagination?: {
    hasMore: boolean;
    isLoadingMore: boolean;
    currentPage: number;
    totalPages: number;
  };
  onLoadMore?: () => void;
}

const AllNotificationsContent: React.FC<AllNotificationsContentProps> = ({
  notifications,
  listLoading = false,
  filters,
  selectedIds,
  searchQuery,
  sortOption,
  quickTab,
  unreadCount,
  assignedCount,
  mentionsCount,
  onFilterChange,
  onSearch,
  onSortChange,
  onQuickTabChange,
  onSelectAll,
  onSelectRow,
  onBulkMarkRead,
  onBulkDelete,
  onDelete,
  onClearSelection,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  onClearFilters,
  pagination,
  onLoadMore,
}) => {
  const { data } = useSession();
  const user = data?.user;
  const userRole = user?.role || 'Admin';
  const currentUser = user
    ? {
        name: (user as { name?: string })?.name,
        login: (user as { login?: string })?.login,
      }
    : undefined;

  const isAllSelected =
    notifications.length > 0 && notifications.every((n) => selectedIds.has(n.id));
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  const selectedNotifications = notifications.filter((n) => selectedIds.has(n.id));
  const hasUnreadSelected = selectedNotifications.some((n) => !isNotificationRead(n));
  const hasReadSelected = selectedNotifications.some((n) => isNotificationRead(n));

  const hasActiveFilters =
    filters.selectedCategory !== null || filters.selectedDateRange !== 'all' || searchQuery.trim() !== '';

 

  return (
    <div className="flex w-full flex-col min-h-0">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white shrink-0 border-b border-gray-200">
        <div className="px-2 pt-2">
          <h1 className="text-2xl font-bold text-gray-900">All Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            <span className="text-green-600 font-medium">{notifications.length}</span>{' '}
            {notifications.length === 1 ? 'notification' : 'notifications'}
            {unreadCount > 0 && (
              <>
                {' • '}
                <span className="text-green-600 font-medium">{unreadCount}</span> unread
              </>
            )}
          </p>
        </div>

        {/* Filter Bar */}
        <div className=" pb-2">
          <NotificationFilter
            selectedCategory={filters.selectedCategory}
            selectedDateRange={filters.selectedDateRange}
            onCategoryChange={(category) => onFilterChange(category, filters.selectedDateRange)}
            onDateRangeChange={(dateRange) => onFilterChange(filters.selectedCategory, dateRange)}
            onClearFilters={onClearFilters}
            portalRoot={null}
          />
        </div>

        {/* Quick Tabs + Search + Sort Bar */}
        <div className="flex  items-center gap-3 border-b border-gray-100 bg-white px-2 pb-2">
          <div className="shrink-0">
            <InboxQuickTabs
              activeTab={quickTab}
              onTabChange={onQuickTabChange}
              unreadCount={unreadCount}
              assignedCount={assignedCount}
              mentionsCount={mentionsCount}
            />
          </div>
          <div className="min-w-0 grow">
            <NotificationSearch value={searchQuery} onChange={onSearch} />
          </div>
          <div className="shrink-0">
            <NotificationSort value={sortOption} onChange={onSortChange} portalRoot={null} />
          </div>
          {notifications.length > 0 && (
            <Button
              type="button"
              variant="plain"
              size="xs"
              onClick={onMarkAllAsRead}
              className="shrink-0 rounded-md px-3 py-2 text-xs font-bold text-green-600 transition-all hover:bg-green-50 hover:text-green-700"
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <NotificationBulkActions
        selectedCount={selectedIds.size}
        hasUnreadSelected={hasUnreadSelected}
        hasReadSelected={hasReadSelected}
        onMarkAsRead={onBulkMarkRead}
        onMarkAsUnread={() => {}} // Not implemented yet
        onDelete={onBulkDelete}
        onClearSelection={onClearSelection}
      />
      {/* Notification table */}
      <NotificationsTable
        listLoading={listLoading}
        notifications={notifications}
        selectedIds={selectedIds}
        hasActiveFilters={hasActiveFilters}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        userRole={userRole}
        currentUser={currentUser}
        onSelectAll={onSelectAll}
        onSelectRow={onSelectRow}
        onNotificationClick={onNotificationClick}
        onMarkAsRead={onMarkAsRead}
        onDelete={onDelete}
        pagination={pagination}
        onLoadMore={quickTab === 'all' && !searchQuery.trim() ? onLoadMore : undefined}
      />
    </div>
  );
};

export default AllNotificationsContent;
