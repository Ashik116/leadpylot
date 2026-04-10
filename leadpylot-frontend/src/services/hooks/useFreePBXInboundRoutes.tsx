import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import {
  apiGetInboundRoutes,
  apiGetInboundRoute,
  apiCreateInboundRoute,
  apiUpdateInboundRoute,
  apiDeleteInboundRoute,
  apiGetInboundRouteStatistics,
  apiGetAvailableDestinations,
  type CreateInboundRouteData,
  type UpdateInboundRouteData,
} from '../FreePBXInboundRouteService';

/**
 * Hook to get all inbound routes
 */
export function useInboundRoutes(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['freepbx-inbound-routes', params],
    queryFn: () => apiGetInboundRoutes(params),
  });
}

/**
 * Hook to get inbound route by DID
 */
export function useInboundRoute(didNumber: string) {
  return useQuery({
    queryKey: ['freepbx-inbound-route', didNumber],
    queryFn: () => apiGetInboundRoute(didNumber),
    enabled: !!didNumber,
  });
}

/**
 * Hook to get inbound route statistics
 */
export function useInboundRouteStatistics() {
  return useQuery({
    queryKey: ['freepbx-inbound-route-statistics'],
    queryFn: () => apiGetInboundRouteStatistics(),
  });
}

/**
 * Hook to create inbound route
 */
export function useCreateInboundRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInboundRouteData) => apiCreateInboundRoute(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freepbx-inbound-routes'] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-inbound-route-statistics'] });
      toast.push(
        <Notification title="Route created" type="success">
          Inbound route created successfully
        </Notification>
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to create inbound route';
      toast.push(
        <Notification title="Creation failed" type="danger">
          {errorMessage}
        </Notification>
      );
    },
  });
}

/**
 * Hook to update inbound route
 */
export function useUpdateInboundRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ didNumber, data }: { didNumber: string; data: UpdateInboundRouteData }) =>
      apiUpdateInboundRoute(didNumber, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['freepbx-inbound-routes'] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-inbound-route', variables.didNumber] });
      toast.push(
        <Notification title="Route updated" type="success">
          Inbound route updated successfully
        </Notification>
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to update inbound route';
      toast.push(
        <Notification title="Update failed" type="danger">
          {errorMessage}
        </Notification>
      );
    },
  });
}

/**
 * Hook to delete inbound route
 */
export function useDeleteInboundRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (didNumber: string) => apiDeleteInboundRoute(didNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freepbx-inbound-routes'] });
      queryClient.invalidateQueries({ queryKey: ['freepbx-inbound-route-statistics'] });
      toast.push(
        <Notification title="Route deleted" type="success">
          Inbound route deleted successfully
        </Notification>
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to delete inbound route';
      toast.push(
        <Notification title="Deletion failed" type="danger">
          {errorMessage}
        </Notification>
      );
    },
  });
}

/**
 * Hook to get available destinations (extensions, ring groups, queues)
 */
export function useAvailableDestinations() {
  return useQuery({
    queryKey: ['freepbx-available-destinations'],
    queryFn: () => apiGetAvailableDestinations(),
    // Cache for 5 minutes
  });
}
