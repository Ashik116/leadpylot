import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { isDev } from '@/utils/utils';
import { apiMarkNotificationAsRead } from '@/services/notifications/NotificationsService';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/stores/notificationStore';

interface NotificationItem {
    id: string;
    readed: boolean;
    leadId?: string;
    projectId?: string;
    offerId?: string;
    notificationType?: string;
    metadata?: {
        openingId?: string;
        offerId?: string;
        confirmationId?: string;
        paymentId?: string;
        emailId?: string;
    };
    data?: {
        todo?: { id?: string };
        task?: { _id?: string; id?: string };
        taskId?: string;
        external_id?: string;
        emailId?: string;
    };
}

interface UseNotificationClickCallbacks {
    socketMarkAsRead?: (id: string) => void;
    refreshNotifications?: () => Promise<void>;
}

export const useNotificationClick = (callbacks?: UseNotificationClickCallbacks) => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { socketMarkAsRead: socketMarkAsReadCallback, refreshNotifications } = callbacks || {};
    // const setUnreadCount = useNotificationStore(state => state.setUnreadCount);
    const updateNotification = useNotificationStore(state => state.updateNotification);

    const handleClick = useCallback(async (notification: NotificationItem) => {
        if (!notification.readed) {
            console.log('handleClick', notification);
            try {
                await apiMarkNotificationAsRead(notification.id);

                // Update notification as read in the store
                updateNotification(notification.id, { readed: true, read: true });

                // Update local store unread count immediately for instant UI feedback
                // const currentCount = useNotificationStore.getState().unreadCount;
                // setUnreadCount(Math.max(0, currentCount - 1));

                if (socketMarkAsReadCallback) {
                    socketMarkAsReadCallback(notification.id);
                }

                // 3. Force refetch the unread count immediately
                await queryClient.refetchQueries({
                    queryKey: ['unread-notifications-count'],
                    type: 'active'
                });

                // 4. Refresh notification list in header dropdown
                if (refreshNotifications) {
                    await refreshNotifications();
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                isDev && console.error('❌ Failed to mark notification as read:', error);
            }
        } else {
            // eslint-disable-next-line no-console
            isDev && console.log('⏭️ Notification already read, skipping mark as read');
        }

        // Build navigation URL
        const buildUrl = () => {
            // Handle todo/kanban notifications
            const todoTypes = [
                'todo_created',
                'todo_assigned',
                'todo_agent_assignment',
                'todo_completed',
                'todo_completed_admin',
                'todo_updated',
            ];
            
            if (todoTypes.includes(notification.notificationType || '')) {
                // Extract task ID from notification data
                const taskId = notification.data?.todo?.id || 
                               notification.data?.task?._id || 
                               notification.data?.task?.id ||
                               notification.data?.taskId ||
                               notification.data?.external_id?.split('_')?.[2];
                
                if (taskId) {
                    return `/dashboards/kanban?taskId=${taskId}`;
                }
                return '/dashboards/kanban';
            }

            // Handle email notifications — navigate to lead's email tab
            const emailTypes = ['email', 'email_approved', 'email_agent_assigned'];
            if (emailTypes.includes(notification.notificationType || '')) {
                const emailId = notification.data?.emailId || notification.metadata?.emailId || '';
                if (notification.leadId) {
                    const params = new URLSearchParams();
                    params.set('tab', 'emails');
                    if (emailId) params.set('emailId', emailId);
                    return `/dashboards/leads/${notification.leadId}?${params}`;
                }
                // Fallback to email system page if no leadId
                return emailId
                    ? `/dashboards/email-system?emailId=${emailId}`
                    : '/dashboards/email-system';
            }

            if (notification.leadId) {
                const url = `/dashboards/leads/${notification.leadId}`;
                const params = new URLSearchParams();

                const addParam = (key: string, value: string) => {
                    if (value) params.set(key, value);
                };

                switch (notification.notificationType) {
                    case 'offer_created':
                        addParam('highlightOffer', notification.offerId || notification.id?.split('_')?.[2] || '');
                        break;
                    case 'opening_created':
                        addParam('highlightOpening', notification.metadata?.openingId || notification.offerId || notification.id?.split('_')?.[2] || '');
                        addParam('highlightOffer', notification.metadata?.offerId || notification.offerId || '');
                        break;
                    case 'confirmation_created':
                        addParam('highlightConfirmation', notification.metadata?.confirmationId || notification.id?.split('_')?.[2] || '');
                        break;
                    case 'payment_voucher_created':
                        addParam('highlightPayment', notification.metadata?.paymentId || notification.id?.split('_')?.[2] || '');
                        break;
                    default:
                        // No params to add for unknown notification types
                        break;
                }

                return params.toString() ? `${url}?${params}` : url;
            }
            return notification.projectId ? `/dashboards/projects/${notification.projectId}` : null;
        };

        const url = buildUrl();
        if (url) router.push(url);
    }, [router, socketMarkAsReadCallback, queryClient, refreshNotifications, updateNotification]);

    return { handleClick };
};
