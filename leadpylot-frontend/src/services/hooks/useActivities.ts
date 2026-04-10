import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { apiGetActivities, apiGetActivitiesBySubject, GetActivitiesParams, GetActivitiesResponse } from '../ActivitiesService';

export const useActivities = (params?: GetActivitiesParams) =>
  useQuery({
    queryKey: ['activities', params],
    queryFn: () => apiGetActivities(params),
  });

export const useInfiniteActivities = (params?: Omit<GetActivitiesParams, 'page'>) => {
  return useInfiniteQuery<GetActivitiesResponse>({
    queryKey: [
      'infinite-activities',
      { 
        subject_id: params?.subject_id, 
        subject_type: params?.subject_type,
        action: params?.action,
        domain: params?.domain,
      },
    ],
    queryFn: ({ pageParam = 1 }) =>
      apiGetActivities({ ...params, page: pageParam as number, limit: params?.limit || 3 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.meta) return undefined;
      const { page, pages } = lastPage.meta;
      return page < pages ? page + 1 : undefined;
    },
  });
};

export const useTaskActivities = (taskId?: string, enabled: boolean = true) => {
  return useInfiniteQuery<GetActivitiesResponse>({
    queryKey: ['infinite-activities', 'task', taskId],
    queryFn: ({ pageParam = 1 }) =>
      apiGetActivitiesBySubject(taskId!, 'Task', { page: pageParam as number, limit: 20 }),
    enabled: enabled && !!taskId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.meta) return undefined;
      const { page, pages } = lastPage.meta;
      return page < pages ? page + 1 : undefined;
    },
  });
};
