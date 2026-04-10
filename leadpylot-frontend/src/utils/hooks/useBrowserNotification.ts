import { useCallback, useEffect } from 'react';
import {
  checkNotificationSupport,
  requestNotificationPermission,
  showNotification,
  showIncomingCallNotification
} from '@/services/notificationService';

/**
 * Custom hook for browser notifications
 * Provides methods to request permission and show different types of notifications
 */
export const useBrowserNotification = () => {
  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  /**
   * Check if browser supports notifications
   */
  const isSupported = useCallback(() => {
    return checkNotificationSupport();
  }, []);

  /**
   * Request notification permission from user
   */
  const requestPermission = useCallback(async () => {
    return await requestNotificationPermission();
  }, []);

  /**
   * Show a notification for an incoming call
   */
  const notifyIncomingCall = useCallback((caller: string) => {
    return showIncomingCallNotification(caller);
  }, []);

  /**
   * Show a custom notification
   */
  const notify = useCallback((options: {
    title: string;
    body: string;
    icon?: string;
    requireInteraction?: boolean;
    onClick?: () => void;
  }) => {
    return showNotification(options);
  }, []);

  return {
    isSupported,
    requestPermission,
    notifyIncomingCall,
    notify
  };
};

export default useBrowserNotification;
