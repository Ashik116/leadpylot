import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiMoveOffersOut, apiRevertOffersFromOut, MoveOffersOutRequest } from '../OffersService';
import useNotification from '@/utils/hooks/useNotification';

/**
 * Hook to move offers to out status
 * POST /offers/out
 */
export const useMoveOffersOut = () => {
    const queryClient = useQueryClient();
    const { openNotification } = useNotification();

    return useMutation({
        mutationFn: (offerIds: string[]) => apiMoveOffersOut(offerIds),
        onSuccess: (data) => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['offers'] });
            queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
            queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
            queryClient.invalidateQueries({ queryKey: ['openings'] });
            queryClient.invalidateQueries({ queryKey: ['confirmations'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });

            openNotification({
                type: 'success',
                massage: data.message || `Successfully moved ${data.data?.updated || 0} offer(s) to out`,
            });
        },
        onError: (error: any) => {
            openNotification({
                type: 'danger',
                massage: error?.response?.data?.message || error?.message || 'Failed to move offers to out',
            });
        },
    });
};

/**
 * Hook to revert offers from 'out' status back to 'offer' status
 * PUT /offers/revert-from-out
 */
export const useRevertOffersFromOut = () => {
    const queryClient = useQueryClient();
    const { openNotification } = useNotification();

    return useMutation({
        mutationFn: (offerIds: string[]) => apiRevertOffersFromOut(offerIds),
        onSuccess: (data) => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['offers'] });
            queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
            queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
            queryClient.invalidateQueries({ queryKey: ['openings'] });
            queryClient.invalidateQueries({ queryKey: ['confirmations'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });

            openNotification({
                type: 'success',
                massage: data.message || `Successfully reverted ${data.data?.updated || 0} offer(s) from out`,
            });
        },
        onError: (error: any) => {
            openNotification({
                type: 'danger',
                massage: error?.response?.data?.message || error?.message || 'Failed to revert offers from out',
            });
        },
    });
};

