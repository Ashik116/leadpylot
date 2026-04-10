import React from 'react';

/** Skeleton matching the task activity structure. */
export const TaskActivitySkeleton: React.FC<{ leadExpandView?: boolean }> = () => (
  <div className="w-full border-b border-border/50 px-0 py-3">
    <div className="flex items-start gap-2">
      <div className="mt-[2px] h-5 w-5 shrink-0 animate-pulse rounded-md bg-gray-200" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-2 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="mt-3 flex items-start gap-2">
          <div className="mt-0.5 h-4 w-4 shrink-0 animate-pulse rounded border border-gray-200 bg-gray-100" />
          <div className="flex-1 space-y-1">
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-full max-w-[70%] animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default TaskActivitySkeleton;
