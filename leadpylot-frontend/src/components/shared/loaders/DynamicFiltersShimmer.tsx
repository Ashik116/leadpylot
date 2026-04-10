import Skeleton from '@/components/ui/Skeleton';

type DynamicFiltersShimmerProps = {
  className?: string;
};

const DynamicFiltersShimmer = (props: DynamicFiltersShimmerProps) => {
  const { className = '' } = props;

  return (
    <div className={`w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="space-y-4">
        {/* Header with Clear button skeleton */}
        <div className="flex items-center justify-between border-b pb-2">
          <Skeleton width="140px" height="20px" />
          <Skeleton width="100px" height="32px" />
        </div>

        {/* Filter rules skeleton */}
        <div className="max-h-[300px] min-h-[200px] overflow-y-auto">
          {/* Generate 3 filter rule rows */}
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="mb-2 flex items-center gap-2 last:mb-0">
              <div className="flex w-full justify-between gap-2">
                {/* Field Select skeleton */}
                <div className="w-1/3">
                  <Skeleton width="100%" height="40px" />
                </div>
                {/* Operator Select skeleton */}
                <div className="w-1/3">
                  <Skeleton width="100%" height="40px" />
                </div>
                {/* Value Input skeleton */}
                <div className="w-1/3">
                  <Skeleton width="100%" height="40px" />
                </div>
              </div>
              {/* Remove button skeleton */}
              <Skeleton variant="circle" width="32px" height="32px" />
            </div>
          ))}
        </div>

        {/* Footer with Add Rule and Apply buttons */}
        <div className="border-t pt-2">
          <div className="flex items-center justify-between">
            <Skeleton width="100px" height="36px" />
            <Skeleton width="80px" height="36px" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicFiltersShimmer;
