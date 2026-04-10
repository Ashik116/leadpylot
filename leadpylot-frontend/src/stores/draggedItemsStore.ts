import { create } from 'zustand';

interface DraggedItemsState {
  draggedItem: Record<string, any> | null;
  setDraggedItem: (item: Record<string, any> | null) => void;
  clearDraggedItem: () => void;
}

export const useDraggedItemsStore = create<DraggedItemsState>((set) => ({
  draggedItem: null,
  setDraggedItem: (item: Record<string, any> | null) => {
    set({ draggedItem: item });
  },
  clearDraggedItem: () => {
    set({ draggedItem: null });
  },
}));

