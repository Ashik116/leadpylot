import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetPaymentVouchers,
  apiGetPaymentVoucher,
  apiCreatePaymentVoucher,
  apiUpdatePaymentVoucher,
  apiAddDocumentsToPaymentVoucher,
  apiDeletePaymentVoucher,
  apiRestorePaymentVoucher,
  type GetPaymentVouchersParams,
} from '../PaymentVouchersService';
import useNotification from '@/utils/hooks/useNotification';

// Query keys
export const PAYMENT_VOUCHERS_QUERY_KEYS = {
  all: ['payment-vouchers'] as const,
  lists: () => [...PAYMENT_VOUCHERS_QUERY_KEYS.all, 'list'] as const,
  list: (params: GetPaymentVouchersParams) =>
    [...PAYMENT_VOUCHERS_QUERY_KEYS.lists(), params] as const,
  details: () => [...PAYMENT_VOUCHERS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PAYMENT_VOUCHERS_QUERY_KEYS.details(), id] as const,
};

// Hooks
export const usePaymentVouchers = (params?: GetPaymentVouchersParams & { enabled?: boolean }) => {
  const { enabled = true, ...queryParams } = params || {};
  return useQuery({
    queryKey: PAYMENT_VOUCHERS_QUERY_KEYS.list(queryParams || {}),
    queryFn: () => apiGetPaymentVouchers(queryParams),
    enabled,
  });
};

export const usePaymentVoucher = (id: string, showInactive?: boolean) => {
  return useQuery({
    queryKey: PAYMENT_VOUCHERS_QUERY_KEYS.detail(id),
    queryFn: () => apiGetPaymentVoucher(id, showInactive),
    enabled: !!id,
  });
};

// Mutations
export const useCreatePaymentVoucher = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  return useMutation({
    mutationFn: apiCreatePaymentVoucher,
    onSuccess: () => {
      // Invalidate and refetch payment vouchers list
      queryClient.invalidateQueries({ queryKey: PAYMENT_VOUCHERS_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] }); // Invalidate multi-table query
      queryClient.invalidateQueries({ queryKey: ['openings'] });
      queryClient.invalidateQueries({ queryKey: ['confirmations'] });
    },
    onError: (error) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to create payment voucher',
      });
    },
  });
};

export const useUpdatePaymentVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => apiUpdatePaymentVoucher(id, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch payment vouchers list
      queryClient.invalidateQueries({ queryKey: PAYMENT_VOUCHERS_QUERY_KEYS.lists() });
      // Update the specific payment voucher in cache
      queryClient.setQueryData(PAYMENT_VOUCHERS_QUERY_KEYS.detail(variables.id), data);
    },
  });
};

export const useAddDocumentsToPaymentVoucher = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      apiAddDocumentsToPaymentVoucher(id, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch payment vouchers list
      queryClient.invalidateQueries({ queryKey: PAYMENT_VOUCHERS_QUERY_KEYS.lists() });
      // Update the specific payment voucher in cache
      queryClient.setQueryData(PAYMENT_VOUCHERS_QUERY_KEYS.detail(variables.id), data.data);
      openNotification({
        type: 'success',
        massage: `Documents added to payment voucher successfully`,
      });
    },
    onError: (error) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to add documents to payment voucher',
      });
    },
  });
};

export const useDeletePaymentVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiDeletePaymentVoucher,
    onSuccess: () => {
      // Invalidate and refetch payment vouchers list
      queryClient.invalidateQueries({ queryKey: PAYMENT_VOUCHERS_QUERY_KEYS.lists() });
    },
  });
};

export const useRestorePaymentVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiRestorePaymentVoucher,
    onSuccess: () => {
      // Invalidate and refetch payment vouchers list
      queryClient.invalidateQueries({ queryKey: PAYMENT_VOUCHERS_QUERY_KEYS.lists() });
    },
  });
};
