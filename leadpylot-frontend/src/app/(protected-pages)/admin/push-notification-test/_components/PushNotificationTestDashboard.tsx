'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Tooltip from '@/components/ui/Tooltip';
import {
  HiOutlineBell,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineClipboardCopy,
  HiOutlinePlay,
  HiOutlineStatusOnline,
  HiOutlineStatusOffline,
  HiOutlineTrash,
} from 'react-icons/hi';
import {
  initializeFirebase,
  requestNotificationPermission,
  requestFCMToken,
  getNotificationPermission,
  onForegroundMessage,
} from '@/lib/firebase';
import FCMService from '@/services/FCMService';
import AxiosBase from '@/services/axios/AxiosBase';

interface LogEntry {
  id: number;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: string;
}

interface FCMStatus {
  browserSupport: boolean;
  serviceWorkerRegistered: boolean;
  permissionStatus: NotificationPermission | 'unknown';
  firebaseInitialized: boolean;
  tokenAvailable: boolean;
  fcmEnabled: boolean;
}

export const PushNotificationTestDashboard = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<FCMStatus>({
    browserSupport: false,
    serviceWorkerRegistered: false,
    permissionStatus: 'unknown',
    firebaseInitialized: false,
    tokenAvailable: false,
    fcmEnabled: false,
  });
  const [testTitle, setTestTitle] = useState('');
  const [testBody, setTestBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastNotification, setLastNotification] = useState<{
    title: string;
    body: string;
    receivedAt: string;
  } | null>(null);

  // let logCounter = 0;

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      {
        id: Date.now() + Math.random(),
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ].slice(0, 50));
  }, []);

  const checkStatus = useCallback(async () => {
    const newStatus: FCMStatus = {
      browserSupport: false,
      serviceWorkerRegistered: false,
      permissionStatus: 'unknown',
      firebaseInitialized: false,
      tokenAvailable: false,
      fcmEnabled: false,
    };

    if (typeof window === 'undefined') return;

    newStatus.browserSupport =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    try {
      const swReg = await navigator.serviceWorker.getRegistration('/');
      newStatus.serviceWorkerRegistered = !!swReg;
    } catch {
      newStatus.serviceWorkerRegistered = false;
    }

    newStatus.permissionStatus = getNotificationPermission();
    newStatus.firebaseInitialized = !!initializeFirebase();
    newStatus.tokenAvailable = !!fcmToken;

    try {
      const tokenRes = await FCMService.getFCMTokens();
      newStatus.fcmEnabled = !!(tokenRes?.data?.enabled);
    } catch {
      // ignore
    }

    setStatus(newStatus);
  }, [fcmToken]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    onForegroundMessage((payload: any) => {
      const { notification } = payload;
      const title = notification?.title || 'Unknown';
      const body = notification?.body || '';
      setLastNotification({
        title,
        body,
        receivedAt: new Date().toLocaleTimeString(),
      });
      addLog('success', `Foreground notification received: "${title}" - "${body}"`);
    });
  }, [addLog]);

  const handleRequestPermission = async () => {
    addLog('info', 'Requesting notification permission...');
    const granted = await requestNotificationPermission();
    if (granted) {
      addLog('success', 'Notification permission granted');
    } else {
      addLog('error', 'Notification permission denied');
    }
    checkStatus();
  };

  const handleGetToken = async () => {
    setIsRefreshing(true);
    addLog('info', 'Requesting FCM token...');
    try {
      initializeFirebase();
      const token = await requestFCMToken();
      if (token) {
        setFcmToken(token);
        addLog('success', `FCM token received: ${token.substring(0, 30)}...`);

        await FCMService.saveFCMToken(token, {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          platform: 'web',
          source: 'push-notification-test',
        });
        addLog('success', 'Token saved to backend');
      } else {
        addLog('error', 'Failed to get FCM token - check permissions');
      }
    } catch (err: any) {
      addLog('error', `Token request failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsRefreshing(false);
      checkStatus();
    }
  };

  const handleSendTest = async () => {
    if (!fcmToken) {
      addLog('error', 'No FCM token available. Get a token first.');
      return;
    }

    setIsSending(true);
    setLastNotification(null);
    addLog('info', `Sending test notification...`);

    try {
      const response = await AxiosBase.post('/notifications/test-fcm', {
        token: fcmToken,
        title: testTitle || undefined,
        body: testBody || undefined,
      });

      const data = response.data;
      if (data.success) {
        addLog(
          'success',
          `Test notification sent! Message ID: ${data.response?.messageId || 'N/A'}`
        );
        addLog(
          'info',
          `Title: "${data.notification?.title}" | Body: "${data.notification?.body}"`
        );
      } else {
        addLog('error', `Send failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error || err?.response?.data?.details || err?.message || 'Unknown error';
      addLog('error', `Send failed: ${errMsg}`);
      if (err?.response?.data?.code) {
        addLog('warning', `Error code: ${err.response.data.code}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyToken = () => {
    if (fcmToken) {
      navigator.clipboard.writeText(fcmToken);
      addLog('info', 'Token copied to clipboard');
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const StatusIndicator = ({
    active,
    label,
    detail,
  }: {
    active: boolean;
    label: string;
    detail?: string;
  }) => (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? 'bg-emerald-100' : 'bg-red-100'
            }`}
        >
          {active ? (
            <HiOutlineCheckCircle className="h-5 w-5 text-emerald-600" />
          ) : (
            <HiOutlineExclamation className="h-5 w-5 text-red-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {detail && <p className="text-xs text-gray-500">{detail}</p>}
        </div>
      </div>
      <Badge
        className={`${active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
          } border text-xs`}
      >
        {active ? 'Active' : 'Inactive'}
      </Badge>
    </div>
  );

  const logTypeStyles: Record<LogEntry['type'], string> = {
    info: 'border-l-blue-400 bg-blue-50/50',
    success: 'border-l-emerald-400 bg-emerald-50/50',
    error: 'border-l-red-400 bg-red-50/50',
    warning: 'border-l-amber-400 bg-amber-50/50',
  };

  const logTypeIcons: Record<LogEntry['type'], string> = {
    info: 'text-blue-500',
    success: 'text-emerald-500',
    error: 'text-red-500',
    warning: 'text-amber-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md">
            <HiOutlineBell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Push Notification Test
            </h2>
            <p className="text-sm text-gray-500">
              Test FCM push notifications for this browser
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="default"
          icon={<HiOutlineRefresh className={isRefreshing ? 'animate-spin' : ''} />}
          onClick={() => {
            checkStatus();
            addLog('info', 'Status refreshed');
          }}
        >
          Refresh Status
        </Button>
      </div>

      {/* Status Grid */}
      <Card>
        <div className="p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            System Status
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <StatusIndicator
              active={status.browserSupport}
              label="Browser Support"
              detail="Service Worker, PushManager, Notifications"
            />
            <StatusIndicator
              active={status.serviceWorkerRegistered}
              label="Service Worker"
              detail="firebase-messaging-sw.js"
            />
            <StatusIndicator
              active={status.permissionStatus === 'granted'}
              label="Notification Permission"
              detail={`Status: ${status.permissionStatus}`}
            />
            <StatusIndicator
              active={status.firebaseInitialized}
              label="Firebase Initialized"
              detail="Firebase App & Messaging"
            />
            <StatusIndicator
              active={status.tokenAvailable}
              label="FCM Token"
              detail={fcmToken ? `${fcmToken.substring(0, 20)}...` : 'Not available'}
            />
            <StatusIndicator
              active={status.fcmEnabled}
              label="Backend FCM"
              detail="Token registered with server"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Setup Actions */}
        <Card>
          <div className="p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Setup Actions
            </h3>
            <div className="space-y-3">
              {/* Step 1: Permission */}
              <div className="rounded-lg border border-gray-100 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                    1
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    Request Notification Permission
                  </span>
                </div>
                <p className="mb-3 text-xs text-gray-500">
                  Allow browser notifications to receive push messages.
                </p>
                <Button
                  size="sm"
                  variant={status.permissionStatus === 'granted' ? 'default' : 'solid'}
                  disabled={status.permissionStatus === 'granted'}
                  onClick={handleRequestPermission}
                  className={
                    status.permissionStatus === 'granted'
                      ? ''
                      : 'bg-violet-600 hover:bg-violet-700'
                  }
                >
                  {status.permissionStatus === 'granted'
                    ? 'Permission Granted'
                    : status.permissionStatus === 'denied'
                      ? 'Permission Denied (Reset in Browser)'
                      : 'Request Permission'}
                </Button>
              </div>

              {/* Step 2: Get Token */}
              <div className="rounded-lg border border-gray-100 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                    2
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    Get FCM Token
                  </span>
                </div>
                <p className="mb-3 text-xs text-gray-500">
                  Register with Firebase and get a device token for this browser.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="solid"
                    loading={isRefreshing}
                    disabled={status.permissionStatus !== 'granted'}
                    onClick={handleGetToken}
                  >
                    {fcmToken ? 'Refresh Token' : 'Get Token'}
                  </Button>
                  {fcmToken && (
                    <Tooltip title="Copy token to clipboard">
                      <Button
                        size="sm"
                        variant="default"
                        icon={<HiOutlineClipboardCopy />}
                        onClick={handleCopyToken}
                      >
                        Copy
                      </Button>
                    </Tooltip>
                  )}
                </div>
                {fcmToken && (
                  <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                    <p className="break-all font-mono text-xs text-emerald-800">
                      {fcmToken}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Send Test Notification */}
        <Card>
          <div className="p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Send Test Notification
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Title (optional)
                </label>
                <Input
                  size="sm"
                  placeholder="Custom notification title..."
                  value={testTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Body (optional)
                </label>
                <Input
                  size="sm"
                  placeholder="Custom notification body..."
                  value={testBody}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestBody(e.target.value)}
                  textArea
                />
              </div>
              <Button
                block
                variant="solid"
                icon={<HiOutlinePlay />}
                loading={isSending}
                disabled={!fcmToken}
                onClick={handleSendTest}
              >
                {isSending ? 'Sending...' : 'Send Test Push Notification'}
              </Button>

              {!fcmToken && (
                <p className="text-center text-xs text-amber-600">
                  Complete Step 1 & 2 first to get an FCM token
                </p>
              )}

              {/* Last Received Notification */}
              {lastNotification && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <HiOutlineStatusOnline className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-semibold uppercase text-emerald-700">
                      Last Received (Foreground)
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">
                    {lastNotification.title}
                  </p>
                  <p className="text-sm text-gray-600">{lastNotification.body}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Received at {lastNotification.receivedAt}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Logs */}
      <Card>
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Activity Log
            </h3>
            <Button
              size="xs"
              variant="default"
              icon={<HiOutlineTrash className="h-3 w-3" />}
              onClick={handleClearLogs}
            >
              Clear
            </Button>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                No activity yet. Start by requesting permission and getting a token.
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`rounded border-l-4 px-3 py-2 ${logTypeStyles[log.type]}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 text-xs font-bold uppercase ${logTypeIcons[log.type]}`}>
                      {log.type}
                    </span>
                    <span className="flex-1 text-xs text-gray-700">{log.message}</span>
                    <span className="whitespace-nowrap text-xs text-gray-400">
                      {log.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
