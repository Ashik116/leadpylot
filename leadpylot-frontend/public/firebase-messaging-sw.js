// Firebase Messaging Service Worker for Background Push Notifications

importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

// Hardcoded Firebase config so the SW can initialize on cold start
// (postMessage from the main thread won't be available when the browser
//  wakes the SW to deliver a push event)
const firebaseConfig = {
  apiKey: 'AIzaSyBcPVKvhZoElCd-a12cHcnPQ8JC3HUo93M',
  authDomain: 'leadpylot.firebaseapp.com',
  projectId: 'leadpylot',
  storageBucket: 'leadpylot.firebasestorage.app',
  messagingSenderId: '471197457341',
  appId: '1:471197457341:web:072ca1e4c01e3f9ab210d4',
  measurementId: 'G-4MYGQR6HZ7',
};

// Initialize Firebase immediately on SW startup
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Handle background messages (app not in focus)
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message received:', payload);

  const notificationTitle =
    payload.notification?.title || payload.data?.title || 'New Notification';
  const notificationBody =
    payload.notification?.body || payload.data?.body || '';
  const tag =
    payload.data?.messageId || payload.data?.type || 'leadpylot-' + Date.now();

  const notificationOptions = {
    body: notificationBody,
    icon: '/img/icon-192x192.png',
    badge: '/img/badge-72x72.png',
    data: payload.data || {},
    tag: tag,
    renotify: true,
    requireInteraction: payload.data?.priority === 'high',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Fallback: raw push event handler for cases where Firebase SDK
// doesn't intercept the push (e.g. data-only messages)
self.addEventListener('push', (event) => {
  // Let Firebase SDK handle it first; if we reach here with no
  // notification shown, show a generic one as fallback.
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { data: { body: event.data.text() } };
  }

  // Firebase SDK will handle messages with FCM structure.
  // This is a safety net for non-standard push payloads.
  const hasNotification = payload.notification || payload.data?.title;
  if (!hasNotification) return;

  const title = payload.notification?.title || payload.data?.title || 'LeadPylot';
  const options = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/img/icon-192x192.png',
    badge: '/img/badge-72x72.png',
    data: payload.data || {},
    tag: 'leadpylot-fallback-' + Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const urlToOpen = data.url || '/dashboards';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            client.url === new URL(urlToOpen, self.location.origin).href &&
            'focus' in client
          ) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[FCM SW] Service worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('install', (event) => {
  console.log('[FCM SW] Service worker installed');
  self.skipWaiting();
});
