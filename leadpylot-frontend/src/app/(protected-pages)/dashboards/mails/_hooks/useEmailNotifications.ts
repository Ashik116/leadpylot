/**
 * useEmailNotifications Hook
 * Listens for real-time new email notifications and triggers refresh
 */

import { useEffect, useCallback } from 'react';
import socketService from '@/services/SocketService';

interface EmailNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: {
    email_id: string;
    subject: string;
    from: string;
    to: string;
    received_at: string;
    has_attachments: boolean;
    project_id?: string;
    project_name?: string;
    mailserver_id: string;
    mailserver_name: string;
    direction: string;
    approval_status?: string;
  };
  timestamp: string;
  read: boolean;
}

interface UseEmailNotificationsOptions {
  /**
   * Callback to execute when a new email is received
   * Typically used to refresh the email list
   */
  onNewEmail?: (notification: EmailNotification) => void;
  
  /**
   * Whether to enable the listener (default: true)
   */
  enabled?: boolean;
  
  /**
   * Filter by project ID (optional)
   */
  projectId?: string;
  
  /**
   * Filter by mailserver ID (optional)
   */
  mailserverId?: string;
}

/**
 * Hook to listen for real-time email notifications
 * 
 * @example
 * ```tsx
 * const { lastEmail } = useEmailNotifications({
 *   onNewEmail: (notification) => {
 *     console.log('New email received:', notification);
 *     refetchEmails(); // Refresh email list
 *   }
 * });
 * ```
 */
export function useEmailNotifications(options: UseEmailNotificationsOptions = {}) {
  const {
    onNewEmail,
    enabled = true,
    projectId,
    mailserverId,
  } = options;

  const handleNewEmail = useCallback(
    (notification: EmailNotification) => {
      // eslint-disable-next-line no-console
      console.log('📧 Real-time email notification received:', notification);

      // Apply filters if specified
      if (projectId && notification.data.project_id !== projectId) {
        // eslint-disable-next-line no-console
        console.log('🔍 Filtered out - different project');
        return;
      }

      if (mailserverId && notification.data.mailserver_id !== mailserverId) {
        // eslint-disable-next-line no-console
        console.log('🔍 Filtered out - different mailserver');
        return;
      }

      // Call the callback
      if (onNewEmail) {
        onNewEmail(notification);
      }
    },
    [onNewEmail, projectId, mailserverId]
  );

  useEffect(() => {
    if (!enabled) return;

    // Listen for email:new events
    const cleanup = socketService.onCustomEvent('email:new', handleNewEmail);

    return cleanup;
  }, [enabled, handleNewEmail]);
}

