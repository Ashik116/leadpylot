import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiGetBoardMembers, type BoardMembersResponse } from '../ToDoService';

export interface UseBoardMembersOptions {
  enabled?: boolean;
}

/**
 * Fetches board members for a given board_type (taskType).
 * Used for assignee multi-select in ticket/task forms.
 */
export const useBoardMembers = (
  boardType: string | undefined,
  options?: UseBoardMembersOptions & Partial<UseQueryOptions<BoardMembersResponse>>
) => {
  const { enabled: optsEnabled, ...rest } = options ?? {};
  const enabled = (optsEnabled !== false) && !!boardType;

  return useQuery<BoardMembersResponse>({
    queryKey: ['board-members', boardType],
    queryFn: () => apiGetBoardMembers(boardType!),
    enabled,
    ...rest,
  });
};
