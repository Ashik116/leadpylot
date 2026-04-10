import { useTaskActivities } from '@/services/hooks/useActivities';
import { useInView } from 'react-intersection-observer';
import { useEffect, useMemo } from 'react';
import { transformAndGroupActivities } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/RightSidebar/useActivities';

export const useTaskActivitiesWrapper = (taskId: string | undefined) => {
  // Setup react-intersection-observer for activities
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.5,
    triggerOnce: false,
    rootMargin: '100px',
  });

  const {
    data: infiniteActivitiesData,
    isLoading: activitiesLoading,
    error: activitiesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTaskActivities(taskId, !!taskId);

  // Load more data when the load more element comes into view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, hasNextPage, isFetchingNextPage]);

  // Transform and group activities by date from the infinite query data
  const groupedActivities = useMemo(() => {
    return transformAndGroupActivities(infiniteActivitiesData);
     
  }, [infiniteActivitiesData]);

  return {
    groupedActivities,
    activitiesLoading,
    activitiesError,
    hasNextPage,
    isFetchingNextPage,
    loadMoreRef,
  };
};
