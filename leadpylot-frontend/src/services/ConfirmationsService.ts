import ApiService from './ApiService';

export interface Opening {
  _id: string
  files: File[]
  creator_id: {
    _id: string;
    name: string;
    email: string;
  }
  active: boolean
  createdAt: string
  updatedAt: string
}
export interface Confirmation {
  _id: string;
  opening?: Opening,
  opening_id: {
    _id: string;
    offer_id: {
      _id: string;
      title: string;
      investment_volume: number;
      interest_rate: number;
    };
    files: any[];
  };
  creator_id: {
    _id: string;
    name: string;
    email: string;
  };
  files: {
    _id: string;
    document: {
      _id: string;
      filetype: string;
      filename: string;
      path: string;
      size: number;
      type: string;
      createdAt: string;
    };
  }[];
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConfirmationRequest {
  offer_id: string;
  notes?: string;
  files?: File[];
  opening_id?: string;
}



export interface ConfirmationsResponse {
  data: Confirmation[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface SingleConfirmationResponse {
  data: Confirmation;
}

// Get confirmations
export async function apiGetConfirmations(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<ConfirmationsResponse>({
    url: '/confirmations',
    method: 'get',
    params,
  });
}

// Get single confirmation
export async function apiGetConfirmation(id: string) {
  return ApiService.fetchDataWithAxios<SingleConfirmationResponse>({
    url: `/confirmations/${id}`,
    method: 'get',
  });
}

// Create confirmation with files
export async function apiCreateConfirmation(data: CreateConfirmationRequest) {
  if (!data.offer_id) {
    throw new Error('offer_id is required');
  }
  return ApiService.fetchDataWithAxios({
    url: '/confirmations',
    method: 'post',
    data: { ...data, reference_no: data.notes?.trim() },
    // DON'T set Content-Type header - let axios handle it automatically
  });
}



// Update confirmation
export async function apiUpdateConfirmation(id: string, data: Partial<CreateConfirmationRequest>) {
  const formData = new FormData();

  if (data.opening_id) {
    formData.append('opening_id', data.opening_id);
  }

  if (data.notes !== undefined && data.notes.trim()) {
    formData.append('reference_no', data.notes.trim());
  }

  // Append files if provided
  if (data.files && data.files.length > 0) {
    data.files.forEach((file, index) => {
      if (!file || !(file instanceof File)) {
        throw new Error(`Invalid file at index ${index}`);
      }
      formData.append('files', file);
    });
  }

  return ApiService.fetchDataWithAxios<Confirmation, FormData>({
    url: `/confirmations/${id}`,
    method: 'put',
    data: formData,
    // DON'T set Content-Type header - let axios handle it automatically
  });
}

// Delete confirmation
export async function apiDeleteConfirmation(id: string) {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
    url: `/confirmations/${id}`,
    method: 'delete',
  });
}

// Test function to verify API endpoint is working
export async function apiTestConfirmationEndpoint() {
  console.log('Testing confirmation endpoint...');
  try {
    const response = await ApiService.fetchDataWithAxios<ConfirmationsResponse>({
      url: '/confirmations',
      method: 'get',
      params: { limit: 1 },
    });
    console.log('Confirmation endpoint test successful:', response);
    return response;
  } catch (error: any) {
    console.error('Confirmation endpoint test failed:', error);
    console.error('Error details:', {
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      message: error?.message,
    });
    throw error;
  }
}
