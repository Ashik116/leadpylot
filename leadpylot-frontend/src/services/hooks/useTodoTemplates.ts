import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  apiGetTodoTemplates,
  apiGetTodoTemplate,
  apiCreateTodoTemplate,
  apiUpdateTodoTemplate,
  apiDeleteTodoTemplate,
  apiGetAvailableProjects,
  apiTestTodoTemplate,
  TodoTemplatesResponse,
  TodoTemplateResponse,
  CreateTodoTemplateRequest,
  UpdateTodoTemplateRequest,
  ProjectsResponse,
} from '../AdminTodoService';

export interface UseTodoTemplatesOptions {
  page?: number;
  limit?: number;
  active?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

// Hook for todo templates list
export const useTodoTemplates = (options?: UseTodoTemplatesOptions) => {
  const { page = 1, limit = 20, active, search, sortBy, sortOrder } = options || {};

  return useQuery<TodoTemplatesResponse>({
    queryKey: ['todoTemplates', { page, limit, active, search, sortBy, sortOrder }],
    queryFn: () => apiGetTodoTemplates(page, limit, active, search, sortBy, sortOrder),
  });
};

// Hook for single todo template
export const useTodoTemplate = (
  templateId: string | undefined,
  options?: Partial<UseQueryOptions<TodoTemplateResponse>>
) => {
  return useQuery({
    queryKey: ['todoTemplate', templateId],
    queryFn: () => apiGetTodoTemplate(templateId!),
    enabled: !!templateId,
    ...options,
  });
};

// Hook for available projects
export const useAvailableProjects = (options?: Partial<UseQueryOptions<ProjectsResponse>>) => {
  return useQuery({
    queryKey: ['todoTemplates', 'projects'],
    queryFn: () => apiGetAvailableProjects(),
    ...options,
  });
};

// Mutation hooks for todo template actions
export const useCreateTodoTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTodoTemplateRequest) => apiCreateTodoTemplate(data),
    onSuccess: () => {
      // Invalidate and refetch todo templates
      queryClient.invalidateQueries({ queryKey: ['todoTemplates'] });
    },
  });
};

export const useUpdateTodoTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: UpdateTodoTemplateRequest }) =>
      apiUpdateTodoTemplate(templateId, data),
    onSuccess: (_, { templateId }) => {
      // Invalidate and refetch todo templates
      queryClient.invalidateQueries({ queryKey: ['todoTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['todoTemplate', templateId] });
    },
  });
};

export const useDeleteTodoTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => apiDeleteTodoTemplate(templateId),
    onSuccess: () => {
      // Invalidate and refetch todo templates
      queryClient.invalidateQueries({ queryKey: ['todoTemplates'] });
    },
  });
};

export const useTestTodoTemplate = () => {
  return useMutation({
    mutationFn: ({ templateId, offerId }: { templateId: string; offerId: string }) =>
      apiTestTodoTemplate(templateId, offerId),
  });
};
