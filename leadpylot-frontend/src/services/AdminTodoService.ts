import ApiService from './ApiService';

export interface AdminTodo {
  _id: string;
  message: string;
  isDone: boolean;
  priority: number;
  admin_only: boolean;
  due_date?: string;
  createdAt: string;
  updatedAt: string;
  lead_id: string;
  offer_id: string;
  lead: {
    _id: string;
    contact_name: string;
    email_from: string;
    phone: string;
  };
  offer: {
    _id: string;
    title: string;
    investment_volume: number;
  };
  creator: {
    _id: string;
    login: string;
    first_name: string;
    last_name: string;
  };
  assignedUser?: {
    _id: string;
    login: string;
    first_name: string;
    last_name: string;
  };
  template: {
    _id: string;
    name: string;
    priority: number;
  };
}

export interface OfferWithTodos {
  offer: {
    _id: string;
    title: string;
    investment_volume: number;
  };
  todos: AdminTodo[];
  todoCount: number;
}

export interface LeadWithTodos {
  _id: string;
  lead: {
    _id: string;
    contact_name: string;
    email_from: string;
    phone: string;
  };
  offers: OfferWithTodos[];
  totalTodos: number;
  pendingTodos: number;
  completedTodos: number;
}

export interface GroupedAdminTodosResponse {
  success: boolean;
  data: LeadWithTodos[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  statistics: {
    total_leads_with_todos: number;
    total_todos: number;
    total_pending: number;
    total_completed: number;
  };
}

export interface AdminTodosResponse {
  success: boolean;
  data: AdminTodo[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  statistics: {
    all_todos_count: number;
    pending_todos_count: number;
    completed_todos_count: number;
  };
}

export interface AdminTodoResponse {
  success: boolean;
  data: AdminTodo;
  message?: string;
}

export interface TodoTemplate {
  _id: string;
  name: string;
  description?: string;
  message: string;
  priority: number;
  auto_assign_to_agent: boolean;
  delay_hours: number;
  trigger_conditions: {
    offer_types?: string[];
    project_ids?: string[];
    investment_volume_min?: number;
    investment_volume_max?: number;
  };
  active: boolean;
  created_by: {
    _id: string;
    login: string;
    first_name: string;
    last_name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TodoTemplatesResponse {
  success: boolean;
  data: TodoTemplate[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface TodoTemplateResponse {
  success: boolean;
  data: TodoTemplate;
  message?: string;
}

export interface CreateTodoTemplateRequest {
  name: string;
  description?: string;
  message: string;
  priority?: number;
  auto_assign_to_agent?: boolean;
  delay_hours?: number;
  trigger_conditions?: {
    offer_types?: string[];
    project_ids?: string[];
    investment_volume_min?: number;
    investment_volume_max?: number;
  };
  active?: boolean;
}

export interface UpdateTodoTemplateRequest {
  name?: string;
  description?: string;
  message?: string;
  priority?: number;
  auto_assign_to_agent?: boolean;
  delay_hours?: number;
  trigger_conditions?: {
    offer_types?: string[];
    project_ids?: string[];
    investment_volume_min?: number;
    investment_volume_max?: number;
  };
  active?: boolean;
}

export interface AssignTodoRequest {
  isDone?: boolean;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
}

export interface ProjectsResponse {
  success: boolean;
  data: Project[];
}

// Admin Todo API calls

// Get grouped admin todos (Lead → Offers → Todos)
export const apiGetGroupedAdminTodos = (
  page?: number,
  limit?: number,
  isDone?: boolean,
  search?: string,
  sortBy?: string,
  sortOrder?: string
) => {
  return ApiService.fetchDataWithAxios<GroupedAdminTodosResponse>({
    url: '/admin/todos/grouped',
    method: 'get',
    params: {
      page,
      limit,
      isDone: isDone !== undefined ? String(isDone) : undefined,
      search,
      sortBy,
      sortOrder,
    },
  });
};

// Get admin todos (flat list)
export const apiGetAdminTodos = (
  page?: number,
  limit?: number,
  isDone?: boolean,
  offer_id?: string,
  template_id?: string,
  assigned_to?: string,
  priority?: number,
  search?: string,
  sortBy?: string,
  sortOrder?: string
) => {
  return ApiService.fetchDataWithAxios<AdminTodosResponse>({
    url: '/admin/todos',
    method: 'get',
    params: {
      page,
      limit,
      isDone: isDone !== undefined ? String(isDone) : undefined,
      offer_id,
      template_id,
      assigned_to,
      priority,
      search,
      sortBy,
      sortOrder,
    },
  });
};

// Get todos by offer ID
export const apiGetTodosByOfferId = (offerId: string, isDone?: boolean) => {
  return ApiService.fetchDataWithAxios<AdminTodosResponse>({
    url: `/admin/todos/offer/${offerId}`,
    method: 'get',
    params: {
      isDone: isDone !== undefined ? String(isDone) : undefined,
    },
  });
};

// Assign admin todo to agent
export const apiAssignAdminTodoToAgent = (todoId: string, agentId: string) => {
  return ApiService.fetchDataWithAxios<AdminTodoResponse>({
    url: `/admin/todos/${todoId}/assign/${agentId}`,
    method: 'post',
  });
};

// Make admin todo admin-only again
export const apiMakeAdminTodoAdminOnly = (todoId: string) => {
  return ApiService.fetchDataWithAxios<AdminTodoResponse>({
    url: `/admin/todos/${todoId}/make-admin-only`,
    method: 'post',
  });
};

// Update admin todo
export const apiUpdateAdminTodo = (todoId: string, data: AssignTodoRequest) => {
  return ApiService.fetchDataWithAxios<AdminTodoResponse, AssignTodoRequest>({
    url: `/admin/todos/${todoId}`,
    method: 'put',
    data,
  });
};

// Delete admin todo
export const apiDeleteAdminTodo = (todoId: string) => {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
    url: `/admin/todos/${todoId}`,
    method: 'delete',
  });
};

// Toggle admin todo status
export const apiToggleAdminTodoStatus = (todoId: string, isDone: boolean) => {
  return ApiService.fetchDataWithAxios<AdminTodoResponse, { isDone: boolean }>({
    url: `/admin/todos/${todoId}/toggle`,
    method: 'patch',
    data: { isDone },
  });
};

// Todo Template API calls

// Get all todo templates
export const apiGetTodoTemplates = (
  page?: number,
  limit?: number,
  active?: boolean,
  search?: string,
  sortBy?: string,
  sortOrder?: string
) => {
  return ApiService.fetchDataWithAxios<TodoTemplatesResponse>({
    url: '/admin/todo-templates',
    method: 'get',
    params: {
      page,
      limit,
      active: active !== undefined ? String(active) : undefined,
      search,
      sortBy,
      sortOrder,
    },
  });
};

// Get single todo template
export const apiGetTodoTemplate = (templateId: string) => {
  return ApiService.fetchDataWithAxios<TodoTemplateResponse>({
    url: `/admin/todo-templates/${templateId}`,
    method: 'get',
  });
};

// Create todo template
export const apiCreateTodoTemplate = (data: CreateTodoTemplateRequest) => {
  return ApiService.fetchDataWithAxios<TodoTemplateResponse, CreateTodoTemplateRequest>({
    url: '/admin/todo-templates',
    method: 'post',
    data,
  });
};

// Update todo template
export const apiUpdateTodoTemplate = (templateId: string, data: UpdateTodoTemplateRequest) => {
  return ApiService.fetchDataWithAxios<TodoTemplateResponse, UpdateTodoTemplateRequest>({
    url: `/admin/todo-templates/${templateId}`,
    method: 'put',
    data,
  });
};

// Delete todo template
export const apiDeleteTodoTemplate = (templateId: string) => {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
    url: `/admin/todo-templates/${templateId}`,
    method: 'delete',
  });
};

// Get available projects for template conditions
export const apiGetAvailableProjects = () => {
  return ApiService.fetchDataWithAxios<ProjectsResponse>({
    url: '/admin/todo-templates/projects',
    method: 'get',
  });
};

// Test template against offer
export const apiTestTodoTemplate = (templateId: string, offerId: string) => {
  return ApiService.fetchDataWithAxios<{
    success: boolean;
    data: {
      template: { id: string; name: string; message: string };
      offer: { id: string; title: string; offerType: string; investment_volume: number };
      shouldTrigger: boolean;
      messagePreview: string;
      triggerConditions: any;
    };
  }>({
    url: `/admin/todo-templates/${templateId}/test/${offerId}`,
    method: 'post',
  });
};
