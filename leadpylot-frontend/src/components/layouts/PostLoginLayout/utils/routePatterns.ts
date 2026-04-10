/**
 * Route Pattern Constants
 * Centralized route patterns for better maintainability
 */

export const ROUTE_PATTERNS = {
  // Lead routes
  LEADS_BASE: '/dashboards/leads',
  LEADS_ARCHIVED: '/dashboards/leads/archived',
  LEADS_PENDING: '/dashboards/leads/pending',
  LEADS_PROJECTS: '/dashboards/leads/projects',
  LEADS_DETAIL: /^\/dashboards\/leads\/[a-z0-9]/,
  
  // Dashboard routes
  MAILS: '/dashboards/mails',
  DOCUMENTS: '/dashboards/documents',
  TODO: '/dashboards/todo',
  LIVE_LEADS: '/dashboards/live-leads',
  AGENT_LIVE_LEAD: '/dashboards/agent-live-lead',
  RECYCLE_LEADS: '/dashboards/recycle-leads',
  AGENT_RECYCLE_LEAD: '/dashboards/agent-recycle-lead',
  HOLDS: '/dashboards/holds',
  TASKS_DETAIL: /^\/dashboards\/tasks\/[^/]+$/,
  
  // Projects
  PROJECTS_DETAIL: /^\/dashboards\/projects\/[^/]+$/,
  
  // Admin routes
  REPORTINGS: '/admin/reportings',
  USERS: '/admin/users',
  USERS_CREATE: /^\/admin\/users\/create\/?$/,
  BANKS: '/admin/banks',
  BANKS_DETAIL: /^\/admin\/banks\/[^/]+$/,
  SOURCES: '/admin/sources',
  STAGES: '/admin/stages',
  MAILSERVERS: '/admin/mailservers',
  VOIP_SERVERS: '/admin/voip-servers',
  SECURITY: '/admin/security',
  ADMIN_TODOS: '/admin/todos',
  EMAIL_TEMPLATES: '/admin/email-templates',
  BONUS_AMOUNT: '/admin/bonus-amount',
  PAYMENT_TERMS: '/admin/payment-terms',
  IMPORT_LEADS: '/admin/import-leads',
  RECENT_IMPORTS: '/admin/recent-imports',
  EMAIL_SYSTEM: '/admin/email-system',
  PDF: '/admin/pdf',
} as const;

/**
 * Check if pathname matches a pattern
 */
export function matchesPattern(pathname: string | null, pattern: string | RegExp): boolean {
  if (!pathname) return false;
  
  if (typeof pattern === 'string') {
    return pathname.toLowerCase().startsWith(pattern.toLowerCase());
  }
  
  return pattern.test(pathname);
}

/**
 * Get route type from pathname
 */
export function getRouteType(pathname: string | null): string | null {
  if (!pathname) return null;
  
  const path = pathname.toLowerCase();
  
  // Check specific patterns first
  if (matchesPattern(path, ROUTE_PATTERNS.LEADS_DETAIL)) return 'LEADS_DETAIL';
  if (matchesPattern(path, ROUTE_PATTERNS.PROJECTS_DETAIL)) return 'PROJECTS_DETAIL';
  if (matchesPattern(path, ROUTE_PATTERNS.USERS_CREATE)) return 'USERS_CREATE';
  if (matchesPattern(path, ROUTE_PATTERNS.BANKS_DETAIL)) return 'BANKS_DETAIL';
  if (matchesPattern(path, ROUTE_PATTERNS.TASKS_DETAIL)) return 'TASKS_DETAIL';
  
  // Check base patterns
  for (const [key, pattern] of Object.entries(ROUTE_PATTERNS)) {
    if (typeof pattern === 'string' && path.startsWith(pattern)) {
      return key;
    }
  }
  
  return null;
}

