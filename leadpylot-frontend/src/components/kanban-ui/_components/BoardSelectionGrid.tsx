'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { useKanban } from '../_contexts';
import { Board } from '@/services/BoardService';
import { Check, LayoutGrid } from 'lucide-react';

/**
 * Board Selection Grid - Replaces the kanban view during drag from inbox
 * When user hovers on a board with a task, it loads that board and exits selection mode
 */
export const BoardSelectionGrid: React.FC = () => {
  const {
    availableBoards,
    selectedBoardId,
    loadBoard,
    setIsBoardSelectionMode,
  } = useKanban();

  // Handle board selection - load the board and exit selection mode
  const handleBoardSelect = React.useCallback(
    async (boardId: string) => {
      try {
        await loadBoard(boardId);
        // Exit selection mode after board loads
        setIsBoardSelectionMode(false);
      } catch (error) {
        console.error('Error loading board:', error);
      }
    },
    [loadBoard, setIsBoardSelectionMode]
  );

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 border-b border-gray-200 bg-white px-6 py-4">
        <LayoutGrid className="h-6 w-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-gray-800">Select a Board</h2>
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-600">
          {availableBoards.length} boards
        </span>
      </div>

      {/* Board Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {availableBoards.map((board, index) => (
            <BoardGridItem
              key={board._id}
              board={board}
              isSelected={selectedBoardId === board._id}
              onSelect={() => handleBoardSelect(board._id)}
              index={index}
            />
          ))}
        </div>

        {availableBoards.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500">No boards available</p>
          </div>
        )}
      </div>

      {/* Helper text */}
      <div className="border-t border-gray-200 bg-white px-6 py-3 text-center">
        <p className="text-sm text-gray-500">
          Drag the task over a board to switch to it, then drop on a list
        </p>
      </div>
    </div>
  );
};

interface BoardGridItemProps {
  board: Board;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

const BoardGridItem: React.FC<BoardGridItemProps> = ({
  board,
  isSelected,
  onSelect,
  index,
}) => {
  const { setIsBoardSelectionMode, loadBoard, hasBoardSelectionCompleted } = useKanban();
  const isLoadingRef = React.useRef(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Make each board a droppable target
  const { setNodeRef, isOver } = useDroppable({
    id: `board-grid-${board._id}`,
    data: {
      type: 'board-grid-item',
      boardId: board._id,
    },
  });

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // When task is dragged over this board, load the board and exit selection mode
  React.useEffect(() => {
    // Don't trigger if already completed or loading
    if (!isOver || isLoadingRef.current || hasBoardSelectionCompleted) {
      // Clear any pending timer when not hovering
      if (!isOver && timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start timer to load board - 2 second delay to confirm selection
    timerRef.current = setTimeout(async () => {
      if (isLoadingRef.current || hasBoardSelectionCompleted) return;
      isLoadingRef.current = true;

      try {
        await loadBoard(board._id);
        setIsBoardSelectionMode(false);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading board:', error);
        isLoadingRef.current = false;
      }
    }, 2000); // 2 second delay to confirm board selection

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOver, board._id, loadBoard, setIsBoardSelectionMode, hasBoardSelectionCompleted]);

  // Generate a color based on board name for visual variety
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-green-500 to-green-600',
    'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600',
    'from-teal-500 to-teal-600',
    'from-indigo-500 to-indigo-600',
    'from-red-500 to-red-600',
  ];
  const colorClass = colors[index % colors.length];

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      onClick={onSelect}
      className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all duration-200 ${isOver
          ? 'scale-105 border-indigo-500 shadow-xl ring-4 ring-indigo-200'
          : isSelected
            ? 'border-indigo-500 shadow-md'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }`}
    >
      {/* Color header */}
      <div className={`h-16 bg-gradient-to-r ${colorClass}`}>
        <div className="flex h-full items-center justify-center">
          <span className="text-3xl font-bold text-white/90">
            {board.name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-gray-800">{board.name}</h3>
            {board.board_type && (
              <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {board.board_type}
              </span>
            )}
          </div>
          {isSelected && (
            <div className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Hover/drag overlay with progress indicator */}
      {isOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-indigo-500/20 backdrop-blur-[1px]"
        >
          <div className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            Hold to select...
          </div>
          {/* Progress bar - 2 second animation */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2, ease: 'linear' }}
            className="absolute bottom-0 left-0 h-1.5 w-full origin-left bg-indigo-600"
          />
        </motion.div>
      )}
    </motion.div>
  );
};

export default BoardSelectionGrid;
