import type { TodoResponse } from '@/services/ToDoService';
import { apiGetTodoDetails, apiUpdateTodo, type UpdateTodoRequest } from '@/services/ToDoService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface UseTodoDetailsOptions {
    enabled?: boolean;
}

export const useTodoDetails = (todoId: string | null, options?: UseTodoDetailsOptions) => {
    return useQuery<TodoResponse['data']>({
        queryKey: ['todoDetails', todoId],
        queryFn: async () => {
            if (!todoId) throw new Error('Todo ID is required');
            const response = await apiGetTodoDetails(todoId);
            return response.data;
        },
        enabled: !!todoId && (options?.enabled !== false),
    });
};

interface UpdateTodoTypesRequest {
    todoTypesids: Array<{
        todoTypeId: string;
        isDone: boolean;
    }>;
}

export const useUpdateTodoTypes = (todoId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateTodoTypesRequest) => {
            if (!todoId) throw new Error('Todo ID is required');
            return apiUpdateTodo(todoId, data as UpdateTodoRequest);
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['todoDetails', todoId] });
            queryClient.invalidateQueries({ queryKey: ['emailTasks'] });
            queryClient.invalidateQueries({ queryKey: ['todos'] });


        },
        onError: (error: any) => {
            console.log(error);
        },
    });
};

