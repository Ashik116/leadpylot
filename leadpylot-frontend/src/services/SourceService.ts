import ApiService from './ApiService';

export interface Provider {
  _id: string;
  name: string;
  email: string;
  login: string;
  role: string;
}

export interface Source {
  _id: string;
  name: string;
  price: number;
  /** Hex color e.g. #RRGGBB; null if unset */
  color?: string | null;
  provider: Provider;
  lead_count: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SourcesResponse {
  data: Source[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
export interface TSourcesResponse {
  data: Source[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
export interface CreateSourceRequest {
  name: string;
  price: number;
  provider_id?: string;
  color?: string;
}

export interface UpdateSourceRequest {
  name?: string;
  price?: number;
  provider_id?: string;
  /** Pass null to clear */
  color?: string | null;
}

export interface DeleteSourcesResponse {
  success: boolean;
  message: string;
  deletedCount: number;
}

export const apiGetSources = (page?: number, limit?: number, sort?: string, search?: string, sortBy?: string, sortOrder?: string) => {
  return ApiService.fetchDataWithAxios<TSourcesResponse>({
    url: '/sources',
    method: 'get',
    params: {
      page,
      limit,
      sort,
      search,
      sortBy,
      sortOrder,
    },
  });
};
export const apiGetSourcesData = (params?: Record<string, unknown>) => {
  return ApiService.fetchDataWithAxios<TSourcesResponse>({
    url: '/sources',
    method: 'get',
    params,
  });
};
export const apiGetSource = (id: string) => {
  return ApiService.fetchDataWithAxios<Source>({
    url: `/sources/${id}`,
    method: 'get',
  });
};

export const apiCreateSource = (data: CreateSourceRequest) => {
  return ApiService.fetchDataWithAxios<Source, CreateSourceRequest>({
    url: '/sources',
    method: 'post',
    data,
  });
};

export const apiUpdateSource = (id: string, data: UpdateSourceRequest) => {
  return ApiService.fetchDataWithAxios<Source, UpdateSourceRequest>({
    url: `/sources/${id}`,
    method: 'put',
    data,
  });
};

export const apiDeleteSource = (id: string) => {
  return ApiService.fetchDataWithAxios<DeleteSourcesResponse>({
    url: `/sources/${id}`,
    method: 'delete',
  });
};

export const apiDeleteMultipleSources = (ids: string[]) => {
  return ApiService.fetchDataWithAxios<DeleteSourcesResponse>({
    url: '/sources',
    method: 'delete',
    data: { ids },
  });
};
