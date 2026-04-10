import { GET_ALL_PAYMENT_TERMS_URL } from '@/constants/api.constant';
import ApiService from '../ApiService';

export interface PaymentTerm {
  _id: string;
  type: string;
  name: string;
  info: {
    type: string;
    info: {
      months: number;
      description: string;
    };
  };
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface GetAllPaymentTermsResponse {
  data: PaymentTerm[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface CreatePaymentTermRequest {
  type: string;
  name: string;
  info: {
    months: number;
    description: string;
  };
}

/**
 * Get all payment terms
 */
export async function apiGetPaymentTerms(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<GetAllPaymentTermsResponse>({
    url: GET_ALL_PAYMENT_TERMS_URL,
    method: 'get',
    params,
  });
}

/**
 * Get a specific payment term by ID
 */
export async function apiGetPaymentTerm(id: string) {
  return ApiService.fetchDataWithAxios<PaymentTerm>({
    url: `${GET_ALL_PAYMENT_TERMS_URL}/${id}`,
    method: 'get',
  });
}

/**
 * Create a new payment term
 */
export async function apiCreatePaymentTerm(data: CreatePaymentTermRequest) {
  return ApiService.fetchDataWithAxios<PaymentTerm, any>({
    url: GET_ALL_PAYMENT_TERMS_URL,
    method: 'post',
    data,
  });
}

/**
 * Update an existing payment term
 */
export async function apiUpdatePaymentTerm(data: Partial<CreatePaymentTermRequest>, id: string) {
  return ApiService.fetchDataWithAxios<PaymentTerm, any>({
    url: `${GET_ALL_PAYMENT_TERMS_URL}/${id}`,
    method: 'put',
    data,
  });
}

/**
 * Delete a payment term
 */
export async function apiDeletePaymentTerm(id: string) {
  return ApiService.fetchDataWithAxios<void>({
    url: `${GET_ALL_PAYMENT_TERMS_URL}/${id}`,
    method: 'delete',
  });
}

/**
 * Delete multiple payment terms
 */
export async function apiDeletePaymentTerms(ids: string[]) {
  return ApiService.fetchDataWithAxios<void>({
    url: GET_ALL_PAYMENT_TERMS_URL,
    method: 'delete',
    data: { ids },
  });
}
