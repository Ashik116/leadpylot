import ApiService from './ApiService';

export interface PredefinedSubtaskCategoryUser {
  _id: string;
  login?: string;
  first_name?: string;
  last_name?: string;
}

export interface PredefinedSubtaskCategory {
  _id: string;
  taskCategoryTitle: string;
  taskCategoryDescription?: string;
  tags?: string[];
  isStandaloneEnabled: boolean;
  isActive: boolean;
  createdBy?: PredefinedSubtaskCategoryUser;
  updatedBy?: PredefinedSubtaskCategoryUser | string | null;
  createdAt: string;
  updatedAt: string;
  id?: string;
}

export interface PredefinedSubtaskCategoryResponse {
  success: boolean;
  message: string;
  data: PredefinedSubtaskCategory;
}

export interface PredefinedSubtaskCategoriesListResponse {
  success: boolean;
  message: string;
  data: PredefinedSubtaskCategory[];
}

export interface GetPredefinedSubtaskCategoriesParams {
  isActive?: boolean;
  isStandaloneEnabled?: boolean;
  search?: string;
}

export interface CreatePredefinedSubtaskCategoryRequest {
  taskCategoryTitle: string;
  taskCategoryDescription?: string;
  tags?: string[];
  isStandaloneEnabled?: boolean;
  isActive?: boolean;
}

export interface UpdatePredefinedSubtaskCategoryRequest {
  taskCategoryTitle?: string;
  taskCategoryDescription?: string;
  tags?: string[];
  isStandaloneEnabled?: boolean;
  isActive?: boolean;
}

export const apiGetPredefinedSubtaskCategories = (
  params?: GetPredefinedSubtaskCategoriesParams
) => {
  return ApiService.fetchDataWithAxios<PredefinedSubtaskCategoriesListResponse>({
    url: '/api/predefined-subtask-categories/get-all-task-categories',
    method: 'get',
    params,
  });
};

export const apiGetPredefinedSubtaskCategory = (id: string | null) => {
  if (!id) {
    throw new Error('Predefined subtask category ID is required');
  }
  return ApiService.fetchDataWithAxios<PredefinedSubtaskCategoryResponse>({
    url: `/api/predefined-subtask-categories/get-task-category-by-id/${id}`,
    method: 'get',
  });
};

export const apiCreatePredefinedSubtaskCategory = (
  data: CreatePredefinedSubtaskCategoryRequest
) => {
  return ApiService.fetchDataWithAxios<PredefinedSubtaskCategoryResponse>({
    url: '/api/predefined-subtask-categories/create-task-category',
    method: 'post',
    data: { ...data },
  });
};

export const apiUpdatePredefinedSubtaskCategory = (
  id: string,
  data: UpdatePredefinedSubtaskCategoryRequest
) => {
  return ApiService.fetchDataWithAxios<PredefinedSubtaskCategoryResponse>({
    url: `/api/predefined-subtask-categories/update-task-category/${id}`,
    method: 'put',
    data: { ...data },
  });
};

export const apiDeletePredefinedSubtaskCategory = (id: string, permanent?: boolean) => {
  if (!id) {
    throw new Error('Predefined subtask category ID is required');
  }
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
    url: `/api/predefined-subtask-categories/delete-task-category/${id}`,
    method: 'delete',
    params: {
      permanent: permanent ? 'true' : undefined,
    },
  });
};
