'use client';

import { ActivityItem } from '../types';

interface ActivityStatsProps {
  activities: ActivityItem[];
}

export default function ActivityStats({ activities }: ActivityStatsProps) {
  const totalActivities = activities?.length;
  const readActivities = activities?.filter((a) => a?.read !== false)?.length;
  const unreadActivities = activities?.filter((a) => a?.read === false)?.length;
  const liveUpdates = activities?.filter((a) => a?.isRealtime)?.length;

  return (
    <div className="border-b border-gray-200 p-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalActivities}</div>
          <div className="text-sm text-gray-500">Total Activities</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{readActivities}</div>
          <div className="text-sm text-gray-500">Read</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{unreadActivities}</div>
          <div className="text-sm text-gray-500">Unread</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{liveUpdates}</div>
          <div className="text-sm text-gray-500">Live Updates</div>
        </div>
      </div>
    </div>
  );
}
