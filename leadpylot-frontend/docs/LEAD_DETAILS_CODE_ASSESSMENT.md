# Lead Details Page — Code Assessment & Improvement Guide

**Route:** `/dashboards/leads/[id]`  
**Example URL:** `http://localhost:3001/dashboards/leads/698bfddd88abf9610d114a83`  
**Date:** February 2025

---

## Executive Summary

| Category | Score | Notes |
|----------|-------|-------|
| **Overall** | 5.5/10 | Functional but needs refactoring for maintainability & performance |
| **Code Quality** | 5/10 | God component, type safety issues, dead code |
| **Performance** | 5/10 | Overlapping effects, unnecessary re-renders, duplicate logic |
| **React Best Practices** | 5/10 | Unstable deps, missing memoization, effect anti-patterns |
| **Maintainability** | 6/10 | Modular child components, but orchestration is monolithic |
| **Architecture** | 6/10 | Clear separation in children; page layer is overloaded |

---

## 1. Component Architecture

### Current Structure

```
page.tsx (912 lines) ← GOD COMPONENT
├── LeadDetails.tsx (293 lines)
│   ├── LeadHeader
│   ├── AddOpeningSection
│   ├── LeadAdditionalInfo
│   └── LeadDetailsModals
```

### Issues

- **Single Responsibility Violation:** `page.tsx` handles routing, API parsing (3 endpoints), data fetching (4 hooks), Zustand sync, index calculation, URL binding, error handling, and rendering.
- **Recommended:** Split into `useLeadDetailsData`, `useLeadNavigationSync`, and a thin page component (<150 lines).

---

## 2. Critical Bugs & Fixes

### 2.1 Delete Will Crash (P0)

**Location:** `useLeadNavigationHandlers.ts:84`

```ts
const data = await actions.permanentDelete.mutateAsync([leadId]);
```

**Problem:** `useLeadActions` does not expose `permanentDelete`; it exposes `handleDelete` and `bulkDeleteMutation`.

**Impact:** Clicking "Delete" → "Confirm" throws `Cannot read property 'mutateAsync' of undefined`.

**Fix:**
```ts
// useLeadActions.tsx - add:
import { usePermanentDeleteLead } from '@/services/hooks/useLeads';

const permanentDelete = usePermanentDeleteLead();
return { ..., permanentDelete };
```

---

### 2.2 URL Highlight Never Passed (P1)

**Location:** `page.tsx:86, 895`

`highlightedOfferId` state (from `?highlightOffer=...`) is never passed to `LeadDetails`. Only `highlightedOfferIdFromProps` (from `detailsId`) is used.

**Fix:** Merge sources before passing:
```ts
highlightedOfferId={highlightedOfferIdFromProps || highlightedOfferId || undefined}
```

---

### 2.3 Missing Loading State (P1)

**Location:** `page.tsx:867-872`

`isOffersProgressLoading` is not checked. When `shouldFetchOffersProgress` is true, skeleton may disappear before data is ready.

**Fix:**
```ts
if (
  isLoading ||
  (shouldFetchLeads && isLeadsLoading) ||
  (shouldFetchOffers && isOffersLoading) ||
  (shouldFetchOffersProgress && isOffersProgressLoading) ||
  !lead
) { /* show skeleton */ }
```

---

### 2.4 handleAddOpeningClick Not Wired (P2)

`BankOfferOpeningTerminTaskHistorySectionTab` expects `handleAddOpeningClick` but `LeadAdditionalInfo` never receives or passes it. The "Add Opening" button in OffersTable may not open the AddOpeningSection.

**Fix:** Pass `handleAddOpeningClick` from `LeadDetails` → `LeadAdditionalInfo` → `BankOfferOpeningTerminTaskHistorySectionTab`.

---

## 3. Performance Issues

### 3.1 Overlapping Effects (High Impact)

**Location:** `page.tsx` — 3 large effects (lines 302-524, 541-707, 711-839)

| Effect | Purpose | Redundancy |
|--------|---------|------------|
| 1 | Store sync + index set | Overlaps with 2 & 3 |
| 2 | Set navigation index | Same logic as 3 |
| 3 | Set index after data stored | Same logic as 2 |

**Impact:** Same index-calculation and data-transformation logic runs multiple times per navigation/refresh.

**Fix:** Consolidate into a single `useLeadNavigationSync` hook that:
1. Syncs data to store when loaded
2. Computes and sets index once

---

### 3.2 Expensive Change Detection

**Location:** `page.tsx:414-421`

```ts
const dataKey = JSON.stringify({
  dataLength: dataToStore.length,
  page: metaToUse?.page,
  ...
});
```

**Problem:** `JSON.stringify` on every effect run is costly for large lists.

**Fix:** Compare primitives:
```ts
const dataChanged =
  dataToStore.length !== lastDataLengthRef.current ||
  (metaToUse?.total ?? 0) !== lastTotalRef.current;
```

---

### 3.3 React.memo Ineffective

**Location:** `LeadDetails.tsx:157-187`

`headerProps` useMemo depends on `navigation`, `navHandlers`, `assignment`, `reclamationModal` — all objects that change every render.

**Impact:** `LeadHeader` (wrapped in `React.memo`) receives new props every render; memoization does nothing.

**Fix:** Pass stable references or primitives:
- Memoize `navHandlers` with `useCallback` in `useLeadNavigationHandlers`
- Pass individual primitive values instead of whole objects where possible
- Use `useMemo` with stable deps (e.g. `navigation?.currentPosition` instead of `navigation`)

---

### 3.4 Duplicate useLead in AddOpeningSection

**Location:** `AddOpeningSection.tsx:143`

```ts
const { data: lead } = useLead(leadId);
```

**Problem:** Parent `LeadDetails` already has `lead` from `useLead(id)`. AddOpeningSection re-fetches.

**Fix:** Pass `lead` or `lead?.project?.[0]?.agent?.offers` as prop from parent.

---

### 3.5 useLeadNavigation — 15+ Store Subscriptions

**Location:** `useLeadNavigation.tsx`

Each `useFilterAwareLeadsNavigationStore(selector)` causes re-renders when that slice changes. Subscribing to many slices amplifies re-renders.

**Fix:** Use `getState()` inside callbacks for values not needed for render; subscribe only to what drives UI.

---

## 4. React Best Practices Violations

### 4.1 Unstable useCallback

**Location:** `page.tsx:111-113`

```ts
const handleAddOpeningClick = useCallback(() => {
  setIsAddOpeningOpen(!isAddOpeningOpen);
}, [isAddOpeningOpen]);
```

**Rule:** `rerender-functional-setstate` — use functional updates for stable callbacks.

**Fix:**
```ts
const handleAddOpeningClick = useCallback(() => {
  setIsAddOpeningOpen(prev => !prev);
}, []);
```

---

### 4.2 Effect with Object in Dependencies

**Location:** `LeadDetails.tsx:126-130`

```ts
useEffect(() => {
  if (offerToEdit) editOfferForm.setIsAddOfferOpen(true);
}, [offerToEdit, editOfferForm]);
```

**Problem:** `editOfferForm` is a new object each render.

**Fix:**
```ts
useEffect(() => {
  if (offerToEdit) {
    useOfferForm.getState?.()?.setIsAddOfferOpen?.(true);
    // OR: depend only on offerToEdit and a stable setter
  }
}, [offerToEdit]);
```

---

### 4.3 Unnecessary setTimeout(0)

**Locations:**
- `page.tsx:93-95`
- `LeadAdditionalInfo.tsx:144-146, 153-155`
- `OpeningTableLeadDetails.tsx:62-65`

**Rule:** Avoid artificial delays; use proper reactivity.

**Fix:** Use `setState` directly in effects. For highlight animation, a single delayed clear is sufficient.

---

### 4.4 Barrel Imports (Bundle)

**Rule:** `bundle-barrel-imports` — import directly to reduce bundle size.

**Example:** Prefer `import { Button } from '@/components/ui/Button'` over `import { Button } from '@/components/ui'` when only one export is needed.

---

### 4.5 Dynamic Import for Heavy Components

**Rule:** `bundle-dynamic-imports` — use `next/dynamic` for below-the-fold or tab content.

**Candidates:**
- `ComposeMailModal` (only when composing)
- `OpeningDetailsViewForLead` (only when opening selected)
- `UpdatesActivity` (already dynamic — good)

---

## 5. Code Quality Issues

### 5.1 Type Safety

| File | Issue |
|------|-------|
| `page.tsx` | `state: any` in store selectors, `skeletonLeadData as any` |
| `LeadDetailsModals.tsx` | All props typed as `any` |
| `LeadDetails.tsx` | `queueInfo?: any`, `offerToEdit: any` |
| `LeadAdditionalInfo.tsx` | `lead as any`, `assignment: any` |

**Fix:** Define and use proper interfaces (e.g. `LeadDetailsModalsProps`, `QueueInfo`, etc.).

---

### 5.2 Dead Code

- `page.tsx:87` — commented `[tabActive, setTabActive]`
- `page.tsx:903-908` — commented `LeadsInformationTab`
- `LeadAdditionalInfo.tsx:39-47` — props prefixed with `_` (unused): `_onMeetingClick`, `_onDelete`, `_onReclamationClick`, `_assignment`

**Fix:** Remove or implement. Use ESLint `no-unused-vars` with args convention.

---

### 5.3 Magic Numbers

| Value | Location | Suggestion |
|-------|----------|------------|
| `2000` | page.tsx:99 (clear highlight ms) | `const HIGHLIGHT_DURATION_MS = 2000` |
| `50` | Default limit | `const DEFAULT_PAGE_LIMIT = 50` |
| `100` | useAllProjects limit | `const PROJECTS_LIMIT = 100` |

---

### 5.4 Duplicate Interfaces

`NavigationData` and `UIHints` are defined in both `LeadDetails.tsx` and `LeadHeader.tsx`. Extract to `@/types/leadDetails.ts` or similar.

---

## 6. Duplicate Logic to Extract

### 6.1 Offers → Leads Normalization

Same mapping appears 4+ times:

```ts
offers.map((offer: any) => ({
  ...offer,
  _id: String(offer?.lead_id?._id || offer?.leadId || offer?._id),
  leadId: offer?.lead_id?._id || offer?.leadId,
}))
```

**Fix:** Create `utils/normalizeOffersToLeads.ts`:

```ts
export function normalizeOffersToLeads<T extends { lead_id?: { _id?: string }; leadId?: string; _id?: string }>(
  offers: T[]
): Array<T & { _id: string; leadId?: string }> {
  return offers
    .map((offer) => ({
      ...offer,
      _id: String(offer?.lead_id?._id || offer?.leadId || offer?._id ?? ''),
      leadId: offer?.lead_id?._id || offer?.leadId,
    }))
    .filter((item) => Boolean(item._id));
}
```

---

### 6.2 URL Param Parsing

`page.tsx` and `useLeadNavigation.tsx` both parse `apiUrl` with similar logic. Extract `parseApiUrlParams(url: string)` to a shared utility.

---

### 6.3 Pagination Meta Construction

Same `paginationMeta` object is built in multiple places. Extract `buildPaginationMeta(meta)`.

---

## 7. Improvement Roadmap

### Phase 1: Critical Fixes (1–2 days)

1. Fix `permanentDelete` in useLeadActions
2. Fix loading state (add isOffersProgressLoading)
3. Wire `highlightedOfferId` from URL to LeadDetails
4. Wire `handleAddOpeningClick` from LeadDetails to BankOfferOpeningTerminTaskHistorySectionTab

### Phase 2: Performance (2–3 days)

1. Replace `handleAddOpeningClick` useCallback with functional setState
2. Consolidate the 3 index-setting effects into one
3. Replace JSON.stringify change detection with primitive comparison
4. Fix headerProps useMemo deps or split LeadHeader props
5. Pass lead to AddOpeningSection instead of re-fetching

### Phase 3: Code Quality (2–3 days)

1. Extract `normalizeOffersToLeads`, `parseApiUrlParams`, `buildPaginationMeta`
2. Create `useLeadNavigationSync` hook and move logic from page
3. Create `useLeadDetailsProps` for prop normalization
4. Add proper TypeScript types, remove `any`
5. Remove dead code and add constants for magic numbers

### Phase 4: Architecture (3–5 days)

1. Split page.tsx into thin orchestrator + hooks
2. Extract shared types (NavigationData, UIHints)
3. Consider React Query for navigation data (deduplication, caching)
4. Add dynamic imports for heavy modals/panels

---

## 8. React Best Practices Checklist

| Practice | Status | Action |
|----------|--------|--------|
| Functional setState for stable callbacks | ❌ | Fix handleAddOpeningClick |
| Minimal effect dependencies | ❌ | Fix editOfferForm effect |
| No setTimeout(0) for state | ❌ | Replace with direct setState |
| Memoization with stable deps | ❌ | Fix headerProps, apiUrlInfo |
| Single responsibility per component | ❌ | Split page.tsx |
| Proper TypeScript (no any) | ❌ | Add interfaces |
| Dynamic import for heavy components | ⚠️ | Consider for modals |
| Direct imports (no barrels) | ⚠️ | Audit imports |
| React.memo with stable props | ❌ | Fix LeadHeader |
| Extract custom hooks for logic | ❌ | Create useLeadNavigationSync |

---

## 9. Files Reference

| File | Lines | Primary Issues |
|------|-------|-----------------|
| `page.tsx` | 912 | God component, 3 overlapping effects, unused state, missing loading |
| `LeadDetails.tsx` | 293 | Unstable headerProps deps, editOfferForm effect |
| `LeadAdditionalInfo.tsx` | 245 | setTimeout(0), unused props, parseRevenueString in component |
| `BankOfferOpeningTerminTaskHistorySectionTab.tsx` | 272 | handleAddOpeningClick not received |
| `RightSidebar.tsx` | 53 | Minimal — OK |
| `useLeadNavigation.tsx` | 628 | Too many store subscriptions, large callbacks |
| `useLeadActions.tsx` | 53 | Missing permanentDelete |
| `useLeadNavigationHandlers.ts` | 195 | Expects actions.permanentDelete |

---

## 10. Quick Wins (Under 1 Hour)

1. Fix `handleAddOpeningClick` useCallback (1 line)
2. Add `isOffersProgressLoading` to loading check (1 line)
3. Merge `highlightedOfferId` sources when passing to LeadDetails (1 line)
4. Remove commented code (5 lines)
5. Extract `HIGHLIGHT_DURATION_MS` and `DEFAULT_PAGE_LIMIT` constants

---

*Generated as part of Lead Details code assessment. For questions, refer to individual file analyses.*
