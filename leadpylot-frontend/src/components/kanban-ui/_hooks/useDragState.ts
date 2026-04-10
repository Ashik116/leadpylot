'use client';

import { useReducer, useCallback } from 'react';
import { Task } from '../types';

export interface DragState {
  draggingId: string | null;
  draggingCardData: Task | null;
  dragType: 'LIST' | 'CARD' | null;
  originalState: {
    container: string;
    position: number;
  } | null;
  originalColumnOrder: string[] | null;
}

export interface UseDragStateReturn {
  draggingId: string | null;
  draggingCardData: Task | null;
  dragType: 'LIST' | 'CARD' | null;
  originalState: DragState['originalState'];
  setDraggingId: (id: string | null) => void;
  setDraggingCardData: (card: Task | null) => void;
  setDragType: (type: 'LIST' | 'CARD' | null) => void;
  setOriginalState: (state: DragState['originalState']) => void;
  originalColumnOrder: string[] | null;
  setOriginalColumnOrder: (order: string[] | null) => void;
  resetDragState: () => void;
  /** Batch all drag-start state in one update (reduces re-renders) */
  initDragState: (payload: {
    id: string;
    dragType: 'LIST' | 'CARD';
    cardData: Task | null;
    originalState: DragState['originalState'];
    originalColumnOrder?: string[] | null;
  }) => void;
}

const initialState: DragState = {
  draggingId: null,
  draggingCardData: null,
  dragType: null,
  originalState: null,
  originalColumnOrder: null,
};

type DragStateAction =
  | { type: 'INIT_DRAG'; payload: { id: string; dragType: 'LIST' | 'CARD'; cardData: Task | null; originalState: DragState['originalState']; originalColumnOrder?: string[] | null } }
  | { type: 'SET_DRAGGING_CARD_DATA'; payload: Task | null }
  | { type: 'RESET' };

function dragStateReducer(state: DragState, action: DragStateAction): DragState {
  switch (action.type) {
    case 'INIT_DRAG':
      return {
        draggingId: action.payload.id,
        dragType: action.payload.dragType,
        draggingCardData: action.payload.cardData,
        originalState: action.payload.originalState,
        originalColumnOrder: action.payload.originalColumnOrder ?? null,
      };
    case 'SET_DRAGGING_CARD_DATA':
      return { ...state, draggingCardData: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

/**
 * Hook to manage drag state during drag-and-drop operations
 * Uses useReducer to batch updates and reduce re-renders on drag start
 */
export const useDragState = (): UseDragStateReturn => {
  const [state, dispatch] = useReducer(dragStateReducer, initialState);

  const initDragState = useCallback((payload: {
    id: string;
    dragType: 'LIST' | 'CARD';
    cardData: Task | null;
    originalState: DragState['originalState'];
    originalColumnOrder?: string[] | null;
  }) => {
    dispatch({ type: 'INIT_DRAG', payload });
  }, []);

  const setDraggingId = useCallback((id: string | null) => {
    if (id) dispatch({ type: 'INIT_DRAG', payload: { id, dragType: 'CARD', cardData: null, originalState: null } });
  }, []);

  const setDragType = useCallback((_dragType: 'LIST' | 'CARD' | null) => {
    // Kept for API compatibility; prefer initDragState
  }, []);

  const setDraggingCardData = useCallback((card: Task | null) => {
    dispatch({ type: 'SET_DRAGGING_CARD_DATA', payload: card });
  }, []);

  const setOriginalState = useCallback((_originalState: DragState['originalState']) => {
    // Kept for API compatibility; prefer initDragState
  }, []);

  const setOriginalColumnOrder = useCallback((_order: string[] | null) => {
    // Kept for API compatibility; prefer initDragState
  }, []);

  const resetDragState = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    ...state,
    setDraggingId,
    setDraggingCardData,
    setDragType,
    setOriginalState,
    setOriginalColumnOrder,
    resetDragState,
    initDragState,
  };
};
