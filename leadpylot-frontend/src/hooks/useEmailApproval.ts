import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiApproveEmail, EmailApprovalRequest, EmailApprovalResponse, apiMarkEmailAsViewed, apiAllEmailAsViewed } from '@/services/emailSystem/EmailApprovalService';
import useNotification from '@/utils/hooks/useNotification';

interface UseEmailApprovalReturn {
    // Loading state
    isLoading: boolean;

    // Error state
    error: string | null;

    // Main action function
    approveEmail: (emailId: string, data: EmailApprovalRequest) => Promise<EmailApprovalResponse>;

    // Utility functions
    clearError: () => void;
}

export const useEmailApproval = (): UseEmailApprovalReturn & {
    markEmailAsViewed: (emailId: string, isAdmin: boolean) => Promise<any>;
    markAllEmailsAsViewed: (isAdmin: boolean, body: any) => Promise<any>;
} => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const { openNotification } = useNotification();

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const approveEmail = useCallback(async (emailId: string, data: EmailApprovalRequest): Promise<EmailApprovalResponse> => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiApproveEmail(emailId, data);

            // Invalidate email queries to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
            queryClient.invalidateQueries({ queryKey: ['admin-pending-emails'] });
            queryClient.invalidateQueries({ queryKey: ['admin-all-emails'] });
            queryClient.invalidateQueries({ queryKey: ['infinite-admin-emails'] });
            queryClient.invalidateQueries({ queryKey: ['agent-approved-emails'] });
            queryClient.invalidateQueries({ queryKey: ['email-statistics'] });
            queryClient.invalidateQueries({ queryKey: ['email-by-id'] });

            // Show success notification based on action type
            if (data.approve_email) {
                openNotification({
                    type: 'success',
                    massage: 'Email approved successfully!'
                });
            } else {
                openNotification({
                    type: 'success',
                    massage: 'Email rejected successfully!'
                });
            }

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to process email approval';
            setError(errorMessage);

            // Show error notification
            openNotification({
                type: 'danger',
                massage: `Failed to process email: ${errorMessage}`
            });

            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [queryClient, openNotification]);

    const markEmailAsViewed = useCallback(async (emailId: string, isAdmin: boolean) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiMarkEmailAsViewed(emailId, isAdmin);
            // Invalidate queries to refresh UI
            queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
            queryClient.invalidateQueries({ queryKey: ['admin-pending-emails'] });
            queryClient.invalidateQueries({ queryKey: ['admin-all-emails'] });
            queryClient.invalidateQueries({ queryKey: ['infinite-admin-emails'] });
            queryClient.invalidateQueries({ queryKey: ['agent-approved-emails'] });
            queryClient.invalidateQueries({ queryKey: ['email-statistics'] });
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to mark email as viewed';
            setError(errorMessage);
            openNotification({
                type: 'danger',
                massage: `Failed to mark email as viewed: ${errorMessage}`
            });
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [queryClient, openNotification]);

    const markAllEmailsAsViewed = useCallback(async (isAdmin: boolean, body: any) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiAllEmailAsViewed(isAdmin, body);
            // Invalidate queries to refresh UI
            queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
            queryClient.invalidateQueries({ queryKey: ['admin-pending-emails'] });
            queryClient.invalidateQueries({ queryKey: ['admin-all-emails'] });
            queryClient.invalidateQueries({ queryKey: ['infinite-admin-emails'] });
            queryClient.invalidateQueries({ queryKey: ['agent-approved-emails'] });
            queryClient.invalidateQueries({ queryKey: ['email-statistics'] });
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to mark multiple emails as viewed';
            setError(errorMessage);
            openNotification({
                type: 'danger',
                massage: `Failed to mark multiple emails as viewed: ${errorMessage}`
            });
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [queryClient, openNotification]);

    return {
        isLoading,
        error,
        approveEmail,
        clearError,
        markEmailAsViewed,
        markAllEmailsAsViewed,
    };
}; 