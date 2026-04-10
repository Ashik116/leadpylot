import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ApiService from '@/services/ApiService';

export interface Appointment {
  _id: string;
  lead_id: string;
  appointment_date: string;
  appointment_time?: string;
  title: string;
  description?: string;
  location?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  reminder_sent: boolean;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lead?: {
    _id: string;
    contact_name: string;
    email_from: string;
    phone: string;
  };
  creator?: {
    _id: string;
    login: string;
    role: string;
  };
  created_by?: string;
}

export interface CreateAppointmentData {
  lead_id: string;
  appointment_date: string;
  appointment_time?: string;
  title: string;
  description?: string;
  location?: string;
  [key: string]: unknown;
}

export interface UpdateAppointmentData {
  appointment_date?: string;
  appointment_time?: string;
  title?: string;
  description?: string;
  location?: string;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  [key: string]: unknown;
}

export interface AppointmentFilters {
  page?: number;
  limit?: number;
  lead_id?: string;
  created_by?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  includeInactive?: boolean;
}

export interface AppointmentResponse {
  data: Appointment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const APPOINTMENT_KEYS = {
  all: ['appointments'] as const,
  lists: () => [...APPOINTMENT_KEYS.all, 'list'] as const,
  list: (filters: AppointmentFilters) => [...APPOINTMENT_KEYS.lists(), filters] as const,
  details: () => [...APPOINTMENT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...APPOINTMENT_KEYS.details(), id] as const,
  byLead: (leadId: string) => [...APPOINTMENT_KEYS.all, 'byLead', leadId] as const,
  myAppointments: (filters: AppointmentFilters) =>
    [...APPOINTMENT_KEYS.all, 'my', filters] as const,
};

export const useAppointments = (filters: AppointmentFilters = {}) => {
  return useQuery({
    queryKey: APPOINTMENT_KEYS.list(filters),
    queryFn: async (): Promise<AppointmentResponse> => {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await ApiService.fetchDataWithAxios<AppointmentResponse>({
        url: `/appointments?${params.toString()}`,
        method: 'get',
      });
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAppointment = (id: string, includeInactive = false) => {
  return useQuery({
    queryKey: APPOINTMENT_KEYS.detail(id),
    queryFn: async (): Promise<Appointment> => {
      const params = includeInactive ? '?includeInactive=true' : '';
      const response = await ApiService.fetchDataWithAxios<Appointment>({
        url: `/appointments/${id}${params}`,
        method: 'get',
      });
      return response;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAppointmentsByLead = (
  leadId: string,
  options: {
    includeInactive?: boolean;
    limit?: number;
    page?: number;
    sort?: string;
    enabled?: boolean;
  } = {}
) => {
  const { enabled = true, ...queryOptions } = options;
  return useQuery({
    queryKey: [...APPOINTMENT_KEYS.byLead(leadId), queryOptions],
    queryFn: async (): Promise<AppointmentResponse> => {
      const params = new URLSearchParams();

      Object.entries(queryOptions).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await ApiService.fetchDataWithAxios<AppointmentResponse>({
        url: `/appointments/lead/${leadId}`,
        method: 'get',
        params: queryOptions,
      });
      return response;
    },
    enabled: !!leadId && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useMyAppointments = (filters: AppointmentFilters = {}) => {
  return useQuery({
    queryKey: APPOINTMENT_KEYS.myAppointments(filters),
    queryFn: async (): Promise<AppointmentResponse> => {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await ApiService.fetchDataWithAxios<AppointmentResponse>({
        url: `/appointments/my-appointments?${params.toString()}`,
        method: 'get',
      });
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAppointmentData): Promise<Appointment> => {
      const response = await ApiService.fetchDataWithAxios<Appointment>({
        url: '/appointments',
        method: 'post',
        data,
      });
      return response;
    },
    onSuccess: (newAppointment) => {
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['current-top-lead'] });
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.all });
      // Refresh updates/activities section to show meeting_scheduled activity in real-time
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateAppointmentData;
    }): Promise<Appointment> => {
      const response = await ApiService.fetchDataWithAxios<Appointment>({
        url: `/appointments/${id}`,
        method: 'put',
        data,
      });
      return response;
    },
    onSuccess: (updatedAppointment) => {
      // Update the specific appointment in cache
      queryClient.setQueryData(APPOINTMENT_KEYS.detail(updatedAppointment._id), updatedAppointment);

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['lead', updatedAppointment.lead_id] });
      // Refresh updates/activities section
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
};

export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string
    ): Promise<{ message: string; appointment: { _id: string; active: boolean } }> => {
      const response = await ApiService.fetchDataWithAxios<{
        message: string;
        appointment: { _id: string; active: boolean };
      }>({
        url: `/appointments/${id}`,
        method: 'delete',
      });
      return response;
    },
    onSuccess: (result, appointmentId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: APPOINTMENT_KEYS.detail(appointmentId) });

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      // Refresh updates/activities section
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
};
