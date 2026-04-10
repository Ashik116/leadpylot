import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '@/stores/userStore';
import { apiGetCurrentUser, CurrentUser } from '@/services/UserService';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useAuthStore } from '@/stores/authStore';

export const useCurrentUserQuery = (options?: {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}) => {
  const { data: session, status: sessionStatus } = useSession();
  const { setCurrentUser, setLoading, setError } = useUserStore();

  // Add a small delay to ensure token is properly set after login
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user) {
      // Small delay to ensure token is set in axios headers
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      // Use setTimeout to defer state update outside of render cycle
      const timeoutId = setTimeout(() => {
        setIsReady(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [sessionStatus, session?.user]);

  const query = useQuery({
    queryKey: ['current-user'],
    queryFn: async (): Promise<CurrentUser> => {
      const response = await apiGetCurrentUser();
      if (!response) {
        throw new Error('Failed to fetch current user');
      }
      return response;
    },
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes
    refetchInterval: options?.refetchInterval,
    enabled: sessionStatus === 'authenticated' && !!session?.user && isReady,
    retry: (failureCount, error) => {
      // Only retry on network errors, not on auth failures
      if (error?.message?.includes('auth') || error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Sync query state with Zustand store
  useEffect(() => {
    setLoading(query.isLoading);
    setError(query.error?.message || null);

    if (query.data) {
      setCurrentUser(query.data);

      // Sync view_type to authStore if it exists
      if (query.data.view_type) {
        const authStore = useAuthStore.getState();
        authStore.updateUser({ view_type: query.data.view_type });
      }
    } else if (query.isError) {
      setCurrentUser(null);
    }
  }, [
    query.data,
    query.isLoading,
    query.error,
    query.isError,
    setCurrentUser,
    setLoading,
    setError,
  ]);

  return query;
};

// Hook to invalidate current user query (call this after todo operations)
export const useInvalidateCurrentUser = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };
};

// Hook to manually refetch current user
export const useRefetchCurrentUser = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.refetchQueries({ queryKey: ['current-user'] });
  };
};
