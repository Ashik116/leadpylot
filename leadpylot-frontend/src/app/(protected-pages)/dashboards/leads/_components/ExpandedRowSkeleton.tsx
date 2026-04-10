import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

const ExpandedRowSkeleton: React.FC = () => {
  return (
    <div className="bg-gray-50 py-4 pl-6">
      {/* Additional Information Cards Skeleton */}
      <div className="grid min-w-[1200px] grid-cols-4 gap-4">
        {/* Contact Info Card Skeleton */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4">
            <Skeleton width="120px" height="20px" className="mb-2" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton width="16px" height="16px" />
                <Skeleton width="100px" height="16px" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton width="16px" height="16px" />
                <Skeleton width="120px" height="16px" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton width="16px" height="16px" />
                <Skeleton width="90px" height="16px" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton width="80px" height="32px" />
            <Skeleton width="80px" height="32px" />
          </div>
        </div>

        {/* Lead Info Card Skeleton */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4">
            <Skeleton width="100px" height="20px" className="mb-2" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton width="80px" height="16px" />
                <Skeleton width="60px" height="16px" />
              </div>
              <div className="flex justify-between">
                <Skeleton width="90px" height="16px" />
                <Skeleton width="50px" height="16px" />
              </div>
              <div className="flex justify-between">
                <Skeleton width="70px" height="16px" />
                <Skeleton width="40px" height="16px" />
              </div>
            </div>
          </div>
        </div>

        {/* Status Action Card Skeleton */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4">
            <Skeleton width="110px" height="20px" className="mb-2" />
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton width="60px" height="24px" />
                <Skeleton width="60px" height="24px" />
              </div>
              <div className="flex gap-2">
                <Skeleton width="70px" height="24px" />
                <Skeleton width="70px" height="24px" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton width="80px" height="32px" />
            <Skeleton width="80px" height="32px" />
          </div>
        </div>

        {/* Time Frame Card Skeleton */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4">
            <Skeleton width="100px" height="20px" className="mb-2" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton width="70px" height="16px" />
                <Skeleton width="80px" height="16px" />
              </div>
              <div className="flex justify-between">
                <Skeleton width="80px" height="16px" />
                <Skeleton width="70px" height="16px" />
              </div>
              <div className="flex justify-between">
                <Skeleton width="60px" height="16px" />
                <Skeleton width="90px" height="16px" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information Tabs Skeleton */}
      <div className="mt-6">
        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="pb-2">
                <Skeleton width="60px" height="20px" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton width="120px" height="16px" />
                <Skeleton width="200px" height="16px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandedRowSkeleton;
