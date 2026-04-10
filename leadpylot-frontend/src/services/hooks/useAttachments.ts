import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiOfferDeleteAttachment, type DeleteAttachmentResponse } from '../AttachmentService';
import useNotification from '@/utils/hooks/useNotification';

export const useDeleteAttachment = (options?: {
    onSuccess?: (data: DeleteAttachmentResponse) => void;
    onError?: (error: unknown) => void;
}) => {
    const queryClient = useQueryClient();
    const { openNotification } = useNotification();

    return useMutation<DeleteAttachmentResponse, unknown, { attachmentId: string, offerId: string }>({
        mutationFn: ({ attachmentId, offerId }) => apiOfferDeleteAttachment(attachmentId, offerId),
        onSuccess: (data) => {
            // Invalidate all relevant queries that might contain attachments
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['openings'] });
            queryClient.invalidateQueries({ queryKey: ['confirmations'] });
            queryClient.invalidateQueries({ queryKey: ['payment-vouchers'] });
            queryClient.invalidateQueries({ queryKey: ['offers'] });
            queryClient.invalidateQueries({ queryKey: ['leadAttachments'] });
            // Invalidate offers-progress queries (used by OpeningsDashboardRefactored)
            queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
            queryClient.invalidateQueries({ queryKey: ['leadAttachments'] });

            openNotification({
                type: 'success',
                massage: data.message || 'Attachment deleted successfully',
            });

            if (options?.onSuccess) {
                options.onSuccess(data);
            }
        },
        onError: (error: any) => {
            openNotification({
                type: 'danger',
                massage: error?.message || 'Failed to delete attachment',
            });

            if (options?.onError) {
                options.onError(error);
            }
        },
    });
}; 