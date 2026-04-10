"use client";

import Progress from '@/components/ui/Progress';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface MinimizedViewProps {
    percent: number;
    processed: number;
    total: number;
}

export default function MinimizedView({ percent, processed, total }: MinimizedViewProps) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <ApolloIcon name="refresh" />
                <span className="font-medium">Syncing emails...</span>
                <span className="text-sm text-gray-600">
                    {processed} / {total}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <Progress percent={percent} size="sm" width="96px" />
                <span className="text-sm font-medium">{percent}%</span>
            </div>
        </div>
    );
}


