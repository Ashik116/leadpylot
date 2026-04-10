/**
 * Notification Service
 * Provides utilities for browser notifications
 */

/**
 * Check if browser supports notifications
 * @returns boolean indicating if notifications are supported
 */
export const checkNotificationSupport = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Request notification permission from the user
 * @returns Promise resolving to boolean indicating if permission was granted
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!checkNotificationSupport()) return false;
  
  const BrowserNotification = window.Notification;
  if (BrowserNotification.permission !== 'granted' && BrowserNotification.permission !== 'denied') {
    const permission = await BrowserNotification.requestPermission();
    return permission === 'granted';
  }
  
  return BrowserNotification.permission === 'granted';
};

/**
 * Check if notification permission is granted
 * @returns boolean indicating if permission is granted
 */
export const hasNotificationPermission = (): boolean => {
  if (!checkNotificationSupport()) return false;
  return window.Notification.permission === 'granted';
};

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  requireInteraction?: boolean;
  onClick?: () => void;
}

/**
 * Show a browser notification if the tab is not focused
 * @param options Notification options
 * @returns Notification object or undefined if notification couldn't be shown
 */
export const showNotification = (options: NotificationOptions): Notification | undefined => {
  if (!checkNotificationSupport()) return;
  
  const BrowserNotification = window.Notification;
  if (BrowserNotification.permission !== 'granted') {
    return;
  }
  
  // Only show notification if tab is not focused
  if (document.hasFocus()) {
    return;
  }
  
  const notification = new BrowserNotification(options.title, {
    body: options.body,
    icon: options.icon || '/favicon.ico',
    requireInteraction: options.requireInteraction ?? false,
  });
  
  if (options.onClick) {
    notification.onclick = () => {
      options.onClick?.();
      notification.close();
    };
  }
  
  return notification;
};

/**
 * Show a notification for an incoming call
 * @param caller The name or number of the caller
 * @returns Notification object or undefined if notification couldn't be shown
 */
export const showIncomingCallNotification = (caller: string): Notification | undefined => {
  return showNotification({
    title: 'Incoming Call',
    body: `Call from ${caller || 'Unknown'}`,
    icon: '/favicon.ico',
    requireInteraction: true,
    onClick: () => {
      window.focus();
    }
  });
};
