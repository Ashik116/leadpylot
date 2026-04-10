import ApiService from './ApiService';

export interface SimpleTodoTemplate {
  _id: string;
  message: string;
  active: boolean;
  order: number;
  created_by: {
    _id: string;
    login: string;
    first_name: string;
    last_name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SimpleTodoTemplatesResponse {
  success: boolean;
  data: SimpleTodoTemplate[];
  meta: {
    total: number;
  };
}

export interface SimpleTodoTemplateResponse {
  success: boolean;
  data: SimpleTodoTemplate;
  message?: string;
}

export interface CreateSimpleTodoTemplateRequest {
  message: string;
  order?: number;
}

export interface UpdateSimpleTodoTemplateRequest {
  message?: string;
  order?: number;
  active?: boolean;
}

export interface ReorderTemplatesRequest {
  templates: Array<{
    id: string;
    order: number;
  }>;
}

// Get all simple todo templates
export const apiGetSimpleTodoTemplates = (search?: string) => {
  return ApiService.fetchDataWithAxios<SimpleTodoTemplatesResponse>({
    url: '/admin/simple-todos',
    method: 'get',
    params: {
      search,
    },
  });
};

// Create simple todo template
export const apiCreateSimpleTodoTemplate = (data: CreateSimpleTodoTemplateRequest) => {
  return ApiService.fetchDataWithAxios<SimpleTodoTemplateResponse, CreateSimpleTodoTemplateRequest>({
    url: '/admin/simple-todos',
    method: 'post',
    data,
  });
};

// Update simple todo template
export const apiUpdateSimpleTodoTemplate = (templateId: string, data: UpdateSimpleTodoTemplateRequest) => {
  return ApiService.fetchDataWithAxios<SimpleTodoTemplateResponse, UpdateSimpleTodoTemplateRequest>({
    url: `/admin/simple-todos/${templateId}`,
    method: 'put',
    data,
  });
};

// Delete simple todo template
export const apiDeleteSimpleTodoTemplate = (templateId: string) => {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
    url: `/admin/simple-todos/${templateId}`,
    method: 'delete',
  });
};

// Reorder templates
export const apiReorderSimpleTodoTemplates = (data: ReorderTemplatesRequest) => {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }, ReorderTemplatesRequest>({
    url: '/admin/simple-todos/reorder',
    method: 'put',
    data,
  });
};
