import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetUser,
  apiGetUsers,
  apiGetTodoBoardUsers,
  apiUpdateUser,
  apiDeleteUser,
  apiUserBulkDelete,
  apiChangeUserPassword,
  type TodoBoardUser,
  type TodoBoardUsersResponse,
  type User,
  type ChangePasswordRequest,
  type PaginationParams,
  type BulkDeleteUsersRequest,
} from '../UsersService';
import ApiService from '../ApiService';
import AxiosBase from '../axios/AxiosBase';

export const useUsers = (
  params?: PaginationParams | Record<string, unknown>,
  options?: { enabled?: boolean }
) => {
  const { page, limit, ...restParams } = params || {};
  const queryKey = ['users', page, limit, restParams];

  return useQuery({
    queryKey,
    queryFn: () => apiGetUsers(params),
    enabled: options?.enabled !== false,
  });
};

export const useTodoBoardUsers = (
  params?: PaginationParams | Record<string, unknown>,
  options?: { enabled?: boolean }
) => {
  const { page, limit, ...restParams } = params || {};
  const queryKey = ['todo-board-users', page, limit, restParams];

  return useQuery<TodoBoardUsersResponse & { data: TodoBoardUser[]; boardMembers?: TodoBoardUser[] }>({
    queryKey,
    queryFn: async () => {
      const response = await apiGetTodoBoardUsers(params);
      const rawData: any = (response as any)?.data;
      const availableUsers = Array.isArray(rawData) ? rawData : (rawData?.availableUsers || []);
      const boardMembers = Array.isArray(rawData) ? [] : (rawData?.boardMembers || []);

      return {
        ...(response as any),
        data: availableUsers,
        boardMembers,
      };
    },
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 min - don't refetch when new task cards mount on scroll
    refetchOnMount: false, // Use cache when SingleTaskFooter/ChecklistItem mount during scroll
  });
};

export const useUsersByRole = (role: string, params?: PaginationParams) => {
  const { page, limit } = params || {};

  return useQuery({
    queryKey: ['users', 'role', role, page, limit],
    queryFn: () =>
      ApiService.fetchDataWithAxios({
        url: `/users/role/${role}`,
        method: 'get',
        params: {
          page: page || 1,
          limit: limit || 20,
        },
      }),
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => apiGetUser(id),
  });
};

export const useUpdateUser = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (user: User) => apiUpdateUser(id, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', id] });
    },
  });
};

export const useDeleteUser = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiDeleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useChangeUserPassword = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => apiChangeUserPassword(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
    },
  });
};

export const useBulkDeleteUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkDeleteUsersRequest) => apiUserBulkDelete(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export interface Agent {
  _id: string;
  name?: string;
  login: string;
  active?: boolean;
  info?: {
    name?: string;
  };
}

export const useUserAgents = (options?: { enabled?: boolean }) => {
  return useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await AxiosBase.get('/users/agents');
      return response.data.data || [];
    },
    enabled: options?.enabled !== false,
  });
};
