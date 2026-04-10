/**
 * useOffices – React Query hooks for office CRUD (user-auth-service)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import {
  apiGetOffices,
  apiGetOfficeById,
  apiCreateOffice,
  apiUpdateOffice,
  apiDeleteOffice,
  apiGetOfficeEmployees,
  apiAssignEmployee,
  apiAssignEmployees,
  apiRemoveEmployee,
  type OfficeCreatePayload,
} from '../OfficeService';

export const OFFICES_QUERY_KEYS = {
  list: (params?: unknown) => ['offices', params] as const,
  detail: (id: string) => ['offices', id] as const,
  employees: (officeId: string, params?: unknown) => ['offices', officeId, 'employees', params] as const,
};

export function useOffices(params?: {
  page?: number;
  limit?: number;
  country?: string;
  active?: boolean;
  search?: string;
}) {
  return useQuery({
    queryKey: OFFICES_QUERY_KEYS.list(params),
    queryFn: () => apiGetOffices(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOffice(id: string | undefined) {
  return useQuery({
    queryKey: OFFICES_QUERY_KEYS.detail(id || ''),
    queryFn: () => apiGetOfficeById(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateOffice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OfficeCreatePayload) => apiCreateOffice(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      toast.push(
        Notification({
          type: 'success',
          title: 'Office created',
          children: `"${res.data?.name}" has been created.`,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: (error as { response?: { data?: { error?: string } } })?.response?.data?.error || error.message || 'Failed to create office',
        })
      );
    },
  });
}

export function useUpdateOffice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OfficeCreatePayload> }) =>
      apiUpdateOffice(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      if (res.data?._id) {
        queryClient.invalidateQueries({ queryKey: OFFICES_QUERY_KEYS.detail(res.data._id) });
      }
      toast.push(
        Notification({
          type: 'success',
          title: 'Office updated',
          children: `"${res.data?.name}" has been updated.`,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: (error as { response?: { data?: { error?: string } } })?.response?.data?.error || error.message || 'Failed to update office',
        })
      );
    },
  });
}

export function useDeleteOffice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteOffice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      toast.push(
        Notification({
          type: 'success',
          title: 'Office deactivated',
          children: 'Office has been deactivated successfully.',
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: (error as { response?: { data?: { error?: string } } })?.response?.data?.error || error.message || 'Failed to deactivate office',
        })
      );
    },
  });
}

export function useOfficeEmployees(officeId: string | undefined, params?: { page?: number; limit?: number; role?: string }) {
  return useQuery({
    queryKey: OFFICES_QUERY_KEYS.employees(officeId || '', params),
    queryFn: () => apiGetOfficeEmployees(officeId!, params),
    enabled: !!officeId,
    staleTime: 1 * 60 * 1000,
  });
}

export function useAssignEmployee(officeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; setPrimary?: boolean }) => apiAssignEmployee(officeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      queryClient.invalidateQueries({ queryKey: OFFICES_QUERY_KEYS.employees(officeId) });
      toast.push(Notification({ type: 'success', title: 'Member assigned', children: 'User has been assigned to office.' }));
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: (error as { response?: { data?: { error?: string } } })?.response?.data?.error || error.message || 'Failed to assign member',
        })
      );
    },
  });
}

/** Assign multiple users to an office in one request */
export function useAssignEmployees(officeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userIds: string[] }) => apiAssignEmployees(officeId, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      queryClient.invalidateQueries({ queryKey: OFFICES_QUERY_KEYS.employees(officeId) });
      const count = res?.assigned ?? 0;
      toast.push(
        Notification({
          type: 'success',
          title: 'Members assigned',
          children: count === 1 ? '1 member has been assigned.' : `${count} members have been assigned.`,
        })
      );
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: (error as { response?: { data?: { error?: string } } })?.response?.data?.error || error.message || 'Failed to assign members',
        })
      );
    },
  });
}

export function useRemoveEmployee(officeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiRemoveEmployee(officeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      queryClient.invalidateQueries({ queryKey: OFFICES_QUERY_KEYS.employees(officeId) });
      toast.push(Notification({ type: 'success', title: 'Member removed', children: 'User has been removed from office.' }));
    },
    onError: (error: Error) => {
      toast.push(
        Notification({
          type: 'danger',
          title: 'Error',
          children: (error as { response?: { data?: { error?: string } } })?.response?.data?.error || error.message || 'Failed to remove member',
        })
      );
    },
  });
}
