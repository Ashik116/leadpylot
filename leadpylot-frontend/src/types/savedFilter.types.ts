/**
 * Saved filters — configuration service `/saved-filters`
 * @see api-response.txt
 */

export type DomainOperator =
  | '='
  | '!='
  | 'in'
  | 'not in'
  | 'not_in'
  | 'notin'
  | '>'
  | '<'
  | '>='
  | '<='
  | 'contains'
  | 'like'
  | 'ilike'
  | 'equals'
  | string;

export type DomainLeaf = [field: string, operator: string, value: unknown];

export type Domain = Array<'|' | '&' | '!' | DomainLeaf | Domain>;

export type SavedFilterPresetType = 'filter' | 'grouping';

export interface SavedFilter {
  _id: string;
  user_id: string;
  title: string;
  page: string;
  /** `filter` (domain rules) or `grouping` (groupBy only). Omitted in older API responses — treat as `filter` when `domain` is present. */
  type?: SavedFilterPresetType;
  description?: string;
  domain?: Domain;
  groupBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedFilterListMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** POST /saved-filters — use `type: 'filter'` + `domain`, or `type: 'grouping'` + `groupBy` (mutually exclusive). */
export interface CreateSavedFilterInput {
  title: string;
  page: string;
  type?: SavedFilterPresetType;
  description?: string;
  domain?: Domain;
  groupBy?: string[];
}

/** PUT /saved-filters/:id — title and page required; optionally type, description, domain, and/or groupBy (see api-response.txt). */
export interface UpdateSavedFilterInput {
  title: string;
  page: string;
  type?: SavedFilterPresetType;
  description?: string;
  domain?: Domain;
  groupBy?: string[];
}

export interface SavedFiltersListQuery {
  /** Pagination page index (1-based). @see api-response.txt */
  page?: number;
  /** @deprecated Use `page` for list pagination. */
  pageNum?: number;
  limit?: number;
  /** Exact type filter: `filter` or `grouping`. */
  type?: SavedFilterPresetType;
  search?: string;
  sortBy?: 'title' | 'page' | 'type' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/** True when preset stores filter rules (`domain`), including legacy documents with no `type` but a domain. */
export function isSavedFilterTypeFilter(p: Pick<SavedFilter, 'type' | 'domain'>): boolean {
  const t = p.type ?? 'filter';
  return t === 'filter' && Array.isArray(p.domain);
}

/** True when preset is a saved grouping layout (`type=grouping` + `groupBy`). */
export function isSavedFilterGroupingPreset(p: Pick<SavedFilter, 'type' | 'groupBy'>): boolean {
  return p.type === 'grouping' && Array.isArray(p.groupBy) && p.groupBy.length > 0;
}

export interface SavedFiltersSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: SavedFilterListMeta;
  error?: never;
}

export interface SavedFiltersErrorEnvelope {
  success: false;
  error: string;
  data?: never;
}

export type SavedFiltersEnvelope<T> = SavedFiltersSuccessEnvelope<T> | SavedFiltersErrorEnvelope;

export interface DeleteSavedFilterResponse {
  success: true;
  id: string;
}

/** Map UI entity type to saved-filters `page` key (e.g. Lead → lead). */
export function entityTypeToFilterPage(entityType: string): string {
  const map: Record<string, string> = {
    Lead: 'lead',
    Offer: 'offer',
    User: 'user',
    Team: 'team',
    Opening: 'opening',
    Bank: 'bank',
    CashflowEntry: 'cashflow_entry',
    CashflowTransaction: 'cashflow_transaction',
    Reclamation: 'reclamation',
  };
  return map[entityType] ?? entityType.toLowerCase().replace(/\s+/g, '_');
}
