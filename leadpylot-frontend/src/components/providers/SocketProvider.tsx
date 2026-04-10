'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import socketService, { RealtimeNotification } from '@/services/SocketService';
import audioService from '@/utils/audioUtils';
import toast from '@/components/ui/toast';
import NotificationToast from '@/components/ui/Notification/NotificationToast';
import { isDev } from '@/utils/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationClick } from '@/hooks/useNotificationClick';
import { useNotificationStore } from '@/stores/notificationStore';
import {
  TransformDataNotification,
  transformRealtimeNotification,
} from '@/services/notifications/notificationTransformers';

interface SocketContextType {
  isConnected: boolean;
  ping: () => void;
  updateStatus: (status: 'online' | 'away' | 'busy' | 'offline') => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

// Notification configuration
const NOTIFICATION_CONFIG = {
  // Simple text notifications
  simple: {
    agent_login: { roles: ['Admin'], type: 'info', volume: 0.6 },
    agent_logout: { roles: ['Admin'], type: 'info', volume: 0.4 },
    commission_earned: { roles: ['Agent'], type: 'success', volume: 0.8 },
    email: { roles: ['Admin', 'Agent'], type: 'info', volume: 0.6 },
    email_received: { roles: ['Admin', 'Agent'], type: 'info', volume: 0.6 },
    email_system_received: { roles: ['Admin', 'Agent'], type: 'info', volume: 0.6 },
    email_approved: { roles: ['Agent'], type: 'success', volume: 0.7, useEmailSound: true },
    email_agent_assigned: { roles: ['Agent'], type: 'success', volume: 0.7 },
    email_comment_mention: { roles: ['Admin', 'Agent'], type: 'info', volume: 0.7 },
    email_comment_added: { roles: ['Admin', 'Agent'], type: 'info', volume: 0.5 },
    // Office notifications
    office_created: { roles: ['Admin'], type: 'info', volume: 0.6 },
    office_member_assigned: { roles: ['Admin', 'Agent'], type: 'info', volume: 0.6 },
    // Todo/Kanban notifications
    todo_created: { roles: ['Admin', 'Agent'], type: 'success', volume: 0.7 },
    todo_assigned: { roles: ['Admin', 'Agent'], type: 'success', volume: 0.7 },
    todo_agent_assignment: { roles: ['Admin'], type: 'info', volume: 0.6 },
    todo_completed: { roles: ['Admin', 'Agent'], type: 'success', volume: 0.7 },
    todo_completed_admin: { roles: ['Admin'], type: 'success', volume: 0.7 },
    todo_updated: { roles: ['Admin', 'Agent'], type: 'info', volume: 0.5 },
  },
  // Lead-related notifications (custom component)
  leads: {
    lead_assigned: { roles: ['Admin', 'Agent'], volume: 0.8 },
    lead_transferred: { roles: ['Admin', 'Agent'], volume: 0.8 },
    bulk_lead_transferred: { roles: ['Admin', 'Agent'], volume: 0.8 },
    project_created: { roles: ['Admin', 'Agent'], volume: 0.6 },
    project_assigned: { roles: ['Agent'], volume: 0.7 },
    lead_converted: { roles: ['Admin', 'Agent'], volume: 0.8 },
    lead_form_created: { roles: ['Admin'], volume: 0.8 },
  },
  // Offer-related notifications (custom component). Audio: if rule has custom file, play it; else default.
  offers: {
    offer_created: { roles: ['Admin', 'Agent'], volume: 0.7, duration: 6000 },
    offer_updated: { roles: ['Admin', 'Agent'], volume: 0.7, duration: 6000 },
    opening_created: { roles: ['Admin', 'Agent'], volume: 0.5 }, // custom audio via audioRuleId when rule exists
    confirmation_created: { roles: ['Admin', 'Agent'], volume: 0.7 },
    payment_voucher_created: { roles: ['Admin', 'Agent'], volume: 0.7 },
    netto1_created: { roles: ['Admin', 'Agent'], volume: 0.7 },
    netto2_created: { roles: ['Admin', 'Agent'], volume: 0.7 },
    revenue_target_met: { roles: ['Admin', 'Agent'], volume: 0.7 },
  },
  // Silent notifications (header only, no toast)
  silent: {
    lead_assignment_admin: { roles: ['Admin'] },
  },
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [hasBulkSyncSoundPlayed, setHasBulkSyncSoundPlayed] = useState(false);
  const isUnmountingRef = useRef(false);
  const bulkSyncToastCountRef = useRef(0);
  // Prefer custom audio: delay default play so we can cancel it if a notification with custom audio arrives
  const pendingDefaultPlayRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastAudioPlayRef = useRef<{ category: string; timestamp: number } | null>(null);

  const { addNotification, markAsRead: storeMarkAsRead } = useNotificationStore();

  // Check if should play notification sound (handles bulk sync)
  const shouldPlayNotificationSound = useCallback(
    (notification: RealtimeNotification): boolean => {
      if (notification._isBulkSync) {
        if (notification._isFirstInBatch && !hasBulkSyncSoundPlayed) {
          setHasBulkSyncSoundPlayed(true);
          return true;
        }
        if (notification._isLastInBatch) {
          setTimeout(() => setHasBulkSyncSoundPlayed(false), 1000);
        }
        return false;
      }
      return true;
    },
    [hasBulkSyncSoundPlayed]
  );

  // Check if should show toast (show latest 5 from bulk sync)
  const shouldShowToast = useCallback((notification: RealtimeNotification): boolean => {
    if (notification._isBulkSync) {
      // Show toast for first 5 bulk sync notifications (latest ones)
      if (bulkSyncToastCountRef.current < 5) {
        bulkSyncToastCountRef.current++;
        return true;
      }

      // Reset counter when batch is complete
      if (notification._isLastInBatch) {
        setTimeout(() => {
          bulkSyncToastCountRef.current = 0;
        }, 1000);
      }

      return false;
    }
    return true;
  }, []);

  const markAsRead = useCallback(
    (notificationId: string) => {
      socketService.markNotificationAsRead(notificationId);
      storeMarkAsRead(notificationId);
    },
    [storeMarkAsRead]
  );

  const { handleClick } = useNotificationClick({ socketMarkAsRead: markAsRead });

  // Extract projectId from notification data (handles multiple data structures)
  const extractProjectId = useCallback((notification: RealtimeNotification): string | undefined => {
    // Try various possible locations for projectId
    // Primary: project object (check both id and _id for Mongoose compatibility)
    if (notification.data?.project?.id) {
      return notification.data.project.id;
    }
    if (notification.data?.project?._id) {
      return notification.data.project._id;
    }
    if (notification.data?.project_id) {
      return notification.data.project_id;
    }
    // Fallback: check metadata for projectId
    if (notification.data?.metadata?.projectId) {
      return notification.data.metadata.projectId;
    }
    return undefined;
  }, []);

  // Play notification sound. Prefer custom audio: if a notification has custom audio (audioRuleId),
  // play only that; otherwise play default. Applies to all event types (todo_*, lead_*, offer_*,
  // opening_created, confirmation_created, etc.). When two notifications arrive (default first, then
  // custom), we delay default and cancel it if custom arrives so only one sound plays.
  const playNotificationSound = useCallback(
    (notification: RealtimeNotification, config: any) => {
      if (!shouldPlayNotificationSound(notification)) return;

      const projectId = extractProjectId(notification);
      const audioRuleId = notification.data?.audioRuleId as string | undefined;
      const useRuleAudioOnly = notification.data?.useRuleAudioOnly as boolean | undefined;
      const volume = config?.volume ?? 0.6;
      const category = notification.type.split('_')[0];
      const hasCustomAudio = !!audioRuleId;

      if (config?.useEmailSound) {
        audioService.playEmailNotification(volume).catch(() => {});
        return;
      }

      // If this notification has custom audio: cancel any pending default for this category and play custom only
      if (hasCustomAudio) {
        const pending = pendingDefaultPlayRef.current[category];
        if (pending) {
          clearTimeout(pending);
          delete pendingDefaultPlayRef.current[category];
          if (isDev) {
            // eslint-disable-next-line no-console
            console.log('⏭️ Cancelled pending default (custom audio arrived)', { category });
          }
        }
        lastAudioPlayRef.current = { category, timestamp: Date.now() };
        audioService
          .playNotification(volume, notification.type, projectId, audioRuleId, useRuleAudioOnly)
          .then(() => {
            if (isDev) {
              // eslint-disable-next-line no-console
              console.log('✅ Custom notification sound played', { type: notification.type });
            }
          })
          .catch((err) => {
            if (isDev) console.warn('❌ Custom audio failed', err);
          });
        return;
      }

      // No custom audio: avoid double play (same category within 2s)
      const now = Date.now();
      const last = lastAudioPlayRef.current;
      if (last && last.category === category && now - last.timestamp < 2000) {
        if (isDev) {
          // eslint-disable-next-line no-console
          console.log('⏭️ Audio skipped (same category within 2s)', { category });
        }
        return;
      }

      // Delay default play so that if a notification with custom audio arrives shortly after,
      // we cancel this and play only custom
      const existing = pendingDefaultPlayRef.current[category];
      if (existing) clearTimeout(existing);

      pendingDefaultPlayRef.current[category] = setTimeout(() => {
        delete pendingDefaultPlayRef.current[category];
        lastAudioPlayRef.current = { category, timestamp: Date.now() };
        audioService
          .playNotification(volume, notification.type, projectId)
          .then(() => {
            if (isDev) {
              // eslint-disable-next-line no-console
              console.log('✅ Default notification sound played', { type: notification.type });
            }
          })
          .catch((err) => {
            if (isDev) console.warn('❌ Default audio failed', err);
          });
      }, 450);
    },
    [shouldPlayNotificationSound, extractProjectId, user?.role, isDev]
  );

  // Check if user has required role
  const hasRole = useCallback(
    (roles?: string[]) => {
      return !roles || roles.includes(user?.role || '');
    },
    [user?.role]
  );

  // Show notification toast
  const showNotificationToast = useCallback(
    (notification: RealtimeNotification, item: any) => {
      const { type } = notification;

      // TEMPORARY: Always log for debugging
      console.log('🎨 showNotificationToast called:', {
        type,
        userRole: user?.role,
        hasTitle: !!notification.title,
        hasMessage: !!notification.message,
        fullNotification: notification,
      });

      try {
        // Find which config bucket this notification belongs to (for role check + sound)
        const simpleConfig =
          NOTIFICATION_CONFIG.simple[type as keyof typeof NOTIFICATION_CONFIG.simple];
        const leadConfig =
          NOTIFICATION_CONFIG.leads[type as keyof typeof NOTIFICATION_CONFIG.leads];
        const offerConfig =
          NOTIFICATION_CONFIG.offers[type as keyof typeof NOTIFICATION_CONFIG.offers];
        const silentConfig =
          NOTIFICATION_CONFIG.silent[type as keyof typeof NOTIFICATION_CONFIG.silent];

        // Determine which config applies
        const activeConfig = simpleConfig || leadConfig || offerConfig || silentConfig;
        if (!activeConfig || !hasRole(activeConfig.roles)) {
          console.warn('⚠️ Notification type not handled or role mismatch:', {
            type,
            activeConfig,
            userRole: user?.role,
            hasRole: hasRole(activeConfig?.roles),
          });
          return false;
        }

        // Silent notifications - no toast, just store in header
        if (silentConfig && hasRole(silentConfig.roles)) {
          return true;
        }

        // Extract actor name from notification data
        const actorName =
          notification.data?.creator?.name ||
          notification.data?.creator?.login ||
          notification.data?.agent?.name ||
          notification.data?.agent?.login ||
          '';

        // Extract metadata from data payload
        const metadata = notification.data?.metadata || (notification.data as any)?.metadata || {};

        // Persistent types: stay until user closes/clicks (duration=0 disables auto-close)
        const persistentTypes = [
          'offer_created', 'offer_updated', 'opening_created',
          'confirmation_created', 'payment_voucher_created',
          'netto1_created', 'netto2_created',
          'email', 'email_received', 'email_system_received',
          'email_approved', 'email_agent_assigned',
          'email_comment_mention', 'email_comment_added',
        ];
        const toastDuration = persistentTypes.includes(type) ? 0 : 5000;

        console.log('🍞 About to push toast:', {
          notificationType: type,
          title: notification.title,
          message: notification.message,
          metadata,
          toastDuration,
        });

        const toastResult = toast.push(
          <NotificationToast
            notificationType={type}
            title={notification.title}
            message={notification.message}
            metadata={metadata}
            actorName={user?.role === 'Admin' && actorName && actorName !== 'System' ? actorName : undefined}
            onClick={() => handleClick(item as any)}
            duration={toastDuration}
          />
        );

        console.log('✅ Toast push completed, result:', toastResult);

        // Handle promise if toast.push returns one
        if (toastResult instanceof Promise) {
          toastResult
            .then((key) => {
              console.log('✅ Toast displayed with key:', key);
            })
            .catch((error) => {
              console.error('❌ Error pushing toast:', error);
            });
        }

        // Play notification sound
        playNotificationSound(notification, activeConfig);
        return true;
      } catch (error) {
        if (isDev) {
          // eslint-disable-next-line no-console
          console.error('❌ Error showing notification toast:', error, {
            type,
            notification,
          });
        }
      }

      return false;
    },
    [user?.role, handleClick, hasRole, playNotificationSound]
  );

  // Security guard - check if notification should be processed
  // NOTE: Removed useCallback to avoid stale closure bugs
  const shouldProcessNotification = () => {
    const currentPath = window.location.pathname;
    const isAuthPage =
      currentPath.includes('/login') ||
      currentPath.includes('/auth') ||
      currentPath.includes('/sign-in');

    const shouldProcess =
      isAuthenticated &&
      user &&
      user.accessToken &&
      user.id &&
      user.role &&
      !isUnmountingRef.current &&
      !isAuthPage;

    // Debug logging removed - bug fixed (stale closure in useCallback)

    return shouldProcess;
  };

  // Handle Socket.IO connection
  useEffect(() => {
    if (isAuthenticated && user?.accessToken) {
      socketService.disconnect();
      socketService.connect(user.accessToken);

      const unsubscribeConnection = socketService.onConnectionChange(setIsConnected);

      const unsubscribeNotifications = socketService.onNotification((notification) => {
        // TEMPORARY: Always log for debugging
        console.log('🔔 SocketProvider received notification:', {
          id: notification.id,
          type: notification.type,
          userRole: user?.role,
          isAuthenticated,
          shouldProcess: shouldProcessNotification(),
          isBulkSync: notification._isBulkSync,
          fullNotification: notification,
        });

        if (!shouldProcessNotification()) {
          console.warn('⚠️ Notification filtered out by shouldProcessNotification:', {
            type: notification.type,
            isAuthenticated,
            user: !!user,
          });
          return;
        }

        // Transform notification data
        const item = TransformDataNotification(notification);
        const transformedNotification = transformRealtimeNotification(notification);

        // Always add to notification store (for header notification center)
        addNotification(transformedNotification);

        // Check if toast should be shown
        // For bulk sync notifications, only show first 5
        // For regular notifications, always show
        const shouldShow = shouldShowToast(notification);

        console.log('📊 Toast decision:', {
          shouldShow,
          type: notification.type,
          isBulkSync: notification._isBulkSync,
          userRole: user?.role,
        });

        if (shouldShow) {
          console.log('✅ About to show toast for notification:', {
            type: notification.type,
            isBulkSync: notification._isBulkSync,
            userRole: user?.role,
          });
          try {
            const toastShown = showNotificationToast(notification, item);
            if (!toastShown) {
              console.warn('⚠️ showNotificationToast returned false for:', notification.type, {
                availableConfigs: {
                  simple: Object.keys(NOTIFICATION_CONFIG.simple),
                  leads: Object.keys(NOTIFICATION_CONFIG.leads),
                  offers: Object.keys(NOTIFICATION_CONFIG.offers),
                },
              });
            }
          } catch (error) {
            console.error('❌ Error in showNotificationToast:', error);
          }
        } else {
          console.log('⏭️ Skipping toast:', {
            type: notification.type,
            isBulkSync: notification._isBulkSync,
            reason: notification._isBulkSync
              ? 'bulk sync limit reached'
              : 'shouldShowToast returned false',
          });
        }
      });

      return () => {
        unsubscribeConnection();
        unsubscribeNotifications();
      };
    } else if (!isAuthenticated) {
      isUnmountingRef.current = true;
      socketService.disconnect(); // This will trigger onConnectionChange callback to update state
      setTimeout(() => {
        isUnmountingRef.current = false;
      }, 1000);
    }
    // Note: shouldProcessNotification is intentionally not in dependencies
    // to avoid stale closure bugs that were causing notifications to be blocked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    user?.accessToken,
    user?.role,
    user?.id,
    addNotification,
    showNotificationToast,
    shouldShowToast,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      socketService.disconnect(); // This will trigger onConnectionChange callback to update state
    };
  }, []);

  const contextValue: SocketContextType = {
    isConnected,
    ping: useCallback(() => socketService.ping(), []),
    updateStatus: useCallback((status) => socketService.updateStatus(status), []),
  };

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

export default SocketProvider;
