import { useEffect } from 'react';
import { useInteractiveSyncStore, computeProgressPercentage } from '@/stores/interactiveSyncStore';
import { useInteractiveSyncStatus } from '@/services/hooks/useEmailSystem';
import socketService from '@/services/SocketService';

export interface SyncStatusResult {
  minimized: boolean;
  lastStatus: any;
  progressPercentage: number;
  openModal: () => void;
  clearMinimize: () => void;
}

/**
 * Hook to manage interactive sync status
 * Handles socket listeners and global sync state
 */
export function useSyncStatus(): SyncStatusResult {
  const {
    minimized,
    lastStatus,
    openModal,
    clearMinimize,
    setStatus,
    setRealtime,
    minimizeToHeader,
  } = useInteractiveSyncStore();

  // Keep global store in sync with current status
  const { data: globalSyncStatus } = useInteractiveSyncStatus();
  
  useEffect(() => {
    if (globalSyncStatus) {
      setStatus(globalSyncStatus);
      if (globalSyncStatus.isRunning) {
        minimizeToHeader();
      }
    }
  }, [globalSyncStatus, setStatus, minimizeToHeader]);

  // Global Socket.IO listener to update store
  useEffect(() => {
    const handleProgress = (data: any) => {
      setRealtime(data);
      
      // Merge minimal status to reflect immediate progress
      const merged = {
        isRunning: true,
        syncId: data?.syncId ?? lastStatus?.syncId,
        startedAt: lastStatus?.startedAt,
        progress: data?.progress ?? lastStatus?.progress,
        mailServers: data?.mailServer
          ? [
              {
                id: data.mailServer.id,
                name: data.mailServer.name,
                status: data.mailServer.status,
                totalEmails: data.mailServer.totalEmails,
                processedEmails: data.mailServer.processedEmails,
                successfulEmails: data.mailServer.successfulEmails,
                failedEmails: data.mailServer.failedEmails,
                currentEmail: data.mailServer.currentEmail,
                documentsUploaded: data.mailServer.documentsUploaded,
                attachmentErrors: data.mailServer.attachmentErrors || 0,
                error: data.mailServer.error,
              },
            ]
          : (lastStatus?.mailServers ?? []),
        lastUpdate: new Date().toISOString(),
        message: data?.message ?? lastStatus?.message,
      } as any;
      
      setStatus(merged);
      minimizeToHeader();
    };

    const cleanup = socketService.onCustomEvent('interactive_sync_progress', handleProgress);
    return cleanup;
  }, [setRealtime, setStatus, minimizeToHeader, lastStatus]);

  const progressPercentage = computeProgressPercentage(lastStatus);

  return {
    minimized,
    lastStatus,
    progressPercentage,
    openModal,
    clearMinimize,
  };
}

