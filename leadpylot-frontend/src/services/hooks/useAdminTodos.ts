import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  apiGetGroupedAdminTodos,
  apiGetAdminTodos,
  apiGetTodosByOfferId,
  apiAssignAdminTodoToAgent,
  apiMakeAdminTodoAdminOnly,
  apiUpdateAdminTodo,
  apiDeleteAdminTodo,
  apiToggleAdminTodoStatus,
  GroupedAdminTodosResponse,
  AdminTodosResponse,
  // AdminTodoResponse,
  AssignTodoRequest,
} from '../AdminTodoService';

export interface UseGroupedAdminTodosOptions {
  page?: number;
  limit?: number;
  isDone?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface UseAdminTodosOptions {
  page?: number;
  limit?: number;
  isDone?: boolean;
  offer_id?: string;
  template_id?: string;
  assigned_to?: string;
  priority?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

// Hook for grouped admin todos (Lead → Offers → Todos)
export const useGroupedAdminTodos = (options?: UseGroupedAdminTodosOptions) => {
  const { page = 1, limit = 20, isDone, search, sortBy, sortOrder } = options || {};

  return useQuery<GroupedAdminTodosResponse>({
    queryKey: ['adminTodos', 'grouped', { page, limit, isDone, search, sortBy, sortOrder }],
    queryFn: () => apiGetGroupedAdminTodos(page, limit, isDone, search, sortBy, sortOrder),
  });
};

// Hook for flat admin todos list
export const useAdminTodos = (options?: UseAdminTodosOptions) => {
  const {
    page = 1,
    limit = 20,
    isDone,
    offer_id,
    template_id,
    assigned_to,
    priority,
    search,
    sortBy,
    sortOrder,
  } = options || {};

  return useQuery<AdminTodosResponse>({
    queryKey: [
      'adminTodos',
      'flat',
      { page, limit, isDone, offer_id, template_id, assigned_to, priority, search, sortBy, sortOrder },
    ],
    queryFn: () =>
      apiGetAdminTodos(page, limit, isDone, offer_id, template_id, assigned_to, priority, search, sortBy, sortOrder),
  });
};

// Hook for todos by offer ID
export const useTodosByOfferId = (
  offerId: string | undefined,
  isDone?: boolean,
  options?: Partial<UseQueryOptions<AdminTodosResponse>>
) => {
  return useQuery({
    queryKey: ['adminTodos', 'byOffer', offerId, { isDone }],
    queryFn: () => apiGetTodosByOfferId(offerId!, isDone),
    enabled: !!offerId,
    ...options,
  });
};

// Mutation hooks for admin todo actions
export const useAssignAdminTodoToAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ todoId, agentId }: { todoId: string; agentId: string }) =>
      apiAssignAdminTodoToAgent(todoId, agentId),
    onSuccess: () => {
      // Invalidate and refetch admin todos
      queryClient.invalidateQueries({ queryKey: ['adminTodos'] });
    },
  });
};

export const useMakeAdminTodoAdminOnly = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (todoId: string) => apiMakeAdminTodoAdminOnly(todoId),
    onSuccess: () => {
      // Invalidate and refetch admin todos
      queryClient.invalidateQueries({ queryKey: ['adminTodos'] });
    },
  });
};

export const useUpdateAdminTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ todoId, data }: { todoId: string; data: AssignTodoRequest }) =>
      apiUpdateAdminTodo(todoId, data),
    onSuccess: () => {
      // Invalidate and refetch admin todos
      queryClient.invalidateQueries({ queryKey: ['adminTodos'] });
    },
  });
};

export const useDeleteAdminTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (todoId: string) => apiDeleteAdminTodo(todoId),
    onSuccess: () => {
      // Invalidate and refetch admin todos
      queryClient.invalidateQueries({ queryKey: ['adminTodos'] });
    },
  });
};

export const useToggleAdminTodoStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ todoId, isDone }: { todoId: string; isDone: boolean }) =>
      apiToggleAdminTodoStatus(todoId, isDone),
    onSuccess: () => {
      // Invalidate and refetch admin todos
      queryClient.invalidateQueries({ queryKey: ['adminTodos'] });
    },
  });
};
