'use client';

import { BoardData, Task, List } from '../types';

/**
 * Calculate the insert position for a card in a list
 */
export const calculateInsertPosition = (
  listId: string,
  overId: string,
  activeId: string,
  boardData: BoardData
): number => {
  const list = boardData.columns[listId];
  if (!list) return 0;

  // If currently hovering over the dragged card itself, keep current index.
  // This avoids noisy no-op reorders during cross-list auto-scroll.
  if (overId === activeId) {
    const currentIndex = list.cardIds.indexOf(activeId);
    return currentIndex >= 0 ? currentIndex : list.cardIds.length;
  }

  // Work on list without active card so we can continue re-positioning
  // after it has already been inserted into a destination list.
  const cardIdsWithoutActive = list.cardIds.filter((id) => id !== activeId);

  // If dropping over a card, insert before it
  if (overId !== listId && cardIdsWithoutActive.includes(overId)) {
    return cardIdsWithoutActive.indexOf(overId);
  }

  // Otherwise append to end
  return cardIdsWithoutActive.length;
};

/**
 * Calculate positioning payload (before_task_id and after_task_id) for API
 *
 * Rules based on user requirements:
 * - Moving to top (index 0): only after_task_id (the card that will be after the moved card)
 * - Moving to bottom (last position): only before_task_id (the card that will be before the moved card)
 * - Moving to middle: both before_task_id and after_task_id
 */
/**
 * Calculate positioning payload (before_task_id and after_task_id) for API
 * 
 * Rules:
 * - Top position (index 0): only after_task_id
 * - Bottom position (index >= length): only before_task_id
 * - Middle positions: both before_task_id and after_task_id
 * - Center position (even-length lists): both before_task_id and after_task_id
 */
export const calculatePositioning = (
  targetListCardIds: string[],
  activeId: string,
  overId: string,
  finalContainer: string,
  originalPosition?: number,
  insertAtTop?: boolean
): { before_task_id?: string; after_task_id?: string } => {
  // Remove the moved card from the list to get the target list without it
  const targetListWithoutMoved = targetListCardIds.filter((id) => id !== activeId);
  const listLength = targetListWithoutMoved.length;

  // Calculate target index where we're inserting
  const targetIndex = calculateTargetIndex(
    targetListCardIds,
    targetListWithoutMoved,
    activeId,
    overId,
    finalContainer,
    originalPosition,
    insertAtTop
  );

  // Calculate positioning based on target index
  return calculatePositioningFromIndex(targetListWithoutMoved, targetIndex, listLength);
};

/**
 * Calculate the target index where the card should be inserted
 */
function calculateTargetIndex(
  targetListCardIds: string[],
  targetListWithoutMoved: string[],
  activeId: string,
  overId: string,
  finalContainer: string,
  originalPosition: number | undefined,
  insertAtTop: boolean | undefined
): number {
  // If drop target resolves to the dragged card itself, trust its current
  // visual index in the target list.
  if (overId === activeId) {
    const currentIndex = targetListCardIds.indexOf(activeId);
    if (currentIndex >= 0) {
      return Math.min(currentIndex, targetListWithoutMoved.length);
    }
  }

  // Dropped on container (not on a card)
  if (overId === finalContainer) {
    return insertAtTop ? 0 : targetListWithoutMoved.length;
  }

  // Find the card being dropped over
  const overIndex = findOverIndex(
    targetListCardIds,
    targetListWithoutMoved,
    activeId,
    overId
  );

  // Card not found, append to end
  if (overIndex < 0) {
    return targetListWithoutMoved.length;
  }

  // Same-list move: determine direction based on original position
  if (originalPosition !== undefined && originalPosition !== -1) {
    return calculateSameListTargetIndex(
      targetListCardIds,
      targetListWithoutMoved,
      activeId,
      overIndex,
      originalPosition
    );
  }

  // Cross-list move: determine insertion position
  return calculateCrossListTargetIndex(targetListWithoutMoved, overIndex);
}

/**
 * Find the index of the card being dropped over
 */
function findOverIndex(
  targetListCardIds: string[],
  targetListWithoutMoved: string[],
  activeId: string,
  overId: string
): number {
  // Try filtered list first
  const overIndex = targetListWithoutMoved.indexOf(overId);
  if (overIndex >= 0) return overIndex;

  // Try original list (for cross-list moves)
  const overIndexInOriginal = targetListCardIds.indexOf(overId);
  if (overIndexInOriginal < 0) return -1;

  // Adjust index if activeId comes before overId
  const activeIndexInOriginal = targetListCardIds.indexOf(activeId);
  if (activeIndexInOriginal >= 0 && activeIndexInOriginal < overIndexInOriginal) {
    return overIndexInOriginal - 1;
  }

  return overIndexInOriginal;
}

/**
 * Calculate target index for same-list moves
 */
function calculateSameListTargetIndex(
  targetListCardIds: string[],
  targetListWithoutMoved: string[],
  activeId: string,
  overIndex: number,
  originalPosition: number
): number {
  // Count cards before original position (excluding activeId)
  const cardsBeforeOriginal = targetListCardIds
    .slice(0, originalPosition)
    .filter((id) => id !== activeId).length;

  // Moving up: insert before overId
  // Moving down: insert after overId
  return overIndex < cardsBeforeOriginal ? overIndex : overIndex + 1;
}

/**
 * Calculate target index for cross-list moves
 */
function calculateCrossListTargetIndex(
  targetListWithoutMoved: string[],
  overIndex: number
): number {
  const listLength = targetListWithoutMoved.length;
  const isFirstCard = overIndex === 0;
  const isOnlyCard = listLength === 1 && isFirstCard;

  // Single card: drop at top
  if (isOnlyCard) {
    return 0;
  }

  // First card (multi-card list): drop at top
  if (isFirstCard) {
    return 0;
  }

  // Last card & middle cards: insert before the card we're over (matches calculateInsertPosition)
  // E.g. drop over E in [A,B,C,D,E] → [A,B,C,D,X,E] not [A,B,C,D,E,X]
  return overIndex;
}

/**
 * Calculate positioning payload from target index
 */
function calculatePositioningFromIndex(
  targetListWithoutMoved: string[],
  targetIndex: number,
  listLength: number
): { before_task_id?: string; after_task_id?: string } {
  const positioning: { before_task_id?: string; after_task_id?: string } = {};

  // Top position: only after_task_id
  if (targetIndex === 0) {
    if (listLength > 0 && targetListWithoutMoved[0]) {
      positioning.after_task_id = targetListWithoutMoved[0];
    }
    return positioning;
  }

  // Bottom position: only before_task_id
  if (targetIndex >= listLength) {
    const lastTask = targetListWithoutMoved[listLength - 1];
    if (lastTask) {
      positioning.before_task_id = lastTask;
    }
    return positioning;
  }

  // Middle positions: both before_task_id and after_task_id
  // Single-item list bottom case
  if (listLength === 1 && targetIndex === 1) {
    positioning.before_task_id = targetListWithoutMoved[0];
    return positioning;
  }

  // Regular middle positions
  const cardBefore = targetListWithoutMoved[targetIndex - 1];
  const cardAfter = targetListWithoutMoved[targetIndex];

  if (cardBefore) {
    positioning.before_task_id = cardBefore;
  }
  if (cardAfter) {
    positioning.after_task_id = cardAfter;
  }

  // Ensure both are set for center position (even-length lists)
  const centerIndex = Math.floor(listLength / 2);
  if (targetIndex === centerIndex) {
    if (cardBefore) {
      positioning.before_task_id = cardBefore;
    }
    if (cardAfter) {
      positioning.after_task_id = cardAfter;
    }
  }

  return positioning;
}

/**
 * Get the dragging card from various sources
 */
export const getDraggingCard = (
  activeId: string,
  draggingCardData: Task | null,
  boardData: BoardData,
  inboxCards: Task[]
): Task | null => {
  if (draggingCardData) return draggingCardData;
  return boardData.cards[activeId] || inboxCards.find((c) => c.id === activeId) || null;
};

/**
 * Normalize columns by deduplicating cardIds. Preserves column reference when no duplicates.
 */
export const normalizeColumns = (
  columns: Record<string, List>
): Record<string, List> => {
  const normalized: Record<string, List> = {};
  for (const [columnId, column] of Object.entries(columns)) {
    const ids = column.cardIds;
    const unique = ids.length !== new Set(ids).size;
    normalized[columnId] = unique
      ? { ...column, cardIds: Array.from(new Set(ids)) }
      : column;
  }
  return normalized;
};

/**
 * Move a task globally unique across all columns
 * Removes taskId from columns that have it, inserts into destination.
 * Only updates source and destination columns - reuses references for unchanged columns.
 *
 * @param prevColumns - Previous columns state
 * @param taskId - The task ID to move
 * @param toColumnId - Destination column ID
 * @param toIndex - Index to insert at in destination column
 * @returns Updated columns with taskId removed and inserted at destination
 */
export const moveUnique = (
  prevColumns: Record<string, List>,
  taskId: string,
  toColumnId: string,
  toIndex: number
): Record<string, List> => {
  const fromColumnIds = Object.keys(prevColumns).filter((colId) =>
    prevColumns[colId].cardIds.includes(taskId)
  );

  const updatedColumns: Record<string, List> = { ...prevColumns };

  // Step 1: Remove taskId from source column(s)
  for (const colId of fromColumnIds) {
    const column = prevColumns[colId];
    updatedColumns[colId] = {
      ...column,
      cardIds: column.cardIds.filter((id) => id !== taskId),
    };
  }

  // Step 2: Insert taskId into destination column
  const destColumn = updatedColumns[toColumnId] ?? prevColumns[toColumnId];
  if (destColumn) {
    const destCardIds = [...destColumn.cardIds];
    const clampedIndex = Math.max(0, Math.min(toIndex, destCardIds.length));
    destCardIds.splice(clampedIndex, 0, taskId);
    updatedColumns[toColumnId] = { ...destColumn, cardIds: destCardIds };
  }

  return updatedColumns;
};
