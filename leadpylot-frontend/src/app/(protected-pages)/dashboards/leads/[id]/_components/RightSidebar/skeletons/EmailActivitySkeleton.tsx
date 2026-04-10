import React from 'react';

/** Skeleton matching the email activity card structure. All fields are skeleton placeholders, no text. */
export const EmailActivitySkeleton: React.FC<{ leadExpandView?: boolean }> = () => (
  <div className="w-full border-b border-border/50 px-0 py-3">
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-start">
        <div className="mt-[2px] mr-1.5 h-5 w-5 shrink-0 animate-pulse rounded-md bg-gray-200" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-2 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-3 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
    <div className="mt-2 pl-7 space-y-1.5">
      <div className="flex gap-2">
        <div className="h-4 w-10 shrink-0 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-48 flex-1 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="flex gap-2">
        <div className="h-4 w-10 shrink-0 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-40 flex-1 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="flex gap-2">
        <div className="h-4 w-14 shrink-0 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-56 flex-1 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="mt-2 h-4 w-full max-w-[80%] animate-pulse rounded bg-gray-100" />
      <div className="flex gap-2 mt-2">
        <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-6 w-20 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  </div>
);

export default EmailActivitySkeleton;
