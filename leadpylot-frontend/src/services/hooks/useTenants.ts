/**
 * Tenants Hook
 * React Query hooks for tenant management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetTenants,
  apiGetTenant,
  apiCreateTenant,
  apiUpdateTenant,
  apiRotateTenantKey,
  apiSuspendTenant,
  apiActivateTenant,
  CreateTenantRequest,
  UpdateTenantRequest,
  Tenant,
} from '../TenantService';

const TENANTS_QUERY_KEY = ['tenants'];

/**
 * Hook to fetch all tenants
 */
export function useTenants() {
  return useQuery({
    queryKey: TENANTS_QUERY_KEY,
    queryFn: async () => {
      const response = await apiGetTenants();
      return response.tenants;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch a single tenant
 */
export function useTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: [...TENANTS_QUERY_KEY, tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID is required');
      const response = await apiGetTenant(tenantId);
      return response.tenant;
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });
}

/**
 * Hook to create a tenant
 */
export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTenantRequest) => apiCreateTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANTS_QUERY_KEY });
    },
  });
}

/**
 * Hook to update a tenant
 */
export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: UpdateTenantRequest }) =>
      apiUpdateTenant(tenantId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TENANTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...TENANTS_QUERY_KEY, variables.tenantId] });
    },
  });
}

/**
 * Hook to rotate tenant API key
 */
export function useRotateTenantKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantId: string) => apiRotateTenantKey(tenantId),
    onSuccess: (_, tenantId) => {
      queryClient.invalidateQueries({ queryKey: TENANTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...TENANTS_QUERY_KEY, tenantId] });
    },
  });
}

/**
 * Hook to suspend a tenant
 */
export function useSuspendTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantId: string) => apiSuspendTenant(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANTS_QUERY_KEY });
    },
  });
}

/**
 * Hook to activate a tenant
 */
export function useActivateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantId: string) => apiActivateTenant(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANTS_QUERY_KEY });
    },
  });
}

export type { Tenant, CreateTenantRequest, UpdateTenantRequest };
