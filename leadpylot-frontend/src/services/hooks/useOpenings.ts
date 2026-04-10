import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  apiCreateOpening,
  CreateOpeningRequest,
  CreateOpeningResponse,
  apiCreateOpeningFlexible,
  CreateOpeningFlexibleRequest,
  apiCreateOpeningWithoutFiles,
  CreateOpeningWithoutFilesRequest,
  apiUpdateOpening,
  UpdateOpeningRequest,
  UpdateOpeningResponse,
  apiGetOpenings,
  apiGetOpening,
  apiDeleteOpening,
  type GetOpeningsParams,
  type OpeningsResponse,
  type Opening,
  type DeleteOpeningResponse,
} from '../OpeningsService';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import React from 'react';

export const useCreateOpening = (options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  const successNotification = React.createElement(
    Notification,
    { title: 'Files uploaded', type: 'success' },
    'Files uploaded successfully'
  );

  const errorNotification = React.createElement(
    Notification,
    { title: 'Error', type: 'danger' },
    'Failed to upload files. Please try again.'
  );

  return useMutation<CreateOpeningResponse, unknown, CreateOpeningRequest>({
    mutationFn: (data: CreateOpeningRequest) => apiCreateOpening(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['openings'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });

      // Show success notification
      toast.push(successNotification);

      // Call custom success handler if provided
      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error) => {
      // Show error notification
      toast.push(errorNotification);

      // Call custom error handler if provided
      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};

/**
 * Hook for the flexible API that supports both documentType and documentTypes
 */
export const useCreateOpeningFlexible = (options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  const successNotification = React.createElement(
    Notification,
    { title: 'Files uploaded', type: 'success' },
    'Files uploaded successfully'
  );

  const errorNotification = React.createElement(
    Notification,
    { title: 'Error', type: 'danger' },
    'Failed to upload files. Please try again.'
  );

  return useMutation<CreateOpeningResponse, unknown, CreateOpeningFlexibleRequest>({
    mutationFn: (data: CreateOpeningFlexibleRequest) => apiCreateOpeningFlexible(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['openings'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });

      // Show success notification
      toast.push(successNotification);

      // Call custom success handler if provided
      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error) => {
      // Show error notification
      toast.push(errorNotification);

      // Call custom error handler if provided
      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};

/**
 * Hook for creating openings without files
 */
export const useCreateOpeningWithoutFiles = (options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  const errorNotification = React.createElement(
    Notification,
    { title: 'Error', type: 'danger' },
    'Failed to create opening. Please try again.'
  );

  return useMutation<CreateOpeningResponse, unknown, CreateOpeningWithoutFilesRequest>({
    mutationFn: (data: CreateOpeningWithoutFilesRequest) => apiCreateOpeningWithoutFiles(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['openings'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });

      // Call custom success handler if provided
      // Note: Success notification is handled by the calling component for better context
      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error) => {
      // Show error notification
      toast.push(errorNotification);

      // Call custom error handler if provided
      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};

export const useOpenings = (params?: GetOpeningsParams & { enabled?: boolean }) => {
  const { enabled = true, ...queryParams } = params || {};
  return useQuery<OpeningsResponse>({
    queryKey: ['openings', queryParams],
    queryFn: () => apiGetOpenings(queryParams),
    placeholderData: (previousData) => previousData,
    enabled,
  });
};

export const useOpening = (id: string) => {
  return useQuery<Opening>({
    queryKey: ['opening', id],
    queryFn: () => apiGetOpening(id),
    enabled: !!id,
  });
};

export const useUpdateOpening = (options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  const successNotification = React.createElement(
    Notification,
    { title: 'Files uploaded', type: 'success' },
    'Files uploaded successfully'
  );

  const errorNotification = React.createElement(
    Notification,
    { title: 'Error', type: 'danger' },
    'Failed to upload files. Please try again.'
  );

  return useMutation<UpdateOpeningResponse, unknown, { id: string; data: UpdateOpeningRequest }>({
    mutationFn: ({ id, data }: { id: string; data: UpdateOpeningRequest }) =>
      apiUpdateOpening(id, data),
    onSuccess: () => {
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['openings'] });
      // Also invalidate payment vouchers since they may contain opening data
      queryClient.invalidateQueries({ queryKey: ['payment-vouchers'] });

      // Show success notification
      toast.push(successNotification);

      // Call custom success handler if provided
      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error) => {
      // Show error notification
      toast.push(errorNotification);

      // Call custom error handler if provided
      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};

export const useDeleteOpening = (options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  const successNotification = React.createElement(
    Notification,
    { title: 'Opening Deactivated', type: 'success' },
    'Opening deactivated successfully'
  );

  const errorNotification = React.createElement(
    Notification,
    { title: 'Error', type: 'danger' },
    'Failed to deactivate opening. Please try again.'
  );

  return useMutation<DeleteOpeningResponse, unknown, string>({
    mutationFn: (id: string) => apiDeleteOpening(id),
    onSuccess: () => {
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['openings'] });

      // Show success notification
      toast.push(successNotification);

      // Call custom success handler if provided
      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error) => {
      // Show error notification
      toast.push(errorNotification);

      // Call custom error handler if provided
      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};
