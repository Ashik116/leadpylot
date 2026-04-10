import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import {
  apiInitializeSystemBoards,
  apiCreateBoard,
  apiGetAllBoards,
  apiGetBoardById,
  apiGetBoardMembers,
  apiUpdateBoard,
  apiUpdateCardPositions,
  apiDeleteBoard,
  apiCreateList,
  apiUpdateList,
  apiUpdateListPosition,
  apiBulkUpdateListPositions,
  CreateBoardRequest,
  UpdateBoardRequest,
  UpdateCardPositionsRequest,
  CreateListRequest,
  UpdateListRequest,
  UpdateListPositionRequest,
  BulkUpdateListPositionsRequest,
  BoardResponse,
  BoardsResponse,
  BoardMembersResponse,
  CreateListResponse,
  UpdateListResponse,
  UpdateListPositionResponse,
  BulkUpdateListPositionsResponse,
} from '@/services/BoardService';
import todoBoardSocketService from '@/services/TodoBoardSocketService';
import { isDev } from '@/utils/utils';

// ============================================================================
// Query Keys
// ============================================================================

const BOARD_KEYS = {
  all: ['boards'] as const,
  lists: () => [...BOARD_KEYS.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...BOARD_KEYS.lists(), filters] as const,
  details: () => [...BOARD_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...BOARD_KEYS.details(), id] as const,
  members: () => [...BOARD_KEYS.all, 'members'] as const,
  membersFor: (id: string) => [...BOARD_KEYS.members(), id] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch all boards with optional filters
 */
export const useBoards = (filters?: {
  board_type?: string;
  created_by?: string;
  is_archived?: boolean;
  is_deleted?: boolean;
}) => {
  return useQuery<BoardsResponse>({
    queryKey: BOARD_KEYS.list(filters),
    queryFn: () => apiGetAllBoards(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single board by ID
 */
export const useBoard = (id: string | null, enabled = true) => {
  return useQuery<any>({
    queryKey: BOARD_KEYS.detail(id || ''),
    queryFn: () => {
      if (!id) throw new Error('Board ID is required');
      return apiGetBoardById(id);
    },
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch board members by board ID
 */
export const useBoardMembers = (id: string | null, enabled = true) => {
  return useQuery<BoardMembersResponse>({
    queryKey: BOARD_KEYS.membersFor(id || ''),
    queryFn: () => {
      if (!id) throw new Error('Board ID is required');
      return apiGetBoardMembers(id);
    },
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a new board
 */
export const useCreateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation<BoardResponse, Error, CreateBoardRequest>({
    mutationFn: apiCreateBoard,
    onSuccess: () => {
      // Invalidate boards list queries
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.lists() });
    },
  });
};

/**
 * Hook to update a board
 */
export const useUpdateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation<BoardResponse, Error, { id: string; data: UpdateBoardRequest }>({
    mutationFn: ({ id, data }) => apiUpdateBoard(id, data),
    onSuccess: (response, variables) => {
      // Invalidate boards list and specific board detail
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.detail(variables.id) });
    },
  });
};

/**
 * Hook to delete a board
 */
export const useDeleteBoard = () => {
  const queryClient = useQueryClient();

  return useMutation<BoardResponse, Error, string>({
    mutationFn: apiDeleteBoard,
    onSuccess: (_, id) => {
      // Invalidate boards list and specific board detail
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.detail(id) });
    },
  });
};

/**
 * Hook to update card positions
 */
export const useUpdateCardPositions = () => {
  const queryClient = useQueryClient();

  return useMutation<BoardResponse, Error, { id: string; data: UpdateCardPositionsRequest }>({
    mutationFn: ({ id, data }) => apiUpdateCardPositions(id, data),
    onSuccess: (response, variables) => {
      // Invalidate the specific board detail
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.detail(variables.id) });
    },
  });
};

/**
 * Hook to initialize system boards
 */
export const useInitializeSystemBoards = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiInitializeSystemBoards,
    onSuccess: () => {
      // Invalidate boards list queries
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.lists() });
    },
  });
};

/**
 * Hook to create a new list in a board
 */
export const useCreateList = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateListResponse, Error, { boardId: string; data: CreateListRequest }>({
    mutationFn: ({ boardId, data }) => apiCreateList(boardId, data),
    onSuccess: (response, variables) => {
      // Invalidate the specific board detail to refresh lists
        // queryClient.invalidateQueries({ queryKey: BOARD_KEYS.detail(variables.boardId) });
    },
  });
};

/**
 * Hook to update a list
 */
export const useUpdateList = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateListResponse,
    Error,
    { listId: string; boardId: string; data: UpdateListRequest }
  >({
    mutationFn: ({ listId, data }) => apiUpdateList(listId, data),
    onSuccess: (response, variables) => {
      // Invalidate the specific board detail to refresh lists
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.detail(variables.boardId) });
    },
  });
};

/**
 * Hook to update list position
 */
export const useUpdateListPosition = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateListPositionResponse,
    Error,
    { listId: string; boardId: string; data: UpdateListPositionRequest }
  >({
    mutationFn: ({ listId, data }) => apiUpdateListPosition(listId, data),
    onSuccess: (response, variables) => {
      // Invalidate the specific board detail to refresh lists
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.detail(variables.boardId) });
    },
  });
};

/**
 * Hook to bulk update list positions
 */
export const useBulkUpdateListPositions = () => {
  const queryClient = useQueryClient();

  return useMutation<
    BulkUpdateListPositionsResponse,
    Error,
    { boardId: string; data: BulkUpdateListPositionsRequest }
  >({
    mutationFn: ({ data }) => apiBulkUpdateListPositions(data),
    onSuccess: (response, variables) => {
      // Invalidate the specific board detail to refresh lists
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.detail(variables.boardId) });
    },
  });
};

// ============================================================================
// Real-time Hooks
// ============================================================================

/**
 * Options for useBoardsRealtime hook
 */
interface UseBoardsRealtimeOptions {
  /** Callback when user is invited to a board. Receives the board ID. */
  onBoardInvited?: (boardId: string) => void;
  /** Callback when user is removed from a board. Receives the board ID. */
  onBoardRemoved?: (boardId: string) => void;
}

/**
 * Hook to enable real-time updates for boards list
 * Subscribes to board:created, board:updated, board:deleted,
 * board:member-added, board:member-removed, board:invited, board:removed events
 * and automatically invalidates queries when changes occur
 */
export const useBoardsRealtime = (options?: UseBoardsRealtimeOptions) => {
  const queryClient = useQueryClient();
  const processedEventsRef = useRef<Set<string>>(new Set());
  const { onBoardInvited: onBoardInvitedCallback, onBoardRemoved: onBoardRemovedCallback } =
    options || {};

  const handleBoardCreated = useCallback(
    (data: any) => {
      const eventKey = `board:created:${data.board?._id}`;
      if (processedEventsRef.current.has(eventKey)) {
        isDev && console.log('⏭️ Skipping duplicate board:created event');
        return;
      }
      processedEventsRef.current.add(eventKey);
      setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

      isDev && console.log('📊 Real-time: Board created, refreshing list');
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.lists() });
    },
    [queryClient]
  );

  const handleBoardUpdated = useCallback(
    (data: any) => {
      const eventKey = `board:updated:${data.boardId}:${data.updatedAt}`;
      if (processedEventsRef.current.has(eventKey)) {
        isDev && console.log('⏭️ Skipping duplicate board:updated event');
        return;
      }
      processedEventsRef.current.add(eventKey);
      setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

      isDev && console.log('📊 Real-time: Board updated, refreshing list');
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.lists() });
      if (data.boardId) {
        queryClient.invalidateQueries({ queryKey: BOARD_KEYS.detail(data.boardId) });
      }
    },
    [queryClient]
  );

  const handleBoardDeleted = useCallback(
    (data: any) => {
      const eventKey = `board:deleted:${data.boardId}`;
      if (processedEventsRef.current.has(eventKey)) {
        isDev && console.log('⏭️ Skipping duplicate board:deleted event');
        return;
      }
      processedEventsRef.current.add(eventKey);
      setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

      isDev && console.log('📊 Real-time: Board deleted, refreshing list');
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.lists() });
      if (data.boardId) {
        queryClient.invalidateQueries({ queryKey: BOARD_KEYS.detail(data.boardId) });
      }
    },
    [queryClient]
  );

  // Handler for member added to board
  const handleBoardMemberAdded = useCallback(
    (data: any) => {
      const eventKey = `board:member-added:${data.boardId}:${data.member?.user_id}`;
      if (processedEventsRef.current.has(eventKey)) {
        isDev && console.log('⏭️ Skipping duplicate board:member-added event');
        return;
      }
      processedEventsRef.current.add(eventKey);
      setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

      isDev && console.log('📊 Real-time: Board member added, refreshing board');
      if (data.boardId) {
        queryClient.invalidateQueries({ queryKey: BOARD_KEYS.detail(data.boardId) });
      }
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.lists() });
    },
    [queryClient]
  );

  // Handler for member removed from board
  const handleBoardMemberRemoved = useCallback(
    (data: any) => {
      const eventKey = `board:member-removed:${data.boardId}:${data.userId}`;
      if (processedEventsRef.current.has(eventKey)) {
        isDev && console.log('⏭️ Skipping duplicate board:member-removed event');
        return;
      }
      processedEventsRef.current.add(eventKey);
      setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

      isDev && console.log('📊 Real-time: Board member removed, refreshing board');
      if (data.boardId) {
        queryClient.invalidateQueries({ queryKey: BOARD_KEYS.detail(data.boardId) });
      }
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.lists() });
    },
    [queryClient]
  );

  // Handler for when current user is invited to a board
  const handleBoardInvited = useCallback(
    (data: any) => {
      const eventKey = `board:invited:${data.boardId}`;
      if (processedEventsRef.current.has(eventKey)) {
        isDev && console.log('⏭️ Skipping duplicate board:invited event');
        return;
      }
      processedEventsRef.current.add(eventKey);
      setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

      isDev && console.log('📊 Real-time: You were invited to a board, refreshing boards list');
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.lists() });

      // Call the callback if provided (useful for auto-selecting when it's user's first board)
      if (onBoardInvitedCallback && data.boardId) {
        onBoardInvitedCallback(data.boardId);
      }
    },
    [queryClient, onBoardInvitedCallback]
  );

  // Handler for when current user is removed from a board
  const handleBoardRemoved = useCallback(
    (data: any) => {
      const eventKey = `board:removed:${data.boardId}`;
      if (processedEventsRef.current.has(eventKey)) {
        isDev && console.log('⏭️ Skipping duplicate board:removed event');
        return;
      }
      processedEventsRef.current.add(eventKey);
      setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

      isDev && console.log('📊 Real-time: You were removed from a board, refreshing boards list');
      queryClient.invalidateQueries({ queryKey: BOARD_KEYS.lists() });
      if (data.boardId) {
        queryClient.invalidateQueries({ queryKey: BOARD_KEYS.detail(data.boardId) });

        // Call the callback if provided (useful for switching to another board)
        if (onBoardRemovedCallback) {
          onBoardRemovedCallback(data.boardId);
        }
      }
    },
    [queryClient, onBoardRemovedCallback]
  );

  useEffect(() => {
    // Subscribe to board events
    const unsubCreated = todoBoardSocketService.onBoardCreated(handleBoardCreated);
    const unsubUpdated = todoBoardSocketService.onBoardUpdated(handleBoardUpdated);
    const unsubDeleted = todoBoardSocketService.onBoardDeleted(handleBoardDeleted);

    // Subscribe to board member events
    const unsubMemberAdded = todoBoardSocketService.onBoardMemberAdded(handleBoardMemberAdded);
    const unsubMemberRemoved =
      todoBoardSocketService.onBoardMemberRemoved(handleBoardMemberRemoved);
    const unsubInvited = todoBoardSocketService.onBoardInvited(handleBoardInvited);
    const unsubRemoved = todoBoardSocketService.onBoardRemoved(handleBoardRemoved);

    isDev && console.log('📊 Subscribed to board real-time events (including member events)');

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubMemberAdded();
      unsubMemberRemoved();
      unsubInvited();
      unsubRemoved();
      isDev && console.log('📊 Unsubscribed from board real-time events');
    };
  }, [
    handleBoardCreated,
    handleBoardUpdated,
    handleBoardDeleted,
    handleBoardMemberAdded,
    handleBoardMemberRemoved,
    handleBoardInvited,
    handleBoardRemoved,
  ]);
};

// ============================================================================
// Activity Real-time Hook
// ============================================================================

/**
 * Hook to enable real-time updates for activity logs
 * Subscribes to activity:logged events and invalidates queries
 */
export const useActivityRealtime = (boardId?: string | null, taskId?: string | null) => {
  const queryClient = useQueryClient();
  const processedEventsRef = useRef<Set<string>>(new Set());

  const handleActivityLogged = useCallback(
    (data: any) => {
      const activity = data.activity;
      if (!activity) return;

      // Filter by board or task if specified
      if (boardId && activity.board_id !== boardId) return;
      if (taskId && activity.task_id !== taskId) return;

      const eventKey = `activity:logged:${activity._id}`;
      if (processedEventsRef.current.has(eventKey)) {
        isDev && console.log('⏭️ Skipping duplicate activity:logged event');
        return;
      }
      processedEventsRef.current.add(eventKey);
      setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

      isDev && console.log('📝 Real-time: Activity logged, refreshing activity');

      // Invalidate activity queries
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });

      // If board specific, invalidate board activity
      if (activity.board_id) {
        queryClient.invalidateQueries({ queryKey: ['activity', 'board', activity.board_id] });
      }

      // If task specific, invalidate task activity
      if (activity.task_id) {
        queryClient.invalidateQueries({ queryKey: ['activity', 'task', activity.task_id] });
      }
    },
    [queryClient, boardId, taskId]
  );

  useEffect(() => {
    const unsub = todoBoardSocketService.onActivityLogged(handleActivityLogged);

    isDev && console.log('📝 Subscribed to activity real-time events');

    return () => {
      unsub();
      isDev && console.log('📝 Unsubscribed from activity real-time events');
    };
  }, [handleActivityLogged]);
};
