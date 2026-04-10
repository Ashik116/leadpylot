import ApiService from './ApiService';

export interface Reclamation {
  _id: string;
  project_id: string;
  agent_id: {
    _id: string;
  };
  lead_id: {
    _id: string;
    phone: string;
  };
  reason: string;
  status: number;
  response: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReclamationsResponse {
  status: string;
  results: number;
  data: Reclamation[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface SingleReclamationResponse {
  status: string;
  data: Reclamation;
}

export interface ReclamationRequest extends Record<string, unknown> {
  reason: string;
  project_id: string;
  agent_id: string;
  lead_id: string;
}

export interface ReclamationUpdateRequest extends Record<string, unknown> {
  status: number;
  response: string;
}

export interface ReclamationsQueryParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  /** Domain filters as JSON stringified array: [[field, operator, value], ...] */
  domain?: string;
  /** Include all records (used with grouping) */
  includeAll?: string | boolean;
  /** Group by fields as JSON stringified array: ["team_id", ...] */
  groupBy?: string;
}

export async function apiGetReclamations(params?: ReclamationsQueryParams) {
  return ApiService.fetchDataWithAxios<ReclamationsResponse>({
    url: '/reclamations',
    method: 'get',
    params,
  });
}

export async function apiGetMyReclamations(params?: ReclamationsQueryParams) {
  return ApiService.fetchDataWithAxios<ReclamationsResponse>({
    url: '/reclamations/my-reclamations',
    method: 'get',
    params,
  });
}

export async function apiGetReclamation(id: string) {
  return ApiService.fetchDataWithAxios<SingleReclamationResponse>({
    url: `/reclamations/${id}`,
    method: 'get',
  });
}

export async function apiUpdateReclamation(id: string, data: ReclamationUpdateRequest) {
  return ApiService.fetchDataWithAxios<Reclamation>({
    url: `/reclamations/${id}`,
    method: 'PATCH',
    data,
  });
}

export async function apiSubmitReclamation(data: ReclamationRequest) {
  return ApiService.fetchDataWithAxios<Reclamation>({
    url: '/reclamations',
    method: 'post',
    data,
  });
}
