'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

const ReportingsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Summary Cards Skeleton */}
      <div className="3xl:grid-cols-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center space-x-4">
              <Skeleton variant="circle" width={48} height={48} />
              <div className="flex-1 space-y-2">
                <Skeleton height={20} width="60%" />
                <Skeleton height={16} width="40%" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Table Skeleton */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Table Header */}
          <div className="flex items-center justify-between">
            <Skeleton height={24} width={200} />
            <Skeleton height={36} width={120} />
          </div>

          {/* Table Content */}
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4 py-3">
                <Skeleton variant="circle" width={40} height={40} />
                <div className="flex-1 space-y-2">
                  <Skeleton height={16} width="30%" />
                  <Skeleton height={14} width="20%" />
                </div>
                <Skeleton height={16} width={60} />
                <Skeleton height={16} width={60} />
                <Skeleton height={16} width={60} />
                <Skeleton height={16} width={60} />
                <Skeleton height={16} width={60} />
                <Skeleton height={16} width={60} />
                <Skeleton height={16} width={60} />
                <Skeleton height={16} width={60} />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ReportingsSkeleton;
