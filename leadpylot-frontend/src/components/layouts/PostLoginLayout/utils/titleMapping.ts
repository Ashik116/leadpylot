/**
 * Title Mapping Configuration
 * Using HashMap for O(1) lookup performance
 */

// HashMap for exact route to title mapping - O(1) lookup!
const ROUTE_TITLE_MAP = new Map<string, string>([
  // Leads routes (check most specific first in iteration order)
  ['/dashboards/leads/archived', 'Archived Leads'],
  ['/dashboards/leads/pending-leads', 'Pending Leads'],
  ['/dashboards/leads/projects', 'Project Leads'],
  ['/dashboards/leads', 'Leads'],

  // Dashboard routes
  ['/dashboards/mails', 'Mails'],
  ['/dashboards/documents', 'Documents'],
  ['/dashboards/todo', 'Todo'],
  ['/dashboards/calendar', 'Calendar'],
  ['/dashboards/live-leads', 'Live Leads'],
  ['/dashboards/agent-live-lead', 'Live Lead'],
  ['/dashboards/recycle-leads', 'Recycle Leads'],
  ['/dashboards/agent-recycle-lead', 'Recycle Lead'],
  ['/dashboards/holds', 'Hold Leads'],
  ['/dashboards/openings', 'Openings'],
  ['/dashboards/offers', 'Offers'],
  ['/dashboards/confirmations', 'Confirmations'],
  ['/dashboards/payments', 'Payments'],

  // Admin routes
  ['/admin/reportings', 'Agent Performance Reports'],
  ['/admin/users', 'Users Management'],
  ['/admin/users/create', 'Create User'],
  ['/admin/banks', 'Banks Management'],
  ['/admin/sources', 'Sources Management'],
  ['/admin/settings', 'Bot Setting'],
  ['/admin/stages', 'Stages Management'],
  ['/admin/mailservers', 'Mail Servers'],
  ['/admin/voip-servers', 'VOIP Servers'],
  ['/admin/security', 'Security Dashboard'],
  ['/admin/todos', 'Admin Todos'],
  ['/admin/email-templates', 'Email Templates'],
  ['/admin/bonus-amount', 'Bonus Amounts'],
  ['/admin/payment-terms', 'Payment Terms'],
  ['/admin/import-leads', 'Import Leads'],
  ['/admin/recent-imports', 'Recent Imports'],
  ['/admin/email-system', 'Email System'],
  ['/admin/pdf', 'PDF Templates'],
]);

// Pattern matchers for dynamic routes (sorted by specificity)
interface RoutePattern {
  pattern: RegExp;
  title: string;
}

const DYNAMIC_ROUTE_PATTERNS: RoutePattern[] = [
  { pattern: /^\/dashboards\/leads\/[a-f0-9]{24}$/i, title: 'Lead Details' },
  { pattern: /^\/dashboards\/tasks\/[^/]+$/, title: 'Task Details' },
  { pattern: /^\/dashboards\/projects\/[^/]+$/, title: 'Project Details' },
  { pattern: /^\/admin\/users\/[^/]+$/, title: 'User Details' },
  { pattern: /^\/admin\/banks\/[^/]+$/, title: 'Bank Details' },
];

/**
 * Get title from pathname using HashMap for O(1) lookup
 *
 * Performance:
 * - Exact routes: O(1) via HashMap
 * - Dynamic routes: O(k) where k < 10 patterns
 * - Fallback: O(1)
 */
export function getTitleFromPathname(pathname: string | null): string | undefined {
  if (!pathname) return undefined;

  const path = pathname.toLowerCase();

  // STEP 1: O(1) HashMap lookup for exact routes
  const exactMatch = ROUTE_TITLE_MAP.get(path);
  if (exactMatch) return exactMatch;

  // STEP 2: O(k) pattern matching for dynamic routes (k is small < 10)
  for (const { pattern, title } of DYNAMIC_ROUTE_PATTERNS) {
    if (pattern.test(path)) {
      return title;
    }
  }

  // STEP 3: Fallback - capitalize last segment
  const segments = path.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  if (!lastSegment) return undefined;

  // Convert kebab-case and snake_case to Title Case
  return lastSegment.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Utility to add custom route at runtime
 */
export function addRoute(path: string, title: string): void {
  ROUTE_TITLE_MAP.set(path.toLowerCase(), title);
}

/**
 * Utility to add dynamic pattern at runtime
 */
export function addDynamicPattern(pattern: RegExp, title: string): void {
  DYNAMIC_ROUTE_PATTERNS.push({ pattern, title });
}
