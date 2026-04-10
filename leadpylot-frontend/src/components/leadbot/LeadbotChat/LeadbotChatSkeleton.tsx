'use client';

import Skeleton from '@/components/ui/Skeleton';

interface LeadbotChatSkeletonProps {
  leadExpandView?: boolean;
}

export function LeadbotChatSkeleton({ leadExpandView }: LeadbotChatSkeletonProps) {
  const compact = leadExpandView;

  return (
    <div className={`space-y-3 ${compact ? 'px-2 py-2' : 'px-4 py-3'}`}>
      {/* Assistant message skeleton */}
      <div className="flex items-start gap-2">
        <Skeleton variant="circle" className="h-8 w-8 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="w-3/4">
            <Skeleton className="h-4 w-full rounded-lg" />
          </div>
          <div className="w-[80%]">
            <Skeleton className="h-4 w-full rounded-lg" />
          </div>
        </div>
      </div>
      {/* User message skeleton */}
      <div className="flex items-start gap-2 flex-row-reverse">
        <Skeleton variant="circle" className="h-8 w-8 shrink-0" />
        <div className="flex justify-end w-1/2">
          <Skeleton className="h-4 w-full rounded-lg" />
        </div>
      </div>
      {/* Assistant message skeleton */}
      <div className="flex items-start gap-2">
        <Skeleton variant="circle" className="h-8 w-8 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="w-[85%]">
            <Skeleton className="h-4 w-full rounded-lg" />
          </div>
          <div className="w-2/3">
            <Skeleton className="h-4 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
