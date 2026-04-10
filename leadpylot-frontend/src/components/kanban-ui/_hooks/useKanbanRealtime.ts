/* eslint-disable eqeqeq */
/**
 * useKanbanRealtime Hook
 * 
 * Integrates real-time Socket.IO updates with the KanbanContext.
 * Automatically syncs task and list changes from other users.
 * 
 * Usage: Add this hook inside any component that has access to KanbanContext
 * ```tsx
 * const { isConnected } = useKanbanRealtime();
 * ```
 */

import { useEffect, useCallback, useRef } from 'react';
import { useKanban } from '../_contexts/KanbanContext';
import { useTodoBoardRealtime } from '@/services/hooks/useTodoBoardRealtime';
import { useAuth } from '@/hooks/useAuth';
import type {
  TaskCreatedEvent,
  TaskMovedEvent,
  TaskUpdatedEvent,
  TaskDeletedEvent,
  TaskRemovedEvent,
  ListCreatedEvent,
  ListUpdatedEvent,
  ListDeletedEvent,
  ListMovedEvent,
} from '@/services/TodoBoardSocketService';
import todoBoardSocketService from '@/services/TodoBoardSocketService';
import { Task, List } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { isDev } from '@/utils/utils';

// ============================================================================
// Types
// ============================================================================

export interface UseKanbanRealtimeOptions {
  /** Whether real-time updates are enabled (default: true) */
  enabled?: boolean;
}

export interface UseKanbanRealtimeReturn {
  /** Whether the socket is connected */
  isConnected: boolean;
  /** Last connection error */
  connectionError: string | null;
  /** Manually reconnect */
  reconnect: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useKanbanRealtime(
  options: UseKanbanRealtimeOptions = {}
): UseKanbanRealtimeReturn {
  const { enabled = true } = options;

  const {
    selectedBoardId,
    setBoardData,
    setInboxCards,
    boardData,
    loadBoard,
    activeCardId,
    closeCardModal,
  } = useKanban();

  const { user } = useAuth();
  const currentUserId = user?.id ?? (user as any)?._id ?? null;

  // Track processed events to prevent duplicates from echo
  const processedEventsRef = useRef<Set<string>>(new Set());

  // ============================================================================
  // Helper: Transform socket task to Kanban Task
  // ============================================================================

  const transformSocketTaskToKanbanTask = useCallback((
    socketTask: TaskCreatedEvent['task'],
    listTitle: string
  ): Task => {
    return {
      id: socketTask._id,
      title: socketTask.taskTitle,
      description: socketTask.taskDescription || '',
      labels: [],
      members: socketTask.assigned || [],
      checklist: [],
      checklists: [],
      comments: [],
      emails: [],
      status: listTitle || socketTask.status || 'Unknown',
      isCompleted: false,
      leadId: socketTask.lead_id || socketTask._id,
      agent: 'unassigned',
      project: 'N/A',
      contact: 'New Lead',
      phone: '',
      email: '',
      revenue: '0',
      source: 'Manual',
    };
  }, []);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle task created event
   */
  const handleTaskCreated = useCallback((data: TaskCreatedEvent) => {
    const eventKey = `task:created:${data.task._id}`;
    
    // Dedupe: skip if already processed recently
    if (processedEventsRef.current.has(eventKey)) {
      isDev && console.log('⏭️ Skipping duplicate task:created event');
      return;
    }
    processedEventsRef.current.add(eventKey);
    setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

    const { task } = data;
    const listId = task.listId;

    if (!listId) {
      // Task without list goes to inbox
      isDev && console.log('📥 Adding task to inbox from real-time');
      const newTask = transformSocketTaskToKanbanTask(task, 'Inbox');
      setInboxCards((prev) => {
        // Check if already exists
        if (prev.some((t) => t.id === newTask.id)) return prev;
        return [newTask, ...prev];
      });
      return;
    }

    // Task with list goes to board
    setBoardData((prev) => {
      // Check if list exists
      if (!prev.columns[listId]) {
        isDev && console.warn('List not found for new task:', listId);
        return prev;
      }

      // Check if task already exists
      if (prev.cards[task._id]) {
        isDev && console.log('Task already exists, skipping');
        return prev;
      }

      const listTitle = prev.columns[listId]?.title || 'Unknown';
      const newTask = transformSocketTaskToKanbanTask(task, listTitle);

      // Insert at correct position based on task.position
      const currentCardIds = prev.columns[listId].cardIds;
      let newCardIds: string[];

      if (task.position !== undefined) {
        // Insert at position
        const insertIndex = currentCardIds.findIndex((id) => {
          const card = prev.cards[id];
          // This is a simplification - you might need actual position comparison
          return false;
        });
        newCardIds = [...currentCardIds, task._id];
      } else {
        // Append to end
        newCardIds = [...currentCardIds, task._id];
      }

      return {
        ...prev,
        cards: { ...prev.cards, [task._id]: newTask },
        columns: {
          ...prev.columns,
          [listId]: {
            ...prev.columns[listId],
            cardIds: newCardIds,
          },
        },
      };
    });

    isDev && console.log('✅ Task added from real-time:', task._id);
  }, [setBoardData, setInboxCards, transformSocketTaskToKanbanTask]);

  /**
   * Handle task moved event (drag & drop from other users)
   */
  const handleTaskMoved = useCallback((data: TaskMovedEvent) => {
    const eventKey = `task:moved:${data.taskId}:${data.updatedAt}`;
    
    if (processedEventsRef.current.has(eventKey)) {
      isDev && console.log('⏭️ Skipping duplicate task:moved event');
      return;
    }
    processedEventsRef.current.add(eventKey);
    setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

    const { taskId, listId: newListId, position } = data;

    setBoardData((prev) => {
      // Find current list containing the task
      let currentListId: string | null = null;
      for (const [colId, column] of Object.entries(prev.columns)) {
        if (column.cardIds.includes(taskId)) {
          currentListId = colId;
          break;
        }
      }

      // If task not found in any list, skip
      if (!currentListId && !prev.cards[taskId]) {
        isDev && console.warn('Task not found for move:', taskId);
        return prev;
      }

      // If new list doesn't exist, skip
      if (!prev.columns[newListId]) {
        isDev && console.warn('Target list not found:', newListId);
        return prev;
      }

      // Remove from current list
      const newColumns = { ...prev.columns };
      if (currentListId) {
        newColumns[currentListId] = {
          ...newColumns[currentListId],
          cardIds: newColumns[currentListId].cardIds.filter((id) => id !== taskId),
        };
      }

      // Add to new list (at end for now - could use position for ordering)
      const targetCardIds = newColumns[newListId].cardIds.filter((id) => id !== taskId);
      newColumns[newListId] = {
        ...newColumns[newListId],
        cardIds: [...targetCardIds, taskId],
      };

      // Update task status
      const newCards = { ...prev.cards };
      if (newCards[taskId]) {
        newCards[taskId] = {
          ...newCards[taskId],
          status: newColumns[newListId].title,
        };
      }

      return {
        ...prev,
        cards: newCards,
        columns: newColumns,
      };
    });

    isDev && console.log('✅ Task moved from real-time:', taskId, '→', newListId);
  }, [setBoardData]);

  /**
   * Normalize assigned (can be populated objects or string ids) to string[] for members.
   */
  const normalizeAssigned = useCallback((a: any): string[] => {
    if (a == null) return [];
    const arr = Array.isArray(a) ? a : [a];
    return arr
      .map((x: any) => {
        if (x == null) return null;
        const id = x._id ?? (typeof x === 'string' ? x : null);
        return id != null ? String(id) : null;
      })
      .filter((id): id is string => id != null);
  }, []);

  /**
   * Handle task updated event
   * When current user is unassigned (no longer in updates.assigned), remove task from board/inbox so they stop seeing it in realtime.
   */
  const handleTaskUpdated = useCallback((data: TaskUpdatedEvent) => {
    const eventKey = `task:updated:${data.taskId}:${data.updatedAt}`;
    
    if (processedEventsRef.current.has(eventKey)) {
      isDev && console.log('⏭️ Skipping duplicate task:updated event');
      return;
    }
    processedEventsRef.current.add(eventKey);
    setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

    const { taskId, updates, boardId } = data;

    // If assignment was updated and current user is no longer in assigned list, remove task from view (realtime stops for unassigned user)
    if (updates.assigned != null && currentUserId) {
      const newAssignedIds = normalizeAssigned(updates.assigned);
      const isCurrentUserUnassigned = !newAssignedIds.includes(currentUserId);
      if (isCurrentUserUnassigned) {
        setBoardData((prev) => {
          if (!prev.cards[taskId]) return prev;
          const newCards = { ...prev.cards };
          delete newCards[taskId];
          const newColumns = { ...prev.columns };
          for (const colId of Object.keys(newColumns)) {
            newColumns[colId] = {
              ...newColumns[colId],
              cardIds: newColumns[colId].cardIds.filter((id) => id !== taskId),
            };
          }
          return { ...prev, cards: newCards, columns: newColumns };
        });
        setInboxCards((prev) => prev.filter((t) => t.id !== taskId));
        isDev && console.log('✅ Task removed from realtime (user unassigned):', taskId);
        return;
      }
    }

    // Helper to transform backend subTask to frontend checklist format
    const transformSubTaskToChecklist = (subTask: any[]): any[] => {
      if (!subTask || !Array.isArray(subTask)) return [];
      return subTask
        .filter((st: any) => !st.isDelete)
        .map((st: any) => ({
          id: st._id || st.id,
          text: st.taskTitle || st.title || '',
          completed: st.isCompleted || false,
          dueDate: st.dueDate,
          assignedMembers: Array.isArray(st.assigned) 
            ? st.assigned.map((a: any) => a._id || a) 
            : st.assigned ? [st.assigned._id || st.assigned] : [],
        }));
    };

    const resolvedMembers = updates.assigned != null ? normalizeAssigned(updates.assigned) : undefined;

    // Update in board data (or add newly assigned task when not in cards)
    setBoardData((prev) => {
      if (prev.cards[taskId]) {
        // Existing task: apply updates
        const existingTask = prev.cards[taskId];
        const updatedTask: Task = {
          ...existingTask,
          title: updates.taskTitle ?? existingTask.title,
          description: updates.taskDescription ?? existingTask.description,
          isCompleted: updates.isCompleted ?? existingTask.isCompleted,
          status: updates.status ?? existingTask.status,
          members: resolvedMembers ?? existingTask.members,
          dates: updates.dueDate ? { ...existingTask.dates, dueDate: updates.dueDate } : existingTask.dates,
          labels: updates.labels ?? existingTask.labels,
          checklist: updates.subTask ? transformSubTaskToChecklist(updates.subTask) : existingTask.checklist,
          customFields: updates.custom_fields ?? existingTask.customFields,
        };

        return {
          ...prev,
          cards: { ...prev.cards, [taskId]: updatedTask },
        };
      }

      // Task not in board: add it when this is the selected board and we have listId (newly assigned)
      if (boardId === selectedBoardId && updates.listId && prev.columns[updates.listId]) {
        const listTitle = prev.columns[updates.listId].title || 'Unknown';
        const newTask: Task = {
          id: taskId,
          title: updates.taskTitle ?? '',
          description: updates.taskDescription ?? '',
          labels: updates.labels ?? [],
          members: resolvedMembers ?? [],
          checklist: updates.subTask ? transformSubTaskToChecklist(updates.subTask) : [],
          checklists: [],
          comments: [],
          emails: [],
          status: listTitle,
          isCompleted: updates.isCompleted ?? false,
          leadId: taskId,
          agent: 'unassigned',
          project: 'N/A',
          contact: 'New Lead',
          phone: '',
          email: '',
          revenue: '0',
          source: 'Manual',
          dates: updates.dueDate ? { dueDate: updates.dueDate } : undefined,
          customFields: updates.custom_fields ?? [],
        };

        const list = prev.columns[updates.listId];
        const insertIdx = updates.position != null && updates.position >= 0 && updates.position <= list.cardIds.length
          ? updates.position
          : list.cardIds.length;
        const newCardIds = [...list.cardIds];
        newCardIds.splice(insertIdx, 0, taskId);

        return {
          ...prev,
          cards: { ...prev.cards, [taskId]: newTask },
          columns: {
            ...prev.columns,
            [updates.listId]: {
              ...list,
              cardIds: newCardIds,
            },
          },
        };
      }

      return prev;
    });

    // Also update in inbox if present
    setInboxCards((prev) => {
      const index = prev.findIndex((t) => t.id === taskId);
      if (index === -1) return prev;

      const existingTask = prev[index];
      const updatedTask: Task = {
        ...existingTask,
        title: updates.taskTitle ?? existingTask.title,
        description: updates.taskDescription ?? existingTask.description,
        isCompleted: updates.isCompleted ?? existingTask.isCompleted,
        status: updates.status ?? existingTask.status,
        members: resolvedMembers ?? existingTask.members,
        dates: updates.dueDate ? { ...existingTask.dates, dueDate: updates.dueDate } : existingTask.dates,
        labels: updates.labels ?? existingTask.labels,
        checklist: updates.subTask ? transformSubTaskToChecklist(updates.subTask) : existingTask.checklist,
        customFields: updates.custom_fields ?? existingTask.customFields,
      };

      const newInbox = [...prev];
      newInbox[index] = updatedTask;
      return newInbox;
    });

    isDev && console.log('✅ Task updated from real-time:', taskId, updates);
  }, [setBoardData, setInboxCards, selectedBoardId, normalizeAssigned, currentUserId]);

  /**
   * Handle task deleted event
   */
  const handleTaskDeleted = useCallback((data: TaskDeletedEvent) => {
    const eventKey = `task:deleted:${data.taskId}`;
    
    if (processedEventsRef.current.has(eventKey)) {
      isDev && console.log('⏭️ Skipping duplicate task:deleted event');
      return;
    }
    processedEventsRef.current.add(eventKey);
    setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

    const { taskId } = data;

    // Remove from board
    setBoardData((prev) => {
      const newCards = { ...prev.cards };
      delete newCards[taskId];

      const newColumns = { ...prev.columns };
      for (const colId of Object.keys(newColumns)) {
        newColumns[colId] = {
          ...newColumns[colId],
          cardIds: newColumns[colId].cardIds.filter((id) => id !== taskId),
        };
      }

      return { ...prev, cards: newCards, columns: newColumns };
    });

    // Remove from inbox
    setInboxCards((prev) => prev.filter((t) => t.id !== taskId));

    // If the deleted task was open in the modal, close it
    if (activeCardId === taskId) {
      closeCardModal();
    }

    isDev && console.log('✅ Task deleted from real-time:', taskId);
  }, [setBoardData, setInboxCards, activeCardId, closeCardModal]);

  /**
   * Handle task removed event (task left this board, moved to inbox or another board)
   */
  const handleTaskRemoved = useCallback((data: TaskRemovedEvent) => {
    const eventKey = `task:removed:${data.taskId}:${data.updatedAt}`;
    
    if (processedEventsRef.current.has(eventKey)) {
      isDev && console.log('⏭️ Skipping duplicate task:removed event');
      return;
    }
    processedEventsRef.current.add(eventKey);
    setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

    const { taskId, movedToInbox } = data;

    // Remove task from board (it was moved away)
    setBoardData((prev) => {
      // Check if task exists
      if (!prev.cards[taskId]) {
        isDev && console.log('Task not in board, skipping removal:', taskId);
        return prev;
      }

      const newCards = { ...prev.cards };
      delete newCards[taskId];

      const newColumns = { ...prev.columns };
      for (const colId of Object.keys(newColumns)) {
        newColumns[colId] = {
          ...newColumns[colId],
          cardIds: newColumns[colId].cardIds.filter((id) => id !== taskId),
        };
      }

      return { ...prev, cards: newCards, columns: newColumns };
    });

    isDev && console.log('✅ Task removed from board (moved to', movedToInbox ? 'inbox' : 'another board', '):', taskId);
  }, [setBoardData]);

  /**
   * Handle list created event
   */
  const handleListCreated = useCallback((data: ListCreatedEvent) => {
    const { list } = data;
    const eventKey = `list:created:${list._id}`;
    
    if (processedEventsRef.current.has(eventKey)) {
      return;
    }
    processedEventsRef.current.add(eventKey);
    setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

    setBoardData((prev) => {
      // Check if list already exists
      if (prev.columns[list._id]) return prev;

      const newList: List = {
        id: list._id,
        title: list.listTitle,
        cardIds: [],
      };

      return {
        ...prev,
        columns: { ...prev.columns, [list._id]: newList },
        columnOrder: [...prev.columnOrder, list._id],
      };
    });

    isDev && console.log('✅ List created from real-time:', list._id);
  }, [setBoardData]);

  /**
   * Handle list updated event
   */
  const handleListUpdated = useCallback((data: ListUpdatedEvent) => {
    const { listId, updates } = data;

    setBoardData((prev) => {
      if (!prev.columns[listId]) return prev;

      return {
        ...prev,
        columns: {
          ...prev.columns,
          [listId]: {
            ...prev.columns[listId],
            title: updates.listTitle ?? prev.columns[listId].title,
            backgroundColor: updates.color ?? prev.columns[listId].backgroundColor,
          },
        },
      };
    });

    isDev && console.log('✅ List updated from real-time:', listId, updates);
  }, [setBoardData]);

  /**
   * Handle list deleted event
   */
  const handleListDeleted = useCallback((data: ListDeletedEvent) => {
    const { listId } = data;

    setBoardData((prev) => {
      if (!prev.columns[listId]) return prev;

      const newColumns = { ...prev.columns };
      delete newColumns[listId];

      return {
        ...prev,
        columns: newColumns,
        columnOrder: prev.columnOrder.filter((id) => id !== listId),
      };
    });

    isDev && console.log('✅ List deleted from real-time:', listId);
  }, [setBoardData]);

  /**
   * Handle list moved event
   * Reloads the board to get the correct list order from server
   */
  const handleListMoved = useCallback((data: ListMovedEvent) => {
    const { listId, position, boardId } = data;
    const eventKey = `list:moved:${listId}:${position}`;
    
    if (processedEventsRef.current.has(eventKey)) {
      isDev && console.log('⏭️ Skipping duplicate list:moved event');
      return;
    }
    processedEventsRef.current.add(eventKey);
    setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

    // Reload the board to get the correct list order from server
    // This is more reliable than trying to reorder locally
    if (selectedBoardId && boardId === selectedBoardId) {
      isDev && console.log('📋 List moved from real-time, reloading board:', listId, 'position:', position);
      loadBoard(selectedBoardId).catch((err) => {
        isDev && console.error('Failed to reload board after list move:', err);
      });
    }
  }, [selectedBoardId, loadBoard]);

  // ============================================================================
  // Use the base realtime hook
  // ============================================================================

  const { isConnected, connectionError, reconnect } = useTodoBoardRealtime({
    boardId: selectedBoardId,
    enabled: enabled && !!selectedBoardId,
    autoInvalidateCache: false, // We handle state updates directly
    onTaskCreated: handleTaskCreated,
    onTaskMoved: handleTaskMoved,
    onTaskUpdated: handleTaskUpdated,
    onTaskDeleted: handleTaskDeleted,
    onListCreated: handleListCreated,
    onListUpdated: handleListUpdated,
    onListDeleted: handleListDeleted,
    onListMoved: handleListMoved,
  });

  // Subscribe to task:removed event (not available in useTodoBoardRealtime)
  useEffect(() => {
    if (!enabled) return;

    const unsubTaskRemoved = todoBoardSocketService.onTaskRemoved(handleTaskRemoved);

    return () => {
      unsubTaskRemoved();
    };
  }, [enabled, handleTaskRemoved]);

  // Clean up processed events periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Clear old events (older than 30 seconds)
      processedEventsRef.current.clear();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    connectionError,
    reconnect,
  };
}

export default useKanbanRealtime;
