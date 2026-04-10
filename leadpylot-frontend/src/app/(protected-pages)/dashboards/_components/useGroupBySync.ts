import React from 'react';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';

type UseGroupBySyncArgs = {
  selectedGroupBy: string[];
  handleGroupByArrayChange: (groupBy: string[]) => void;
  chainHandleClearGroupByFilter: () => void;
  clearSelectedItems: () => void;
  setHasManuallyClearedGroupFilter: (value: boolean) => void;
  setIsMultiLevelGroupingApplied: (value: boolean) => void;
};

export const useGroupBySync = ({
  selectedGroupBy,
  handleGroupByArrayChange,
  chainHandleClearGroupByFilter,
  clearSelectedItems,
  setHasManuallyClearedGroupFilter,
  setIsMultiLevelGroupingApplied,
}: UseGroupBySyncArgs) => {
  // CRITICAL: Sync store changes back to useFilterChainLeads (one-way: store -> useFilterChainLeads)
  // This ensures GroupByOptions changes (which update the store directly) are reflected in UnifiedDashboard
  // GroupByOptions calls setGroupBy on the universal store, so we need to sync that to useFilterChainLeads
  const storeGroupBy = useUniversalGroupingFilterStore((state) => state.groupBy);
  const isSyncingRef = React.useRef(false);
  const lastSyncedStoreValueRef = React.useRef<string>('');
  const syncTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Helper function to compare arrays by their sorted contents (order-independent)
  // This prevents infinite loops when handleGroupByArrayChange reorders arrays for agents
  const arraysEqual = React.useCallback((a: string[], b: string[]): boolean => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }, []);

  // Helper function to get a stable string representation (order-independent)
  const getArrayKey = React.useCallback((arr: string[]): string => {
    if (!Array.isArray(arr)) return '';
    return [...arr].sort().join(',');
  }, []);

  React.useEffect(() => {
    // Cleanup any pending sync on unmount
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    // Skip if we're currently syncing to avoid circular updates
    if (isSyncingRef.current) {
      return;
    }

    // Only sync if store has a different value than useFilterChainLeads
    if (!Array.isArray(storeGroupBy)) {
      // If store is not an array, don't sync (invalid state)
      return;
    }

    // Use order-independent comparison to prevent loops when arrays are reordered
    const storeKey = getArrayKey(storeGroupBy);
    const lastSyncedKey = lastSyncedStoreValueRef.current;

    // Sync logic:
    // 1. Sync when store has values (non-empty) - normal case
    // 2. Sync when store becomes empty AND selectedGroupBy has values - intentional clearing
    // 3. Sync when store is empty AND selectedGroupBy is empty BUT lastSyncedKey was non-empty - intentional clearing
    // Do NOT sync when store is empty AND selectedGroupBy is also empty AND lastSyncedKey was empty - prevents accidental clearing on initial load
    const isStoreEmpty = storeGroupBy.length === 0;
    const isSelectedEmpty = !Array.isArray(selectedGroupBy) || selectedGroupBy.length === 0;
    const wasLastSyncedEmpty = lastSyncedKey === '';
    const shouldSyncEmpty = isStoreEmpty && !isSelectedEmpty; // Intentional clearing (store empty, selected has values)
    const shouldSyncEmptyToEmpty = isStoreEmpty && isSelectedEmpty && !wasLastSyncedEmpty; // Intentional clearing (both empty now, but was non-empty before)
    const shouldSyncNonEmpty = !isStoreEmpty && !arraysEqual(storeGroupBy, selectedGroupBy); // Normal sync

    if (
      (shouldSyncNonEmpty || shouldSyncEmpty || shouldSyncEmptyToEmpty) &&
      storeKey !== lastSyncedKey
    ) {
      // Clear any pending sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Mark that we're syncing to prevent circular update
      isSyncingRef.current = true;
      lastSyncedStoreValueRef.current = storeKey;

      // Use setTimeout to ensure the sync happens after current render cycle
      syncTimeoutRef.current = setTimeout(() => {
        handleGroupByArrayChange(storeGroupBy);
        // Reset sync flag after state updates complete
        syncTimeoutRef.current = setTimeout(() => {
          isSyncingRef.current = false;
          syncTimeoutRef.current = null;
        }, 50);
      }, 0);
    }
  }, [storeGroupBy, handleGroupByArrayChange, selectedGroupBy, arraysEqual, getArrayKey]);

  // Also sync selectedGroupBy back to store (one-way: useFilterChainLeads -> store)
  // This ensures when useFilterChainLeads updates, the store is also updated
  // BUT: Only sync if the arrays are actually different (order-independent comparison)
  const { setGroupBy: setStoreGroupBy } = useUniversalGroupingFilterStore();
  React.useEffect(() => {
    // Skip if we're currently syncing from store to avoid circular updates
    if (isSyncingRef.current) {
      return;
    }

    // Only sync if selectedGroupBy has a different value than store (order-independent)
    if (Array.isArray(selectedGroupBy)) {
      const selectedKey = getArrayKey(selectedGroupBy);
      const lastSyncedKey = lastSyncedStoreValueRef.current;

      // Only sync if arrays are actually different (order-independent) and we haven't just synced this value
      if (!arraysEqual(selectedGroupBy, storeGroupBy) && selectedKey !== lastSyncedKey) {
        // Clear any pending sync
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }

        // Mark that we're syncing to prevent circular update
        isSyncingRef.current = true;
        lastSyncedStoreValueRef.current = selectedKey;

        syncTimeoutRef.current = setTimeout(() => {
          setStoreGroupBy(selectedGroupBy);
          syncTimeoutRef.current = setTimeout(() => {
            isSyncingRef.current = false;
            syncTimeoutRef.current = null;
          }, 50);
        }, 0);
      }
    }
  }, [selectedGroupBy, setStoreGroupBy, storeGroupBy, arraysEqual, getArrayKey]);

  // Enhanced clear group filter handler that tracks manual clearing
  const handleClearGroupByFilter = React.useCallback(() => {
    // Clear selections first
    clearSelectedItems();
    // Mark that user has manually cleared the filter
    setHasManuallyClearedGroupFilter(true);
    // Reset Multi Level Grouping state
    setIsMultiLevelGroupingApplied(false);
    // Then clear the group filter
    chainHandleClearGroupByFilter();
  }, [
    clearSelectedItems,
    setHasManuallyClearedGroupFilter,
    setIsMultiLevelGroupingApplied,
    chainHandleClearGroupByFilter,
  ]);

  // Custom handler for Multi Level Grouping
  const handleMultiLevelGrouping = React.useCallback(() => {
    if (handleGroupByArrayChange) {
      handleGroupByArrayChange(['project', 'agent', 'updatedAt']);
      setIsMultiLevelGroupingApplied(true);
    }
  }, [handleGroupByArrayChange, setIsMultiLevelGroupingApplied]);

  // Custom handler for group by changes that resets Multi Level Grouping state
  const handleGroupByArrayChangeWithReset = React.useCallback(
    (newGroupBy: string[]) => {
      handleGroupByArrayChange(newGroupBy);
      setIsMultiLevelGroupingApplied(false); // Reset Multi Level Grouping state when manually changing group by
    },
    [handleGroupByArrayChange, setIsMultiLevelGroupingApplied]
  );

  // Register handlers in filterChainStore so FilterTags can use them
  // Use refs to store latest handlers and prevent infinite loops
  return {
    storeGroupBy,
    handleClearGroupByFilter,
    handleGroupByArrayChangeWithReset,
    handleMultiLevelGrouping,
  };
};
