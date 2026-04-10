import { create } from 'zustand';

interface ColumnSizingStore {
  // Map of table instance IDs to their reset functions
  resetFunctions: Map<string, () => void>;

  // Map of table instance IDs to whether they have non-default widths
  hasNonDefaultWidths: Map<string, boolean>;

  // Register a reset function for a specific table instance
  registerResetFunction: (instanceId: string, resetFn: () => void) => void;

  // Unregister a reset function for a specific table instance
  unregisterResetFunction: (instanceId: string) => void;

  // Update whether a table has non-default widths
  updateHasNonDefaultWidths: (instanceId: string, hasNonDefault: boolean) => void;

  // Reset column sizing for a specific table instance
  resetColumnSizing: (instanceId: string) => void;

  // Reset column sizing for all registered tables
  resetAllColumnSizing: () => void;

  // Check if a table instance has a reset function registered
  hasResetFunction: (instanceId: string) => boolean;

  // Check if any table has non-default widths (for showing reset button)
  hasAnyNonDefaultWidths: () => boolean;
}

export const useColumnSizingStore = create<ColumnSizingStore>((set, get) => ({
  resetFunctions: new Map(),
  hasNonDefaultWidths: new Map(),

  registerResetFunction: (instanceId: string, resetFn: () => void) => {
    set((state) => {
      const newResetFunctions = new Map(state.resetFunctions);
      newResetFunctions.set(instanceId, resetFn);
      return { resetFunctions: newResetFunctions };
    });
  },

  unregisterResetFunction: (instanceId: string) => {
    set((state) => {
      const newResetFunctions = new Map(state.resetFunctions);
      const newHasNonDefaultWidths = new Map(state.hasNonDefaultWidths);
      newResetFunctions.delete(instanceId);
      newHasNonDefaultWidths.delete(instanceId);
      return {
        resetFunctions: newResetFunctions,
        hasNonDefaultWidths: newHasNonDefaultWidths,
      };
    });
  },

  updateHasNonDefaultWidths: (instanceId: string, hasNonDefault: boolean) => {
    set((state) => {
      const newHasNonDefaultWidths = new Map(state.hasNonDefaultWidths);
      newHasNonDefaultWidths.set(instanceId, hasNonDefault);
      return { hasNonDefaultWidths: newHasNonDefaultWidths };
    });
  },

  resetColumnSizing: (instanceId: string) => {
    const { resetFunctions } = get();
    const resetFn = resetFunctions.get(instanceId);
    if (resetFn) {
      resetFn();
      // After reset, mark as having default widths
      get().updateHasNonDefaultWidths(instanceId, false);
    }
  },

  resetAllColumnSizing: () => {
    const { resetFunctions } = get();
    resetFunctions.forEach((resetFn, instanceId) => {
      resetFn();
      // After reset, mark as having default widths
      get().updateHasNonDefaultWidths(instanceId, false);
    });
  },

  hasResetFunction: (instanceId: string) => {
    const { resetFunctions } = get();
    return resetFunctions.has(instanceId);
  },

  hasAnyNonDefaultWidths: () => {
    const { hasNonDefaultWidths } = get();
    return Array.from(hasNonDefaultWidths.values()).some((hasNonDefault) => hasNonDefault);
  },
}));
