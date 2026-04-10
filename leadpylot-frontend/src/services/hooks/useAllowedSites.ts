import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiGetAllowedSites,
  apiGetAllowedSite,
  apiCreateAllowedSite,
  apiUpdateAllowedSite,
  apiDeleteAllowedSite,
  apiDeleteMultipleAllowedSites,
  type AllowedSitesResponse,
  type AllowedSite,
  type CreateAllowedSiteRequest,
  type UpdateAllowedSiteRequest,
} from '../AllowedSiteService';

export const useAllowedSitesData = (params?: Record<string, unknown>) => {
  return useQuery<AllowedSitesResponse>({
    queryKey: ['allowed-sites', params],
    queryFn: () => apiGetAllowedSites(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useAllowedSite = (id: string) => {
  return useQuery<AllowedSite>({
    queryKey: ['allowed-site', id],
    queryFn: () => apiGetAllowedSite(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateAllowedSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAllowedSiteRequest) => apiCreateAllowedSite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed-sites'] });
    },
  });
};

export const useUpdateAllowedSite = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAllowedSiteRequest) => apiUpdateAllowedSite(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed-site', id] });
      queryClient.invalidateQueries({ queryKey: ['allowed-sites'] });
    },
  });
};

export const useDeleteAllowedSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDeleteAllowedSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed-sites'] });
    },
  });
};

export const useDeleteMultipleAllowedSites = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => apiDeleteMultipleAllowedSites(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed-sites'] });
    },
  });
};
