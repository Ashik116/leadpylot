import { useMutation, useQueryClient } from '@tanstack/react-query';
import AxiosBase from '@/services/axios/AxiosBase';

export const useStarEmail = () => {
    const queryClient = useQueryClient();

    const starEmailMutation = useMutation({
        mutationFn: async (emailId: string) => {
            const response = await AxiosBase.post(`/email-system/${emailId}/star`);
            return response.data;
        },
        onSuccess: (data, emailId) => {
            queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
            queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });
            queryClient.invalidateQueries({ queryKey: ['email-detail', emailId] });
        },
    });

    const unstarEmailMutation = useMutation({
        mutationFn: async (emailId: string) => {
            const response = await AxiosBase.delete(`/email-system/${emailId}/star`);
            return response.data;
        },
        onSuccess: (data, emailId) => {
            queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
            queryClient.invalidateQueries({ queryKey: ['email'] });
            queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });
            queryClient.invalidateQueries({ queryKey: ['email-detail', emailId] });
        },
    });

    const toggleStar = async (emailId: string, isStarred: boolean) => {
        if (isStarred) {
            await starEmailMutation.mutateAsync(emailId);
        } else {
            await unstarEmailMutation.mutateAsync(emailId);
        }
    };

    return {
        starEmail: starEmailMutation.mutateAsync,
        unstarEmail: unstarEmailMutation.mutateAsync,
        toggleStar,
        isStarring: starEmailMutation.isPending,
        isUnstarring: unstarEmailMutation.isPending,
    };
};

