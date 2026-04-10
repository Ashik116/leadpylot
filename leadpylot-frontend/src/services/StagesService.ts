import ApiService from './ApiService';
import { Meta } from './SettingsService';

export interface Stage {
  _id: string;
  type?: string;
  name: string;
  info: {
    isWonStage: boolean;
    statuses: {
      _id?: string;
      name: string;
      code: string;
      allowed: boolean;
    }[];
  };
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export type TGetAllStagesResponse = {
  data: Stage[];
  meta: Meta;
};

export interface CreateStageRequest {
  name: string;
  isWonStage: boolean;
  statuses?: {
    name: string;
    code: string;
    allowed: boolean;
  }[];
}

export interface UpdateStageRequest {
  name?: string;
  isWonStage?: boolean;
  salesTeam?: string;
  statuses?: {
    _id?: string;
    name: string;
    code: string;
    allowed: boolean;
  }[];
}

export const apiGetStages = (params?: Record<string, unknown>) => {
  return ApiService.fetchDataWithAxios<TGetAllStagesResponse>({
    url: '/settings/stage',
    method: 'get',
    params,
  });
};

export const apiGetStage = (id: string | null) => {
  return ApiService.fetchDataWithAxios<Stage>({
    url: `/settings/stage/${id}`,
    method: 'get',
  });
};

export const apiCreateStage = (data: CreateStageRequest) => {
  return ApiService.fetchDataWithAxios<Stage>({
    url: '/settings/stage',
    method: 'post',
    data: { ...data },
  });
};

export const apiUpdateStage = (id: string, data: UpdateStageRequest) => {
  return ApiService.fetchDataWithAxios<Stage>({
    // baseURL: 'http://localhost:3001',
    url: `/settings/stage/${id}`,
    method: 'put',
    data: { ...data },
  });
};

export const apiDeleteStage = (id: string) => {
  return ApiService.fetchDataWithAxios<{ message: string }>({
    // baseURL: 'http://localhost:3001',
    url: `/settings/stage/${id}`,
    method: 'delete',
    // params: { id },
  });
};
