import {
  apiCreateMeeting,
  apiDeleteMeeting,
  apiGetMeetings,
  apiUpdateMeeting,
  CreateMeetingRequestProps,
  UpdateMeetingRequestType,
} from '@/services/MeetingsService';
import useNotification from '@/utils/hooks/useNotification';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const useMeetings = () => {
  return useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiGetMeetings(),
  });
};

export const useDeleteMeeting = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (id: string) => {
      return apiDeleteMeeting(id);
    },

    onSuccess: () => {
      openNotification({ type: 'success', massage: 'Meeting deleted' });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: () => {
      openNotification({ type: 'danger', massage: 'Failed to delete meeting' });
    },
  });
};

export const useCreateMeeting = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (data: CreateMeetingRequestProps) => {
      return apiCreateMeeting(data);
    },
    onSuccess: (newMeeting, variables) => {
      openNotification({ type: 'success', massage: 'Meeting created' });

      // Refresh updates/activities section to show meeting_scheduled activity in real-time
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      if (variables.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['lead', variables.lead_id] });
      }

      // Instead of invalidating, manually update the cache
      queryClient.setQueryData(['meetings'], (oldData: any) => {
        if (!oldData) return oldData;

        // Create a mock meeting object for immediate UI update
        const mockMeeting = {
          _id: Date.now().toString(), // Temporary ID
          start_time: variables.start_time,
          end_time: variables.end_time,
          all_day: variables.all_day,
          agent: { _id: variables.agent_id, login: 'Current User', role: 'agent' },
          lead: { _id: variables.lead_id, contact_name: 'Loading...', phone: '', email_from: '' },
          project: { _id: variables.project_id, name: 'Loading...' },
          videocall_url: variables.videocall_url,
          description: variables.description || '',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return {
          ...oldData,
          data: [...(oldData.data || []), mockMeeting],
          meta: {
            ...oldData.meta,
            total: (oldData.meta?.total || 0) + 1,
          },
        };
      });

      // Invalidate after a delay to get the real data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['meetings'] });
      }, 2000);
    },
    onError: () => {
      openNotification({ type: 'danger', massage: 'Failed to create meeting' });
    },
  });
};

export const useUpdateMeeting = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMeetingRequestType }) => {
      return apiUpdateMeeting(id, data);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      openNotification({ type: 'success', massage: 'Meeting updated' });
    },
    onError: () => {
      openNotification({ type: 'danger', massage: 'Failed to update meeting' });
    },
  });
};
