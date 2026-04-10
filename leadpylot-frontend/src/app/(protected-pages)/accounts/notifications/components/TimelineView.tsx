'use client';

import Badge from '@/components/ui/Badge';
import { GroupedActivity } from '../types';
import EnhancedActivityItem from './EnhancedActivityItem';

interface TimelineViewProps {
  groupedActivities: GroupedActivity[];
  expandedItems: Set<string>;
  onToggleExpanded: (id: string) => void;
}

export default function TimelineView({
  groupedActivities,
  expandedItems,
  onToggleExpanded,
}: TimelineViewProps) {
  return (
    <div className="space-y-6">
      {groupedActivities?.length > 0 &&
        groupedActivities?.map(({ date, label, items }) => (
          <div key={date}>
            <div className="mb-4 flex items-center space-x-3">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
              <Badge content={items?.length} className="bg-gray-100 text-gray-600"></Badge>
            </div>

            <div className="ml-6 space-y-2 border-l-2 border-gray-200 pl-6">
              {items?.length > 0 &&
                items?.map((activity) => (
                  <EnhancedActivityItem
                    key={activity?.id}
                    activity={activity}
                    isExpanded={expandedItems?.has(activity?.id)}
                    onToggleExpanded={onToggleExpanded}
                  />
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}
