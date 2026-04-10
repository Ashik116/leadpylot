export type ActivityItem = {
  key: string;
  title: string;
  status: 'done' | 'empty';
  detail?: string;
  priority: number;
  count?: number;
};

type ToolExchange = {
  name?: unknown;
  arguments?: unknown;
  result?: unknown;
};

const MAX_VISIBLE_ITEMS = 5;

function safeParseResult(result: unknown): { parsed: unknown; parseFailed: boolean } {
  if (result === null || result === undefined) return { parsed: null, parseFailed: false };
  if (typeof result === 'object') return { parsed: result, parseFailed: false };
  if (typeof result !== 'string') return { parsed: result, parseFailed: false };

  try {
    return { parsed: JSON.parse(result), parseFailed: false };
  } catch {
    return { parsed: result, parseFailed: true };
  }
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function pickCount(parsed: unknown): number | undefined {
  const obj = toRecord(parsed);
  if (!obj) return undefined;

  const direct = obj.count;
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;

  const total = obj.total;
  if (typeof total === 'number' && Number.isFinite(total)) return total;

  const results = obj.results;
  if (Array.isArray(results)) return results.length;

  return undefined;
}

function getCollectionLabel(collection: string): { key: string; title: string; priority: number } {
  switch (collection) {
    case 'emails':
      return { key: 'emails', title: 'Recent communication checked', priority: 2 };
    case 'todos':
      return { key: 'todos', title: 'Tasks and tickets reviewed', priority: 3 };
    case 'tasks':
      return { key: 'tasks', title: 'Board tasks reviewed', priority: 3 };
    case 'appointments':
      return { key: 'appointments', title: 'Appointments checked', priority: 4 };
    case 'activities':
      return { key: 'activities', title: 'Recent activity analyzed', priority: 5 };
    case 'all_documents':
      return { key: 'documents', title: 'Documents reviewed', priority: 5 };
    default:
      return { key: `collection:${collection || 'unknown'}`, title: 'CRM records reviewed', priority: 7 };
  }
}

function mergeItems(existing: ActivityItem, incoming: ActivityItem): ActivityItem {
  const bestCount =
    typeof existing.count === 'number' && typeof incoming.count === 'number'
      ? Math.max(existing.count, incoming.count)
      : existing.count ?? incoming.count;

  const bestStatus =
    existing.status === 'done' || incoming.status === 'done'
      ? 'done'
      : 'empty';

  return {
    ...existing,
    ...incoming,
    status: bestStatus,
    count: bestCount,
    detail: incoming.detail ?? existing.detail,
    priority: Math.min(existing.priority, incoming.priority),
  };
}

function buildItemFromExchange(tx: ToolExchange): ActivityItem {
  const name = typeof tx.name === 'string' ? tx.name : '';
  const args = toRecord(tx.arguments) ?? {};
  const { parsed } = safeParseResult(tx.result);
  const count = pickCount(parsed);

  if (name === 'get_offers') {
    const detail = typeof count === 'number' ? `${count} records` : 'Offer data checked';
    return { key: 'offers', title: 'Offers and stages reviewed', status: 'done', detail, priority: 1, count };
  }

  if (name === 'query_database') {
    const collectionRaw = typeof args.collection === 'string' ? args.collection : '';
    const info = getCollectionLabel(collectionRaw);
    const isEmpty = typeof count === 'number' && count === 0;
    return {
      key: info.key,
      title: info.title,
      status: isEmpty ? 'empty' : 'done',
      detail: typeof count === 'number' ? (isEmpty ? 'No matching records' : `${count} records`) : undefined,
      priority: info.priority,
      count,
    };
  }

  if (name === 'count_documents' || name === 'group_and_count' || name === 'count_unique') {
    return {
      key: 'totals',
      title: 'CRM totals analyzed',
      status: typeof count === 'number' && count === 0 ? 'empty' : 'done',
      detail: typeof count === 'number' ? `${count} total` : undefined,
      priority: 6,
      count,
    };
  }

  if (name === 'get_crm_knowledge') {
    return {
      key: 'knowledge',
      title: 'Business workflow rules applied',
      status: 'done',
      priority: 6,
    };
  }

  return {
    key: `other:${name || 'unknown'}`,
    title: 'Additional analysis completed',
    status: 'done',
    priority: 7,
  };
}

export function buildPostResponseSummary(toolExchanges: unknown): {
  items: ActivityItem[];
  visibleItems: ActivityItem[];
  additionalChecks: number;
  totalChecks: number;
  nonEmptyChecks: number;
} {
  const list = Array.isArray(toolExchanges) ? (toolExchanges as ToolExchange[]) : [];
  if (list.length === 0) {
    return { items: [], visibleItems: [], additionalChecks: 0, totalChecks: 0, nonEmptyChecks: 0 };
  }

  const deduped = new Map<string, ActivityItem>();
  for (const tx of list) {
    const next = buildItemFromExchange(tx);
    const prev = deduped.get(next.key);
    deduped.set(next.key, prev ? mergeItems(prev, next) : next);
  }

  const items = Array.from(deduped.values()).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.title.localeCompare(b.title);
  });

  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const additionalChecks = Math.max(0, items.length - visibleItems.length);
  const nonEmptyChecks = items.filter((i) => i.status === 'done').length;

  return {
    items,
    visibleItems,
    additionalChecks,
    totalChecks: items.length,
    nonEmptyChecks,
  };
}
