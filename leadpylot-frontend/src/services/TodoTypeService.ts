import ApiService from './ApiService';

export interface CreatedBy {
  _id: string;
  login: string;
  first_name: string;
  last_name: string;
}

export interface TodoType {
  _id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  created_by?: CreatedBy;
  createdAt: string;
  updatedAt: string;
}

export interface TodoTypeListResponse {
  success: boolean;
  data: TodoType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message: string;
}

export interface TodoTypeResponse {
  success: boolean;
  data: TodoType;
  message: string;
}

export interface CreateTodoTypeRequest {
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateTodoTypeRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateTodoTypeStatusRequest {
  status: 'active' | 'inactive';
}

export interface DeleteTodoTypeResponse {
  success: boolean;
  message: string;
}

export interface GetTodoTypesParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive';
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const apiGetTodoTypes = (params?: GetTodoTypesParams) => {
  return ApiService.fetchDataWithAxios<TodoTypeListResponse>({
    url: '/todos/todo-types',
    method: 'get',
    params,
  });
};

export const apiGetTodoType = (id: string | null) => {
  if (!id) {
    throw new Error('Todo type ID is required');
  }
  return ApiService.fetchDataWithAxios<TodoTypeResponse>({
    url: `/todos/todo-types/${id}`,
    method: 'get',
  });
};

export const apiCreateTodoType = (data: CreateTodoTypeRequest) => {
  return ApiService.fetchDataWithAxios<TodoTypeResponse>({
    url: '/todos/todo-types',
    method: 'post',
    data: { ...data },
  });
};

export const apiUpdateTodoType = (id: string, data: UpdateTodoTypeRequest) => {
  return ApiService.fetchDataWithAxios<TodoTypeResponse>({
    url: `/todos/todo-types/${id}`,
    method: 'put',
    data: { ...data },
  });
};

export const apiUpdateTodoTypeStatus = (id: string, status: 'active' | 'inactive') => {
  return ApiService.fetchDataWithAxios<TodoTypeResponse>({
    url: `/todos/todo-types/${id}/status`,
    method: 'patch',
    data: { status },
  });
};

export const apiDeleteTodoType = (id: string) => {
  return ApiService.fetchDataWithAxios<DeleteTodoTypeResponse>({
    url: `/todos/todo-types/${id}`,
    method: 'delete',
  });
};
