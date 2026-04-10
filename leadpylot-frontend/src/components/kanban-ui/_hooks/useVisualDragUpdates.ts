'use client';

import { useCallback, useRef } from 'react';
import { BoardData, Task, List } from '../types';
import { calculateInsertPosition, moveUnique, normalizeColumns } from '../_utils/dragUtils';
import { arrayMove } from '@dnd-kit/sortable';

interface UseVisualDragUpdatesProps {
  boardData: BoardData;
  setBoardData: React.Dispatch<React.SetStateAction<BoardData>>;
  inboxCards: Task[];
  setInboxCards: React.Dispatch<React.SetStateAction<Task[]>>;
  findContainer: (id: string) => string | undefined;
}

/**
 * Hook for handling optimistic visual updates during drag operations
 */
export const useVisualDragUpdates = ({
  boardData,
  setBoardData,
  inboxCards,
  setInboxCards,
  findContainer,
}: UseVisualDragUpdatesProps) => {
  // Ref to store pending board state from visual updates - used by persistTaskMove to avoid stale closure
  const pendingBoardDataRef = useRef<BoardData | null>(null);

  /**
   * Move card between containers (visual update only)
   */
  const moveCardBetweenContainers = useCallback(
    (
      activeId: string,
      sourceContainer: string,
      destContainer: string,
      insertIndex: number,
      card: Task
    ) => {
      setBoardData((prev) => {
        const sourceList = prev.columns[sourceContainer];
        const destList = prev.columns[destContainer];

        // Guard: if either list doesn't exist (e.g., board switched), skip update
        if (!sourceList || !destList) {
          return prev;
        }

        // Fast path: moving inside the same list (common during drag-over re-positioning)
        if (sourceContainer === destContainer) {
          const currentIndex = destList.cardIds.indexOf(activeId);
          const clampedIndex = Math.max(0, Math.min(insertIndex, destList.cardIds.length - 1));

          // No-op: avoid state update churn
          if (currentIndex === -1 || currentIndex === clampedIndex) {
            return prev;
          }

          const reordered = [...destList.cardIds];
          reordered.splice(currentIndex, 1);
          reordered.splice(clampedIndex, 0, activeId);

          const existingCard = prev.cards[activeId];
          const nextStatus = destList.title;
          const cardChanged = !!existingCard && existingCard.status !== nextStatus;

          const next = {
            ...prev,
            cards: cardChanged
              ? { ...prev.cards, [activeId]: { ...card, status: nextStatus } }
              : prev.cards,
            columns: {
              ...prev.columns,
              [destContainer]: {
                ...destList,
                cardIds: reordered,
              },
            },
          };
          pendingBoardDataRef.current = next;
          return next;
        }

        // Use moveUnique to ensure globally unique move (removes from all columns, inserts at destination)
        const updatedColumns = moveUnique(prev.columns, activeId, destContainer, insertIndex);
        
        // Normalize to ensure no duplicates remain
        const normalizedColumns = normalizeColumns(updatedColumns);

        // Only update card if status changed (most common case)
        const existingCard = prev.cards[activeId];
        const newCard = { ...card, status: destList.title };
        const cardChanged = !existingCard || existingCard.status !== newCard.status;

        const next = {
          ...prev,
          cards: cardChanged 
            ? { ...prev.cards, [activeId]: newCard }
            : prev.cards, // Preserve reference if card unchanged
          columns: normalizedColumns,
        };
        pendingBoardDataRef.current = next;
        return next;
      });
    },
    [setBoardData]
  );

  /**
   * Move card from inbox to list (visual update)
   */
  const moveCardFromInboxToList = useCallback(
    (activeId: string, overContainer: string, insertIndex: number, card: Task) => {
      // Add to board first (check if list exists)
      setBoardData((prev) => {
        const overList = prev.columns[overContainer];
        
        // Guard: if list doesn't exist (e.g., board switched), skip update
        if (!overList) {
          return prev;
        }
        
        // Use moveUnique to ensure globally unique move (removes from all columns, inserts at destination)
        const updatedColumns = moveUnique(prev.columns, activeId, overContainer, insertIndex);
        
        // Normalize to ensure no duplicates remain
        const normalizedColumns = normalizeColumns(updatedColumns);

        // Only update card if status changed (most common case)
        const existingCard = prev.cards[activeId];
        const newCard = { ...card, status: overList.title };
        const cardChanged = !existingCard || existingCard.status !== newCard.status;

        const next = {
          ...prev,
          cards: cardChanged 
            ? { ...prev.cards, [activeId]: newCard }
            : prev.cards, // Preserve reference if card unchanged
          columns: normalizedColumns,
        };
        pendingBoardDataRef.current = next;
        return next;
      });

      // Remove from inbox
      setInboxCards((prev) => prev.filter((c) => c.id !== activeId));
    },
    [setBoardData, setInboxCards]
  );

  /**
   * Move card from list to inbox (visual update)
   */
  const moveCardFromListToInbox = useCallback(
    (activeId: string, sourceContainer: string, card: Task) => {
      // Remove from source list
      setBoardData((prev) => {
        const sourceList = prev.columns[sourceContainer];
        
        // Guard: if list doesn't exist (e.g., board switched), just remove from cards
        if (!sourceList) {
          const newCards = { ...prev.cards };
          delete newCards[activeId];
          return { ...prev, cards: newCards };
        }
        
        // Remove taskId from ALL columns to ensure global uniqueness
        const updatedColumns: Record<string, List> = {};
        for (const [columnId, column] of Object.entries(prev.columns)) {
          updatedColumns[columnId] = {
            ...column,
            cardIds: column.cardIds.filter((id) => id !== activeId),
          };
        }
        
        // Normalize to ensure no duplicates remain
        const normalizedColumns = normalizeColumns(updatedColumns);

        // Remove card from board cards
        const newCards = { ...prev.cards };
        delete newCards[activeId];

        const next = {
          ...prev,
          cards: newCards,
          columns: normalizedColumns,
        };
        pendingBoardDataRef.current = next;
        return next;
      });

      // Add to inbox
      setInboxCards((prev) => {
        // Check if already in inbox (avoid duplicates)
        if (prev.some((c) => c.id === activeId)) {
          return prev;
        }
        return [{ ...card, status: 'Inbox' }, ...prev];
      });
    },
    [setBoardData, setInboxCards]
  );

  /**
   * Revert task to original position on error
   */
  const revertTaskPosition = useCallback(
    (activeId: string, originalState: { container: string; position: number }) => {
      const currentContainer = findContainer(activeId);

      // Handle reverting from inbox to list (list-to-inbox move failed)
      if (originalState.container !== 'inbox' && currentContainer === 'inbox') {
        // Find card in inbox (it's there from visual update)
        const cardInInbox = inboxCards.find((c) => c.id === activeId);

        // Remove from inbox
        setInboxCards((prev) => prev.filter((c) => c.id !== activeId));

            // Restore to original list and boardData.cards
        if (cardInInbox) {
          setBoardData((prev) => {
            // First remove from all columns to ensure uniqueness
            const cols: Record<string, List> = {};
            for (const [columnId, column] of Object.entries(prev.columns)) {
              cols[columnId] = {
                ...column,
                cardIds: column.cardIds.filter((id) => id !== activeId),
              };
            }
            
            // Then restore to original position
            const originalList = cols[originalState.container];
            if (originalList) {
              const originalCardIds = [...originalList.cardIds];
              originalCardIds.splice(originalState.position, 0, activeId);
              cols[originalState.container] = {
                ...originalList,
                cardIds: originalCardIds,
              };
            }
            
            // Normalize to ensure no duplicates
            const normalizedColumns = normalizeColumns(cols);

            // Restore card to boardData.cards
            return {
              ...prev,
              cards: {
                ...prev.cards,
                [activeId]: { ...cardInInbox, status: originalList?.title || 'Unknown' },
              },
              columns: normalizedColumns,
            };
          });
        }
        return;
      }

      // Handle reverting from list to inbox (inbox-to-list move failed)
      if (originalState.container === 'inbox' && currentContainer !== 'inbox') {
        // Find card in current list (it's there from visual update)
        const cardInList = boardData.cards[activeId];

        // Remove from current list
        setBoardData((prev) => {
          // Remove from all columns to ensure uniqueness
          const cols: Record<string, List> = {};
          for (const [columnId, column] of Object.entries(prev.columns)) {
            cols[columnId] = {
              ...column,
              cardIds: column.cardIds.filter((id) => id !== activeId),
            };
          }
          
          // Normalize to ensure no duplicates
          const normalizedColumns = normalizeColumns(cols);
          
          // Remove from cards
          const newCards = { ...prev.cards };
          delete newCards[activeId];
          return { ...prev, cards: newCards, columns: normalizedColumns };
        });

        // Restore to inbox at original position
        if (cardInList) {
          setInboxCards((prev) => {
            // Check if already in inbox
            if (prev.some((c) => c.id === activeId)) {
              return prev;
            }
            // Insert at original position or prepend
            const newCards = [...prev];
            const inboxCard = { ...cardInList, status: 'Inbox' };
            if (originalState.position >= 0 && originalState.position < newCards.length) {
              newCards.splice(originalState.position, 0, inboxCard);
            } else {
              newCards.unshift(inboxCard);
            }
            return newCards;
          });
        }
        return;
      }

      // Handle list-to-list or same-list reversion
      if (originalState.container !== 'inbox') {
        setBoardData((prev) => {
          // First remove from all columns to ensure uniqueness
          const cols: Record<string, List> = {};
          for (const [columnId, column] of Object.entries(prev.columns)) {
            cols[columnId] = {
              ...column,
              cardIds: column.cardIds.filter((id) => id !== activeId),
            };
          }
          
          const originalList = cols[originalState.container];

          // If original container doesn't exist (e.g., switched boards), restore to first available list
          if (!originalList) {
            // Find first available list as fallback
            const firstListId = Object.keys(cols)[0];
            if (firstListId) {
              const firstList = cols[firstListId];
              const newCardIds = [...firstList.cardIds];
              newCardIds.unshift(activeId);
              cols[firstListId] = {
                ...firstList,
                cardIds: newCardIds,
              };

              // Normalize to ensure no duplicates
              const normalizedColumns = normalizeColumns(cols);

              // Ensure card exists in boardData.cards
              const cardInList = boardData.cards[activeId];
              if (cardInList) {
                return {
                  ...prev,
                  cards: {
                    ...prev.cards,
                    [activeId]: { ...cardInList, status: firstList.title },
                  },
                  columns: normalizedColumns,
                };
              }
            }
            // If no lists available, can't restore - return unchanged
            return prev;
          }

          // Restore to original container at original position
          const originalCardIds = [...originalList.cardIds];
          originalCardIds.splice(originalState.position, 0, activeId);
          cols[originalState.container] = {
            ...originalList,
            cardIds: originalCardIds,
          };
          
          // Normalize to ensure no duplicates
          const normalizedColumns = normalizeColumns(cols);

          return { ...prev, columns: normalizedColumns };
        });
      }
    },
    [findContainer, boardData, inboxCards, setBoardData, setInboxCards]
  );

  /**
   * Handle visual update during drag over
   */
  const handleDragOverUpdate = useCallback(
    (
      activeId: string,
      activeContainer: string,
      overContainer: string,
      overId: string,
      card: Task
    ) => {
      // Handle list to inbox move
      if (
        activeContainer !== 'inbox' &&
        activeContainer !== 'external' &&
        overContainer === 'inbox'
      ) {
        moveCardFromListToInbox(activeId, activeContainer, card);
        return;
      }

      // Guard: if target container doesn't exist in current board, skip update
      if (overContainer !== 'inbox' && !boardData.columns[overContainer]) {
        return;
      }

      const insertIndex = calculateInsertPosition(overContainer, overId, activeId, boardData);

      // Remove from inbox if needed
      if (activeContainer === 'inbox') {
        setInboxCards((prev) => prev.filter((c) => c.id !== activeId));
      }

      // Move card visually
      if (
        activeContainer !== 'inbox' &&
        activeContainer !== 'external' &&
        overContainer !== 'inbox'
      ) {
        moveCardBetweenContainers(activeId, activeContainer, overContainer, insertIndex, card);
      } else if (activeContainer === 'inbox' || activeContainer === 'external') {
        // Reuse moveCardFromInboxToList for external cards (adds to board, safe inbox removal)
        moveCardFromInboxToList(activeId, overContainer, insertIndex, card);
      }
    },
    [
      boardData,
      moveCardBetweenContainers,
      moveCardFromInboxToList,
      moveCardFromListToInbox,
      setInboxCards,
    ]
  );

  /**
   * Reorder inbox cards locally
   */
  const reorderInboxCards = useCallback(
    (activeIndex: number, overIndex: number) => {
      setInboxCards((prev) => arrayMove(prev, activeIndex, overIndex));
    },
    [setInboxCards]
  );

  return {
    moveCardBetweenContainers,
    moveCardFromInboxToList,
    moveCardFromListToInbox,
    revertTaskPosition,
    handleDragOverUpdate,
    reorderInboxCards,
    pendingBoardDataRef,
  };
};
