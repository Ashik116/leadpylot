// 'use client';

// import React, { useEffect, useState } from 'react';
// import { useAuth } from '@/hooks/useAuth';
// import {
//   initializeFirebase,
//   requestNotificationPermission,
//   requestFCMToken,
//   onForegroundMessage,
//   getNotificationPermission,
// } from '@/lib/firebase';
// import FCMService from '@/services/FCMService';
// import { transformRealtimeNotification } from '@/services/notifications/notificationTransformers';
// import { useNotificationStore } from '@/stores/notificationStore';
// import { isDev } from '@/utils/utils';

// export const FCMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const { user, isAuthenticated } = useAuth();
//   const [permission, setPermission] = useState<NotificationPermission>('default');
//   const [isInitialized, setIsInitialized] = useState(false);
//   const { addNotification } = useNotificationStore();

//   useEffect(() => {
//     // Only run on client side
//     if (typeof window === 'undefined') return;

//     // Check current permission
//     setPermission(getNotificationPermission());

//     // Initialize Firebase
//     initializeFirebase();

//     // Mark as initialized
//     setIsInitialized(true);

//     if (isDev) {
//       console.log('[FCM] Provider initialized');
//     }
//   }, []);

//   useEffect(() => {
//     // Only proceed if user is authenticated and provider is initialized
//     if (!isInitialized || !isAuthenticated || !user) {
//       if (isDev && !isAuthenticated) {
//         console.log('[FCM] User not authenticated, skipping FCM setup');
//       }
//       return;
//     }

//     if (isDev) {
//       console.log('[FCM] User authenticated, setting up FCM');
//     }

//     setupFCM();
//   }, [isAuthenticated, user, isInitialized]);

//   const setupFCM = async () => {
//     try {
//       // Request notification permission
//       const permissionGranted = await requestNotificationPermission();
//       setPermission(permissionGranted ? 'granted' : 'denied');

//       if (!permissionGranted) {
//         if (isDev) {
//           console.warn('[FCM] Notification permission not granted');
//         }
//         return;
//       }

//       // Get FCM token
//       const token = await requestFCMToken();

//       if (!token) {
//         if (isDev) {
//           console.warn('[FCM] Failed to get FCM token');
//         }
//         return;
//       }

//       // Save token to backend
//       await FCMService.saveFCMToken(token, {
//         userAgent: navigator.userAgent,
//         timestamp: new Date().toISOString(),
//         platform: 'web',
//       });

//       if (isDev) {
//         console.log('[FCM] Token saved to backend successfully');
//       }

//       // Listen for foreground messages
//       onForegroundMessage((payload) => {
//         if (isDev) {
//           console.log('[FCM] Foreground message received:', payload);
//         }

//         const { notification, data } = payload;

//         // Add notification to store (use transformer for full NotificationData shape)
//         const fcmPayload = {
//           id: data?.messageId || `fcm_${Date.now()}`,
//           dbId: data?.messageId || `fcm_${Date.now()}`,
//           type: data?.type || 'others',
//           priority: data?.priority || 'medium',
//           category: data?.category || 'others',
//           title: notification?.title || 'New Notification',
//           message: notification?.body || '',
//           timestamp: new Date().toISOString(),
//           data: data || {},
//         };
//         addNotification(transformRealtimeNotification(fcmPayload));
//       });

//       if (isDev) {
//         console.log('[FCM] Setup completed successfully');
//       }
//     } catch (error) {
//       if (isDev) {
//         console.error('[FCM] Error setting up FCM:', error);
//       }
//     }
//   };

//   return <>{children}</>;
// };

// export default FCMProvider;
