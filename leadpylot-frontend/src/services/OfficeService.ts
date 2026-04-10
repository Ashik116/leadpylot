/**
 * Office Service
 * API client for office CRUD (user-auth-service)
 */

import ApiService from './ApiService';

export interface OfficePermissions {
  readAll: boolean;
  readAssigned: boolean;
  update: boolean;
  delete: boolean;
  manageEmployees: boolean;
  manageWorkingHours: boolean;
}

export interface Office {
  _id: string;
  name: string;
  country?: string | null;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country_code?: string;
  };
  timezone?: string;
  contact?: { phone?: string; email?: string; fax?: string };
  employees?:
    | string[]
    | { _id: string; login?: string; email?: string; role?: string; info?: { name?: string; email?: string } }[];
  manager_id?: string | { _id: string; login?: string; email?: string } | null;
  capacity?: number | null;
  active?: boolean;
  notes?: string | null;
  employee_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OfficesListResponse {
  success: boolean;
  data: Office[];
  pagination: { page: number; limit: number; total: number; pages: number };
  permissions?: { office: OfficePermissions };
}

export interface OfficeDetailResponse {
  success: boolean;
  data: Office;
  permissions?: { office: OfficePermissions };
}

export interface OfficeCreatePayload {
  name: string;
  country?: string;
  timezone?: string;
  capacity?: number;
  active?: boolean;
  address?: Office['address'];
  contact?: Office['contact'];
  notes?: string;
}

const buildQuery = (params?: Record<string, string | number | boolean | undefined>) => {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};

export async function apiGetOffices(params?: {
  page?: number;
  limit?: number;
  country?: string;
  active?: boolean;
  search?: string;
}): Promise<OfficesListResponse> {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return ApiService.fetchDataWithAxios({
    url: `/offices${query}`,
    method: 'get',
  });
}

export async function apiGetOfficeById(id: string): Promise<OfficeDetailResponse> {
  return ApiService.fetchDataWithAxios({
    url: `/offices/${id}`,
    method: 'get',
  });
}

export async function apiCreateOffice(
  data: OfficeCreatePayload
): Promise<OfficeDetailResponse & { data: Office }> {
  return ApiService.fetchDataWithAxios({
    url: '/offices',
    method: 'post',
    data,
  });
}

export async function apiUpdateOffice(
  id: string,
  data: Partial<OfficeCreatePayload>
): Promise<OfficeDetailResponse> {
  return ApiService.fetchDataWithAxios({
    url: `/offices/${id}`,
    method: 'put',
    data,
  });
}

export async function apiDeleteOffice(
  id: string
): Promise<{ success: boolean; message: string; permissions?: { office: OfficePermissions } }> {
  return ApiService.fetchDataWithAxios({
    url: `/offices/${id}`,
    method: 'delete',
  });
}

// Office employees
export interface OfficeEmployeesResponse {
  success: boolean;
  users: { _id: string; login?: string; email?: string; role?: string }[];
  pagination: { page: number; limit: number; total: number; pages: number };
  permissions?: { office: OfficePermissions };
}

export async function apiGetOfficeEmployees(
  officeId: string,
  params?: { page?: number; limit?: number; role?: string }
): Promise<OfficeEmployeesResponse> {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return ApiService.fetchDataWithAxios({
    url: `/offices/${officeId}/employees${query}`,
    method: 'get',
  });
}

export async function apiAssignEmployee(
  officeId: string,
  data: { userId: string; setPrimary?: boolean }
): Promise<{ success: boolean; office?: Office; user?: unknown }> {
  return ApiService.fetchDataWithAxios({
    url: `/offices/${officeId}/employees`,
    method: 'post',
    data,
  });
}

/** Assign multiple users to an office in one request */
export async function apiAssignEmployees(
  officeId: string,
  data: { userIds: string[] }
): Promise<{ success: boolean; assigned?: number; message?: string }> {
  return ApiService.fetchDataWithAxios({
    url: `/offices/${officeId}/employees`,
    method: 'post',
    data,
  });
}

export async function apiRemoveEmployee(
  officeId: string,
  userId: string
): Promise<{ success: boolean; message?: string }> {
  return ApiService.fetchDataWithAxios({
    url: `/offices/${officeId}/employees/${userId}`,
    method: 'delete',
  });
}
