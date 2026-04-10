import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  apiCreateTodoType,
  apiDeleteTodoType,
  apiGetTodoType,
  apiGetTodoTypes,
  apiUpdateTodoType,
  apiUpdateTodoTypeStatus,
  TodoType,
  type CreateTodoTypeRequest,
  type UpdateTodoTypeRequest,
  type GetTodoTypesParams,
  TodoTypeResponse,
  TodoTypeListResponse,
} from '../TodoTypeService';

export interface UseTodoTypesParams extends GetTodoTypesParams {
  enabled?: boolean;
}

export const useTodoTypes = (params?: UseTodoTypesParams) => {
  const { page, limit, status, search, sortBy, sortOrder, enabled } = params ?? {};
  return useQuery<TodoTypeListResponse>({
    queryKey: ['todoTypes', params],
    queryFn: () => apiGetTodoTypes({ page, limit, status, search, sortBy, sortOrder }),
    enabled: enabled !== undefined ? enabled : true,
  });
};

export const useTodoType = (id: string | null, options?: Partial<UseQueryOptions<TodoTypeResponse>>) => {
  return useQuery({
    queryKey: ['todoType', id],
    queryFn: () => apiGetTodoType(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreateTodoType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTodoTypeRequest) => apiCreateTodoType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoTypes'] });
    },
  });
};

export const useUpdateTodoType = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTodoTypeRequest) => apiUpdateTodoType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoType', id] });
      queryClient.invalidateQueries({ queryKey: ['todoTypes'] });
    },
  });
};

export const useUpdateTodoTypeStatus = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: 'active' | 'inactive') => apiUpdateTodoTypeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoType', id] });
      queryClient.invalidateQueries({ queryKey: ['todoTypes'] });
    },
  });
};

export const useDeleteTodoType = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiDeleteTodoType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoTypes'] });
      queryClient.invalidateQueries({ queryKey: ['todoType', id] });
    },
  });
};

