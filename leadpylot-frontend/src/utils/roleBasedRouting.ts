import { Role } from '@/configs/navigation.config/auth.route.config';

/**
 * Get the initial dashboard route based on user role
 */
export function getRoleBasedEntryPath(role: Role | string): string {
  switch (role) {
    case Role.ADMIN:
    case 'Admin':
      return '/dashboards/leads';
    case Role.AGENT:
    case 'Agent':
      return '/dashboards/calendar';
    case Role.PROVIDER:
    case 'Provider':
      return '/dashboards/reclamations';
    default:
      // Default fallback to leads for unknown roles
      return '/dashboards/leads';
  }
}

/**
 * Check if a user has access to a specific route based on their role
 */
export function hasRoleAccess(userRole: Role | string, allowedRoles: (Role | string)[]): boolean {
  return allowedRoles.includes(userRole);
}
