'use client';

import React, { useState, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Dialog from '@/components/ui/Dialog';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import Progress from '@/components/ui/Progress';
import useNotification from '@/utils/hooks/useNotification';
import {
  apiSyncProjectEmails,
  type ProjectEmailSyncResult,
} from '@/services/emailSystem/EmailSystemService';

interface ProjectEmailSyncComponentProps {
  projectId: string;
  projectName: string;
  onSyncComplete?: (result: ProjectEmailSyncResult) => void;
  className?: string;
  variant?: 'button' | 'card';
}

export const ProjectEmailSyncComponent: React.FC<ProjectEmailSyncComponentProps> = ({
  projectId,
  projectName,
  onSyncComplete,
  className = '',
  variant = 'button',
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<ProjectEmailSyncResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [reason, setReason] = useState('');
  const { openNotification } = useNotification();

  // Perform project-wide email sync
  const performProjectSync = useCallback(
    async (syncReason?: string) => {
      if (!projectId) return;

      try {
        setIsSyncing(true);
        const result = await apiSyncProjectEmails(projectId, syncReason);

        setSyncResult(result);
        setShowResultDialog(true);

        openNotification({
          type: 'success',
          massage: `Project sync completed! Updated ${result?.totalEmailsUpdated} emails across ${result?.leadsProcessed} leads.`,
        });

        // Notify parent component
        onSyncComplete?.(result);
      } catch (error) {
        openNotification({
          type: 'danger',
          massage: error instanceof Error ? error.message : 'Failed to sync project emails',
        });
      } finally {
        setIsSyncing(false);
      }
    },
    [projectId, onSyncComplete, openNotification]
  );

  // Handle sync button click
  const handleSyncClick = useCallback(() => {
    if (variant === 'card') {
      setShowConfirmDialog(true);
    } else {
      performProjectSync('Manual project-wide synchronization');
    }
  }, [variant, performProjectSync]);

  // Handle sync with reason
  const handleSyncWithReason = useCallback(async () => {
    setShowConfirmDialog(false);
    await performProjectSync(reason || 'Manual project-wide synchronization');
    setReason('');
  }, [performProjectSync, reason]);

  // Button variant - simple button
  if (variant === 'button') {
    return (
      <>
        <Button
          onClick={handleSyncClick}
          disabled={isSyncing}
          className={`${className} border border-gray-300`}
          variant="plain"
        >
          {isSyncing ? (
            <>
              <Spinner size="xs" className="mr-2" />
              Syncing Project...
            </>
          ) : (
            'Sync All Project Emails'
          )}
        </Button>

        {/* Result Dialog */}
        <Dialog isOpen={showResultDialog} onClose={() => setShowResultDialog(false)} width={700}>
          <div className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Project Email Sync Results</h3>

            {syncResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-blue-50 p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {syncResult?.leadsProcessed}
                    </div>
                    <div className="text-sm text-gray-500">Leads Processed</div>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {syncResult?.totalEmailsUpdated}
                    </div>
                    <div className="text-sm text-gray-500">Emails Updated</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <div className="text-2xl font-bold">{syncResult?.successfulSyncs}</div>
                    <div className="text-sm text-gray-500">Successful</div>
                  </div>
                </div>

                {syncResult?.failedSyncs > 0 && (
                  <Alert type="warning">
                    {syncResult?.failedSyncs} lead(s) failed to sync. Check individual results
                    below.
                  </Alert>
                )}

                {syncResult?.results?.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-medium">Lead Results:</h4>
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {syncResult?.results?.map((result) => (
                        <div
                          key={result?.leadId}
                          className={`rounded-md border p-3 text-sm ${
                            result?.success
                              ? 'border-green-200 bg-green-50'
                              : 'border-red-200 bg-red-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="mr-2 flex-1 truncate font-medium">
                              {result?.leadName}
                            </div>
                            <div className="text-xs">
                              {result?.success ? (
                                <span className="text-green-600">
                                  ✓ {result?.emailsUpdated} emails updated
                                </span>
                              ) : (
                                <span className="text-red-600">✗ Failed</span>
                              )}
                            </div>
                          </div>
                          {!result?.success && result?.error && (
                            <div className="mt-1 text-xs text-red-600">Error: {result?.error}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowResultDialog(false)}>Close</Button>
            </div>
          </div>
        </Dialog>
      </>
    );
  }

  // Card variant - full featured card
  return (
    <>
      <Card
        className={className}
        header={{
          content: (
            <div>
              <div className="text-sm font-medium">Project Email Sync</div>
              <div className="text-xs text-gray-500">
                Synchronize all emails in project: {projectName}
              </div>
            </div>
          ),
        }}
      >
        <div className="p-4">
          <div className="space-y-4">
            <Alert type="info" className="text-xs">
              This will update all emails for all leads in this project to ensure proper project
              assignment.
            </Alert>

            <Button
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="w-full"
              variant="solid"
            >
              {isSyncing ? (
                <>
                  <Spinner size="xs" className="mr-2" />
                  Syncing All Project Emails...
                </>
              ) : (
                'Sync All Project Emails'
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog isOpen={showConfirmDialog} onClose={() => setShowConfirmDialog(false)} width={500}>
        <div className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Sync All Project Emails</h3>
          <p className="mb-4 text-sm text-gray-500">
            This will update ALL emails for ALL leads in project &quot;{projectName}&quot; to match
            the current project assignment.
          </p>

          <Alert type="warning" className="mb-4">
            This operation may take some time for projects with many leads and emails.
          </Alert>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for sync (optional):</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for project-wide email synchronization..."
                className="mt-1 w-full rounded-md border p-2 text-sm"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="plain"
                className="border border-gray-300"
                onClick={() => setShowConfirmDialog(false)}
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
                  'Sync All Emails'
                )}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Result Dialog */}
      <Dialog isOpen={showResultDialog} onClose={() => setShowResultDialog(false)} width={700}>
        <div className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Project Email Sync Results</h3>

          {syncResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {syncResult?.leadsProcessed}
                  </div>
                  <div className="text-sm text-gray-500">Leads Processed</div>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {syncResult?.totalEmailsUpdated}
                  </div>
                  <div className="text-sm text-gray-500">Emails Updated</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-2xl font-bold">{syncResult?.successfulSyncs}</div>
                  <div className="text-sm text-gray-500">Successful</div>
                </div>
              </div>

              <Progress
                percent={(syncResult?.successfulSyncs / syncResult?.leadsProcessed) * 100}
                className="w-full"
              />

              {syncResult?.failedSyncs > 0 && (
                <Alert type="warning">
                  {syncResult?.failedSyncs} lead(s) failed to sync. Check individual results below.
                </Alert>
              )}

              {syncResult?.results?.length > 0 && (
                <div>
                  <h4 className="mb-2 font-medium">Lead Results:</h4>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {syncResult?.results?.map((result) => (
                      <div
                        key={result?.leadId}
                        className={`rounded-md border p-3 text-sm ${
                          result?.success
                            ? 'border-green-200 bg-green-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="mr-2 flex-1 truncate font-medium">{result?.leadName}</div>
                          <div className="text-xs">
                            {result?.success ? (
                              <span className="text-green-600">
                                ✓ {result?.emailsUpdated} emails updated
                              </span>
                            ) : (
                              <span className="text-red-600">✗ Failed</span>
                            )}
                          </div>
                        </div>
                        {!result?.success && result?.error && (
                          <div className="mt-1 text-xs text-red-600">Error: {result?.error}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setShowResultDialog(false)} variant="solid">
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default ProjectEmailSyncComponent;
