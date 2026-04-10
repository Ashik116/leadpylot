'use client';

import { useCallback, useRef } from 'react';
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { BoardData, Task } from '../types';
import { useDragState } from './useDragState';
import { useVisualDragUpdates } from './useVisualDragUpdates';
import { useTaskMovePersistence } from './useTaskMovePersistence';
import { getDraggingCard } from '../_utils/dragUtils';

interface UseDragHandlersProps {
  boardData: BoardData;
  inboxCards: Task[];
  setBoardData: React.Dispatch<React.SetStateAction<BoardData>>;
  setInboxCards: React.Dispatch<React.SetStateAction<Task[]>>;
  findContainer: (id: string) => string | undefined;
  selectedBoardId: string | null;
  loadListTasks: (boardId: string, listId: string, cursor?: any) => Promise<any>;
  loadInboxTasks: () => Promise<void>;
  setIsDraggingFromInbox: (isDragging: boolean) => void;
  setIsBoardSelectionMode: (isSelectionMode: boolean) => void;
  
}

/**
 * Hook that orchestrates all drag-and-drop handlers
 */
export const useDragHandlers = ({
  boardData,
  inboxCards,
  setBoardData,
  setInboxCards,
  findContainer,
  selectedBoardId,
  loadListTasks,
  loadInboxTasks,
  setIsDraggingFromInbox,
  setIsBoardSelectionMode,
}: UseDragHandlersProps) => {
  const dragState = useDragState();
  // Use requestAnimationFrame to batch dragOver updates and prevent excessive re-renders
  const rafRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<{
    activeId: string;
    activeContainer: string | undefined;
    overContainer: string;
    overId: string;
    card: Task;
  } | null>(null);
  // Track last processed drag-over target to skip duplicate expensive updates
  const lastDragOverTargetRef = useRef<{
    activeId: string;
    activeContainer: string | undefined;
    overContainer: string;
    overId: string;
  } | null>(null);
  // Live container tracking avoids expensive source/destination recalculation lag
  // during cross-list auto-scroll drags.
  const liveContainerRef = useRef<string | undefined>(undefined);
  // RAF throttle for list reordering (separate from card RAF to avoid conflicts)
  const listRafRef = useRef<number | null>(null);
  const pendingListReorderRef = useRef<{ activeIndex: number; overIndex: number } | null>(null);
  
  const { revertTaskPosition, handleDragOverUpdate, reorderInboxCards, pendingBoardDataRef } = useVisualDragUpdates({
    boardData,
    setBoardData,
    inboxCards,
    setInboxCards,
    findContainer,
  });

  const { handleListReorder, persistTaskMove } = useTaskMovePersistence({
    boardData,
    setBoardData,
    selectedBoardId,
    inboxCards,
    loadListTasks,
    loadInboxTasks,
    revertTaskPosition,
    pendingBoardDataRef,
  });

  /**
   * Handle drag start - initialize drag state (batched in single update)
   */
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeId = event.active.id as string;
      const activeType = event.active.data.current?.type as 'List' | 'Card' | undefined;
      const dragType = activeType === 'List' ? 'LIST' : 'CARD';

      // Get card data from the drag event if available
      let cardData: Task | null = (event.active.data.current as any)?.card as Task | undefined ?? null;
      if (!cardData && dragType === 'CARD') {
        const card = getDraggingCard(activeId, null, boardData, inboxCards);
        if (!card) {
          // eslint-disable-next-line no-console
          console.warn(`Could not find card data for drag ID: ${activeId}`);
        }
        cardData = card ?? {
          id: activeId,
          title: 'Unknown Card',
          description: '',
          labels: [],
          members: [],
          checklist: [],
          checklists: [],
          comments: [],
          emails: [],
          status: 'Unknown',
          isCompleted: false,
          leadId: activeId,
          agent: 'unassigned',
          project: 'N/A',
          contact: 'Unknown',
          phone: '',
          email: '',
          revenue: '0',
          source: 'Unknown',
        } as Task;
      }

      // Compute original position
      const originalContainer = findContainer(activeId);
      let originalState: { container: string; position: number } | null = null;
      if (originalContainer && originalContainer !== 'inbox') {
        const originalPosition = boardData.columns[originalContainer]?.cardIds.indexOf(activeId) ?? -1;
        originalState = { container: originalContainer, position: originalPosition };
        setIsDraggingFromInbox(false);
      } else if (originalContainer === 'inbox') {
        originalState = { container: 'inbox', position: inboxCards.findIndex((c) => c.id === activeId) };
        setIsDraggingFromInbox(true);
      } else {
        setIsDraggingFromInbox(false);
      }

      // Single batched state update (reduces re-renders from 5+ to 1)
      dragState.initDragState({
        id: activeId,
        dragType,
        cardData,
        originalState,
        originalColumnOrder: dragType === 'LIST' ? [...boardData.columnOrder] : null,
      });

      // Reset drag-over cache for new drag session
      lastDragOverTargetRef.current = null;
      liveContainerRef.current = originalContainer;
    },
    [boardData, inboxCards, findContainer, dragState, setIsDraggingFromInbox]
  );

  /**
   * Handle drag over - visual updates during drag
   */
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Handle live list reordering (RAF-throttled like card drag)
      if (dragState.dragType === 'LIST') {
        const activeIndex = boardData.columnOrder.indexOf(activeId);
        const overIndex = boardData.columnOrder.indexOf(overId);

        if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
          pendingListReorderRef.current = { activeIndex, overIndex };

          if (listRafRef.current === null) {
            listRafRef.current = requestAnimationFrame(() => {
              const pending = pendingListReorderRef.current;
              if (pending) {
                setBoardData((prev) => {
                  const newOrder = [...prev.columnOrder];
                  const activeIdOrder = newOrder[pending.activeIndex];
                  newOrder.splice(pending.activeIndex, 1);
                  newOrder.splice(pending.overIndex, 0, activeIdOrder);
                  return { ...prev, columnOrder: newOrder };
                });
                pendingListReorderRef.current = null;
              }
              listRafRef.current = null;
            });
          }
        }
        return;
      }

      // Prefer live container ref; fall back to lookup for safety.
      const activeContainer = liveContainerRef.current ?? findContainer(activeId);
      // Explicitly check for inbox droppable area
      const overContainer =
        overId === 'inbox'
          ? 'inbox'
          : findContainer(overId) || (boardData.columns[overId] ? overId : null);

      if (!overContainer) return;

      // Update live container as soon as we have a valid cross-container target.
      // Do NOT skip same-list: we need handleDragOverUpdate for same-list reordering
      // so boardData is updated during drag. Otherwise the card snaps back on drop.
      liveContainerRef.current = overContainer;

      const card =
        (active.data.current as any)?.card ||
        boardData.cards[activeId] ||
        inboxCards.find((c) => c.id === activeId) ||
        dragState.draggingCardData;

      if (!card) return;

      // When pointer is over the dragged item itself, nothing meaningful changes.
      // Skipping this removes a large amount of cross-list drag-over churn.
      if (overId === activeId && activeContainer === overContainer) {
        return;
      }

      // Skip if target hasn't changed since last processed frame
      const lastTarget = lastDragOverTargetRef.current;
      if (
        lastTarget &&
        lastTarget.activeId === activeId &&
        lastTarget.activeContainer === activeContainer &&
        lastTarget.overContainer === overContainer &&
        lastTarget.overId === overId
      ) {
        return;
      }
      lastDragOverTargetRef.current = { activeId, activeContainer, overContainer, overId };

      // Store pending update
      pendingUpdateRef.current = {
        activeId,
        activeContainer: activeContainer || 'external',
        overContainer,
        overId,
        card,
      };

      // Cancel pending RAF if exists
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      // Use requestAnimationFrame to batch updates on the next frame
      // This prevents blocking the main thread while dragging
      rafRef.current = requestAnimationFrame(() => {
        if (pendingUpdateRef.current) {
          const { activeId, activeContainer, overContainer, overId, card } = pendingUpdateRef.current;
          handleDragOverUpdate(activeId, activeContainer || '', overContainer, overId, card);
          pendingUpdateRef.current = null;
        }
        rafRef.current = null;
      });
    },
    [boardData, inboxCards, findContainer, handleDragOverUpdate, dragState, setBoardData]
  );

  /**
   * Handle drag end - finalize drag and persist changes
   */
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const activeId = active.id as string;

      // Clear dragging states
      setIsDraggingFromInbox(false);
      setIsBoardSelectionMode(false);
      lastDragOverTargetRef.current = null;
      liveContainerRef.current = undefined;

      // Handle drag cancelled
      if (!over) {
        if (dragState.originalState && dragState.originalState.container !== 'inbox') {
          revertTaskPosition(activeId, dragState.originalState);
        }
        dragState.resetDragState();
        return;
      }

      const overId = over.id as string;

      // Handle list reordering
      if (dragState.dragType === 'LIST') {
        const hasMoved =
          JSON.stringify(boardData.columnOrder) !== JSON.stringify(dragState.originalColumnOrder);
        if (hasMoved) {
          await handleListReorder(activeId, overId, dragState.originalColumnOrder || undefined);
        }
        dragState.resetDragState();
        return;
      }

      // Explicitly check for inbox droppable area
      const finalContainer =
        overId === 'inbox'
          ? 'inbox'
          : findContainer(overId) || (boardData.columns[overId] ? overId : null);

      // Early exit if no valid drop target or original state
      if (!finalContainer || !dragState.originalState) {
        dragState.resetDragState();
        return;
      }

      // Check if actually moved (including moves to/from inbox)
      const isSameList = dragState.originalState.container === finalContainer;
      const isToInbox = finalContainer === 'inbox';

      // For inbox moves, check if container changed
      // For list moves, check position or container change
      const currentPosition = isToInbox
        ? -1 // Inbox doesn't have indexed positions
        : boardData.columns[finalContainer]?.cardIds.indexOf(activeId);

      const hasMoved =
        finalContainer !== dragState.originalState.container ||
        (!isToInbox && currentPosition !== dragState.originalState.position) ||
        isSameList; // Always update for same-list moves

      // Allow moves to inbox even without selectedBoardId (inbox is global)
      if (hasMoved && (selectedBoardId || isToInbox)) {
        // Optimistic update for inbox reordering
        if (isSameList && isToInbox) {
          const activeIndex = inboxCards.findIndex((c) => c.id === activeId);
          let overIndex = inboxCards.findIndex((c) => c.id === overId);

          if (overIndex === -1 && overId === 'inbox') {
            overIndex = inboxCards.length - 1;
          }

          if (activeIndex !== -1 && overIndex !== -1) {
            reorderInboxCards(activeIndex, overIndex);
          }
        }

        const card = getDraggingCard(activeId, dragState.draggingCardData, boardData, inboxCards);
        if (card) {
          await persistTaskMove(activeId, finalContainer, dragState.originalState, overId, card);
        }
      }

      // Keep live container in sync for the current drag session.
      liveContainerRef.current = finalContainer;

      dragState.resetDragState();
    },
    [
      boardData,
      inboxCards,
      findContainer,
      selectedBoardId,
      dragState,
      revertTaskPosition,
      handleListReorder,
      persistTaskMove,
      setIsDraggingFromInbox,
      setIsBoardSelectionMode,
      reorderInboxCards,
    ]
  );

  /**
   * Handle drag cancel (escape key / interrupted drag)
   * Must reset UI flags the same way as drag end.
   */
  const handleDragCancel = useCallback(() => {
    // Cancel any scheduled drag-over updates
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingUpdateRef.current = null;

    if (listRafRef.current !== null) {
      cancelAnimationFrame(listRafRef.current);
      listRafRef.current = null;
    }
    pendingListReorderRef.current = null;

    // Reset drag-related UI state
    setIsDraggingFromInbox(false);
    setIsBoardSelectionMode(false);
    lastDragOverTargetRef.current = null;
    liveContainerRef.current = undefined;

    // Reset drag state snapshot
    dragState.resetDragState();
  }, [dragState, setIsBoardSelectionMode, setIsDraggingFromInbox]);

  return {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    dragState,
    revertTaskPosition,
  };
};
