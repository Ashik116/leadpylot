'use client';

/**
 * SyncProgressBanner - Real-time Email Sync Progress Banner
 * Shows at top of page during email import
 */

import { useEffect, useState, useCallback } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { io } from 'socket.io-client';
import AxiosBase from '@/services/axios/AxiosBase';
import Button from '@/components/ui/Button';
import { apiGetInteractiveSyncStatus } from '@/services/emailSystem/EmailSystemService';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';

interface SyncProgress {
  type: string;
  message: string;
  syncId: string;
  mailServer?: {
    id: string;
    name: string;
    totalEmails: number;
    processedEmails: number;
    successfulEmails: number;
    failedEmails: number;
    status: string;
  };
  progress?: {
    totalMailServers: number;
    completedMailServers: number;
    totalEmails: number;
    processedEmails: number;
    successfulEmails: number;
    failedEmails: number;
    documentsUploaded?: number;
  };
}

export default function SyncProgressBanner() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isAdmin = userRole === Role.ADMIN;
  const [syncData, setSyncData] = useState<any | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const connectSocket = useCallback(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
      path: '/socket.io',
      transports: ['websocket'],
    });

    socketInstance.on('interactive_sync_progress', (data: SyncProgress) => {
      // eslint-disable-next-line no-console
      console.log('📊 Sync progress update:', data);

      setSyncData((prev: any) => ({
        ...prev,
        ...data,
        progress: data.progress,
        mailServer: data.mailServer,
      }));

      if (data.type === 'sync_completed') {
        setTimeout(() => {
          setIsVisible(false);
          window.location.reload();
        }, 3000);
      }

      if (data.type === 'sync_error') {
        setTimeout(() => {
          setIsVisible(false);
        }, 5000);
      }
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Check for active sync on mount
  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        const response = await apiGetInteractiveSyncStatus();

        if (response?.isRunning) {
          setSyncData(response);
          setIsVisible(true);
          connectSocket();
        }
      } catch {
        // No active sync
      }
    };
    if (isAdmin) {
      checkSyncStatus();
    }
  }, [connectSocket, isAdmin]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !syncData) return null;

  const progress = syncData.progress || {};
  const percentage =
    progress.totalEmails > 0
      ? Math.round((progress.processedEmails / progress.totalEmails) * 100)
      : 0;

  return (
    <div className="fixed top-0 right-0 left-0 z-50 bg-blue-600/90 text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Status Icon & Message */}
          <div className="flex items-center gap-3">
            <ApolloIcon name="loading" className="animate-spin text-[1.164625rem]" />
            <div>
              <div className="font-medium">Syncing Emails from Mail Servers</div>
              <div className="text-[0.8152375rem] text-blue-100">
                {syncData.message || 'Importing emails...'}
              </div>
            </div>
          </div>

          {/* Middle: Progress */}
          <div className="max-w-md flex-1">
            {/* Progress Bar */}
            <div className="mb-1">
              <div className="mb-1 flex items-center justify-between text-[0.698775rem] text-blue-100">
                <span>
                  {progress.processedEmails} / {progress.totalEmails} emails
                </span>
                <span>{percentage}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-blue-500">
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-[0.698775rem] text-blue-100">
              <span>✅ {progress.successfulEmails} imported</span>
              {progress.failedEmails > 0 && <span>❌ {progress.failedEmails} failed</span>}
              {progress.documentsUploaded > 0 && (
                <span>📎 {progress.documentsUploaded} attachments</span>
              )}
            </div>
          </div>

          {/* Right: Current Mail Server & Actions */}
          <div className="flex items-center gap-3">
            {syncData.mailServer && (
              <div className="text-right">
                <div className="text-[0.8152375rem] font-medium">{syncData.mailServer.name}</div>
                <div className="text-[0.698775rem] text-blue-100">
                  {syncData.mailServer.processedEmails} / {syncData.mailServer.totalEmails}
                </div>
              </div>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDismiss}
              className="rounded p-1 hover:bg-blue-700"
              icon={<ApolloIcon name="cross" className="text-white" />}
            ></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
