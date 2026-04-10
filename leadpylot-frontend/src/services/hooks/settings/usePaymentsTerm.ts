import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import useNotification from '@/utils/hooks/useNotification';
import {
  apiGetPaymentTerms,
  apiGetPaymentTerm,
  apiCreatePaymentTerm,
  apiUpdatePaymentTerm,
  apiDeletePaymentTerm,
  apiDeletePaymentTerms,
  type CreatePaymentTermRequest,
  type GetAllPaymentTermsResponse,
} from '../../settings/PaymentsTerm';

export interface UsePaymentTermsParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch all payment terms
 */
export const usePaymentTerms = (params?: UsePaymentTermsParams) => {
  const { page, limit, enabled, sortBy, sortOrder, search } = params ?? {};
  return useQuery<GetAllPaymentTermsResponse>({
    queryKey: ['payment-terms', params],
    queryFn: () => apiGetPaymentTerms({ page, limit, sortBy, sortOrder, search }),
    placeholderData: (previousData) => previousData,
    enabled: enabled ? enabled : true,
  });
};

/**
 * Hook to fetch a specific payment term by ID
 */
export const usePaymentTerm = (id: string) => {
  return useQuery({
    queryKey: ['payment-term', id],
    queryFn: () => apiGetPaymentTerm(id),
    enabled: !!id,
  });
};

/**
 * Hook to delete a payment term
 */
export const useDeletePaymentTerm = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!id) {
        return Promise.reject(new Error('No payment term ID provided for deletion'));
      }

      try {
        return await apiDeletePaymentTerm(id);
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms'] });
      openNotification({ type: 'success', massage: 'Payment term deleted successfully' });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');

      openNotification({
        type: 'danger',
        massage: `Failed to delete payment term: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook to delete multiple payment terms
 */
export const useDeletePaymentTerms = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids || ids.length === 0) {
        return Promise.reject(new Error('No payment term IDs provided for deletion'));
      }

      try {
        return await apiDeletePaymentTerms(ids);
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms'] });
      openNotification({
        type: 'success',
        massage: `Successfully deleted ${variables.length} payment term(s)`,
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');

      openNotification({
        type: 'danger',
        massage: `Failed to delete payment terms: ${errorMessage}`,
      });
    },
  });
};

/**
 * Hook for payment term mutations (create and update)
 */
export function usePaymentTermMutations(id?: string) {
  const router = useRouter();
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();

  const createPaymentTermMutation = useMutation({
    mutationFn: (data: CreatePaymentTermRequest) => apiCreatePaymentTerm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms'] });
      openNotification({ type: 'success', massage: 'Payment term created successfully' });
      router.push('/admin/payment-terms');
    },
    onError: () => openNotification({ type: 'danger', massage: 'Failed to create payment term' }),
  });

  const updatePaymentTermMutation = useMutation({
    mutationFn: (data: Partial<CreatePaymentTermRequest>) =>
      apiUpdatePaymentTerm(data, id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms'] });
      openNotification({ type: 'success', massage: 'Payment term updated successfully' });
      router.push('/admin/payment-terms');
    },
    onError: () => openNotification({ type: 'danger', massage: 'Failed to update payment term' }),
  });

  return {
    createPaymentTermMutation,
    updatePaymentTermMutation,
  };
}
