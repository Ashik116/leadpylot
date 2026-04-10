import ApiService from './ApiService';

// ============================================================================
// Types
// ============================================================================

export interface TLabel {
  _id: string;
  title: string;
  color: string;
  isSelected?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiTask {
  _id: string;
  taskTitle: string;
  taskDescription?: string;
  board_id?: string[];
  list_id?: string[];
  lead_id?: string;
  offer_id?: string;
  priority?: string;
  status?: string;
  position?: number;
  isCompleted?: boolean;
  assigned?: string[];
  createdBy?: string;
  dueDate?: string | null;
  attachment?: any[];
  labels?: Array<TLabel>;
  custom_fields?: any[];
  subTask?: any[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface CreateTaskRequest {
  taskTitle: string;
  taskDescription?: string;
  priority?: string;
  position?: number;
  subTask?:
  | Array<{
    predefined_subtask_id?: string;
    taskTitle?: string;
    todo?: Array<{ title: string; priority?: string }>;
  }>
  | string[];
  custom_fields?: Array<{
    title: string;
    field_type: string;
    todo?: Array<{ title: string; isCompleted?: boolean }>;
  }>;
  labels?: Array<{ title: string; color: string }>;
  board_id?: string[];
  list_id?: string[];
  lead_id?: string;
  offer_id?: string;
  opening_id?: string;
  email_id?: string;
  task_type?: string;
  assigned?: string[];
  attachment?: string[];
}

export interface UpdateTaskRequest {
  taskTitle?: string;
  taskDescription?: string;
  priority?: string;
  position?: number;
  subTask?:
  | Array<{
    _id?: string;
    taskTitle?: string;
    todo?: Array<{ _id?: string; title?: string; isCompleted?: boolean; priority?: string }>;
  }>
  | string[]; // Allow array of strings for predefined task IDs
  custom_fields?: Array<{
    _id?: string;
    title?: string;
    value?: any;
    isSelected?: boolean;
    field_type?: string;
    todo?: Array<{ _id?: string; title?: string; isCompleted?: boolean }>;
  }>;
  labels?: Array<{ _id?: string; title?: string; color?: string }> | string[];
  attachment?: string[];
  board_id?: string[] | string;
  list_id?: string[];
  isCompleted?: boolean;
  status?: string;
  dueDate?: string | null;
  assigned?: string[];
  before_task_id?: string;
  after_task_id?: string;
  target_list_id?: string;
}

export interface TransferTaskRequest {
  target_list_id: string;
  before_task_id?: string;
  after_task_id?: string;
}

export interface GetTasksParams {
  board_id?: string;
  list_id?: string;
  lead_id?: string;
  offer_id?: string;
  inbox?: boolean;
  task_type?: 'email' | 'task';
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface TaskResponse {
  success: boolean;
  message: string;
  data: ApiTask;
}

export interface TasksResponse {
  success: boolean;
  message: string;
  data: ApiTask[];
  meta?: TasksPagination;
}

export interface DeleteTaskItemParams {
  subTaskId?: string;
  nestedTodoId?: string;
  customFieldId?: string;
}

export interface TasksPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
  offset: number;
  hasMore?: boolean;
  accessLevel?: string;
}

export interface TasksByEntityResponse {
  success: boolean;
  message: string;
  data: ApiTask[];
  meta: TasksPagination;
}

export interface GetTasksByEntityParams {
  email_id?: string;
  lead_id?: string;
  offer_id?: string;
  opening_id?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Create a new task
 */
export async function apiCreateTask(data: CreateTaskRequest): Promise<TaskResponse> {
  return ApiService.fetchDataWithAxios<TaskResponse, CreateTaskRequest>({
    url: '/api/tasks/create',
    method: 'POST',
    data,
  });
}

/**
 * Update a task
 */
export async function apiUpdateTask(id: string, data: UpdateTaskRequest): Promise<TaskResponse> {
  return ApiService.fetchDataWithAxios<TaskResponse, UpdateTaskRequest>({
    url: `/api/tasks/update/${id}`,
    method: 'PUT',
    data,
  });
}

/**
 * Transfer a task to another list
 */
export async function apiTransferTask(
  id: string,
  data: TransferTaskRequest
): Promise<TaskResponse> {
  return ApiService.fetchDataWithAxios<TaskResponse, TransferTaskRequest>({
    url: `/api/tasks/transfer/${id}`,
    method: 'PATCH',
    data,
  });
}

/**
 * Get all tasks with optional filters
 */
export async function apiGetAllTasks(params?: GetTasksParams): Promise<TasksResponse> {
  return ApiService.fetchDataWithAxios<TasksResponse>({
    url: '/api/tasks/get-all',
    method: 'GET',
    params,
  });
}

/**
 * Get a single task by ID
 */
export async function apiGetTaskById(id: string): Promise<TaskResponse> {
  return ApiService.fetchDataWithAxios<TaskResponse>({
    url: `/api/tasks/get-by-id/${id}`,
    method: 'GET',
  });
}

/**
 * Delete a task
 */
export async function apiDeleteTask(id: string): Promise<TaskResponse> {
  return ApiService.fetchDataWithAxios<TaskResponse>({
    url: `/api/tasks/delete/${id}`,
    method: 'DELETE',
  });
}

/**
 * Delete a task item (subtask, nested todo, or custom field item)
 */
export async function apiDeleteTaskItem(
  taskId: string,
  params: DeleteTaskItemParams
): Promise<TaskResponse> {
  return ApiService.fetchDataWithAxios<TaskResponse>({
    url: `/api/tasks/${taskId}/delete-item`,
    method: 'DELETE',
    params,
  });
}

/**
 * Get tasks by entity ID (email, lead, offer, or opening)
 */
export async function apiGetTasksByEntity(
  params: GetTasksByEntityParams
): Promise<TasksByEntityResponse> {
  return ApiService.fetchDataWithAxios<TasksByEntityResponse>({
    url: '/api/tasks/by-entity',
    method: 'GET',
    params,
  });
}
