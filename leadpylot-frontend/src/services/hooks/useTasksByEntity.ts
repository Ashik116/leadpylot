import { useQuery } from '@tanstack/react-query';
import { apiGetTasksByEntity, GetTasksByEntityParams } from '@/services/TaskService';

export const TASKS_BY_ENTITY_KEY = 'tasksByEntity';

export const useTasksByEntity = (params: GetTasksByEntityParams, enabled = true) => {
  return useQuery({
    queryKey: [TASKS_BY_ENTITY_KEY, params],
    queryFn: () => apiGetTasksByEntity(params),
    enabled,
  });
};
