import ApiService from './ApiService';

export interface PredefinedSubtaskUser {
  _id: string;
  login?: string;
  first_name?: string;
  last_name?: string;
}

export interface PredefinedSubtaskCategoryRef {
  _id: string;
  taskCategoryTitle?: string;
  id?: string;
}

export interface TodoItem {
  _id?: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  isCompleted?: boolean;
  dueDate?: string;
  assigned?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PredefinedSubtask {
  _id: string;
  taskTitle: string;
  taskDescription?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: PredefinedSubtaskCategoryRef[];
  tags?: string[];
  todo?: TodoItem[];
  isActive: boolean;
  createdBy?: PredefinedSubtaskUser;
  updatedBy?: PredefinedSubtaskUser | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PredefinedSubtasksListResponse {
  success: boolean;
  data: PredefinedSubtask[];
  message: string;
}

export interface PredefinedSubtaskResponse {
  success: boolean;
  data: PredefinedSubtask;
  message: string;
}

export interface CreatePredefinedSubtaskRequest {
  taskTitle: string;
  taskDescription?: string;
  priority?: 'low' | 'medium' | 'high';
  category: string[];
  tags?: string[];
  todo?: Array<{
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    isCompleted?: boolean;
    dueDate?: string;
  }>;
}

export interface UpdatePredefinedSubtaskRequest {
  taskTitle?: string;
  taskDescription?: string;
  priority?: 'low' | 'medium' | 'high';
  estimatedDuration?: number;
  category?: string[];
  tags?: string[];
  todo?: Array<{
    _id?: string;
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    isCompleted?: boolean;
    dueDate?: string;
    isDelete?: boolean;
  }>;
  isActive?: boolean;
}

export interface GetPredefinedSubtasksParams {
  category?: string | string[];
  priority?: 'low' | 'medium' | 'high';
  isActive?: boolean;
  search?: string;
  entity?: string;
}

export const apiGetPredefinedSubtasks = (params?: GetPredefinedSubtasksParams) => {
  return ApiService.fetchDataWithAxios<PredefinedSubtasksListResponse>({
    url: '/api/predefined-subtasks/get-all',
    method: 'get',
    params,
  });
};

export const apiGetPredefinedSubtask = (id: string | null) => {
  if (!id) {
    throw new Error('Predefined subtask ID is required');
  }
  return ApiService.fetchDataWithAxios<PredefinedSubtaskResponse>({
    url: `/api/predefined-subtasks/get-by-id/${id}`,
    method: 'get',
  });
};

export const apiCreatePredefinedSubtask = (data: CreatePredefinedSubtaskRequest) => {
  return ApiService.fetchDataWithAxios<PredefinedSubtaskResponse>({
    url: '/api/predefined-subtasks/create',
    method: 'post',
    data: { ...data },
  });
};

export const apiUpdatePredefinedSubtask = (id: string, data: UpdatePredefinedSubtaskRequest) => {
  return ApiService.fetchDataWithAxios<PredefinedSubtaskResponse>({
    url: `/api/predefined-subtasks/update/${id}`,
    method: 'put',
    data: { ...data },
  });
};

export const apiDeletePredefinedSubtask = (id: string, permanent?: boolean) => {
  if (!id) {
    throw new Error('Predefined subtask ID is required');
  }
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
    url: `/api/predefined-subtasks/delete/${id}`,
    method: 'delete',
    params: {
      permanent: permanent ? 'true' : undefined,
    },
  });
};
