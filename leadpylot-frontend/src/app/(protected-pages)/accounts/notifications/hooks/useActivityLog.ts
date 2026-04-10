import { useState, useEffect, useCallback, useMemo } from 'react';
import { ActivityService } from '../services/ActivityService';
import { ActivityItem, FilterState } from '../types';
import { useNotifications } from '@/stores/notificationStore';
import { useNotificationSync } from '@/hooks/useNotificationSync';

export const useActivityLog = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'all',
    priority: 'all',
    status: 'all',
    dateRange: 'week',
    showRead: true,
    showUnread: true,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

  const notifications = useNotifications();
  const { refreshNotifications } = useNotificationSync();

  // Filter real-time notifications
  const realtimeNotifications = useMemo(() =>
    notifications.filter(n => n.isRealtime),
    [notifications]
  );

  // Load activities and notifications
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate =
        filters.dateRange === 'custom'
          ? filters.startDate
          : ActivityService.getDateRangeStartDate(filters.dateRange);
      const data = await ActivityService.loadData(currentPage, startDate, filters.endDate);

      setActivities(data);
      setTotalPages(Math.ceil(data.length / 50));
    } catch (error) {
      console.error('Failed to load activity data:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters.dateRange, filters.startDate, filters.endDate]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Process real-time notifications
  useEffect(() => {
    if (realtimeNotifications.length > 0) {
      const newRealtimeActivities =
        ActivityService.transformRealtimeNotifications(realtimeNotifications);

      setActivities((prev) => {
        const filtered = prev.filter((item) => !item.isRealtime);
        return [...newRealtimeActivities, ...filtered].slice(0, 100);
      });
    }
  }, [realtimeNotifications]);

  // Filter activities based on current filters
  const filteredActivities = useMemo(() => {
    return ActivityService.filterActivities(activities, filters);
  }, [activities, filters]);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    return ActivityService.groupActivitiesByDate(filteredActivities);
  }, [filteredActivities]);

  // Event handlers
  const handleFilterChange = useCallback((key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const handleSearch = useCallback(
    (value: string) => {
      handleFilterChange('search', value);
    },
    [handleFilterChange]
  );

  const handleDateRangeChange = useCallback(
    (range: string) => {
      if (range === 'custom') {
        handleFilterChange('dateRange', range);
      } else {
        const startDate = ActivityService.getDateRangeStartDate(range);
        setFilters((prev) => ({
          ...prev,
          dateRange: range as any,
          startDate,
          endDate: undefined,
        }));
        setCurrentPage(1);
      }
    },
    [handleFilterChange]
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleRefresh = useCallback(() => {
    loadData();
    refreshNotifications();
  }, [loadData, refreshNotifications]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleViewModeChange = useCallback((mode: 'timeline' | 'list') => {
    setViewMode(mode);
  }, []);

  return {
    // State
    activities: filteredActivities,
    groupedActivities,
    loading,
    filters,
    currentPage,
    totalPages,
    expandedItems,
    viewMode,

    // Actions
    handleFilterChange,
    handleSearch,
    handleDateRangeChange,
    toggleExpanded,
    handleRefresh,
    handlePageChange,
    handleViewModeChange,
  };
};
