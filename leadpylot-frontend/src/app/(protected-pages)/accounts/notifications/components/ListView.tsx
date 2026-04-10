'use client';

import { ActivityItem as ActivityItemType } from '../types';
import EnhancedActivityItem from './EnhancedActivityItem';

interface ListViewProps {
  activities: ActivityItemType[];
  expandedItems: Set<string>;
  onToggleExpanded: (id: string) => void;
}

export default function ListView({ activities, expandedItems, onToggleExpanded }: ListViewProps) {
  return (
    <div className="space-y-3">
      {activities?.length > 0 &&
        activities?.map((activity) => (
          <EnhancedActivityItem
            key={activity?.id}
            activity={activity}
            isExpanded={expandedItems?.has(activity?.id)}
            onToggleExpanded={onToggleExpanded}
          />
        ))}
    </div>
  );
}
