import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiCreatePredefinedSubtaskCategory,
  apiDeletePredefinedSubtaskCategory,
  apiGetPredefinedSubtaskCategories,
  apiGetPredefinedSubtaskCategory,
  apiUpdatePredefinedSubtaskCategory,
  type CreatePredefinedSubtaskCategoryRequest,
  type UpdatePredefinedSubtaskCategoryRequest,
  type GetPredefinedSubtaskCategoriesParams,
  type PredefinedSubtaskCategoryResponse,
  type PredefinedSubtaskCategoriesListResponse,
} from '../PredefinedSubtaskCategoriesService';

export interface UsePredefinedSubtaskCategoriesParams extends GetPredefinedSubtaskCategoriesParams {
  enabled?: boolean;
}

export const usePredefinedSubtaskCategories = (params?: UsePredefinedSubtaskCategoriesParams) => {
  const { isActive, isStandaloneEnabled, search, enabled } = params ?? {};
  return useQuery<PredefinedSubtaskCategoriesListResponse>({
    queryKey: ['predefinedSubtaskCategories', params],
    queryFn: () => apiGetPredefinedSubtaskCategories({ isActive, isStandaloneEnabled, search }),
    enabled: enabled !== undefined ? enabled : true,
  });
};

export const usePredefinedSubtaskCategory = (id: string | null, enabled = true) => {
  return useQuery<PredefinedSubtaskCategoryResponse>({
    queryKey: ['predefinedSubtaskCategory', id],
    queryFn: () => apiGetPredefinedSubtaskCategory(id),
    enabled: !!id && enabled,
  });
};

export const useCreatePredefinedSubtaskCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePredefinedSubtaskCategoryRequest) =>
      apiCreatePredefinedSubtaskCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predefinedSubtaskCategories'] });
    },
  });
};

export const useUpdatePredefinedSubtaskCategory = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePredefinedSubtaskCategoryRequest) =>
      apiUpdatePredefinedSubtaskCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predefinedSubtaskCategory', id] });
      queryClient.invalidateQueries({ queryKey: ['predefinedSubtaskCategories'] });
    },
  });
};

export const useDeletePredefinedSubtaskCategory = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permanent?: boolean) => apiDeletePredefinedSubtaskCategory(id, permanent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predefinedSubtaskCategories'] });
      queryClient.invalidateQueries({ queryKey: ['predefinedSubtaskCategory', id] });
    },
  });
};
