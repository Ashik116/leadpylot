# Grouping & Filtering — Implementation Guide

**Purpose:** Single reference for the grouping and filtering system. Use this when building new pages or refactoring existing ones.

**Related:** [FILTER_CHAIN_DOCUMENTATION.md](./FILTER_CHAIN_DOCUMENTATION.md) — Deep-dive on useFilterChainLeads, store structure, filter types, and component integration.

---

## 1. File Reference — What Each File Does

### 1.1 Utilities

| File | Purpose |
|------|---------|
| `src/utils/filterUtils.ts` | Filter format conversion, deduplication, query params. Use at API boundaries. |
| `src/utils/groupUtils.tsx` | Group ID helpers, subgroup pagination extraction, group path utilities. |

### 1.2 Stores

| File | Purpose |
|------|---------|
| `src/stores/filterStateStore.ts` | **Primary store.** Filter chain (import, status, dynamic), domain filters, groupBy, pagination, sorting, expanded groups. |
| `src/stores/multiTableFilterStore.ts` | Per-table state for **multi-table pages** (cashflow, openings tabs). Use `useTableScopedFilters(tableId)`. |
| `filterChainStore.ts` | Deprecated — re-exports `useFilterStateStore`. |
| `universalGroupingFilterStore.ts` | Deprecated — re-exports `useFilterStateStore`. |
| `dynamicFiltersStore.ts` | Deprecated — re-exports `useFilterStateStore`. |

### 1.3 Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useFilterChainLeads.ts` | Page detection, buildApiFilters, buildGroupedLeadsFilters, filter handlers, Agent locked filters. |
| `src/hooks/useFilterProviderValue.ts` | Builds FilterProvider value from filter chain. Use for Users, Projects, Banks, UnifiedDashboard. |
| `src/app/.../useDashboardFilters.ts` | Domain filters, hookParams, defaultFiltersAsQueryParams for unified dashboards (offers, openings, etc.). |
| `src/app/.../useGroupBySync.ts` | Syncs groupBy between store and parent. |
| `src/hooks/useCentralizedFilters.ts` | Page-specific and role-based filters from config. |

### 1.4 Context

| File | Purpose |
|------|---------|
| `src/contexts/FilterContext.tsx` | Provides buildApiFilters, buildGroupedLeadsFilters, handlers. Avoids prop drilling. |

### 1.5 UI Components

| File | Purpose |
|------|---------|
| `src/components/shared/ActionBar/SearchListAndGlobalSearch.tsx` | Search bar + Filters button + FilterTags. Entry point. |
| `src/components/shared/ActionBar/FiltersDropdown.tsx` | Import, Custom Filter, Group By sections. |
| `src/components/groupAndFiltering/GroupByOptions.tsx` | Group-by field selection. |
| `src/components/groupAndFiltering/CustomFilterOption.tsx` | Custom filter builder (field/operator/value). |
| `src/components/groupAndFiltering/GroupSummary.tsx` | Renders grouped data, expand/collapse. |
| `src/components/shared/FilterTags/FilterTags.tsx` | Active filter tags, clear actions. |

### 1.6 Config

| File | Purpose |
|------|---------|
| `src/configs/filter.config.ts` | Page detection, default filters, default groupBy per page. |

---

## 2. filterUtils — Key Functions

| Function | Use when |
|----------|----------|
| `toFilterRule(domain)` | DomainFilter → FilterRule |
| `toFilterRules(domains)` | DomainFilter[] → FilterRule[] |
| `toDomainFilter(rule)` | FilterRule → DomainFilter |
| `toDomainFiltersForApi(rules)` | FilterRule[] → DomainFilter[] (API operators) |
| `normalizeDomainFiltersForApi(filters)` | DomainFilter[] → DomainFilter[] (normalize operators) |
| `toDomainFiltersJson(filters)` | DomainFilter[] → JSON string for API (undefined if empty) |
| `filtersToQueryParams(filters)` | FilterRule[] → `{ field: value }` for equality filters |
| `buildDomainFiltersForAdminPage(buildFn, userFilters)` | User + chain domain filters (Users, Projects) |
| `buildDomainFiltersFromChain(buildFn)` | Chain-only domain filters (Banks) |
| `deduplicateFilters(filters)` | Remove duplicates by field+operator |

---

## 3. groupUtils — Key Functions

| Function | Use when |
|----------|----------|
| `getActiveSubgroupPagination(subgroupPagination)` | Extract subPage, subLimit, groupId from store for useGroupedSummary |
| `computeUniqueGroupId(contextPath, groupId)` | Build uniqueGroupId for nested groups |
| `findPathToGroup(targetId, groups, contextPath)` | Find path to a group in hierarchy |

---

## 4. How to Add Grouping & Filtering to a New Page

### 4.1 Single-Table Page (Users, Banks, Projects pattern)

**Use when:** One table, shared filter state, filter chain (import/status/custom).

1. **Wrap with FilterProvider** using `useFilterProviderValue`:

```tsx
const filterChain = useFilterChainLeads({ currentTab: 'your-page' });
const {
  buildApiFilters,
  buildGroupedLeadsFilters,
  handleGroupByArrayChange,
  handleClearGroupByFilter,
} = filterChain;

const handleGroupByArrayChangeWithReset = useCallback(
  (newGroupBy: string[]) => {
    clearSelectedItems(); // if you have selections
    handleGroupByArrayChange(newGroupBy);
  },
  [clearSelectedItems, handleGroupByArrayChange]
);

const handleClearGroupByFilter = useCallback(() => {
  clearSelectedItems();
  chainHandleClearGroupByFilter();
}, [clearSelectedItems, chainHandleClearGroupByFilter]);

const filterContextValue = useFilterProviderValue(
  buildApiFilters,
  buildGroupedLeadsFilters,
  handleGroupByArrayChangeWithReset,
  handleClearGroupByFilter
);

return (
  <FilterProvider value={filterContextValue}>
    <BaseTable ... />
  </FilterProvider>
);
```

2. **Build domain filters** for API:

```tsx
// If you have user filters (CustomFilterOption)
const domainFilters = useMemo(
  () => buildDomainFiltersForAdminPage(buildGroupedLeadsFilters, userDomainFilters),
  [buildGroupedLeadsFilters, userDomainFilters]
);

// If chain-only (no user filters)
const domainFilters = useMemo(
  () => buildDomainFiltersFromChain(buildGroupedLeadsFilters),
  [buildGroupedLeadsFilters]
);
```

3. **Default filters as query params**:

```tsx
const defaultFiltersAsQueryParams = useMemo(
  () => filtersToQueryParams(buildApiFilters?.() ?? []),
  [buildApiFilters]
);
```

4. **Subgroup pagination** for useGroupedSummary:

```tsx
const { subgroupPagination: storeSubgroupPagination } = useUniversalGroupingFilterStore();

// In useGroupedSummary params:
...getActiveSubgroupPagination(storeSubgroupPagination),
```

5. **BaseTable props**:

```tsx
<BaseTable
  buildApiFilters={buildApiFilters}
  selectedGroupBy={selectedGroupBy}
  onGroupByChange={handleGroupByChange}
  onClearGroupBy={handleClearGroupByFilter}
  groupedMode={effectiveGroupBy.length > 0}
  groupedData={groupedSummaryData?.data || []}
  groupByFields={effectiveGroupBy}
  entityType="YourEntity"
  ...
/>
```

---

### 4.2 Multi-Table Page (Cashflow pattern)

**Use when:** Multiple tables on one page, each with its own filters and groupBy.

1. **Use multi-table store** per table:

```tsx
const tableFilters = useTableScopedFilters('your-table-id');
```

2. **Build API filters** from table filters:

```tsx
const buildApiFilters = useCallback(
  () => toFilterRules(tableFilters.userDomainFilters),
  [tableFilters.userDomainFilters]
);

const domainFiltersJson = useMemo(
  () => toDomainFiltersJson(tableFilters.userDomainFilters),
  [tableFilters.userDomainFilters]
);
```

3. **FilterProvider** with minimal value (no buildGroupedLeadsFilters):

```tsx
<FilterProvider
  value={{
    buildApiFilters,
    handleGroupByArrayChangeWithReset,
    handleClearGroupByFilter: handleClearGroupBy,
    onGroupByArrayChange: handleGroupByArrayChangeWithReset,
  }}
>
```

4. **Set entity type** on mount:

```tsx
React.useEffect(() => {
  if (tableFilters.groupBy.length === 0) {
    tableFilters.setGroupBy(['your_default_field']);
    tableFilters.setEntityType('YourEntity');
  }
}, []);
```

---

### 4.3 Unified Dashboard (Offers, Openings pattern)

**Use when:** Offers, openings, confirmations, payments, netto — uses `useDashboardFilters`.

1. **Use useDashboardFilters** — it returns domainFilters, hookParams, defaultFiltersAsQueryParams, etc.
2. **Use useFilterChainLeads** for buildApiFilters, buildGroupedLeadsFilters, handlers.
3. **Wrap with FilterProvider** using `useFilterProviderValue`.
4. See `UnifiedDashboard.tsx` for the full pattern.

---

## 5. Filter Format Reference

| Format | Shape | Where |
|--------|-------|-------|
| **FilterRule** | `{ field, operator, value }` | UI, hooks, filter chain |
| **DomainFilter** | `[field, operator, value]` | API `domain` param |

**Operator mapping** (UI → API): `equals` → `=`, `contains` → `ilike`, etc. See `FILTER_OPERATOR_TO_API` in filterUtils.

---

## 6. Page Type Quick Reference

| Page | Domain source | GroupBy source |
|------|---------------|----------------|
| Leads (live, recycle, archived) | Filter chain + locked + user | filterStateStore |
| Offers | locked + user | filterStateStore |
| Openings (single) | Filter chain + locked + user | filterStateStore |
| Openings (multi-tab) | multiTableFilterStore | Per-table |
| Cashflow | multiTableFilterStore | Per-table |
| Users, Banks, Projects | Filter chain + user | filterStateStore |

---

## 7. Checklist for New Page

- [ ] Choose pattern: single-table, multi-table, or unified
- [ ] Add page to `filter.config.ts` if needed (default filters, groupBy)
- [ ] Wrap with FilterProvider
- [ ] Build domain filters (use filterUtils helpers)
- [ ] Pass defaultFiltersAsQueryParams to useGroupedSummary
- [ ] Use getActiveSubgroupPagination for subgroup pagination
- [ ] Pass buildApiFilters, groupBy, handlers to BaseTable
- [ ] Add entityType to config if using useGroupedSummary
