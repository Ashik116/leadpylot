/* eslint-disable @typescript-eslint/no-unused-vars */
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useSession } from '@/hooks/useSession';
import {
  apiGetLead,
  apiGetLeads,
  apiUpdateLead,
  apiUpdateLeadStatus,
  UpdateLeadStatusRequest,
  apiDeleteLead,
  apiAssignLeads,
  apiBulkDeleteLeads,
  apiSubmitOffer,
  SubmitOfferRequest,
  apiGetProjectBanks,
  apiDeleteOffer,
  apiUpdateOffer,
  UpdateOfferRequest,
  apiRestoreOffer,
  apiCreateLeads,
  apiBulkUpdateLeads,
  apiBulkUpdateLeadStatus,
  BulkUpdateLeadStatusRequest,
  apiGetLeadIds,
  apiGetSources,
  GetAllLeadsResponse,
  apiImportLeads,
  ImportLeadsResponse,
  apiImportOffers,
  ImportOffersResponse,
  apiGetOffersImportHistory,
  OffersImportHistoryParams,
  OffersImportHistoryResponse,
  apiDownloadFailedImports,
  apiGetRecentImports,
  apiPermanentDeleteLead,
  apiSearchLeadsByPartnerIds,
  apiGetOffers,
  GetOffersParams,
  apiBulkDeleteOffers,
  apiCloseProjectWithRefresh,
  CloseProjectRequest,
  apiBulkDeleteOpenings,
  apiBulkDeleteConfirmations,
  apiBulkDeletePaymentVouchers,
  apiBulkDelete,
  apiAssignLeadsTransform,
  apiGetGroupDetails,
  apiGetLeadsWithDomain,
  GroupLeadsResponse,
  apiRevertImport,
  apiAssignTodo,
  apiGetAssignedTodos,
  apiGetExtraTodos,
  AssignTodoRequest,
  apiGetColumnPreferenceByUser,
  apiSaveColumnPreference,
  apiSaveColumnPreferenceDefault,
  ColumnPreferencePayload,
  ColumnPreferenceResponse,
  apiCompleteCurrentTopLead,
  CompleteCurrentTopLeadRequest,
  CompleteCurrentTopLeadResponse,
  apiUpdateSecondaryEmail,
  UpdateSecondaryEmailRequest,
  apiMakePrimaryEmail,
  MakePrimaryEmailRequest,
  apiGetClosedLeads,
  GetClosedLeadsParams,
  GetClosedLeadsResponse,
  apiGetClosedProjects,
  GetClosedProjectsResponse,
  apiAssignClosedLeads,
  AssignClosedLeadsRequest,
  AssignClosedLeadsResponse,
  apiRevertClosedLeads,
  RevertClosedLeadsResponse,
  apiRevertClosedProjectLeads,
  RevertClosedProjectLeadsResponse,
  // NEW: Universal grouping & filtering APIs
  apiGetMetadataOptions,
  apiGetGroupedSummary,
  apiIncreaseOfferCalls,
  apiDecreaseOfferCalls,
} from '../LeadsService';
import {
  MetadataOptionsResponse,
  GroupedSummaryResponse,
  GroupDetailsResponse,
  DomainFilter,
} from '@/stores/universalGroupingFilterStore';
import type {
  Lead,
  AssignLeadsRequest,
  ProjectBanksResponse,
  GetSourcesResponse,
  GetAllRecentImport,
  AssignLeadsRequestTransform,
} from '../LeadsService';
import useNotification from '../../utils/hooks/useNotification';
import { useSelectedItemsStore } from '../../stores/selectedItemsStore';
import { useStages } from './useStages';
import { useMemo } from 'react';
import {
  invalidateLeadQueries,
  invalidateGroupedLeadQueries,
  invalidateDynamicFilters,
} from '../../utils/queryInvalidation';
import { useGeneratedPdfStore } from '@/stores/generatedPdfStore';

export interface UseLeadsParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  use_status?: string;
  project_id?: string;
}

export const useLeads = <T = GetAllLeadsResponse>(
  params?: UseLeadsParams,
  options?: { enabled?: boolean; keepPreviousData?: boolean }
) => {
  const shouldKeepPrevious = options?.keepPreviousData !== false;
  return useQuery<T, Error>({
    queryKey: ['leads', params],
    queryFn: () => apiGetLeads(params) as Promise<T>,
    placeholderData: shouldKeepPrevious ? keepPreviousData : undefined,
    enabled: options?.enabled !== false, // Default to true, but allow disabling
    // Leads data changes frequently, but don't need constant refetching
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
export const useRecentImport = <T = GetAllRecentImport>(params?: any) => {
  return useQuery<T, Error>({
    queryKey: ['recent-imports', params],
    queryFn: () => apiGetRecentImports(params) as Promise<T>,
    placeholderData: (previousData) => previousData,
  });
};
export const useLeadIds = () => {
  return useQuery({
    queryKey: ['leads', 'ids'],
    queryFn: () => apiGetLeadIds(),
    placeholderData: (previousData) => previousData,
  });
};

export const useLead = (id: string) => {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => apiGetLead(id),
    // Individual lead data changes frequently when being edited
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: (failureCount, error: any) => {
      // Don't retry on client errors (4xx)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      // Don't retry on access denied or authentication errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Don't retry on not found errors
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry up to 1 time for server errors (5xx) and network issues
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
// 🧠 Custom hook that only fetches when enabled
export const useLeadConditional = (leadId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => apiGetLead(leadId),
    enabled: enabled, // Only fetch when this is true
    // Cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
// new lead create
// 🧠 Change mutation to support array of Partial<Lead>
export const useCreateLeads = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Lead>[]) => apiCreateLeads(data),
    onSuccess: () => {
      // Use smart invalidation to update all relevant queries
      invalidateLeadQueries(queryClient);
      // Add specific grouped leads invalidation (includes grouped-summary)
      invalidateGroupedLeadQueries(queryClient);
      // Add specific dynamic filter invalidation
      invalidateDynamicFilters(queryClient);
    },
  });
};

export const useUpdateLead = (id: string) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  return useMutation({
    mutationFn: (data: Partial<Lead>) => apiUpdateLead(id, data),
    onSuccess: async (data: any) => {
      // Use comprehensive invalidation that includes grouped leads queries
      invalidateLeadQueries(queryClient);
      // Add specific grouped leads invalidation (includes grouped-summary)
      invalidateGroupedLeadQueries(queryClient);
      // Also invalidate individual lead and activities
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });

      // CRITICAL: Refetch dynamic filters POST request if active (same as delete does)
      // This ensures UI updates immediately when data comes from POST /dynamic-filters/apply
      const { useDynamicFiltersStore } = await import('@/stores/dynamicFiltersStore');
      const dynamicFiltersStore = useDynamicFiltersStore.getState();
      if (dynamicFiltersStore.isDynamicFilterMode && dynamicFiltersStore.refetchDynamicFilters) {
        await dynamicFiltersStore.refetchDynamicFilters(
          dynamicFiltersStore.page,
          dynamicFiltersStore.pageSize
        );
      }

      openNotification({
        type: 'success',
        massage: data?.data?.message || data?.message || 'Lead updated successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to update lead',
      });
    },
  });
};

export const useUpdateLeadStatus = ({
  id,
  invalidLeads,
  invalidLead,
  invalidActivities,
}: {
  id: string;
  invalidLeads?: boolean;
  invalidLead?: boolean;
  invalidActivities?: boolean;
}) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (data: UpdateLeadStatusRequest) => apiUpdateLeadStatus(id, data),
    onSuccess: async (data) => {
      if (invalidLead) {
        queryClient.invalidateQueries({ queryKey: ['lead', id] });
      }
      if (invalidActivities) {
        queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      }
      if (invalidLeads) {
        // Use comprehensive invalidation that includes grouped leads queries
        invalidateLeadQueries(queryClient);
        // Also invalidate specific queries
        queryClient.invalidateQueries({ queryKey: ['current-top-lead'] });
        queryClient.invalidateQueries({ queryKey: ['lead', id] });
      } else {
        // Even if invalidLeads is false, we should still invalidate grouped queries
        // because status changes can affect grouping (e.g., status-based grouping)
        invalidateGroupedLeadQueries(queryClient);
      }

      // CRITICAL: Refetch dynamic filters POST request if active (same as delete does)
      // This ensures UI updates immediately when data comes from POST /dynamic-filters/apply
      const { useDynamicFiltersStore } = await import('@/stores/dynamicFiltersStore');
      const dynamicFiltersStore = useDynamicFiltersStore.getState();
      if (dynamicFiltersStore.isDynamicFilterMode && dynamicFiltersStore.refetchDynamicFilters) {
        await dynamicFiltersStore.refetchDynamicFilters(
          dynamicFiltersStore.page,
          dynamicFiltersStore.pageSize
        );
      }

      openNotification({
        type: 'success',
        massage: 'Lead status updated successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to update lead status',
      });
    },
  });
};

export const useUpdateOfferCalls = (leadId: string) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  // Helper function to update offer_calls in query cache
  const updateOfferCallsInCache = (delta: number) => {
    // Update individual lead query
    queryClient.setQueryData(['lead', leadId], (old: any) => {
      if (!old) return old;
      const currentCalls = old?.offer_calls || old?.data?.offer_calls || 0;
      return {
        ...old,
        offer_calls: Math.max(0, currentCalls + delta),
        data: old.data
          ? {
              ...old.data,
              offer_calls: Math.max(0, currentCalls + delta),
            }
          : undefined,
      };
    });

    // Update leads list queries
    queryClient.setQueriesData({ queryKey: ['leads'] }, (old: any) => {
      if (!old || !old.data) return old;
      return {
        ...old,
        data: old.data.map((lead: any) => {
          if (lead._id === leadId || lead.leadId === leadId) {
            const currentCalls = lead.offer_calls || 0;
            return {
              ...lead,
              offer_calls: Math.max(0, currentCalls + delta),
            };
          }
          return lead;
        }),
      };
    });

    // Update grouped leads queries
    queryClient.setQueriesData({ queryKey: ['grouped-leads'] }, (old: any) => {
      if (!old || !old.data) return old;
      // Recursively update offer_calls in grouped data structure
      const updateGroupedData = (groups: any[]): any[] => {
        return groups.map((group: any) => {
          if (group.leads) {
            return {
              ...group,
              leads: group.leads.map((lead: any) => {
                if (lead._id === leadId || lead.leadId === leadId) {
                  const currentCalls = lead.offer_calls || 0;
                  return {
                    ...lead,
                    offer_calls: Math.max(0, currentCalls + delta),
                  };
                }
                return lead;
              }),
            };
          }
          if (group.subGroups) {
            return {
              ...group,
              subGroups: updateGroupedData(group.subGroups),
            };
          }
          return group;
        });
      };
      return {
        ...old,
        data: updateGroupedData(old.data),
      };
    });
  };

  const increaseMutation = useMutation({
    mutationFn: () => apiIncreaseOfferCalls(leadId),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['lead', leadId] });
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      await queryClient.cancelQueries({ queryKey: ['offers'] });
      // Snapshot previous values
      const previousLead = queryClient.getQueryData(['lead', leadId]);
      const previousLeads = queryClient.getQueriesData({ queryKey: ['leads'] });
      const previousGroupedLeads = queryClient.getQueriesData({ queryKey: ['grouped-leads'] });
      const previousOffers = queryClient.getQueriesData({ queryKey: ['offers'] });
      // Optimistically update the cache
      updateOfferCallsInCache(1);

      return { previousLead, previousLeads, previousGroupedLeads, previousOffers };
    },
    onSuccess: () => {
      // Invalidate queries to sync with server
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      invalidateLeadQueries(queryClient);
      invalidateGroupedLeadQueries(queryClient);
      // Refresh updates/activities section to show follow-up activity in real-time
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update
      if (context?.previousLead) {
        queryClient.setQueryData(['lead', leadId], context.previousLead);
      }
      if (context?.previousLeads) {
        context.previousLeads.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousGroupedLeads) {
        context.previousGroupedLeads.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to increase offer calls',
      });
    },
  });

  const decreaseMutation = useMutation({
    mutationFn: () => apiDecreaseOfferCalls(leadId),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['lead', leadId] });
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      await queryClient.cancelQueries({ queryKey: ['grouped-leads'] });
      await queryClient.cancelQueries({ queryKey: ['offers'] });

      // Snapshot previous values
      const previousLead = queryClient.getQueryData(['lead', leadId]);
      const previousLeads = queryClient.getQueriesData({ queryKey: ['leads'] });
      const previousGroupedLeads = queryClient.getQueriesData({ queryKey: ['grouped-leads'] });
      const previousOffers = queryClient.getQueriesData({ queryKey: ['offers'] });
      // Optimistically update the cache
      updateOfferCallsInCache(-1);

      return { previousLead, previousLeads, previousGroupedLeads, previousOffers };
    },
    onSuccess: () => {
      // Invalidate queries to sync with server
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      invalidateLeadQueries(queryClient);
      invalidateGroupedLeadQueries(queryClient);
      // Refresh updates/activities section to show activity in real-time
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update
      if (context?.previousLead) {
        queryClient.setQueryData(['lead', leadId], context.previousLead);
      }
      if (context?.previousLeads) {
        context.previousLeads.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousGroupedLeads) {
        context.previousGroupedLeads.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousOffers) {
        context.previousOffers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to decrease offer calls',
      });
    },
  });

  return {
    increaseOfferCalls: increaseMutation.mutate,
    decreaseOfferCalls: decreaseMutation.mutate,
    isIncreasing: increaseMutation.isPending,
    isDecreasing: decreaseMutation.isPending,
    isPending: increaseMutation.isPending || decreaseMutation.isPending,
  };
};

export const useDeleteLead = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiDeleteLead(id),
    onSuccess: () => {
      // Use smart invalidation to update all relevant queries
      invalidateLeadQueries(queryClient);
      // Add specific grouped leads invalidation (includes grouped-summary)
      invalidateGroupedLeadQueries(queryClient);
      // Add specific dynamic filter invalidation
      invalidateDynamicFilters(queryClient);
    },
  });
};

export const useAssignLeads = ({ queryKey }: { queryKey: string[] }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignLeadsRequest) => apiAssignLeads(data),
    onSuccess: () => {
      // Use smart invalidation to update all relevant queries
      invalidateLeadQueries(queryClient);
      // Add specific grouped leads invalidation for when grouping is active
      invalidateGroupedLeadQueries(queryClient);
      // Add specific dynamic filter invalidation
      invalidateDynamicFilters(queryClient);
      // Also invalidate the specific query key passed by the caller
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
  });
};
export const useAssignLeadsTransform = (options?: { queryKey?: string[] }) => {
  const queryClient = useQueryClient();
  const queryKey = options?.queryKey || ['leads'];

  return useMutation({
    mutationFn: (data: AssignLeadsRequestTransform) => apiAssignLeadsTransform(data),
    onSuccess: () => {
      // Use smart invalidation to update all relevant queries
      invalidateLeadQueries(queryClient);
      // Add specific grouped leads invalidation for when grouping is active
      invalidateGroupedLeadQueries(queryClient);
      // Add specific dynamic filter invalidation
      invalidateDynamicFilters(queryClient);
      // Also invalidate the specific query key
      queryClient.invalidateQueries({ queryKey });
    },
  });
};

export const useBulkDeleteLeads = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const { clearSelectedItems } = useSelectedItemsStore();

  return useMutation({
    mutationFn: (ids: string[]) => apiBulkDeleteLeads(ids),
    onSuccess: (data: any) => {
      // Use both smart invalidation and specific grouped invalidation
      invalidateLeadQueries(queryClient);
      invalidateGroupedLeadQueries(queryClient);
      // Add specific dynamic filter invalidation
      invalidateDynamicFilters(queryClient);

      // Clear selected items store after successful deletion
      clearSelectedItems();

      openNotification({ type: 'success', massage: data?.message || 'Leads deleted successfully' });
    },
    onError: (error: any) =>
      openNotification({ type: 'danger', massage: error?.message || 'Failed to delete leads' }),
  });
};
export const useBulkUpdateLeads = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (data: { ids: string[]; updateData: any }) => apiBulkUpdateLeads(data),
    onSuccess: (data: any) => {
      // Use both smart invalidation and specific grouped invalidation
      invalidateLeadQueries(queryClient);
      invalidateGroupedLeadQueries(queryClient);
      // Add specific dynamic filter invalidation
      invalidateDynamicFilters(queryClient);

      openNotification({ type: 'success', massage: data?.message || 'Leads updated successfully' });
    },
    onError: (error: any) =>
      openNotification({ type: 'danger', massage: error?.message || 'Failed to update leads' }),
  });
};

export const useBulkUpdateLeadStatus = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (data: BulkUpdateLeadStatusRequest) => apiBulkUpdateLeadStatus(data),
    onSuccess: (data: any) => {
      // Use smart invalidation to update all relevant queries
      invalidateLeadQueries(queryClient);
      // Add specific grouped leads invalidation for when grouping is active
      invalidateGroupedLeadQueries(queryClient);
      // Add specific dynamic filter invalidation
      invalidateDynamicFilters(queryClient);

      openNotification({
        type: 'success',
        massage: data?.data?.message || data?.message || 'Lead status updated successfully',
      });
    },
    onError: (error: any) =>
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to update lead status',
      }),
  });
};

export const useRestoreLeads = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (leadIds: string[]) =>
      apiBulkUpdateLeads({
        ids: leadIds,
        updateData: {
          active: true,
        },
      }),
    onSuccess: (data: any) => {
      // Use smart invalidation to update all relevant queries
      invalidateLeadQueries(queryClient);
      // Add specific dynamic filter invalidation
      invalidateDynamicFilters(queryClient);
      invalidateGroupedLeadQueries(queryClient);

      openNotification({
        type: 'success',
        massage: data?.message || 'Leads restored successfully',
      });
    },
    onError: (error: any) =>
      openNotification({
        type: 'danger',
        massage: error?.message || error?.response?.data?.error || 'Failed to restore leads',
      }),
  });
};

export const useSubmitOffer = (options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const { openModal } = useGeneratedPdfStore();
  return useMutation({
    mutationFn: (data: SubmitOfferRequest) => apiSubmitOffer(data),
    onSuccess: (data: any) => {
      if (data?.autoPdfGeneration?.autoGenerated) {
        openModal(data?.autoPdfGeneration?.generatedPdf);
      }
      // Invalidate both the leads list and the specific lead detail
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['current-top-lead'] });
      invalidateLeadQueries(queryClient);
      invalidateDynamicFilters(queryClient);
      invalidateGroupedLeadQueries(queryClient);

      openNotification({
        type: 'success',
        massage: data?.message || 'Offer submitted successfully',
      });

      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || error?.response?.data?.error || 'Failed to submit offer',
      });

      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};

export const useDeleteOffer = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (id: string) => apiDeleteOffer(id),
    onSuccess: (data) => {
      // Invalidate both the leads list and the specific lead detail
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      openNotification({ type: 'success', massage: data?.message || 'Offer deleted successfully' });
    },
    onError: (error: any) =>
      openNotification({ type: 'danger', massage: error?.message || 'Failed to delete offer' }),
  });
};
export const useGetProjectBanks = (id: string) => {
  return useQuery<ProjectBanksResponse>({
    queryKey: ['project-banks', id],
    queryFn: () => apiGetProjectBanks(id),
  });
};

export const useUpdateOffer = (options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOfferRequest }) =>
      apiUpdateOffer(id, data),
    onSuccess: (data, variables) => {
      // Invalidate both the leads list and the specific lead detail
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      // Also invalidate offers query for offers dashboard
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      // Also invalidate offers query for offers dashboard
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      // Also invalidate openings query for openings dashboard
      queryClient.invalidateQueries({ queryKey: ['openings'] });
      // Invalidate specific opening/offer detail query (used by useOpeningById)
      queryClient.invalidateQueries({ queryKey: ['opening', variables.id] });
      // Also invalidate payment vouchers since they may contain offer data
      queryClient.invalidateQueries({ queryKey: ['payment-vouchers'] });
      openNotification({ type: 'success', massage: data?.message || 'Offer updated successfully' });

      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error: any) => {
      openNotification({ type: 'danger', massage: error?.message || 'Failed to update offer' });

      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};

export const useRestoreOffer = (options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (id: string) => apiRestoreOffer(id),
    onSuccess: (data) => {
      // Invalidate both the leads list and the specific lead detail

      queryClient.invalidateQueries({ queryKey: ['lead'] });

      openNotification({
        type: 'success',
        massage: data?.message || 'Offer restored successfully',
      });

      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || error?.message || 'Failed to restore offer',
      });

      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};

export const useUpdateSecondaryEmail = (leadId: string) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (data: UpdateSecondaryEmailRequest) => apiUpdateSecondaryEmail(leadId, data),
    onSuccess: async (data: any) => {
      // Use comprehensive invalidation that includes grouped leads queries
      invalidateLeadQueries(queryClient);
      // Also invalidate individual lead and activities
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });

      // CRITICAL: Refetch dynamic filters POST request if active (same as delete does)
      const { useDynamicFiltersStore } = await import('@/stores/dynamicFiltersStore');
      const dynamicFiltersStore = useDynamicFiltersStore.getState();
      if (dynamicFiltersStore.isDynamicFilterMode && dynamicFiltersStore.refetchDynamicFilters) {
        await dynamicFiltersStore.refetchDynamicFilters(
          dynamicFiltersStore.page,
          dynamicFiltersStore.pageSize
        );
      }

      openNotification({
        type: 'success',
        massage: data?.data?.message || data?.message || 'Secondary email updated successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to update secondary email',
      });
    },
  });
};

export const useMakePrimaryEmail = (leadId: string) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (data: MakePrimaryEmailRequest) => apiMakePrimaryEmail(leadId, data),
    onSuccess: async (data: any) => {
      // Use comprehensive invalidation that includes grouped leads queries
      invalidateLeadQueries(queryClient);
      // Also invalidate individual lead and activities
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });

      // CRITICAL: Refetch dynamic filters POST request if active (same as delete does)
      const { useDynamicFiltersStore } = await import('@/stores/dynamicFiltersStore');
      const dynamicFiltersStore = useDynamicFiltersStore.getState();
      if (dynamicFiltersStore.isDynamicFilterMode && dynamicFiltersStore.refetchDynamicFilters) {
        await dynamicFiltersStore.refetchDynamicFilters(
          dynamicFiltersStore.page,
          dynamicFiltersStore.pageSize
        );
      }

      openNotification({
        type: 'success',
        massage: data?.data?.message || data?.message || 'Primary email updated successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to update primary email',
      });
    },
  });
};

/**
 * Hook to fetch lead sources
 */
export const useSources = () => {
  const { data: session } = useSession();
  const isAgent = session?.user?.role === 'Agent';

  return useQuery<GetSourcesResponse>({
    queryKey: ['sources'],
    queryFn: () => apiGetSources(),
    enabled: !isAgent, // Disable the query when user is an Agent
    // Return empty data for agents
    placeholderData: isAgent
      ? ({
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 20,
            pages: 0,
          },
        } as GetSourcesResponse)
      : undefined,
  });
};

// Hook to import leads from Excel/CSV file
export const useImportLeads = (options?: {
  onSuccess?: (data: ImportLeadsResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({
      file,
      sourceId,
      lead_price,
    }: {
      file: Blob;
      sourceId?: string;
      lead_price?: number;
    }) => apiImportLeads(file, sourceId, lead_price),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      // Add specific dynamic filter invalidation
      invalidateDynamicFilters(queryClient);

      if (options?.onSuccess) {
        options.onSuccess(data as any);
      } else {
        openNotification({
          type: 'success',
          massage:
            data?.message ||
            `Successfully imported ${data.successCount} leads. ${data.failureCount > 0 ? `${data.failureCount} leads failed.` : ''}`,
        });
      }
    },
    onError: (error: any) => {
      if (options?.onError) {
        options.onError(error);
      } else {
        openNotification({
          type: 'danger',
          massage: error?.message || 'Failed to import leads. Please try again.',
        });
      }
    },
  });
};

// Hook to import offers from Excel/CSV file
export const useImportOffers = (options?: {
  onSuccess?: (data: ImportOffersResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ file }: { file: Blob }) => apiImportOffers(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });

      if (options?.onSuccess) {
        options.onSuccess(data);
      } else {
        openNotification({
          type: 'success',
          massage:
            data?.message ||
            `Successfully imported ${data.data.successCount} offers. ${data.data.failureCount > 0 ? `${data.data.failureCount} offers failed.` : ''}`,
        });
      }
    },
    onError: (error: any) => {
      if (options?.onError) {
        options.onError(error);
      } else {
        openNotification({
          type: 'danger',
          massage: error?.message || 'Failed to import offers. Please try again.',
        });
      }
    },
  });
};

// Hook to download failed imports
export const useDownloadFailedImports = () => {
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({
      downloadUrl,
      customFilename,
    }: {
      downloadUrl: string;
      customFilename?: string;
    }) => apiDownloadFailedImports(downloadUrl, customFilename),
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to download file. Please try again.',
      });
    },
  });
};

//permanent lead delete

export const usePermanentDeleteLead = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  const { clearSelectedItems } = useSelectedItemsStore();

  return useMutation({
    mutationFn: (ids: string[]) => apiPermanentDeleteLead(ids),
    onSuccess: (data: any, ids: string[]) => {
      // Refresh lead collections after deletion, but avoid refetching the deleted lead detail page.
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['current-top-lead'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      invalidateGroupedLeadQueries(queryClient);
      // Add specific dynamic filter invalidation
      invalidateDynamicFilters(queryClient);

      ids.forEach((id) => {
        queryClient.cancelQueries({ queryKey: ['lead', id], exact: true });
      });

      // Clear selected items store after successful deletion
      clearSelectedItems();

      openNotification({
        type: 'success',
        massage: data.message || 'Leads permanently deleted successfully',
      });
    },
    onError: () =>
      openNotification({ type: 'danger', massage: 'Failed to permanently delete leads' }),
  });
};

export const useSearchLeadsByPartnerIds = () => {
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (partnerIds: string[]) => apiSearchLeadsByPartnerIds(partnerIds),
    onError: (data) =>
      openNotification({ type: 'danger', massage: data.message || 'Failed to search leads' }),
  });
};

// Hook for bulk search without notifications (for internal use)
export const useBulkSearchLeads = () => {
  return useMutation({
    mutationFn: (partnerIds: string[]) => apiSearchLeadsByPartnerIds(partnerIds),
  });
};

export const useBulkDeleteOffers = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (ids: string[]) => apiBulkDeleteOffers(ids),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      openNotification({
        type: 'success',
        massage: data?.message || 'Offers deleted successfully',
      });
    },
    onError: (error: any) =>
      openNotification({ type: 'danger', massage: error?.message || 'Failed to delete offers' }),
  });
};
export const useBulkDeleteOpenings = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (ids: string[]) => apiBulkDeleteOpenings(ids),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['openings'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      openNotification({
        type: 'success',
        massage: data?.message || 'Openings deleted successfully',
      });
    },
    onError: (error: any) =>
      openNotification({ type: 'danger', massage: error?.message || 'Failed to delete openings' }),
  });
};
export const useBulkDeleteConfirmations = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (ids: string[]) => apiBulkDeleteConfirmations(ids),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      openNotification({
        type: 'success',
        massage: data?.message || 'Confirmations deleted successfully',
      });
    },
    onError: (error: any) =>
      openNotification({ type: 'danger', massage: error?.message || 'Failed to delete openings' }),
  });
};

export const useBulkDeletePaymentVouchers = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (ids: string[]) => apiBulkDeletePaymentVouchers(ids),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['payment-vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      openNotification({
        type: 'success',
        massage: data?.message || 'Payment vouchers deleted successfully',
      });
    },
    onError: (error: any) =>
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to delete payment vouchers',
      }),
  });
};

// Hook for fetching offers
export const useOffers = (params?: GetOffersParams & { enabled?: boolean }) => {
  const { enabled = true, ...queryParams } = params || {};
  return useQuery({
    queryKey: ['offers', queryParams],
    queryFn: () => apiGetOffers(queryParams),
    enabled,
  });
};

// Hook for fetching closed leads
export const useClosedLeads = (
  params?: GetClosedLeadsParams,
  options?: { enabled?: boolean; keepPreviousData?: boolean }
) => {
  const shouldKeepPrevious = options?.keepPreviousData !== false;
  return useQuery<GetClosedLeadsResponse, Error>({
    queryKey: ['closed-leads', params],
    queryFn: () => apiGetClosedLeads(params),
    placeholderData: shouldKeepPrevious ? keepPreviousData : undefined,
    enabled: options?.enabled !== false,
  });
};

// Hook for fetching closed projects
export const useClosedProjects = (options?: { enabled?: boolean }) => {
  return useQuery<GetClosedProjectsResponse, Error>({
    queryKey: ['closed-projects'],
    queryFn: () => apiGetClosedProjects(),
    placeholderData: (previousData) => previousData,
    enabled: options?.enabled !== false,
  });
};

export const useCloseProjectWithRefresh = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CloseProjectRequest }) =>
      apiCloseProjectWithRefresh(projectId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Add specific grouped leads invalidation for when grouping is active
      invalidateGroupedLeadQueries(queryClient);
      // Add specific dynamic filter invalidation
      invalidateDynamicFilters(queryClient);

      openNotification({
        type: 'success',
        massage: data?.message || 'Project closed successfully',
      });
    },
    onError: (error: any) =>
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to close project',
      }),
  });
};

// Hook for assigning closed leads
export const useAssignClosedLeads = (options?: { queryKey?: string[] }) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (data: AssignClosedLeadsRequest) => apiAssignClosedLeads(data),
    onSuccess: () => {
      // Invalidate closed leads queries
      queryClient.invalidateQueries({ queryKey: ['closed-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Add specific grouped leads invalidation for when grouping is active
      invalidateGroupedLeadQueries(queryClient);
      // Invalidate specific query key if provided
      if (options?.queryKey) {
        queryClient.invalidateQueries({ queryKey: options.queryKey });
      }
    },
    onError: (error: any) =>
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to assign closed leads',
      }),
  });
};

// Hook for reverting multiple closed leads
export const useRevertClosedLeads = (options?: { queryKey?: string[] }) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (closedLeadIds: string[]) => apiRevertClosedLeads(closedLeadIds),
    onSuccess: (data) => {
      // Invalidate closed leads and projects queries
      queryClient.invalidateQueries({ queryKey: ['closed-leads'] });
      queryClient.invalidateQueries({ queryKey: ['closed-projects'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Add specific grouped leads invalidation for when grouping is active
      invalidateGroupedLeadQueries(queryClient);
      // Invalidate specific query key if provided
      if (options?.queryKey) {
        queryClient.invalidateQueries({ queryKey: options.queryKey });
      }

      // Show appropriate notification based on results
      const notificationType = data.success ? 'success' : 'warning';
      openNotification({
        type: notificationType,
        massage: data?.message || 'Closed leads revert operation completed',
      });

      // If there were failures, show additional details
      if (data.failed_count > 0 && data.errors && data.errors.length > 0) {
        const errorMessages = data.errors.map((e) => e.error).join(', ');
        openNotification({
          type: 'danger',
          massage: `Some leads failed to revert: ${errorMessages}`,
        });
      }
    },
    onError: (error: any) =>
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to revert closed leads',
      }),
  });
};

// Hook for reverting closed project leads (all leads for a project)
export const useRevertClosedProjectLeads = (options?: { queryKey?: string[] }) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (projectId: string) => apiRevertClosedProjectLeads(projectId),
    onSuccess: (data) => {
      // Invalidate closed leads and projects queries
      queryClient.invalidateQueries({ queryKey: ['closed-leads'] });
      queryClient.invalidateQueries({ queryKey: ['closed-projects'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Add specific grouped leads invalidation for when grouping is active
      invalidateGroupedLeadQueries(queryClient);
      // Invalidate specific query key if provided
      if (options?.queryKey) {
        queryClient.invalidateQueries({ queryKey: options.queryKey });
      }

      openNotification({
        type: 'success',
        massage: data?.message || 'Closed project leads reverted successfully',
      });
    },
    onError: (error: any) =>
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to revert closed project leads',
      }),
  });
};

// Domain-based filter hooks (replace removed /dynamic-filters/apply API)
export const useApplyDomainFilters = () => {
  return useMutation({
    mutationFn: (params: {
      filters: Array<{ field: string; operator: string; value: any }>;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
    }) => apiGetLeadsWithDomain(params),
  });
};

export const useGetAllDomainFilterResults = () => {
  return useMutation({
    mutationFn: (params: {
      filters: Array<{ field: string; operator: string; value: any }>;
      sortBy?: string;
      sortOrder?: string;
    }) =>
      apiGetLeadsWithDomain({
        ...params,
        page: 1,
        limit: 999999,
      }),
  });
};

// Hook for fetching offers import history
export const useOffersImportHistory = (
  params?: OffersImportHistoryParams & { enabled?: boolean }
) => {
  const { enabled = true, ...queryParams } = params || {};
  return useQuery({
    queryKey: ['offers-import-history', queryParams],
    queryFn: () => apiGetOffersImportHistory(queryParams),
    enabled,
  });
};

// DEPRECATED: This hook is no longer used
// Replaced by useMetadataOptions(entityType) which provides groupOptions via /api/metadata/options/{entityType}
// Commented out to prevent API calls - kept for reference only
// export const useGroupOptions = () => {
//   return useQuery<GroupOptionsResponse>({
//     queryKey: ['group-options'],
//     queryFn: apiGetGroupOptions,
//     staleTime: 10 * 60 * 1000, // 10 minutes
//   });
// };

/**
 * Fetch group details using domain-based API.
 * Replaces useGroupLeads which used old /leads/group/multilevel/.../details/... endpoint.
 */
export const useGroupDetailsByDomain = (params: {
  entityType: string;
  fields: string[];
  path: string[];
  apiFilters?: Array<{ field: string; operator: string; value: any }>;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  enabled?: boolean;
}) => {
  const {
    entityType,
    fields,
    path,
    apiFilters,
    page = 1,
    limit = 50,
    sortBy,
    sortOrder,
    enabled = true,
  } = params;

  const shouldEnable =
    enabled && fields.length > 0 && path.length > 0 && fields.length === path.length;

  return useQuery<GroupLeadsResponse>({
    queryKey: ['group-details-by-domain', entityType, fields, path, apiFilters, page, limit, sortBy, sortOrder],
    queryFn: () =>
      apiGetGroupDetails({
        entityType,
        fields,
        path,
        apiFilters,
        page,
        limit,
        sortBy,
        sortOrder,
      }),
    enabled: shouldEnable,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUniqueStatusCodes = () => {
  const { data: stagesData, isLoading, error } = useStages();

  const uniqueStatusCodes = useMemo(() => {
    if (!stagesData?.data) return [];

    const allStatusCodes = new Set<string>();

    stagesData.data.forEach((stage) => {
      if (stage.type === 'stage' && stage.info?.statuses) {
        stage.info.statuses.forEach((status) => {
          if (status.name) {
            allStatusCodes.add(status.name);
          }
        });
      }
    });

    return Array.from(allStatusCodes).sort();
  }, [stagesData]);

  return {
    statusCodes: uniqueStatusCodes,
    isLoading,
    error,
  };
};

export const useRevertImport = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ objectId, reason }: { objectId: string; reason: string }) =>
      apiRevertImport(objectId, reason),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['recent-imports'] });
      // Add specific dynamic filter invalidation
      invalidateDynamicFilters(queryClient);

      openNotification({
        type: 'success',
        massage: data?.message || 'Import reverted successfully',
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

export const useAssignTodo = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ todoId, data }: { todoId: string; data: AssignTodoRequest }) =>
      apiAssignTodo(todoId, data),
    onSuccess: (data: any) => {
      // Minimal, targeted invalidations to avoid heavy refresh in grouped mode
      // 1) Invalidate only leads queries that include has_todo filter
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          const key1 = query.queryKey[1] as Record<string, unknown> | undefined | null;
          const hasTodoParam =
            key1 !== undefined &&
            key1 !== null &&
            typeof key1 === 'object' &&
            (key1 as any).has_todo === true;
          return key0 === 'leads' && hasTodoParam;
        },
      });

      // 2) Invalidate grouped leads queries (no removal, no explicit refetch)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          return key0 === 'grouped-leads' || key0 === 'group-leads';
        },
      });

      // 3) Invalidate todo-specific lists used by the Todo dashboard
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-todos'] });
      queryClient.invalidateQueries({ queryKey: ['extra-todos'] });

      // 4) Invalidate current user query to update totalPendingTodo count
      queryClient.invalidateQueries({ queryKey: ['current-user'] });

      openNotification({
        type: 'success',
        massage: data?.message || 'Todo assigned successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to assign todo',
      });
    },
  });
};

// Hook for fetching assigned todos
export const useAssignedTodos = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: ['assigned-todos', params],
    queryFn: () => apiGetAssignedTodos(params),
    placeholderData: (previousData) => previousData,
  });
};

// Hook for fetching extra todos (For Me)
export const useExtraTodos = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: ['extra-todos', params],
    queryFn: () => apiGetExtraTodos(params),
    placeholderData: (previousData) => previousData,
  });
};

// Column preference hooks
export const useColumnPreference = () => {
  return useQuery<ColumnPreferenceResponse>({
    queryKey: ['column-preference'],
    queryFn: () => apiGetColumnPreferenceByUser(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useSaveColumnPreference = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ColumnPreferencePayload) => apiSaveColumnPreference(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['column-preference'] });
    },
  });
};
export const useSaveColumnPreferenceDefault = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ColumnPreferencePayload) => apiSaveColumnPreferenceDefault(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['column-preference'] });
    },
  });
};

export const useCompleteCurrentTopLead = (options?: {
  onSuccess?: (data: CompleteCurrentTopLeadResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: (data: CompleteCurrentTopLeadRequest) => apiCompleteCurrentTopLead(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['current-top-lead'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });

      openNotification({
        type: 'success',
        massage: response.message || 'Lead completed successfully',
      });

      if (options?.onSuccess) {
        options.onSuccess(response);
      }
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to complete lead',
      });

      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};

// ============================================================================
// NEW: Universal Grouping & Filtering Hooks (GET-based system)
// ============================================================================

/**
 * Get metadata options for entity type (filter fields, operators, etc.)
 * @param entityType - Entity type: 'Lead', 'Offer', 'User', 'Team', 'Opening'
 * @param options - Optional query options (e.g., enabled)
 */
export const useMetadataOptions = (entityType: string, options?: { enabled?: boolean }) => {
  return useQuery<MetadataOptionsResponse, Error>({
    queryKey: ['metadata-options', entityType],
    queryFn: () => apiGetMetadataOptions(entityType),
    staleTime: 5 * 60 * 1000, // metadata rarely changes; avoids refetch storms when many rows mount
    enabled: options?.enabled !== false && !!entityType,
  });
};

/**
 * Helper to serialize domain filters for stable query keys
 * Arrays are compared by reference in React Query, so we need to serialize them
 */
const serializeDomainFilters = (domain: DomainFilter[]): string => {
  if (!domain || domain.length === 0) return '';
  // Sort filters by field to ensure consistent serialization
  const sorted = [...domain].sort((a, b) => {
    const fieldA = a[0] || '';
    const fieldB = b[0] || '';
    return fieldA.localeCompare(fieldB);
  });
  return JSON.stringify(sorted);
};

/** Table column sort ids → API field names for Lead grouped-summary only (matches lead table field map). */
const LEAD_GROUP_SUMMARY_SORT_BY_MAP: Record<string, string> = {
  project_name: 'team_id',
  agent: 'user_id',
  status: 'status_id',
  lead_source: 'source_id',
};

function mapLeadGroupSummarySortBy(
  entityType: string,
  sortBy: string | undefined
): string | undefined {
  if (!sortBy) return undefined;
  if (entityType.toLowerCase() !== 'lead') return sortBy;
  return LEAD_GROUP_SUMMARY_SORT_BY_MAP[sortBy] ?? sortBy;
}

/**
 * Get grouped summary data
 * @param params - Parameters for grouped summary query
 */
export const useGroupedSummary = (params: {
  entityType: string;
  domain: DomainFilter[];
  groupBy: string[];
  page?: number;
  limit?: number;
  subPage?: number | null;
  subLimit?: number | null;
  groupId?: string | null; // ID of the parent group whose subgroups are being paginated
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
  // Default filters as regular query params (e.g., { use_status: 'pending', project_id: '123' })
  // These should be passed alongside domain parameter, not inside it
  defaultFilters?: Record<string, string | number | boolean>;
  // has_progress value for progress pages (opening, confirmation, payment, netto1, netto2, lost)
  hasProgress?: string;
  // Search term from ActionBar
  search?: string | null;
  // Bulk search values (emails, partner IDs, phones) - when grouping after bulk search
  values?: string[];
  /** Pass false to omit `includeAll` on grouped summary (e.g. `/dashboards/leads-bank`). */
  includeAll?: boolean;
  /**
   * When false, `sortBy` / `sortOrder` are not sent on the grouped-summary request (e.g. while a
   * group row is expanded and sorting should apply only to group-details rows). Default true.
   */
  applySortToSummary?: boolean;
  /** Grouped summary against `/closed-leads` (close-project details page). */
  listResource?: 'leads' | 'closed-leads';
}) => {
  // Serialize arrays for stable query keys
  // Use empty string for empty arrays to ensure consistent query keys
  const serializedDomain = useMemo(() => {
    if (!params.domain || params.domain.length === 0) return '';
    return serializeDomainFilters(params.domain);
  }, [params.domain]);
  // Preserve user's intended order - do NOT sort the groupBy array
  const serializedGroupBy = useMemo(() => JSON.stringify([...params.groupBy]), [params.groupBy]);

  // Serialize default filters for stable query key
  const serializedDefaultFilters = useMemo(() => {
    if (!params.defaultFilters || Object.keys(params.defaultFilters).length === 0) return '';
    return JSON.stringify(
      Object.entries(params.defaultFilters)
        .sort(([a], [b]) => a.localeCompare(b))
        .reduce(
          (acc, [key, value]) => {
            acc[key] = value;
            return acc;
          },
          {} as Record<string, string | number | boolean>
        )
    );
  }, [params.defaultFilters]);

  const applySortToSummary = params.applySortToSummary !== false;
  /**
   * Query key must match what the request actually sends. Previously we keyed off `applySortToSummary`
   * alone, so collapsed `:desc` vs expanded `summary-sort:off` differed even when `sortBy` was empty
   * and the API sent no sort — duplicate /leads?groupBy=... calls (e.g. after expanding phone /
   * lead_source_no leaf groups).
   */
  const mappedSortForSummaryKey = mapLeadGroupSummarySortBy(
    params.entityType,
    params.sortBy
  );
  const sortAffectsSummaryRequest = applySortToSummary && !!mappedSortForSummaryKey;
  const summarySortKey = sortAffectsSummaryRequest
    ? `${params.sortBy ?? ''}:${params.sortOrder ?? 'desc'}`
    : 'summary-sort:off';

  // Slot of summarySortKey in queryKey — keep in sync when adding/removing key segments above it.
  const GROUPED_SUMMARY_SORT_KEY_INDEX = 9;

  const groupedSummaryQueryKey = useMemo(
    () =>
      [
        'grouped-summary',
        params.entityType,
        serializedDomain,
        serializedGroupBy,
        params.page || 1,
        params.limit || 50,
        params.subPage || null,
        params.subLimit || null,
        params.groupId || null,
        summarySortKey,
        serializedDefaultFilters,
        params.hasProgress || null,
        params.search || null,
        params.values?.length ? JSON.stringify(params.values) : null,
        params.includeAll === false ? 'omit-include-all' : 'default-include-all',
        params.listResource ?? 'leads',
      ] as const,
    [
      params.entityType,
      serializedDomain,
      serializedGroupBy,
      params.page,
      params.limit,
      params.subPage,
      params.subLimit,
      params.groupId,
      summarySortKey,
      serializedDefaultFilters,
      params.hasProgress,
      params.search,
      params.values,
      params.includeAll,
      params.listResource,
    ]
  );

  return useQuery<GroupedSummaryResponse, Error>({
    queryKey: [...groupedSummaryQueryKey],
    queryFn: () => {
      const {
        enabled: _enabled,
        applySortToSummary: _applyFlag,
        sortBy,
        sortOrder,
        ...rest
      } = params;
      const apiSortBy = mapLeadGroupSummarySortBy(rest.entityType, sortBy);
      return apiGetGroupedSummary({
        ...rest,
        listResource: params.listResource,
        ...(applySortToSummary && apiSortBy
          ? { sortBy: apiSortBy, sortOrder: sortOrder ?? 'desc' }
          : {}),
      });
    },
    enabled: params.enabled !== false && params.groupBy.length > 0,
    // When a leaf group expands, sort may move from grouped-summary to group-details — when that
    // actually changes the HTTP params, `summarySortKey` updates. Without placeholder data, `data`
    // can briefly become undefined, rows unmount, and the UI can thrash. Keep the previous tree
    // only when the key change is *solely* the summary-sort slot; for other key changes, no placeholder.
    placeholderData: (previousData, previousQuery) => {
      if (!previousData || !previousQuery?.queryKey) return undefined;
      const prevKey = previousQuery.queryKey;
      const nextKey = groupedSummaryQueryKey;
      if (prevKey.length !== nextKey.length) return undefined;
      for (let i = 0; i < prevKey.length; i++) {
        if (i === GROUPED_SUMMARY_SORT_KEY_INDEX) continue;
        if (prevKey[i] !== nextKey[i]) return undefined;
      }
      return previousData;
    },
  });
};
