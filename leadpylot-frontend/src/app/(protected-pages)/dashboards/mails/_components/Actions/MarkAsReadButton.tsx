'use client';

/**
 * MarkAsReadButton Component
 * Bulk action to mark multiple emails as viewed/read
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
  import ApolloIcon from '@/components/ui/ApolloIcon';
  import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import EmailApiService from '../../_services/EmailApiService';

interface MarkAsReadButtonProps {
  selectedEmailIds: string[];
  onClearSelection: () => void;
}

export default function MarkAsReadButton({ selectedEmailIds, onClearSelection }: MarkAsReadButtonProps) {
  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      return await EmailApiService.markMultipleAsViewed(selectedEmailIds);
    },
    onSuccess: (data) => {
      toast.push(
       <Notification title="Success" type="success">
        {data.message || `${data.data.modifiedCount} emails marked as read`}
       </Notification>
      );
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-detail'] }); // Also invalidate detail view
      
      // Clear selection
      onClearSelection();
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to mark emails as read'}
        </Notification>
      );
    },
  });

  if (selectedEmailIds.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white">
          {selectedEmailIds.length}
        </div>
        <span className="text-sm font-medium text-blue-900">
           email{selectedEmailIds.length !== 1 ? 's' : ''} selected
        </span>
      </div>
      
      <div className="ml-auto flex items-center gap-2">
        <Button
          size="sm"
          variant="success"
          onClick={() => markAsReadMutation.mutate()}
          disabled={markAsReadMutation.isPending}
          loading={markAsReadMutation.isPending}
          icon={<ApolloIcon name="list-checked" />}
        >
          {markAsReadMutation.isPending ? 'Marking...' : 'Mark as Read'}
        </Button>
        
        <Button
          size="sm"
          variant="plain"
          onClick={onClearSelection}
          icon={<ApolloIcon name="cross" />}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

