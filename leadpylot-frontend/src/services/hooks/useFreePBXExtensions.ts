import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiCreateExtension,
  apiDeleteExtension,
  apiGetExtensions,
  apiGetExtension,
  apiGetExtensionStatistics,
  apiUpdateExtensionRole,
  apiUpdateExtension,
  type CreateExtensionData,
} from '../FreePBXExtensionService';
import useNotification from '@/utils/hooks/useNotification';

export interface UseExtensionsParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'admin' | 'agent';
}

/**
 * Hook to fetch all extensions
 */
export const useExtensions = (params?: UseExtensionsParams, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['freepbx-extensions', params],
    queryFn: () => apiGetExtensions(params),
    placeholderData: (previousData) => previousData,
    enabled: options?.enabled !== false,
  });
};

/**
 * Hook to fetch a single extension by number
 */
export const useExtension = (extension: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['freepbx-extension', extension],
    queryFn: () => apiGetExtension(extension),
    enabled: options?.enabled !== false && !!extension,
  });
};

/**
 * Hook to fetch extension statistics
 */
export const useExtensionStatistics = () => {
  return useQuery({
    queryKey: ['freepbx-extension-statistics'],
    queryFn: () => apiGetExtensionStatistics(),
  });
};

/**
 * Hook to create a new extension
 */
export const useCreateExtension = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (data: CreateExtensionData) => apiCreateExtension(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['freepbx-extensions'] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-extension-statistics'] });
      
      // Show success with password info
      openNotification({
        type: 'success',
        massage: `${response.message}\n\nPassword: ${response.data.secret}\n\n⚠️ Save this password - it won't be shown again!`,
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.error || error?.message || 'Failed to create extension',
      });
    },
  });
};

/**
 * Hook to update extension
 */
export const useUpdateExtension = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ extension, data }: { extension: string; data: Partial<CreateExtensionData> }) =>
      apiUpdateExtension(extension, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['freepbx-extensions'] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-extension', response.data.extension] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-extension-statistics'] });
      openNotification({
        type: 'success',
        massage: response.message || 'Extension updated successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.error || error?.message || 'Failed to update extension',
      });
    },
  });
};

/**
 * Hook to update extension role
 */
export const useUpdateExtensionRole = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ extension, role }: { extension: string; role: 'admin' | 'agent' }) =>
      apiUpdateExtensionRole(extension, role),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['freepbx-extensions'] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-extension', response.data.extension] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-extension-statistics'] });
      openNotification({
        type: 'success',
        massage: response.message || 'Extension role updated successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.error || error?.message || 'Failed to update extension role',
      });
    },
  });
};

/**
 * Hook to delete an extension
 */
export const useDeleteExtension = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (extension: string) => {
      if (!extension) {
        return Promise.reject(new Error('Invalid extension'));
      }
      return apiDeleteExtension(extension);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['freepbx-extensions'] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-extension-statistics'] });
      openNotification({
        type: 'success',
        massage: response.message || 'Extension deleted successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.error || error?.message || 'Failed to delete extension',
      });
    },
  });
};

