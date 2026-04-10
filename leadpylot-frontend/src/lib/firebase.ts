import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register the Firebase messaging service worker
 * Simplified version with better error handling
 * @returns ServiceWorkerRegistration or null
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;

  try {
    console.log('[FCM] Starting service worker registration...');

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.error('[FCM] Service workers are not supported in this browser');
      return null;
    }

    // Register the service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });

    console.log('[FCM] Service Worker registered successfully');
    serviceWorkerRegistration = registration;

    // Wait for the service worker to be ready
    if (registration.active) {
      console.log('[FCM] Service Worker is already active');
    } else if (registration.installing) {
      console.log('[FCM] Service Worker is installing, waiting for activation...');
      await new Promise<void>((resolve) => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'activated') {
              console.log('[FCM] Service Worker activated');
              resolve();
            }
          });
        }
      });
    } else if (registration.waiting) {
      console.log('[FCM] Service Worker is waiting, skipping activation');
    }

    // Send Firebase config to service worker
    const worker = registration.active;
    if (worker) {
      worker.postMessage({
        type: 'FIREBASE_CONFIG',
        config: firebaseConfig,
      });
      console.log('[FCM] Firebase config sent to service worker');
    }

    return registration;
  } catch (error) {
    console.error('[FCM] Error registering Service Worker:', error);
    return null;
  }
}

/**
 * Initialize Firebase app
 * @returns Firebase app instance or null if not in browser
 */
export function initializeFirebase(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;

  if (!app && getApps().length === 0) {
    try {
      app = initializeApp(firebaseConfig);
      console.log('[FCM] Firebase initialized successfully');
    } catch (error) {
      console.error('[FCM] Error initializing Firebase:', error);
    }
  }

  return app;
}

/**
 * Get Firebase Messaging instance
 * @returns Messaging instance or null if not supported
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;

  const supported = await isSupported();
  if (!supported) {
    console.warn('[FCM] Firebase Messaging is not supported in this browser');
    return null;
  }

  // Register service worker first if not already registered
  if (!serviceWorkerRegistration) {
    await registerServiceWorker();
  }

  if (!messaging && app) {
    try {
      messaging = getMessaging(app);
      console.log('[FCM] Firebase Messaging instance created');
    } catch (error) {
      console.error('[FCM] Error getting Firebase Messaging instance:', error);
    }
  }

  return messaging;
}

/**
 * Request FCM token from Firebase
 * @param messagingInstance Optional messaging instance
 * @returns FCM token or null if failed
 */
export async function requestFCMToken(messagingInstance?: Messaging | null): Promise<string | null> {
  try {
    console.log('[FCM] Starting FCM token request...');

    // Get messaging instance
    const messagingInstanceToUse = messagingInstance || await getMessagingInstance();

    if (!messagingInstanceToUse) {
      console.error('[FCM] Messaging instance not available');
      return null;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    if (!vapidKey) {
      console.error('[FCM] VAPID key is not configured');
      return null;
    }

    console.log('[FCM] VAPID key configured, length:', vapidKey.length);

    // Check notification permission first
    if (Notification.permission !== 'granted') {
      console.warn('[FCM] Notification permission not granted. Current permission:', Notification.permission);
      return null;
    }

    console.log('[FCM] Notification permission granted, requesting token...');

    if (!serviceWorkerRegistration) {
      serviceWorkerRegistration = await registerServiceWorker();
    }

    const currentToken = await getToken(messagingInstanceToUse, {
      vapidKey,
      serviceWorkerRegistration: serviceWorkerRegistration || undefined,
    });

    if (currentToken) {
      console.log('[FCM] ✓ FCM token received successfully:', currentToken.substring(0, 20) + '...');
      return currentToken;
    } else {
      console.warn('[FCM] No registration token available. Permission may have been denied.');
      return null;
    }
  } catch (error: any) {
    console.error('[FCM] ✗ Error requesting FCM token:');
    console.error('[FCM] Error name:', error?.name);
    console.error('[FCM] Error message:', error?.message);

    // Provide specific guidance based on error
    if (error.name === 'AbortError') {
      console.error('[FCM] AbortError: This usually means:');
      console.error('  1. VAPID key is invalid or from wrong Firebase project');
      console.error('  2. Service worker not properly registered');
      console.error('  3. Firebase Cloud Messaging API not enabled');
      console.error('  4. Browser blocked push subscription');
      console.error('[FCM] Check Firebase Console > Project Settings > Cloud Messaging > Web Push Certificate');
    } else if (error.name === 'NotAllowedError') {
      console.error('[FCM] NotAllowedError: Notification permission was denied');
    }

    return null;
  }
}

/**
 * Listen for foreground messages
 * @param callback Callback function to handle incoming messages
 */
export function onForegroundMessage(callback: (payload: any) => void): void {
  if (typeof window === 'undefined') return;

  getMessagingInstance().then((messagingInstance) => {
    if (messagingInstance) {
      onMessage(messagingInstance, (payload) => {
        console.log('[FCM] Foreground message received:', payload);
        callback(payload);
      });
    }
  });
}

/**
 * Check if notification permission is granted
 * @returns true if permission is granted, false otherwise
 */
export function isNotificationPermissionGranted(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  return Notification.permission === 'granted';
}

/**
 * Request notification permission from browser
 * @returns Promise<boolean> true if permission granted, false otherwise
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[FCM] Notifications are not supported in this browser');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Get current notification permission status
 * @returns Notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  return Notification.permission;
}
