# Filter Chain System Documentation

**Related:** [GROUPING_AND_FILTERING_GUIDE.md](./GROUPING_AND_FILTERING_GUIDE.md) — Implementation guide, file reference, and how to add grouping/filtering to new pages.

---

## Overview

The Filter Chain system centralizes all filtering behavior across Leads dashboards. It standardizes:

- Filter state composition (import/status/dynamic/group-by)
- Page- and role-aware default filters
- Agent-specific defaults and constraints
- Project scoping for Agent users
- Selection-clearing semantics when filters change
- Consistent API filter building for regular and grouped views
- Dynamic filters lifecycle, pagination, and refetching
- UI persistence (visibility/order) for filter UIs
- **NEW**: Sorting state management for grouped views with persistent per-group sorting

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Filter Chain System                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────┐   ┌───────────────────────┐   ┌────────────────┐ │
│  │ useFilterChainLeads   │   │  filterStateStore      │   │ FilterProvider  │ │
│  │  (page+role logic)    │   │ (primary Zustand)      │   │ (FilterContext) │ │
│  │ • Page detection      │   │ • import/status/dyn   │   │ • buildApiFilt  │ │
│  │ • Agent defaults      │   │ • groupBy, domain     │   │ • buildGrouped  │ │
│  │ • Project scoping     │   │ • combinedFilters     │   │ • handlers      │ │
│  │ • Builders/Handlers   │   │ • clear/getCombined   │   │                 │ │
│  └───────────────────────┘   └───────────────────────┘   └────────────────┘ │
│                ▲                        ▲                     ▲              │
│     ┌─────────────────────── Component Integration Layer ───────────────────┐│
│     │  FiltersDropdown · GroupByOptions · CustomFilterOption · FilterByImport││
│     │  GroupSummary · UnifiedDashboard · BaseTable · CommonActionBar        ││
│     └──────────────────────────────────────────────────────────────────────┘│
│                ▲                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐                       │
│  │  filterUtils          │  │  groupUtils            │                       │
│  │  toDomainFiltersForApi│  │  getActiveSubgroupPagi │                       │
│  │  filtersToQueryParams │  │  computeUniqueGroupId  │                       │
│  └───────────────────────┘  └───────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Concepts

- **Filter types**: Import (`duplicate_status`), Status (`status`), Dynamic (arbitrary rules), Group By (array of field keys)
- **Sources**: Dynamic Filters can originate from the table header (Status) or the Custom panel; tracked via `filterSource: 'table_header' | 'custom' | null`
- **Persistence**: UI visibility/order persists via `localStorage` keys per filter; dynamic rules persist as `dynamicFilters`
- **Selection clearing**: All filter change/clear handlers are selection-aware and call the provided `onClearSelections` so tables can reset selection
- **Agent behavior**:
  - Default Group By includes `status` on several pages (see below)
  - Agents cannot hide or unselect `status` in Group By
  - Row selection in grouped lead tables is disabled for Agents
  - Extra status-exclusion defaults applied on live/recycle pages
- **Project scoping for Agents**: When an Agent selects a specific project (not "All"), API filters include `{ field: 'project', operator: 'equals', value: selectedProject.name }`
- **NEW**: **Sorting in grouped views**:
  - Group summary sorting: controlled by parent component (e.g., `GroupedLeadsTable`, `GroupedOffersTable`)
  - Per-group sorting: managed by `useGroupSortingStore` with persistent state across expand/collapse
  - Sorting display: shows in group headers regardless of expanded state when group has leads
  - 6-state sorting cycle for group details: desc → asc → no sort → asc → desc → no sort

## Core Modules

### useFilterChainLeads (src/hooks/useFilterChainLeads.ts)

Props:

- `pendingLeadsComponent?: boolean`
- `onClearSelections?: () => void`
- `onAppendQueryParams?: (params: any) => void`
- `hasManuallyClearedGroupFilter?: boolean` (prevents auto reapplying Agent defaults)
- `currentTab?: string` (optional override for pathname-based page detection)

Returns:

- Filter state
  - `selectedStatus?: string` (from store)
  - `selectedGroupBy: string[]`
  - `filterData?: number` (import filter value)
- Builders
  - `buildApiFilters(): FilterRule[]`
  - `buildGroupedLeadsFilters(): FilterRule[]`
- Handlers (all invoke `onClearSelections` first)
  - `handleStatusChange(status?: string)`
  - `handleGroupByChange(groupBy?: string)`
  - `handleGroupByArrayChange(groupByArray: string[])`
  - `handleFilterDataChange(filterData?: number)`
- Clear handlers (all invoke `onClearSelections` first)
  - `handleClearImportFilter()`
  - `handleClearStatusFilter()`
  - `handleClearGroupByFilter()` (Agents reset to defaults instead of empty)
  - `handleClearDynamicFilters()`
- UI flags
  - `hasFilterData`, `hasSelectedStatus`, `hasSelectedGroupBy`, `hasDynamicFilters`, `hasUserAddedGroupBy`
- Page detection (auto from pathname unless `currentTab` provided)
  - `isLiveLeadsPage`, `isRecycleLeadsPage`, `isLeadsPage`, `isArchivedPage`
  - `isTodoPage`, `isOffersPage`, `isOpeningsPage`, `isConfirmationsPage`, `isPaymentsPage`, `isNettoPage`
- Store exposure
  - `statusFilter`, `importFilter`, `dynamicFilters`
  - `isDynamicFilterMode`, `filterSource`
  - `clearDynamicFilters`, `clearFilterByType`

Behavior:

- Applies page-specific defaults via `getPageSpecificFilters()`
- Auto applies Agent group-by default `['status']` on live/recycle/todo and several sub-dashboards, unless user manually cleared
- When Agent adds extra group-by fields, `hasUserAddedGroupBy` becomes true
- Builders include (in order): page defaults → import → status → dynamic → project scoping for Agent

### filterStateStore (src/stores/filterStateStore.ts) — Primary Store

**Note:** `filterChainStore.ts`, `universalGroupingFilterStore.ts`, and `dynamicFiltersStore.ts` are deprecated; they re-export `useFilterStateStore` for backwards compatibility.

State:

- `importFilter: FilterRule | null`
- `statusFilter: FilterRule | null`
- `dynamicFilters: FilterRule[]`
- `groupBy: string[]`
- `combinedFilters: FilterRule[]`
- `userDomainFilters`, `lockedDomainFilters`, `domainFilters` (DomainFilter[])
- `pagination`, `subgroupPagination`, `sorting`, `expandedGroups`
- `isDynamicFilterMode`, `dynamicFilterResults`, `filterSource`, etc.

Actions:

- `setImportFilter(filter)`, `setStatusFilter(filter)`, `setDynamicFilters(filters)`, `setGroupBy(groupBy)`
- `clearAllFilters()`, `clearFilterByType(type: 'import' | 'status' | 'dynamic' | 'groupBy')`
- `getCombinedFilters()`, `updateFromURL(filters, groupBy?)`
- `setUserDomainFilters`, `setLockedDomainFilters`, `setSubgroupPagination`, etc.

Notes:

- `getCombinedFilters()` concatenates import → status → dynamic only (page defaults and project scoping are applied by `useFilterChainLeads` builders)

### Dynamic Filters Slice (via dynamicFiltersStore re-export)

State:

- `isDynamicFilterMode: boolean`
- `dynamicFilterResults: Lead[]`
- `dynamicFilterQuery: any[]` (complete filter body including defaults)
- `customFilters: any[]` (user-added rules only)
- `isLoading: boolean`, `total: number`, `page: number`, `pageSize: number`
- `hasNextPage: boolean`, `hasPrevPage: boolean`
- `filterSource: 'custom' | 'table_header' | null`
- `refetchDynamicFilters?: (page?: number, pageSize?: number) => Promise<void>`

Actions:

- `setDynamicFilterMode`, `setDynamicFilterResults`, `setDynamicFilterQuery`, `setCustomFilters`
- `setLoading`, `setTotal`, `setPage`, `setPageSize`, `setHasNextPage`, `setHasPrevPage`
- `setFilterSource`, `setRefetchFunction`, `clearDynamicFilters`

### FilterProvider & useFilterProviderValue

**FilterContext** (`src/contexts/FilterContext.tsx`) provides `buildApiFilters`, `buildGroupedLeadsFilters`, and handlers to descendants — avoids prop drilling.

**useFilterProviderValue** (`src/hooks/useFilterProviderValue.ts`) builds the FilterProvider value for dashboards using useFilterChainLeads. Use for Users, Projects, Banks, UnifiedDashboard:

```ts
const filterContextValue = useFilterProviderValue(
  buildApiFilters,
  buildGroupedLeadsFilters,
  handleGroupByArrayChangeWithReset,
  handleClearGroupByFilter
);
return <FilterProvider value={filterContextValue}>...</FilterProvider>;
```

### filterUtils (src/utils/filterUtils.ts)

Use at API boundaries for filter format conversion:

- `toDomainFiltersForApi(rules)` — FilterRule[] → DomainFilter[] (API operators)
- `normalizeDomainFiltersForApi(filters)` — DomainFilter[] → DomainFilter[] (normalize operators)
- `toFilterRules(domains)` — DomainFilter[] → FilterRule[]
- `toDomainFiltersJson(filters)` — DomainFilter[] → JSON string for API (undefined if empty)
- `filtersToQueryParams(filters)` — FilterRule[] → `{ field: value }` for equality filters
- `buildDomainFiltersForAdminPage(buildFn, userFilters)` — User + chain for admin dashboards
- `buildDomainFiltersFromChain(buildFn)` — Chain-only for Banks

### groupUtils (src/utils/groupUtils.tsx)

- `getActiveSubgroupPagination(subgroupPagination)` — Extract subPage, subLimit, groupId for useGroupedSummary
- `computeUniqueGroupId(contextPath, groupId)` — Build uniqueGroupId for nested groups
- `findPathToGroup(targetId, groups, contextPath)` — Find path to a group in hierarchy

### Group Sorting Store (src/stores/groupSortingStore.ts)

State:

- `groupSorting: Record<string, { sortBy: string; sortOrder: 'asc' | 'desc'; sortClickCount: number }>`

Actions:

- `setGroupSorting(groupId, sortBy, sortOrder, sortClickCount)`
- `getGroupSorting(groupId)` - returns default state if not found
- `resetGroup(groupId)` - removes sorting for specific group
- `resetAll()` - clears all group sorting

Notes:

- Persists sorting state per group across expand/collapse cycles
- Used by `GroupedLeadsTable` and `GroupedOffersTable` for per-group sorting
- Group ID includes context path for hierarchical groups (e.g., `"status|bankName"`)

## Component Integration

### FiltersDropdown (src/components/shared/ActionBar/FiltersDropdown.tsx)

- Entry point for filter UI. Contains: **FilterByImport**, **GroupByOptions**, **CustomFilterOption**, **SavedFilters**
- Uses `useFilterContext()` for buildApiFilters, buildGroupedLeadsFilters, handlers (avoids prop drilling)
- For multi-table pages: use `tableId` prop to read/write per-table state from `multiTableFilterStore`

### GroupByOptions (src/components/groupAndFiltering/GroupByOptions.tsx)

- Multi-select group-by fields (replaces legacy GroupByFilter)
- Agent rules: cannot hide/unselect `status` on applicable pages
- Persists visibility/order via `filter-visibility-groupBy`, `filter-order-groupBy`

### CustomFilterOption (src/components/groupAndFiltering/CustomFilterOption.tsx)

- Custom filter builder (field/operator/value)
- Writes to `userDomainFilters` in store (or per-table via tableId)

### FilterByImport (src/app/.../dashboards/leads/_components/FilterByImport.tsx)

- Toggles import filter (`duplicate_status`), stores in filter chain
- Clears Dynamic Filters store when import filter is applied

### GroupSummary (src/components/groupAndFiltering/GroupSummary.tsx)

- Renders grouped data, expand/collapse, per-group pagination
- Uses `useGroupedSummary` for group summary API; `useGroupLeads` for leaf fetches

### CommonLeadsDashboard (src/app/.../CommonLeadsDashboard.tsx)

- Uses `useFilterChainLeads` and synchronizes `filterData` into `useLeadsDashboard`
- Clears all selections when group-by changes or filters are cleared (`handleClearSelectionWrapper`)
- Provides two-level Select All:
  - Regular mode: smart select-all chooses among Dynamic, Bulk Search, or `selectAllLeadsFromApi()`
  - Grouped mode: triggers `selectAllGroupedLeadsSignal` handled inside `GroupedLeadsTable`
- Updates filter-aware navigation store in grouped mode with items and filter state
- Todo dashboard: enforces `{ has_todo: true }` and scope-specific flags

### GroupedLeadsTable (src/app/.../GroupedLeadsTable.tsx)

- Fetches grouped summary via `useGroupedSummary` (domain, groupBy, defaultFilters, subPage, subLimit, groupId)
- For each expanded leaf group, fetches actual leads via `useGroupLeads(fields, path, enabled, { page, limit, filters, sortBy, sortOrder })`
- Paginates both group summary and per-group leads; persists per-group pagination across expand/collapse
- **NEW**: Sorting functionality:
  - Group summary sorting: controlled by parent via `sortBy`, `sortOrder`, `onSortChange` props
  - Per-group sorting: uses `useGroupSortingStore` for persistent state
  - Sorting display: shows in group headers regardless of expanded state when `hasLeadIds` is true
  - 6-state sorting cycle: desc → asc → no sort → asc → desc → no sort
- Selection semantics:
  - Uses `groupSelections: Record<groupId, Lead[]>` keyed by unique group path (`groupId` joined with context path)
  - Header checkbox selects only visible leads on the current page
  - Notifies parent via debounced queue to avoid render-time updates
  - `clearSelectionsSignal` resets all selections; `externalSelectedLeads` syncs clearing from parent
  - Selection is disabled for Agents (`selectable={!isAgent}`)
- Shows inline count of selected items per group including descendants
- **NEW**: Removed React context for sorting state, now uses Zustand store directly

### StatusFilter (src/app/.../dashboards/leads/_components/StatusFilter.tsx)

- Applies status as Dynamic Filters with page- and role-based defaults from `useCentralizedFilters()`
- Writes to Dynamic Filters store; sets `filterSource = 'table_header'`

### DynamicFilters (src/components/layouts/PostLoginLayout/components/DynamicFilters.tsx)

- Build arbitrary user rules (field/operator/value)
- Writes to Dynamic Filters store; sets `filterSource = 'custom'`

### UnifiedDashboard (src/app/(protected-pages)/dashboards/_components/unified-dashboard/UnifiedDashboard.tsx)

- Uses `useFilterChainLeads` with `currentTab` set to the dashboard domain (e.g., `offer`, `opening`, `confirmation`, `payment`, `netto`) or an active progress filter when present.
- Uses `useFilterProviderValue` for FilterProvider value.
- Fetches grouped summary via `useGroupedSummary` with `domain`, `groupBy`, `defaultFilters`, `subPage`, `subLimit`, `groupId` (from `getActiveSubgroupPagination`).
- Passes filter state and handlers to `UnifiedDashboardTable`; renders `GroupSummary` when grouping is active.
- Uses `useSelectedItemsStore` keyed by table name; `clearSelectionsSignal` and `refreshSignal` for group state.
- Example (grouped summary fetch):

```ts
const domainFilters = toDomainFiltersForApi(buildGroupedLeadsFilters());

const { data: groupedData } = useGroupedSummary({
  entityType: validEntityType,
  domain: domainFilters,
  groupBy: effectiveGroupBy,
  page: storePagination?.page || 1,
  limit: storePagination?.limit || 50,
  ...getActiveSubgroupPagination(storeSubgroupPagination),
  sortBy: storeSorting?.sortBy || groupedSortBy,
  sortOrder: storeSorting?.sortOrder || groupedSortOrder,
  defaultFilters: cleanedDefaultFiltersForGrouping,
  hasProgress: hasProgressForGrouping,
});
```

### GroupedOffersTable / GroupSummary (grouped view)

- For each expanded leaf group, fetches items via `useGroupLeads(fields, path, enabled, { page, limit, filters, _key, _refresh, sortBy, sortOrder })`.
- **NEW**: Sorting functionality:
  - Group summary sorting: controlled by parent via `sortBy`, `sortOrder`, `onSortChange` props
  - Per-group sorting: uses `useGroupSortingStore` for persistent state
  - 4-state sorting cycle for group details: asc → desc → no sort → asc
  - Column mapping: converts frontend column names to API field names (e.g., `leadName` → `contact_name`)
- Selection is integrated with the global selected items store (`useSelectedItemsStore`) keyed by entity-specific table name (`offers`, `openings`, `confirmations`, `payments`).
  - Header select-all selects only the visible items on the current page of that leaf.
  - Local per-group selection map exists for UI header state, but the source of truth is the global store.
- Action bar (`CommonActionBar`) is rendered in grouped mode and receives selection list from the global store and filter props (`selectedGroupByArray`, `onGroupByArrayChange`, `onClearGroupBy`, `hasSelectedGroupBy`, `hasUserAddedGroupBy`).
- Updates filter-aware navigation store when group data changes, mapping items to lead IDs and storing grouped path and filters.
- **NEW**: Client-side only wrapper to prevent hydration issues
- Example (leaf fetch and selection):

```ts
const apiFilters = groupedOffersFilters || buildApiFilters();
const { data: offersData, isLoading } = useGroupLeads(
  selectedGroupPath?.fields || [],
  selectedGroupPath?.path || [],
  !!selectedGroupPath,
  {
    page: groupOffersPage,
    limit: groupOffersPageSize,
    _key: paginationKey,
    _refresh: refreshSignal,
    filters: JSON.stringify(apiFilters),
    sortBy: getApiFieldName(currentSortBy),
    sortOrder: currentSortOrder,
  }
);

// Select-all on current page in this leaf
const onSelectAllCurrentPage = () => {
  const dataKey = getDataKey(entityType);
  const rows = offersData?.data?.[dataKey] || [];
  rows.forEach((item) => addSelectedItem(item, tableName));
};
```

## Page-Specific Defaults

`useFilterChainLeads.getPageSpecificFilters()` composes defaults based on page/tab and role:

- Pending Leads (prop `pendingLeadsComponent`)
  - `{ field:'use_status', operator:'equals', value:'pending' }`
- Todo page
  - `{ field:'has_todo', operator:'equals', value:true }`
- Offers / Openings / Confirmations / Payments / Netto pages
  - `has_offer` / `has_opening` / `has_confirmation` / `has_payment` / `has_netto` set to `true`
- Live Leads
  - `{ field:'source', operator:'equals', value:'live' }`
  - `{ field:'use_status', operator:'not_equals', value:'pending' }`
  - Agent-only extra exclusions:
    - `status != Payment, Opening, Confirmation, Angebot, Netto1, Netto2, Contract`
- Recycle Leads
  - `{ field:'source', operator:'equals', value:'recycle' }`
  - `{ field:'use_status', operator:'not_equals', value:'pending' }`
  - Agent-only same exclusions as above
- Main Leads (non-archived)
  - `{ field:'use_status', operator:'not_equals', value:'pending' }`
- Archived
  - `{ field:'active', operator:'equals', value:false }`

Agent group-by defaults:

- On live, recycle, todo, offers, openings, confirmations, payments, netto pages → `['status']`
- Clearing group-by reverts to defaults for Agents (if applicable)

Project scoping for Agents:

- When a specific project is selected (not "All"), append `{ field:'project', operator:'equals', value: selectedProject.name }`

## Builders and API Usage

**Filter formats:** Use `FilterRule` (`{ field, operator, value }`) internally. Convert to `DomainFilter` (`[field, operator, value]`) at API boundary via `filterUtils.toDomainFiltersForApi()`.

Regular Leads (domain param):

```ts
const filters = buildApiFilters();
const domain = toDomainFiltersForApi(filters);
// API: GET /leads?domain=JSON.stringify(domain)&page=...&limit=...
```

Grouped Summary (useGroupedSummary):

```ts
const domainFilters = toDomainFiltersForApi(buildGroupedLeadsFilters());
const defaultFilters = filtersToQueryParams(buildApiFilters?.() ?? []);
const { subPage, subLimit, groupId } = getActiveSubgroupPagination(storeSubgroupPagination);

useGroupedSummary({
  entityType: 'Lead',
  domain: domainFilters,
  groupBy: selectedGroupBy,
  page,
  limit,
  subPage,
  subLimit,
  groupId,
  defaultFilters,
  sortBy,
  sortOrder,
});
```

Group Leads (leaf fetch):

```ts
useGroupLeads(groupingFields, groupPath, !!groupPath, {
  page,
  limit,
  filters: JSON.stringify(apiFilters),
  sortBy,
  sortOrder,
});
```

## Selection Management

- Always pass an `onClearSelections` to `useFilterChainLeads`
- Common patterns:

```ts
const handleClearSelection = () => {
  setSelectedLeads([]);
  setGroupSelections({});
  useSelectedItemsStore.getState().clearSelectedItems();
};

const filterChain = useFilterChainLeads({ onClearSelections: handleClearSelection });
```

Grouped selection specifics:

- Track per-group selections keyed by unique context path id
- Header checkbox operates on current page only
- Use `clearSelectionsSignal` to reset children and propagate an empty selection upstream

Smart Select All (regular mode):

- If Dynamic mode active → fetch all via POST and select
- Else if Bulk search active → select all results in memory
- Else → call `selectAllLeadsFromApi()` with current filters

## NEW: Sorting Management

### Group Summary Sorting

- Controlled by parent components (`GroupedLeadsTable`, `GroupedOffersTable`)
- Props: `sortBy`, `sortOrder`, `onSortChange`
- Options: `sortingOptions` from `@/constants/sortingOptions`
- Resets to page 1 when sorting changes

### Per-Group Sorting

- Managed by `useGroupSortingStore` for persistence across expand/collapse
- Group ID includes context path for hierarchical groups
- 6-state cycle for leads: desc → asc → no sort → asc → desc → no sort
- 4-state cycle for offers: asc → desc → no sort → asc
- Column mapping for offers: frontend names → API field names

### Sorting Display

- Shows in group headers regardless of expanded state when group has leads
- Format: `"Column Name = asc/desc"` or `"no sort"`
- Uses `getDisplayColumnName()` for user-friendly column names

## Persistence and Clear Semantics

LocalStorage keys:

- `dynamicFilters` (array of user-defined rules in Dynamic Filters panel)
- `filter-visibility-import`, `filter-order-import`
- `filter-visibility-status`, `filter-order-status`
- `filter-visibility-groupBy`, `filter-order-groupBy`

Comprehensive Clear should:

- Remove all above localStorage keys
- Reset filter chain store: `setImportFilter(null)`, `setStatusFilter(null)`, `setDynamicFilters([])`
- Reset Dynamic Filters store via `clearDynamicFilters()` (mode/results/query/custom/pagination/source cleared)
- Reset local component state to empty

## Best Practices

- Use `useFilterChainLeads` builders instead of manually composing filters
- Always clear selections on any filter change/clear (better UX)
- Respect Agent constraints in UI (status cannot be hidden/removed; selection disabled in grouped tables)
- Provide `setRefetchFunction` for any paginated dynamic filter results so headers can paginate without re-building logic
- Persist filter UI visibility/order via provided keys; treat storage as optional (wrap in try/catch)
- **NEW**: Use `useGroupSortingStore` for per-group sorting persistence
- **NEW**: Map frontend column names to API field names for sorting in offers/confirmations/payments

## Troubleshooting

- Filters not affecting API: ensure you pass `domain: JSON.stringify(toDomainFiltersForApi(buildGroupedLeadsFilters()))` for grouped summary; use `filterUtils` at API boundary
- Grouped table fetches wrong group: ensure leaf `selectedGroupPath` is constructed from the actual parent path (uses context-aware unique ids)
- Agent cannot clear Group By: expected; clearing resets to default `['status']` on applicable pages
- Status filter applied but results paginate incorrectly: verify `setRefetchFunction` is set and pagination uses it
- Import filter toggled but Dynamic results still show: `FilterByImport` clears Dynamic Filters store on selection; confirm clear executed
- **NEW**: Sorting not persisting in grouped views: ensure using `useGroupSortingStore` and group ID includes context path
- **NEW**: Sorting display shows "no sort" when sorting is applied: check that `groupSortingData` from Zustand store is being used instead of React context

## Types

```ts
export interface FilterRule {
  field: string;
  operator: string;
  value: string | number | boolean;
}

type DomainFilter = [string, string, any]; // [field, operator, value]
```

## Key Files Reference

| Purpose | File |
|---------|------|
| Primary store | `src/stores/filterStateStore.ts` |
| Filter chain hook | `src/hooks/useFilterChainLeads.ts` |
| Filter provider | `src/hooks/useFilterProviderValue.ts`, `src/contexts/FilterContext.tsx` |
| Filter utils | `src/utils/filterUtils.ts` |
| Group utils | `src/utils/groupUtils.tsx` |
| Filters UI | `src/components/shared/ActionBar/FiltersDropdown.tsx` |
| Group-by UI | `src/components/groupAndFiltering/GroupByOptions.tsx` |
| Custom filter | `src/components/groupAndFiltering/CustomFilterOption.tsx` |
| Grouped view | `src/components/groupAndFiltering/GroupSummary.tsx` |

See [GROUPING_AND_FILTERING_GUIDE.md](./GROUPING_AND_FILTERING_GUIDE.md) for implementation patterns and how to add grouping/filtering to new pages.
