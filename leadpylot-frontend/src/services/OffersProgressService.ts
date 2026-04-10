import { TDashboardType } from '@/app/(protected-pages)/dashboards/_components/dashboardTypes';
import ApiService from './ApiService';

export interface GetOffersProgressParams {
  has_progress?: TDashboardType | 'all';
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  domain?: string;
  includeAll?: string;
  // For all progress query
  opening_page?: number;
  opening_limit?: number;
  confirmation_page?: number;
  confirmation_limit?: number;
  payment_page?: number;
  payment_limit?: number;
  netto1_page?: number;
  netto1_limit?: number;
  netto2_page?: number;
  netto2_limit?: number;
  lost_page?: number;
  lost_limit?: number;
}

export interface OfferWithProgress {
  _id: string;
  title: string;
  nametitle?: string;
  project_id?: {
    _id: string;
    name: string;
  };
  lead_id?: {
    _id: string;
    lead_source_no?: string;
    contact_name?: string;
    email_from?: string;
    phone?: string;
    source_id?: {
      _id: string;
      name: string;
      price?: number;
      active?: boolean;
    };
    stage?: string;
    status?: string;
  };
  agent_id?: {
    _id: string;
    login?: string;
    role?: string;
  };
  created_by?: string;
  bank_id?: {
    _id: string;
    bank_id?: string | null;
    name: string;
  };
  investment_volume?: string | number;
  interest_rate?: number;
  payment_terms?: {
    _id: string;
    name: string;
    info?: {
      type?: string;
      info?: {
        months?: number;
        description?: string;
      };
    };
  };
  bonus_amount?: {
    _id: string;
    name: string;
    info?: {
      amount?: number;
      code?: string;
    };
  };
  status?: string;
  offerType?: string;
  flex_option?: boolean;
  active?: boolean;
  scheduled_date?: string;
  scheduled_time?: string;
  handover_notes?: string | null;
  pending_transfer?: {
    target_agent_id?: string;
    transfer_notes?: string;
    scheduled_date?: string;
    scheduled_time?: string;
    status?: string;
    created_at?: string;
  };
  files?: Array<{
    _id: string;
    filename: string;
    filetype: string;
    size: number;
    type: string;
    assigned_at?: string;
    source?: string;
  }>;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  handover_metadata?: {
    original_agent_id?: string;
    handover_at?: string;
    handover_reason?: string;
  };
  has_opening?: boolean;
  has_confirmation?: boolean;
  has_payment_voucher?: boolean;
  has_netto1?: boolean;
  has_netto2?: boolean;
  current_stage?: string;
  opening_count?: number;
  confirmation_count?: number;
  payment_voucher_count?: number;
  netto1_count?: number;
  netto2_count?: number;
  lead_status?: string;
  lead_stage?: string;
  availableReverts?: string[]; // Array of stage strings like ["netto2", "confirmation", "opening"]
  // Netto-specific fields (for netto2 and netto tables)
  agentRate?: number;
  bankerRate?: number;
  agentShare?: number;
  bankShare?: number;
  revenue?: number;
  visibleAmounts?: string[];
  calculationBase?: {
    investmentVolume?: number;
    bonusAmount?: number;
    baseAmount?: number;
    agentRate?: number;
    bankerRate?: number;
  };
  nettoStage?: string;
  [key: string]: any; // Allow additional fields for flexibility
}

export interface OffersProgressResponse {
  status: string;
  meta: {
    total: number;
    page: number;
    limit: number;
  };
  data: OfferWithProgress[];
}

export interface AllOffersProgressResponse {
  title: string;
  data: {
    opening: {
      title: string;
      data: OfferWithProgress[];
      meta: {
        total: number;
        page: number;
        limit: number;
        pages: number;
      };
    };
    confirmation: {
      title: string;
      data: OfferWithProgress[];
      meta: {
        total: number;
        page: number;
        limit: number;
        pages: number;
      };
    };
    payment: {
      title: string;
      data: OfferWithProgress[];
      meta: {
        total: number;
        page: number;
        limit: number;
        pages: number;
      };
    };
    netto1: {
      title: string;
      data: OfferWithProgress[];
      meta: {
        total: number;
        page: number;
        limit: number;
        pages: number;
      };
    };
    netto2: {
      title: string;
      data: OfferWithProgress[];
      meta: {
        total: number;
        page: number;
        limit: number;
        pages: number;
      };
    };
    netto?: {
      title: string;
      data: OfferWithProgress[];
      meta: {
        total: number;
        page: number;
        limit: number;
        pages: number;
      };
    };
    lost: {
      title: string;
      data: OfferWithProgress[];
      meta: {
        total: number;
        page: number;
        limit: number;
        pages: number;
      };
    };
  };
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const apiGetOffersProgress = async (
  params?: GetOffersProgressParams,
  signal?: AbortSignal
): Promise<OffersProgressResponse> => {
  // Debug: Build and log the API URL
  const urlParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          urlParams.set(key, JSON.stringify(value));
        } else {
          urlParams.set(key, String(value));
        }
      }
    });
  }
  // 'all' now returns the same flat structure as other progress types
  return ApiService.fetchDataWithAxios<OffersProgressResponse>({
    method: 'GET',
    url: '/offers/progress',
    params,
    signal, // Support request cancellation
    timeout: 60000, // 60s timeout for all progress types
  });
};

// Get all progress types in a grouped response (for multi-table view)
export const apiGetOffersProgressGrouped = async (
  params?: Omit<GetOffersProgressParams, 'has_progress'>,
  signal?: AbortSignal
): Promise<AllOffersProgressResponse> => {
  return ApiService.fetchDataWithAxios<AllOffersProgressResponse>({
    method: 'GET',
    url: '/offers/progress',
    params: {
      ...params,
      has_progress: 'all_grouped', // Use grouped response for multi-table view
    },
    signal,
    timeout: 30000, // 30s timeout for grouped query
  });
};

// Get single opening/offer by ID
export const apiGetOpeningById = async (
  openingId: string,
  signal?: AbortSignal
): Promise<OfferWithProgress> => {
  return ApiService.fetchDataWithAxios<OfferWithProgress>({
    method: 'GET',
    url: `/offers/${openingId}`,
    signal,
    timeout: 30000,
  });
};

// force push

// Revert Import API
export async function apiOfferRevertImport(objectId: string, params?: any) {
  return ApiService.fetchDataWithAxios<any>({
    url: `/offers/import/${objectId}/revert`,
    method: 'POST',
    data: params ?? undefined,
  });
}

// Get Revert Options API
export async function apiGetRevertOptions(offerId: string) {
  return ApiService.fetchDataWithAxios<{
    success: boolean;
    data: {
      offerId: string;
      availableReverts: Array<{
        stage: string;
        displayName: string;
        recordCount: number;
        canRevert: boolean;
      }>;
      currentStatus: string;
    };
  }>({
    url: `/offers/${offerId}/revert-options`,
    method: 'GET',
  });
}

// Revert Options API
export async function apiGetRevert(offerId: string, params: string) {
  return ApiService.fetchDataWithAxios<any>({
    url: `/offers/${offerId}/revert/${params}`,
    method: 'POST',
  });
}

// Revert Batch API
export interface RevertBatchRequest {
  stages: string[];
  reason?: string;
  [key: string]: unknown; // Add index signature for compatibility
}

export async function apiRevertBatch(offerId: string, data: RevertBatchRequest) {
  return ApiService.fetchDataWithAxios<any>({
    url: `/offers/${offerId}/revert-batch`,
    method: 'POST',
    data,
  });
}
