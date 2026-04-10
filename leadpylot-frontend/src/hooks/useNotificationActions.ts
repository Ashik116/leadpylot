import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore, NotificationData } from '@/stores/notificationStore';
import {
  apiMarkNotificationAsRead,
  apiMarkAllNotificationsAsRead,
  apiDeleteNotifications,
} from '@/services/notifications/NotificationsService';
import socketService from '@/services/SocketService';

const CATEGORY_MAPPINGS: Record<string, string[]> = {
  email: ['email', 'email_system_received', 'email_received'],
  login: ['agent_login', 'agent_logout'],
  offer: [
    'offer_created',
    'opening_created',
    'confirmation_created',
    'payment_voucher_created',
    'netto1_created',
    'netto2_created',
  ],
  others: [
    'lead_assigned',
    'lead_assignment_admin',
    'project_created',
    'project_assigned',
    'lead_status_changed',
    'commission_earned',
    'revenue_target_met',
    'lead_converted',
    'system_maintenance',
    'user_role_changed',
    'email_comment_mention',
    'email_comment_added',
  ],
};

export const useNotificationActions = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    markAsRead: storeMarkAsRead,
    markAllAsRead: storeMarkAllAsRead,
    markCategoryAsRead: storeMarkCategoryAsRead,
    bulkMarkAsRead: storeBulkMarkAsRead,
    bulkDelete: storeBulkDelete,
    setIsUpdating,
    notifications,
  } = useNotificationStore();

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const notification = notifications.find((n) => n.id === notificationId);
      if (!notification || notification.readed) return;

      try {
        setIsUpdating(notificationId, true);

        // Optimistic update
        storeMarkAsRead(notificationId);

        // Send Socket.IO event for real-time notifications
        if (notification.isRealtime) {
          socketService.markNotificationAsRead(notificationId);
        }

        // API call - use dbId if available, otherwise use id
        const apiId = notification.dbId || notificationId;
        await apiMarkNotificationAsRead(apiId);

        // Force refresh unread count
        await queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
        await queryClient.refetchQueries({ queryKey: ['unread-notifications-count'] });
      } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        // Revert optimistic update
        invalidateQueries();
      } finally {
        setIsUpdating(notificationId, false);
      }
    },
    [notifications, storeMarkAsRead, setIsUpdating, queryClient, invalidateQueries]
  );

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.readed).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      storeMarkAllAsRead();
      await apiMarkAllNotificationsAsRead(unreadIds);
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      invalidateQueries();
    }
  }, [notifications, storeMarkAllAsRead, queryClient, invalidateQueries]);

  const markCategoryAsRead = useCallback(
    async (category: 'email' | 'login' | 'offer' | 'others') => {
      const categoryTypes = CATEGORY_MAPPINGS[category] || [];
      const categoryIds = notifications
        .filter((n) => !n.readed && categoryTypes.includes(n.notificationType || ''))
        .map((n) => n.id);
      if (categoryIds.length === 0) return;

      try {
        storeMarkCategoryAsRead(category);
        await apiMarkAllNotificationsAsRead(categoryIds);
        queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      } catch (error) {
        console.error('❌ Error marking category as read:', error);
        invalidateQueries();
      }
    },
    [notifications, storeMarkCategoryAsRead, queryClient, invalidateQueries]
  );

  const handleNotificationClick = useCallback(
    (notification: NotificationData) => {
      if (!notification.readed) {
        markAsRead(notification.id);
      }

      if (notification.category === 'email') {
        router.push(`/dashboards/mails?conversation=${notification.metadata?.emailId}`);
        return;
      }
      if (!notification.leadId && !notification.projectId) return;

      let url = notification.leadId
        ? `/dashboards/leads/${notification.leadId}`
        : `/dashboards/projects/${notification.projectId}`;
      if (notification.leadId) {
        const params = new URLSearchParams();
        const idMap: Record<string, string> = {
          offer_created: 'highlightOffer',
          opening_created: 'highlightOpening',
          confirmation_created: 'highlightConfirmation',
          payment_voucher_created: 'highlightPayment',
        };

        const paramKey = idMap[notification.notificationType || ''];
        if (paramKey) {
          const id =
            notification.offerId ||
            notification.metadata?.offerId ||
            notification.metadata?.openingId ||
            notification.metadata?.confirmationId ||
            notification.metadata?.paymentId ||
            notification.id?.split('_')?.[2];
          if (id) params.set(paramKey, id);

          if (
            notification.notificationType === 'opening_created' &&
            notification.offerId &&
            !params.has('highlightOffer')
          ) {
            params.set('highlightOffer', notification.offerId);
          }
        }

        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;
      }
      console.log({ url });
      router.push(url);
    },
    [markAsRead, router]
  );

  const bulkMarkAsRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      try {
        // Optimistic update
        storeBulkMarkAsRead(ids);

        // API call
        await apiMarkAllNotificationsAsRead(ids);

        // Force refresh unread count
        await queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
        await queryClient.refetchQueries({ queryKey: ['unread-notifications-count'] });
      } catch (error) {
        console.error('❌ Error bulk marking notifications as read:', error);
        invalidateQueries();
      }
    },
    [storeBulkMarkAsRead, queryClient, invalidateQueries]
  );

  const bulkDelete = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      try {
        // Optimistic update
        storeBulkDelete(ids);

        // API call - use dbId if available, otherwise use id
        const apiIds = ids.map((id) => {
          const notification = notifications.find((n) => n.id === id);
          return notification?.dbId || id;
        });

        await apiDeleteNotifications(apiIds);

        // Force refresh unread count
        await queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
        await queryClient.refetchQueries({ queryKey: ['unread-notifications-count'] });
      } catch (error) {
        console.error('❌ Error bulk deleting notifications:', error);
        invalidateQueries();
      }
    },
    [notifications, storeBulkDelete, queryClient, invalidateQueries]
  );

  const bulkMute = useCallback(
    async (ids: string[]) => {
      // Mute functionality is not yet implemented in the backend
      // This is a placeholder for future implementation
      console.warn('Mute functionality not yet implemented');
    },
    []
  );

  return {
    markAsRead,
    markAllAsRead,
    markCategoryAsRead,
    bulkMarkAsRead,
    bulkDelete,
    bulkMute,
    handleNotificationClick,
  };
};
