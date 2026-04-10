/**
 * Centralized constants for UnifiedDashboard.
 */

export const GROUPED_SORT_BY = 'count' as const;
export const GROUPED_SORT_ORDER = 'desc' as const;
export const GROUPED_OFFERS_PAGE = 1;
export const GROUPED_OFFERS_PAGE_SIZE = 50;

export const VALID_PROGRESS_FILTERS = [
  'opening',
  'confirmation',
  'payment',
  'netto',
  'netto1',
  'netto2',
  'lost',
] as const;

export const EXPECTED_MULTI_LEVEL_GROUPING = ['project', 'agent', 'updatedAt'] as const;
