import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  apiCreatePredefinedSubtask,
  apiDeletePredefinedSubtask,
  apiGetPredefinedSubtask,
  apiGetPredefinedSubtasks,
  apiUpdatePredefinedSubtask,
  PredefinedSubtask,
  type CreatePredefinedSubtaskRequest,
  type UpdatePredefinedSubtaskRequest,
  type GetPredefinedSubtasksParams,
  PredefinedSubtaskResponse,
  PredefinedSubtasksListResponse,
} from '../PredefinedSubtasksService';

export interface UsePredefinedSubtasksParams extends GetPredefinedSubtasksParams {
  enabled?: boolean;
}

export const usePredefinedSubtasks = (params?: UsePredefinedSubtasksParams) => {
  const { category, priority, isActive, search, entity, enabled } = params ?? {};
  return useQuery<PredefinedSubtasksListResponse>({
    queryKey: ['predefinedSubtasks', params],
    queryFn: () => apiGetPredefinedSubtasks({ category, priority, isActive, search, entity }),
    enabled: enabled !== undefined ? enabled : true,
  });
};

export const usePredefinedSubtask = (id: string | null, options?: Partial<UseQueryOptions<PredefinedSubtaskResponse>>) => {
  return useQuery({
    queryKey: ['predefinedSubtask', id],
    queryFn: () => apiGetPredefinedSubtask(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreatePredefinedSubtask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePredefinedSubtaskRequest) => apiCreatePredefinedSubtask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predefinedSubtasks'] });
    },
  });
};

export const useUpdatePredefinedSubtask = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePredefinedSubtaskRequest) => apiUpdatePredefinedSubtask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predefinedSubtask', id] });
      queryClient.invalidateQueries({ queryKey: ['predefinedSubtasks'] });
    },
  });
};

export const useDeletePredefinedSubtask = (
  id: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
  }
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiDeletePredefinedSubtask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predefinedSubtasks'] });
      queryClient.invalidateQueries({ queryKey: ['predefinedSubtask', id] });
      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error) => {
      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};
