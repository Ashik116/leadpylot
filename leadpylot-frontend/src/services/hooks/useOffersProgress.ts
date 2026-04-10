import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiOfferRevertImport,
  apiGetOffersProgress,
  apiGetOffersProgressGrouped,
  apiGetOpeningById,
  apiRevertBatch,
  type GetOffersProgressParams,
  type OffersProgressResponse,
  type AllOffersProgressResponse,
  type RevertBatchRequest,
  type OfferWithProgress,
} from '../OffersProgressService';
import {
  apiCreateOfferPayment,
  OfferFinancials,
  type CreateOfferPaymentRequest,
  getOfferFinancials,
  apiAddSplitAgent,
  apiDeleteSplitAgent,
  apiAddInboundAgent,
  apiDeleteInboundAgent,
  apiUpdateSplitInboundAgentPercentage,
  apiCreateAgentPayment,
  type AddSplitAgentRequest,
  type AddInboundAgentRequest,
  type UpdateAgentPercentageRequest,
  type CreateAgentPaymentRequest,
} from '../OffersService';
import useNotification from '@/utils/hooks/useNotification';

export const useOffersProgress = (params?: GetOffersProgressParams & { enabled?: boolean }) => {
  const { enabled = true, ...queryParams } = params || {};

  // 'all' now returns the same flat structure as other progress types
  return useQuery<OffersProgressResponse>({
    queryKey: ['offers-progress', queryParams],
    queryFn: () => apiGetOffersProgress(queryParams),
    placeholderData: (previousData) => previousData,
    enabled,
  });
};

// Hook for fetching a single opening by ID
export const useOpeningById = (openingId?: string, enabled: boolean = true) => {
  return useQuery<OfferWithProgress>({
    queryKey: ['opening', openingId],
    queryFn: ({ signal }) => {
      if (!openingId) {
        throw new Error('Opening ID is required');
      }
      return apiGetOpeningById(openingId, signal);
    },
    enabled: enabled && !!openingId,
    placeholderData: (previousData) => previousData,
  });
};

// Hook for fetching offer financials by offer ID
export const useOfferFinancials = (offerId?: string, enabled: boolean = true) => {
  return useQuery<OfferFinancials>({
    queryKey: ['offer-financials', offerId],
    queryFn: ({ signal }) => {
      if (!offerId) {
        throw new Error('Offer ID is required');
      }
      return getOfferFinancials(String(offerId), signal);
    },
    enabled: enabled && !!offerId,
    placeholderData: (previousData) => previousData,
  });
};

// Hook for fetching all progress types in a single API call (grouped response for multi-table view)
export const useOffersProgressAll = (params?: {
  opening_page?: number;
  opening_limit?: number;
  confirmation_page?: number;
  confirmation_limit?: number;
  payment_page?: number;
  payment_limit?: number;
  netto1_page?: number;
  netto1_limit?: number;
  netto2_page?: number;
  netto2_limit?: number;
  lost_page?: number;
  lost_limit?: number;
  enabled?: boolean;
}) => {
  const { enabled = true, ...queryParams } = params || {};

  return useQuery<AllOffersProgressResponse>({
    queryKey: ['offers-progress-all', queryParams],
    queryFn: ({ signal }) =>
      apiGetOffersProgressGrouped(
        queryParams,
        signal
      ),
    placeholderData: (previousData) => previousData,
    enabled,
    // Performance optimizations - use cached data when available to speed up initial load
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
    refetchOnMount: true, // Always refetch on mount to ensure fresh data on page load
    // Retry configuration - reduced retries for faster failure detection
    retry: 1, // Retry failed requests only once (faster failure)
    retryDelay: 1000, // Fixed 1s delay for retry (faster than exponential)
    // Network optimization
    networkMode: 'online', // Only run when online
    // Request cancellation - automatically cancels on unmount or query key change
    structuralSharing: true, // Enable structural sharing for better performance
  });
};

export const useOffersRevertImport = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ objectId, params }: { objectId: string; params?: any }) =>
      apiOfferRevertImport(objectId, params),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] }); // Invalidate multi-table query
      openNotification({
        type: 'success',
        massage: data?.message || 'Offer Import reverted successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to revert import',
      });
    },
  });
};

// Hook for batch revert (used for reverse drag-drop)
export const useRevertBatch = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ offerId, data }: { offerId: string; data: RevertBatchRequest }) =>
      apiRevertBatch(offerId, data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
      openNotification({
        type: 'success',
        massage: response?.message || 'Stages reverted successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || error?.message || 'Failed to revert stages',
      });
    },
  });
};

// Hook for creating offer payment
export const useCreateOfferPayment = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ offerId, data }: { offerId: string; data: CreateOfferPaymentRequest }) =>
      apiCreateOfferPayment(offerId, data),
    onSuccess: (response, variables) => {
      console.log('variables', variables);
      // Invalidate all relevant queries comprehensively
      // Invalidate by offerId
      queryClient.invalidateQueries({ queryKey: ['opening', variables.offerId] });
      queryClient.invalidateQueries({ queryKey: ['offer-financials', variables.offerId] });
      // Invalidate all opening queries to catch any ID mismatches
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'opening',
      });
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      openNotification({
        type: 'success',
        massage: response.message || 'Payment created successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || error?.message || 'Failed to create payment',
      });
    },
  });
};

// Hook for adding split agent
export const useAddSplitAgent = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ offerId, data }: { offerId: string; data: AddSplitAgentRequest }) =>
      apiAddSplitAgent(offerId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offer-financials', variables.offerId] });
      queryClient.invalidateQueries({ queryKey: ['opening', variables.offerId] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'opening',
      });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
      openNotification({
        type: 'success',
        massage: response?.message || 'Split agent added successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || error?.message || 'Failed to add split agent',
      });
    },
  });
};

// Hook for deleting split agent
export const useDeleteSplitAgent = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ offerId, agentId }: { offerId: string; agentId: string }) =>
      apiDeleteSplitAgent(offerId, agentId),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offer-financials', variables.offerId] });
      queryClient.invalidateQueries({ queryKey: ['opening', variables.offerId] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'opening',
      });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
      openNotification({
        type: 'success',
        massage: response?.message || 'Split agent deleted successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || error?.message || 'Failed to delete split agent',
      });
    },
  });
};

// Hook for adding inbound agent
export const useAddInboundAgent = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ offerId, data }: { offerId: string; data: AddInboundAgentRequest }) =>
      apiAddInboundAgent(offerId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offer-financials', variables.offerId] });
      queryClient.invalidateQueries({ queryKey: ['opening', variables.offerId] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'opening',
      });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
      openNotification({
        type: 'success',
        massage: response?.message || 'Inbound agent added successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || error?.message || 'Failed to add inbound agent',
      });
    },
  });
};

// Hook for deleting inbound agent
export const useDeleteInboundAgent = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ offerId, agentId }: { offerId: string; agentId: string }) =>
      apiDeleteInboundAgent(offerId, agentId),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offer-financials', variables.offerId] });
      queryClient.invalidateQueries({ queryKey: ['opening', variables.offerId] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'opening',
      });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
      openNotification({
        type: 'success',
        massage: response?.message || 'Inbound agent deleted successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || error?.message || 'Failed to delete inbound agent',
      });
    },
  });
};

// Hook for updating agent percentage
export const useUpdateAgentPercentage = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({
      offerId,
      agentType,
      agentId,
      data,
    }: {
      offerId: string;
      agentType: string;
      agentId: string;
      data: UpdateAgentPercentageRequest;
    }) => apiUpdateSplitInboundAgentPercentage(offerId, agentType, agentId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offer-financials', variables.offerId] });
      queryClient.invalidateQueries({ queryKey: ['opening', variables.offerId] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'opening',
      });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
      openNotification({
        type: 'success',
        massage: response?.message || 'Agent percentage updated successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || error?.message || 'Failed to update agent percentage',
      });
    },
  });
};

// Hook for creating agent payment (split or inbound)
export const useCreateAgentPayment = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ offerId, data }: { offerId: string; data: CreateAgentPaymentRequest }) =>
      apiCreateAgentPayment(offerId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offer-financials', variables.offerId] });
      queryClient.invalidateQueries({ queryKey: ['opening', variables.offerId] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'opening',
      });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
      openNotification({
        type: 'success',
        massage: response?.message || 'Agent payment recorded successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || error?.message || 'Failed to record agent payment',
      });
    },
  });
};
