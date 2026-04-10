# Filtering & Grouping System — Architecture

**Purpose:** Single source of truth for the filtering and grouping system architecture. Use this for onboarding and future refactors.

**Related:** [GROUPING_AND_FILTERING_GUIDE.md](./GROUPING_AND_FILTERING_GUIDE.md) — Implementation guide, file reference, and how to add grouping/filtering to new pages.

---

## 1. Overview

The filtering and grouping system supports:

- **Leads dashboards** (live-leads, recycle-leads, archived, todo, etc.)
- **Unified dashboards** (offers, out-offers, openings, confirmations, payments, netto)
- **Admin dashboards** (users, banks, projects)
- **Cashflow** (entries, transactions)
- **Multi-table pages** (e.g., openings with multiple tabs, cashflow entries + transactions)

---

## 2. Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER INTERACTION                                                             │
│ SearchListAndGlobalSearch → FiltersDropdown (Import | Custom | Group By)      │
│                         → FilterTags (display + clear)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FILTER STATE STORE (single source of truth)                                  │
│ filterStateStore.ts                                                          │
│ • importFilter, statusFilter, dynamicFilters (filter chain)                  │
│ • userDomainFilters, lockedDomainFilters, domainFilters                     │
│ • groupBy, pagination, sorting, expandedGroups                              │
│ • isDynamicFilterMode, dynamicFilterResults (POST-based mode)               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ HOOKS (logic layer)                                                          │
│ useFilterChainLeads → buildApiFilters, buildGroupedLeadsFilters, handlers    │
│ useDashboardFilters → domainFilters, hookParams, defaultFiltersAsQueryParams │
│ useGroupBySync → syncs groupBy between store and parent                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ API LAYER                                                                   │
│ GET /leads?domain=[...]&groupBy=[...]&page=...&limit=...                    │
│ GET /offers?domain=[...]&groupBy=[...]&out=true                             │
│ GET /offers/progress?has_progress=opening&domain=[...]                       │
│ POST /leads/dynamic-filters/apply (dynamic filter mode)                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Store Responsibilities

### 3.1 filterStateStore (primary)

**Location:** `src/stores/filterStateStore.ts`

Single consolidated store. Contains three logical slices:

| Slice | State | Purpose |
|-------|-------|---------|
| **Filter chain** | `importFilter`, `statusFilter`, `dynamicFilters`, `groupBy`, `combinedFilters`, `filterData`, `selectedStatus`, dropdown state | Import/status/custom filters; dropdown UI |
| **Grouping** | `userDomainFilters`, `lockedDomainFilters`, `domainFilters`, `entityType`, `pagination`, `sorting`, `expandedGroups`, `selectedGroupPath` | Domain filters for API; grouping UI state |
| **Dynamic** | `isDynamicFilterMode`, `dynamicFilterResults`, `dynamicFilterQuery`, `customFilters`, pagination, `refetchDynamicFilters` | POST-based dynamic filter mode |

### 3.2 Backwards-compatible re-exports

| File | Status | Notes |
|------|--------|-------|
| `filterChainStore.ts` | Deprecated | Re-exports `useFilterStateStore` as `useFilterChainStore` |
| `universalGroupingFilterStore.ts` | Deprecated | Re-exports `useFilterStateStore` as `useUniversalGroupingFilterStore` |
| `dynamicFiltersStore.ts` | Deprecated | Re-exports `useFilterStateStore` as `useDynamicFiltersStore` |

### 3.3 multiTableFilterStore

**Location:** `src/stores/multiTableFilterStore.ts`

Per-table state for **multi-table pages** (cashflow, openings tabs). Each table has its own `groupBy`, `userDomainFilters`, `pagination`, `sorting`, etc. Use `useTableScopedFilters(tableId)` instead of `useFilterStateStore` on these pages.

---

## 4. Filter Format

| Format | Shape | Where used |
|--------|-------|------------|
| **FilterRule** | `{ field, operator, value }` | UI, hooks, filter chain |
| **DomainFilter** | `[field, operator, value]` | API (domain param) |

**Conversion:** `filterUtils.toDomainFiltersForApi(rules)` at API boundary. Operator mapping (e.g. `equals` → `=`) in `FILTER_OPERATOR_TO_API`.

---

## 5. Decision Log

### 5.1 Offers vs progress split

| Page type | Domain filters source | Notes |
|-----------|----------------------|-------|
| **Offers** | `lockedDomainFilters` + `userDomainFilters` | CustomFilterOption sets user filters; no filter chain |
| **Progress** (openings, confirmations, payments, netto) | `buildGroupedLeadsFilters()` + locked + user | Filter chain + conversion; `has_offer` → `has_transferred_offer` for Agent |
| **Leads** | Filter chain + locked + user | Default filters from config |

### 5.2 Agent locked filters

For **Agent** role, some filters are **immutable** (locked). Agents cannot remove them. Examples:

- Stage filters (e.g. `status_id` for live/recycle leads)
- Default status filters on certain pages

Set via `setLockedDomainFilters()` from `useFilterChainLeads` based on page and role. `lockedDomainFilters` are always applied and hidden from the editable UI.

### 5.3 project_id removal on progress pages

**Why:** On openings/confirmations/payments/netto pages, `project_id` is **not** sent in the domain by default. Otherwise, users would see only one project's data.

**Behavior:**

- **Openings page:** Remove `project`/`project_id` from locked and filter chain filters. Only include if user explicitly added via CustomFilterOption.
- **Grouping active:** Remove `project`/`project_id` from domain; keep only `groupBy` path filters.
- **Expanding a group:** Preserve `project_id` when value is a MongoDB ObjectId (24 hex chars) — it's a group path filter. Remove when it's a project name filter.
- **defaultFiltersAsQueryParams:** Remove `project_id` for all progress pages so project scoping doesn't apply to grouped views.

### 5.4 has_offer → has_transferred_offer

For Agent role with "Transferred offers" filter active:

- Replace `has_offer` filter with `has_transferred_offer` in the domain.
- Skips flat view API; only grouped summary is used.

### 5.5 Dynamic filter mode

When user selects **Dynamic Filters** tab in FiltersDropdown:

- Uses POST `/leads/dynamic-filters/apply` instead of GET with domain.
- `isDynamicFilterMode = true`; `dynamicFilterResults` holds response.
- Pagination, sorting, refetch live in `filterStateStore` dynamic slice.

---

## 6. Multi-Table Mode

**Pages:** Cashflow (entries + transactions), Openings (tabs: opening, confirmation, payment, netto2, lost)

**How it works:**

- Each table has a unique `tableId` (e.g. `cashflow-entries`, `cashflow-transactions`).
- `useTableScopedFilters(tableId)` returns per-table state from `multiTableFilterStore`.
- `FilterProvider` receives `tableId`; CustomFilterOption, GroupByOptions use `tableId` to read/write the correct slice.
- `activeDropdownTableId` in filterStateStore tracks which table's dropdown is open (for single-store pages that still use filterStateStore).

**Single-table vs multi-table:**

- **Single-table:** Use `useFilterStateStore` (or deprecated `useUniversalGroupingFilterStore`).
- **Multi-table:** Use `useTableScopedFilters(tableId)` for each table.

---

## 7. Key Files

| Purpose | File |
|---------|------|
| Filter config | `src/configs/filter.config.ts` |
| Main filter hook | `src/hooks/useFilterChainLeads.ts` |
| Filter provider value | `src/hooks/useFilterProviderValue.ts` |
| Dashboard filter builder | `src/app/.../useDashboardFilters.ts` |
| Filter state store | `src/stores/filterStateStore.ts` |
| Filter utils | `src/utils/filterUtils.ts` |
| Group utils | `src/utils/groupUtils.tsx` |
| Filter context | `src/contexts/FilterContext.tsx` |
| Filters dropdown | `src/components/shared/ActionBar/FiltersDropdown.tsx` |
| Group-by UI | `src/components/groupAndFiltering/GroupByOptions.tsx` |
| Custom filter UI | `src/components/groupAndFiltering/CustomFilterOption.tsx` |
| Filter tags | `src/components/shared/FilterTags/FilterTags.tsx` |
| Search + filters entry | `src/components/shared/ActionBar/SearchListAndGlobalSearch.tsx` |

See [GROUPING_AND_FILTERING_GUIDE.md](./GROUPING_AND_FILTERING_GUIDE.md) for full file reference and implementation patterns.

---

## 8. Quick Reference — Filter Flow by Page

| Page | Domain source | GroupBy source |
|------|---------------|----------------|
| Leads (live, recycle, archived) | Filter chain + locked + user | filterStateStore |
| Offers | locked + user | filterStateStore |
| Openings (single) | Filter chain + locked + user | filterStateStore |
| Openings (multi-tab) | Per-table from multiTableFilterStore | Per-table |
| Cashflow | Per-table from multiTableFilterStore | Per-table |
| Users, Banks, Projects | Filter chain + user | filterStateStore |

---

*Last updated: Phase G1–G7 completion. See GROUPING_AND_FILTERING_GUIDE.md for implementation details.*
