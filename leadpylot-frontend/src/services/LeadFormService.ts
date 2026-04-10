import ApiService from './ApiService';

export interface LeadForm {
  _id: string;
  id: string;
  lead_source_no: string;
  first_name: string;
  last_name: string;
  contact_name: string;
  email: string;
  phone: string;
  site_link: string;
  source: string;
  expected_revenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFormsResponse {
  data: LeadForm[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface UpdateLeadFormRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  site_link?: string;
  source?: string;
  expected_revenue?: number;
}

export interface DeleteLeadFormsResponse {
  success: boolean;
  message: string;
  deletedCount: number;
}

export const apiGetLeadForms = (params?: Record<string, unknown>) => {
  return ApiService.fetchDataWithAxios<LeadFormsResponse>({
    url: '/lead-forms',
    method: 'get',
    params,
  });
};

export const apiGetLeadForm = (id: string) => {
  return ApiService.fetchDataWithAxios<LeadForm>({
    url: `/lead-forms/${id}`,
    method: 'get',
  });
};

export const apiUpdateLeadForm = (id: string, data: UpdateLeadFormRequest) => {
  return ApiService.fetchDataWithAxios<LeadForm, UpdateLeadFormRequest>({
    url: `/lead-forms/${id}`,
    method: 'put',
    data,
  });
};

export const apiDeleteLeadForm = (id: string) => {
  return ApiService.fetchDataWithAxios<DeleteLeadFormsResponse>({
    url: `/lead-forms/${id}`,
    method: 'delete',
  });
};

export const apiDeleteMultipleLeadForms = (ids: string[]) => {
  return ApiService.fetchDataWithAxios<DeleteLeadFormsResponse>({
    url: '/lead-forms',
    method: 'delete',
    data: { ids },
  });
};

export const apiSubmitLeadForm = (data: Record<string, unknown>) => {
  return ApiService.fetchDataWithAxios<LeadForm>({
    url: '/lead-forms',
    method: 'post',
    data,
  });
};

export interface ImportLeadFromFormPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lead_source_no: string;
  source: string;
  expected_revenue: string;
  site_link: string;
  lead_date: string;
}

function formatExpectedRevenue(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}k`;
  }
  return String(value);
}

export function mapLeadFormToImportPayload(lead: LeadForm): ImportLeadFromFormPayload {
  return {
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email,
    phone: lead.phone ?? '',
    lead_source_no: lead.lead_source_no ?? '',
    source: lead.source ?? '',
    expected_revenue: formatExpectedRevenue(lead.expected_revenue ?? 0),
    site_link: lead.site_link ?? '',
    lead_date: lead?.createdAt ?? '',
  };
}

export const apiImportLeadsFromForms = (payload: ImportLeadFromFormPayload[]) => {
  return ApiService.fetchDataWithAxios<unknown, ImportLeadFromFormPayload[]>({
    url: '/leads/import-from-forms',
    method: 'post',
    data: payload,
  });
};
