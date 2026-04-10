import ApiService from './ApiService';

export interface OfferDocument {
  _id: string;
  filename: string;
  filetype: string;
  size: number;
  type: string;
  assigned_at: string;
  source: string;
}

export interface UploadOfferDocumentsPayload {
  files: File[];
  documentTypes: string[];
}

export interface UploadOfferDocumentsResponse {
  success: boolean;
  message: string;
  documents: OfferDocument[];
}

/**
 * Upload documents to a specific offer
 */
export const uploadOfferDocuments = async (
  offerId: string,
  files: File[],
  documentType: string
): Promise<UploadOfferDocumentsResponse> => {
  const formData = new FormData();

  // Add files to form data
  files.forEach((file) => {
    formData.append('files', file);
  });

  // Add document type
  formData.append('documentTypes', documentType);

  return ApiService.fetchDataWithAxios<UploadOfferDocumentsResponse, FormData>({
    method: 'POST',
    url: `/offers/${offerId}/documents`,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Delete a document from a specific offer
 */
export const deleteOfferDocument = async (
  offerId: string,
  documentId: string
): Promise<{ success: boolean; message: string }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
    method: 'DELETE',
    url: `/offers/${offerId}/documents/${documentId}`,
  });
};

/**
 * Get documents for a specific offer (from offer.files array)
 */
export const getOfferDocuments = async (offerId: string): Promise<OfferDocument[]> => {
  const response = await ApiService.fetchDataWithAxios<{ files: OfferDocument[] }>({
    method: 'GET',
    url: `/offers/${offerId}`,
  });

  return response.files || [];
};

/**
 * Customer payment record
 */
export interface CustomerPayment {
  amount: number;
  payment_date?: string;
  payment_method?: 'bank_transfer' | 'cash' | 'check' | 'other';
  reference?: string;
  notes?: string;
  recorded_by?: string;
  created_at?: string;
}

/**
 * Agent commission details
 */
export interface AgentCommission {
  agent_id?: string;
  percentage: number;
  expected_amount: number;
  actual_amount: number;
  paid_amount: number;
  is_overridden?: boolean;
  original_percentage?: number;
  reason?: string;
  added_at?: string;
  added_by?: string;
}

/**
 * Financial data interface - matches backend Offer.financials structure
 * Admin receives full data, Agent receives filtered data
 */
export interface OfferFinancials {
  _id?: string;

  // Core investment data (Admin only)
  investment_total?: number;
  bonus_value?: number;
  expected_from_customer?: number;

  // Customer payments (Admin only)
  customer_payments?: CustomerPayment[];

  // Payment summary (Admin only - full details)
  payment_summary?: {
    total_received: number;
    outstanding: number;
    payment_status: 'pending' | 'partial' | 'complete' | 'overpaid';
    payment_count: number;
    last_payment_date?: string;
  };

  // Bank commission (Admin only)
  bank_commission?: {
    percentage: number;
    expected_amount: number;
    actual_amount: number;
    is_overridden?: boolean;
    original_percentage?: number;
  };

  // Primary agent commission (Admin only)
  primary_agent_commission?: AgentCommission;

  // Split agents (Admin only)
  split_agents?: AgentCommission[];

  // Inbound agents (Admin only)
  inbound_agents?: AgentCommission[];

  // Net amounts (Admin only)
  net_amounts?: {
    after_bank_commission: number;
    after_all_commissions: number;
    company_revenue: number;
    expected_after_bank: number;
    expected_after_all: number;
    expected_company_revenue: number;
  };

  // Validation (Admin only)
  validation?: {
    total_percentage: number;
    is_valid: boolean;
    warnings: string[];
  };

  // Metadata
  financials_initialized?: boolean;
  last_calculated_at?: string;

  // ========================================
  // AGENT-SPECIFIC FIELDS (when not admin)
  // ========================================

  // Customer payment summary for agent
  total_customer_received?: number;
  payment_status?: 'pending' | 'partial' | 'complete' | 'overpaid';

  // Agent's own commission data
  my_commission?: {
    type: 'primary' | 'split' | 'inbound';
    percentage: number;
    expected_amount: number;
    actual_amount: number;
    paid_amount: number;
  };

  // Message when no commission available
  message?: string;

  [key: string]: any; // Allow additional fields
}

/**
 * Get financial data for a specific offer
 */
export const getOfferFinancials = async (
  offerId: string,
  signal?: AbortSignal
): Promise<OfferFinancials> => {
  return ApiService.fetchDataWithAxios<OfferFinancials>({
    method: 'GET',
    url: `/offers/${offerId}/financials`,
    signal,
    timeout: 30000,
  });
};

export interface CreateOfferPaymentRequest {
  amount: number;
  payment_method?: 'bank_transfer' | 'cash' | 'check' | 'other';
  payment_date?: string;
  reference?: string;
  notes?: string;
}

export interface CreateOfferPaymentResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    amount: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Create a payment for a specific offer
 * POST /offers/:offerId/financials/payments
 */
export const apiCreateOfferPayment = async (
  offerId: string,
  data: CreateOfferPaymentRequest
): Promise<CreateOfferPaymentResponse> => {
  return ApiService.fetchDataWithAxios<CreateOfferPaymentResponse, CreateOfferPaymentRequest>({
    method: 'POST',
    url: `/offers/${offerId}/financials/payments`,
    data, // JSON object payload, NOT FormData
  });
};

/**
 * Update primary agent commission percentage
 * PUT /offers/:offerId/financials/primary-agent/percentage
 */
export const apiUpdatePrimaryAgentPercentage = async (
  offerId: string,
  percentage: number
): Promise<any> => {
  return ApiService.fetchDataWithAxios<any>({
    method: 'PUT',
    url: `/offers/${offerId}/financials/primary-agent/percentage`,
    data: { percentage },
  });
};

/**
 * Update bank commission percentage
 * PUT /offers/:offerId/financials/bank/percentage
 */
export const apiUpdateBankPercentage = async (
  offerId: string,
  percentage: number
): Promise<any> => {
  return ApiService.fetchDataWithAxios<any>({
    method: 'PUT',
    url: `/offers/${offerId}/financials/bank/percentage`,
    data: { percentage },
  });
};

/**
 * Update an existing customer payment
 * PUT /offers/:offerId/financials/payments/:paymentId
 */
export const apiUpdateOfferPayment = async (
  offerId: string,
  paymentId: string,
  data: Partial<CreateOfferPaymentRequest>
): Promise<any> => {
  return ApiService.fetchDataWithAxios<any>({
    method: 'PUT',
    url: `/offers/${offerId}/financials/payments/${paymentId}`,
    data,
  });
};

/**
 * Delete a customer payment
 * DELETE /offers/:offerId/financials/payments/:paymentId
 */
export const apiDeleteOfferPayment = async (offerId: string, paymentId: string): Promise<any> => {
  return ApiService.fetchDataWithAxios<any>({
    method: 'DELETE',
    url: `/offers/${offerId}/financials/payments/${paymentId}`,
  });
};

/**
 * Move offers to out status
 * POST /offers/out
 */
export interface MoveOffersOutRequest {
  ids: string[];
}

export interface MoveOffersOutResponse {
  success: boolean;
  message: string;
  data?: {
    updated: number;
    offerIds?: string[];
  };
}

export const apiMoveOffersOut = async (ids: string[]): Promise<MoveOffersOutResponse> => {
  return ApiService.fetchDataWithAxios<MoveOffersOutResponse, { ids: string[] }>({
    method: 'PUT',
    url: '/offers/out',
    data: { ids }, // Backend expects { ids: ["id1", "id2"] }
  });
};

/**
 * Revert offers from 'out' stage back to 'offer' stage
 * PUT /offers/revert-from-out
 */
export const apiRevertOffersFromOut = async (ids: string[]): Promise<MoveOffersOutResponse> => {
  return ApiService.fetchDataWithAxios<MoveOffersOutResponse, { ids: string[] }>({
    method: 'PUT',
    url: '/offers/revert-from-out',
    data: { ids }, // Backend expects { ids: ["id1", "id2"] }
  });
};

/**
 * Add split agent to offer financials
 * POST /offers/:offerId/financials/split-agents
 */
export interface AddSplitAgentRequest {
  agent_id: string;
  percentage: number;
  reason?: string;
}

export interface AddInboundAgentRequest {
  agent_id: string;
  percentage: number;
  reason?: string;
}

export interface UpdateAgentPercentageRequest {
  agent_type: 'split' | 'inbound';
  percentage: number;
}

export const apiAddSplitAgent = async (
  offerId: string,
  data: AddSplitAgentRequest
): Promise<any> => {
  return ApiService.fetchDataWithAxios<any, AddSplitAgentRequest>({
    method: 'POST',
    url: `/offers/${offerId}/financials/split-agents`,
    data,
  });
};

/**
 * Delete split agent from offer financials
 * DELETE /offers/:offerId/financials/split-agents/:agentId
 */
export const apiDeleteSplitAgent = async (
  offerId: string,
  agentId: string
): Promise<any> => {
  return ApiService.fetchDataWithAxios<any>({
    method: 'DELETE',
    url: `/offers/${offerId}/financials/split-agents/${agentId}`,
  });
};

/**
 * Add inbound agent to offer financials
 * POST /offers/:offerId/financials/inbound-agents
 */
export const apiAddInboundAgent = async (
  offerId: string,
  data: AddInboundAgentRequest
): Promise<any> => {
  return ApiService.fetchDataWithAxios<any, AddInboundAgentRequest>({
    method: 'POST',
    url: `/offers/${offerId}/financials/inbound-agents`,
    data,
  });
};

/**
 * Delete inbound agent from offer financials
 * DELETE /offers/:offerId/financials/inbound-agents/:agentId
 */
export const apiDeleteInboundAgent = async (
  offerId: string,
  agentId: string
): Promise<any> => {
  return ApiService.fetchDataWithAxios<any>({
    method: 'DELETE',
    url: `/offers/${offerId}/financials/inbound-agents/${agentId}`,
  });
};

/**
 * Update split or inbound agent percentage
 * PUT /offers/:offerId/financials/:agentType/:agentId/percentage
 */
export const apiUpdateSplitInboundAgentPercentage = async (
  offerId: string,
  agentType: string,
  agentId: string,
  data: UpdateAgentPercentageRequest
): Promise<any> => {
  return ApiService.fetchDataWithAxios<any, UpdateAgentPercentageRequest>({
    method: 'PUT',
    url: `/offers/${offerId}/financials/${agentType}/${agentId}/percentage`,
    data,
  });
};

/**
 * Create agent payment (split or inbound agent)
 * POST /offers/:offerId/financials/agent-payments
 */
export interface CreateAgentPaymentRequest {
  agent_type: 'split' | 'inbound';
  agent_id: string;
  amount: number;
}

export const apiCreateAgentPayment = async (
  offerId: string,
  data: CreateAgentPaymentRequest
): Promise<any> => {
  return ApiService.fetchDataWithAxios<any, CreateAgentPaymentRequest>({
    method: 'POST',
    url: `/offers/${offerId}/financials/agent-payments`,
    data,
  });
};

/**
 * Get offers in 'out' stage
 * GET /offers?out=true
 */
