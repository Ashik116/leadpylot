"use client";

import Progress from '@/components/ui/Progress';
import { InteractiveSyncStatus } from '@/services/emailSystem/EmailSystemService';

interface ProgressOverviewProps {
    progress: NonNullable<InteractiveSyncStatus['progress']>;
    percent: number;
}

export default function ProgressOverview({ progress, percent }: ProgressOverviewProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="font-medium">Overall Progress</span>
                <span className="text-sm text-gray-600">
                    {progress.processedEmails} / {progress.totalEmails} emails
                </span>
            </div>

            <Progress percent={percent} className="w-full" />

            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{progress.totalMailServers}</div>
                    <div className="text-gray-600">Mail Servers</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{progress.successfulEmails}</div>
                    <div className="text-gray-600">Successful</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{progress.failedEmails}</div>
                    <div className="text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{progress.documentsUploaded}</div>
                    <div className="text-gray-600">Attachments</div>
                </div>
            </div>
        </div>
    );
}


