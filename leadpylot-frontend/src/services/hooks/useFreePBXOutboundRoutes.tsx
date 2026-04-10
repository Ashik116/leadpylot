import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import {
  apiGetOutboundRoutes,
  apiGetOutboundRoute,
  apiGetDialPatterns,
  apiGetRouteTrunks,
  apiAddDialPattern,
  apiUpdateDialPattern,
  apiDeleteDialPattern,
  apiGetOutboundRouteStatistics,
  type AddDialPatternData,
  type UpdateDialPatternData,
} from '../FreePBXOutboundRouteService';

/**
 * Hook to get all outbound routes
 */
export function useOutboundRoutes(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['freepbx-outbound-routes', params],
    queryFn: () => apiGetOutboundRoutes(params),
  });
}

/**
 * Hook to get outbound route by ID
 */
export function useOutboundRoute(id: number) {
  return useQuery({
    queryKey: ['freepbx-outbound-route', id],
    queryFn: () => apiGetOutboundRoute(id),
    enabled: !!id,
  });
}

/**
 * Hook to get dial patterns for a route
 */
export function useDialPatterns(routeId: number) {
  return useQuery({
    queryKey: ['freepbx-dial-patterns', routeId],
    queryFn: () => apiGetDialPatterns(routeId),
    enabled: !!routeId,
  });
}

/**
 * Hook to get trunks for a route
 */
export function useRouteTrunks(routeId: number) {
  return useQuery({
    queryKey: ['freepbx-route-trunks', routeId],
    queryFn: () => apiGetRouteTrunks(routeId),
    enabled: !!routeId,
  });
}

/**
 * Hook to get outbound route statistics
 */
export function useOutboundRouteStatistics() {
  return useQuery({
    queryKey: ['freepbx-outbound-route-statistics'],
    queryFn: () => apiGetOutboundRouteStatistics(),
  });
}

/**
 * Hook to add dial pattern
 */
export function useAddDialPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routeId, data }: { routeId: number; data: AddDialPatternData }) =>
      apiAddDialPattern(routeId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['freepbx-dial-patterns', variables.routeId] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-outbound-routes'] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-outbound-route-statistics'] });
      toast.push(
        <Notification title="Pattern added" type="success">
          Dial pattern added successfully
        </Notification>
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to add dial pattern';
      toast.push(
        <Notification title="Addition failed" type="danger">
          {errorMessage}
        </Notification>
      );
    },
  });
}

/**
 * Hook to update dial pattern
 */
export function useUpdateDialPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      routeId,
      patternId,
      data,
    }: {
      routeId: number;
      patternId: number;
      data: UpdateDialPatternData;
    }) => apiUpdateDialPattern(routeId, patternId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['freepbx-dial-patterns', variables.routeId] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-outbound-routes'] });
      toast.push(
        <Notification title="Pattern updated" type="success">
          Dial pattern updated successfully
        </Notification>
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to update dial pattern';
      toast.push(
        <Notification title="Update failed" type="danger">
          {errorMessage}
        </Notification>
      );
    },
  });
}

/**
 * Hook to delete dial pattern
 */
export function useDeleteDialPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routeId, patternId }: { routeId: number; patternId: number }) =>
      apiDeleteDialPattern(routeId, patternId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['freepbx-dial-patterns', variables.routeId] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-outbound-routes'] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-outbound-route-statistics'] });
      toast.push(
        <Notification title="Pattern deleted" type="success">
          Dial pattern deleted successfully
        </Notification>
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to delete dial pattern';
      toast.push(
        <Notification title="Deletion failed" type="danger">
          {errorMessage}
        </Notification>
      );
    },
  });
}

