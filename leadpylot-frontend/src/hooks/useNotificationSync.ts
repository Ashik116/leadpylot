import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/useSession';
import { usePathname } from 'next/navigation';
import { useNotificationStore, NotificationData } from '@/stores/notificationStore';
import {
  apiGetNotifications,
  apiGetUnreadNotificationsCount,
  NotificationsResponse,
  GetNotificationsParams,
} from '@/services/notifications/NotificationsService';
import { transformNotificationFromAPI } from '@/services/notifications/notificationTransformers';
import { preloadNotificationSounds } from '@/utils/audioUtils';

/** Number of notifications to load per page */
const PAGE_SIZE = 20;

const AUTH_PAGE_PATTERNS = ['/sign-in', '/forgot-password', '/reset-password'] as const;

/** Filter parameters for notifications */
export interface NotificationFilters {
  category?: 'leads' | 'offers' | 'email' | 'login' | 'project' | 'task' | 'todo' | 'document' | 'system' | null;
  dateRange?: 'all' | 'today' | 'yesterday' | 'week' | 'month';
  /** Search term to filter by notification content (debounced on frontend) */
  search?: string;
  /** Backend sort key */
  sort?: string;
  /** Backend sort order */
  order?: 'asc' | 'desc';
  /** Backend filter: return only unread notifications */
  unread?: boolean;
  /** Backend filter: return only assigned notifications */
  assigned?: boolean;
}

/** Pagination state */
export interface PaginationState {
  currentPage: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  totalPages: number;
}

interface UseNotificationSyncOptions {
  /** Disable the hook's automatic initial notifications load */
  disableInitialLoad?: boolean;
}

// Removed DedupeKey and NotificationWithDedupeKey interfaces - no longer needed
// Deduplication now handled by store using notification.id only

/**
 * Custom hook for synchronizing notifications with the backend
 * Handles fetching, deduplication, pagination, and state management
 */
export const useNotificationSync = (options?: UseNotificationSyncOptions) => {
  const { data: session, status: sessionStatus } = useSession();
  const currentPath = usePathname();
  const queryClient = useQueryClient();
  const prevUnreadCountRef = useRef<number>(0);
  const hasInitialLoadRef = useRef<boolean>(false);
  const { setNotifications, addNotifications, setUnreadCount, setError, setLoading } = useNotificationStore();
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    hasMore: true,
    isLoadingMore: false,
    totalPages: 1,
  });
  
  // Store current filters for pagination
  const currentFiltersRef = useRef<NotificationFilters | undefined>(undefined);

  // Memoize authentication and page checks
  const isAuthenticated = useMemo(
    () => sessionStatus === 'authenticated' && Boolean(session?.user),
    [sessionStatus, session?.user]
  );

  const isAuthPage = useMemo(
    () => AUTH_PAGE_PATTERNS.some((pattern) => currentPath?.startsWith(pattern)),
    [currentPath]
  );

  const shouldEnableQueries = useMemo(
    () => isAuthenticated && !isAuthPage,
    [isAuthenticated, isAuthPage]
  );

  // Fetch unread notification count
  const { data: unreadCountData } = useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: apiGetUnreadNotificationsCount,
    enabled: shouldEnableQueries,
  });

  // Note: deduplicateNotifications removed - was causing issues by merging different notifications
  // Store's addNotifications already deduplicates by id, which is correct for pagination
  // For realtime notifications, deduplication should happen at the socket/realtime level, not here

  /**
   * Loads initial page of notifications from the API
   * Resets pagination and replaces existing notifications
   * @param filters - Optional filters for category and date range
   */
  const loadAllNotifications = useCallback(async (filters?: NotificationFilters): Promise<void> => {
    if (!shouldEnableQueries) {
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      // Store current filters for load more
      currentFiltersRef.current = filters;
      
      // Build API params - start from page 1
      const params: GetNotificationsParams = { 
        limit: PAGE_SIZE,
        page: 1,
        sort: filters?.sort || 'createdAt',
        order: filters?.order || 'desc',
      };
      
      // Add category filter (convert null to undefined)
      if (filters?.category) {
        params.category = filters.category;
      }
      
      // Add dateRange filter (skip 'all' as it's the default)
      if (filters?.dateRange && filters.dateRange !== 'all') {
        params.dateRange = filters.dateRange;
      }

      // Add search filter (trimmed, skip if empty)
      if (filters?.search?.trim()) {
        params.search = filters.search.trim();
      }

      // Quick-tab filters handled by backend
      if (filters?.unread) {
        params.unread = true;
      }
      if (filters?.assigned) {
        params.assigned = true;
      }

      const response = await apiGetNotifications(params);

      // Handle both response formats: { data: [...] } or direct array
      const notificationsData =
        (response as NotificationsResponse).data || (Array.isArray(response) ? response : []);
      
      // Get pagination info from response - check meta object properly
      const meta = (response as NotificationsResponse).meta || (response as NotificationsResponse).pagination;
      const totalPages = meta?.pages ?? 1;
      const currentPage = meta?.page ?? 1;

      if (Array.isArray(notificationsData) && notificationsData.length > 0) {
        const transformed = notificationsData.map(transformNotificationFromAPI);
        // For API pagination, skip external_id deduplication - let store deduplicate by id only
        // external_id deduplication can incorrectly merge different notifications (e.g., multiple updates to same task)
        // Store's setNotifications will deduplicate by id if needed, but API should return unique notifications
        setNotifications(transformed);
        
        // Update pagination state - use meta.pages and meta.page directly
        // hasMore: true if current page is less than total pages
        setPagination({
          currentPage,
          hasMore: currentPage < totalPages,
          isLoadingMore: false,
          totalPages: totalPages || 1,
        });
      } else {
        setNotifications([]);
        setPagination({
          currentPage: 1,
          hasMore: false,
          isLoadingMore: false,
          totalPages: 1,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to load notifications: ${error.message}`
          : 'Failed to load notifications';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [shouldEnableQueries, setError, setLoading, setNotifications]);

  /**
   * Loads more notifications (next page)
   * Appends to existing notifications
   */
  const loadMoreNotifications = useCallback(async (): Promise<void> => {
    // Prevent duplicate calls - use isLoadingMore state directly
    if (!shouldEnableQueries || !pagination.hasMore || pagination.isLoadingMore) {
      return;
    }

    try {
      // Set loading more state
      setPagination(prev => ({ ...prev, isLoadingMore: true }));
      
      const nextPage = pagination.currentPage + 1;
      const filters = currentFiltersRef.current;
      
      // Build API params
      const params: GetNotificationsParams = { 
        limit: PAGE_SIZE,
        page: nextPage,
        sort: filters?.sort || 'createdAt',
        order: filters?.order || 'desc',
      };
      
      // Add filters
      if (filters?.category) {
        params.category = filters.category;
      }
      if (filters?.dateRange && filters.dateRange !== 'all') {
        params.dateRange = filters.dateRange;
      }
      if (filters?.search?.trim()) {
        params.search = filters.search.trim();
      }
      if (filters?.unread) {
        params.unread = true;
      }
      if (filters?.assigned) {
        params.assigned = true;
      }

      const response = await apiGetNotifications(params);

      // Handle both response formats
      const notificationsData =
        (response as NotificationsResponse).data || (Array.isArray(response) ? response : []);
      
      // Get pagination info from meta object
      const meta = (response as NotificationsResponse).meta || (response as NotificationsResponse).pagination;
      const totalPages = meta?.pages ?? pagination.totalPages;
      const responsePage = meta?.page ?? nextPage;

      // Handle empty data response - backend may return empty array even if meta says more pages exist
      // This can happen due to backend pagination issues, filters, or data inconsistencies
      if (Array.isArray(notificationsData) && notificationsData.length > 0) {
        const transformed = notificationsData.map(transformNotificationFromAPI);
        // For pagination (loadMore), skip external_id deduplication - let store deduplicate by id only
        // external_id deduplication merges notifications that should be separate (e.g., multiple updates to same task)
        // Store's addNotifications already filters by id, which is the correct deduplication for pagination
        
        // Ensure all notifications have valid IDs (fallback to index if missing)
        const notificationsWithIds = transformed.map((n, index) => {
          if (!n.id || n.id === 'undefined' || n.id === 'null') {
            // Generate a temporary ID if missing (shouldn't happen, but safeguard)
            return { ...n, id: n.dbId || `temp-${responsePage}-${index}` };
          }
          return n;
        });
        
        addNotifications(notificationsWithIds);
        
        // Update pagination state - use meta.pages and meta.page directly
        // hasMore: true if response page is less than total pages AND we got data
        setPagination({
          currentPage: responsePage,
          hasMore: responsePage < totalPages,
          isLoadingMore: false,
          totalPages: totalPages || 1,
        });
      } else {
        // Empty data response - stop loading more even if meta says there are more pages
        // This handles backend pagination inconsistencies where meta.total doesn't match actual data
        setPagination(prev => ({
          ...prev,
          hasMore: false, // Stop trying to load more if we get empty data
          isLoadingMore: false,
        }));
      }
    } catch (error) {
      setPagination(prev => ({ ...prev, isLoadingMore: false }));
      console.error('Failed to load more notifications:', error);
    }
  }, [shouldEnableQueries, pagination, addNotifications]);

  /**
   * Refreshes notifications and invalidates the unread count query
   * @param filters - Optional filters for category and date range
   */
  const refreshNotifications = useCallback(async (filters?: NotificationFilters): Promise<void> => {
    if (!shouldEnableQueries) {
      return;
    }

    await loadAllNotifications(filters);
    await queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
  }, [shouldEnableQueries, loadAllNotifications, queryClient]);

  // Update unread count when it changes
  useEffect(() => {
    if (unreadCountData?.count === undefined) {
      return;
    }

    const count = Number(unreadCountData.count);
    setUnreadCount(count);

    // Track previous count for change detection
    prevUnreadCountRef.current = count;

    // Note: Auto-reload on count change is currently disabled
    // Uncomment the lines below if you want to reload notifications when count changes
    // const previousCount = prevUnreadCountRef.current;
    // if (shouldEnableQueries && previousCount !== count) {
    //     loadAllNotifications();
    // }
  }, [unreadCountData, setUnreadCount, shouldEnableQueries]);

  // Initial load and sound preload when authenticated
  useEffect(() => {
    if (!shouldEnableQueries || hasInitialLoadRef.current || options?.disableInitialLoad) {
      return;
    }

    hasInitialLoadRef.current = true;
    loadAllNotifications();
    preloadNotificationSounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldEnableQueries, options?.disableInitialLoad]);

  return {
    refreshNotifications,
    loadAllNotifications,
    loadMoreNotifications,
    pagination,
  };
};
