import { useMutation, useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  apiCreateIncomingCall,
  apiCreateOutGoingCall,
  apiGetCallHistory,
  type CallHistoryParams,
} from '../CallServices';

export const useOutgoingCall = () =>
  useMutation({
    mutationFn: apiCreateOutGoingCall,
  });

export const useIncomingCall = () =>
  useMutation({
    mutationFn: apiCreateIncomingCall,
  });

export const useCallHistory = (params?: CallHistoryParams) => {
  const { page, limit } = params || {};
  const queryKey = ['callHistory', page, limit];

  return useQuery({
    queryKey,
    queryFn: () => apiGetCallHistory(params),
  });
};

/**
 * Hook to fetch call history with infinite scrolling
 */
export const useInfiniteCallHistory = (params?: Omit<CallHistoryParams, 'page'>) => {
  return useInfiniteQuery({
    queryKey: ['infinite-callHistory', params],
    queryFn: ({ pageParam = 1 }) =>
      apiGetCallHistory({ ...params, page: pageParam as number, limit: params?.limit || 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.meta;
      return page < pages ? page + 1 : undefined;
    },
  });
};
