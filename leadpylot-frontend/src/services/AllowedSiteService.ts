import ApiService from './ApiService';

export interface AllowedSite {
  _id: string;
  id: string;
  url: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AllowedSitesResponse {
  data: AllowedSite[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface CreateAllowedSiteRequest {
  url: string;
  name?: string;
}

export interface UpdateAllowedSiteRequest {
  url?: string;
  name?: string;
  active?: boolean;
}

export interface DeleteAllowedSitesResponse {
  success: boolean;
  message: string;
  deletedCount: number;
}

export const apiGetAllowedSites = (params?: Record<string, unknown>) => {
  return ApiService.fetchDataWithAxios<AllowedSitesResponse>({
    url: '/allowed-sites',
    method: 'get',
    params,
  });
};

export const apiGetAllowedSite = (id: string) => {
  return ApiService.fetchDataWithAxios<AllowedSite>({
    url: `/allowed-sites/${id}`,
    method: 'get',
  });
};

export const apiCreateAllowedSite = (data: CreateAllowedSiteRequest) => {
  return ApiService.fetchDataWithAxios<AllowedSite, CreateAllowedSiteRequest>({
    url: '/allowed-sites',
    method: 'post',
    data,
  });
};

export const apiUpdateAllowedSite = (id: string, data: UpdateAllowedSiteRequest) => {
  return ApiService.fetchDataWithAxios<AllowedSite, UpdateAllowedSiteRequest>({
    url: `/allowed-sites/${id}`,
    method: 'put',
    data,
  });
};

export const apiDeleteAllowedSite = (id: string) => {
  return ApiService.fetchDataWithAxios<DeleteAllowedSitesResponse>({
    url: `/allowed-sites/${id}`,
    method: 'delete',
  });
};

export const apiDeleteMultipleAllowedSites = (ids: string[]) => {
  return ApiService.fetchDataWithAxios<DeleteAllowedSitesResponse>({
    url: '/allowed-sites',
    method: 'delete',
    data: { ids },
  });
};
