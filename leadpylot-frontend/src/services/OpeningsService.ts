import ApiService from './ApiService';
import type { Agent, BonusAmount, Lead, PaymentTerms, Project } from './LeadsService';
import type { Bank } from './SettingsService';

export type OpeningFileType = 'contract' | 'id' | 'extra' | 'sign';

export interface CreateOpeningRequest {
  offer_id: string;
  files?: File[];
  documentTypes?: OpeningFileType[];
}

// New flexible interface for the enhanced API
export interface CreateOpeningFlexibleRequest {
  offer_id: string;
  files: File[];
  documentType?: OpeningFileType; // Optional, default: "extra", applies to all files
  documentTypes?: OpeningFileType[]; // Optional, overrides documentType, per-file types
}

// Interface for creating openings without documents
export interface CreateOpeningWithoutFilesRequest {
  offer_id: string;
  documentType?: OpeningFileType; // Optional, default: "extra"
}

export interface CreateOpeningResponse {
  _id: string;
  offer_id: {
    _id: string;
    name: string;
  };
  creator_id: {
    _id: string;
    name: string;
  };
  files: [
    {
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
    },
  ];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const apiCreateOpening = async (
  data: CreateOpeningRequest
): Promise<CreateOpeningResponse> => {
  const formData = new FormData();

  formData.append('offer_id', data.offer_id);

  if (data.files) {
    data.files.forEach((file) => {
      formData.append('files', file);
    });
  }

  formData.append('documentTypes', JSON.stringify(data.documentTypes));

  return ApiService.fetchDataWithAxios<CreateOpeningResponse>({
    url: '/openings',
    method: 'post',
    data: formData as unknown as Record<string, unknown>,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Enhanced API function that supports both documentType (singular) and documentTypes (plural)
 * Based on the latest API documentation
 */
export const apiCreateOpeningFlexible = async (
  data: CreateOpeningFlexibleRequest
): Promise<CreateOpeningResponse> => {
  const formData = new FormData();

  // Add offer_id
  formData.append('offer_id', data.offer_id);

  // Add files
  data.files.forEach((file) => {
    formData.append('files', file);
  });

  // Handle document types according to API specification
  if (data.documentTypes && data.documentTypes.length > 0) {
    // Use documentTypes (plural) - overrides documentType
    formData.append('documentTypes', JSON.stringify(data.documentTypes));
  } else if (data.documentType) {
    // Use documentType (singular) - applies to all files
    formData.append('documentType', data.documentType);
  }
  // If neither is provided, API will use default "extra"

  return ApiService.fetchDataWithAxios<CreateOpeningResponse>({
    url: '/openings',
    method: 'post',
    data: formData as unknown as Record<string, unknown>,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * API function to create openings without files
 * Based on the existing API structure
 */
export const apiCreateOpeningWithoutFiles = async (
  data: CreateOpeningWithoutFilesRequest
): Promise<CreateOpeningResponse> => {
  return ApiService.fetchDataWithAxios<CreateOpeningResponse>({
    url: '/openings',
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });
};

export interface Document {
  _id: string;
  filetype: string;
  filename: string;
  path: string;
  size: number;
  type: string;
  createdAt: string;
}

export interface FileEntry {
  _id: string;
  document: Document;
}

export interface Offer {
  _id: string;
  name: string;
  description: string;
}

export interface Creator {
  _id: string;
  name: string;
  email: string;
}
export interface Offer2 {
  _id: string;
  title: string;
  project_id: Project;
  agent_id: Agent;
  bank_id: Bank;
  investment_volume: number;
  interest_rate: number;
  payment_terms: PaymentTerms;
  bonus_amount: BonusAmount;
  status: string;
  createdAt: string;
  updatedAt: string;
  files: any[];
  id: string;
}
export interface Opening {
  title?: string;
  filesCount?: number;
  _id: string;
  // offer_id: Offer;
  creator_id: Creator;
  files: FileEntry[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lead?: Lead;
  offer?: Offer2;
  leadId?: string;
}

export interface OpeningsResponse {
  data: Opening[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface GetOpeningsParams {
  page?: number;
  limit?: number;
  offer_id?: string;
  showInactive?: boolean;
  search?: string;
}

export interface UpdateOpeningRequest {
  offer_id?: string;
  files?: File[];
  documentType?: OpeningFileType;
  documentTypes?: OpeningFileType[];
}

export interface UpdateOpeningResponse {
  _id: string;
  offer_id: {
    _id: string;
    name: string;
  };
  creator_id: {
    _id: string;
    name: string;
  };
  files: FileEntry[];
  active: boolean;
  updatedAt: string;
}

export const apiGetOpenings = (params?: GetOpeningsParams) => {
  return ApiService.fetchDataWithAxios<OpeningsResponse>({
    url: '/openings',
    method: 'get',
    params,
  });
};

export const apiGetOpening = (id: string) => {
  return ApiService.fetchDataWithAxios<Opening>({
    url: `/openings/${id}`,
    method: 'get',
  });
};

export interface DeleteOpeningResponse {
  message: string;
  opening: {
    _id: string;
    active: boolean;
  };
}

export const apiDeleteOpening = (id: string) => {
  return ApiService.fetchDataWithAxios<DeleteOpeningResponse>({
    url: `/openings/${id}`,
    method: 'delete',
  });
};

export const apiUpdateOpening = async (
  id: string,
  data: UpdateOpeningRequest
): Promise<UpdateOpeningResponse> => {
  const formData = new FormData();
  console.log('data-id', data, id);
  // Add offer_id if provided
  if (data.offer_id) {
    formData.append('offer_id', data.offer_id);
  }

  // Add files if provided
  if (data.files && data.files.length > 0) {
    data.files.forEach((file) => {
      formData.append('files', file);
    });

    // Handle document types according to API specification
    if (data.documentTypes && data.documentTypes.length > 0) {
      // Use documentTypes (plural) - overrides documentType
      formData.append('documentTypes', JSON.stringify(data.documentTypes));
    } else if (data.documentType) {
      // Use documentType (singular) - applies to all files
      formData.append('documentType', data.documentType);
    }
  }

  // Log the formData contents for debugging
  console.log('FormData entries:');
  for (const [key, value] of formData.entries()) {
    console.log(key, value);
  }

  console.log('About to make API call to:', `/openings/${id}`);

  try {
    const response = await ApiService.fetchDataWithAxios<UpdateOpeningResponse>({
      url: `/openings/${id}`,
      method: 'put',
      data: formData as unknown as Record<string, unknown>,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('API call successful:', response);
    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};
