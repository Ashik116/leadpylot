import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Checklist, ChecklistItem } from '../types';
import { calculateChecklistProgress } from '../_data/checklists-data';

interface UseChecklistsOptions {
  initialChecklists?: Checklist[];
  onUpdate?: (checklists: Checklist[]) => void;
}

export const useChecklists = (options?: UseChecklistsOptions) => {
  const [checklists, setChecklists] = useState<Checklist[]>(
    options?.initialChecklists || []
  );
  const onUpdateRef = useRef(options?.onUpdate);

  // Keep onUpdate ref up to date
  useEffect(() => {
    onUpdateRef.current = options?.onUpdate;
  }, [options?.onUpdate]);

  // Sync with initialChecklists when card changes
  const syncChecklists = useCallback((newChecklists?: Checklist[]) => {
    setChecklists(newChecklists || []);
  }, []);

  // Create a new checklist
  const addChecklist = useCallback(
    (title: string): Checklist => {
      const newChecklist: Checklist = {
        id: `checklist-${Date.now()}`,
        title,
        items: [],
        hideCheckedItems: false,
      };
      const updated = [...checklists, newChecklist];
      setChecklists(updated);
      onUpdateRef.current?.(updated);
      return newChecklist;
    },
    [checklists]
  );

  // Update checklist
  const updateChecklist = useCallback(
    (id: string, updates: Partial<Omit<Checklist, 'id'>>): Checklist | null => {
      const updated = checklists.map((checklist) =>
        checklist.id === id ? { ...checklist, ...updates } : checklist
      );
      setChecklists(updated);
      onUpdateRef.current?.(updated);
      return updated.find((c) => c.id === id) || null;
    },
    [checklists]
  );

  // Delete checklist
  const deleteChecklist = useCallback(
    (id: string): boolean => {
      const updated = checklists.filter((checklist) => checklist.id !== id);
      setChecklists(updated);
      onUpdateRef.current?.(updated);
      return updated.length !== checklists.length;
    },
    [checklists]
  );

  // Add item to checklist
  const addItem = useCallback(
    (checklistId: string, text: string): ChecklistItem => {
      console.log('addItem', checklistId, text);
      const newItem: ChecklistItem = {
        id: `item-${Date.now()}`,
        text,
        completed: false,
      };
      const updated = checklists.map((checklist) =>
        checklist.id === checklistId
          ? { ...checklist, items: [...checklist.items, newItem] }
          : checklist
      );
      setChecklists(updated);
      onUpdateRef.current?.(updated);
      return newItem;
    },
    [checklists]
  );

  // Update checklist item
  const updateItem = useCallback(
    (
      checklistId: string,
      itemId: string,
      updates: Partial<Omit<ChecklistItem, 'id'>>
    ): ChecklistItem | null => {
      const updated = checklists.map((checklist) =>
        checklist.id === checklistId
          ? {
            ...checklist,
            items: checklist.items.map((item) =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
          }
          : checklist
      );
      setChecklists(updated);
      onUpdateRef.current?.(updated);
      const checklist = updated.find((c) => c.id === checklistId);
      return checklist?.items.find((item) => item.id === itemId) || null;
    },
    [checklists]
  );

  // Delete checklist item
  const deleteItem = useCallback(
    (checklistId: string, itemId: string): boolean => {
      const updated = checklists.map((checklist) =>
        checklist.id === checklistId
          ? {
            ...checklist,
            items: checklist.items.filter((item) => item.id !== itemId),
          }
          : checklist
      );
      setChecklists(updated);
      onUpdateRef.current?.(updated);
      return true;
    },
    [checklists]
  );

  // Toggle item completion
  const toggleItemCompletion = useCallback(
    (checklistId: string, itemId: string): void => {
      const checklist = checklists.find((c) => c.id === checklistId);
      const item = checklist?.items.find((i) => i.id === itemId);
      if (item) {
        updateItem(checklistId, itemId, { completed: !item.completed });
      }
    },
    [checklists, updateItem]
  );

  // Set item due date
  const setItemDueDate = useCallback(
    (
      checklistId: string,
      itemId: string,
      date?: string,
      time?: string,
      reminder?: any
    ): void => {
      updateItem(checklistId, itemId, {
        dueDate: date,
        dueTime: time,
        reminder: reminder || undefined,
      });
    },
    [updateItem]
  );

  // Remove item due date
  const removeItemDueDate = useCallback(
    (checklistId: string, itemId: string): void => {
      updateItem(checklistId, itemId, {
        dueDate: undefined,
        dueTime: undefined,
        reminder: undefined,
      });
    },
    [updateItem]
  );

  // Assign members to item
  const assignMembers = useCallback(
    (checklistId: string, itemId: string, memberIds: string[]): void => {
      updateItem(checklistId, itemId, { assignedMembers: memberIds });
    },
    [updateItem]
  );

  // Remove members from item
  const removeMembers = useCallback(
    (checklistId: string, itemId: string): void => {
      updateItem(checklistId, itemId, { assignedMembers: undefined });
    },
    [updateItem]
  );

  // Get checklist by ID
  const getChecklistById = useCallback(
    (id: string): Checklist | undefined => {
      return checklists.find((c) => c.id === id);
    },
    [checklists]
  );

  // Calculate progress for a checklist
  const getChecklistProgress = useCallback(
    (checklistId: string): number => {
      const checklist = checklists.find((c) => c.id === checklistId);
      if (!checklist) return 0;
      return calculateChecklistProgress(checklist.items);
    },
    [checklists]
  );

  // Get visible items (filtering out checked items if hideCheckedItems is true)
  const getVisibleItems = useCallback(
    (checklistId: string): ChecklistItem[] => {
      const checklist = checklists.find((c) => c.id === checklistId);
      if (!checklist) return [];
      if (checklist.hideCheckedItems) {
        return checklist.items.filter((item) => !item.completed);
      }
      return checklist.items;
    },
    [checklists]
  );

  return {
    checklists,
    addChecklist,
    updateChecklist,
    deleteChecklist,
    addItem,
    updateItem,
    deleteItem,
    toggleItemCompletion,
    setItemDueDate,
    removeItemDueDate,
    assignMembers,
    removeMembers,
    getChecklistById,
    getChecklistProgress,
    getVisibleItems,
    syncChecklists,
  };
};
