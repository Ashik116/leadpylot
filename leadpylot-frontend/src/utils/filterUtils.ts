/**
 * Shared utilities for filter format conversion and deduplication.
 * Used across filtering and grouping system for consistent behavior.
 *
 * @see docs/GROUPING_AND_FILTERING_GUIDE.md
 */
import type { FilterRule } from '@/stores/filterChainStore';
import type { DomainFilter } from '@/stores/universalGroupingFilterStore';

/**
 * Maps FilterRule operator names (UI/metadata format) to API domain format.
 * Use when converting FilterRule[] to DomainFilter[] for API calls.
 * @see api-response.txt availableOperators for API-supported operators
 */
export const FILTER_OPERATOR_TO_API: Record<string, string> = {
  // Equality
  equals: '=',
  '=': '=',
  not_equals: '!=',
  '!=': '!=',
  // Comparison
  greater_than: '>',
  '>': '>',
  less_than: '<',
  '<': '<',
  greater_than_or_equal: '>=',
  '>=': '>=',
  less_than_or_equal: '<=',
  '<=': '<=',
  // String match
  contains: 'ilike',
  ilike: 'ilike',
  like: 'like',
  not_contains: 'not ilike',
  'not ilike': 'not ilike',
  // List membership
  in: 'in',
  not_in: 'not in',
  'not in': 'not in',
  // Range
  between: 'between',
  // Null/empty checks
  is_empty: 'is_empty',
  is_not_empty: 'is_not_empty',
  empty: 'is_empty',
  not_empty: 'is_not_empty',
};

/**
 * Convert FilterRule (object) to DomainFilter (tuple).
 * Passes operator through as-is (no mapping).
 * @param rule - Filter in object format
 * @returns Filter in domain tuple format [field, operator, value]
 */
export function toDomainFilter(rule: FilterRule): DomainFilter {
  return [rule.field, rule.operator, rule.value];
}

/**
 * Convert FilterRule to DomainFilter for API calls.
 * Normalizes operator (e.g. "equals" → "=") per FILTER_OPERATOR_TO_API.
 * Use at API call sites when sending filters to the backend.
 */
export function toDomainFilterForApi(rule: FilterRule): DomainFilter {
  const apiOperator = FILTER_OPERATOR_TO_API[rule.operator] ?? rule.operator;
  return [rule.field, apiOperator, rule.value];
}

/**
 * Convert DomainFilter (tuple) to FilterRule (object).
 * @param domain - Filter in domain tuple format [field, operator, value]
 * @returns Filter in object format
 */
export function toFilterRule(domain: DomainFilter): FilterRule {
  const [field, operator, value] = domain;
  return {
    field,
    operator,
    value: value as string | number | boolean,
  };
}

/**
 * Convert array of FilterRules to DomainFilters.
 */
export function toDomainFilters(rules: FilterRule[]): DomainFilter[] {
  return rules.map(toDomainFilter);
}

/**
 * Convert array of FilterRules to DomainFilters for API calls.
 * Uses operator normalization (equals→=, etc.).
 */
export function toDomainFiltersForApi(rules: FilterRule[]): DomainFilter[] {
  return rules.map(toDomainFilterForApi);
}

/**
 * Normalize DomainFilter[] for API calls (operator mapping).
 * Use when userDomainFilters or other DomainFilter[] may have UI operators (equals, in) instead of API operators (=, in).
 */
export function normalizeDomainFiltersForApi(filters: DomainFilter[]): DomainFilter[] {
  return toDomainFiltersForApi(toFilterRules(filters));
}

/**
 * Returns true when a domain filter is effectively a no-op.
 * Example: ["agent_id", "not in", []] means "include everything".
 */
export function isNeutralDomainFilter(filter: DomainFilter | null | undefined): boolean {
  if (!filter) return false;

  const [, operator, value] = filter;
  const isNotInOperator = operator === 'not in' || operator === 'not_in';

  return isNotInOperator && Array.isArray(value) && value.length === 0;
}

/**
 * Removes no-op domain filters while preserving all meaningful filters.
 */
export function getMeaningfulDomainFilters(filters: DomainFilter[] | null | undefined): DomainFilter[] {
  return (filters || []).filter((filter) => !isNeutralDomainFilter(filter));
}

/**
 * Returns true when at least one meaningful domain filter exists.
 */
export function hasMeaningfulDomainFilters(filters: DomainFilter[] | null | undefined): boolean {
  return getMeaningfulDomainFilters(filters).length > 0;
}

/**
 * Convert array of DomainFilters to FilterRules.
 */
export function toFilterRules(domains: DomainFilter[]): FilterRule[] {
  return domains.map(toFilterRule);
}

/**
 * Check if two filters match (same field, operator, value).
 * Handles both FilterRule and DomainFilter formats.
 */
export function filtersMatch(f1: FilterRule | DomainFilter, f2: FilterRule | DomainFilter): boolean {
  const [field1, op1, val1] = Array.isArray(f1) ? f1 : [f1.field, f1.operator, f1.value];
  const [field2, op2, val2] = Array.isArray(f2) ? f2 : [f2.field, f2.operator, f2.value];
  return field1 === field2 && op1 === op2 && JSON.stringify(val1) === JSON.stringify(val2);
}

/**
 * Deduplicate filters by field+operator. For same field+operator, keeps the last occurrence.
 * Use when combining filters from multiple sources to avoid redundant API params.
 *
 * @param filters - Array of filters (FilterRule or DomainFilter)
 * @returns Deduplicated array
 */
export function deduplicateFilters<T extends FilterRule | DomainFilter>(filters: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (let i = filters.length - 1; i >= 0; i--) {
    const f = filters[i];
    if (!f) continue;
    const field = Array.isArray(f) ? f[0] : f.field;
    const operator = Array.isArray(f) ? f[1] : f.operator;
    if (!field) continue;
    const key = `${field}|${operator}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.unshift(f);
    }
  }
  return result;
}

/**
 * Deduplicate DomainFilters by field+operator+value for stricter deduplication.
 * Use when you want to remove exact duplicates only.
 */
export function deduplicateDomainFilters(filters: DomainFilter[]): DomainFilter[] {
  const seen = new Set<string>();
  const result: DomainFilter[] = [];
  for (const f of filters) {
    if (!f || !f[0]) continue;
    const key = `${f[0]}|${f[1]}|${JSON.stringify(f[2])}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(f);
    }
  }
  return result;
}

/**
 * Convert DomainFilters to JSON string for API params.
 * Returns undefined when empty to avoid sending empty filter params.
 * Uses normalizeDomainFiltersForApi for operator mapping.
 *
 * @see docs/GROUPING_AND_FILTERING_GUIDE.md
 */
export function toDomainFiltersJson(filters: DomainFilter[]): string | undefined {
  if (!filters?.length) return undefined;
  return JSON.stringify(normalizeDomainFiltersForApi(filters));
}

/**
 * Extract equality filters (operator === '=') as query params.
 * Use for defaultFiltersAsQueryParams and similar URL/query param building.
 *
 * @see docs/GROUPING_AND_FILTERING_GUIDE.md
 */
export function filtersToQueryParams(
  filters: FilterRule[] | null | undefined
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  if (!filters?.length) return params;
  for (const f of filters) {
    if (f.operator === '=' && f.field && f.value !== null && f.value !== undefined) {
      params[f.field] = f.value;
    }
  }
  return params;
}

/**
 * Build domain filters for admin dashboards (Users, Projects).
 * Combines user domain filters (normalized) with filter chain domain filters.
 *
 * @see docs/GROUPING_AND_FILTERING_GUIDE.md
 */
export function buildDomainFiltersForAdminPage(
  buildGroupedLeadsFilters: () => FilterRule[],
  userDomainFilters: DomainFilter[] | null | undefined
): DomainFilter[] {
  const user = normalizeDomainFiltersForApi(userDomainFilters || []);
  const chain = toDomainFiltersForApi(buildGroupedLeadsFilters());
  return [...user, ...chain];
}

/**
 * Build domain filters from filter chain only (no user filters).
 * Use when only the grouped leads filters are needed.
 *
 * @see docs/GROUPING_AND_FILTERING_GUIDE.md
 */
export function buildDomainFiltersFromChain(
  buildGroupedLeadsFilters: () => FilterRule[]
): DomainFilter[] {
  return toDomainFiltersForApi(buildGroupedLeadsFilters());
}
