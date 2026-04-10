import { GET_ALL_BONOUS_AMOUNTS_URL } from '@/constants/api.constant';
import ApiService from '../ApiService';
import { UseBonusAmountsParams } from '../hooks/settings/useBonus';

export interface BonusAmount {
  _id: string;
  name: string;
  info: {
    amount: number;
    code: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface GetAllBonusAmountsResponse {
  data: BonusAmount[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface CreateBonusAmountRequest {
  name: string;
  amount: number;
  code: string;
}

/**
 * Get all bonus amounts
 */
export async function apiGetBonusAmounts(params?: UseBonusAmountsParams) {
  return ApiService.fetchDataWithAxios<GetAllBonusAmountsResponse>({
    url: GET_ALL_BONOUS_AMOUNTS_URL,
    method: 'get',
    params,
  });
}

/**
 * Get a specific bonus amount by ID
 */
export async function apiGetBonusAmount(id: string) {
  return ApiService.fetchDataWithAxios<BonusAmount>({
    url: `${GET_ALL_BONOUS_AMOUNTS_URL}/${id}`,
    method: 'get',
  });
}

/**
 * Create a new bonus amount
 */
export async function apiCreateBonusAmount(data: CreateBonusAmountRequest) {
  return ApiService.fetchDataWithAxios<BonusAmount, any>({
    url: '/settings/bonus_amount',
    method: 'post',
    data,
  });
}

/**
 * Update an existing bonus amount
 */
export async function apiUpdateBonusAmount(data: Partial<CreateBonusAmountRequest>, id: string) {
  return ApiService.fetchDataWithAxios<BonusAmount, any>({
    url: `/settings/bonus_amount/${id}`,
    method: 'put',
    data,
  });
}

/**
 * Delete a bonus amount
 */
export async function apiDeleteBonusAmount(id: string) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/settings/bonus_amount/${id}`,
    method: 'delete',
  });
}

/**
 * Delete multiple bonus amounts
 */
export async function apiDeleteBonusAmounts(ids: string[]) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/settings/bonus_amount`,
    method: 'delete',
    data: { ids },
  });
}
