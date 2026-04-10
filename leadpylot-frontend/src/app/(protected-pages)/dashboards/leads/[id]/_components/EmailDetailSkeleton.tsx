import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

/**
 * Skeleton UI shown while email detail is loading (e.g. in EmailActivityCard).
 * Mimics the layout of ConversationHeader + message content.
 */
const EmailDetailSkeleton: React.FC = () => {
  return (
    <div
      className="w-full rounded-lg border border-gray-200 bg-white shadow-sm"
    // style={{ height: '600px' }}
    >
      {/* Header: subject + tags */}
      <div className="border-b border-gray-200 p-2">
        <Skeleton className="mb-2 h-5 w-3/4 max-w-md" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>
      {/* Metadata row */}
      <div className="flex gap-3 border-b border-gray-200 px-2 py-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>
      {/* Content lines */}
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-6 h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
};

export default EmailDetailSkeleton;
