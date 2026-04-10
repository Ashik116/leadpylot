'use client';

import { useMemo } from 'react';
import LeadHeader from './LeadDetails/components/LeadHeader';
import LeadContentSkeleton from './LeadDetails/components/LeadContentSkeleton';

const SkeletonBar = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
);

/** Full-page skeleton matching Opening Details layout: header, Contact/Lead cards, tabs+table, Opening Details card, Bank, and Updates feed. */
function OpeningDetailsPageSkeleton() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-1 flex-col">
      {/* Header bar - title, pills, action buttons, Meetings/Tasks, close */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white py-2 pl-2 pr-4">
        <div className="flex items-center gap-4">
          <SkeletonBar className="h-6 w-36" />
          <div className="flex gap-2">
            <SkeletonBar className="h-8 w-20 rounded-full" />
            <SkeletonBar className="h-8 w-16 rounded-full" />
          </div>
          <div className="flex gap-2">
            <SkeletonBar className="h-8 w-20 rounded" />
            <SkeletonBar className="h-8 w-16 rounded" />
            <SkeletonBar className="h-8 w-24 rounded" />
            <SkeletonBar className="h-8 w-20 rounded" />
            <SkeletonBar className="h-8 w-24 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBar className="h-5 w-20" />
          <SkeletonBar className="h-5 w-16" />
          <SkeletonBar className="h-8 w-8 shrink-0 rounded" />
        </div>
      </div>

      {/* Main: left column + right Updates panel */}
      <div className="min-h-0 flex-1 gap-2 overflow-hidden pl-2 pb-1 grid grid-cols-2">
        {/* Left column */}
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          {/* Contact + Lead info cards */}
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            <div className="animate-pulse rounded-lg border bg-white p-4">
              <SkeletonBar className="mb-4 h-5 w-40" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <SkeletonBar className="h-4 w-16 shrink-0" />
                    <SkeletonBar className="h-4 flex-1" />
                    {i <= 2 && <SkeletonBar className="h-4 w-4 shrink-0 rounded" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="animate-pulse rounded-lg border bg-white p-4">
              <SkeletonBar className="mb-4 h-5 w-36" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <SkeletonBar className="h-4 w-20 shrink-0" />
                    <SkeletonBar className="h-4 flex-1" />
                    {(i === 1 || i === 2 || i === 6) && (
                      <SkeletonBar className="h-5 w-5 shrink-0 rounded" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs: Offers / Out Offers / Openings + table */}
          <div className="z-10 animate-pulse space-y-2 rounded-lg border bg-white p-4">
            <div className="flex items-center gap-4 border-b pb-2">
              <SkeletonBar className="h-8 w-20" />
              <SkeletonBar className="h-8 w-24" />
              <SkeletonBar className="h-8 w-24" />
            </div>
            <div className="flex gap-2 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <SkeletonBar key={i} className="h-4 min-w-0 flex-1" />
              ))}
            </div>
            <div className="space-y-2">
              {[...Array(2)].map((_, rowIdx) => (
                <div key={rowIdx} className="flex gap-2">
                  {[...Array(8)].map((_, colIdx) => (
                    <SkeletonBar key={colIdx} className="h-4 min-w-0 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Opening Details main card */}
          <div className="animate-pulse rounded-lg border bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <SkeletonBar className="h-5 w-36" />
              <div className="flex gap-2">
                <SkeletonBar className="h-6 w-24" />
                <SkeletonBar className="h-6 w-6 shrink-0 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <SkeletonBar className="h-4 w-24 shrink-0" />
                    <SkeletonBar className="h-4 flex-1" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <SkeletonBar className="h-4 w-32 shrink-0" />
                    <SkeletonBar className="h-4 flex-1" />
                    <SkeletonBar className="h-4 w-8 shrink-0 rounded" />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex gap-4 border-t pt-3">
              <SkeletonBar className="h-4 w-32" />
              <SkeletonBar className="h-4 w-28" />
              <SkeletonBar className="h-4 w-24" />
            </div>
          </div>

          {/* Bank section */}
          <div className="animate-pulse rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between border-b pb-2">
              <SkeletonBar className="h-6 w-16" />
              <SkeletonBar className="h-4 w-4 rounded" />
            </div>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <SkeletonBar className="h-10 w-10 shrink-0 rounded" />
                <SkeletonBar className="h-4 flex-1" />
                <SkeletonBar className="h-5 w-12 shrink-0 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBar className="h-10 w-10 shrink-0 rounded" />
                <SkeletonBar className="h-4 flex-1" />
                <SkeletonBar className="h-5 w-12 shrink-0 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Updates feed */}
        <div className="hidden min-h-0 shrink-0 overflow-hidden md:block w-full">
          <div className="flex h-full flex-col rounded-lg border bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2">
              <div className="flex gap-2">
                <SkeletonBar className="h-8 w-16" />
                <SkeletonBar className="h-8 w-10" />
                <SkeletonBar className="h-8 w-14" />
                <SkeletonBar className="h-8 w-12" />
                <SkeletonBar className="h-8 w-10" />
                <SkeletonBar className="h-8 w-20" />
              </div>
              <SkeletonBar className="h-8 w-24 rounded" />
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="border-b border-gray-100 pb-2">
                <SkeletonBar className="mb-2 h-3 w-44" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3">
                  <SkeletonBar className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBar className="h-4 w-3/4" />
                    <SkeletonBar className="h-3 w-full" />
                  </div>
                </div>
              ))}
              <div className="border-b border-gray-100 pb-2 pt-2">
                <SkeletonBar className="mb-2 h-3 w-40" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <SkeletonBar className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBar className="h-4 w-3/4" />
                    <SkeletonBar className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LeadDetailsPageSkeletonProps {
  leadId: string;
  detailsType?: 'offer' | 'opening' | 'email';
  showInDialog?: boolean;
}

export function LeadDetailsPageSkeleton({
  leadId,
  detailsType,
  showInDialog,
}: LeadDetailsPageSkeletonProps) {
  const skeletonLeadData = useMemo(
    () =>
      ({
        _id: leadId,
        reclamation_status: 'pending',
      }) as any,
    [leadId]
  );

  const skeletonHeaderProps = useMemo(
    () => ({
      currentPosition: 1,
      totalUsers: 1,
      canGoToPrevious: false,
      canGoToNext: false,
      isAdmin: false,
      onPrevious: () => { },
      onNext: () => { },
      onDelete: () => { },
      lead: skeletonLeadData,
      assignment: {},
      hasActiveFilters: false,
      filterState: {},
    }),
    [skeletonLeadData]
  );

  // Offer details in dialog: show modal-style Updates panel skeleton only

  return <OpeningDetailsPageSkeleton />;


  // Default: lead details page (header + two-column content)
  // return (
  //   <div className="flex flex-col">
  //     <div className="sticky top-0 z-10 rounded-2xl border-b bg-white shadow-sm">
  //       <LeadHeader {...skeletonHeaderProps} />
  //     </div>
  //     <div className="mt-4 flex-1">
  //       <LeadContentSkeleton />
  //     </div>
  //   </div>
  // );
}
