/**
 * useTodoBoardRealtime Hook
 * 
 * Manages real-time Socket.IO connection for Kanban board updates.
 * Automatically joins/leaves board rooms and handles event subscriptions.
 * 
 * Usage:
 * ```tsx
 * const { isConnected, connectionError } = useTodoBoardRealtime({
 *   boardId: '507f1f77bcf86cd799439011',
 *   onTaskCreated: (data) => console.log('New task:', data.task),
 *   onTaskMoved: (data) => console.log('Task moved:', data.taskId),
 * });
 * ```
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import todoBoardSocketService, {
  TaskCreatedEvent,
  TaskMovedEvent,
  TaskUpdatedEvent,
  TaskDeletedEvent,
  ListMovedEvent,
  ListCreatedEvent,
  ListUpdatedEvent,
  ListDeletedEvent,
  LabelCreatedEvent,
  LabelUpdatedEvent,
  LabelDeletedEvent,
  ActivityLoggedEvent,
  ChatMessage,
} from '../TodoBoardSocketService';
import { isDev } from '@/utils/utils';
import { LABEL_KEYS } from '@/hooks/useLabels';

// ============================================================================
// Types
// ============================================================================

export interface UseTodoBoardRealtimeOptions {
  /** Board ID to subscribe to */
  boardId?: string | null;
  /** Whether real-time updates are enabled (default: true) */
  enabled?: boolean;
  /** Custom handler for task created events */
  onTaskCreated?: (data: TaskCreatedEvent) => void;
  /** Custom handler for task moved events */
  onTaskMoved?: (data: TaskMovedEvent) => void;
  /** Custom handler for task updated events */
  onTaskUpdated?: (data: TaskUpdatedEvent) => void;
  /** Custom handler for task deleted events */
  onTaskDeleted?: (data: TaskDeletedEvent) => void;
  /** Custom handler for list moved events */
  onListMoved?: (data: ListMovedEvent) => void;
  /** Custom handler for list created events */
  onListCreated?: (data: ListCreatedEvent) => void;
  /** Custom handler for list updated events */
  onListUpdated?: (data: ListUpdatedEvent) => void;
  /** Custom handler for list deleted events */
  onListDeleted?: (data: ListDeletedEvent) => void;
  /** Custom handler for label created events */
  onLabelCreated?: (data: LabelCreatedEvent) => void;
  /** Custom handler for label updated events */
  onLabelUpdated?: (data: LabelUpdatedEvent) => void;
  /** Custom handler for label deleted events */
  onLabelDeleted?: (data: LabelDeletedEvent) => void;
  /** Custom handler for activity logged events */
  onActivityLogged?: (data: ActivityLoggedEvent) => void;
  /** Whether to auto-invalidate React Query caches (default: true) */
  autoInvalidateCache?: boolean;
}

export interface UseTodoBoardRealtimeReturn {
  /** Whether the socket is connected */
  isConnected: boolean;
  /** Last connection error message */
  connectionError: string | null;
  /** Manually reconnect to the socket */
  reconnect: () => void;
  /** Manually leave the current board */
  leaveBoard: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTodoBoardRealtime(
  options: UseTodoBoardRealtimeOptions = {}
): UseTodoBoardRealtimeReturn {
  const {
    boardId,
    enabled = true,
    onTaskCreated,
    onTaskMoved,
    onTaskUpdated,
    onTaskDeleted,
    onListMoved,
    onListCreated,
    onListUpdated,
    onListDeleted,
    onLabelCreated,
    onLabelUpdated,
    onLabelDeleted,
    onActivityLogged,
    autoInvalidateCache = true,
  } = options;

  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Track if we've connected in this mount cycle
  const hasConnectedRef = useRef(false);
  // Track current board to avoid duplicate joins
  const currentBoardRef = useRef<string | null>(null);

  // ============================================================================
  // Cache Invalidation Helpers
  // ============================================================================

  /**
   * Invalidate board-related queries when data changes
   */
  const invalidateBoardCache = useCallback((targetBoardId: string) => {
    if (!autoInvalidateCache) return;

    // Invalidate board queries
    queryClient.invalidateQueries({ queryKey: ['board', targetBoardId] });
    queryClient.invalidateQueries({ queryKey: ['board-with-lists', targetBoardId] });
    
    // Invalidate list tasks queries for this board
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return (
          key[0] === 'list-tasks' &&
          typeof key[1] === 'object' &&
          (key[1] as any)?.boardId === targetBoardId
        );
      },
    });
  }, [autoInvalidateCache, queryClient]);

  /**
   * Invalidate task-specific queries
   */
  const invalidateTaskCache = useCallback((taskId: string, targetBoardId?: string) => {
    if (!autoInvalidateCache) return;

    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    
    if (targetBoardId) {
      invalidateBoardCache(targetBoardId);
    }
  }, [autoInvalidateCache, queryClient, invalidateBoardCache]);

  // ============================================================================
  // Event Handlers with Cache Integration
  // ============================================================================

  const handleTaskCreated = useCallback((data: TaskCreatedEvent) => {
    isDev && console.log('🔔 Real-time: Task created', data.task._id);
    
    // Invalidate cache to refetch
    invalidateBoardCache(data.task.boardId);
    
    // Call custom handler
    onTaskCreated?.(data);
  }, [onTaskCreated, invalidateBoardCache]);

  const handleTaskMoved = useCallback((data: TaskMovedEvent) => {
    isDev && console.log('🔔 Real-time: Task moved', data.taskId, '→', data.listId);
    
    // Invalidate cache to refetch
    invalidateTaskCache(data.taskId, data.boardId);
    
    // Call custom handler
    onTaskMoved?.(data);
  }, [onTaskMoved, invalidateTaskCache]);

  const handleTaskUpdated = useCallback((data: TaskUpdatedEvent) => {
    isDev && console.log('🔔 Real-time: Task updated', data.taskId);
    
    // Invalidate cache to refetch
    invalidateTaskCache(data.taskId, data.boardId);
    
    // Call custom handler
    onTaskUpdated?.(data);
  }, [onTaskUpdated, invalidateTaskCache]);

  const handleTaskDeleted = useCallback((data: TaskDeletedEvent) => {
    isDev && console.log('🔔 Real-time: Task deleted', data.taskId);
    
    // Remove from cache immediately
    queryClient.removeQueries({ queryKey: ['task', data.taskId] });
    
    // Invalidate board cache to refetch lists
    invalidateBoardCache(data.boardId);
    
    // Call custom handler
    onTaskDeleted?.(data);
  }, [onTaskDeleted, queryClient, invalidateBoardCache]);

  const handleListMoved = useCallback((data: ListMovedEvent) => {
    isDev && console.log('🔔 Real-time: List moved', data.listId);
    
    // Invalidate board cache
    invalidateBoardCache(data.boardId);
    
    // Call custom handler
    onListMoved?.(data);
  }, [onListMoved, invalidateBoardCache]);

  const handleListCreated = useCallback((data: ListCreatedEvent) => {
    isDev && console.log('🔔 Real-time: List created', data.list._id);
    
    // Invalidate board cache
    invalidateBoardCache(data.list.boardId);
    
    // Call custom handler
    onListCreated?.(data);
  }, [onListCreated, invalidateBoardCache]);

  const handleListUpdated = useCallback((data: ListUpdatedEvent) => {
    isDev && console.log('🔔 Real-time: List updated', data.listId);
    
    // Invalidate board cache
    invalidateBoardCache(data.boardId);
    
    // Call custom handler
    onListUpdated?.(data);
  }, [onListUpdated, invalidateBoardCache]);

  const handleListDeleted = useCallback((data: ListDeletedEvent) => {
    isDev && console.log('🔔 Real-time: List deleted', data.listId);
    
    // Invalidate board cache
    invalidateBoardCache(data.boardId);
    
    // Call custom handler
    onListDeleted?.(data);
  }, [onListDeleted, invalidateBoardCache]);

  // ============================================================================
  // Label Event Handlers
  // ============================================================================

  const handleLabelCreated = useCallback((data: LabelCreatedEvent) => {
    isDev && console.log('🔔 Real-time: Label created', data.label._id);
    
    // Invalidate label cache for the board
    if (autoInvalidateCache && data.label.boardId) {
      queryClient.invalidateQueries({ queryKey: LABEL_KEYS.board(data.label.boardId) });
    }
    
    // Call custom handler
    onLabelCreated?.(data);
  }, [onLabelCreated, autoInvalidateCache, queryClient]);

  const handleLabelUpdated = useCallback((data: LabelUpdatedEvent) => {
    isDev && console.log('🔔 Real-time: Label updated', data.labelId);
    
    // Invalidate label cache for the board
    if (autoInvalidateCache && data.boardId) {
      queryClient.invalidateQueries({ queryKey: LABEL_KEYS.board(data.boardId) });
      // Also invalidate tasks that might use this label
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
    
    // Call custom handler
    onLabelUpdated?.(data);
  }, [onLabelUpdated, autoInvalidateCache, queryClient]);

  const handleLabelDeleted = useCallback((data: LabelDeletedEvent) => {
    isDev && console.log('🔔 Real-time: Label deleted', data.labelId);
    
    // Invalidate label cache for the board
    if (autoInvalidateCache && data.boardId) {
      queryClient.invalidateQueries({ queryKey: LABEL_KEYS.board(data.boardId) });
      // Also invalidate tasks that might use this label
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
    
    // Call custom handler
    onLabelDeleted?.(data);
  }, [onLabelDeleted, autoInvalidateCache, queryClient]);

  // ============================================================================
  // Activity Event Handler
  // ============================================================================

  const handleActivityLogged = useCallback((data: ActivityLoggedEvent) => {
    isDev && console.log('🔔 Real-time: Activity logged', data.activity._id);
    
    // Invalidate activity caches
    if (autoInvalidateCache) {
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      
      if (data.activity.board_id) {
        queryClient.invalidateQueries({ queryKey: ['activity', 'board', data.activity.board_id] });
      }
      if (data.activity.task_id) {
        queryClient.invalidateQueries({ queryKey: ['activity', 'task', data.activity.task_id] });
      }
    }
    
    // Call custom handler
    onActivityLogged?.(data);
  }, [onActivityLogged, autoInvalidateCache, queryClient]);

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to socket when authenticated
   */
  useEffect(() => {
    if (!enabled || !isAuthenticated || !user?.accessToken) {
      return;
    }

    // Only connect if not already connected
    if (!todoBoardSocketService.isConnected() && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
      todoBoardSocketService.connect(user.accessToken);
    }

    // Cleanup on unmount or when disabled
    return () => {
      // Don't disconnect on unmount - let other components use the connection
      // The service is a singleton, so we just leave the board room
    };
  }, [enabled, isAuthenticated, user?.accessToken]);

  /**
   * Join/leave board room when boardId changes
   */
  useEffect(() => {
    if (!enabled || !boardId) {
      // Leave current board if boardId becomes null
      if (currentBoardRef.current) {
        todoBoardSocketService.leaveBoard(currentBoardRef.current);
        currentBoardRef.current = null;
      }
      return;
    }

    // Skip if already in this board
    if (currentBoardRef.current === boardId) {
      return;
    }

    // Join new board (service handles leaving previous automatically)
    todoBoardSocketService.joinBoard(boardId);
    currentBoardRef.current = boardId;

    // Cleanup: leave board on unmount or boardId change
    return () => {
      if (currentBoardRef.current) {
        todoBoardSocketService.leaveBoard(currentBoardRef.current);
        currentBoardRef.current = null;
      }
    };
  }, [enabled, boardId]);

  /**
   * Subscribe to socket events
   */
  useEffect(() => {
    if (!enabled) return;

    // Subscribe to connection status
    const unsubConnection = todoBoardSocketService.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (connected) {
        setConnectionError(null);
      }
    });

    // Subscribe to errors
    const unsubError = todoBoardSocketService.onError((error) => {
      setConnectionError(error.message);
    });

    // Subscribe to task events
    const unsubTaskCreated = todoBoardSocketService.onTaskCreated(handleTaskCreated);
    const unsubTaskMoved = todoBoardSocketService.onTaskMoved(handleTaskMoved);
    const unsubTaskUpdated = todoBoardSocketService.onTaskUpdated(handleTaskUpdated);
    const unsubTaskDeleted = todoBoardSocketService.onTaskDeleted(handleTaskDeleted);

    // Subscribe to list events
    const unsubListMoved = todoBoardSocketService.onListMoved(handleListMoved);
    const unsubListCreated = todoBoardSocketService.onListCreated(handleListCreated);
    const unsubListUpdated = todoBoardSocketService.onListUpdated(handleListUpdated);
    const unsubListDeleted = todoBoardSocketService.onListDeleted(handleListDeleted);

    // Subscribe to label events
    const unsubLabelCreated = todoBoardSocketService.onLabelCreated(handleLabelCreated);
    const unsubLabelUpdated = todoBoardSocketService.onLabelUpdated(handleLabelUpdated);
    const unsubLabelDeleted = todoBoardSocketService.onLabelDeleted(handleLabelDeleted);

    // Subscribe to activity events
    const unsubActivityLogged = todoBoardSocketService.onActivityLogged(handleActivityLogged);

    // Set initial connection state
    setIsConnected(todoBoardSocketService.isConnected());

    // Cleanup subscriptions
    return () => {
      unsubConnection();
      unsubError();
      unsubTaskCreated();
      unsubTaskMoved();
      unsubTaskUpdated();
      unsubTaskDeleted();
      unsubListMoved();
      unsubListCreated();
      unsubListUpdated();
      unsubListDeleted();
      unsubLabelCreated();
      unsubLabelUpdated();
      unsubLabelDeleted();
      unsubActivityLogged();
    };
  }, [
    enabled,
    handleTaskCreated,
    handleTaskMoved,
    handleTaskUpdated,
    handleTaskDeleted,
    handleListMoved,
    handleListCreated,
    handleListUpdated,
    handleListDeleted,
    handleLabelCreated,
    handleLabelUpdated,
    handleLabelDeleted,
    handleActivityLogged,
  ]);

  // ============================================================================
  // Public Methods
  // ============================================================================

  const reconnect = useCallback(() => {
    todoBoardSocketService.reconnect();
  }, []);

  const leaveBoard = useCallback(() => {
    if (currentBoardRef.current) {
      todoBoardSocketService.leaveBoard(currentBoardRef.current);
      currentBoardRef.current = null;
    }
  }, []);

  return {
    isConnected,
    connectionError,
    reconnect,
    leaveBoard,
  };
}

// ============================================================================
// Task Chat Hook
// ============================================================================

export interface UseTaskChatOptions {
  /** Task ID to subscribe to chat */
  taskId?: string | null;
  /** Whether chat is enabled */
  enabled?: boolean;
  /** Handler for new messages */
  onMessage?: (message: ChatMessage) => void;
}

export interface UseTaskChatReturn {
  /** Whether connected to the task chat room */
  isInRoom: boolean;
  /** Send a message to the task chat */
  sendMessage: (message: string) => void;
  /** Leave the chat room */
  leaveRoom: () => void;
}

/**
 * Hook for managing task internal chat
 */
export function useTaskChat(options: UseTaskChatOptions = {}): UseTaskChatReturn {
  const { taskId, enabled = true, onMessage } = options;
  
  const [isInRoom, setIsInRoom] = useState(false);
  const currentTaskRef = useRef<string | null>(null);

  // Join/leave task chat room
  useEffect(() => {
    if (!enabled || !taskId) {
      if (currentTaskRef.current) {
        todoBoardSocketService.leaveTaskRoom(currentTaskRef.current);
        currentTaskRef.current = null;
        setIsInRoom(false);
      }
      return;
    }

    if (currentTaskRef.current === taskId) {
      return;
    }

    todoBoardSocketService.joinTaskRoom(taskId);
    currentTaskRef.current = taskId;
    setIsInRoom(true);

    return () => {
      if (currentTaskRef.current) {
        todoBoardSocketService.leaveTaskRoom(currentTaskRef.current);
        currentTaskRef.current = null;
        setIsInRoom(false);
      }
    };
  }, [enabled, taskId]);

  // Subscribe to messages
  useEffect(() => {
    if (!enabled || !onMessage) return;

    const unsub = todoBoardSocketService.onChatMessage(onMessage);
    return unsub;
  }, [enabled, onMessage]);

  const sendMessage = useCallback((message: string) => {
    if (currentTaskRef.current && message.trim()) {
      todoBoardSocketService.sendMessage(currentTaskRef.current, message);
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (currentTaskRef.current) {
      todoBoardSocketService.leaveTaskRoom(currentTaskRef.current);
      currentTaskRef.current = null;
      setIsInRoom(false);
    }
  }, []);

  return {
    isInRoom,
    sendMessage,
    leaveRoom,
  };
}

export default useTodoBoardRealtime;
