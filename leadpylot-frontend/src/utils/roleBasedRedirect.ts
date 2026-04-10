import { Role } from '@/configs/navigation.config/auth.route.config';
import { ADMIN, USER as AGENT, PROVIDER } from '@/constants/roles.constant';

/**
 * Get the appropriate redirect path based on user role
 */
export function getRoleBasedRedirectPath(role: Role | string): string {
  switch (role) {
    case Role.ADMIN:
    case ADMIN:
      // Admin users get redirected to leads dashboard (as usual)
      return '/dashboards/leads';

    case Role.AGENT:
    case AGENT:
      // Agent users get redirected to projects dashboard
      return '/dashboards/projects';

    case Role.PROVIDER:
    case PROVIDER:
      // Provider users get redirected to reclamations dashboard
      return '/dashboards/reclamations';

    default:
      // Fallback to the default leads dashboard for any unrecognized roles
      return '/dashboards/leads';
  }
}

/**
 * Type guard to check if a user has admin privileges
 */
export function isAdmin(role: Role | string): boolean {
  return role === Role.ADMIN || role === ADMIN;
}

/**
 * Type guard to check if a user is an agent
 */
export function isAgent(role: Role | string): boolean {
  return role === Role.AGENT || role === AGENT;
}

/**
 * Type guard to check if a user is a provider
 */
export function isProvider(role: Role | string): boolean {
  return role === Role.PROVIDER || role === PROVIDER;
}
