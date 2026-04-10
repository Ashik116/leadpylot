/**
 * Notification Router Hook
 * Centralized navigation logic for notification click-to-navigate functionality
 * 
 * FEATURES:
 * - Configuration-driven navigation from notification.config.ts
 * - Auto mark-as-read on click
 * - Support for tabs and highlighting
 * - Fallback routes for missing data
 * - Type-safe with full TypeScript support
 */

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/stores/notificationStore';
import { apiMarkNotificationAsRead } from '@/services/notifications/NotificationsService';
import { 
  getNotificationConfig, 
  buildNavigationUrl,
  type NotificationType 
} from '@/configs/notification.config';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface NotificationNavigationData {
  id: string;
  read?: boolean;
  readed?: boolean; // Legacy field - will be removed
  notificationType?: string;
  type?: string;
  leadId?: string | null;
  projectId?: string | null;
  offerId?: string | null;
  emailId?: string | null;
  taskId?: string | null;
  documentId?: string | null;
  metadata?: {
    leadId?: string;
    projectId?: string;
    offerId?: string;
    openingId?: string;
    confirmationId?: string;
    paymentId?: string;
    netto1Id?: string;
    netto2Id?: string;
    emailId?: string;
    taskId?: string;
    documentId?: string;
    navigateTo?: {
      url?: string;
      tab?: string;
      highlight?: { type: string; id: string };
      fallback?: string;
    };
    [key: string]: any;
  };
  data?: any;
}

export interface UseNotificationRouterReturn {
  /** Handle notification click - marks as read and navigates */
  handleNotificationClick: (notification: NotificationNavigationData) => Promise<void>;
  /** Build URL without navigating */
  buildUrl: (notification: NotificationNavigationData) => string;
  /** Get full navigation info (url, tab, highlight) */
  getNavigationInfo: (notification: NotificationNavigationData) => {
    url: string;
    tab: string | null;
    highlight: { type: string; id: string } | null;
  };
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export const useNotificationRouter = (): UseNotificationRouterReturn => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateNotification = useNotificationStore(state => state.updateNotification);

  /**
   * Extract all IDs from notification for navigation
   */
  const extractNavigationIds = useCallback((notification: NotificationNavigationData): Record<string, any> => {
    const data = notification.data || {};
    const metadata = notification.metadata || data.metadata || {};

    return {
      // Lead ID - check multiple locations
      leadId: 
        notification.leadId || 
        metadata.leadId || 
        data.lead?.id || 
        data.lead?._id ||
        data.leadId ||
        null,

      // Project ID
      projectId: 
        notification.projectId || 
        metadata.projectId || 
        data.project?.id || 
        data.project?._id ||
        data.projectId ||
        null,

      // Offer ID
      offerId: 
        notification.offerId || 
        metadata.offerId || 
        data.offer?.id || 
        data.offer?._id ||
        data.offerId ||
        null,

      // Opening ID
      openingId: 
        metadata.openingId || 
        data.opening?.id || 
        data.opening?._id ||
        data.openingId ||
        null,

      // Confirmation ID
      confirmationId: 
        metadata.confirmationId || 
        data.confirmation?.id || 
        data.confirmation?._id ||
        data.confirmationId ||
        null,

      // Payment ID
      paymentId: 
        metadata.paymentId || 
        data.paymentVoucher?.id || 
        data.paymentVoucher?._id ||
        data.paymentId ||
        null,

      // Netto IDs
      netto1Id: metadata.netto1Id || data.netto1Id || null,
      netto2Id: metadata.netto2Id || data.netto2Id || null,

      // Email ID
      emailId: 
        notification.emailId || 
        metadata.emailId || 
        data.email?.id || 
        data.email?._id ||
        data.emailId ||
        null,

      // Task ID
      taskId: 
        notification.taskId || 
        metadata.taskId || 
        data.task?.id || 
        data.task?._id ||
        data.taskId ||
        null,

      // Document ID
      documentId: 
        notification.documentId || 
        metadata.documentId || 
        data.document?.id || 
        data.document?._id ||
        data.documentId ||
        null,

      // Include metadata for additional lookups
      metadata
    };
  }, []);

  /**
   * Get navigation info (url, tab, highlight) for a notification
   */
  const getNavigationInfo = useCallback((notification: NotificationNavigationData) => {
    const notificationType = notification.notificationType || notification.type || '';
    const metadata = notification.metadata || notification.data?.metadata || {};

    // Check if backend provided pre-built navigation URL
    if (metadata.navigateTo?.url) {
      return {
        url: metadata.navigateTo.url,
        tab: metadata.navigateTo.tab || null,
        highlight: metadata.navigateTo.highlight || null
      };
    }

    // Build navigation from config
    const navigationIds = extractNavigationIds(notification);
    return buildNavigationUrl(notificationType, navigationIds);
  }, [extractNavigationIds]);

  /**
   * Build URL string without navigating
   */
  const buildUrl = useCallback((notification: NotificationNavigationData): string => {
    const { url, tab, highlight } = getNavigationInfo(notification);
    
    // Build query params
    const params = new URLSearchParams();
    if (tab) params.set('tab', tab);
    if (highlight) {
      params.set(`highlight${highlight.type}`, highlight.id);
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }, [getNavigationInfo]);

  /**
   * Handle notification click - marks as read and navigates
   */
  const handleNotificationClick = useCallback(async (notification: NotificationNavigationData) => {
    // Check if already read (support both read and readed fields)
    const isRead = notification.read === true || notification.readed === true;

    // Mark as read if not already
    if (!isRead && notification.id) {
      try {
        await apiMarkNotificationAsRead(notification.id);
        
        // Update store - set both fields for compatibility
        updateNotification(notification.id, { read: true, readed: true });

        // Refresh unread count
        await queryClient.refetchQueries({
          queryKey: ['unread-notifications-count'],
          type: 'active'
        });
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        // Continue with navigation even if mark-as-read fails
      }
    }

    // Build and navigate to URL
    const url = buildUrl(notification);
    if (url) {
      router.push(url);
    }
  }, [router, queryClient, updateNotification, buildUrl]);

  return {
    handleNotificationClick,
    buildUrl,
    getNavigationInfo
  };
};

// ============================================
// UTILITY EXPORTS
// ============================================

/**
 * Get notification icon component by type
 * @param type - Notification type
 * @returns Lucide icon component
 */
export const getNotificationIcon = (type: string) => {
  const config = getNotificationConfig(type);
  return config.ui.icon;
};

/**
 * Get notification color classes by type
 * @param type - Notification type
 * @returns Object with color and bgColor classes
 */
export const getNotificationColors = (type: string) => {
  const config = getNotificationConfig(type);
  return {
    color: config.ui.color,
    bgColor: config.ui.bgColor
  };
};

/**
 * Check if notification type shows action badge
 * @param type - Notification type
 * @returns Boolean
 */
export const shouldShowActionBadge = (type: string): boolean => {
  const config = getNotificationConfig(type);
  return config.ui.showActionBadge;
};

export default useNotificationRouter;
