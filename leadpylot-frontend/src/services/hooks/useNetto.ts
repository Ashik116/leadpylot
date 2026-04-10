import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSendToNetto1, apiSendToNetto2, NettoRequestData, NettoResponse } from '../NettoService';
import useNotification from '@/utils/hooks/useNotification';

interface UseNettoMutationOptions {
  onSuccess?: () => void;
}

/**
 * Hook for sending offers to Netto1 system
 */
export const useSendToNetto1 = (options?: UseNettoMutationOptions) => {
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();
  const { onSuccess } = options || {};

  return useMutation({
    mutationFn: ({ offerId, data }: { offerId: string; data?: NettoRequestData }) =>
      apiSendToNetto1(offerId, data),
    onSuccess: (data: NettoResponse) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['netto'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] }); // Invalidate multi-table query

      openNotification({
        type: 'success',
        massage: data.message || 'Offer successfully sent to Netto1',
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to send offer to Netto1',
      });
    },
  });
};

/**
 * Hook for sending offers to Netto2 system
 */
export const useSendToNetto2 = (options?: UseNettoMutationOptions) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const { onSuccess } = options || {};

  return useMutation({
    mutationFn: ({ offerId, data }: { offerId: string; data?: NettoRequestData }) =>
      apiSendToNetto2(offerId, data),
    onSuccess: (data: NettoResponse) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['netto'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] }); // Invalidate multi-table query

      openNotification({
        type: 'success',
        massage: data.message || 'Offer successfully sent to Netto2',
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to send offer to Netto2',
      });
    },
  });
};

/**
 * Combined hook for both Netto operations
 */
export const useNettoOperations = (params?: { onSuccess?: () => void }) => {
  const sendToNetto1 = useSendToNetto1({ onSuccess: params?.onSuccess });
  const sendToNetto2 = useSendToNetto2({ onSuccess: params?.onSuccess });

  return {
    sendToNetto1,
    sendToNetto2,
    isLoading: sendToNetto1.isPending || sendToNetto2.isPending,
    isError: sendToNetto1.isError || sendToNetto2.isError,
    error: sendToNetto1.error || sendToNetto2.error,
  };
};

/**
 * Hook for bulk Netto operations
 */
export const useBulkNettoOperations = (params?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const { onSuccess } = params || {};

  const bulkSendToNetto1 = useMutation({
    mutationFn: async (requests: Array<{ offerId: string; data?: NettoRequestData }>) => {
      const results = await Promise.allSettled(
        requests.map(({ offerId, data }) => apiSendToNetto1(offerId, data))
      );

      const successful = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.filter((result) => result.status === 'rejected').length;

      return { successful, failed, total: requests.length, results };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['netto'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] }); // Invalidate multi-table query

      openNotification({
        type: 'success',
        massage: `Successfully sent ${data.successful} offer(s) to Netto1${
          data.failed > 0 ? `, ${data.failed} failed` : ''
        }`,
      });
      onSuccess?.();
    },
    onError: (error) => {
      openNotification({
        type: 'danger',
        massage: (error as any)?.message || 'Failed to send offers to Netto1',
      });
      onSuccess?.();
    },
  });

  const bulkSendToNetto2 = useMutation({
    mutationFn: async (requests: Array<{ offerId: string; data?: NettoRequestData }>) => {
      const results = await Promise.allSettled(
        requests.map(({ offerId, data }) => apiSendToNetto2(offerId, data))
      );

      const successful = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.filter((result) => result.status === 'rejected').length;

      return { successful, failed, total: requests.length, results };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['netto'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] }); // Invalidate multi-table query

      openNotification({
        type: 'success',
        massage: `Successfully sent ${data.successful} offer(s) to Netto2${
          data.failed > 0 ? `, ${data.failed} failed` : ''
        }`,
      });
      onSuccess?.();
    },
    onError: (error) => {
      openNotification({
        type: 'danger',
        massage: (error as any)?.message || 'Failed to send offers to Netto2',
      });
      onSuccess?.();
    },
  });

  return {
    bulkSendToNetto1,
    bulkSendToNetto2,
    isLoading: bulkSendToNetto1.isPending || bulkSendToNetto2.isPending,
  };
};
