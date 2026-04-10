/**
 * Centralized configuration for pages that support filtering and grouping.
 *
 * Used by:
 * - SearchListAndGlobalSearch: Filter dropdown button visibility
 * - FilterTags: Filter tags display
 *
 * Add new pages here to enable grouping + filtering across the entire system.
 */
export const PAGES_WITH_FILTER_AND_GROUPING = [
  '/dashboards/leads',
  '/dashboards/leads-bank',
  '/dashboards/leads/pending-leads',
  '/dashboards/leads/archived',
  '/dashboards/live-leads',
  '/dashboards/recycle-leads',
  '/dashboards/todo',
  '/dashboards/projects',
  '/dashboards/holds',
  '/dashboards/termin',
  '/dashboards/offers',
  '/dashboards/out-offers',
  '/dashboards/openings',
  '/dashboards/confirmation',
  '/dashboards/payment',
  '/dashboards/payment-vouchers',
  '/dashboards/netto',
  '/dashboards/reclamations',
  '/dashboards/cashflow',
  '/admin/users',
  '/admin/banks',
] as const;

export type FilterPagePath = (typeof PAGES_WITH_FILTER_AND_GROUPING)[number];

/**
 * Check if the current pathname supports filtering and grouping UI.
 * Excludes lead detail pages (e.g. /dashboards/leads/[id]).
 */
export function isFilterAndGroupingPage(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  // Exclude lead details page - filter tags only on list pages
  const isLeadDetailsPage = pathname.match(/^\/dashboards\/leads\/[a-f0-9]{24}$/i);
  if (isLeadDetailsPage) return false;
  return PAGES_WITH_FILTER_AND_GROUPING.some((page) => pathname.startsWith(page));
}
