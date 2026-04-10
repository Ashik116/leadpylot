'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Progress from '@/components/ui/Progress';
import { MailServer, InteractiveSyncStatus } from '@/services/emailSystem/EmailSystemService';

type ServerRuntime = NonNullable<InteractiveSyncStatus['mailServers']>[number];

interface MailServersNeedingSyncProps {
  servers: MailServer[];
  selected: string[];
  isAnyServerSyncing: boolean;
  onToggle: (serverId: string) => void;
  onStartIndividual: (serverId: string) => void;
  startPending: boolean;
  getServerSyncById: (serverId: string) => ServerRuntime | undefined;
}

export default function MailServersNeedingSync({
  servers,
  selected,
  isAnyServerSyncing,
  onToggle,
  onStartIndividual,
  startPending,
  getServerSyncById,
}: MailServersNeedingSyncProps) {
  if (servers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-amber-600">
        <ApolloIcon name="alert-triangle" />
        <span className="font-medium">{servers.length} mail server(s) need first-time sync</span>
      </div>

      <div className="rounded-lg bg-blue-50 p-3 text-sm text-gray-600">
        <div className="flex items-start gap-2">
          <ApolloIcon name="circle" className="mt-0.5 shrink-0 text-blue-500" />
          <div>
            <div className="font-medium text-blue-800">Individual Sync Available</div>
            <div className="mt-1">
              You can sync servers individually using the &ldquo;Start Sync&rdquo; button for each
              server, or sync all servers at once using &ldquo;Sync All Servers&rdquo; above.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        {servers.map((server) => {
          const current = getServerSyncById(server._id);
          const isServerSyncing = current && ['connecting', 'processing'].includes(current.status);
          // const isServerCompleted = current && current.status === 'completed';
          const isServerCompleted = server.syncStatus.isCompleted;

          return (
            <div
              key={server._id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex flex-1 items-center gap-3">
                <Checkbox
                  checked={selected.includes(server._id)}
                  onChange={() => onToggle(server._id)}
                  disabled={
                    (!selected.includes(server._id) && selected.length >= 2) || isAnyServerSyncing
                  }
                />
                <div className="flex-1">
                  <div className="font-medium">{server.name}</div>
                  <div className="text-sm text-gray-600">{server.adminEmail}</div>

                  {isServerSyncing && current && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <ApolloIcon name="refresh" className="animate-spin" />
                        <span className="text-blue-600">
                          {current.status === 'connecting'
                            ? 'Connecting...'
                            : 'Processing emails...'}
                        </span>
                      </div>
                      {current.totalEmails > 0 && (
                        <div className="mt-1">
                          <div className="mb-1 flex justify-between text-xs text-gray-500">
                            <span>
                              {current.processedEmails} / {current.totalEmails} emails
                            </span>
                            <span>
                              {Math.round(
                                (current.processedEmails / current.totalEmails) * 100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                          <Progress
                            percent={Number(
                              ((current.processedEmails / current.totalEmails) * 100).toFixed(0)
                            )}
                            size="sm"
                          />
                        </div>
                      )}
                      {current.currentEmail && (
                        <div className="mt-1 truncate text-xs text-gray-500">
                          Current: {current.currentEmail.subject}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="ml-4 shrink-0">
                {isServerCompleted ? (
                  <Badge content="Synced" className="bg-green-600 text-white" />
                ) : isServerSyncing ? (
                  <Badge content="Syncing" className="animate-pulse bg-blue-600 text-white" />
                ) : (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => onStartIndividual(server._id)}
                    disabled={isAnyServerSyncing || startPending}
                    loading={startPending}
                    className="px-3 py-1 text-xs"
                  >
                    Start Sync
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
