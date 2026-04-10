import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import {
  apiCreateSource,
  apiDeleteMultipleSources,
  apiDeleteSource,
  apiGetSource,
  apiGetSources,
  apiUpdateSource,
  Source,
  type CreateSourceRequest,
  type UpdateSourceRequest,
  TSourcesResponse,
  apiGetSourcesData,
} from '../SourceService';

export interface UseSourcesOptions {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  enabled?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

export const useSources = (options?: UseSourcesOptions) => {
  const { page = 1, limit = 20, sort = 'createdAt', search, sortBy, sortOrder } = options || {};
  const { data: session } = useSession();
  const isAgent = session?.user?.role === 'Agent';

  return useQuery<TSourcesResponse>({
    queryKey: ['sources', { page, limit, sort, search, sortBy, sortOrder }],
    queryFn: () => apiGetSources(page, limit, sort, search, sortBy, sortOrder),
    enabled: !isAgent && options?.enabled !== false, // Disable the query when user is an Agent
    // Sources data doesn't change frequently, cache for 10 minutes
    staleTime: 10 * 60 * 1000, // 10 minutes
    // Return empty data for agents
    placeholderData: isAgent
      ? ({
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 20,
            pages: 0,
          },
        } as TSourcesResponse)
      : undefined,
  });
};
export const useSourcesData = (params?: Record<string, unknown>) => {
  const { data: session } = useSession();
  const isAgent = session?.user?.role === 'Agent';

  return useQuery<TSourcesResponse>({
    queryKey: ['sources', params],
    queryFn: () => apiGetSourcesData(params),
    enabled: !isAgent, // Disable the query when user is an Agent
    // Sources data doesn't change frequently, cache for 10 minutes
    staleTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: isAgent
      ? ({
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 20,
            pages: 0,
          },
        } as TSourcesResponse)
      : undefined,
  });
};
export const useSource = (id: string, options?: Partial<UseQueryOptions<Source>>) => {
  return useQuery({
    queryKey: ['source', id],
    queryFn: () => apiGetSource(id),
    // Individual source data doesn't change frequently
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

export const useCreateSource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSourceRequest) => apiCreateSource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
};

export const useUpdateSource = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSourceRequest) => apiUpdateSource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source', id] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
};

export const useDeleteSource = (id: string) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => apiDeleteSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      router.push('/admin/sources');
    },
  });
};

export const useDeleteMultipleSources = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => apiDeleteMultipleSources(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
};
