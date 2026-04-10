# UnifiedDashboard Components

Single dashboard for Offers, Openings, Confirmations, Payments, Netto, Lost, Offer Tickets.

## File Structure

| File | Purpose |
|------|---------|
| `UnifiedDashboard.tsx` | Main orchestrator (~1180 lines). Composes hooks and renders table + dialogs. |
| `UnifiedDashboardContext.tsx` | Context provider for dialog state, selection, mutations. |
| `UnifiedDashboardTable.tsx` | Wraps BaseTable with dashboard-specific props (grouping, entity type). |
| `UnifiedDashboardDialogs.tsx` | All modal dialogs (confirmation, payment, lost, PDF, etc.). |
| `UnifiedDashboardActionButtons.tsx` | Action bar buttons (Create Opening, etc.). |
| `useUnifiedDashboardHandlers.ts` | Drag-drop handlers, clearAllSelections. |
| `useUnifiedDashboardSelection.ts` | Select-all (flat + grouped), row selection sync, isAllSelected. |
| `useDetailsUrlSync.ts` | URL ↔ details panel sync (detailsId, detailsType). |
| `useDashboardFilters.ts` | Builds hookParams, domainFilters for API. |
| `useDashboardActions.ts` | Mutations, handlers (create, edit, docs, PDF). |
| `useDashboardNavigation.ts` | Row click → open details. |
| `useGroupBySync.ts` | Group-by state sync with store. |
| `buildDashboardApiUrl.ts` | Pure function to build API URL for offers/progress. |
| `unifiedDashboardUtils.ts` | getDynamicTitle, getDynamicSubtitle. |
| `dashboardTypes.ts` | TDashboardType, DashboardType enum, getTableNameForDashboardType. |
| `SharedColumnConfig.tsx` | Column definitions for table. |
| `FilterBtn.tsx` | Filter button component. |

## Data Flow

1. **Props** → page config (offers, openings, etc.) passes `useDataHook`, `apiFn`, `config`.
2. **useDashboardFilters** → builds `hookParams`, `domainFilters`.
3. **useDataHook** → fetches data (or uses `preFetchedData` in multi-table mode).
4. **transformedData** → applies `transformData`, attaches `_apiUrl`.
5. **useDetailsUrlSync** → syncs URL with details panel state.
6. **BaseTable** → renders data with columns, selection, grouping.

## Modes

- **Single-table**: Full search, pagination, grouping (offers, confirmation, payment).
- **Multi-table**: `tableProgressFilter` set, `preFetchedData`, no per-table API (openings page).
