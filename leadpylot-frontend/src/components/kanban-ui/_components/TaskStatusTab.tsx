import React from 'react';
import dynamic from 'next/dynamic';
import { useTaskActivitiesWrapper } from './useTaskActivities';
import UpdatesActivitySkeleton from '@/app/(protected-pages)/dashboards/leads/[id]/_components/UpdatesActivitySkeleton';
import { ExtendedActivity } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/UpdatesActivity';
import { CommentComposer } from './CommentComposer';
import { CommentBubble } from './CommentBubble';
import { format } from 'date-fns';

const UpdatesActivity = dynamic(() => import('@/app/(protected-pages)/dashboards/leads/[id]/_components/UpdatesActivity'), {
  ssr: false,
  loading: () => <UpdatesActivitySkeleton />,
});

interface TaskStatusTabProps {
  taskId: string | undefined;
}

export const TaskStatusTab: React.FC<TaskStatusTabProps> = ({ taskId }) => {
  const { groupedActivities, activitiesError, activitiesLoading, hasNextPage, isFetchingNextPage, loadMoreRef } = useTaskActivitiesWrapper(taskId);

  // Flatten all activities from all dates for cascading logic
  const allActivities = React.useMemo(() => {
    return Object.values(groupedActivities).flat();
  }, [groupedActivities]);

  // Check if there are no activities (not loading and no grouped activities)
  const hasNoActivities = !activitiesLoading && Object.keys(groupedActivities).length === 0;

  const getActivityTime = (activity: ExtendedActivity) => {
    return activity.createdAt ? format(activity.createdAt, 'h:mm a') : undefined;
  };

  const getActorInitials = (actor?: string) => {
    if (!actor) return '';
    return actor
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-50">
      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-3">
        {activitiesError && (
          <div className="p-6 text-center">
            <p className="text-rust text-sm">Error loading activities</p>
          </div>
        )}
        {hasNoActivities && !activitiesError && (
          <div className="p-1 text-start">
            <p className="text-gray-500 text-sm">No activities found</p>
          </div>
        )}
        {Object.entries(groupedActivities).map(([date, activities]) => (
          <div key={date}>
            <div className="text-center relative">
              <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full bg-gray-400 h-px" />
              <span className="text-gray-500 relative bg-gray-50 px-2 text-sm">
                {date} - {activities[0]?.timestamp}
              </span>
            </div>
            {activities?.length > 0 &&
              activities.map((activity: ExtendedActivity, index: number) => {
                if (activity.type === 'note_added') {
                  const commentText =
                    activity.details?.content || activity.message || '';
                  return (
                    <div key={activity.id} className="py-2">
                      <CommentBubble
                        user={activity.actor}
                        text={commentText}
                        time={getActivityTime(activity)}
                        avatar={getActorInitials(activity.actor)}
                      />
                    </div>
                  );
                }

                return (
                  <UpdatesActivity
                    key={`${activity.id}-${index}`}
                    activity={activity}
                    allActivities={allActivities}
                  />
                );
              })}
          </div>
        ))}

        {/* Load more trigger element */}
        {hasNextPage && (
          <div ref={loadMoreRef} className="py-4 text-center">
            {isFetchingNextPage && <UpdatesActivitySkeleton />}
          </div>
        )}
      </div>

      <CommentComposer taskId={taskId} />
    </div>
  );
};
