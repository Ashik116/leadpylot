/**
 * TaskItemSkeleton Component - Loading skeleton for TaskItem
 */

import Skeleton from '@/components/ui/Skeleton';
import classNames from '@/utils/classNames';

export const TaskItemSkeleton = () => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Checkbox Skeleton */}
        <div className="pt-0.5">
          <Skeleton variant="block" width={20} height={20} className="rounded" />
        </div>

        {/* Task Content Skeleton */}
        <div className="min-w-0 flex-1">
          {/* Task Message Skeleton */}
          <div className="mb-2 space-y-1">
            <Skeleton variant="block" width="85%" height={16} />
            <Skeleton variant="block" width="60%" height={16} />
          </div>

          {/* Badges Skeleton */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Skeleton variant="block" width={60} height={24} className="rounded-full" />
            <Skeleton variant="block" width={70} height={24} className="rounded-full" />
            <Skeleton variant="block" width={50} height={24} className="rounded-full" />
            <Skeleton variant="block" width={80} height={24} className="rounded-full" />
            <Skeleton variant="block" width={90} height={24} className="rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
