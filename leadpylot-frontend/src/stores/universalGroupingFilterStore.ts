/**
 * @deprecated Use useFilterStateStore from filterStateStore.ts
 * This file re-exports for backwards compatibility during Phase E migration.
 */
import { useFilterStateStore } from './filterStateStore';

export type {
  DomainFilter,
  EntityType,
  GroupSummary,
  GroupedSummaryResponse,
  GroupDetailsResponse,
  MetadataFilterOption,
  MetadataValueOption,
  MetadataGranularityOption,
  MetadataGroupOption,
  AvailableOperator,
  MetadataOptionsResponse,
} from './filterStateStore';

export const useUniversalGroupingFilterStore = useFilterStateStore;
