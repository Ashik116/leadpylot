import { useMemo } from 'react';
import Skeleton from '@/components/ui/Skeleton';

type StatusFilterShimmerProps = {
  className?: string;
};

const StatusFilterShimmer = ({ className = '' }: StatusFilterShimmerProps) => {
  // Pre-generate widths using useMemo to avoid calling Math.random() during render
  const skeletonWidths = useMemo(() => {
    return Array.from({ length: 7 }, () => Math.floor(Math.random() * 60) + 80);
  }, []);

  return (
    <div className={`w-full rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="space-y-4 p-4">
        {/* Header with Edit button skeleton */}
        <div className="flex items-center justify-between border-b pb-2">
          <Skeleton width="100px" height="20px" />
          <Skeleton width="60px" height="32px" />
        </div>

        {/* Clean filter list skeleton */}
        <div className="max-h-[300px] min-h-[200px] overflow-y-auto">
          <div className="space-y-1">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="w-full rounded p-2">
                <div className="flex items-center justify-between">
                  <Skeleton width={`${skeletonWidths[i]}px`} height="16px" />
                  {i % 2 === 0 && <Skeleton variant="circle" width="16px" height="16px" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer with action buttons skeleton */}
        <div className="border-t border-gray-200 p-2">
          <div className="flex gap-2">
            <Skeleton width="100%" height="32px" />
            <Skeleton width="100%" height="32px" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusFilterShimmer;
