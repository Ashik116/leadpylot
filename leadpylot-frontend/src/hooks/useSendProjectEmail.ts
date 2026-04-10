import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSendProjectEmail, SendProjectEmailParams, SendProjectEmailResponse } from '@/services/notifications/NotificationsService';

interface UseSendProjectEmailOptions {
    onSuccess?: (response: SendProjectEmailResponse) => void;
    onError?: (error: Error) => void;
    invalidateQueries?: string[];
}

export const useSendProjectEmail = (options: UseSendProjectEmailOptions = {}) => {
    const [isSending, setIsSending] = useState(false);
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: SendProjectEmailParams) => apiSendProjectEmail(data),
        onMutate: () => {
            setIsSending(true);
        },
        onSuccess: (response: SendProjectEmailResponse) => {
            setIsSending(false);

            // Invalidate specified queries
            if (options.invalidateQueries) {
                options.invalidateQueries.forEach(queryKey => {
                    queryClient.invalidateQueries({ queryKey: [queryKey] });
                });
            }

            // Default invalidation for notifications
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['emails'] });

            options.onSuccess?.(response);
        },
        onError: (error: Error) => {
            setIsSending(false);
            options.onError?.(error);
        },
    });

    const sendEmail = async (data: SendProjectEmailParams) => {
        try {
            return await mutation.mutateAsync(data);
        } catch (error) {
            throw error;
        }
    };

    return {
        sendEmail,
        isSending: isSending || mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
        reset: mutation.reset,
    };
}; 