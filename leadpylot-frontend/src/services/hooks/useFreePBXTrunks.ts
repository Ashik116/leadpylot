import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiGetTrunks,
  apiGetTrunk,
  apiGetTrunkStatistics,
  apiCreateTrunk,
  apiUpdateTrunk,
  apiDeleteTrunk,
  apiReloadFreePBX,
  apiGetReloadStatus,
  type CreateTrunkData,
  type UpdateTrunkData,
} from '../FreePBXTrunkService';
import useNotification from '@/utils/hooks/useNotification';

export interface UseTrunksParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Hook to fetch all trunks
 */
export const useTrunks = (params?: UseTrunksParams, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['freepbx-trunks', params],
    queryFn: () => apiGetTrunks(params),
    placeholderData: (previousData) => previousData,
    enabled: options?.enabled !== false,
  });
};

/**
 * Hook to fetch a single trunk by ID
 */
export const useTrunk = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['freepbx-trunk', id],
    queryFn: () => apiGetTrunk(id),
    enabled: options?.enabled !== false && id > 0,
  });
};

/**
 * Hook to fetch trunk statistics
 */
export const useTrunkStatistics = () => {
  return useQuery({
    queryKey: ['freepbx-trunk-statistics'],
    queryFn: () => apiGetTrunkStatistics(),
  });
};

/**
 * Hook to create a new trunk
 */
export const useCreateTrunk = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (data: CreateTrunkData) => apiCreateTrunk(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['freepbx-trunks'] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-trunk-statistics'] });
      openNotification({
        type: 'success',
        massage: response.message || 'Trunk created successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.error || error?.message || 'Failed to create trunk',
      });
    },
  });
};

/**
 * Hook to update a trunk
 */
export const useUpdateTrunk = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTrunkData }) => apiUpdateTrunk(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['freepbx-trunks'] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-trunk'] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-trunk-statistics'] });
      openNotification({
        type: 'success',
        massage: response.message || 'Trunk updated successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.error || error?.message || 'Failed to update trunk',
      });
    },
  });
};

/**
 * Hook to delete a trunk
 */
export const useDeleteTrunk = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (id: number) => {
      if (!id || id <= 0) {
        return Promise.reject(new Error('Invalid trunk ID'));
      }
      return apiDeleteTrunk(id);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['freepbx-trunks'] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-trunk-statistics'] });
      openNotification({
        type: 'success',
        massage: response.message || 'Trunk deleted successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.error || error?.message || 'Failed to delete trunk',
      });
    },
  });
};

/**
 * Hook to reload FreePBX
 */
export const useReloadFreePBX = () => {
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (full: boolean = true) => apiReloadFreePBX(full),
    onSuccess: (response) => {
      openNotification({
        type: 'success',
        massage: response.message || 'FreePBX reloaded successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.error || error?.message || 'Failed to reload FreePBX',
      });
    },
  });
};

/**
 * Hook to check reload status
 */
export const useReloadStatus = () => {
  return useQuery({
    queryKey: ['freepbx-reload-status'],
    queryFn: () => apiGetReloadStatus(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

