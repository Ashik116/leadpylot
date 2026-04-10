/**
 * PermissionGuard Component
 * Conditionally renders children based on user permissions
 */

'use client';

import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  permission?: string; // Single permission to check
  permissions?: string[]; // Multiple permissions to check
  requireAll?: boolean; // Require ALL permissions (default: ANY)
  fallback?: React.ReactNode; // Fallback content if no permission
  children: React.ReactNode;
}

/**
 * PermissionGuard component for conditional rendering based on permissions
 *
 * Usage Examples:
 *
 * Single permission:
 * <PermissionGuard permission="offer:create">
 *   <button>Create Offer</button>
 * </PermissionGuard>
 *
 * Multiple permissions (any one required):
 * <PermissionGuard permissions={['offer:read:all', 'offer:read:own']}>
 *   <OfferTable />
 * </PermissionGuard>
 *
 * Multiple permissions (all required):
 * <PermissionGuard
 *   permissions={['offer:delete:own', 'offer:update:own']}
 *   requireAll={true}
 * >
 *   <div>Can edit and delete own offers</div>
 * </PermissionGuard>
 *
 * Custom fallback:
 * <PermissionGuard
 *   permission="offer:delete:all"
 *   fallback={<div>Admin only</div>}
 * >
 *   <button>Delete All Offers</button>
 * </PermissionGuard>
 */
export const PermissionGuard = ({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGuardProps) => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
  } = usePermissions();

  // If permissions are loading, don't render anything or render fallback
  if (isLoading) {
    return <>{fallback}</>;
  }

  let hasAccess = false;

  // Check single permission
  if (permission) {
    hasAccess = hasPermission(permission);
  }
  // Check multiple permissions
  else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }
  // If no permission specified, allow access
  else {
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

/**
 * PermissionWrapper - Alias for PermissionGuard with requireAll=true by default
 * Useful for components that require multiple permissions
 */
export const PermissionWrapper = (props: Omit<PermissionGuardProps, 'requireAll'>) => {
  return <PermissionGuard {...props} requireAll={true} />;
};

export default PermissionGuard;

