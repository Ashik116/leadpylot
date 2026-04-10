/**
 * @deprecated Use useFilterStateStore from filterStateStore.ts
 * This file re-exports for backwards compatibility during Phase E migration.
 */
import { useFilterStateStore } from './filterStateStore';

export const useDynamicFiltersStore = useFilterStateStore;
