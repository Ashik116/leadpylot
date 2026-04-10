/**
 * Roles Service
 * API calls for role and permission management
 */

import ApiService from './ApiService';

export interface Permission {
  _id: string;
  key: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  scope?: string | null;
  group: string;
  isSystem: boolean;
  active: boolean;
  displayOrder: number;
}

export interface PermissionGroup {
  name: string;
  permissions: Permission[];
  count: number;
}

export interface Role {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  color: string;
  icon: string;
  permissions: string[];
  sourceRole?: string | { _id: string; name: string; displayName: string };
  includePermissions: string[];
  excludePermissions: string[];
  parentRole?: string | null;
  hierarchyLevel: number;
  isSystem: boolean;
  active: boolean;
  templateId?: string;
  createdBy?: string;
  modifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  performedBy?: {
    _id: string;
    login: string;
    role: string;
  };
  performerSnapshot?: {
    userId: string;
    login: string;
    role: string;
  };
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  changes?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface PermissionTemplate {
  key: string;
  name: string;
  description: string;
  permissionCount: number;
}

export interface PaginatedResponse<T> {
  roles?: T[];
  logs?: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// ROLE ENDPOINTS
// ============================================

/**
 * Get all roles
 */
export async function apiGetRoles(params?: {
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}): Promise<PaginatedResponse<Role>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.includeInactive) queryParams.set('includeInactive', 'true');

  const url = `/roles${queryParams.toString() ? `?${queryParams}` : ''}`;
  return ApiService.fetchDataWithAxios({
    url,
    method: 'get',
  });
}

/**
 * Get role by ID
 */
export async function apiGetRoleById(id: string): Promise<Role> {
  return ApiService.fetchDataWithAxios({
    url: `/roles/${id}`,
    method: 'get',
  });
}

/**
 * Create new role
 */
export async function apiCreateRole(data: {
  name: string;
  displayName?: string;
  description?: string;
  color?: string;
  icon?: string;
  permissions?: string[];
  parentRole?: string;
}): Promise<Role> {
  return ApiService.fetchDataWithAxios({
    url: '/roles',
    method: 'post',
    data,
  });
}

/**
 * Create role from template
 */
export async function apiCreateRoleFromTemplate(data: {
  templateKey: string;
  name: string;
  displayName?: string;
}): Promise<Role> {
  return ApiService.fetchDataWithAxios({
    url: '/roles/from-template',
    method: 'post',
    data,
  });
}

/**
 * Update role
 */
export async function apiUpdateRole(
  id: string,
  data: Partial<Role>
): Promise<Role> {
  return ApiService.fetchDataWithAxios({
    url: `/roles/${id}`,
    method: 'put',
    data,
  });
}

/**
 * Delete role
 */
export async function apiDeleteRole(
  id: string
): Promise<{ success: boolean; message: string }> {
  return ApiService.fetchDataWithAxios({
    url: `/roles/${id}`,
    method: 'delete',
  });
}

/**
 * Clone role
 */
export async function apiCloneRole(
  id: string,
  name?: string
): Promise<Role> {
  return ApiService.fetchDataWithAxios({
    url: `/roles/${id}/clone`,
    method: 'post',
    data: { name },
  });
}

/**
 * Update role permissions
 */
export async function apiUpdateRolePermissions(
  id: string,
  permissions: string[]
): Promise<Role> {
  return ApiService.fetchDataWithAxios({
    url: `/roles/${id}/permissions`,
    method: 'put',
    data: { permissions },
  });
}

/**
 * Bulk add permissions to role
 */
export async function apiBulkAddPermissions(
  id: string,
  permissions: string[]
): Promise<Role> {
  return ApiService.fetchDataWithAxios({
    url: `/roles/${id}/permissions/bulk`,
    method: 'post',
    data: { permissions },
  });
}

/**
 * Bulk remove permissions from role
 */
export async function apiBulkRemovePermissions(
  id: string,
  permissions: string[]
): Promise<Role> {
  return ApiService.fetchDataWithAxios({
    url: `/roles/${id}/permissions/bulk`,
    method: 'delete',
    data: { permissions },
  });
}

/**
 * Refresh role caches
 */
export async function apiRefreshRoleCache(): Promise<{
  success: boolean;
  rolesRefreshed: number;
}> {
  return ApiService.fetchDataWithAxios({
    url: '/roles/refresh-cache',
    method: 'post',
  });
}

/**
 * Update include permissions for child role
 */
export async function apiUpdateIncludePermissions(
  id: string,
  permissions: string[]
): Promise<Role> {
  return ApiService.fetchDataWithAxios({
    url: `/roles/${id}/include-permissions`,
    method: 'put',
    data: { permissions },
  });
}

/**
 * Update exclude permissions for child role
 */
export async function apiUpdateExcludePermissions(
  id: string,
  permissions: string[]
): Promise<Role> {
  return ApiService.fetchDataWithAxios({
    url: `/roles/${id}/exclude-permissions`,
    method: 'put',
    data: { permissions },
  });
}

/**
 * Force recalculate permissions from source role
 */
export async function apiRecalculatePermissions(id: string): Promise<Role> {
  return ApiService.fetchDataWithAxios({
    url: `/roles/${id}/recalculate`,
    method: 'post',
  });
}

/**
 * Get child roles of a specific role
 */
export async function apiGetChildRoles(id: string): Promise<Role[]> {
  return ApiService.fetchDataWithAxios({
    url: `/roles/${id}/children`,
    method: 'get',
  });
}

// ============================================
// PERMISSION ENDPOINTS
// ============================================

/**
 * Get all permissions
 */
export async function apiGetPermissions(params?: {
  grouped?: boolean;
}): Promise<Permission[] | Record<string, Permission[]>> {
  const queryParams = new URLSearchParams();
  if (params?.grouped) queryParams.set('grouped', 'true');

  const url = `/permissions${queryParams.toString() ? `?${queryParams}` : ''}`;
  return ApiService.fetchDataWithAxios({
    url,
    method: 'get',
  });
}

/**
 * Get permission groups
 */
export async function apiGetPermissionGroups(params?: {
  search?: string;
}): Promise<PermissionGroup[]> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.set('search', params.search);

  const url = `/permissions/groups${queryParams.toString() ? `?${queryParams}` : ''}`;
  return ApiService.fetchDataWithAxios({
    url,
    method: 'get',
  });
}

/**
 * Seed permissions
 */
export async function apiSeedPermissions(): Promise<{
  created: number;
  existing: number;
  total: number;
}> {
  return ApiService.fetchDataWithAxios({
    url: '/permissions/seed',
    method: 'post',
  });
}

/**
 * Validate permission keys
 */
export async function apiValidatePermissions(permissions: string[]): Promise<{
  valid: boolean;
  validKeys: string[];
  invalidKeys: string[];
}> {
  return ApiService.fetchDataWithAxios({
    url: '/permissions/validate',
    method: 'post',
    data: { permissions },
  });
}

// ============================================
// TEMPLATE ENDPOINTS
// ============================================

/**
 * Get permission templates
 */
export async function apiGetPermissionTemplates(): Promise<PermissionTemplate[]> {
  return ApiService.fetchDataWithAxios({
    url: '/roles/permission-templates',
    method: 'get',
  });
}

/**
 * Get template details
 */
export async function apiGetTemplateDetails(
  key: string
): Promise<PermissionTemplate & { permissions: Permission[] }> {
  return ApiService.fetchDataWithAxios({
    url: `/roles/permission-templates/${key}`,
    method: 'get',
  });
}

// ============================================
// AUDIT ENDPOINTS
// ============================================

/**
 * Get audit logs
 */
export async function apiGetAuditLogs(params?: {
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedResponse<AuditLog>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.entityType) queryParams.set('entityType', params.entityType);
  if (params?.entityId) queryParams.set('entityId', params.entityId);
  if (params?.action) queryParams.set('action', params.action);
  if (params?.startDate) queryParams.set('startDate', params.startDate);
  if (params?.endDate) queryParams.set('endDate', params.endDate);

  const url = `/roles/audit-logs${queryParams.toString() ? `?${queryParams}` : ''}`;
  return ApiService.fetchDataWithAxios({
    url,
    method: 'get',
  });
}

/**
 * Get audit logs for a specific role
 */
export async function apiGetRoleAuditLogs(
  roleId: string,
  params?: { page?: number; limit?: number }
): Promise<PaginatedResponse<AuditLog>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  const url = `/roles/${roleId}/audit-logs${queryParams.toString() ? `?${queryParams}` : ''}`;
  return ApiService.fetchDataWithAxios({
    url,
    method: 'get',
  });
}
