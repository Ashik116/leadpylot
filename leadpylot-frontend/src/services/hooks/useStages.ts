import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  apiCreateStage,
  apiDeleteStage,
  apiGetStage,
  apiGetStages,
  apiUpdateStage,
  Stage,
  type CreateStageRequest,
  type UpdateStageRequest,
} from '../StagesService';
import { useStagesStore } from '@/stores/stagesStore';

export interface UseStagesParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const useStages = (params?: UseStagesParams) => {
  const { page, limit, search, enabled, sortBy, sortOrder } = params ?? {};
  return useQuery({
    queryKey: ['stages', params],
    queryFn: () => apiGetStages({ page, limit, search, sortBy, sortOrder }),
    enabled: !!enabled || true,
  });
};

export const useStage = (id: string | null, options?: Partial<UseQueryOptions<Stage>>) => {
  return useQuery({
    queryKey: ['stage', id],
    queryFn: () => apiGetStage(id),
    ...options,
  });
};

export const useCreateStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStageRequest) => apiCreateStage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      // Refresh global Zustand store
      useStagesStore.getState().refreshStages();
    },
  });
};

export const useUpdateStage = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateStageRequest) => apiUpdateStage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage', id] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      // Refresh global Zustand store
      useStagesStore.getState().refreshStages();
    },
  });
};

export const useDeleteStage = (id: string) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => apiDeleteStage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      // Refresh global Zustand store
      useStagesStore.getState().refreshStages();
      router.push('/admin/stages');
    },
  });
};
