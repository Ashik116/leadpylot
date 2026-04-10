import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

type GroupByFilterShimmerProps = {
  showCard?: boolean;
  className?: string;
};

// Generate skeleton widths once outside component to avoid calling Math.random() during render
const generateSkeletonWidths = () => {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 60) + 80);
};

const skeletonWidths = generateSkeletonWidths();

// FilterContent component moved outside to avoid creating during render
const FilterContent: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`w-full rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="space-y-4 p-4">
        {/* Header with Edit button skeleton */}
        <div className="flex items-center justify-between border-b pb-2">
          <Skeleton width="80px" height="20px" />
          <Skeleton width="60px" height="32px" />
        </div>

        {/* Filter list skeleton */}
        <div className="max-h-[300px] min-h-[200px] overflow-y-auto">
          <div className="space-y-1">
            {/* Generate 6 filter items with varying widths */}
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="w-full rounded p-2">
                <div className="flex items-center justify-between">
                  <Skeleton width={`${skeletonWidths[i]}px`} height="16px" />
                  {i % 2 === 0 && <Skeleton variant="circle" width="16px" height="16px" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer skeleton */}
        <div className="border-t border-gray-200 p-2">
          {/* Selection info skeleton */}
          <div className="mb-2">
            <Skeleton width="180px" height="14px" />
          </div>

          {/* Action buttons skeleton */}
          <div className="flex gap-2">
            <Skeleton width="100%" height="32px" />
            <Skeleton width="100%" height="32px" />
          </div>
        </div>
      </div>
    </div>
  );
};

const GroupByFilterShimmer = (props: GroupByFilterShimmerProps) => {
  const { className = '' } = props;

  return <FilterContent className={className} />;
};

export default GroupByFilterShimmer;
