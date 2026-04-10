"use client";

import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface InteractiveSyncHeaderProps {
    isRunning: boolean;
    selectedCount: number;
    canStop: boolean;
    onStartSync: () => void;
    onStopSync: () => void;
    isStarting: boolean;
    isStopping: boolean;
}

export default function InteractiveSyncHeader({
    isRunning,
    selectedCount,
    canStop,
    onStartSync,
    onStopSync,
    isStarting,
    isStopping,
}: InteractiveSyncHeaderProps) {
    return (
        <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center justify-between w-full">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <ApolloIcon name="refresh" className={` ${isRunning ? 'animate-spin' : ''}`} />
                    {isRunning ? 'Syncing Emails' : 'Interactive Email Sync'}
                </h2>
                <div className="flex gap-2 mr-4">
                    {selectedCount > 0 && (
                        <Button onClick={onStartSync} loading={isStarting} variant="success" size="sm">
                            Sync ({selectedCount})
                        </Button>
                    )}

                    {canStop && (
                        <Button onClick={onStopSync} loading={isStopping} variant="destructive" size="sm">
                            Stop Sync
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}


