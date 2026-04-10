import { useInfiniteNotifications } from '@/services/hooks/notifications/useNotifications';
import { useInView } from 'react-intersection-observer';
import { useEffect, useMemo } from 'react';

export const useEmailNotifications = (leadId: string | undefined) => {
  // Setup react-intersection-observer for email notifications
  const { ref: loadMoreEmailRef, inView: emailInView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Use infinite query for email notifications
  const {
    data: infiniteEmailNotificationsData,
    isLoading: emailNotificationsLoading,
    error: emailNotificationsError,
    fetchNextPage: fetchNextEmailPage,
    hasNextPage: hasNextEmailPage,
    isFetchingNextPage: isFetchingNextEmailPage,
  } = useInfiniteNotifications({
    lead_id: leadId,
    type: 'email',
    limit: 10,
  });

  // Load more email notifications when the load more element comes into view
  useEffect(() => {
    if (emailInView && hasNextEmailPage && !isFetchingNextEmailPage) {
      fetchNextEmailPage();
    }
  }, [emailInView, hasNextEmailPage, isFetchingNextEmailPage, fetchNextEmailPage]);

  // Transform and group email notifications by date from the infinite query data
  const groupedEmailNotifications = useMemo(() => {
    const result: Record<string, any[]> = {};

    if (!infiniteEmailNotificationsData?.pages) {
      return result;
    }

    // Process all pages of email notifications
    infiniteEmailNotificationsData.pages.forEach((page) => {
      if (!page.data) return;

      page.data.forEach((notification) => {
        // Format the date for display
        const notificationDate = new Date(notification.created_at);
        const dateStr = notificationDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Transform notification to match our UI structure
        const transformedNotification = {
          id: notification._id,
          actor: notification.info.project_id?.agents?.[0]?.alias_name || 'System',
          timestamp: notificationDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          type: notification.inbox === 'incoming' ? 'email_received' : 'email_sent',
          details: {
            subject: notification.metadata?.subject || 'No Subject',
            content: notification.metadata?.body || 'No content',
            from_address: notification.metadata?.from_address,
            to: notification.metadata?.to,
          },
        };

        if (!result[dateStr]) {
          result[dateStr] = [];
        }

        result[dateStr].push(transformedNotification);
      });
    });

    return result;
  }, [infiniteEmailNotificationsData?.pages]);

  return {
    groupedEmailNotifications,
    emailNotificationsLoading,
    emailNotificationsError,
    hasNextEmailPage,
    isFetchingNextEmailPage,
    loadMoreEmailRef,
  };
};