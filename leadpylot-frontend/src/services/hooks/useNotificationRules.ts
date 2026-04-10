/**
 * useNotificationRules Hook
 * React Query hooks for managing notification rules
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { createElement } from 'react';
import audioService from '@/utils/audioUtils';
import {
  apiGetNotificationRules,
  apiGetNotificationRuleById,
  apiGetEventTypes,
  apiGetNotificationAnalytics,
  apiCreateNotificationRule,
  apiUpdateNotificationRule,
  apiToggleNotificationRule,
  apiResetNotificationRule,
  apiTestNotificationRule,
  apiDeleteNotificationRule,
  apiUploadNotificationRuleAudio,
  apiDeleteNotificationRuleAudio,
  CreateRulePayload,
  UpdateRulePayload,
} from '../NotificationRulesService';

// Helper functions for toast notifications (using createElement to avoid JSX in .ts file)
const showSuccessToast = (message: string) => {
  toast.push(
    createElement(Notification, { title: 'Success', type: 'success' }, message)
  );
};

const showErrorToast = (message: string) => {
  toast.push(
    createElement(Notification, { title: 'Error', type: 'danger' }, message)
  );
};

// Query keys
export const notificationRulesKeys = {
  all: ['notification-rules'] as const,
  list: (params?: Record<string, unknown>) => [...notificationRulesKeys.all, 'list', params] as const,
  detail: (id: string) => [...notificationRulesKeys.all, 'detail', id] as const,
  eventTypes: ['notification-rules', 'event-types'] as const,
  analytics: (params?: Record<string, unknown>) => ['notification-rules', 'analytics', params] as const,
};

/**
 * Hook to fetch all notification rules
 */
export const useNotificationRules = (params?: {
  category?: string;
  eventType?: string;
  enabled?: boolean;
  scope?: 'global' | 'project';
}) => {
  return useQuery({
    queryKey: notificationRulesKeys.list(params),
    queryFn: () => apiGetNotificationRules(params),
    select: (data) => ({
      rules: data.data,
      grouped: data.grouped,
      total: data.total,
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch a single notification rule
 */
export const useNotificationRule = (id: string) => {
  return useQuery({
    queryKey: notificationRulesKeys.detail(id),
    queryFn: () => apiGetNotificationRuleById(id),
    select: (data) => data.data,
    enabled: !!id,
  });
};

/**
 * Hook to fetch available event types
 */
export const useEventTypes = () => {
  return useQuery({
    queryKey: notificationRulesKeys.eventTypes,
    queryFn: () => apiGetEventTypes(),
    select: (data) => ({
      eventTypes: data.data,
      grouped: data.grouped,
      total: data.total,
    }),
    staleTime: 1000 * 60 * 30, // 30 minutes - event types rarely change
  });
};

/**
 * Hook to fetch notification analytics
 */
export const useNotificationAnalytics = (params?: {
  startDate?: string;
  endDate?: string;
  eventType?: string;
}) => {
  return useQuery({
    queryKey: notificationRulesKeys.analytics(params),
    queryFn: () => apiGetNotificationAnalytics(params),
    select: (data) => data.data,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Hook to create a notification rule
 */
export const useCreateNotificationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRulePayload) => apiCreateNotificationRule(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: notificationRulesKeys.all });
      showSuccessToast(data.message || 'Notification rule created successfully');
    },
    onError: (error: Error) => {
      showErrorToast(error.message || 'Failed to create notification rule');
    },
  });
};

/**
 * Hook to update a notification rule
 */
export const useUpdateNotificationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRulePayload }) =>
      apiUpdateNotificationRule(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: notificationRulesKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationRulesKeys.detail(variables.id) });
      // Clear audio cache in case audio configuration changed
      audioService.clearRuleCache();
      showSuccessToast(data.message || 'Notification rule updated successfully');
    },
    onError: (error: Error) => {
      showErrorToast(error.message || 'Failed to update notification rule');
    },
  });
};

/**
 * Hook to toggle a notification rule
 */
export const useToggleNotificationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiToggleNotificationRule(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: notificationRulesKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationRulesKeys.detail(id) });
      // Clear audio cache in case rule was disabled/enabled (affects audio playback)
      audioService.clearRuleCache();
      showSuccessToast(data.message || 'Notification rule toggled successfully');
    },
    onError: (error: Error) => {
      showErrorToast(error.message || 'Failed to toggle notification rule');
    },
  });
};

/**
 * Hook to reset a notification rule to default
 */
export const useResetNotificationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiResetNotificationRule(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: notificationRulesKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationRulesKeys.detail(id) });
      // Clear audio cache since resetting might remove custom audio
      audioService.clearRuleCache();
      showSuccessToast(data.message || 'Notification rule reset to default');
    },
    onError: (error: Error) => {
      showErrorToast(error.message || 'Failed to reset notification rule');
    },
  });
};

/**
 * Hook to test a notification rule
 */
export const useTestNotificationRule = () => {
  return useMutation({
    mutationFn: (id: string) => apiTestNotificationRule(id),
    onSuccess: (data) => {
      // Clear audio cache to ensure fresh lookup for test notification
      audioService.clearRuleCache();
      showSuccessToast(data.message || 'Test notification sent successfully');
    },
    onError: (error: Error) => {
      showErrorToast(error.message || 'Failed to send test notification');
    },
  });
};

/**
 * Hook to delete a notification rule
 */
export const useDeleteNotificationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDeleteNotificationRule(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: notificationRulesKeys.all });
      showSuccessToast(data.message || 'Notification rule deleted successfully');
    },
    onError: (error: Error) => {
      showErrorToast(error.message || 'Failed to delete notification rule');
    },
  });
};

/**
 * Hook to upload audio for a notification rule
 */
export const useUploadNotificationRuleAudio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, audioFile }: { id: string; audioFile: File }) =>
      apiUploadNotificationRuleAudio(id, audioFile),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: notificationRulesKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationRulesKeys.detail(variables.id) });
      // Clear audio cache so new audio is fetched
      audioService.clearRuleCache();
      showSuccessToast(data.message || 'Audio uploaded successfully');
    },
    onError: (error: Error) => {
      showErrorToast(error.message || 'Failed to upload audio');
    },
  });
};

/**
 * Hook to delete audio for a notification rule
 */
export const useDeleteNotificationRuleAudio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDeleteNotificationRuleAudio(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: notificationRulesKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationRulesKeys.detail(id) });
      // Clear audio cache so default audio is used
      audioService.clearRuleCache();
      showSuccessToast(data.message || 'Audio deleted successfully');
    },
    onError: (error: Error) => {
      showErrorToast(error.message || 'Failed to delete audio');
    },
  });
};

export default {
  useNotificationRules,
  useNotificationRule,
  useEventTypes,
  useNotificationAnalytics,
  useCreateNotificationRule,
  useUpdateNotificationRule,
  useToggleNotificationRule,
  useResetNotificationRule,
  useTestNotificationRule,
  useDeleteNotificationRule,
  useUploadNotificationRuleAudio,
  useDeleteNotificationRuleAudio,
};
