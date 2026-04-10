'use client';

import React from 'react';
import classNames from '@/utils/classNames';
import NotificationTableSkeletonRow from './NotificationTableSkeletonRow';

/** Enough rows to fill typical viewport (44px per row); wrapper min-height ensures full device height */
const DEFAULT_ROW_COUNT = 25;

export interface NotificationsTableSkeletonProps {
  /** Number of skeleton rows to render. Default fills typical viewport. */
  rowCount?: number;
  /** Optional class name for the wrapper. */
  className?: string;
}

const NotificationsTableSkeleton: React.FC<NotificationsTableSkeletonProps> = ({
  rowCount = DEFAULT_ROW_COUNT,
  className,
}) => (
  <div className={classNames('min-h-[calc(100vh-14rem)]', className)}>
    <table className="w-full" role="table" aria-label="Loading notifications">
      <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <tr>
          <th className="sticky left-0 z-20 w-12 bg-white px-2" />
          <th className="w-12 px-1" />
          <th className="min-w-0 flex-1 px-2 text-left">
            <span className="text-xs font-semibold tracking-wider uppercase">Message</span>
          </th>
          <th className="w-48 px-2 text-left">
            <span className="text-xs font-semibold tracking-wider uppercase">Entity & Details</span>
          </th>
          <th className="w-28 px-2 text-left">
            <span className="text-xs font-semibold tracking-wider uppercase">Date</span>
          </th>
          <th className="w-32 px-2 text-left">
            <span className="text-xs font-semibold tracking-wider uppercase">Time</span>
          </th>
          <th className="w-32 px-1 text-right" />
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rowCount }, (_, i) => (
          <NotificationTableSkeletonRow key={i} />
        ))}
      </tbody>
    </table>
  </div>
);

export default NotificationsTableSkeleton;
