'use client';

import React from 'react';

import { BoardData, Task } from './types';
import { KanbanProvider, useKanban } from './_contexts';
import { useDragHandlers } from './_hooks/useDragHandlers';
import { useKanbanRealtime } from './_hooks/useKanbanRealtime';
import { KanbanDndProvider, KanbanDragOverlay } from './_components/drag';
import { KanbanLayout } from './_components/layout';
import { BoardSelectorOverlay } from './_components/BoardSelectorOverlay';

// ============================================================================
// Inner Component that uses the context
// ============================================================================

const KanbanBoard: React.FC<{
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}> = ({ isDarkMode, onToggleDarkMode }) => {
  const {
    boardData,
    inboxCards,
    activeCardId,
    viewType,
    setActiveCardId,
    closeCardModal,
    setViewType,
    getAllCards,
    setBoardData,
    setInboxCards,
    findContainer,
    isList,
    selectedBoardId,
    loadListTasks,
    loadInboxTasks,
    setIsDraggingFromInbox,
    setIsBoardSelectionMode,
  } = useKanban();

  // Enable real-time updates for the board
  // This connects to Socket.IO and syncs changes from other users
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isConnected: _isRealtimeConnected } = useKanbanRealtime({
    enabled: true,
  });

  // Get drag handlers
  const { handleDragStart, handleDragOver, handleDragEnd, handleDragCancel, dragState } = useDragHandlers({
    boardData,
    inboxCards,
    setBoardData,
    setInboxCards,
    findContainer,
    selectedBoardId,
    loadListTasks: loadListTasks as (boardId: string, listId: string, cursor?: string) => Promise<any>,
    loadInboxTasks,
    setIsDraggingFromInbox,
    setIsBoardSelectionMode,
  });

  // Get dragging card and list for overlay
  // Use ONLY dragState.draggingCardData to ensure card persists even if boardData changes
  // This snapshot is taken at drag start and remains stable across board switches
  const draggingCard = dragState.draggingCardData;

  const draggingList =
    dragState.draggingId && isList(dragState.draggingId)
      ? boardData.columns[dragState.draggingId]
      : null;

  // Handle card click
  const handleCardClick = React.useCallback(
    (card: Task) => {
      setActiveCardId(card.id);
    },
    [setActiveCardId]
  );

  return (
    <KanbanDndProvider
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <KanbanLayout
        viewType={viewType}
        activeCardId={activeCardId}
        onViewTypeChange={setViewType}
        onCardClick={handleCardClick}
        onCloseCardModal={closeCardModal}
        getAllCards={getAllCards}
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
      />
      <KanbanDragOverlay
        draggingCard={draggingCard}
        draggingList={draggingList}
        boardData={boardData}
      />
      <BoardSelectorOverlay />
    </KanbanDndProvider>
  );
};

// ============================================================================
// Main Component with Provider
// ============================================================================

interface KanbanContainerProps {
  initialBoardData: BoardData;
  initialInboxCards: Task[];
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const KanbanContainer: React.FC<KanbanContainerProps> = ({
  initialBoardData,
  initialInboxCards,
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <KanbanProvider initialBoardData={initialBoardData} initialInboxCards={initialInboxCards}>
      <KanbanBoard isDarkMode={isDarkMode} onToggleDarkMode={onToggleDarkMode} />
    </KanbanProvider>
  );
};
