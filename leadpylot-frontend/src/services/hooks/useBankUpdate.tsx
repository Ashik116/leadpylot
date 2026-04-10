import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUpdateBank } from '../SettingsService';

interface UseBankUpdateOptions {
  onSuccess?: (result: any) => void;
}

export const useBankUpdate = (bankId: string, options?: UseBankUpdateOptions) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiUpdateBank(data, bankId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['bank', bankId] });
      queryClient.invalidateQueries({ queryKey: ['bank-list'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      toast.push(
        <Notification title="Bank updated" type="success">
          Bank allow setting updated successfully
        </Notification>
      );
    },
    onError: () => {
      toast.push(
        <Notification title="Update failed" type="danger">
          Failed to update bank
        </Notification>
      );
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
  };
};
