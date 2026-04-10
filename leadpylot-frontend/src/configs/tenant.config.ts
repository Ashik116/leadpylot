/**
 * Tenant Configuration
 * 
 * This configuration controls tenant-specific behavior.
 * Each tenant deployment uses different environment variables.
 * 
 * ZERO-TRUST ARCHITECTURE:
 * - Frontend only knows the Tenant Proxy URL (or Gateway URL in direct mode)
 * - Core Backend IP is never exposed to frontend
 */

export type TenantType = 'agent' | 'manager' | 'admin';

export interface TenantFeatures {
  // Core features
  leads: boolean;
  offers: boolean;
  todos: boolean;
  emails: boolean;
  calls: boolean;
  
  // Advanced features
  adminPanel: boolean;
  banking: boolean;
  reporting: boolean;
  userManagement: boolean;
  cashflow: boolean;
  pdfTemplates: boolean;
  
  // System features
  notifications: boolean;
  documents: boolean;
  search: boolean;
}

export interface TenantConfig {
  // Tenant identification
  id: string;
  name: string;
  type: TenantType;
  domain: string;
  
  // Allowed user roles for this tenant
  allowedRoles: string[];
  
  // Feature flags
  features: TenantFeatures;
  
  // UI customization
  branding: {
    logo?: string;
    primaryColor?: string;
    appName?: string;
  };
}

/**
 * Default feature sets for each tenant type
 */
const TENANT_TYPE_FEATURES: Record<TenantType, TenantFeatures> = {
  agent: {
    leads: true,
    offers: true,
    todos: true,
    emails: true,
    calls: true,
    adminPanel: false,
    banking: false,
    reporting: false,
    userManagement: false,
    cashflow: false,
    pdfTemplates: false,
    notifications: true,
    documents: true,
    search: true,
  },
  manager: {
    leads: true,
    offers: true,
    todos: true,
    emails: true,
    calls: true,
    adminPanel: false,
    banking: true,
    reporting: true,
    userManagement: false,
    cashflow: true,
    pdfTemplates: true,
    notifications: true,
    documents: true,
    search: true,
  },
  admin: {
    leads: true,
    offers: true,
    todos: true,
    emails: true,
    calls: true,
    adminPanel: true,
    banking: true,
    reporting: true,
    userManagement: true,
    cashflow: true,
    pdfTemplates: true,
    notifications: true,
    documents: true,
    search: true,
  },
};

/**
 * Default allowed roles for each tenant type
 */
const TENANT_TYPE_ROLES: Record<TenantType, string[]> = {
  agent: ['Agent'],
  manager: ['Manager', 'Banker'],
  admin: ['Admin'],
};

/**
 * Get tenant type from environment
 */
const getTenantType = (): TenantType => {
  const type = process.env.NEXT_PUBLIC_TENANT_TYPE as TenantType;
  if (type && ['agent', 'manager', 'admin'].includes(type)) {
    return type;
  }
  // Default to admin for backward compatibility
  return 'admin';
};

/**
 * Parse feature overrides from environment
 */
const getFeatureOverrides = (): Partial<TenantFeatures> => {
  const overrides: Partial<TenantFeatures> = {};
  
  // Check for explicit feature flags
  if (process.env.NEXT_PUBLIC_FEATURE_ADMIN !== undefined) {
    overrides.adminPanel = process.env.NEXT_PUBLIC_FEATURE_ADMIN === 'true';
  }
  if (process.env.NEXT_PUBLIC_FEATURE_BANKING !== undefined) {
    overrides.banking = process.env.NEXT_PUBLIC_FEATURE_BANKING === 'true';
  }
  if (process.env.NEXT_PUBLIC_FEATURE_REPORTING !== undefined) {
    overrides.reporting = process.env.NEXT_PUBLIC_FEATURE_REPORTING === 'true';
  }
  if (process.env.NEXT_PUBLIC_FEATURE_USER_MANAGEMENT !== undefined) {
    overrides.userManagement = process.env.NEXT_PUBLIC_FEATURE_USER_MANAGEMENT === 'true';
  }
  if (process.env.NEXT_PUBLIC_FEATURE_CASHFLOW !== undefined) {
    overrides.cashflow = process.env.NEXT_PUBLIC_FEATURE_CASHFLOW === 'true';
  }
  if (process.env.NEXT_PUBLIC_FEATURE_CALLS !== undefined) {
    overrides.calls = process.env.NEXT_PUBLIC_FEATURE_CALLS === 'true';
  }
  
  return overrides;
};

/**
 * Build the tenant configuration from environment variables
 */
const buildTenantConfig = (): TenantConfig => {
  const tenantType = getTenantType();
  const defaultFeatures = TENANT_TYPE_FEATURES[tenantType];
  const featureOverrides = getFeatureOverrides();
  
  // Get allowed roles from environment or use defaults
  const allowedRolesEnv = process.env.NEXT_PUBLIC_ALLOWED_ROLES;
  const allowedRoles = allowedRolesEnv 
    ? allowedRolesEnv.split(',').map(r => r.trim())
    : TENANT_TYPE_ROLES[tenantType];
  
  return {
    id: process.env.NEXT_PUBLIC_TENANT_ID || 'default',
    name: process.env.NEXT_PUBLIC_TENANT_NAME || 'LeadPylot',
    type: tenantType,
    domain: process.env.NEXT_PUBLIC_TENANT_DOMAIN || 'localhost',
    allowedRoles,
    features: {
      ...defaultFeatures,
      ...featureOverrides,
    },
    branding: {
      logo: process.env.NEXT_PUBLIC_TENANT_LOGO,
      primaryColor: process.env.NEXT_PUBLIC_TENANT_PRIMARY_COLOR,
      appName: process.env.NEXT_PUBLIC_TENANT_APP_NAME || 'LeadPylot',
    },
  };
};

/**
 * The tenant configuration singleton
 */
export const TENANT_CONFIG = buildTenantConfig();

/**
 * Check if a feature is enabled for the current tenant
 */
export const isFeatureEnabled = (feature: keyof TenantFeatures): boolean => {
  return TENANT_CONFIG.features[feature] === true;
};

/**
 * Check if a role is allowed for the current tenant
 */
export const isRoleAllowed = (role: string): boolean => {
  // Admin tenant allows all roles
  if (TENANT_CONFIG.type === 'admin') return true;
  
  return TENANT_CONFIG.allowedRoles.some(
    allowedRole => allowedRole.toLowerCase() === role.toLowerCase()
  );
};

/**
 * Check if user can access the current tenant
 */
export const canUserAccessTenant = (userRole: string): boolean => {
  return isRoleAllowed(userRole);
};

/**
 * Get tenant-specific navigation items
 * Filters navigation based on enabled features
 */
export const filterNavigationByTenant = <T extends { feature?: keyof TenantFeatures }>(
  items: T[]
): T[] => {
  return items.filter(item => {
    if (!item.feature) return true;
    return isFeatureEnabled(item.feature);
  });
};

export default TENANT_CONFIG;
