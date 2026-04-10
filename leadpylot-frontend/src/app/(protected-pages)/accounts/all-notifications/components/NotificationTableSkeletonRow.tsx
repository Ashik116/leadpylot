'use client';

import React from 'react';

const NotificationTableSkeletonRow: React.FC = () => (
  <tr className="h-11 border-b border-gray-100">
    <td className="sticky left-0 z-10 w-12 bg-white px-2 py-1">
      <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
    </td>
    <td className="w-12 px-1 py-1">
      <div className="h-7 w-7 animate-pulse rounded-md bg-gray-200" />
    </td>
    <td className="min-w-0 max-w-md flex-1 px-2 py-1">
      <div className="h-3 w-3/4 max-w-xs animate-pulse rounded bg-gray-200" />
      <div className="mt-1 h-2.5 w-1/2 max-w-32 animate-pulse rounded bg-gray-200" />
    </td>
    <td className="w-48 px-2 py-1">
      <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
    </td>
    <td className="w-28 px-2 py-1">
      <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
    </td>
    <td className="w-32 px-2 py-1">
      <div className="h-3 w-10 animate-pulse rounded bg-gray-200" />
    </td>
    <td className="w-32 px-1 py-1">
      <div className="ml-auto h-7 w-7 animate-pulse rounded bg-gray-200" />
    </td>
  </tr>
);

export default NotificationTableSkeletonRow;
