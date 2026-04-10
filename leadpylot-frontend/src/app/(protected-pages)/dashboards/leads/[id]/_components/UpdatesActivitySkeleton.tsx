import React from 'react';

export const UpdatesActivitySkeleton: React.FC<{ leadExpandView?: boolean }> = () => {
  return (
    <div className="mb-8 w-full animate-pulse px-4">
      <div className="flex items-start">
        {/* Icon placeholder */}
        <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-md bg-gray-200 animate-pulse"></div>

        <div className="flex-1">
          {/* Actor and timestamp placeholders */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 rounded bg-gray-200 animate-pulse"></div>
            <div className="h-4 w-2 rounded bg-gray-200 animate-pulse"></div>
            <div className="h-4 w-16 rounded bg-gray-200 animate-pulse"></div>
          </div>

          {/* Content placeholder */}
          <div className="mt-3">
            <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse"></div>
            <div className="mt-2 h-4 w-1/2 rounded bg-gray-200 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Multiple skeletons component for showing a group
export const UpdatesActivitySkeletonGroup: React.FC = () => {
  return (
    <>
      {/* Date header placeholder */}
      <div className="mt-2 text-center">
        <div className="inline-block h-4 w-32 rounded bg-gray-200"></div>
      </div>

      {/* Multiple skeleton items */}
      <UpdatesActivitySkeleton />
      <UpdatesActivitySkeleton />
      <UpdatesActivitySkeleton />
    </>
  );
};

export default UpdatesActivitySkeleton;
