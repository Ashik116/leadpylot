/**
 * Dashboard utility functions
 * Centralized helpers for dashboard type checks and constants
 */

// Progress dashboard types (openings, confirmations, payments, netto variants, lost, all)
export const PROGRESS_DASHBOARD_TYPES = [
  'opening',
  'confirmation',
  'payment',
  'netto',
  'netto1',
  'netto2',
  'lost',
  'all',
] as const;

export type ProgressDashboardType = (typeof PROGRESS_DASHBOARD_TYPES)[number];

/**
 * Check if a dashboard type is a progress page
 * Progress pages use /offers/progress API endpoint
 */
export const isProgressDashboardType = (type: string | undefined | null): boolean => {
  if (!type) return false;
  return PROGRESS_DASHBOARD_TYPES.includes(type as ProgressDashboardType);
};

/**
 * Check if an entity type represents a progress page
 * Used for navigation store sync logic
 */
export const isProgressEntityType = (entityType: string | undefined | null): boolean => {
  if (!entityType) return false;
  const progressEntityTypes = ['offer', 'opening', 'confirmation', 'payment', 'netto'];
  return progressEntityTypes.includes(entityType.toLowerCase());
};

/**
 * All dashboard types including non-progress types
 */
export const ALL_DASHBOARD_TYPES = [
  'offer',
  'opening',
  'confirmation',
  'payment',
  'netto',
  'netto1',
  'netto2',
  'lost',
  'all',
  'lead',
] as const;

export type DashboardTypeValue = (typeof ALL_DASHBOARD_TYPES)[number];

