'use client';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Spinner from '@/components/ui/Spinner';
import {
  apiGetEmailSyncStatus,
  apiSyncLeadEmails,
  type EmailSyncResult,
  type EmailSyncStatus,
} from '@/services/emailSystem/EmailSystemService';
import useNotification from '@/utils/hooks/useNotification';
import React, { useCallback, useState } from 'react';

interface EmailSyncComponentProps {
  leadId: string;
  leadName: string;
  currentProjectId?: string;
  currentProjectName?: string;
  onSyncComplete?: (result: EmailSyncResult) => void;
  className?: string;
  variant?: 'button' | 'card' | 'minimal';
  showStatus?: boolean;
}

export const EmailSyncComponent: React.FC<EmailSyncComponentProps> = ({
  leadId,
  leadName,
  currentProjectName,
  onSyncComplete,
  className = '',
  variant = 'button',
  showStatus = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<EmailSyncStatus | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const { openNotification } = useNotification();

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    if (!leadId) return;

    try {
      setIsLoading(true);
      const status = await apiGetEmailSyncStatus(leadId);
      setSyncStatus(status);

      if (showStatus) {
        setShowStatusDialog(true);
      }
    } catch {
      openNotification({
        type: 'danger',
        massage: 'Failed to fetch email sync status',
      });
    } finally {
      setIsLoading(false);
    }
  }, [leadId, showStatus, openNotification]);

  // Perform email sync
  const performSync = useCallback(
    async (syncReason?: string) => {
      if (!leadId) return;

      try {
        setIsSyncing(true);
        const result = await apiSyncLeadEmails(leadId, syncReason);

        openNotification({
          type: 'success',
          massage: `Email sync completed! Updated ${result?.emailsUpdated} out of ${result?.emailsFound} emails.`,
        });

        // Refresh status after sync
        await fetchSyncStatus();

        // Notify parent component
        onSyncComplete?.(result);
      } catch (error) {
        openNotification({
          type: 'danger',
          massage: error instanceof Error ? error.message : 'Failed to sync emails',
        });
      } finally {
        setIsSyncing(false);
      }
    },
    [leadId, fetchSyncStatus, onSyncComplete, openNotification]
  );

  // Handle sync button click
  const handleSyncClick = useCallback(() => {
    if (variant === 'card') {
      setShowReasonDialog(true);
    } else {
      performSync('Manual synchronization from lead details');
    }
  }, [variant, performSync]);

  // Handle sync with reason
  const handleSyncWithReason = useCallback(async () => {
    setShowReasonDialog(false);
    await performSync(reason || 'Manual synchronization');
    setReason('');
  }, [performSync, reason]);

  // Render sync status badge
  const renderStatusBadge = () => {
    if (!syncStatus) return null;

    const isFullySynced = syncStatus?.unsyncedEmails === 0 && syncStatus?.totalEmails > 0;
    const hasEmails = syncStatus?.totalEmails > 0;

    if (!hasEmails) {
      return <Badge className="bg-gray-100 text-xs text-gray-600" content="No emails" />;
    }

    if (isFullySynced) {
      return (
        <Badge
          className="bg-green-100 text-xs text-green-700"
          content={`✓ Synced (${syncStatus?.totalEmails})`}
        />
      );
    }

    return (
      <Badge
        className="bg-orange-100 text-xs text-orange-700"
        content={`⚠ ${syncStatus?.unsyncedEmails} unsynced`}
      />
    );
  };

  // Minimal variant - just a status badge and sync button
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {syncStatus && renderStatusBadge()}
        <Button
          size="sm"
          variant="plain"
          onClick={handleSyncClick}
          disabled={isSyncing || isLoading}
          className="border border-gray-300 text-xs"
        >
          {isSyncing ? <Spinner size="xs" /> : 'Sync Emails'}
        </Button>
        {showStatus && (
          <Button
            size="sm"
            variant="plain"
            onClick={fetchSyncStatus}
            disabled={isLoading}
            className="text-xs"
          >
            {isLoading ? <Spinner size="xs" /> : 'Check Status'}
          </Button>
        )}
      </div>
    );
  }

  // Button variant - simple button
  if (variant === 'button') {
    return (
      <Button
        onClick={handleSyncClick}
        disabled={isSyncing || isLoading}
        className={`${className} border border-gray-300`}
        variant="plain"
      >
        {isSyncing ? (
          <>
            <Spinner size="xs" className="mr-2" />
            Syncing...
          </>
        ) : (
          'Sync Email Projects'
        )}
      </Button>
    );
  }

  // Card variant - full featured card
  return (
    <>
      <div
      // className={className}
      // header={{
      //   content: (
      //     <div className="flex items-center justify-between">
      //       <div>
      //         <div className="font-medium text-sm">Email Project Sync</div>
      //         <div className="text-xs text-gray-500">
      //           Sync emails with current project: {currentProjectName || 'Unknown'}
      //         </div>
      //       </div>
      //       {syncStatus && renderStatusBadge()}
      //     </div>
      //   )
      // }}
      >
        <div
        //  className="p-4"
        >
          {/* {syncStatus && (
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Total Emails:</span>
                <span className="font-medium">{syncStatus.totalEmails}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Synced:</span>
                <span className="font-medium text-green-600">{syncStatus.syncedEmails}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Unsynced:</span>
                <span className="font-medium text-orange-600">{syncStatus.unsyncedEmails}</span>
              </div>
              
              {syncStatus.unsyncedEmails > 0 && (
                <Alert type="warning" className="text-xs">
                  Some emails are not synced with the current project and may not be visible to the assigned agents.
                </Alert>
              )}
            </div>
          )} */}

          <div className="flex gap-2">
            <Button
              onClick={fetchSyncStatus}
              disabled={isLoading}
              variant="plain"
              size="sm"
              className="border border-gray-300"
            >
              {isLoading ? (
                <>
                  <Spinner size="xs" className="mr-2" />
                  Checking...
                </>
              ) : (
                'Check Status'
              )}
            </Button>

            <Button onClick={handleSyncClick} disabled={isSyncing} size="sm" variant="solid">
              {isSyncing ? (
                <>
                  <Spinner size="xs" className="mr-2" />
                  Syncing...
                </>
              ) : (
                'Sync Now'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Reason Dialog */}
      <Dialog isOpen={showReasonDialog} onClose={() => setShowReasonDialog(false)} width={500}>
        <div className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Sync Email Projects</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            This will update all emails for {leadName} to match the current project:{' '}
            {currentProjectName}
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for sync (optional):</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for email synchronization..."
                className="mt-1 w-full rounded-md border p-2 text-sm"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="plain"
                className="border border-gray-300"
                onClick={() => setShowReasonDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSyncWithReason} disabled={isSyncing} variant="solid">
                {isSyncing ? (
                  <>
                    <Spinner size="xs" className="mr-2" />
                    Syncing...
                  </>
                ) : (
                  'Sync Emails'
                )}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Status Dialog */}
      <Dialog isOpen={showStatusDialog} onClose={() => setShowStatusDialog(false)} width={600}>
        <div className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Email Sync Status</h3>

          {syncStatus && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-2xl font-bold">{syncStatus?.totalEmails}</div>
                  <div className="text-muted-foreground text-sm">Total Emails</div>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {syncStatus?.syncedEmails}
                  </div>
                  <div className="text-muted-foreground text-sm">Synced</div>
                </div>
                <div className="rounded-lg bg-orange-50 p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {syncStatus?.unsyncedEmails}
                  </div>
                  <div className="text-muted-foreground text-sm">Unsynced</div>
                </div>
              </div>

              {syncStatus?.emailDetails?.length > 0 && (
                <div>
                  <h4 className="mb-2 font-medium">Email Details:</h4>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {syncStatus?.emailDetails?.map((email) => (
                      <div
                        key={email?.emailId}
                        className={`rounded-md p-2 text-sm ${
                          email?.isSynced ? 'bg-green-50' : 'bg-orange-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="mr-2 flex-1 truncate font-medium">{email?.subject}</div>
                          <Badge
                            className={`text-xs ${email?.isSynced ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}
                            content={email?.isSynced ? '✓' : '⚠'}
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          {email?.direction} • {new Date(email?.receivedAt).toLocaleDateString()}
                          {email?.currentEmailProject && (
                            <span> • Project: {email?.currentEmailProject?.name}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setShowStatusDialog(false)} variant="solid">
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default EmailSyncComponent;
