import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiCreateTask,
  apiUpdateTask,
  apiTransferTask,
  apiGetAllTasks,
  apiGetTaskById,
  apiDeleteTask,
  apiDeleteTaskItem,
  CreateTaskRequest,
  UpdateTaskRequest,
  TransferTaskRequest,
  GetTasksParams,
  TaskResponse,
  TasksResponse,
  DeleteTaskItemParams,
} from '@/services/TaskService';
import { apiGetListTasks, GetListTasksParams, ListTasksResponse } from '@/services/BoardService';

// ============================================================================
// Query Keys
// ============================================================================

const TASK_KEYS = {
  all: ['tasks'] as const,
  lists: () => [...TASK_KEYS.all, 'list'] as const,
  list: (filters?: GetTasksParams) => [...TASK_KEYS.lists(), filters] as const,
  details: () => [...TASK_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...TASK_KEYS.details(), id] as const,
  listTasks: (boardId: string, listId: string, cursor?: string) =>
    [...TASK_KEYS.all, 'list-tasks', boardId, listId, cursor] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch all tasks with optional filters
 */
export const useTasks = (filters?: GetTasksParams) => {
  return useQuery<TasksResponse>({
    queryKey: TASK_KEYS.list(filters),
    queryFn: () => apiGetAllTasks(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single task by ID
 */
export const useTask = (id: string | null, enabled = true) => {
  return useQuery<TaskResponse>({
    queryKey: TASK_KEYS.detail(id || ''),
    queryFn: () => {
      if (!id) throw new Error('Task ID is required');
      return apiGetTaskById(id);
    },
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch tasks for a specific list with cursor pagination
 */
export const useListTasks = (
  boardId: string | null,
  listId: string | null,
  params?: GetListTasksParams,
  enabled = true
) => {
  return useQuery<ListTasksResponse>({
    queryKey: TASK_KEYS.listTasks(boardId || '', listId || '', params?.cursor),
    queryFn: () => {
      if (!boardId || !listId) throw new Error('Board ID and List ID are required');
      return apiGetListTasks(boardId, listId, params);
    },
    enabled: !!boardId && !!listId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter for paginated data)
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a new task
 */
export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation<TaskResponse, Error, CreateTaskRequest>({
    mutationFn: apiCreateTask,
    onSuccess: () => {
      // Invalidate tasks list queries to refresh cached data
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.lists() });
    },
  });
};

/**
 * Hook to update a task
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation<TaskResponse, Error, { id: string; data: UpdateTaskRequest }>({
    mutationFn: ({ id, data }) => apiUpdateTask(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities', 'task', variables.id] });
    },
  });
};

/**
 * Hook to transfer a task to another list
 */
export const useTransferTask = () => {
  const queryClient = useQueryClient();

  return useMutation<TaskResponse, Error, { id: string; data: TransferTaskRequest }>({
    mutationFn: ({ id, data }) => apiTransferTask(id, data),
    onSuccess: (response, variables) => {
      // Invalidate tasks list and specific task detail
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(variables.id) });
    },
  });
};

/**
 * Hook to delete a task
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation<TaskResponse, Error, string>({
    mutationFn: apiDeleteTask,
    onSuccess: (_, id) => {
      // Invalidate tasks list and specific task detail
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(id) });
    },
  });
};

/**
 * Hook to delete a task item (subtask, nested todo, or custom field item)
 */
export const useDeleteTaskItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TaskResponse,
    Error,
    { taskId: string; params: DeleteTaskItemParams }
  >({
    mutationFn: ({ taskId, params }) => apiDeleteTaskItem(taskId, params),
    onSuccess: (_, variables) => {
      // Invalidate tasks list and specific task detail
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(variables.taskId) });
    },
  });
};
