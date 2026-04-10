import React from 'react';

/** Skeleton matching the status change activity structure. */
export const StatusActivitySkeleton: React.FC<{ leadExpandView?: boolean }> = () => (
  <div className="w-full border-b border-border/50 px-0 py-3">
    <div className="flex items-start gap-2">
      <div className="mt-[2px] h-5 w-5 shrink-0 animate-pulse rounded-md bg-gray-200" />
      <div className="min-w-0 flex-1 w-full">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-2 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-3 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-24 flex-1 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-12 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    </div>
  </div>
);

export default StatusActivitySkeleton;
