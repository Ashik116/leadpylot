import React from 'react';

const SkeletonBar = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
);

const LeadContentSkeleton = () => {
  return (
    <div
      className={`grid space-y-2 gap-x-2 transition-all duration-300 ease-in-out lg:space-y-0 md:grid-cols-2`}
    >
      {/* Left Column - Contact Info, Lead Info, Offers/Openings, Bank */}
      <div className="flex flex-col gap-2 lg:col-span-1">
        {/* Contact Info + Lead Info - side by side on lg */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-2">
          {/* Contact Information Card Skeleton */}
          <div className="animate-pulse rounded-lg border bg-white p-4">
            <SkeletonBar className="mb-4 h-5 w-40" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <SkeletonBar className="h-8 w-8 shrink-0 rounded-full" />
                <SkeletonBar className="h-4 flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBar className="h-8 w-8 shrink-0 rounded-full" />
                <SkeletonBar className="h-4 flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBar className="h-8 w-8 shrink-0 rounded-full" />
                <SkeletonBar className="h-4 flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBar className="h-8 w-8 shrink-0 rounded-full" />
                <SkeletonBar className="h-4 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBar className="h-8 w-8 shrink-0 rounded-full" />
                <SkeletonBar className="h-4 w-20" />
              </div>
            </div>
          </div>

          {/* Lead Information Card Skeleton */}
          <div className="animate-pulse rounded-lg border bg-white p-4">
            <SkeletonBar className="mb-4 h-5 w-36" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <SkeletonBar className="h-8 w-8 shrink-0 rounded-full" />
                <SkeletonBar className="h-4 w-28" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBar className="h-8 w-8 shrink-0 rounded-full" />
                <SkeletonBar className="h-4 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBar className="h-8 w-8 shrink-0 rounded-full" />
                <SkeletonBar className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBar className="h-8 w-8 shrink-0 rounded-full" />
                <SkeletonBar className="h-4 w-28" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBar className="h-8 w-8 shrink-0 rounded-full" />
                <SkeletonBar className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Offers / Out Offers / Openings Tab Section Skeleton */}
        <div className="z-10 animate-pulse space-y-2 rounded-lg border bg-white p-4">
          {/* Tab row with Create Offer button */}
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex gap-4">
              <SkeletonBar className="h-8 w-20" />
              <SkeletonBar className="h-8 w-24" />
              <SkeletonBar className="h-8 w-24" />
            </div>
            <SkeletonBar className="h-8 w-28 rounded" />
          </div>
          {/* Table header */}
          <div className="flex gap-4 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <SkeletonBar key={i} className="h-4 flex-1 min-w-0" />
            ))}
          </div>
          {/* Table rows */}
          <div className="space-y-2">
            {[...Array(3)].map((_, rowIdx) => (
              <div key={rowIdx} className="flex gap-4">
                {[...Array(8)].map((_, colIdx) => (
                  <SkeletonBar key={colIdx} className="h-4 flex-1 min-w-0" />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Bank Section Skeleton */}
        <div className="animate-pulse space-y-2 rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between border-b pb-2">
            <SkeletonBar className="h-8 w-16" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBar className="h-10 w-10 shrink-0 rounded" />
            <SkeletonBar className="h-4 flex-1" />
            <SkeletonBar className="h-5 w-12 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBar className="h-10 w-10 shrink-0 rounded" />
            <SkeletonBar className="h-4 flex-1" />
            <SkeletonBar className="h-5 w-12 rounded-full" />
          </div>
        </div>
      </div>

      {/* Right Column - Updates / Activity Feed (RightSidebar) */}
      <div className="h-[93dvh] min-h-0 overflow-hidden">
        <div className="animate-pulse flex h-full flex-col rounded-lg border bg-white">
          {/* Filter tabs: Updates, All, Status, Email, Tasks, Comments */}
          <div className="flex gap-2 border-b p-2">
            <SkeletonBar className="h-8 w-20" />
            <SkeletonBar className="h-8 w-12" />
            <SkeletonBar className="h-8 w-16" />
            <SkeletonBar className="h-8 w-14" />
            <SkeletonBar className="h-8 w-12" />
            <SkeletonBar className="h-8 w-20" />
          </div>
          {/* Activity feed items */}
          <div className="flex-1 space-y-3 overflow-hidden p-4">
            <div className="flex gap-3">
              <SkeletonBar className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 min-w-0">
                <SkeletonBar className="h-4 w-3/4" />
                <SkeletonBar className="h-3 w-full" />
              </div>
            </div>
            <div className="flex gap-3">
              <SkeletonBar className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 min-w-0">
                <SkeletonBar className="h-4 w-2/3" />
                <SkeletonBar className="h-3 w-full" />
              </div>
            </div>
            <div className="flex gap-3">
              <SkeletonBar className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 min-w-0">
                <SkeletonBar className="h-4 w-4/5" />
                <SkeletonBar className="h-3 w-full" />
              </div>
            </div>
            <div className="flex gap-3">
              <SkeletonBar className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 min-w-0">
                <SkeletonBar className="h-4 w-1/2" />
                <SkeletonBar className="h-3 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadContentSkeleton;
