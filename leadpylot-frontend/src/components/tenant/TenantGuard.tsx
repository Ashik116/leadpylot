'use client';

/**
 * Tenant Guard Component
 * 
 * Protects routes/components based on tenant configuration.
 * Can check for features, roles, or both.
 */

import { ReactNode } from 'react';
import { useTenant } from '@/hooks/useTenant';
import type { TenantFeatures } from '@/configs/tenant.config';

interface TenantGuardProps {
  children: ReactNode;
  
  /** Required feature to access this content */
  feature?: keyof TenantFeatures;
  
  /** Required features (all must be enabled) */
  features?: (keyof TenantFeatures)[];
  
  /** Any of these features enables access */
  anyFeature?: (keyof TenantFeatures)[];
  
  /** Required role to access this content */
  role?: string;
  
  /** User's current role (for role checking) */
  userRole?: string;
  
  /** Fallback component when access is denied */
  fallback?: ReactNode;
  
  /** Hide instead of showing fallback */
  hideOnDenied?: boolean;
}

/**
 * Guard component that shows children only if tenant conditions are met
 * 
 * @example
 * // Feature-based guard
 * <TenantGuard feature="banking">
 *   <BankingDashboard />
 * </TenantGuard>
 * 
 * // Multiple features (all required)
 * <TenantGuard features={['banking', 'reporting']}>
 *   <FinancialReports />
 * </TenantGuard>
 * 
 * // Any feature (at least one required)
 * <TenantGuard anyFeature={['adminPanel', 'userManagement']}>
 *   <AdminTools />
 * </TenantGuard>
 * 
 * // Role-based guard
 * <TenantGuard userRole={user.role}>
 *   <ProtectedContent />
 * </TenantGuard>
 */
export const TenantGuard = ({
  children,
  feature,
  features,
  anyFeature,
  role,
  userRole,
  fallback = null,
  hideOnDenied = false,
}: TenantGuardProps) => {
  const { isFeatureEnabled, isRoleAllowed, canUserAccess } = useTenant();
  
  let hasAccess = true;
  
  // Check single feature
  if (feature) {
    hasAccess = hasAccess && isFeatureEnabled(feature);
  }
  
  // Check multiple features (all must be enabled)
  if (features && features.length > 0) {
    hasAccess = hasAccess && features.every(f => isFeatureEnabled(f));
  }
  
  // Check any feature (at least one must be enabled)
  if (anyFeature && anyFeature.length > 0) {
    hasAccess = hasAccess && anyFeature.some(f => isFeatureEnabled(f));
  }
  
  // Check specific role
  if (role) {
    hasAccess = hasAccess && isRoleAllowed(role);
  }
  
  // Check user's role against tenant allowed roles
  if (userRole) {
    hasAccess = hasAccess && canUserAccess(userRole);
  }
  
  if (!hasAccess) {
    if (hideOnDenied) {
      return null;
    }
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

/**
 * HOC version of TenantGuard
 */
export const withTenantGuard = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  guardProps: Omit<TenantGuardProps, 'children'>
) => {
  const WithTenantGuard = (props: P) => (
    <TenantGuard {...guardProps}>
      <WrappedComponent {...props} />
    </TenantGuard>
  );
  
  WithTenantGuard.displayName = `withTenantGuard(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithTenantGuard;
};

export default TenantGuard;
