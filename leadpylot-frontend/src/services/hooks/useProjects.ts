import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  apiDeleteProject,
  apiGetProject,
  apiGetProjects,
  apiGetLeadProjects,
  apiUpdateProject,
  UpdateProjectRequest,
  apiAddProjectAgents,
  AddProjectAgentsRequest,
  AddProjectAgentsResponse,
  ProjectsParams,
  LeadProjectsParams,
  LeadProjectsResponse,
  apiBulkDeleteProjects,
  apiGetAllProjects,
} from '../ProjectsService';
import useNotification from '@/utils/hooks/useNotification';
import { DEFAULT_PAGE_LIMIT } from '@/constants/pagination.constant';

export const useProjects = (params?: ProjectsParams & { enabled?: boolean }) => {
  // Set default limit to DEFAULT_PAGE_LIMIT if no limit is provided
  const { enabled, ...apiParams } = params || {};
  const paramsWithDefaultLimit = {
    ...apiParams,
    limit: apiParams?.limit ?? DEFAULT_PAGE_LIMIT,
  };

  return useQuery({
    queryKey: ['projects', paramsWithDefaultLimit],
    queryFn: () => apiGetProjects(paramsWithDefaultLimit),
    enabled: enabled !== false, // Default to true if not specified
  });
};

export const useLeadProjects = (params?: LeadProjectsParams) => {
  return useQuery<LeadProjectsResponse>({
    queryKey: ['lead-projects', params],
    queryFn: () => apiGetLeadProjects(params),
    retry: 2,
    retryDelay: 1000,
    // Lead projects data is moderately dynamic, cache for 5 minutes
    // 5 minutes
  });
};

export const useProject = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => apiGetProject(id),
    enabled,
    // Single project data doesn't change frequently, cache for 10 minutes
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useDeleteProject = (id: string) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => apiDeleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push('/dashboards/projects');
    },
  });
};

// project bulk delete

export const useBulkDeleteProjects = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (ids: string[]) => apiBulkDeleteProjects(ids),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      openNotification({
        type: 'success',
        massage: data?.message || 'Projects deleted successfully',
      });
    },
    onError: (error: any) =>
      openNotification({ type: 'danger', massage: error?.message || 'Failed to delete leads' }),
  });
};

export const useUpdateProject = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProjectRequest) => apiUpdateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export function useAddProjectAgents() {
  const queryClient = useQueryClient();

  return useMutation<
    AddProjectAgentsResponse,
    Error,
    { projectId: string; data: AddProjectAgentsRequest }
  >({
    mutationFn: ({ projectId, data }) => apiAddProjectAgents(projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}

export const useAllProjects = ({ limit }: { limit?: number } = {}) => {
  // Normalize limit to consistent value for better cache sharing
  const normalizedLimit = limit ?? 100;

  return useQuery({
    queryKey: ['all-projects', normalizedLimit],
    queryFn: () => apiGetAllProjects({ limit: normalizedLimit }),
    // Projects data doesn't change frequently, cache for 10 minutes
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
