import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EmailApiService } from '../_services';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

const invalidateAndRefetchQueries = (queryClient: any, emailId?: string) => {
  console.log('invalidateAndRefetchQueries', emailId);
  const queries = [
    ['email-conversations'],
    ['email-conversations-infinite'],
    ...(emailId ? [['email-detail', emailId]] : [])
  ];

  queries.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
    queryClient.refetchQueries({ queryKey, exact: false });
  });
};

export const useSnoozeEmail = () => {
  const queryClient = useQueryClient();

  const snoozeMutation = useMutation({
    mutationFn: ({ emailId, snoozeUntil, reason }: { emailId: string; snoozeUntil: string; reason?: string }) =>
      EmailApiService.snoozeEmail(emailId, snoozeUntil, reason),
    onSuccess: (_, variables) => {
      invalidateAndRefetchQueries(queryClient, variables.emailId);
      toast.push(
        <Notification title="Success" type="success">
          Email snoozed successfully
        </Notification>
      );
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error.response?.data?.message || 'Failed to snooze email'}
        </Notification>
      );
    },
  });

  return {
    snoozeEmail: snoozeMutation.mutate,
    snoozeEmailAsync: snoozeMutation.mutateAsync,
    isSnoozing: snoozeMutation.isPending,
  };
};

export const useUnsnoozeEmail = () => {
  const queryClient = useQueryClient();

  const unsnoozeMutation = useMutation({
    mutationFn: (emailId: string) => EmailApiService.unsnoozeEmail(emailId),
    onSuccess: (_, emailId) => {
      invalidateAndRefetchQueries(queryClient, emailId);
      toast.push(
        <Notification title="Success" type="success">
          Email unsnoozed successfully
        </Notification>
      );
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to unsnooze email'}
        </Notification>
      );
    },
  });

  return {
    unsnoozeEmail: unsnoozeMutation.mutate,
    unsnoozeEmailAsync: unsnoozeMutation.mutateAsync,
    isUnsnoozing: unsnoozeMutation.isPending,
  };
};

