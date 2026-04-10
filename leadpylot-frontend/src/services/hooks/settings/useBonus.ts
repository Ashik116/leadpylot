import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import useNotification from '@/utils/hooks/useNotification';
import {
  apiGetBonusAmounts,
  apiGetBonusAmount,
  apiCreateBonusAmount,
  apiUpdateBonusAmount,
  apiDeleteBonusAmount,
  apiDeleteBonusAmounts,
  type CreateBonusAmountRequest,
  type GetAllBonusAmountsResponse,
} from '../../settings/BonusService';

export interface UseBonusAmountsParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Hook to fetch all bonus amounts
 */
export const useBonusAmounts = (params?: UseBonusAmountsParams) => {
  const { enabled, page, limit, sortBy, sortOrder, search } = params || {};
  return useQuery<GetAllBonusAmountsResponse>({
    queryKey: ['bonus-amounts', params],
    queryFn: () => apiGetBonusAmounts({ page, limit, sortBy, sortOrder ,search: search || undefined}),
    placeholderData: (previousData) => previousData,
    enabled: !!enabled || true,
  });
};

/**
 * Hook to fetch a specific bonus amount by ID
 */
export const useBonusAmount = (id: string) => {
  return useQuery({
    queryKey: ['bonus-amount', id],
    queryFn: () => apiGetBonusAmount(id),
    enabled: !!id,
  });
};

/**
 * Hook to delete a bonus amount
 */
export const useDeleteBonusAmount = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!id) {
        return Promise.reject(new Error('No bonus amount ID provided for deletion'));
      }

      // Prevent deletion of items with temporary IDs
      if (id.startsWith('temp-')) {
        return Promise.reject(
          new Error('Cannot delete temporary item. Please wait for it to be saved.')
        );
      }

      try {
        return await apiDeleteBonusAmount(id);
      } catch (error: any) {
        throw error;
      }
    },
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches for all bonus-amounts queries
      await queryClient.cancelQueries({ queryKey: ['bonus-amounts'] });

      // Get the exact query key used by the dashboard (no params = undefined)
      const queryKey = ['bonus-amounts', undefined];

      // Snapshot the previous value
      const previousBonuses = queryClient.getQueryData(queryKey);

      // Optimistically remove the deleted bonus from cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return old.filter((bonus: any) => bonus._id !== deletedId);
      });

      return { previousBonuses, queryKey, deletedId };
    },
    onSuccess: () => {
      openNotification({ type: 'success', massage: 'Bonus amount deleted successfully' });
    },
    onError: (error: any, deletedId, context) => {
      // Rollback on error
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousBonuses);
      }

      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');

      openNotification({
        type: 'danger',
        massage: `Failed to delete bonus amount: ${errorMessage}`,
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['bonus-amounts'],
        exact: false, // This will invalidate all bonus-amounts queries regardless of params
      });
    },
  });
};

/**
 * Hook to delete multiple bonus amounts
 */
export const useDeleteBonusAmounts = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids || ids.length === 0) {
        return Promise.reject(new Error('No bonus amount IDs provided for deletion'));
      }

      try {
        return await apiDeleteBonusAmounts(ids);
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bonus-amounts'] });
      openNotification({
        type: 'success',
        massage: `Successfully deleted ${variables.length} bonus amount(s)`,
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');

      openNotification({
        type: 'danger',
        massage: `Failed to delete bonus amounts: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook for bonus amount mutations (create and update)
 */
export function useBonusAmountMutations(id?: string) {
  const router = useRouter();
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();

  const createBonusAmountMutation = useMutation({
    mutationFn: (data: CreateBonusAmountRequest) => apiCreateBonusAmount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-amounts'] });
      openNotification({ type: 'success', massage: 'Bonus amount created successfully' });
      router.push('/admin/bonus-amount');
    },
    onError: () => openNotification({ type: 'danger', massage: 'Failed to create bonus amount' }),
  });

  const updateBonusAmountMutation = useMutation({
    mutationFn: (data: Partial<CreateBonusAmountRequest>) =>
      apiUpdateBonusAmount(data, id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-amounts'] });
      openNotification({ type: 'success', massage: 'Bonus amount updated successfully' });
      router.push('/admin/bonus-amount');
    },
    onError: () => openNotification({ type: 'danger', massage: 'Failed to update bonus amount' }),
  });

  return {
    createBonusAmountMutation,
    updateBonusAmountMutation,
  };
}
