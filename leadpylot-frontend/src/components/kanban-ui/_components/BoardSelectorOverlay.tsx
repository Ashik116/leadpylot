'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useKanban } from '../_contexts';
import { ChevronUp, GripHorizontal } from 'lucide-react';

interface BoardSelectorOverlayProps {
  onBoardHover?: (boardId: string | null) => void;
}

const HOLD_DURATION = 2000; // 2 seconds to trigger board selection

/**
 * Board selector handle anchored at bottom-center
 * When hovered for 2 seconds during drag from inbox, switches the main view to board selection grid
 */
export const BoardSelectorOverlay: React.FC<BoardSelectorOverlayProps> = () => {
  const { 
    isDraggingFromInbox, 
    availableBoards, 
    isBoardSelectionMode,
    setIsBoardSelectionMode,
    hasBoardSelectionCompleted,
    setIsOverSwitchHandle,
  } = useKanban();
  
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // dnd-kit droppable for the handle - triggers board selection mode when task is dragged over
  const { setNodeRef: setHandleRef, isOver: isOverHandle } = useDroppable({
    id: 'board-selector-handle',
    data: { type: 'expansion-handle' },
  });

  // When task is dragged over the handle for 2 seconds, trigger board selection mode
  useEffect(() => {
    if (isOverHandle && !isBoardSelectionMode && !hasBoardSelectionCompleted) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      const frameId = requestAnimationFrame(() => {
        setIsHolding(true);
        setIsOverSwitchHandle(true);
      });
      
      // Start 2 second timer
      timerRef.current = setTimeout(() => {
        setIsBoardSelectionMode(true);
        setIsHolding(false);
        setIsOverSwitchHandle(false);
      }, HOLD_DURATION);

      return () => {
        cancelAnimationFrame(frameId);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setIsHolding(false);
        setIsOverSwitchHandle(false);
      };
    } else {
      const frameId = requestAnimationFrame(() => {
        setIsHolding(false);
        setIsOverSwitchHandle(false);
      });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return () => cancelAnimationFrame(frameId);
    }
  }, [isOverHandle, isBoardSelectionMode, hasBoardSelectionCompleted, setIsBoardSelectionMode, setIsOverSwitchHandle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Hide overlay when:
  // - not dragging from inbox
  // - no boards available
  // - board selection mode is active (grid is showing)
  // - board selection has been completed (user already picked a board)
  if (!isDraggingFromInbox || availableBoards.length === 0 || isBoardSelectionMode || hasBoardSelectionCompleted) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col items-center pb-4" style={{ zIndex: 1 }}>
      {/* Droppable area - ref attached here for larger hit area */}
      <div
        ref={setHandleRef}
        className="pointer-events-auto"
      >
        <motion.div
          layout
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`relative flex w-[300px] flex-col items-center overflow-hidden rounded-2xl border-2 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all duration-200 ${
            isHolding 
              ? 'border-indigo-400 shadow-indigo-200/50' 
              : 'border-gray-200/50'
          }`}
        >
          {/* Handle content */}
          <div
            className={`relative flex w-full cursor-pointer flex-col items-center justify-center py-4 transition-all duration-200 ${
              isHolding 
                ? 'bg-indigo-50' 
                : 'hover:bg-gray-50'
            }`}
          >
          <GripHorizontal 
            className={`mb-1 h-4 w-4 transition-colors ${
              isHolding ? 'text-indigo-600' : 'text-gray-400'
            }`} 
          />
          <div className="flex items-center gap-2 px-4 pb-1">
            <span 
              className={`text-xs font-bold tracking-wider uppercase transition-colors ${
                isHolding ? 'text-indigo-600' : 'text-ocean-2'
              }`}
            >
              {isHolding ? 'Hold to switch...' : 'Hold here to Switch Board'}
            </span>
            <ChevronUp 
              className={`h-3 w-3 transition-all ${
                isHolding ? 'text-indigo-600' : 'text-ocean-2'
              }`} 
            />
          </div>
          
          {/* Progress bar - shows when holding */}
          <AnimatePresence>
            {isHolding && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                exit={{ scaleX: 0 }}
                transition={{ duration: HOLD_DURATION / 1000, ease: 'linear' }}
                className="absolute bottom-0 left-0 h-1.5 w-full origin-left bg-indigo-600"
              />
            )}
          </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
