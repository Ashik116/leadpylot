/**
 * Tenant Management Service
 * API calls to Gateway admin endpoints for tenant management
 */

import axios from 'axios';

// Gateway URL - in production this would come from environment
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:4050';

// Admin secret for gateway admin operations
const getAdminSecret = () => {
  return process.env.NEXT_PUBLIC_GATEWAY_ADMIN_SECRET || '';
};

// Create axios instance for gateway admin calls
const gatewayAdminApi = axios.create({
  baseURL: GATEWAY_URL,
  timeout: 30000,
});

// Add admin secret to all requests
gatewayAdminApi.interceptors.request.use((config) => {
  config.headers['X-Admin-Secret'] = getAdminSecret();
  return config;
});

// Types
export interface TenantRateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
}

export interface TenantStats {
  totalRequests: number;
  lastRequestAt?: string;
  failedAuthAttempts: number;
}

export interface TenantMetadata {
  createdBy?: string;
  lastApiKeyRotation?: string;
  notes?: string;
}

export interface Tenant {
  _id: string;
  tenantId: string;
  name: string;
  type: 'agent' | 'manager' | 'admin';
  domain: string;
  status: 'active' | 'suspended' | 'pending';
  rateLimit: TenantRateLimit;
  features: Record<string, boolean>;
  allowedIPs: string[];
  metadata: TenantMetadata;
  stats: TenantStats;
  apiKeyPrefix: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantRequest {
  name: string;
  type: 'agent' | 'manager' | 'admin';
  domain: string;
}

export interface CreateTenantResponse {
  message: string;
  tenant: {
    tenantId: string;
    name: string;
    type: string;
    domain: string;
    status: string;
  };
  apiKey: string;
  warning: string;
}

export interface UpdateTenantRequest {
  name?: string;
  status?: 'active' | 'suspended' | 'pending';
  rateLimit?: Partial<TenantRateLimit>;
  features?: Record<string, boolean>;
  allowedIPs?: string[];
}

export interface RotateKeyResponse {
  message: string;
  tenantId: string;
  apiKey: string;
  warning: string;
}

export interface ListTenantsResponse {
  tenants: Tenant[];
}

export interface GetTenantResponse {
  tenant: Tenant;
}

/**
 * List all tenants
 */
export async function apiGetTenants(): Promise<ListTenantsResponse> {
  const response = await gatewayAdminApi.get<ListTenantsResponse>('/gateway/admin/tenants');
  return response.data;
}

/**
 * Get tenant by ID
 */
export async function apiGetTenant(tenantId: string): Promise<GetTenantResponse> {
  const response = await gatewayAdminApi.get<GetTenantResponse>(`/gateway/admin/tenants/${tenantId}`);
  return response.data;
}

/**
 * Create a new tenant
 */
export async function apiCreateTenant(data: CreateTenantRequest): Promise<CreateTenantResponse> {
  const response = await gatewayAdminApi.post<CreateTenantResponse>('/gateway/admin/tenants', data);
  return response.data;
}

/**
 * Update tenant
 */
export async function apiUpdateTenant(tenantId: string, data: UpdateTenantRequest): Promise<{ message: string; tenant: Partial<Tenant> }> {
  const response = await gatewayAdminApi.patch(`/gateway/admin/tenants/${tenantId}`, data);
  return response.data;
}

/**
 * Rotate tenant API key
 */
export async function apiRotateTenantKey(tenantId: string): Promise<RotateKeyResponse> {
  const response = await gatewayAdminApi.post<RotateKeyResponse>(`/gateway/admin/tenants/${tenantId}/rotate-key`);
  return response.data;
}

/**
 * Suspend tenant
 */
export async function apiSuspendTenant(tenantId: string): Promise<{ message: string; tenantId: string; status: string }> {
  const response = await gatewayAdminApi.post(`/gateway/admin/tenants/${tenantId}/suspend`);
  return response.data;
}

/**
 * Activate tenant
 */
export async function apiActivateTenant(tenantId: string): Promise<{ message: string; tenantId: string; status: string }> {
  const response = await gatewayAdminApi.post(`/gateway/admin/tenants/${tenantId}/activate`);
  return response.data;
}

/**
 * Delete tenant (soft delete via suspend)
 */
export async function apiDeleteTenant(tenantId: string): Promise<void> {
  await apiSuspendTenant(tenantId);
}
