import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import useToast from '@/utils/hooks/useNotification';
import {
  apiGetNotifications,
  apiGetNotification,
  apiMarkNotificationAsRead,
  apiMarkAllNotificationsAsRead,
  apiGetPendingNotifications,
  apiGetUnreadNotificationsCount,
  type NotificationsResponse,
  type GetNotificationsParams,
  apiGetAttachments,
} from '../../notifications/NotificationsService';

/**
 * Hook to fetch all notifications
 */
export const useNotifications = (params?: GetNotificationsParams) => {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', params],
    queryFn: () => apiGetNotifications(params),
    placeholderData: (previousData) => previousData,
    // Notifications should be relatively fresh, but don't need constant refetching
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to fetch notifications with infinite scrolling
 */
export const useInfiniteNotifications = (params?: Omit<GetNotificationsParams, 'page'>) => {
  return useInfiniteQuery<NotificationsResponse>({
    queryKey: ['infinite-notifications', params],
    queryFn: ({ pageParam = 1 }) =>
      apiGetNotifications({ ...params, page: pageParam as number, limit: params?.limit || 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination) {
        return undefined;
      }
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
    // Notifications should be relatively fresh, but don't need constant refetching
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to fetch a specific notification by ID
 */
export const useNotificationById = (id: string) => {
  return useQuery({
    queryKey: ['notification', id],
    queryFn: () => apiGetNotification(id),
    enabled: !!id,
    // Individual notifications are static once fetched
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to mark a notification as read
 */
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!id) {
        return Promise.reject(new Error('No notification ID provided'));
      }

      try {
        return await apiMarkNotificationAsRead(id);
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');

      openNotification({
        type: 'danger',
        massage: `Failed to mark notification as read: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook to mark all notifications as read
 */
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useToast();

  return useMutation({
    mutationFn: async () => {
      try {
        return await apiMarkAllNotificationsAsRead([]);
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      openNotification({
        type: 'success',
        massage: 'All notifications marked as read',
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');

      openNotification({
        type: 'danger',
        massage: `Failed to mark all notifications as read: ${errorMessage}`,
      });
    },
  });
};

export const useAttachments = (documentId?: string) =>
  useQuery({
    queryKey: ['document', documentId],
    queryFn: () => apiGetAttachments(documentId!),
    enabled: !!documentId,
    // Attachments are static once fetched
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

/**
 * Hook to fetch pending notifications for sync
 */
export const usePendingNotifications = (since?: string, limit?: number, priority?: string) => {
  return useQuery({
    queryKey: ['pending-notifications', since, limit, priority],
    queryFn: () => apiGetPendingNotifications(since, limit, priority),
    enabled: !!since, // Only run when we have a since timestamp
    // Always fetch fresh data for sync
  });
};

/**
 * Hook to get unread notification count
 */
export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: apiGetUnreadNotificationsCount,
    // Remove automatic refetching to prevent excessive calls
    // Socket updates will handle real-time changes
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
