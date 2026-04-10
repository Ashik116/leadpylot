import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetConfirmations,
  apiGetConfirmation,
  apiCreateConfirmation,
  apiUpdateConfirmation,
  apiDeleteConfirmation,
  type CreateConfirmationRequest,
  type Confirmation,
} from '../ConfirmationsService';
import useNotification from '@/utils/hooks/useNotification';

// Hook for fetching confirmations
export const useConfirmations = (params?: {
  page?: number;
  limit?: number;
  offer_id?: string;
  opening_id?: string;
  showInactive?: boolean;
  search?: string;
  enabled?: boolean;
}) => {
  const { enabled = true, ...queryParams } = params || {};
  return useQuery({
    queryKey: ['confirmations', queryParams],
    queryFn: () => apiGetConfirmations(queryParams),
    enabled,
  });
};

// Hook for fetching single confirmation
export const useConfirmation = (id: string) => {
  return useQuery({
    queryKey: ['confirmation', id],
    queryFn: () => apiGetConfirmation(id),
    enabled: !!id,
  });
};

// Hook for creating confirmation
export const useCreateConfirmation = (options?: {
  onSuccess?: (data: Confirmation) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (data: CreateConfirmationRequest) => apiCreateConfirmation(data),
    onSuccess: (data) => {
      // Invalidate confirmations queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['openings'] }); // Also refresh openings

      openNotification({
        type: 'success',
        massage: 'Confirmation created successfully',
      });
      if (options?.onSuccess) {
        options.onSuccess(data as Confirmation);
      }
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to create confirmation',
      });

      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};

// Hook for updating confirmation
export const useUpdateConfirmation = (options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateConfirmationRequest> }) =>
      apiUpdateConfirmation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['confirmation'] });

      openNotification({
        type: 'success',
        massage: 'Confirmation updated successfully',
      });

      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to update confirmation',
      });

      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};

// Hook for deleting confirmation
export const useDeleteConfirmation = (options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (id: string) => apiDeleteConfirmation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confirmations'] });

      openNotification({
        type: 'success',
        massage: 'Confirmation deleted successfully',
      });

      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to delete confirmation',
      });

      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};

// Hook for bulk creating confirmations (for multiple openings)
export const useBulkCreateConfirmations = (options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: async (requests: CreateConfirmationRequest[]) => {
      const results = [];
      for (let i = 0; i < requests.length; i++) {
        try {
          const result = await apiCreateConfirmation(requests[i]);
          results.push(result);
        } catch (error: any) {

          throw error; // Fail fast on first error
        }
      }
      return results;
    },
    onSuccess: (data) => {
      // Invalidate all related queries to ensure table updates
      queryClient.invalidateQueries({ queryKey: ['confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['openings'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] }); // Invalidate multi-table query
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      openNotification({
        type: 'success',
        massage: `${data.length} confirmation(s) created successfully`,
      });

      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to create confirmations',
      });

      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};
