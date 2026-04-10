'use client';

/**
 * SyncProgressModal - Real-time Email Sync Progress
 * Shows live progress of IMAP email import
 */

import { useEffect, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { io, Socket } from 'socket.io-client';

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
  };
  finalStats?: any;
  duration?: number;
}

interface SyncProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncId: string | null;
}

export default function SyncProgressModal({ isOpen, onClose, syncId }: SyncProgressModalProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isOpen || !syncId) return;

    // Connect to Socket.IO
    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
      path: '/socket.io',
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('✅ Sync socket connected');
    });

    // Listen for sync progress updates
    socketInstance.on('interactive_sync_progress', (data: SyncProgress) => {
      console.log('📊 Sync progress:', data);
      setProgress(data);

      if (data.type === 'sync_completed') {
        setIsComplete(true);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

      if (data.type === 'sync_error') {
        setHasError(true);
      }
    });

    // Use setTimeout to avoid state update in effect
    setTimeout(() => {
      setSocket(socketInstance);
    }, 0);

    return () => {
      socketInstance.disconnect();
    };
  }, [isOpen, syncId]);

  const handleClose = () => {
    if (!isComplete) {
      if (confirm('Sync is still in progress. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getProgressPercentage = () => {
    if (!progress?.progress) return 0;
    const { processedEmails, totalEmails } = progress.progress;
    if (totalEmails === 0) return 0;
    return Math.round((processedEmails / totalEmails) * 100);
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} width={600}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <ApolloIcon name="check" className="text-xl text-green-600" />
              </div>
            ) : hasError ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <ApolloIcon name="x" className="text-xl text-red-600" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <ApolloIcon name="loading" className="animate-spin text-xl text-blue-600" />
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isComplete ? 'Sync Complete!' : hasError ? 'Sync Failed' : 'Syncing Emails...'}
              </h2>
              <p className="text-sm text-gray-500">
                {progress?.message || 'Importing emails from mail server'}
              </p>
            </div>
          </div>

          <button onClick={handleClose} className="rounded p-1 hover:bg-gray-100">
            <ApolloIcon name="x" className="text-gray-600" />
          </button>
        </div>

        {/* Progress Bar */}
        {progress?.progress && !isComplete && (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                Progress: {progress.progress.processedEmails} / {progress.progress.totalEmails}{' '}
                emails
              </span>
              <span className="text-gray-500">{getProgressPercentage()}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        {progress?.progress && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {progress.progress.successfulEmails}
              </div>
              <div className="text-xs text-gray-500">Successful</div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {progress.progress.failedEmails}
              </div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {progress.progress.completedMailServers} / {progress.progress.totalMailServers}
              </div>
              <div className="text-xs text-gray-500">Mail Servers</div>
            </div>
          </div>
        )}

        {/* Current Activity */}
        {progress?.mailServer && !isComplete && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <ApolloIcon name="mail" className="text-blue-600" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{progress.mailServer.name}</div>
                <div className="text-sm text-gray-500">
                  Processing {progress.mailServer.processedEmails} /{' '}
                  {progress.mailServer.totalEmails} emails
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-green-600">
                  {progress.mailServer.successfulEmails} imported
                </div>
                {progress.mailServer.failedEmails > 0 && (
                  <div className="text-sm text-red-600">
                    {progress.mailServer.failedEmails} failed
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Completion Message */}
        {isComplete && progress?.finalStats && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <ApolloIcon name="check-circle" className="mt-0.5 shrink-0 text-xl text-green-600" />
              <div>
                <div className="mb-1 font-medium text-green-900">Sync completed successfully!</div>
                <div className="text-sm text-green-700">
                  Imported {progress.finalStats.successfulEmails} emails from{' '}
                  {progress.finalStats.totalMailServers} mail server(s).
                  {progress.duration && ` Took ${Math.round(progress.duration / 1000)}s.`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {hasError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <ApolloIcon name="alert-circle" className="mt-0.5 shrink-0 text-xl text-red-600" />
              <div>
                <div className="mb-1 font-medium text-red-900">Sync failed</div>
                <div className="text-sm text-red-700">
                  {progress?.message || 'An error occurred during email sync. Please try again.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {isComplete ? (
            <Button variant="solid" onClick={() => window.location.reload()}>
              Refresh & View Emails
            </Button>
          ) : (
            <Button variant="plain" onClick={handleClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
