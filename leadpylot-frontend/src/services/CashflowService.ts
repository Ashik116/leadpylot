/**
 * Cashflow Service
 * API service for cashflow management - tracks money movement between banks
 */

import ApiService from './ApiService';

// =============================================================================
// TYPES
// =============================================================================

export interface Bank {
  _id: string;
  name: string;
  nickName?: string;
  type?: string;
  is_frozen?: boolean;
  frozen_at?: string;
  frozen_by?: {
    _id: string;
    login: string;
    name?: string;
  };
  frozen_reason?: string;
  unfrozen_at?: string;
  unfrozen_by?: {
    _id: string;
    login: string;
    name?: string;
  };
}

export interface CashflowTransaction {
  _id: string;
  cashflow_entry_id: string;
  bank_id: Bank;
  counterparty_bank_id: Bank;
  direction: 'incoming' | 'outgoing';
  paired_transaction_id?: string;
  reverses_transaction_id?: string;
  transaction_type: 'transfer' | 'deposit' | 'withdrawal' | 'bounce' | 'refund';
  amount: number;
  currency: string;
  fees: number;
  net_amount: number;
  status: 'sent' | 'received';
  documents: string[];
  created_at: string;
  created_by: {
    _id: string;
    login: string;
    name?: string;
  };
  received_at?: string;
  received_by?: {
    _id: string;
    login: string;
    name?: string;
  };
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  _id: string;
  contact_name?: string;
  email_from?: string;
  phone?: string;
  lead_source_no?: string;
  status?: string;
  source_id?: {
    _id: string;
    name: string;
    price?: number;
    active?: boolean;
  };
}

export interface Project {
  _id: string;
  name: string;
  color_code?: string;
}

export interface Agent {
  _id: string;
  login: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  color_code?: string;
}

export interface BankWithProvider extends Bank {
  provider?: {
    _id: string;
    name?: string;
    login?: string;
  };
}

export interface OfferSummary {
  _id: string;
  title: string;
  reference_no?: string;
  investment_volume: number;
  interest_rate?: number;
  current_stage?: string;
  status?: string;
  active?: boolean;
  createdAt?: string;
  // Populated relations
  lead_id?: Lead;
  project_id?: Project;
  agent_id?: Agent;
  bank_id?: BankWithProvider;
  bonus_amount?: {
    _id: string;
    name: string;
    info?: any;
  };
  payment_terms?: {
    _id: string;
    name: string;
    info?: any;
  };
}

export interface CashflowEntry {
  _id: string;
  offer_id: OfferSummary;
  initial_bank_id: Bank;
  current_bank_id: Bank;
  amount: number;
  currency: string;
  status: 'active' | 'completed' | 'cancelled';
  entered_at: string;
  entered_by: {
    _id: string;
    login: string;
    name?: string;
  };
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  transactions?: CashflowTransaction[];
}

export interface BankSummary {
  bank_id: string;
  bank_name: string;
  bank_type?: string;
  summary: {
    total_incoming_received: number;
    incoming_received_count: number;
    total_incoming_pending: number;
    incoming_pending_count: number;
    total_outgoing: number;
    outgoing_count: number;
    total_bounces: number;
    bounces_count: number;
    total_refunds: number;
    refunds_count: number;
    current_balance: number;
    usable_balance: number;
    is_frozen: boolean;
    frozen_reason?: string;
  };
  recent_transactions?: CashflowTransaction[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// API Response Types
export interface CashflowEntriesResponse {
  success: boolean;
  data: CashflowEntry[];
  pagination: Pagination;
}

export interface CashflowEntryResponse {
  success: boolean;
  data: CashflowEntry;
}

export interface BankSummariesResponse {
  success: boolean;
  data: BankSummary[];
  count: number;
}

export interface BankTransactionsResponse {
  success: boolean;
  bank_id: string;
  perspective: 'incoming' | 'outgoing';
  data: CashflowTransaction[];
  pagination: Pagination;
}

export interface BanksListResponse {
  success: boolean;
  data: Bank[];
  count: number;
}

export interface CreateTransactionRequest {
  from_bank_id: string;
  to_bank_id: string;
  amount: number;
  currency?: string;
  fees?: number;
  notes?: string;
}

export interface CreateTransactionResponse {
  success: boolean;
  message: string;
  data: CashflowTransaction;
}

export interface CreateBankTransferRequest {
  from_bank_id: string;
  to_bank_id: string;
  amount: number;
  currency?: string;
  fees?: number;
  transaction_reference?: string;
  notes?: string;
}

export interface CreateBankTransferResponse {
  success: boolean;
  message: string;
  data: CashflowTransaction;
}

export interface CreateBounceRequest {
  amount?: number;
  fees?: number;
  notes?: string;
}

export interface CreateRefundRequest {
  amount?: number;
  fees?: number;
  notes?: string;
}

export interface FreezeRequest {
  reason: string;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get all cashflow entries with pagination
 * Supports domain filtering for grouped views
 */
export const getCashflowEntries = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  bank_id?: string;
  domain?: string; // JSON stringified domain filters
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<CashflowEntriesResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.bank_id) queryParams.append('bank_id', params.bank_id);
  if (params?.domain) queryParams.append('domain', params.domain);
  if (params?.sortBy) queryParams.append('sortField', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const query = queryParams.toString();
  const url = `/cashflow${query ? `?${query}` : ''}`;
  return ApiService.fetchDataWithAxios<CashflowEntriesResponse>({ url, method: 'get' });
};

/**
 * Get a single cashflow entry with all transactions
 */
export const getCashflowEntry = async (entryId: string): Promise<CashflowEntryResponse> => {
  return ApiService.fetchDataWithAxios<CashflowEntryResponse>({
    url: `/cashflow/${entryId}`,
    method: 'get',
  });
};

/**
 * Get cashflow entry by offer ID
 */
export const getCashflowEntryByOffer = async (
  offerId: string
): Promise<CashflowEntryResponse> => {
  return ApiService.fetchDataWithAxios<CashflowEntryResponse>({
    url: `/cashflow/offer/${offerId}`,
    method: 'get',
  });
};

/**
 * Get all bank summaries
 */
export const getBankSummaries = async (): Promise<BankSummariesResponse> => {
  return ApiService.fetchDataWithAxios<BankSummariesResponse>({
    url: '/cashflow/banks/summaries',
    method: 'get',
  });
};

/**
 * Get single bank summary
 */
export const getBankSummary = async (bankId: string): Promise<{ success: boolean; data: BankSummary }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; data: BankSummary }>({
    url: `/cashflow/bank/${bankId}/summary`,
    method: 'get',
  });
};

/**
 * Get bank transactions (incoming or outgoing)
 */
export const getBankTransactions = async (
  bankId: string,
  perspective: 'incoming' | 'outgoing',
  params?: { page?: number; limit?: number }
): Promise<BankTransactionsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const query = queryParams.toString();
  const url = `/cashflow/bank/${bankId}/${perspective}${query ? `?${query}` : ''}`;
  return ApiService.fetchDataWithAxios<BankTransactionsResponse>({ url, method: 'get' });
};

/**
 * Get all banks for dropdowns
 */
export const getBanks = async (): Promise<BanksListResponse> => {
  return ApiService.fetchDataWithAxios<BanksListResponse>({
    url: '/cashflow/banks',
    method: 'get',
  });
};

/**
 * Create a new transfer transaction (tied to an entry)
 */
export const createTransaction = async (
  entryId: string,
  data: CreateTransactionRequest
): Promise<CreateTransactionResponse> => {
  return ApiService.fetchDataWithAxios<CreateTransactionResponse>({
    url: `/cashflow/${entryId}/transaction`,
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });
};

/**
 * Create a general bank transfer (not tied to an entry)
 * This transfers custom amount based on total bank balances
 */
export const createBankTransfer = async (
  data: CreateBankTransferRequest
): Promise<CreateBankTransferResponse> => {
  return ApiService.fetchDataWithAxios<CreateBankTransferResponse>({
    url: '/cashflow/transfer',
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });
};

/**
 * Mark transaction as received
 */
export const markTransactionReceived = async (
  transactionId: string,
  notes?: string
): Promise<{ success: boolean; message: string; data: CashflowTransaction }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string; data: CashflowTransaction }>({
    url: `/cashflow/transaction/${transactionId}/receive`,
    method: 'post',
    data: { notes },
  });
};

/**
 * Get a single transaction
 */
export const getTransaction = async (
  transactionId: string
): Promise<{ success: boolean; data: CashflowTransaction }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; data: CashflowTransaction }>({
    url: `/cashflow/transaction/${transactionId}`,
    method: 'get',
  });
};

/**
 * Create a bounce transaction (bank returned payment to customer)
 */
export const createBounceTransaction = async (
  transactionId: string,
  data: CreateBounceRequest
): Promise<{ success: boolean; message: string; data: CashflowTransaction }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string; data: CashflowTransaction }>({
    url: `/cashflow/transaction/${transactionId}/bounce`,
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });
};

/**
 * Create a refund transaction (return money to customer)
 */
export const createRefundTransaction = async (
  transactionId: string,
  data: CreateRefundRequest
): Promise<{ success: boolean; message: string; data: CashflowTransaction }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string; data: CashflowTransaction }>({
    url: `/cashflow/transaction/${transactionId}/refund`,
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });
};

/**
 * Freeze a bank account (entire account frozen)
 */
export const freezeBank = async (
  bankId: string,
  data: FreezeRequest
): Promise<{ success: boolean; message: string; data: Bank }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string; data: Bank }>({
    url: `/cashflow/bank/${bankId}/freeze`,
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });
};

/**
 * Unfreeze a bank account
 */
export const unfreezeBank = async (
  bankId: string
): Promise<{ success: boolean; message: string; data: Bank }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string; data: Bank }>({
    url: `/cashflow/bank/${bankId}/unfreeze`,
    method: 'post',
  });
};

// Response type for all transactions
export interface AllTransactionsResponse {
  success: boolean;
  data: CashflowTransaction[];
  pagination: Pagination;
}

/**
 * Get all transactions with filters and pagination
 * Supports domain filtering for grouped views
 */
export const getAllTransactions = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  direction?: 'incoming' | 'outgoing';
  transaction_type?: string;
  bank_id?: string;
  cashflow_entry_id?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  domain?: string; // JSON stringified domain filters for grouped view
}): Promise<AllTransactionsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.direction) queryParams.append('direction', params.direction);
  if (params?.transaction_type) queryParams.append('transaction_type', params.transaction_type);
  if (params?.bank_id) queryParams.append('bank_id', params.bank_id);
  if (params?.cashflow_entry_id) queryParams.append('cashflow_entry_id', params.cashflow_entry_id);
  if (params?.sortField) queryParams.append('sortField', params.sortField);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  if (params?.domain) queryParams.append('domain', params.domain);

  const query = queryParams.toString();
  const url = `/cashflow/transactions${query ? `?${query}` : ''}`;
  return ApiService.fetchDataWithAxios<AllTransactionsResponse>({ url, method: 'get' });
};

const CashflowService = {
  getCashflowEntries,
  getCashflowEntry,
  getCashflowEntryByOffer,
  getBankSummaries,
  getBankSummary,
  getBankTransactions,
  getBanks,
  createTransaction,
  createBankTransfer,
  markTransactionReceived,
  getTransaction,
  getAllTransactions,
  createBounceTransaction,
  createRefundTransaction,
  freezeBank,
  unfreezeBank,
};

export default CashflowService;
