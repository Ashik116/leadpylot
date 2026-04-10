'use client';

import React from 'react';
import Card from '@/components/ui/Card';

const TodoCardSkeleton: React.FC = () => {
  return (
    <Card className="card-border card-shadow">
      {/* Todo box header skeleton */}
      <div className="border-sand-3 flex flex-wrap gap-2 border-b pb-3">
        {/* Related Entities Section Skeleton */}
        <div className="flex flex-wrap gap-2">
          {/* Project badge skeleton */}
          <div className="h-6 w-20 animate-pulse rounded-md bg-gray-200" />
          {/* Agent badge skeleton */}
          <div className="h-6 w-16 animate-pulse rounded-md bg-gray-200" />
          {/* Source badge skeleton */}
          <div className="h-6 w-18 animate-pulse rounded-md bg-gray-200" />
          {/* Todo count badge skeleton */}
          <div className="h-6 w-12 animate-pulse rounded-md bg-gray-200" />
          {/* View Details button skeleton */}
          <div className="h-6 w-24 animate-pulse rounded-md bg-gray-200" />
        </div>

        {/* Additional Details Section Skeleton */}
        <div className="flex flex-wrap gap-2">
          {/* Contact name skeleton */}
          <div className="bg-sand-4 h-6 w-24 animate-pulse rounded-md" />
          {/* Email skeleton */}
          <div className="bg-sand-4 h-6 w-32 animate-pulse rounded-md" />
          {/* Phone skeleton */}
          <div className="bg-sand-4 h-6 w-28 animate-pulse rounded-md" />
        </div>
      </div>

      {/* Unified Todo Items Section Skeleton */}
      <div className="space-y-3 pt-2">
        {/* First todo item skeleton */}
        <div className="bg-sand-4 border-sand-3 flex items-start gap-3 rounded-lg border p-3">
          {/* Checkbox skeleton */}
          <div className="h-5 w-5 animate-pulse rounded border-2 border-gray-300 bg-gray-200" />

          <div className="w-full min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                {/* Message skeleton */}
                <div className="mb-2 h-4 animate-pulse rounded bg-gray-200" />
                <div className="mb-2 h-3 w-3/4 animate-pulse rounded bg-gray-200" />

                {/* Creator and date skeleton */}
                <div className="mt-2 space-y-1">
                  <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200" />
                  <div className="flex flex-wrap gap-2">
                    <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>
              </div>

              {/* Action buttons skeleton */}
              <div className="ml-2 flex items-center gap-2">
                <div className="h-6 w-16 animate-pulse rounded bg-gray-200" />
                <div className="h-6 w-6 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Second todo item skeleton (if multiple todos) */}
        <div className="bg-sand-4 border-sand-3 flex items-start gap-3 rounded-lg border p-3">
          {/* Checkbox skeleton */}
          <div className="h-5 w-5 animate-pulse rounded border-2 border-gray-300 bg-gray-200" />

          <div className="w-full min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                {/* Message skeleton */}
                <div className="mb-2 h-4 animate-pulse rounded bg-gray-200" />
                <div className="mb-2 h-3 w-2/3 animate-pulse rounded bg-gray-200" />

                {/* Creator and date skeleton */}
                <div className="mt-2 space-y-1">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
                  <div className="flex flex-wrap gap-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-18 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>
              </div>

              {/* Action buttons skeleton */}
              <div className="ml-2 flex items-center gap-2">
                <div className="h-6 w-20 animate-pulse rounded bg-gray-200" />
                <div className="h-6 w-6 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TodoCardSkeleton;
