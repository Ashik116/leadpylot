import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiGetLeadForms,
  apiGetLeadForm,
  apiUpdateLeadForm,
  apiDeleteLeadForm,
  apiDeleteMultipleLeadForms,
  apiImportLeadsFromForms,
  type LeadFormsResponse,
  type LeadForm,
  type UpdateLeadFormRequest,
  type ImportLeadFromFormPayload,
} from '../LeadFormService';

export const useLeadFormsData = (params?: Record<string, unknown>) => {
  return useQuery<LeadFormsResponse>({
    queryKey: ['lead-forms', params],
    queryFn: () => apiGetLeadForms(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useLeadForm = (id: string) => {
  return useQuery<LeadForm>({
    queryKey: ['lead-form', id],
    queryFn: () => apiGetLeadForm(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useUpdateLeadForm = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateLeadFormRequest) => apiUpdateLeadForm(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-form', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-forms'] });
    },
  });
};

export const useDeleteLeadForm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDeleteLeadForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-forms'] });
    },
  });
};

export const useDeleteMultipleLeadForms = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => apiDeleteMultipleLeadForms(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-forms'] });
    },
  });
};

export const useImportLeadsFromForms = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leads: ImportLeadFromFormPayload[]) => apiImportLeadsFromForms(leads),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-forms'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};
