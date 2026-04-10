import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/stores/notificationStore';
import { useNotificationActions } from '@/hooks/useNotificationActions';
import { useNotificationSync } from '@/hooks/useNotificationSync';
import { NotificationData, isNotificationRead } from '@/stores/notificationStore';
import { NotificationCategory } from '@/configs/notification.config';
import { DateRangeFilter } from '@/components/template/Notification/_components/NotificationFilter';
import { SortOption } from '@/components/template/Notification/_components/NotificationSort';
import { QuickTab } from '@/components/template/Notification/_components/InboxQuickTabs';

interface FilterState {
  selectedCategory: NotificationCategory | null;
  selectedDateRange: DateRangeFilter;
}

/**
 * Filter notifications by search query
 */
function filterBySearch(
  notifications: NotificationData[],
  searchQuery: string
): NotificationData[] {
  if (!searchQuery.trim()) return notifications;

  const query = searchQuery.toLowerCase().trim();

  return notifications.filter((notification) => {
    const description = (notification.description || '').toLowerCase();
    const target = (notification.target || '').toLowerCase();
    const notificationType = (notification.notificationType || '').toLowerCase();
    const leadId = (notification.leadId || '').toLowerCase();
    const projectId = (notification.projectId || '').toLowerCase();
    const offerId = (notification.offerId || '').toLowerCase();
    const metadata = notification.metadata || {};
    const taskId = (metadata.taskId || '').toLowerCase();
    const leadName = (metadata.leadName || metadata.lead_name || '').toLowerCase();
    const projectName = (metadata.projectName || metadata.project_name || '').toLowerCase();

    return (
      description.includes(query) ||
      target.includes(query) ||
      notificationType.includes(query) ||
      leadId.includes(query) ||
      projectId.includes(query) ||
      offerId.includes(query) ||
      taskId.includes(query) ||
      leadName.includes(query) ||
      projectName.includes(query)
    );
  });
}

/**
 * Filter notifications by category
 */
function filterByCategoryFn(
  notifications: NotificationData[],
  category: NotificationCategory | null
): NotificationData[] {
  if (!category) return notifications;

  return notifications.filter((notification) => {
    const notificationCategory = notification.category || '';
    return notificationCategory.toLowerCase() === category.toLowerCase();
  });
}

/**
 * Filter notifications by date range
 */
function filterByDateRange(
  notifications: NotificationData[],
  dateRange: DateRangeFilter
): NotificationData[] {
  if (dateRange === 'all') return notifications;

  const now = new Date();
  let startDate: Date;

  switch (dateRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      return notifications.filter((n) => {
        const notificationDate = new Date(n.timestamp || n.date || 0);
        return notificationDate >= startDate && notificationDate <= endDate;
      });
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      return notifications;
  }

  return notifications.filter((n) => {
    const notificationDate = new Date(n.timestamp || n.date || 0);
    return notificationDate >= startDate;
  });
}

export const useAllNotifications = () => {
  const router = useRouter();

  const notifications = useNotifications();
  const { markAsRead, markAllAsRead, bulkMarkAsRead, bulkDelete } = useNotificationActions();
  const { 
  
    loadAllNotifications, 
    loadMoreNotifications, 
    pagination 
  } = useNotificationSync({ disableInitialLoad: true });

  const [filters, setFilters] = useState<FilterState>({
    selectedCategory: null,
    selectedDateRange: 'all',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [quickTab, setQuickTab] = useState<QuickTab>('all');
  const [loading, setLoading] = useState(true);

  // Load notifications on mount and when filters or search change
  // searchQuery is already debounced (300ms) by NotificationSearch before it reaches here
  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      try {
        // Convert category filter - exclude 'other' as it's not supported by API
        const category = filters.selectedCategory && filters.selectedCategory !== 'other'
          ? filters.selectedCategory as Exclude<NotificationCategory, 'other'>
          : undefined;
        const order = sortOption === 'oldest' ? 'asc' : 'desc';

        await loadAllNotifications({
          category,
          dateRange: filters.selectedDateRange,
          search: searchQuery.trim() || undefined,
          sort: 'createdAt',
          order,
          unread: quickTab === 'unread' || sortOption === 'unread' ? true : undefined,
          assigned: quickTab === 'assigned' ? true : undefined,
        });
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [loadAllNotifications, filters.selectedCategory, filters.selectedDateRange, searchQuery, quickTab, sortOption]);

  // Filter by search: when searchQuery is sent to backend, API returns filtered results
  // so we use them as-is. When empty, filterBySearch returns all.
  const filteredBySearch = useMemo(() => {
    if (searchQuery.trim()) {
      return notifications; // Backend already filtered
    }
    return filterBySearch(notifications, searchQuery);
  }, [notifications, searchQuery]);

  // Filter by category: when a category filter is active, the API already returned only that
  // category (e.g. category=leads). Backend may use type/tags while items have metadata.category
  // like "monitoring", so we must not re-filter by notification.category or we get 0 results.
  const filteredByCategory = useMemo(() => {
    if (filters.selectedCategory && filters.selectedCategory !== 'other') {
      return filteredBySearch;
    }
    return filterByCategoryFn(filteredBySearch, filters.selectedCategory);
  }, [filteredBySearch, filters.selectedCategory]);

  // Filter by date range
  const filteredByDateRange = useMemo(() => {
    return filterByDateRange(filteredByCategory, filters.selectedDateRange);
  }, [filteredByCategory, filters.selectedDateRange]);

  // Filter by quick tab
  const filteredByTab = useMemo(() => {
    switch (quickTab) {
      case 'unread':
        // Backend handles `unread=true`
        return filteredByDateRange;
      case 'assigned':
        // Backend handles `assigned=true`
        return filteredByDateRange;
      case 'mentions':
        // TODO: mentions filtering temporarily disabled
        // return filteredByDateRange.filter((n) => n.notificationType?.includes('mention'));
        return filteredByDateRange;
      case 'all':
      default:
        return filteredByDateRange;
    }
  }, [filteredByDateRange, quickTab]);

  // Backend handles sorting/filtering; keep current list order from API
  const visibleNotifications = useMemo(() => {
    return filteredByTab;
  }, [filteredByTab]);

  // Counts for quick tabs
  const unreadCount = useMemo(() => {
    return filteredByDateRange.filter((n) => !isNotificationRead(n)).length;
  }, [filteredByDateRange]);

  const assignedCount = useMemo(() => {
    return filteredByDateRange.filter(
      (n) => n.notificationType?.includes('assigned') || n.notificationType?.includes('assignment')
    ).length;
  }, [filteredByDateRange]);

  const mentionsCount = useMemo(() => {
    return filteredByDateRange.filter((n) => n.notificationType?.includes('mention')).length;
  }, [filteredByDateRange]);

  // Selected notifications info
  const selectedNotifications = useMemo(() => {
    return visibleNotifications.filter((n) => selectedIds.has(n.id));
  }, [visibleNotifications, selectedIds]);

  const hasUnreadSelected = useMemo(() => {
    return selectedNotifications.some((n) => !isNotificationRead(n));
  }, [selectedNotifications]);

  const hasReadSelected = useMemo(() => {
    return selectedNotifications.some((n) => isNotificationRead(n));
  }, [selectedNotifications]);

  // Event handlers
  const handleFilterChange = useCallback(
    (category: NotificationCategory | null, dateRange: DateRangeFilter) => {
      setFilters({ selectedCategory: category, selectedDateRange: dateRange });
      setSelectedIds(new Set());
    },
    []
  );

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedIds(new Set());
  }, []);

  const handleSortChange = useCallback((option: SortOption) => {
    setSortOption(option);
  }, []);

  const handleQuickTabChange = useCallback((tab: QuickTab) => {
    setQuickTab(tab);
    setSelectedIds(new Set());
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(visibleNotifications.map((n) => n.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [visibleNotifications]
  );

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleBulkMarkRead = useCallback(async () => {
    const ids = Array.from(selectedIds);
    await bulkMarkAsRead(ids);
    setSelectedIds(new Set());
  }, [selectedIds, bulkMarkAsRead]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    await bulkDelete(ids);
    setSelectedIds(new Set());
  }, [selectedIds, bulkDelete]);

  const handleDelete = useCallback(
    async (id: string) => {
      await bulkDelete([id]);
    },
    [bulkDelete]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      await markAsRead(id);
    },
    [markAsRead]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  const handleNotificationClick = useCallback(
    (notification: NotificationData) => {
      // Mark as read if unread
      if (!isNotificationRead(notification)) {
        handleMarkAsRead(notification.id);
      }

      // Navigate to related page
      if (notification.leadId) {
        const url = notification.offerId
          ? `/dashboards/leads/${notification.leadId}?highlightOffer=${notification.offerId}`
          : `/dashboards/leads/${notification.leadId}`;
        router.push(url);
      } else if (notification.projectId) {
        router.push(`/dashboards/projects/${notification.projectId}`);
      } else if (notification.metadata?.taskId || notification.metadata?.todoId) {
        const taskId = notification.metadata?.taskId || notification.metadata?.todoId;
        router.push(`/dashboards/kanban?task=${taskId}`);
      }
    },
    [router, handleMarkAsRead]
  );

  const handleClearFilters = useCallback(() => {
    setFilters({ selectedCategory: null, selectedDateRange: 'all' });
    setSearchQuery('');
    setQuickTab('all');
    setSelectedIds(new Set());
  }, []);

  return {
    notifications: visibleNotifications,
    loading,
    filters,
    selectedIds,
    searchQuery,
    sortOption,
    quickTab,
    unreadCount,
    assignedCount,
    mentionsCount,
    hasUnreadSelected,
    hasReadSelected,
    pagination,
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
    loadMoreNotifications,
  };
};
