'use client';

import { useAllNotifications } from './hooks/useAllNotifications';
import AllNotificationsContent from '@/app/(protected-pages)/accounts/all-notifications/components/AllNotificationsContent';
import Card from '@/components/ui/Card';

export default function AllNotificationsWrapper() {
  const {
    notifications,
    loading,
    filters,
    selectedIds,
    searchQuery,
    sortOption,
    quickTab,
    unreadCount,
    assignedCount,
    mentionsCount,
    handleFilterChange,
    handleSearch,
    handleSortChange,
    handleQuickTabChange,
    handleSelectAll,
    handleSelectRow,
    handleBulkMarkRead,
    handleBulkDelete,
    handleDelete,
    handleClearSelection,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleNotificationClick,
    handleClearFilters,
    pagination,
    loadMoreNotifications,
  } = useAllNotifications();

  return (
    <div className="space-y-2 p-2 pb-14">
      <Card>
        <AllNotificationsContent
          notifications={notifications}
          listLoading={loading}
            filters={filters}
            selectedIds={selectedIds}
            searchQuery={searchQuery}
            sortOption={sortOption}
            quickTab={quickTab}
            unreadCount={unreadCount}
            assignedCount={assignedCount}
            mentionsCount={mentionsCount}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onSortChange={handleSortChange}
            onQuickTabChange={handleQuickTabChange}
            onSelectAll={handleSelectAll}
            onSelectRow={handleSelectRow}
            onBulkMarkRead={handleBulkMarkRead}
            onBulkDelete={handleBulkDelete}
            onDelete={handleDelete}
            onClearSelection={handleClearSelection}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onNotificationClick={handleNotificationClick}
            onClearFilters={handleClearFilters}
            pagination={pagination}
            onLoadMore={loadMoreNotifications}
        />
      </Card>
    </div>
  );
}
