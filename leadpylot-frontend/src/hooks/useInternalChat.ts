import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import {
  apiCreateChatMessage,
  apiGetChatMessagesByTask,
  apiUpdateChatMessage,
  apiDeleteChatMessage,
  CreateChatMessageRequest,
  UpdateChatMessageRequest,
  ChatMessagesResponse,
  CreateChatMessageResponse,
  UpdateChatMessageResponse,
  DeleteChatMessageResponse,
} from '@/services/InternalChatService';
import todoBoardSocketService from '@/services/TodoBoardSocketService';
import { isDev } from '@/utils/utils';

// ============================================================================
// Query Keys
// ============================================================================

export const CHAT_KEYS = {
  all: ['internal-chat'] as const,
  byTask: (taskId: string) => [...CHAT_KEYS.all, 'task', taskId] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch chat messages for a task
 */
export const useChatMessages = (taskId: string | null, enabled = true) => {
  return useQuery<ChatMessagesResponse>({
    queryKey: CHAT_KEYS.byTask(taskId || ''),
    queryFn: () => {
      if (!taskId) throw new Error('Task ID is required');
      return apiGetChatMessagesByTask(taskId);
    },
    enabled: !!taskId && enabled,
    staleTime: 1 * 60 * 1000, // 1 minute (shorter for chat messages)
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a new chat message
 */
export const useCreateChatMessage = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateChatMessageResponse, Error, CreateChatMessageRequest>({
    mutationFn: apiCreateChatMessage,
    onSuccess: (response, variables) => {
      // Invalidate chat messages for the task to refresh the list
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.byTask(variables.taskId) });
      // Keep task activities in sync when comments create activity entries
      queryClient.invalidateQueries({ queryKey: ['infinite-activities', 'task', variables.taskId] });
    },
  });
};

/**
 * Hook to update a chat message
 */
export const useUpdateChatMessage = (taskId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateChatMessageResponse,
    Error,
    { messageId: string; data: UpdateChatMessageRequest }
  >({
    mutationFn: ({ messageId, data }) => apiUpdateChatMessage(messageId, data),
    onSuccess: () => {
      // Invalidate chat messages for the task to refresh the list
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.byTask(taskId) });
    },
  });
};

/**
 * Hook to delete a chat message
 */
export const useDeleteChatMessage = (taskId: string) => {
  const queryClient = useQueryClient();

  return useMutation<DeleteChatMessageResponse, Error, string>({
    mutationFn: apiDeleteChatMessage,
    onSuccess: () => {
      // Invalidate chat messages for the task to refresh the list
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.byTask(taskId) });
    },
  });
};

// ============================================================================
// Real-time Hook
// ============================================================================

/**
 * Hook to enable real-time updates for chat messages
 * Subscribes to chat:message, chat:updated, chat:deleted events
 * and automatically invalidates queries when changes occur
 * 
 * Note: This also joins/leaves the task room for socket events
 */
export const useChatRealtime = (taskId: string | null) => {
  const queryClient = useQueryClient();
  const processedEventsRef = useRef<Set<string>>(new Set());
  const currentTaskRef = useRef<string | null>(null);

  const handleChatMessage = useCallback(
    (data: any) => {
      const messageTaskId = data.message?.taskId || data.taskId;
      if (!messageTaskId || (taskId && messageTaskId !== taskId)) return;

      const eventKey = `chat:message:${data.message?._id}`;
      if (processedEventsRef.current.has(eventKey)) {
        isDev && console.log('⏭️ Skipping duplicate chat:message event');
        return;
      }
      processedEventsRef.current.add(eventKey);
      setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

      isDev && console.log('💬 Real-time: New chat message, refreshing messages');
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.byTask(messageTaskId) });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities', 'task', messageTaskId] });
    },
    [queryClient, taskId]
  );

  const handleChatUpdated = useCallback(
    (data: any) => {
      const messageTaskId = data.taskId;
      if (!messageTaskId || (taskId && messageTaskId !== taskId)) return;

      const eventKey = `chat:updated:${data.messageId}:${data.updatedAt}`;
      if (processedEventsRef.current.has(eventKey)) {
        isDev && console.log('⏭️ Skipping duplicate chat:updated event');
        return;
      }
      processedEventsRef.current.add(eventKey);
      setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

      isDev && console.log('💬 Real-time: Chat message updated, refreshing messages');
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.byTask(messageTaskId) });
    },
    [queryClient, taskId]
  );

  const handleChatDeleted = useCallback(
    (data: any) => {
      const messageTaskId = data.taskId;
      if (!messageTaskId || (taskId && messageTaskId !== taskId)) return;

      const eventKey = `chat:deleted:${data.messageId}`;
      if (processedEventsRef.current.has(eventKey)) {
        isDev && console.log('⏭️ Skipping duplicate chat:deleted event');
        return;
      }
      processedEventsRef.current.add(eventKey);
      setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

      isDev && console.log('💬 Real-time: Chat message deleted, refreshing messages');
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.byTask(messageTaskId) });
    },
    [queryClient, taskId]
  );

  // Join/leave task room when taskId changes
  useEffect(() => {
    if (!taskId) {
      if (currentTaskRef.current) {
        todoBoardSocketService.leaveTaskRoom(currentTaskRef.current);
        currentTaskRef.current = null;
      }
      return;
    }

    if (currentTaskRef.current !== taskId) {
      if (currentTaskRef.current) {
        todoBoardSocketService.leaveTaskRoom(currentTaskRef.current);
      }
      todoBoardSocketService.joinTaskRoom(taskId);
      currentTaskRef.current = taskId;
    }

    return () => {
      if (currentTaskRef.current) {
        todoBoardSocketService.leaveTaskRoom(currentTaskRef.current);
        currentTaskRef.current = null;
      }
    };
  }, [taskId]);

  // Subscribe to chat events
  useEffect(() => {
    // Subscribe to socket events for chat (new-message is the legacy event name)
    const unsubNewMessage = todoBoardSocketService.onChatMessage(handleChatMessage);

    // Also listen for the new chat event names
    const socket = (todoBoardSocketService as any).socket;
    if (socket) {
      socket.on('chat:message', handleChatMessage);
      socket.on('chat:updated', handleChatUpdated);
      socket.on('chat:deleted', handleChatDeleted);
    }

    isDev && console.log('💬 Subscribed to chat real-time events');

    return () => {
      unsubNewMessage();
      if (socket) {
        socket.off('chat:message', handleChatMessage);
        socket.off('chat:updated', handleChatUpdated);
        socket.off('chat:deleted', handleChatDeleted);
      }
      isDev && console.log('💬 Unsubscribed from chat real-time events');
    };
  }, [handleChatMessage, handleChatUpdated, handleChatDeleted]);
};
