'use client';

import { useCallback } from 'react';
import { BoardData, Task } from '../types';
import { useUpdateTask, useTransferTask } from '@/hooks/useTasks';
import { useBulkUpdateListPositions } from '@/hooks/useBoards';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { calculatePositioning } from '../_utils/dragUtils';

interface UseTaskMovePersistenceProps {
  boardData: BoardData;
  setBoardData: React.Dispatch<React.SetStateAction<BoardData>>;
  selectedBoardId: string | null;
  inboxCards: Task[];
  loadListTasks: (boardId: string, listId: string, cursor?: string) => Promise<any>;
  loadInboxTasks: () => Promise<void>;
  revertTaskPosition: (
    activeId: string,
    originalState: { container: string; position: number }
  ) => void;
  /** Ref with latest board state from visual drag updates - avoids stale closure when React hasn't re-rendered yet */
  pendingBoardDataRef?: React.MutableRefObject<BoardData | null>;
}

/**
 * Hook for handling API persistence of task moves and list reordering
 */
export const useTaskMovePersistence = ({
  boardData,
  setBoardData,
  selectedBoardId,
  inboxCards,
  loadListTasks,
  loadInboxTasks,
  revertTaskPosition,
  pendingBoardDataRef,
}: UseTaskMovePersistenceProps) => {
  const updateTaskMutation = useUpdateTask();
  const transferTaskMutation = useTransferTask();
  const bulkUpdateListPositionsMutation = useBulkUpdateListPositions();

  /**
   * Handle list reordering with bulk API update
   */
  const handleListReorder = useCallback(
    async (activeId: string, overId: string, originalOrder?: string[]) => {
      const activeIndex = boardData.columnOrder.indexOf(activeId);
      const overIndex = boardData.columnOrder.indexOf(overId);

      if (activeIndex === -1 || overIndex === -1) return;

      const previousOrder = originalOrder || [...boardData.columnOrder];
      // Since we update visually in handleDragOver, boardData.columnOrder is already the new order
      const newOrder = [...boardData.columnOrder];

      if (!selectedBoardId) return;

      try {
        // Build list of position changes for bulk update
        const listPositions = newOrder
          .map((listId, index) => {
            const oldIndex = previousOrder.indexOf(listId);
            if (oldIndex !== index) {
              return { listId, position: index };
            }
            return null;
          })
          .filter((item): item is { listId: string; position: number } => item !== null);

        // Only call API if there are changes
        if (listPositions.length > 0) {
          await bulkUpdateListPositionsMutation.mutateAsync({
            boardId: selectedBoardId,
            data: { listPositions },
          });

          toast.push(
            <Notification title="Success" type="success">
              List position updated successfully
            </Notification>
          );
        }
      } catch (error: any) {
        // Revert on error
        setBoardData((prev) => ({ ...prev, columnOrder: previousOrder }));
        toast.push(
          <Notification title="Error" type="danger">
            {error?.message || 'Failed to update list position. Please try again.'}
          </Notification>
        );
      }
    },
    [boardData.columnOrder, selectedBoardId, bulkUpdateListPositionsMutation, setBoardData]
  );

  /**
   * Persist task move to API
   */
  const persistTaskMove = useCallback(
    async (
      activeId: string,
      finalContainer: string,
      originalState: { container: string; position: number },
      overId: string,
      card: Task
    ) => {
      const isFromInbox = originalState.container === 'inbox';
      const isToInbox = finalContainer === 'inbox';
      const isSameList = originalState.container === finalContainer;

      // Use pending board data from visual updates when available (avoids stale closure race)
      const columnsToUse = pendingBoardDataRef?.current?.columns ?? boardData.columns;

      try {
        if (isToInbox && !isFromInbox) {
          // List to Inbox: Use update API with empty board_id and list_id
          // Calculate positioning using inbox card IDs for proper insertion
          const inboxCardIds = inboxCards.map((c) => c.id);
          // When dropping on inbox container (overId === 'inbox'), insert at top by default
          const insertAtTop = overId === 'inbox';
          const positioning = calculatePositioning(
            inboxCardIds,
            activeId,
            overId,
            finalContainer,
            undefined,
            insertAtTop
          );
          const payload = {
            taskTitle: card.title,
            taskDescription: card.description || '',
            board_id: [],
            list_id: [],
            ...positioning, // Includes before_task_id and/or after_task_id
          };
          await updateTaskMutation.mutateAsync({ id: activeId, data: payload });
        } else if (isSameList && isToInbox) {
          // Reordering within inbox: Use update API with before_task_id and after_task_id
          const inboxCardIds = inboxCards.map((c) => c.id);
          const positioning = calculatePositioning(
            inboxCardIds,
            activeId,
            overId,
            finalContainer,
            originalState.position // Pass original position for correct insertion direction
          );
          const payload = {
            taskTitle: card.title,
            taskDescription: card.description || '',
            ...positioning,
          };
          await updateTaskMutation.mutateAsync({ id: activeId, data: payload });
        } else if (isFromInbox) {
          // Inbox to List: Use update API
          const targetListCardIds = columnsToUse[finalContainer]?.cardIds || [];
          const positioning = calculatePositioning(
            targetListCardIds,
            activeId,
            overId,
            finalContainer
          );
          const payload = {
            taskTitle: card.title,
            taskDescription: card.description || '',
            priority: 'high',
            board_id: [selectedBoardId!],
            list_id: [finalContainer],
            ...positioning,
          };
          await updateTaskMutation.mutateAsync({ id: activeId, data: payload });
        } else if (isSameList) {
          // Same list (board list): Use update API for reordering
          const targetListCardIds = columnsToUse[finalContainer]?.cardIds || [];
          const positioning = calculatePositioning(
            targetListCardIds,
            activeId,
            overId,
            finalContainer,
            originalState.position // Pass original position for correct insertion direction
          );
          const payload = {
            taskTitle: card.title,
            taskDescription: card.description || '',
            priority: 'high',
            ...positioning,
          };
          await updateTaskMutation.mutateAsync({ id: activeId, data: payload });
        } else {
          // Different list: Use transfer API
          const targetListCardIds = columnsToUse[finalContainer]?.cardIds || [];
          // When dropping on list container (empty area), insert at top (matches List-to-Inbox behavior)
          const insertAtTop = overId === finalContainer;
          const positioning = calculatePositioning(
            targetListCardIds,
            activeId,
            overId,
            finalContainer,
            undefined,
            insertAtTop
          );
          const transferPayload = {
            target_list_id: finalContainer,
            ...positioning,
          };
          await transferTaskMutation.mutateAsync({ id: activeId, data: transferPayload });
        }

        // Reload affected lists to ensure sync
        if (isToInbox && !isFromInbox) {
          // List to Inbox: Reload source list and refresh inbox
          if (originalState.container !== 'inbox' && selectedBoardId) {
            await loadListTasks(selectedBoardId, originalState.container);
          }
          await loadInboxTasks();
        } else {
          // Other moves: Reload affected lists
          const listsToReload =
            originalState.container !== finalContainer && originalState.container !== 'inbox'
              ? [originalState.container, finalContainer]
              : [finalContainer];

          if (selectedBoardId && !isFromInbox) {
            await Promise.all(
              listsToReload.map((listId) => loadListTasks(selectedBoardId, listId))
            );
          }

          // If task was moved from inbox, refresh inbox to update count
          if (isFromInbox) {
            await loadInboxTasks();
          }
        }

        toast.push(
          <Notification title="Success" type="success">
            Task moved successfully
          </Notification>
        );
      } catch (error: any) {
        console.error('Error persisting task move:', error);
        revertTaskPosition(activeId, originalState);
        toast.push(
          <Notification title="Error" type="danger">
            {error?.message || 'Failed to move task. Please try again.'}
          </Notification>
        );
      } finally {
        // Clear ref after use so next move starts fresh
        if (pendingBoardDataRef?.current) {
          pendingBoardDataRef.current = null;
        }
      }
    },
    [
      boardData.columns,
      selectedBoardId,
      inboxCards,
      updateTaskMutation,
      transferTaskMutation,
      loadListTasks,
      loadInboxTasks,
      revertTaskPosition,
      pendingBoardDataRef,
    ]
  );

  return {
    handleListReorder,
    persistTaskMove,
  };
};
