/**
 * Tenant Hook
 * 
 * Provides access to tenant configuration throughout the application.
 */

import { useMemo } from 'react';
import TENANT_CONFIG, { 
  TenantConfig, 
  TenantFeatures, 
  isFeatureEnabled, 
  isRoleAllowed,
  canUserAccessTenant,
} from '@/configs/tenant.config';

interface UseTenantReturn {
  // Tenant configuration
  tenant: TenantConfig;
  tenantId: string;
  tenantType: TenantConfig['type'];
  tenantName: string;
  
  // Feature checks
  features: TenantFeatures;
  isFeatureEnabled: (feature: keyof TenantFeatures) => boolean;
  
  // Role checks
  allowedRoles: string[];
  isRoleAllowed: (role: string) => boolean;
  canUserAccess: (userRole: string) => boolean;
  
  // Branding
  branding: TenantConfig['branding'];
  
  // Helpers
  isAgentTenant: boolean;
  isManagerTenant: boolean;
  isAdminTenant: boolean;
}

/**
 * Hook to access tenant configuration
 * 
 * @example
 * const { tenant, isFeatureEnabled, isRoleAllowed } = useTenant();
 * 
 * if (isFeatureEnabled('banking')) {
 *   // Show banking features
 * }
 * 
 * if (!isRoleAllowed(user.role)) {
 *   // Redirect to access denied
 * }
 */
export const useTenant = (): UseTenantReturn => {
  return useMemo(() => ({
    // Tenant configuration
    tenant: TENANT_CONFIG,
    tenantId: TENANT_CONFIG.id,
    tenantType: TENANT_CONFIG.type,
    tenantName: TENANT_CONFIG.name,
    
    // Feature checks
    features: TENANT_CONFIG.features,
    isFeatureEnabled,
    
    // Role checks
    allowedRoles: TENANT_CONFIG.allowedRoles,
    isRoleAllowed,
    canUserAccess: canUserAccessTenant,
    
    // Branding
    branding: TENANT_CONFIG.branding,
    
    // Helpers
    isAgentTenant: TENANT_CONFIG.type === 'agent',
    isManagerTenant: TENANT_CONFIG.type === 'manager',
    isAdminTenant: TENANT_CONFIG.type === 'admin',
  }), []);
};

export default useTenant;
