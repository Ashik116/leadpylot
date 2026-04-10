'use client';

import { ActivityItem as ActivityItemType, GroupedActivity } from '../types';
import ActivityStats from './ActivityStats';
import TimelineView from './TimelineView';
import ListView from './ListView';
import Pagination from './Pagination';

interface ActivityContentProps {
  activities: ActivityItemType[];
  groupedActivities: GroupedActivity[];
  viewMode: 'timeline' | 'list';
  expandedItems: Set<string>;
  currentPage: number;
  totalPages: number;
  onToggleExpanded: (id: string) => void;
  onPageChange: (page: number) => void;
}

export default function ActivityContent({
  activities,
  groupedActivities,
  viewMode,
  expandedItems,
  currentPage,
  totalPages,
  onToggleExpanded,
  onPageChange,
}: ActivityContentProps) {
  return (
    <>
      {/* Stats */}
      <ActivityStats activities={activities} />

      {/* Activities */}
      <div className="p-6">
        {viewMode === 'timeline' ? (
          <TimelineView
            groupedActivities={groupedActivities}
            expandedItems={expandedItems}
            onToggleExpanded={onToggleExpanded}
          />
        ) : (
          <ListView
            activities={activities}
            expandedItems={expandedItems}
            onToggleExpanded={onToggleExpanded}
          />
        )}
      </div>

      {/* Pagination */}
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </>
  );
}
