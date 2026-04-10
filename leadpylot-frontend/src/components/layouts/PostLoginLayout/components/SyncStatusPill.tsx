import React from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';

export interface SyncStatusPillProps {
  progressPercentage: number;
  processedEmails: number;
  totalEmails: number;
  // onClick: () => void;
}

/**
 * Sync Status Pill Component
 * Shows progress of email sync in header
 */
export const SyncStatusPill = React.memo<SyncStatusPillProps>(({
  progressPercentage,
  processedEmails,
  totalEmails,
  // onClick,
}) => {
  return (
    <button
      // onClick={onClick}
      className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1 hover:bg-gray-50 md:flex"
      title="Email sync in progress - click to view details"
    >
      <ApolloIcon name="refresh" className="h-4 w-4 animate-spin text-blue-600" />
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-700">Syncing</span>
        <span className="text-gray-500">
          {processedEmails} / {totalEmails}
        </span>
        <div className="h-2 w-16 overflow-hidden rounded bg-gray-200">
          <div
            className="h-2 bg-blue-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </button>
  );
});

SyncStatusPill.displayName = 'SyncStatusPill';

