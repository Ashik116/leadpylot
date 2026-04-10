"use client";

import Badge from '@/components/ui/Badge';
import Progress from '@/components/ui/Progress';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { InteractiveSyncStatus } from '@/services/emailSystem/EmailSystemService';

type ServerRuntime = NonNullable<InteractiveSyncStatus['mailServers']>[number];

interface MailServersStatusProps {
    servers: ServerRuntime[];
}

export default function MailServersStatus({ servers }: MailServersStatusProps) {
    if (!servers || servers.length === 0) return null;

    return (
        <div className="rounded-lg border bg-white">
            <div className="border-b p-4">
                <h3 className="text-lg font-semibold">Mail Servers Status</h3>
            </div>

            <div className="p-4">
                <div className="grid gap-3 overflow-y-auto max-h-48">
                    {servers.map((server) => (
                        <div key={server.id} className="rounded-lg border p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <div className="font-medium inline-block">
                                    {server.name} {server.error && <ApolloIcon name="alert-triangle" className="text-red-500 inline-block" />}
                                </div>
                                <Badge
                                    content={server.status}
                                    className={
                                        server.status === 'completed'
                                            ? 'bg-green-600 text-white'
                                            : server.status === 'error'
                                                ? 'bg-red-600 text-white'
                                                : server.status === 'processing'
                                                    ? 'bg-amber-600 text-white'
                                                    : 'bg-gray-600 text-white'
                                    }
                                />
                            </div>

                            {server.totalEmails > 0 && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>
                                            {server.processedEmails} / {server.totalEmails} emails
                                        </span>
                                        <span>{Math.round((server.processedEmails / server.totalEmails) * 100)?.toFixed(2)}%</span>
                                    </div>
                                    <Progress percent={Math.round((server.processedEmails / server.totalEmails) * 100)} size="sm" />
                                </div>
                            )}

                            {server.currentEmail && server.status === 'processing' && (
                                <div className="mt-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <ApolloIcon name="mail" />
                                        <span className="truncate">{server.currentEmail.subject}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        From: {server.currentEmail.from} • Folder: {server.currentEmail.folder}
                                        {server.currentEmail.hasAttachments && <span className="ml-2">📎 Has attachments</span>}
                                    </div>
                                </div>
                            )}

                            {server.error && (
                                <div className="mt-2 rounded bg-red-50 p-2 text-sm text-red-600">
                                    <span>Error: {server.error}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


