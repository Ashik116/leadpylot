// 'use client';

// import React, {
//   createContext,
//   useContext,
//   useEffect,
//   useState,
//   ReactNode,
//   useCallback,
//   useRef,
// } from 'react';
// import { useQuery, useQueryClient } from '@tanstack/react-query';
// import { useSession } from '@/hooks/useSession';
// import { usePathname } from 'next/navigation';
// import {
//   apiGetPendingNotifications,
//   apiGetUnreadNotificationsCount,
//   apiMarkNotificationAsRead,
//   apiMarkAllNotificationsAsRead,
//   apiGetNotifications,
// } from '@/services/notifications/NotificationsService';
// import { useSocket } from './SocketProvider';
// import socketService from '@/services/SocketService';

// // Types
// interface NotificationData {
//   id: string;
//   type: string;
//   category: string;
//   priority: 'low' | 'medium' | 'high';
//   title: string;
//   message: string;
//   timestamp: string;
//   read: boolean;
//   data?: any;
//   dbId?: string;
//   _isSynced?: boolean;
// }

// interface NotificationSyncContextType {
//   notifications: NotificationData[];
//   unreadCount: number;
//   isLoading: boolean;
//   error: string | null;
//   markAsRead: (id: string) => Promise<void>;
//   markAllAsRead: () => Promise<void>;
//   refreshNotifications: () => Promise<void>;
//   syncNotifications: () => Promise<void>;
//   lastSyncTime: string | null;
// }

// const NotificationSyncContext = createContext<NotificationSyncContextType | undefined>(undefined);

// interface NotificationSyncProviderProps {
//   children: ReactNode;
// }

// export const NotificationSyncProvider: React.FC<NotificationSyncProviderProps> = ({ children }) => {
//   const [notifications, setNotifications] = useState<NotificationData[]>([]);
//   const [error, setError] = useState<string | null>(null);
//   const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
//   const queryClient = useQueryClient();
//   const intervalRef = useRef<NodeJS.Timeout | null>(null);

//   // Session and path checking for authentication
//   const { data: session, status: sessionStatus } = useSession();
//   const currentPath = usePathname();

//   // Real-time notifications from Socket.IO
//   const { notifications: realtimeNotifications } = useSocket();

//   // Check if user is authenticated and not on auth pages
//   const isAuthenticated = sessionStatus === 'authenticated' && session?.user;
//   const isAuthPage =
//     currentPath?.startsWith('/sign-in') ||
//     currentPath?.startsWith('/forgot-password') ||
//     currentPath?.startsWith('/reset-password');

//   const shouldEnableQueries = isAuthenticated && !isAuthPage;

//   // Get unread count
//   const { data: unreadCountData, isLoading: isUnreadCountLoading } = useQuery({
//     queryKey: ['unread-notifications-count'],
//     queryFn: apiGetUnreadNotificationsCount,
//     refetchInterval: shouldEnableQueries ? 30000 : false,
//     staleTime: 25000,
//     enabled: shouldEnableQueries,
//   });

//   const unreadCount = Number(unreadCountData?.count || 0);
//   const prevUnreadCountRef = useRef<number | undefined>(undefined);

//   // Debug logging for unread count
//   // useEffect(() => {
//   //   console.log('🔢 Unread count from API:', unreadCount, 'Raw data:', unreadCountData);
//   // }, [unreadCount, unreadCountData]);

//   // Auto-refresh notification list when unread count changes (not on initial load)
//   // This ensures the list updates when notifications are marked as read from toast
//   useEffect(() => {
//     if (shouldEnableQueries && unreadCountData) {
//       // Only reload if count actually changed (not on initial load)
//       if (prevUnreadCountRef.current !== undefined && prevUnreadCountRef.current !== unreadCount) {
//         // console.log('🔄 Unread count changed, refreshing notification list...');
//         loadAllNotifications();
//       }
//       prevUnreadCountRef.current = Number(unreadCount);
//     }
//   }, [unreadCount, shouldEnableQueries]); // eslint-disable-line react-hooks/exhaustive-deps
//   // Note: We intentionally omit loadAllNotifications from deps to avoid infinite loops

//   // Initialize sync timestamp only once when authentication is established
//   useEffect(() => {
//     if (!shouldEnableQueries) return;

//     const stored = localStorage.getItem('lastNotificationSync');
//     if (stored) {
//       setLastSyncTime(stored);
//     }
//   }, [shouldEnableQueries]);

//   // Sync notifications from database - stable function without dependencies
//   const syncNotifications = useCallback(async () => {
//     if (!shouldEnableQueries) return;

//     try {
//       setError(null);

//       // Get last sync time or default to 24 hours ago
//       const since = lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

//       const response = await apiGetPendingNotifications(since, 50);

//       if (response.success) {
//         const transformedNotifications = response.data.map((notification: any) => ({
//           id: notification.id,
//           type: notification.type,
//           category: notification.category,
//           priority: notification.priority,
//           title: notification.title,
//           message: notification.message,
//           timestamp: notification.timestamp,
//           read: notification.read,
//           data: notification.data,
//           dbId: notification.dbId,
//           _isSynced: true,
//         }));

//         // Merge with existing notifications, avoiding duplicates
//         setNotifications((prev) => {
//           const existingIds = new Set(prev.map((n) => n.id));
//           const newNotifications = transformedNotifications.filter(
//             (n: NotificationData) => !existingIds.has(n.id)
//           );

//           return [...prev, ...newNotifications].sort(
//             (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
//           );
//         });

//         // Update sync timestamp
//         const newSyncTime = response.syncTimestamp;
//         setLastSyncTime(newSyncTime);
//         localStorage.setItem('lastNotificationSync', newSyncTime);

//         // console.log(`✅ Synced ${transformedNotifications.length} notifications`);
//       }
//     } catch (error) {
//       console.error('❌ Sync failed:', error);
//       setError('Failed to sync notifications');
//     }
//   }, []); // Remove all dependencies to prevent infinite loops

//   // Load all notifications (for page refresh)
//   const loadAllNotifications = useCallback(async () => {
//     if (!shouldEnableQueries) {
//       // console.log('⏭️ Skipping notification load - not authenticated');
//       return;
//     }

//     try {
//       setError(null);
//       // console.log('🔍 Loading ALL notifications from API...');

//       // Load ALL notifications from the main API (not just pending)
//       const response = await apiGetNotifications({ limit: 100 });
//       // console.log('📡 API Response:', response);

//       if (
//         response &&
//         ((response as any).success || (response as any).data || Array.isArray(response))
//       ) {
//         const notificationsData = (response as any).data || response;
//         // console.log('📊 Raw notifications data:', notificationsData);

//         if (Array.isArray(notificationsData) && notificationsData.length > 0) {
//           const transformedNotifications = notificationsData.map((notification: any) => ({
//             id: notification.id || notification._id,
//             type: notification.type || 'general',
//             category: notification.category || 'general',
//             priority: notification.priority || 'medium',
//             title: notification.title || notification.metadata?.subject || 'Notification',
//             message:
//               notification.message ||
//               notification.metadata?.body ||
//               notification.description ||
//               'New notification',
//             timestamp:
//               notification.timestamp || notification.created_at || new Date().toISOString(),
//             readed: notification.read !== undefined ? notification.read : false,
//             data: notification.data || notification,
//             dbId: notification._id || notification.id,
//             _isSynced: true,
//             // Add deduplication key for grouping similar notifications
//             _dedupeKey: `${notification.type}_${notification.external_id || notification.id || notification._id}`,
//           }));

//           // Deduplicate notifications by external_id (group admin notifications)
//           const deduplicatedNotifications = transformedNotifications.reduce(
//             (acc: any[], current: any) => {
//               // Check if we already have a notification with the same external_id or deduplication key
//               const existingIndex = acc.findIndex(
//                 (item) =>
//                   (current.data.external_id &&
//                     item.data.external_id === current.data.external_id) ||
//                   (current._dedupeKey && item._dedupeKey === current._dedupeKey)
//               );

//               if (existingIndex >= 0) {
//                 // If we found a duplicate, keep the more recent one (or merge read status)
//                 const existing = acc[existingIndex];
//                 acc[existingIndex] = {
//                   ...existing,
//                   // Keep the latest timestamp
//                   timestamp:
//                     new Date(current.timestamp) > new Date(existing.timestamp)
//                       ? current.timestamp
//                       : existing.timestamp,
//                   // Mark as read only if all duplicates are read
//                   read: existing.read && current.read,
//                   // Merge any additional data
//                   data: { ...existing.data, ...current.data },
//                 };
//               } else {
//                 // No duplicate found, add to results
//                 acc.push(current);
//               }

//               return acc;
//             },
//             []
//           );

//           // Replace all notifications with deduplicated data
//           setNotifications(deduplicatedNotifications);

//           // console.log(`✅ Loaded ${deduplicatedNotifications.length} notifications from database (${transformedNotifications.length - deduplicatedNotifications.length} duplicates removed)`);
//         } else {
//           // console.log('📭 No notifications found in API response');
//           setNotifications([]);
//         }
//       } else {
//         console.warn('⚠️ API response format unexpected:', response);
//         setNotifications([]);
//       }
//     } catch (error) {
//       console.error('❌ Failed to load all notifications:', error);
//       setError('Failed to load notifications');
//       // Don't clear existing notifications on error
//     }
//   }, [shouldEnableQueries]);

//   // Refresh notifications (force sync) - stable function
//   const refreshNotifications = useCallback(async () => {
//     if (!shouldEnableQueries) return;

//     // On refresh, load ALL notifications to ensure proper read status
//     await loadAllNotifications();
//     queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
//   }, [loadAllNotifications, queryClient]);

//   // Mark notification as read
//   const markAsRead = useCallback(
//     async (id: string) => {
//       try {
//         // Find notification in both synced and real-time notifications
//         const syncedNotification = notifications.find((n) => n.id === id);
//         const realtimeNotification = realtimeNotifications.find((n) => n.id === id);

//         const targetNotification = syncedNotification || realtimeNotification;
//         if (!targetNotification) {
//           console.warn('Notification not found:', id);
//           return;
//         }

//         // Optimistic update for synced notifications
//         setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

//         // Send Socket.IO event for real-time notification read status
//         if (realtimeNotification) {
//           socketService.markNotificationAsRead(id);
//           // console.log('🔔 Sent mark as read event via Socket.IO:', id);
//         }

//         // Mark in database if it has a dbId (for synced notifications)
//         if (syncedNotification?.dbId) {
//           await apiMarkNotificationAsRead(syncedNotification.dbId);
//           // console.log('💾 Marked as read in database:', syncedNotification.dbId);
//         }

//         // Invalidate unread count
//         queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });

//         // console.log('✅ Notification marked as read successfully:', id);
//       } catch (error) {
//         console.error('❌ Error marking notification as read:', error);

//         // Revert optimistic update
//         setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
//       }
//     },
//     [notifications, realtimeNotifications, queryClient]
//   );

//   // Mark all as read
//   const markAllAsRead = useCallback(async () => {
//     try {
//       // Get all unread notification IDs
//       const unreadNotificationIds = notifications
//         .filter((n) => !n.read && (n.dbId || n.id))
//         .map((n) => n.dbId || n.id);

//       if (unreadNotificationIds.length === 0) {
//         console.log('ℹ️ No unread notifications to mark as read');
//         return;
//       }

//       // Optimistic update
//       setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

//       // Mark all unread notifications in database by sending their IDs
//       console.log('🔄 Marking notifications as read, IDs:', unreadNotificationIds);
//       const result = await apiMarkAllNotificationsAsRead(unreadNotificationIds);

//       console.log('📋 Mark as read API response:', result);

//       // Invalidate unread count to refresh from server
//       queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });

//       console.log(`✅ ${unreadNotificationIds.length} notifications marked as read successfully`);
//     } catch (error) {
//       console.error('❌ Error marking all notifications as read:', error);

//       // Revert optimistic update
//       await refreshNotifications();
//     }
//   }, [notifications, queryClient, refreshNotifications]);

//   // Initial load on mount - load ALL notifications for proper read status
//   useEffect(() => {
//     if (shouldEnableQueries) {
//       loadAllNotifications();
//     }
//   }, [shouldEnableQueries, loadAllNotifications]);

//   // Auto-sync periodically only if authenticated - use ref to prevent infinite loops
//   useEffect(() => {
//     if (!shouldEnableQueries) {
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//         intervalRef.current = null;
//       }
//       return;
//     }

//     // Clear any existing interval
//     if (intervalRef.current) {
//       clearInterval(intervalRef.current);
//     }

//     // Set up new interval for incremental sync
//     intervalRef.current = setInterval(
//       () => {
//         syncNotifications(); // Use incremental sync for periodic updates
//       },
//       5 * 60 * 1000
//     ); // Every 5 minutes

//     return () => {
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//         intervalRef.current = null;
//       }
//     };
//   }, [shouldEnableQueries]); // Only depend on auth status, not the function

//   const value: NotificationSyncContextType = {
//     notifications,
//     unreadCount,
//     isLoading: isUnreadCountLoading,
//     error,
//     markAsRead,
//     markAllAsRead,
//     refreshNotifications,
//     syncNotifications,
//     lastSyncTime,
//   };

//   return (
//     <NotificationSyncContext.Provider value={value}>{children}</NotificationSyncContext.Provider>
//   );
// };

// export const useNotificationSync = () => {
//   const context = useContext(NotificationSyncContext);
//   if (context === undefined) {
//     throw new Error('useNotificationSync must be used within a NotificationSyncProvider');
//   }
//   return context;
// };
