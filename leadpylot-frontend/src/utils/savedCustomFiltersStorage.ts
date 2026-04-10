import type { DomainFilter } from '@/stores/universalGroupingFilterStore';
import type { CreateSavedFilterInput, Domain } from '@/types/savedFilter.types';
import { entityTypeToFilterPage } from '@/types/savedFilter.types';

const LS_PREFIX = 'leadpylot.savedCustomFilters.v1';

export { entityTypeToFilterPage };

/** Exact body shape for POST /saved-filters (same as CreateSavedFilterInput). */
export type SavedFilterApiPayload = CreateSavedFilterInput;

export type SavedCustomFilterRecord = {
  /** Local id (uuid) until server returns _id */
  id: string;
  /** Set after successful API create */
  _id?: string;
  title: string;
  page: string;
  domain: DomainFilter[];
  createdAt: string;
  entityType: string;
  tableId: string | null;
  description?: string;
};

export function savedRecordToCreatePayload(record: SavedCustomFilterRecord): CreateSavedFilterInput {
  return {
    title: record.title,
    page: record.page,
    type: 'filter',
    domain: record.domain as Domain,
    ...(record.description ? { description: record.description } : {}),
  };
}

export function getSavedCustomFiltersStorageKey(
  userId: string | undefined,
  entityType: string,
  tableId?: string | null
): string {
  const userPart = userId || 'anonymous';
  const tablePart = tableId ?? 'default';
  return `${LS_PREFIX}:${userPart}:${entityType}:${tablePart}`;
}

function normalizeRawRecord(raw: unknown): SavedCustomFilterRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== 'string') return null;

  const domain = (item.domain ?? item.filterBody ?? item.domainFilters) as unknown;
  if (!Array.isArray(domain)) return null;

  const title =
    (typeof item.title === 'string' && item.title) ||
    (typeof item.filterTitle === 'string' && item.filterTitle);
  if (!title) return null;

  const page =
    (typeof item.page === 'string' && item.page) ||
    (typeof item.filterPage === 'string' && item.filterPage) ||
    (typeof item.entityType === 'string' ? entityTypeToFilterPage(String(item.entityType)) : 'lead');

  const entityType = typeof item.entityType === 'string' ? item.entityType : 'Lead';
  const tableId = item.tableId === null || item.tableId === undefined ? null : String(item.tableId);
  const createdAt =
    typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString();
  const _id = typeof item._id === 'string' ? item._id : undefined;
  const description = typeof item.description === 'string' ? item.description : undefined;

  return {
    id: item.id,
    _id,
    title,
    page,
    domain: domain as DomainFilter[],
    createdAt,
    entityType,
    tableId,
    ...(description !== undefined ? { description } : {}),
  };
}

export function loadSavedCustomFilters(key: string): SavedCustomFilterRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => normalizeRawRecord(row))
      .filter((item): item is SavedCustomFilterRecord => item !== null);
  } catch {
    return [];
  }
}

export function appendSavedCustomFilter(key: string, record: SavedCustomFilterRecord): void {
  const existing = loadSavedCustomFilters(key);
  localStorage.setItem(key, JSON.stringify([...existing, record]));
}
