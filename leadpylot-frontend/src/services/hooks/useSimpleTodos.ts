import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  apiGetSimpleTodoTemplates,
  apiCreateSimpleTodoTemplate,
  apiUpdateSimpleTodoTemplate,
  apiDeleteSimpleTodoTemplate,
  apiReorderSimpleTodoTemplates,
  SimpleTodoTemplatesResponse,
  SimpleTodoTemplateResponse,
  CreateSimpleTodoTemplateRequest,
  UpdateSimpleTodoTemplateRequest,
  ReorderTemplatesRequest,
} from '../SimpleTodoService';

export interface UseSimpleTodoTemplatesOptions {
  search?: string;
}

// Hook for simple todo templates list
export const useSimpleTodoTemplates = (options?: UseSimpleTodoTemplatesOptions) => {
  const { search } = options || {};

  return useQuery<SimpleTodoTemplatesResponse>({
    queryKey: ['simpleTodoTemplates', { search }],
    queryFn: () => apiGetSimpleTodoTemplates(search),
  });
};

// Mutation hooks for simple todo template actions
export const useCreateSimpleTodoTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSimpleTodoTemplateRequest) => apiCreateSimpleTodoTemplate(data),
    onSuccess: () => {
      // Invalidate and refetch simple todo templates
      queryClient.invalidateQueries({ queryKey: ['simpleTodoTemplates'] });
    },
  });
};

export const useUpdateSimpleTodoTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: UpdateSimpleTodoTemplateRequest }) =>
      apiUpdateSimpleTodoTemplate(templateId, data),
    onSuccess: () => {
      // Invalidate and refetch simple todo templates
      queryClient.invalidateQueries({ queryKey: ['simpleTodoTemplates'] });
    },
  });
};

export const useDeleteSimpleTodoTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => apiDeleteSimpleTodoTemplate(templateId),
    onSuccess: () => {
      // Invalidate and refetch simple todo templates
      queryClient.invalidateQueries({ queryKey: ['simpleTodoTemplates'] });
    },
  });
};

export const useReorderSimpleTodoTemplates = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReorderTemplatesRequest) => apiReorderSimpleTodoTemplates(data),
    onSuccess: () => {
      // Invalidate and refetch simple todo templates
      queryClient.invalidateQueries({ queryKey: ['simpleTodoTemplates'] });
    },
  });
};
