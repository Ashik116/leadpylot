import React from 'react';
import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import {
  apiCreateTodo,
  apiCreateTaskFromEmail,
  apiDeleteTodo,
  apiGetTodo,
  apiGetTodos,
  apiGetTodosByLeadId,
  apiToggleTodoStatus,
  apiUpdateTodo,
  CreateTodoRequest,
  LeadTodosResponse,
  TodoResponse,
  TodosResponse,
  ToggleTodoStatusRequest,
  UpdateTodoRequest,
} from '../ToDoService';
import { apiGetMyTasks } from '@/components/shared/TaskDrawer/services/TaskDrawerService';
import type { MyTasksResponse } from '@/components/shared/TaskDrawer/TaskDrawer.types';
import { TASKS_BY_ENTITY_KEY } from './useTasksByEntity';

export interface UseTodosOptions {
  page?: number;
  limit?: number;
  lead_id?: string;
  creator_id?: string;
  isDone?: boolean;
  showInactive?: boolean;
  search?: string;
}

export const useTodos = (options?: UseTodosOptions) => {
  const { page = 1, limit = 20, lead_id, creator_id, isDone, showInactive, search } = options || {};

  return useQuery<TodosResponse>({
    queryKey: ['todos', { page, limit, lead_id, creator_id, isDone, showInactive, search }],
    queryFn: () => apiGetTodos(page, limit, lead_id, creator_id, isDone, showInactive, search),
  });
};

export const useTodo = (id: string, options?: Partial<UseQueryOptions<TodoResponse>>) => {
  return useQuery({
    queryKey: ['todo', id],
    queryFn: () => apiGetTodo(id),
    ...options,
  });
};

export const useTodosByLeadId = (
  leadId: string | undefined,
  isDone?: boolean,
  showInactive?: boolean,
  options?: Partial<UseQueryOptions<LeadTodosResponse>>
) => {
  return useQuery({
    queryKey: ['todos', 'lead', leadId, { isDone, showInactive }],
    queryFn: () => apiGetTodosByLeadId(leadId!, isDone, showInactive),
    enabled: !!leadId,
    ...options,
  });
};

/**
 * Hook for fetching current user's tasks (my-tasks)
 * Returns tasks and pending count metadata
 */
export const useMyTasks = (options?: Partial<UseQueryOptions<MyTasksResponse>>) => {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: apiGetMyTasks,
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * Hook for fetching only the pending task count
 * Uses select to extract just the pending count from the response
 */
export const usePendingTaskCount = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['my-tasks', 'pending-count'],
    queryFn: apiGetMyTasks,
    enabled: options?.enabled !== false,
    select: (data) => data?.meta?.pending || 0,
    refetchOnWindowFocus: false,
  });
};

export const useCreateTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTodoRequest) => apiCreateTodo(data),
    onSuccess: (_, variables) => {
      // Use the same comprehensive invalidation logic as useAssignTodo
      // 1) Invalidate only leads queries that include has_todo filter
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          const key1 = query.queryKey[1] as Record<string, unknown> | undefined | null;
          const hasTodoParam =
            key1 !== undefined &&
            key1 !== null &&
            typeof key1 === 'object' &&
            (key1 as any).has_todo === true;
          return key0 === 'leads' && hasTodoParam;
        },
      });

      // 2) Invalidate grouped leads queries (no removal, no explicit refetch)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          return key0 === 'grouped-leads' || key0 === 'group-leads';
        },
      });

      // 3) Invalidate todo-specific lists used by the Todo dashboard
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-todos'] });
      queryClient.invalidateQueries({ queryKey: ['extra-todos'] });

      // 4) Also invalidate basic leads queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      // 5) Invalidate todo-specific queries
      queryClient.invalidateQueries({ queryKey: ['todos', 'lead', variables.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });

      // 6) Invalidate current user query to update totalPendingTodo count
      queryClient.invalidateQueries({ queryKey: ['current-user'] });

      // 7) Invalidate tasksByEntity queries to refresh task tables
      queryClient.invalidateQueries({ queryKey: [TASKS_BY_ENTITY_KEY] });
    },
  });
};

export const useUpdateTodo = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTodoRequest) => apiUpdateTodo(id, data),
    onSuccess: (response) => {
      // Use the same comprehensive invalidation logic as useAssignTodo
      // 1) Invalidate only leads queries that include has_todo filter
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          const key1 = query.queryKey[1] as Record<string, unknown> | undefined | null;
          const hasTodoParam =
            key1 !== undefined &&
            key1 !== null &&
            typeof key1 === 'object' &&
            (key1 as any).has_todo === true;
          return key0 === 'leads' && hasTodoParam;
        },
      });

      // 2) Invalidate grouped leads queries (no removal, no explicit refetch)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          return key0 === 'grouped-leads' || key0 === 'group-leads';
        },
      });

      // 3) Invalidate todo-specific lists used by the Todo dashboard
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-todos'] });
      queryClient.invalidateQueries({ queryKey: ['extra-todos'] });

      // 4) Also invalidate basic leads queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      // 5) Invalidate todo-specific queries
      queryClient.invalidateQueries({ queryKey: ['todo', id] });
      const leadId =
        typeof response.data.lead_id === 'object'
          ? response.data.lead_id._id
          : response.data.lead_id;
      queryClient.invalidateQueries({ queryKey: ['todos', 'lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });

      // 6) Invalidate current user query to update totalPendingTodo count
      queryClient.invalidateQueries({ queryKey: ['current-user'] });

      // 7) Invalidate offer tickets queries for the tickets dashboard
      queryClient.invalidateQueries({ queryKey: ['offerTickets'] });
    },
  });
};

export const useToggleTodoStatus = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ToggleTodoStatusRequest) => apiToggleTodoStatus(id, data),
    onSuccess: (response) => {
      // Use the same comprehensive invalidation logic as useAssignTodo
      // 1) Invalidate only leads queries that include has_todo filter
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          const key1 = query.queryKey[1] as Record<string, unknown> | undefined | null;
          const hasTodoParam =
            key1 !== undefined &&
            key1 !== null &&
            typeof key1 === 'object' &&
            (key1 as any).has_todo === true;
          return key0 === 'leads' && hasTodoParam;
        },
      });

      // 2) Invalidate grouped leads queries (no removal, no explicit refetch)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          return key0 === 'grouped-leads' || key0 === 'group-leads';
        },
      });

      // 3) Invalidate todo-specific lists used by the Todo dashboard
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-todos'] });
      queryClient.invalidateQueries({ queryKey: ['extra-todos'] });

      // 4) Also invalidate basic leads queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      // 5) Invalidate todo-specific queries
      queryClient.invalidateQueries({ queryKey: ['todo', id] });
      const leadId =
        typeof response.data.lead_id === 'object'
          ? response.data.lead_id._id
          : response.data.lead_id;
      queryClient.invalidateQueries({ queryKey: ['todos', 'lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });

      // 6) Invalidate current user query to update totalPendingTodo count
      queryClient.invalidateQueries({ queryKey: ['current-user'] });

      // 7) Invalidate offer tickets queries for the tickets dashboard
      queryClient.invalidateQueries({ queryKey: ['offerTickets'] });
    },
  });
};

export const useDeleteTodo = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiDeleteTodo(id),
    onSuccess: () => {
      // Get the todo from cache to find its lead_id
      const todoData = queryClient.getQueryData<TodoResponse>(['todo', id]);
      const leadId =
        typeof todoData?.data?.lead_id === 'object'
          ? todoData?.data?.lead_id._id
          : todoData?.data?.lead_id;

      // Use the same comprehensive invalidation logic as useAssignTodo
      // 1) Invalidate only leads queries that include has_todo filter
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          const key1 = query.queryKey[1] as Record<string, unknown> | undefined | null;
          const hasTodoParam =
            key1 !== undefined &&
            key1 !== null &&
            typeof key1 === 'object' &&
            (key1 as any).has_todo === true;
          return key0 === 'leads' && hasTodoParam;
        },
      });

      // 2) Invalidate grouped leads queries (no removal, no explicit refetch)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          return key0 === 'grouped-leads' || key0 === 'group-leads';
        },
      });

      // 3) Invalidate todo-specific lists used by the Todo dashboard
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-todos'] });
      queryClient.invalidateQueries({ queryKey: ['extra-todos'] });

      // 4) Also invalidate basic leads queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      // 5) Invalidate todo-specific queries
      queryClient.invalidateQueries({ queryKey: ['todo', id] });

      // If we have the lead ID, invalidate that specific query too
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: ['todos', 'lead', leadId] });
      }

      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });

      // 6) Invalidate current user query to update totalPendingTodo count
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });
};

/**
 * Hook for transferring email to kanban
 * POST /api/tasks/create-from-email/{emailId}
 */
export const useCreateTaskFromEmail = (emailId: string, leadId?: string | null) => {
  const queryClient = useQueryClient();

  const successNotification = React.createElement(
    Notification,
    { title: 'Success', type: 'success' },
    'Email transferred to kanban successfully'
  );

  return useMutation({
    mutationFn: (data?: { taskTitle?: string }) => apiCreateTaskFromEmail(emailId, data),
    onSuccess: () => {
      toast.push(successNotification);
      // Invalidate email tasks and todos queries
      queryClient.invalidateQueries({ queryKey: ['email-tasks', emailId] });
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: [TASKS_BY_ENTITY_KEY] });

      // Invalidate infinite-activities query with subject_id if leadId is provided
      if (leadId) {
        queryClient.invalidateQueries({
          queryKey: ['infinite-activities', { subject_id: leadId }],
        });
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to create ticket';
      const errorNotification = React.createElement(
        Notification,
        { title: 'Error', type: 'danger' },
        errorMessage
      );
      toast.push(errorNotification);
    },
  });
};
