import type { Domain } from '@/types/savedFilter.types';
import type { DomainFilter } from '@/stores/universalGroupingFilterStore';

/** Collect leaf condition triples from a domain tree (ignores | & ! tokens at top level). */
export function flattenDomainLeafFilters(domain: Domain | undefined | null): DomainFilter[] {
  if (!domain?.length) return [];
  const out: DomainFilter[] = [];

  const walk = (items: unknown): void => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (Array.isArray(item) && item.length === 3 && typeof item[0] === 'string') {
        out.push(item as DomainFilter);
        continue;
      }
      if (Array.isArray(item)) {
        walk(item);
      }
    }
  };

  walk(domain);
  return out;
}

function sortKeyForLeaf([field, op, val]: DomainFilter): string {
  return `${field}\0${String(op).toLowerCase()}\0${JSON.stringify(val)}`;
}

/** Canonical compare: order-independent on leaf triples, operator case-insensitive. */
export function areSavedDomainsEquivalent(
  a: Domain | undefined | null,
  b: Domain | undefined | null
): boolean {
  const leavesA = flattenDomainLeafFilters(a ?? undefined).map(
    (t) => [t[0], String(t[1]).trim().toLowerCase(), t[2]] as DomainFilter
  );
  const leavesB = flattenDomainLeafFilters(b ?? undefined).map(
    (t) => [t[0], String(t[1]).trim().toLowerCase(), t[2]] as DomainFilter
  );
  if (leavesA.length !== leavesB.length) return false;
  const sa = [...leavesA].sort((x, y) => sortKeyForLeaf(x).localeCompare(sortKeyForLeaf(y)));
  const sb = [...leavesB].sort((x, y) => sortKeyForLeaf(x).localeCompare(sortKeyForLeaf(y)));
  return sa.every((leaf, i) => sortKeyForLeaf(leaf) === sortKeyForLeaf(sb[i]!));
}
