import { useSession } from '@/hooks/useSession';
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  apiMarkEmailAsViewed,
  apiMarkMultipleEmailsAsViewed,
} from '@/services/emailSystem/EmailApprovalService';
import useNotification from '@/utils/hooks/useNotification';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';

export interface UseMarkEmailViewedReturn {
  markAsViewed: (emailIds: string | string[]) => Promise<any>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useMarkEmailViewed(): UseMarkEmailViewedReturn {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { clearSelectedItems } = useSelectedItemsStore();

  // Detect admin/agent from session
  const isAdmin = session?.user?.role === Role.ADMIN;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const markAsViewed = useCallback(
    async (emailIds: string | string[]) => {
      setIsLoading(true);
      setError(null);
      try {
        let response;
        if (Array.isArray(emailIds)) {
          if (emailIds.length === 0) {
            throw new Error('No emails selected');
          }
          response = await apiMarkMultipleEmailsAsViewed(emailIds, isAdmin);
          clearSelectedItems();
          // Show success notification
          openNotification({
            type: 'success',
            massage: `${emailIds.length} email${emailIds.length === 1 ? '' : 's'} marked as viewed successfully!`,
          });
        } else {
          response = await apiMarkEmailAsViewed(emailIds, isAdmin);

          // Show success notification
          openNotification({
            type: 'success',
            massage: 'Email marked as viewed successfully!',
          });
        }

        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
        queryClient.invalidateQueries({ queryKey: ['admin-pending-emails'] });
        queryClient.invalidateQueries({ queryKey: ['admin-all-emails'] });
        queryClient.invalidateQueries({ queryKey: ['infinite-admin-emails'] });
        queryClient.invalidateQueries({ queryKey: ['agent-approved-emails'] });
        queryClient.invalidateQueries({ queryKey: ['email-statistics'] });

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to mark email(s) as viewed';
        setError(errorMessage);

        openNotification({
          type: 'danger',
          massage: `Failed to mark email(s) as viewed: ${errorMessage}`,
        });

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isAdmin, queryClient, openNotification]
  );

  return {
    markAsViewed,
    isLoading,
    error,
    clearError,
  };
}
