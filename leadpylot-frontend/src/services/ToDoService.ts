import ApiService from './ApiService';

export interface Document {
  _id: string;
  filetype: string;
  filename: string;
  size: number;
  type: string;
  assignmentCount: number;
  formattedSize: string;
  id: string;
}

export interface Todo {
  _id: string;
  type?: string;
  creator_id: {
    _id: string;
    login: string;
    name?: string;
  };
  lead_id: {
    _id: string;
    contact_name: string;
    email_from: string;
    phone: string;
  } | string;
  message: string;
  isDone: boolean;
  active: boolean;
  assigned_to?: {
    _id: string;
    login: string;
    name?: string;
    email?: string;
  };
  priority?: number;
  due_date?: string;
  email_id?: {
    _id: string;
    subject: string;
    from: string;
    to: string[];
    received_at: string;
  } | string;
  todoTypesids?: Array<{
    _id: string;
    todoTypeId: {
      _id: string;
      name: string;
      status: string;
      description?: string;
      id: string;
    };
    isDone: boolean;
    id: string;
  }>;
  admin_only?: boolean;
  documents_ids?: string[] | Document[];
  documents?: Document[];
  createdAt: string;
  updatedAt: string;
  __v?: number;
  id?: string;
}

export interface TodosResponse {
  success: boolean;
  data: Todo[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface TodoResponse {
  success: boolean;
  data: Todo;
  message?: string;
}

export interface LeadTodosResponse {
  success: boolean;
  data: Todo[];
  meta: {
    total: number;
    lead_id: string;
  };
}

export interface BoardMember {
  _id: string;
  name?: string;
  login?: string;
  email?: string;
}

export interface BoardMembersResponse {
  success?: boolean;
  data?: BoardMember[];
}

export interface CreateTodoRequest {
  task_type?: string;
  lead_id?: string;
  offer_id?: string;
  opening_id?: string;
  board_id?: string;
  list_id?: string;
  taskTitle?: string;
  taskDescription?: string;
  message?: string; // Keep for backward compatibility
  todoTypesids?: Array<{
    todoTypeId: string;
    isDone: boolean;
  }>;
  assignto?: string;
  assigned?: string[];
  documents_ids?: string[];
  note?: string;
}

export interface UpdateTodoRequest {
  message?: string;
  isDone?: boolean;
  todoTypesids?: Array<{
    todoTypeId: string;
    isDone: boolean;
  }>;
}

export interface ToggleTodoStatusRequest {
  isDone: boolean;
}

export interface DeleteTodoResponse {
  success: boolean;
  message: string;
}

// Create a new todo
export const apiCreateTodo = (data: CreateTodoRequest) => {
  return ApiService.fetchDataWithAxios<TodoResponse, CreateTodoRequest>({
    url: '/todos',
    method: 'post',
    data,
  });
};

// Get all todos with filtering and pagination
export const apiGetTodos = (
  page?: number,
  limit?: number,
  lead_id?: string,
  creator_id?: string,
  isDone?: boolean,
  showInactive?: boolean,
  search?: string
) => {
  return ApiService.fetchDataWithAxios<TodosResponse>({
    url: '/todos',
    method: 'get',
    params: {
      page,
      limit,
      lead_id,
      creator_id,
      isDone: isDone !== undefined ? String(isDone) : undefined,
      showInactive: showInactive !== undefined ? String(showInactive) : undefined,
      search,
    },
  });
};

// Get a specific todo by ID
export const apiGetTodo = (id: string) => {
  return ApiService.fetchDataWithAxios<TodoResponse>({
    url: `/todos/${id}`,
    method: 'get',
  });
};

// Get todo details by ID
export const apiGetTodoDetails = (id: string) => {
  return ApiService.fetchDataWithAxios<TodoResponse>({
    url: `/todos/${id}`,
    method: 'get',
  });
};

// Update an existing todo
export const apiUpdateTodo = (id: string, data: UpdateTodoRequest) => {
  return ApiService.fetchDataWithAxios<TodoResponse, UpdateTodoRequest>({
    url: `/todos/${id}`,
    method: 'put',
    data,
  });
};

// Toggle todo status (done/undone)
export const apiToggleTodoStatus = (id: string, data: ToggleTodoStatusRequest) => {
  return ApiService.fetchDataWithAxios<TodoResponse, ToggleTodoStatusRequest>({
    url: `/todos/${id}/status`,
    method: 'patch',
    data,
  });
};

// Delete a todo (soft delete)
export const apiDeleteTodo = (id: string) => {
  return ApiService.fetchDataWithAxios<DeleteTodoResponse>({
    url: `/todos/${id}`,
    method: 'delete',
  });
};

// Get todos for a specific lead
export const apiGetTodosByLeadId = (leadId: string, isDone?: boolean, showInactive?: boolean) => {
  return ApiService.fetchDataWithAxios<LeadTodosResponse>({
    url: `/todos/lead/${leadId}`,
    method: 'get',
    params: {
      isDone: isDone !== undefined ? String(isDone) : undefined,
      showInactive: showInactive !== undefined ? String(showInactive) : undefined,
    },
  });
};

// Get board members by board_type (for assignee dropdown)
export const apiGetBoardMembers = (boardType: string) => {
  return ApiService.fetchDataWithAxios<BoardMembersResponse>({
    url: '/todos/board-members',
    method: 'get',
    params: { board_type: boardType },
  });
};

// Create task from email
export const apiCreateTaskFromEmail = (emailId: string, data?: { taskTitle?: string }) => {
  return ApiService.fetchDataWithAxios<TodoResponse>({
    url: `/api/tasks/create-from-email/${emailId}`,
    method: 'post',
    data,
  });
};
