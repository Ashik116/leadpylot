'use client';

import React from 'react';
import { DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { Task, List, BoardData } from '../../types';
import { GripVertical } from 'lucide-react';
import { useKanban } from '../../_contexts';
import { DraggingCardPreview } from './DraggingCardPreview';

interface KanbanDragOverlayProps {
  draggingCard: Task | null;
  draggingList: List | null;
  boardData?: BoardData; // Kept for API compat, not used (lightweight overlay)
  selectedCount?: number;
}

/**
 * Lightweight drag overlay for better performance.
 * Uses DraggingCardPreview instead of full SingleTask to avoid heavy re-renders.
 */
export const KanbanDragOverlay: React.FC<KanbanDragOverlayProps> = ({
  draggingCard,
  draggingList,
  selectedCount = 1,
}) => {
  const { isOverSwitchHandle } = useKanban();
  return (
    <DragOverlay
      zIndex={9999}
      dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: { active: { opacity: '0.5' } },
        }),
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}
    >
      {draggingList ? (
        <div className="pointer-events-none scale-105 rotate-2 shadow-2xl">
          <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
            <div className="flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-1 text-xs font-bold text-white shadow-lg">
              <GripVertical className="h-3 w-3" />
              <span>Moving List</span>
            </div>
          </div>
          <div
            className="border-ocean-2/50 flex w-[272px] shrink-0 flex-col rounded-xl border bg-white opacity-95 ring-2 ring-indigo-500"
            style={{ backgroundColor: draggingList.backgroundColor || '#ffffff' }}
          >
            <div className="flex items-center justify-between p-3 pb-2">
              <h3 className="text-base font-bold text-black">{draggingList.title}</h3>
            </div>
            <div className="px-2 pb-2">
              <p className="text-center text-xs text-gray-500">
                {draggingList.cardIds.length}{' '}
                {draggingList.cardIds.length === 1 ? 'task' : 'tasks'}
              </p>
            </div>
          </div>
        </div>
      ) : draggingCard ? (
        <div
          className={`pointer-events-none relative transition-all duration-200 ${
            isOverSwitchHandle ? 'scale-75 opacity-90' : ''
          }`}
        >
          {selectedCount > 1 && (
            <div className="absolute -top-3 -right-3 z-10">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-lg ring-2 ring-white">
                {selectedCount}
              </div>
            </div>
          )}
          {selectedCount > 1 && (
            <>
              <div className="absolute top-2 left-2 -z-10 h-full w-full rounded-lg bg-gray-300/50" />
              <div className="absolute top-1 left-1 -z-10 h-full w-full rounded-lg bg-gray-200/50" />
            </>
          )}
          <DraggingCardPreview task={draggingCard} compact={isOverSwitchHandle} />
        </div>
      ) : null}
    </DragOverlay>
  );
};
