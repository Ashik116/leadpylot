import ApiService from './ApiService';
import type { ApiTask } from './TaskService';

// ============================================================================
// Types
// ============================================================================

export interface Board {
  _id: string;
  name: string;
  board_type: string;
  description?: string;
  lists: BoardList[];
  members?: Array<{ _id: string; [key: string]: any }>;
  created_by?: { _id: string; [key: string]: any };
  is_archived?: boolean;
  is_deleted?: boolean;
  onlyMe?: boolean;
  createdAt?: string;
  updatedAt?: string;
  is_system?: boolean;
}

export interface BoardList {
  _id: string;
  listTitle: string;
  types: string;
  position?: number;
  cards?: BoardCard[];
  [key: string]: any;
}

export interface BoardMember {
  _id: string;
  login: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  isCreator?: boolean;
  joinedAt?: string;
}

export interface BoardCard {
  _id: string;
  title: string;
  description?: string;
  position?: number;
  listId?: string;
  [key: string]: any;
}

export interface CreateBoardRequest {
  name: string;
  board_type: string;
  description?: string;
  members?: string[];
  onlyMe?: boolean;
}

export interface UpdateBoardRequest {
  board_id?: string;
  name?: string;
  description?: string;
  board_type?: string;
  members?: string[];
  all_agent?: boolean;
  is_archived?: boolean;
  is_deleted?: boolean;
  onlyMe?: boolean;
}

export interface CardPosition {
  cardId: string;
  position: number;
}

export interface UpdateCardPositionsRequest {
  cardPositions: CardPosition[];
}

export interface BoardResponse {
  success: boolean;
  message: string;
  data: Board;
}

export interface BoardWithListsResponse {
  success: boolean;
  message: string;
  data: {
    board: Board;
    lists: BoardList[];
  };
}

export interface BoardFullList {
  id: string;
  name: string;
  type: string;
  position?: number;
  color?: string;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tasks?: ApiTask[];
  taskCount?: number;
  [key: string]: any;
}

export interface BoardFullResponse {
  success: boolean;
  message: string;
  data: {
    board: Board;
    lists: BoardFullList[];
    meta: {
      totalLists: number;
      totalTasks: number;
      taskLimitPerList: number;
      queriedAt: string;
    };
  };
}

export interface ListTasksResponse {
  success: boolean;
  message: string;
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  data: any[];
}

export interface GetListTasksParams {
  cursor?: string;
  page?: number;
  limit?: number;
}

export interface BoardsResponse {
  success: boolean;
  message: string;
  data: Board[];
}

export interface InitializeSystemBoardsResponse {
  success: boolean;
  message: string;
  data: {
    boards: Board[];
    lists: BoardList[];
    summary: {
      totalBoards: number;
      totalLists: number;
      newlyCreatedBoards: number;
      newlyCreatedLists: number;
    };
  };
}

export interface CreateListRequest {
  CardTitle: string;
  types: string;
}

export interface CreateListResponse {
  success: boolean;
  message: string;
  data: BoardList;
}

export interface UpdateListRequest {
  CardTitle?: string;
  types?: string;
  color?: string;
}

export interface UpdateListResponse {
  success: boolean;
  message: string;
  data: BoardList;
}

export interface UpdateListPositionRequest {
  position: number;
}

export interface UpdateListPositionResponse {
  success: boolean;
  message: string;
  data: BoardList;
}

export interface BulkUpdateListPositionsRequest {
  listPositions: Array<{ listId: string; position: number }>;
}

export interface BulkUpdateListPositionsResponse {
  success: boolean;
  message: string;
  data: {
    updatedCount: number;
    lists: BoardList[];
  };
}

export interface BoardMembersResponse {
  status: string;
  message: string;
  data: BoardMember[];
  meta?: {
    boardId?: string;
    boardName?: string;
    totalMembers?: number;
  };
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Initialize system boards (creates 5 default system boards)
 */
export async function apiInitializeSystemBoards(): Promise<InitializeSystemBoardsResponse> {
  return ApiService.fetchDataWithAxios<InitializeSystemBoardsResponse>({
    url: '/api/boards/initialize-system',
    method: 'POST',
  });
}

/**
 * Create a new board
 */
export async function apiCreateBoard(data: CreateBoardRequest): Promise<BoardResponse> {
  return ApiService.fetchDataWithAxios<BoardResponse, CreateBoardRequest>({
    url: '/api/boards/create',
    method: 'POST',
    data,
  });
}

/**
 * Get all boards with optional filters
 */
export async function apiGetAllBoards(params?: {
  board_type?: string;
  created_by?: string;
  is_archived?: boolean;
  is_deleted?: boolean;
}): Promise<BoardsResponse> {
  return ApiService.fetchDataWithAxios<BoardsResponse>({
    url: '/api/boards/get-all',
    method: 'GET',
    params,
  });
}

/**
 * Get a single board by ID (optimized - returns board with lists, no tasks)
 */
export async function apiGetBoardById(id: string): Promise<BoardWithListsResponse> {
  return ApiService.fetchDataWithAxios<BoardWithListsResponse>({
    url: `/api/boards/${id}/with-lists`,
    method: 'GET',
  });
}

/**
 * Get full board (board + lists + tasks) in a single call.
 * Uses backend endpoint: GET /api/boards/:boardId/full
 */
export async function apiGetBoardFull(
  id: string,
  opts?: { task_limit?: number }
): Promise<BoardFullResponse> {
  const params: Record<string, string | number> = {};
  if (opts?.task_limit) {
    params.task_limit = opts.task_limit;
  }

  const url = `/api/boards/${id}/full`;

  return ApiService.fetchDataWithAxios<BoardFullResponse>({
    url,
    method: 'GET',
    params,
  });
}

export async function apiGetBoardMembers(id: string): Promise<BoardMembersResponse> {
  return ApiService.fetchDataWithAxios<BoardMembersResponse>({
    url: `/api/boards/${id}/members`,
    method: 'GET',
  });
}

/**
 * Get tasks for a specific list with cursor pagination
 */
export async function apiGetListTasks(
  boardId: string,
  listId: string,
  params?: GetListTasksParams
): Promise<ListTasksResponse> {
  const queryParams = new URLSearchParams();
  if (params?.cursor) {
    queryParams.append('cursor', params.cursor);
  }
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  const queryString = queryParams.toString();
  const url = `/api/boards/${boardId}/lists/${listId}/tasks${queryString ? `?${queryString}` : ''}`;

  return ApiService.fetchDataWithAxios<ListTasksResponse>({
    url,
    method: 'GET',
  });
}

/**
 * Update a board
 */
export async function apiUpdateBoard(id: string, data: UpdateBoardRequest): Promise<BoardResponse> {
  return ApiService.fetchDataWithAxios<BoardResponse, UpdateBoardRequest>({
    url: `/api/boards/update/${id}`,
    method: 'PUT',
    data,
  });
}

/**
 * Update card positions within a board
 */
export async function apiUpdateCardPositions(
  id: string,
  data: UpdateCardPositionsRequest
): Promise<BoardResponse> {
  return ApiService.fetchDataWithAxios<BoardResponse>({
    url: `/api/boards/update-card-positions/${id}`,
    method: 'PATCH',
    data: data as unknown as Record<string, unknown>,
  });
}

/**
 * Delete a board (soft delete)
 */
export async function apiDeleteBoard(id: string): Promise<BoardResponse> {
  return ApiService.fetchDataWithAxios<BoardResponse>({
    url: `/api/boards/delete/${id}`,
    method: 'DELETE',
  });
}

/**
 * Create a new list in a board
 */
export async function apiCreateList(
  boardId: string,
  data: CreateListRequest
): Promise<CreateListResponse> {
  return ApiService.fetchDataWithAxios<CreateListResponse, CreateListRequest>({
    url: `/api/lists/${boardId}/create-list`,
    method: 'POST',
    data,
  });
}

/**
 * Update a list
 */
export async function apiUpdateList(
  listId: string,
  data: UpdateListRequest
): Promise<UpdateListResponse> {
  return ApiService.fetchDataWithAxios<UpdateListResponse, UpdateListRequest>({
    url: `/api/lists/update/${listId}`,
    method: 'PUT',
    data,
  });
}

/**
 * Update list position
 */
export async function apiUpdateListPosition(
  listId: string,
  data: UpdateListPositionRequest
): Promise<UpdateListPositionResponse> {
  return ApiService.fetchDataWithAxios<UpdateListPositionResponse, UpdateListPositionRequest>({
    url: `/api/lists/update-position/${listId}`,
    method: 'PATCH',
    data,
  });
}

/**
 * Bulk update list positions
 */
export async function apiBulkUpdateListPositions(
  data: BulkUpdateListPositionsRequest
): Promise<BulkUpdateListPositionsResponse> {
  // Use any list ID as the endpoint, the backend handles bulk updates
  const firstListId = data.listPositions[0]?.listId || 'bulk';
  return ApiService.fetchDataWithAxios<
    BulkUpdateListPositionsResponse,
    BulkUpdateListPositionsRequest
  >({
    url: `/api/lists/update-position/${firstListId}`,
    method: 'PATCH',
    data,
  });
}

/**
 * Delete a list
 */
export async function apiDeleteList(listId: string): Promise<any> {
  return ApiService.fetchDataWithAxios<any>({
    url: `/api/lists/delete/${listId}`,
    method: 'DELETE',
  });
}
