import { Appointment } from '@/hooks/useAppointments';
import { toDomainFiltersForApi } from '@/utils/filterUtils';
import ApiService from './ApiService';
import AxiosBase from './axios/AxiosBase';
import { Bank } from './SettingsService';

export interface Meta {
  total: number;
  page: number;
  limit: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface GetAllLeadsResponse {
  data: Lead[];
  meta: Meta;
  statistics?: {
    todos: {
      total_count: number;
      completed_count: number;
      assigned_count: number;
      pending_count: number;
    };
  };
}

export interface LeadsResponse {
  data: Lead[];
  meta: {
    total: number;
  };
}

export interface GetAllDeadsIdsResponse {
  leadIds: string[];
}

export interface AttachedProject {
  _id: string;
  name: string;
}

export interface AssignedAgent {
  _id: string;
  login: string;
  role: string;
  active: boolean;
  create_date: string;
  offers: Offer[];
}

export interface Offer {
  message: string;
  _id: string;
  title: string;
  nametitle?: string;
  reference_no?: string;
  project_id: TProject;
  bank_id?: Bank;
  lead_id: string;
  agent_id: TAgent;
  investment_volume: number;
  interest_rate: number;
  offerType: string;
  flex_option?: boolean;
  payment_terms: {
    _id: string;
    name: string;
    info: {
      type: string;
      info: {
        months: number;
        description: string;
      };
    };
    Month: any;
  };
  bonus_amount: {
    _id: string;
    name: string;
    info: {
      amount: number;
      code: string;
    };
    Amount: number;
  };
  status: string;
  current_stage?: string;
  created_at: string;
  updated_at: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  bank: Bank;
  opening?: Opening;
  scheduled_date?: string;
  scheduled_time?: string;
  handover_notes?: string;
  active?: boolean;
  files?: DocumentFile[];
}

export interface Opening {
  _id: string;
  offer_id: string;
  files: DocumentFile[];
  creator_id: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface DocumentFile {
  document: Document;
  _id: string;
}

export interface Document {
  _id: string;
  filetype: string;
  filename: string;
  path: string;
  size: number;
  type: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AssignLeadsRequest {
  leadIds: string[];
  projectId: string;
  agentId: string;
}

export interface AssignLeadsRequestTransform {
  leadIds: string[];
  toProjectId: string;
  toAgentUserId: string;
  notes: string;
  isFreshTransfer?: boolean;
  isRestore?: boolean;
}

export interface AssignLeadsResponse {
  success: boolean;
  message: string;
  assignedLeads: number;
}

export interface AppointmentDataInterface {
  _id: string;
  lead_id: string;
  created_by: {
    _id: string;
    login: string;
    role: string; // Extend roles if needed
  };
  appointment_date: string; // ISO string, e.g., "2025-10-09T00:00:00.000Z"
  appointment_time: string; // e.g., "14:30"
  title: string;
  description: string;
  location: string;
  status: string;
  reminder_sent: boolean;
  active: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  __v: number;
}

export interface Lead {
  nametitle?: string;
  data?: any;
  _id: string;
  agent?: any;
  todoCount?: number;
  id: number;
  use_status: string;
  usable: string;
  duplicate_status: string;
  checked: boolean;
  lead_source_no: string;
  system_id: any;
  contact_name: string;
  email_from: string;
  secondary_email?: string;
  phone: string;
  expected_revenue: number;
  lead_date: string;
  assigned_date: string;
  source_month: any;
  prev_month: any;
  current_month: any;
  source_team_id: any;
  source_user_id: any;
  prev_team_id: any;
  prev_user_id: any;
  team_id: any;
  user_id: any;
  instance_id: any;
  source_id: any;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  reclamation_status?: string;
  __v: number;
  stage: {
    id: string;
    name: string;
    isWonStage: boolean;
  };
  status: {
    id: string;
    name: string;
    code: string;
  };
  appointments?: AppointmentDataInterface[];
  assigned_agent: {
    _id: string;
    login: string;
    role: string;
    active: boolean;
    instance_status: string;
    instance_userid: any;
    anydesk: any;
    user_id: string;
  };
  project: {
    _id: string;
    name: string;
  };

  //   new added for recent imports
  file_name?: string;
  total?: number;
  success?: number;
  failed?: number;
  old_duplicate?: number;
  ten_week_duplicate?: number;
  new?: number;
  notes?: string;
}
export interface TLead {
  nametitle?: string;
  current_stage?: string;
  temporary_access?: boolean;
  is_lead_owner?: boolean;
  read_only?: boolean;
  _id: string;
  leadPrice?: string;
  offers?: Offer[];
  appointments?: Appointment[];
  id: number;
  todoCount?: number;
  use_status: string;
  usable: string;
  duplicate_status: string;
  checked: boolean;
  lead_source_no: string;
  system_id: any;
  contact_name: string;
  email_from: string;
  phone: string;
  secondary_email?: string;
  expected_revenue: number;
  lead_date: string;
  assigned_date: string;
  source_month: any;
  prev_month: any;
  current_month: any;
  source_team_id: any;
  reclamation_status: string;
  source_user_id: any;
  prev_team_id: any;
  prev_user_id: any;
  team_id: any;
  user_id: any;
  instance_id: any;
  source_id: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  stage: any;
  status: any;
  project: TProject[];
  assignedAt: string;
  notes?: string;
  offer_calls?: number;
  source_project?: TProject;
  source_agent?: TAgent;
  prev_project?: TProject;
  prev_agent?: TAgent;
}

export interface TProject {
  _id: string;
  name: string;
  agent: TAgent;
}

export interface Project {
  project: Project2;
  agent: Agent;
  assignedAt: string;
  name?: string;
}

export interface Project2 {
  _id: string;
  name: string;
}

export interface Agent {
  _id: string;
  agent_id?: string; // Added agent_id property to fix TypeScript error
  login: string;
  role: string;
  offer: Offer[];
  color_code?: string;
}
export interface TAgent {
  _id: string;
  agent_id?: string; // Added agent_id property to fix TypeScript error
  login: string;
  role: string;
  color_code?: string;
  offers: Offer[];
}
export interface Offer {
  _id: string;
  project_id: TProject;
  lead_id: string;
  agent_id: TAgent;
  investment_volume: number;
  interest_rate: number;
  payment_terms: PaymentTerms;
  bonus_amount: BonusAmount;
  status: string;
  current_stage?: string;
  created_at: string;
  updated_at: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  bank: Bank;
  opening?: Opening;
  scheduled_date?: string;
  scheduled_time?: string;
  handover_notes?: string;
  active?: boolean;
}

export interface PaymentTerms {
  _id: string;
  name: string;
  info: Info;
  Month: any;
}

export interface Info {
  type: string;
  info: Info2;
}

export interface Info2 {
  months: number;
  description: string;
}

export interface BonusAmount {
  _id: string;
  name: string;
  info: Info3;
  Amount: number;
}

export interface Info3 {
  amount: number;
  code: string;
}

export interface Opening {
  _id: string;
  offer_id: string;
  files: DocumentFile[];
  creator_id: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface DocumentFile {
  document: Document;
  _id: string;
}

export interface Document {
  _id: string;
  filetype: string;
  filename: string;
  path: string;
  size: number;
  type: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export async function apiGetLeads(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<GetAllLeadsResponse>({
    url: '/leads',
    method: 'get',
    params,
  });
}

/**
 * Fetch leads with domain filters (replaces POST /dynamic-filters/apply).
 * Uses GET /leads?domain=[...]&page=...&limit=...
 */
export async function apiGetLeadsWithDomain(params: {
  filters: Array<{ field: string; operator: string; value: any }>;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}): Promise<GetAllLeadsResponse> {
  const { filters, page = 1, limit = 50, sortBy, sortOrder } = params;
  const domain = toDomainFiltersForApi(filters);
  return apiGetLeads({
    domain: domain.length > 0 ? JSON.stringify(domain) : undefined,
    page,
    limit,
    includeAll: 'true',
    sortBy,
    sortOrder,
  });
}
export async function apiGetLeadIds() {
  return ApiService.fetchDataWithAxios<GetAllDeadsIdsResponse>({
    url: '/leads/ids',
    method: 'get',
  });
}

export async function apiGetLead(id: string) {
  return ApiService.fetchDataWithAxios<TLead>({
    url: `/leads/${id}`,
    method: 'get',
  });
}
// create lead
export async function apiCreateLeads(data: Partial<Lead>[]) {
  return ApiService.fetchDataWithAxios<Lead[]>({
    url: '/leads',
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });
}

export async function apiUpdateLead(id: string, data: Partial<Lead>) {
  return ApiService.fetchDataWithAxios<Lead>({
    url: `/leads/${id}`,
    method: 'put',
    data,
  });
}

export async function apiDeleteLead(id: string) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/leads/${id}`,
    method: 'delete',
  });
}

export interface UpdateSecondaryEmailRequest {
  secondary_email: string;
}

export async function apiUpdateSecondaryEmail(id: string, data: UpdateSecondaryEmailRequest) {
  return ApiService.fetchDataWithAxios<Lead>({
    url: `/leads/${id}/secondary-email`,
    method: 'put',
    data: data as unknown as Record<string, unknown>,
  });
}

export interface MakePrimaryEmailRequest {
  email: string;
}

export async function apiMakePrimaryEmail(id: string, data: MakePrimaryEmailRequest) {
  return ApiService.fetchDataWithAxios<Lead>({
    url: `/leads/${id}/make-primary-email`,
    method: 'put',
    data: data as unknown as Record<string, unknown>,
  });
}

export async function apiAssignLeads(data: AssignLeadsRequest) {
  return ApiService.fetchDataWithAxios<AssignLeadsResponse>({
    url: '/assign-leads',
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });
}
export async function apiAssignLeadsTransform(data: AssignLeadsRequestTransform) {
  return ApiService.fetchDataWithAxios<AssignLeadsResponse>({
    url: '/assign-leads/bulk-replace',
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });
}
export async function apiGetRecentImports(data: Import) {
  return ApiService.fetchDataWithAxios<AssignLeadsResponse>({
    url: '/leads/import',
    method: 'get',
    data: data as unknown as Record<string, unknown>,
  });
}

export interface ReclamationRequest extends Record<string, unknown> {
  reason: string;
  project_id?: string;
  agent_id?: string | number;
  leads?: (string | number)[];
}

export async function apiSubmitReclamation(data: ReclamationRequest) {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
    url: '/reclamations',
    method: 'post',
    data,
  });
}

export async function apiBulkDeleteLeads(ids: string[]) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/leads/`,
    method: 'delete',
    data: {
      ids,
    },
  });
}
export interface BulkUpdateLeadsRequest {
  ids: string[];
  updateData?: {
    stage?: string;
    status?: string;
    use_status?: string;
    checked?: boolean;
    usable?: string;
    [key: string]: any;
  };
}

export async function apiBulkUpdateLeads(data: BulkUpdateLeadsRequest) {
  // Handle legacy usage with usable property
  const updateData = data.updateData || {
    use_status: 'usable' in data ? ((data.usable as boolean) ? 'usable' : 'not usable') : undefined,
    checked: 'usable' in data ? true : undefined,
    usable: 'usable' in data ? ((data.usable as boolean) ? 'yes' : 'no') : undefined,
  };

  return ApiService.fetchDataWithAxios<void>({
    url: `/leads/bulk-update`,
    method: 'put',
    data: {
      leadIds: data.ids,
      updateData,
    },
  });
}

// New interface for bulk status update
export interface BulkUpdateLeadStatusRequest extends Record<string, unknown> {
  leadIds: string[];
  stage_name?: string;
  status_name?: string;
  stage_id?: string;
  status_id?: string;
}

export interface BulkUpdateLeadStatusResponse {
  status: string;
  message: string;
  data: {
    message: string;
    updated: Array<{
      _id: string;
      contact_name: string;
      stage: string;
      status: string;
    }>;
    failed: any[];
  };
}

export async function apiBulkUpdateLeadStatus(data: BulkUpdateLeadStatusRequest) {
  return ApiService.fetchDataWithAxios<BulkUpdateLeadStatusResponse>({
    url: `/leads/bulk-status-update`,
    method: 'put',
    data,
  });
}

export interface SubmitOfferRequest {
  project_id: string;
  lead_id: string;
  agent_id: string;
  investment_volume: number;
  interest_rate: number;
  payment_terms: string;
  bonus_amount: string;
  bank_id: string;
  offerType: string;
  nametitle?: string;
  reference_no?: string;
  // New scheduling and handover fields
  scheduled_date?: string;
  scheduled_time?: string;
  selected_agent_id?: string;
  notes?: string;
  load_and_opening?: string;
}

export interface SubmitOfferResponse {
  success: boolean;
  message: string;
  data: {
    offer: {
      id: string;
      investment_volume: number;
      interest_rate: number;
      payment_terms: string;
      bonus_amount: string;
      lead_id: string;
      project_id: string;
      created_at: string;
      load_and_opening?: string;
    };
  };
}

// API get offers interface
export interface GetOffersParams {
  status?: string;
  project_id?: string;
  lead_id?: string;
  agent_id?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  domain?: string;
  includeAll?: string;
}

export interface GetOffersResponse {
  data: OfferApiResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface OfferApiResponse {
  title: any;
  _id: string;
  nametitle?: string;
  reference_no?: string;
  offerType?: string;
  flex_option?: boolean;
  project_id: {
    _id: string;
    name: string;
  };
  lead_id: {
    _id: string;
    contact_name: string;
    email_from: string;
  };
  agent_id: {
    _id: string;
    login: string;
    role: string;
  };
  investment_volume: number;
  interest_rate: number;
  payment_terms: {
    _id: string;
    name: string;
    info: {
      description: string;
      months: number;
    };
  };
  bank_id: string;
  bonus_amount: {
    _id: string;
    name: string;
    info: {
      value: number;
      type: string;
    };
  };
  status: string;
  created_at: string;
  updated_at: string;
  files?: DocumentFile[];
}

export const apiGetOffers = async (params?: GetOffersParams): Promise<GetOffersResponse> => {
  return ApiService.fetchDataWithAxios<GetOffersResponse>({
    url: '/offers',
    method: 'GET',
    params: params as unknown as Record<string, unknown>,
  });
};

// Offer Tickets API - for Offer Tickets dashboard
export interface GetOfferTicketsParams {
  page?: number;
  limit?: number;
  search?: string;
  // Ticket status: pending (unassigned), in_progress (assigned), done (completed)
  ticket_status?: 'pending' | 'in_progress' | 'done';
  ownership?: 'for_me' | 'from_me' | 'all';
  project_id?: string;
  agent_id?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface OfferTicket {
  _id: string;
  message: string;
  isDone: boolean;
  priority: number;
  type: string;
  // Workflow status: pending (unassigned), in_progress (assigned), done (completed)
  ticket_status: 'pending' | 'in_progress' | 'done';
  createdAt: string;
  updatedAt: string;
  dateOfDone?: string;
  assignedAt?: string;
  creator?: {
    _id: string;
    login: string;
    role: string;
  };
  assignedTo?: {
    _id: string;
    login: string;
    role: string;
    color_code?: string;
  };
  assignedBy?: {
    _id: string;
    login: string;
    role: string;
  };
}

export interface OfferWithTicket {
  _id: string;
  title: string;
  investment_volume: string;
  investment_volume_raw: number;
  interest_rate: number;
  status: string;
  current_stage: string;
  createdAt: string;
  updatedAt: string;
  lead_id: {
    _id: string;
    lead_source_no: string;
    contact_name: string;
    email_from: string;
    phone: string;
    expected_revenue?: string;
  };
  project_id: {
    _id: string;
    name: string;
  };
  agent_id: {
    _id: string;
    login: string;
    role: string;
    color_code?: string;
  };
  bank_id?: {
    _id: string;
    name: string;
  };
  ticket: OfferTicket | null;
  allTickets: OfferTicket[];
  ticketCount: number;
  pendingTicketCount: number;
  inProgressTicketCount: number;
  doneTicketCount: number;
}

export interface GetOfferTicketsResponse {
  data: OfferWithTicket[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  statistics: {
    total_tickets: number;
    pending_tickets: number;
    in_progress_tickets: number;
    completed_tickets: number;
  };
}

export const apiGetOfferTickets = async (
  params?: GetOfferTicketsParams
): Promise<GetOfferTicketsResponse> => {
  return ApiService.fetchDataWithAxios<GetOfferTicketsResponse>({
    url: '/offers/tickets',
    method: 'GET',
    params: params as unknown as Record<string, unknown>,
  });
};

export const apiSubmitOffer = async (data: SubmitOfferRequest): Promise<SubmitOfferResponse> => {
  return ApiService.fetchDataWithAxios<SubmitOfferResponse>({
    url: '/offers',
    method: 'POST',
    data: data as unknown as Record<string, unknown>,
  });
};

export interface DeleteOfferResponse {
  message: string;
  deleted: string[];
  failed: string[];
}

export const apiDeleteOffer = async (id: string): Promise<DeleteOfferResponse> => {
  return ApiService.fetchDataWithAxios<DeleteOfferResponse>({
    url: `/offers/${id}`,
    method: 'DELETE',
  });
};

// Bulk delete offers interface
export interface BulkDeleteOffersResponse {
  message: string;
  deleted: string[];
  failed: string[];
}

// Generic bulk delete function
export async function apiBulkDelete(url: string, ids: string[]) {
  return ApiService.fetchDataWithAxios<void>({
    url,
    method: 'delete',
    data: {
      ids,
    },
  });
}

// Specific implementations for backwards compatibility
export async function apiBulkDeleteOffers(ids: string[]) {
  return apiBulkDelete('/offers/', ids);
}

export async function apiBulkDeleteOpenings(ids: string[]) {
  return apiBulkDelete('/openings/', ids);
}

export async function apiBulkDeleteConfirmations(ids: string[]) {
  return apiBulkDelete('/confirmations/', ids);
}

export async function apiBulkDeletePaymentVouchers(ids: string[]) {
  return apiBulkDelete('/payment-vouchers/', ids);
}

export interface UpdateOfferRequest {
  investment_volume?: number;
  interest_rate?: number;
  payment_terms?: string;
  bonus_amount?: string;
  bank_id?: string;
  status?: string;
  files?: FormData;
  documentType?: string;
  offerType?: string;
  flex_option?: boolean;
  nametitle?: string;
  reference_no?: string;
  active?: boolean;
  notes?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  selected_agent_id?: string;
  title?: string;
  load_and_opening?: string;
}

export const apiUpdateOffer = async (id: string, data: UpdateOfferRequest): Promise<Offer> => {
  return ApiService.fetchDataWithAxios<Offer>({
    url: `/offers/${id}`,
    method: 'PUT',
    data: data as unknown as Record<string, unknown>,
  });
};

export interface RestoreOfferResponse {
  success: boolean;
  message: string;
  offer: Offer;
}

export const apiRestoreOffer = async (id: string): Promise<RestoreOfferResponse> => {
  return ApiService.fetchDataWithAxios<RestoreOfferResponse>({
    url: `/offers/${id}/restore`,
    method: 'POST',
  });
};

export interface ProjectBank {
  _id: string;
  name: string;
}

export interface ProjectBanksResponse {
  banks: ProjectBank[];
}

export const apiGetProjectBanks = async (id: string) => {
  return ApiService.fetchDataWithAxios<ProjectBanksResponse>({
    url: `/projects/${id}`,
    method: 'GET',
  });
};

export interface Source {
  _id: string;
  name: string;
  price: number;
  provider: string | { name?: string } | null;
  lead_count: number;
  active: boolean;
  /** Hex color from configuration service */
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetSourcesResponse {
  data: Source[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export async function apiGetSources() {
  return ApiService.fetchDataWithAxios<GetSourcesResponse>({
    url: '/sources',
    method: 'get',
  });
}

export interface ImportLeadsResponse {
  message: string;
  successCount: number;
  failureCount: number;
  downloadLink?: string;
  duplicateStatusSummary?: {
    new: number;
    oldDuplicate: number;
    duplicate: number;
  };
}

/**
 * Async import response for large imports
 * Returned when the import is processed in the background (202 Accepted)
 */
export interface AsyncImportResponse {
  message: string;
  importId: string;
  status: 'queued';
  websocket: {
    event: string;
    subscribeEvent: string;
    room: string;
  };
  polling: {
    endpoint: string;
    interval_ms: number;
  };
}

/**
 * Check if response is an async import response
 */
export function isAsyncImportResponse(response: any): response is AsyncImportResponse {
  return response && response.status === 'queued' && response.importId && response.websocket;
}

export function apiImportLeads(
  file: Blob,
  sourceId?: string,
  lead_price?: number,
  forceAsync?: boolean
): Promise<ImportLeadsResponse | AsyncImportResponse> {
  const formData = new FormData();
  formData.append('file', file, file instanceof File ? file.name : 'import.xlsx');

  // Add source_id if provided
  if (sourceId) {
    formData.append('source_id', sourceId);
  }

  // Add lead_price if provided
  if (lead_price !== undefined) {
    formData.append('lead_price', lead_price.toString());
  }

  // Force async processing for large files
  if (forceAsync) {
    formData.append('async', 'true');
  }

  return ApiService.fetchDataWithAxios<ImportLeadsResponse | AsyncImportResponse>({
    url: '/leads/import',
    method: 'POST',
    data: formData as unknown as Record<string, unknown>,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 3600000,
    // Handle both 200 and 202 responses
    validateStatus: (status) => status === 200 || status === 202,
  });
}

/**
 * Get import progress (for polling fallback)
 */
export interface ImportProgressResponse {
  importId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    current_phase: string;
    phase_description: string;
    percentage: number;
    processed_count: number;
    current_batch?: number;
    total_batches?: number;
    estimated_time_remaining_ms?: number;
  };
  results?: {
    success_count: number;
    failure_count: number;
    enhanced_count?: number;
    auto_assigned_count?: number;
    stage_assigned_count?: number;
    reclamation_created_count?: number;
    processing_time_ms?: number;
    downloadLink?: string;
  };
  error?: string;
}

export async function apiGetImportProgress(importId: string): Promise<ImportProgressResponse> {
  return ApiService.fetchDataWithAxios<ImportProgressResponse>({
    url: `/leads/import/${importId}/progress`,
    method: 'get',
  });
}

/**
 * Downloads a file from the failed imports download link
 * @param downloadUrl The URL or filename to download
 * @param customFilename Optional custom filename for the downloaded file
 */
export async function apiDownloadFailedImports(
  downloadUrl: string,
  customFilename?: string
): Promise<void> {
  try {
    // Extract the filename from the URL if it's a full URL
    let apiUrl: string;
    let filename: string;

    if (downloadUrl.includes('/')) {
      // If it's a full URL or path, extract the filename
      const urlParts = downloadUrl.split('/');
      filename = urlParts[urlParts.length - 1];
      apiUrl = downloadUrl; // Use as is if it's a full URL
    } else {
      // If it's just a filename, construct the API endpoint
      filename = downloadUrl;
      apiUrl = `/leads/download/${filename}`;
    }

    // Use custom filename if provided
    if (customFilename) {
      filename = customFilename;
    }

    // For file downloads, we need to use AxiosBase directly to get the response with blob data
    const response = await AxiosBase({
      url: apiUrl,
      method: 'GET',
      responseType: 'blob',
    });

    // Get the blob from the response
    const blob = new Blob([response.data], {
      type: String(response.headers['content-type'] ?? 'application/octet-stream'),
    });

    // Try to get filename from Content-Disposition header if not provided
    if (filename === 'failed-imports.csv') {
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition && typeof contentDisposition === 'string') {
        const filenameMatch = /filename[^;=\n]*=((['"']).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
    }

    // Create a download link and trigger it
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    // Clean up
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    // Re-throw the error for handling by the caller
    throw error;
  }
}

/**
 * Downloads a file from the failed offers imports download link
 * @param downloadUrl The URL or filename to download
 * @param customFilename Optional custom filename for the downloaded file
 */
export async function apiDownloadFailedOffersImports(
  downloadUrl: string,
  customFilename?: string
): Promise<void> {
  try {
    // Extract the filename from the URL if it's a full URL
    let apiUrl: string;
    let filename: string;

    if (downloadUrl.includes('/')) {
      // If it's a full URL or path, extract the filename
      const urlParts = downloadUrl.split('/');
      filename = urlParts[urlParts.length - 1];
      apiUrl = downloadUrl; // Use as is if it's a full URL
    } else {
      // If it's just a filename, construct the API endpoint
      filename = downloadUrl;
      apiUrl = `/offers/import/download/${filename}`;
    }

    // Use custom filename if provided
    if (customFilename) {
      filename = customFilename;
    }

    // For file downloads, we need to use AxiosBase directly to get the response with blob data
    const response = await AxiosBase({
      url: apiUrl,
      method: 'GET',
      responseType: 'blob',
    });

    // Get the blob from the response
    const blob = new Blob([response.data], {
      type: String(response.headers['content-type'] ?? 'application/octet-stream'),
    });

    // Try to get filename from Content-Disposition header if not provided
    if (filename === 'failed-offers-imports.xlsx') {
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition && typeof contentDisposition === 'string') {
        const filenameMatch = /filename[^;=\n]*=((['"']).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
    }

    // Create a download link and trigger it
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    // Clean up
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    // Re-throw the error for handling by the caller
    throw error;
  }
}

export interface GetAllRecentImport {
  imports: Import[];
  meta: Meta;
}

export interface Import {
  _id: string;
  user: User;
  file: File;
  import_details: ImportDetails;
  error_file: ErrorFile;
  status: string;
  processing_time_ms: number;
  created_at: Date;
  completed_at: Date;
}

export interface ErrorFile {
  filename: string;
  download_url: string;
}

export interface File {
  original_filename: string;
  file_size: number;
  download_url: string;
}

export interface ImportDetails {
  source_id: string;
  lead_price: number;
  total_rows: number;
  success_count: number;
  failure_count: number;
  duplicate_status_summary: DuplicateStatusSummary;
}

export interface DuplicateStatusSummary {
  new: number;
  oldDuplicate: number;
  duplicate: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

//permanent lead delete

export const apiPermanentDeleteLead = async (ids: string[]) => {
  return ApiService.fetchDataWithAxios<void>({
    url: `/leads/permanent-delete`,
    method: 'delete',
    data: {
      ids,
    },
  });
};

// Bulk search API: accepts a mixed array of values (partner IDs, emails, phones)
export const apiSearchLeadsByPartnerIds = async (
  values: string[]
): Promise<GetAllLeadsResponse> => {
  return ApiService.fetchDataWithAxios<GetAllLeadsResponse>({
    url: '/leads/bulk-search',
    method: 'post',
    data: {
      values,
    },
  });
};

// Add new API function for updating lead status
export interface UpdateLeadStatusRequest extends Record<string, unknown> {
  stage_name?: string;
  status_name?: string;
  stage_id?: string;
  status_id?: string;
}

export async function apiUpdateLeadStatus(id: string, data: UpdateLeadStatusRequest) {
  return ApiService.fetchDataWithAxios<Lead>({
    url: `/leads/${id}/status`,
    method: 'put',
    data,
  });
}

export interface UpdateOfferCallsResponse {
  success: boolean;
  message?: string;
  data?: {
    offer_calls: number;
  };
}

export async function apiIncreaseOfferCalls(leadId: string) {
  return ApiService.fetchDataWithAxios<UpdateOfferCallsResponse>({
    url: `/leads/${leadId}/offer_calls`,
    method: 'put',
    params: { increase: 1 },
  });
}

export async function apiDecreaseOfferCalls(leadId: string) {
  return ApiService.fetchDataWithAxios<UpdateOfferCallsResponse>({
    url: `/leads/${leadId}/offer_calls`,
    method: 'put',
    params: { decrease: 1 },
  });
}

export interface CloseProjectRequest {
  leadsToRefresh: string[];
  closureReason: string;
  /** Optional status id applied when closing (from Lead metadata `status_id` options). */
  current_status?: string;
  /** Required when `closureReason` is `other` — free-text explanation. */
  notes?: string;
}

export interface CloseProjectResponse {
  success: boolean;
  message: string;
  project_id: string;
  total_leads: number;
  refreshed_leads: number;
  archived_leads: number;
  closure_date: string;
}

export const apiCloseProjectWithRefresh = async (
  projectId: string,
  data: CloseProjectRequest
): Promise<CloseProjectResponse> => {
  return ApiService.fetchDataWithAxios<CloseProjectResponse>({
    url: `/assign-leads/project/${projectId}/close`,
    method: 'POST',
    data: data as unknown as Record<string, unknown>,
  });
};

export interface ImportOffersResponse {
  success: boolean;
  message: string;
  data: {
    successCount: number;
    failureCount: number;
    downloadLink?: string;
    importId?: string;
  };
}

export function apiImportOffers(file: Blob): Promise<ImportOffersResponse> {
  const formData = new FormData();
  formData.append('file', file, file instanceof File ? file.name : 'import.xlsx');

  return ApiService.fetchDataWithAxios<ImportOffersResponse>({
    url: '/offers/import',
    method: 'POST',
    data: formData as unknown as Record<string, unknown>,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 3600000,
  });
}

export interface OffersImportHistoryParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface OffersImportHistoryResponse {
  success: boolean;
  data: {
    imports: OffersImport[];
    meta: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface OffersImport {
  _id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  file: {
    original_filename: string;
    file_size: number;
    download_url: string;
  };
  import_details: {
    total_rows: number;
    success_count: number;
    failure_count: number;
  };
  error_file?: {
    filename: string;
    download_url: string;
  };
  status: string;
  processing_time_ms: number;
  created_at: string;
  completed_at: string;
}

export async function apiGetOffersImportHistory(params?: OffersImportHistoryParams) {
  return ApiService.fetchDataWithAxios<OffersImportHistoryResponse>({
    url: '/offers/import/history',
    method: 'get',
    params: params as unknown as Record<string, unknown>,
  });
}

// Group By Filters API
export interface GroupOption {
  key: string;
  label: string;
  type: string;
}

export interface GroupOptionsResponse {
  success: boolean;
  data: GroupOption[];
  meta: {
    total: number;
    userRole: string;
    canReadAllLeads: boolean;
  };
}

// DEPRECATED: This API endpoint is no longer used
// Replaced by /api/metadata/options/{entityType} which provides groupOptions
// Commented out to prevent API calls - kept for reference only
// export async function apiGetGroupOptions() {
//   return ApiService.fetchDataWithAxios<GroupOptionsResponse>({
//     url: '/leads/group/options',
//     method: 'get',
//   });
// }

// Grouped Leads API
export interface GroupedLead {
  _id: string;
  use_status: string;
  reclamation_status: string;
  checked: boolean;
  lead_source_no: string;
  contact_name: string;
  email_from: string;
  phone: string;
  expected_revenue: number;
  leadPrice: number;
  lead_date: string;
  source_id: {
    _id: string;
    name: string;
    price: number;
    active: boolean;
  };
  stage: {
    id: string;
    name: string;
    isWonStage: boolean;
  };
  status: {
    id: string;
    name: string;
    code: string;
  };
  active: boolean;
  tags: any[];
  project_closed_date: string | null;
  closure_reason: string | null;
  closed_by_user_id: string | null;
  write_date: string;
  duplicate_status: number;
  voip_extension: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  transaction_id: string;
  project: any[];
  offers: any[];
  assignedAt: string | null;
  assignment_history: any[];
}

// New interface for the updated API response structure
export interface GroupedLeadsSubGroup {
  groupId: string | null;
  groupName: string;
  count: number;
  leadIds?: string[];
  subGroups?: GroupedLeadsSubGroup[];
}

export interface GroupedLeadsGroup {
  groupId: string | null;
  groupName: string;
  count: number;
  subGroups: GroupedLeadsSubGroup[];
}

export interface GroupedLeadsResponse {
  success: boolean;
  data: GroupedLeadsGroup[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    groupingLevels: string[];
    totalLeads: number;
    executionTime: number;
    includeLeads: boolean;
    performanceLevel: string;
    entityType?: string; // Add entityType to meta
  };
}

// Interface for detailed group leads response (domain-based API returns data with offers/openings/etc.)
export interface GroupLeadsResponse {
  success: boolean;
  data: {
    group?: {
      groupId: string;
      groupName: string;
      count: number;
      path: string[];
      level: number;
    };
    leads?: Lead[];
    [key: string]: any; // Dynamic properties: 'offers', 'openings', 'confirmations', etc.
  };
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    groupingLevels?: string[];
    groupPath?: string[];
    currentLevel?: number;
    isLastLevel?: boolean;
    executionTime?: number;
    entityType?: string;
  };
}

/**
 * Fetch group details using domain-based API.
 * Replaces old /leads/group/multilevel/{fields}/details/{groupPath} endpoint.
 * Uses /offers or /offers/progress with domain=[["field","=","value"],...]
 */
export async function apiGetGroupDetails(params: {
  entityType: string;
  fields: string[];
  path: string[];
  apiFilters?: Array<{ field: string; operator: string; value: any }>;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  includeAll?: boolean;
}): Promise<GroupLeadsResponse> {
  const { entityType, fields, path, apiFilters, page = 1, limit = 50, sortBy, sortOrder, includeAll = true } = params;

  // Build domain from group path: [[field1, "=", path1], [field2, "=", path2], ...]
  // Preserve boolean false / 0 — path[i] || '' incorrectly turned false into '' and dropped the filter.
  const groupDomain: DomainFilter[] = fields.map((field, i) => {
    const raw = path[i];
    const segment = raw === undefined || raw === null ? '' : raw;
    return [field, '=', segment] as DomainFilter;
  });

  // Convert apiFilters to domain format and merge
  const filterDomain = toDomainFiltersForApi(apiFilters || []);
  const domain = [...groupDomain, ...filterDomain].filter((d) => {
    const v = d[2];
    if (v === undefined || v === null) return false;
    if (typeof v === 'string' && v === '') return false;
    return true;
  });

  const dataKey = getGroupDetailsDataKey(entityType);
  const hasProgress = getHasProgressForEntity(entityType);

  const baseParams: Record<string, unknown> = {
    page,
    limit,
    includeAll: includeAll ? 'true' : undefined,
    domain: domain.length > 0 ? JSON.stringify(domain) : undefined,
    sortBy,
    sortOrder,
  };

  if (hasProgress) {
    const { apiGetOffersProgress } = await import('./OffersProgressService');
    const response = await apiGetOffersProgress({
      ...baseParams,
      has_progress: hasProgress,
    } as any);
    const meta = response.meta || { total: 0, page: 1, limit: 50 };
    return {
      success: true,
      data: { [dataKey]: response.data || [] },
      meta: {
        ...meta,
        pages: (meta as any).pages ?? Math.ceil((meta.total || 0) / (meta.limit || 50)),
      },
    };
  }

  // For offers, use /offers endpoint
  const response = await apiGetOffers({
    ...baseParams,
  } as GetOffersParams);
  return {
    success: true,
    data: { [dataKey]: response.data || [] },
    meta: {
      total: response.meta?.total ?? 0,
      page: response.meta?.page ?? 1,
      limit: response.meta?.limit ?? 50,
      pages: response.meta?.pages ?? 0,
    },
  };
}

function getGroupDetailsDataKey(entityType: string): string {
  switch (entityType) {
    case 'offer':
      return 'offers';
    case 'opening':
      return 'openings';
    case 'confirmation':
      return 'confirmations';
    case 'payment':
      return 'payments';
    case 'netto':
    case 'netto1':
    case 'netto2':
      return 'offers';
    case 'Reclamation':
    case 'reclamation':
      return 'reclamations';
    default:
      return entityType;
  }
}

function getHasProgressForEntity(entityType: string): string | undefined {
  switch (entityType) {
    case 'opening':
      return 'opening';
    case 'confirmation':
      return 'confirmation';
    case 'payment':
      return 'payment';
    case 'netto1':
      return 'netto1';
    case 'netto2':
      return 'netto2';
    case 'netto':
      return 'netto1';
    default:
      return undefined;
  }
}

// Revert Import API
export async function apiRevertImport(objectId: string, reason: string) {
  return ApiService.fetchDataWithAxios<any>({
    url: `/leads/import/${objectId}/revert`,
    method: 'POST',
    data: { reason },
  });
}

// Closed Leads API
export interface GetClosedLeadsParams extends Record<string, unknown> {
  project_id?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: number;
  is_reverted?: boolean;
  contact_name?: string;
  email_from?: string;
  /** Grouped / domain-filtered closed leads (same query shape as /leads) */
  groupBy?: string;
  domain?: string;
  search?: string;
}

/** Populated status on a closed lead (snapshot at project close). */
export interface ClosedLeadCurrentStatus {
  _id: string;
  name: string;
  stage?: string;
  stage_id?: string;
}

export interface ClosedLead extends Lead {
  original_lead_id: string;
  closed_project_id: {
    _id: string;
    name: string;
  };
  closed_at: string;
  closed_by_user_id: {
    _id: string;
    login: string;
    role: string;
  };
  closure_reason: string;
  is_reverted: boolean;
  closeLeadStatus?: 'fresh' | 'revert' | 'assigned';
  /** Lead status captured when the project was closed. */
  current_status?: ClosedLeadCurrentStatus;
}

export interface GetClosedLeadsResponse {
  data: ClosedLead[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export async function apiGetClosedLeads(params?: GetClosedLeadsParams) {
  return ApiService.fetchDataWithAxios<GetClosedLeadsResponse>({
    url: '/closed-leads',
    method: 'get',
    params,
  });
}

// Closed Projects API
export interface ClosedProject {
  project_id: string;
  project_name: string;
  project_active: boolean;
  total_leads: number;
  lead_count: number;
  pending_count: number;
  revertable_count: number;
  in_use_count: number;
  reverted_count: number;
  assigned_count: number;
  last_closed_at: string;
}

export interface GetClosedProjectsResponse {
  data: ClosedProject[];
  meta: {
    total: number;
  };
}

export async function apiGetClosedProjects() {
  return ApiService.fetchDataWithAxios<GetClosedProjectsResponse>({
    url: '/closed-leads/projects',
    method: 'get',
  });
}

// Assign Closed Leads API
export interface AssignClosedLeadsRequest {
  closedLeadIds: string[];
  projectId: string;
  agentId: string;
  notes?: string;
  leadPrice?: number;
}

export interface AssignClosedLeadsResponse {
  success: boolean;
  message: string;
  assigned_count: number;
  assignments?: any[];
  results?: {
    successful: Array<{
      closedLeadId: string;
      assignmentId?: string;
    }>;
    failed: Array<{
      closedLeadId: string;
      error: string;
    }>;
    totalProcessed: number;
    successCount: number;
    failureCount: number;
  };
}

export async function apiAssignClosedLeads(data: AssignClosedLeadsRequest) {
  return ApiService.fetchDataWithAxios<AssignClosedLeadsResponse>({
    url: '/closed-leads/assign',
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });
}

// Revert Closed Project Leads API
export interface RevertClosedProjectLeadsResponse {
  success: boolean;
  message: string;
  stats: {
    reverted_leads: number;
    reverted_activities: number;
    reverted_todos: number;
    reverted_assignments: number;
    in_use_leads: number;
  };
  reverted_count: number;
  in_use_count: number;
}

// Revert Single Closed Lead API
export interface RevertClosedLeadsResponse {
  success: boolean;
  message: string;
  total_requested: number;
  reverted_count: number;
  failed_count: number;
  errors?: Array<{
    closed_lead_id: string;
    error: string;
  }>;
  reverted_lead_ids: string[];
  failed_lead_ids: string[];
  stats: {
    reverted_activities: number;
    reverted_todos: number;
    reverted_assignments: number;
    deleted_activities: number;
    deleted_todos: number;
    deleted_assignments: number;
    deleted_closed_leads: number;
  };
}

export interface RevertClosedLeadsRequest {
  closedLeadIds: string[];
}

export async function apiRevertClosedLeads(closedLeadIds: string[]) {
  return ApiService.fetchDataWithAxios<RevertClosedLeadsResponse>({
    url: `/closed-leads/revert`,
    method: 'post',
    data: {
      closedLeadIds,
    },
  });
}

export async function apiRevertClosedProjectLeads(projectId: string) {
  return ApiService.fetchDataWithAxios<RevertClosedProjectLeadsResponse>({
    url: `/closed-leads/project/${projectId}/revert`,
    method: 'post',
  });
}

// Todo assignment API
export interface AssignTodoRequest {
  assignee_id: string;
}

export async function apiAssignTodo(todoId: string, data: AssignTodoRequest) {
  return ApiService.fetchDataWithAxios<any>({
    url: `/todos/${todoId}/assign`,
    method: 'POST',
    data: data as unknown as Record<string, unknown>,
  });
}

// API function for getting assigned todos
export async function apiGetAssignedTodos(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<GetAllLeadsResponse>({
    url: '/leads/assigned',
    method: 'get',
    params,
  });
}

// API function for getting extra todos (For Me)
export async function apiGetExtraTodos(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<GetAllLeadsResponse>({
    url: '/leads/extra',
    method: 'get',
    params,
  });
}

// Column preference APIs
export interface ColumnPreferenceData {
  columnOrders: Record<string, string[]>;
  columnVisibility: Record<string, Record<string, boolean>>;
  isDragModeEnabled: boolean;
  hasHydrated: boolean;
}

export interface ColumnPreferencePayload {
  data: ColumnPreferenceData;
  version?: number;
}

// Response format from backend (updated to match professional backend)
export interface ColumnPreferenceResponse {
  success: boolean;
  message?: string;
  data: ColumnPreferenceData;
  version: number;
  isDefault?: boolean;
  results?: Array<{
    user_id: string;
    matched: number;
    upserted: number;
    error?: string;
  }>;
}

// Save column preference response (for bulk updates)
export interface SaveColumnPreferenceResponse {
  success: boolean;
  message: string;
  results: Array<{
    user_id: string;
    matched: number;
    upserted: number;
    error?: string;
  }>;
}

export async function apiSaveColumnPreference(payload: ColumnPreferencePayload) {
  return ApiService.fetchDataWithAxios<SaveColumnPreferenceResponse>({
    url: '/column-preference/save',
    method: 'put',
    data: payload as unknown as Record<string, unknown>,
  });
}

export async function apiSaveColumnPreferenceDefault(payload: ColumnPreferencePayload) {
  return ApiService.fetchDataWithAxios<ColumnPreferenceResponse>({
    url: '/column-preference/default',
    method: 'post',
    data: payload as unknown as Record<string, unknown>,
  });
}

export async function apiGetColumnPreferenceByUser(table?: string, useDefault?: boolean) {
  const params: Record<string, any> = {};
  if (table) params.table = table;
  if (useDefault) params.default = true;

  return ApiService.fetchDataWithAxios<ColumnPreferenceResponse>({
    url: '/column-preference/get-by-user',
    method: 'get',
    params: Object.keys(params).length ? params : undefined,
  });
}

// Admin column preference update (apply settings to multiple users)
export interface AdminColumnPreferencePayload extends ColumnPreferencePayload {
  user_ids: string[];
}

export interface ResetColumnPreferencePayload {
  table: string;
}

export async function apiAdminUpdateColumnPreference(payload: AdminColumnPreferencePayload) {
  return ApiService.fetchDataWithAxios<SaveColumnPreferenceResponse>({
    url: '/column-preference/admin-update',
    method: 'put',
    data: payload as unknown as Record<string, unknown>,
  });
}

export async function apiAdminColumnPreferenceReset(payload: ResetColumnPreferencePayload) {
  return ApiService.fetchDataWithAxios<ColumnPreferenceResponse>({
    url: '/column-preference/reset-to-default',
    method: 'post',
    data: payload as unknown as Record<string, unknown>,
  });
}

// Get multiple users' column preferences
export interface GetMultipleUsersColumnPreferenceRequest {
  table: string;
  user_ids: string[];
  role: string;
}

export interface UserColumnPreferenceData {
  usersInfo: {
    user_id: string;
    name: string | null;
  };
  columnOrders: Record<string, string[]>;
  columnVisibility: Record<string, Record<string, boolean>>;
  isDefault: boolean;
  error?: string;
  data?: {
    columnOrders: Record<string, string[]>;
    columnVisibility: Record<string, Record<string, boolean>>;
  };
  version?: number;
}

export interface GetMultipleUsersColumnPreferenceResponse {
  success: boolean;
  message: string;
  count: number;
  results: Array<{
    table: string;
    data: UserColumnPreferenceData[];
  }>;
}

export async function apiGetMultipleUsersColumnPreference(
  payload: GetMultipleUsersColumnPreferenceRequest
) {
  return ApiService.fetchDataWithAxios<GetMultipleUsersColumnPreferenceResponse>({
    url: '/column-preference/admin/get-multiple-users',
    method: 'post',
    data: payload as unknown as Record<string, unknown>,
  });
}

export interface CurrentTopLeadResponse {
  status: string;
  message?: string;
  data: TLead | null;
  queue_info: {
    total_in_queue: number;
    current_position: number | null;
    breakdown: {
      new?: number;
      ne1?: number;
      ne2?: number;
      ne3?: number;
      ne4?: number;
      angebot?: number;
      [key: string]: number | undefined;
    };
    filtered_by_project?: any;
  };
  navigation: {
    previous_lead_id?: string | null;
    has_previous: boolean;
    next_lead_id?: string | null;
    has_next: boolean;
    next_is_current_top: boolean;
    is_current_top: boolean;
    is_pinned: boolean;
    can_complete: boolean;
    view_count: number;
    first_viewed_at: string | null;
    last_viewed_at: string | null;
  };
  previous_lead: TLead | null;
}

export interface GetCurrentTopLeadParams {
  project_id?: string;
  project_name?: string;
  source?: string;
  exclude_recent?: number;
}

export async function apiGetCurrentTopLead(params?: GetCurrentTopLeadParams) {
  return ApiService.fetchDataWithAxios<CurrentTopLeadResponse>({
    url: '/leads/queue/current-top',
    method: 'get',
    params: params as unknown as Record<string, unknown>,
  });
}

export interface CompleteCurrentTopLeadRequest {
  lead_id: string;
}

export interface CompleteCurrentTopLeadResponse {
  status: string;
  message: string;
  completed_lead: {
    _id: string;
    is_on_top: boolean;
    completed_at: string;
  };
  next_lead: {
    _id: string;
    contact_name: string;
    status: string;
  } | null;
}

export async function apiCompleteCurrentTopLead(data: CompleteCurrentTopLeadRequest) {
  return ApiService.fetchDataWithAxios<CompleteCurrentTopLeadResponse>({
    url: '/leads/currenttop-completed',
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });
}

export interface NavigateToLeadParams {
  project_id?: string;
  project_name?: string;
  source?: string;
}

export interface NavigateToLeadResponse {
  status: string;
  data: TLead;
  navigation: {
    previous_lead_id?: string | null;
    has_previous?: boolean;
    next_lead_id?: string | null;
    has_next?: boolean;
    next_is_current_top?: boolean;
    is_current_top?: boolean;
    is_pinned?: boolean;
    can_complete?: boolean;
    view_count?: number;
    first_viewed_at?: string | null;
    last_viewed_at?: string | null;
  };
  queue_info: {
    total_in_queue: number;
    current_position: number | null;
    breakdown: Record<string, number>;
    filtered_by_project?: any;
  };
  ui_hints?: {
    show_previous_button?: boolean;
    show_next_button?: boolean;
    show_complete_button?: boolean;
    show_back_to_current_button?: boolean;
    next_endpoint?: string | null;
    previous_endpoint?: string | null;
    complete_endpoint?: string | null;
  };
}

export async function apiNavigateToLead(leadId: string, params?: NavigateToLeadParams) {
  return ApiService.fetchDataWithAxios<NavigateToLeadResponse>({
    url: `/leads/queue/navigate/${leadId}`,
    method: 'get',
    params: params as unknown as Record<string, unknown>,
  });
}

// ============================================================================
// NEW GROUPING & FILTERING API FUNCTIONS (GET-based system)
// ============================================================================

import {
  MetadataOptionsResponse,
  GroupedSummaryResponse,
  GroupDetailsResponse,
  DomainFilter,
  GroupSummary,
} from '@/stores/universalGroupingFilterStore';

/**
 * Get metadata options for entity type (filter fields, operators, etc.)
 * @param entityType - Entity type: 'Lead', 'Offer', 'User', 'Team', 'Opening'
 */
export async function apiGetMetadataOptions(entityType: string): Promise<MetadataOptionsResponse> {
  return ApiService.fetchDataWithAxios<MetadataOptionsResponse>({
    url: `/api/metadata/options/${entityType}`,
    method: 'get',
  });
}

/**
 * Discover available models by trying common entity types
 * Returns array of successfully discovered models
 */
export async function apiDiscoverAvailableModels(): Promise<string[]> {
  const commonEntityTypes = ['Lead', 'Offer', 'User', 'Team', 'Opening'];
  const discoveredModels: string[] = [];

  // Try each entity type and collect successful ones
  await Promise.allSettled(
    commonEntityTypes.map(async (entityType) => {
      try {
        const response = await apiGetMetadataOptions(entityType);
        if (response?.success && response?.model) {
          discoveredModels.push(response.model);
        }
      } catch {
        // Silently skip failed entity types
      }
    })
  );

  return discoveredModels;
}

/**
 * Get grouped summary data
 * @param params - Parameters for grouped summary query
 */
export async function apiGetGroupedSummary(params: {
  entityType: string;
  domain: DomainFilter[];
  groupBy: string[];
  page?: number;
  limit?: number;
  subPage?: number | null;
  subLimit?: number | null;
  groupId?: string | null; // ID of the parent group whose subgroups are being paginated
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Default filters as regular query params (e.g., { use_status: 'pending', project_id: '123' })
  // These should be passed alongside domain parameter, not inside it
  defaultFilters?: Record<string, string | number | boolean>;
  // has_progress value for progress pages (opening, confirmation, payment, netto1, netto2, lost)
  hasProgress?: string;
  // Search term from ActionBar
  search?: string | null;
  // Bulk search values (emails, partner IDs, phones) - when grouping after bulk search
  values?: string[];
  /** When false, omit `includeAll` (e.g. Leads Bank). Default: add includeAll for grouped Lead requests. */
  includeAll?: boolean;
  /** Use `/closed-leads` instead of `/leads` for grouped summary (close-project lead bank). */
  listResource?: 'leads' | 'closed-leads';
}): Promise<GroupedSummaryResponse> {
  const {
    entityType,
    domain,
    groupBy,
    defaultFilters,
    hasProgress,
    values,
    includeAll,
    listResource,
    ...rest
  } = params;

  // Build params object for axios - axios will handle URL encoding properly
  const axiosParams: Record<string, string> = {};

  // Filter out redundant domain filters that are already covered by has_progress
  // For example, if has_progress=opening, remove has_opening=true from domain
  const filteredDomain =
    domain?.filter((filter) => {
      if (!hasProgress) return true;
      // Remove all progress-related filters when has_progress is set (they're redundant)
      // Remove has_opening unless has_progress is 'opening'
      if (filter[0] === 'has_opening' && hasProgress !== 'opening') return false;
      // Remove has_opening when has_progress is 'opening' (redundant)
      if (filter[0] === 'has_opening' && hasProgress === 'opening') return false;
      // Remove has_confirmation unless has_progress is 'confirmation'
      if (filter[0] === 'has_confirmation' && hasProgress !== 'confirmation') return false;
      // Remove has_confirmation when has_progress is 'confirmation' (redundant)
      if (filter[0] === 'has_confirmation' && hasProgress === 'confirmation') return false;
      // Remove has_payment/has_payment_voucher unless has_progress is 'payment'
      if (
        (filter[0] === 'has_payment' || filter[0] === 'has_payment_voucher') &&
        hasProgress !== 'payment'
      )
        return false;
      // Remove has_payment/has_payment_voucher when has_progress is 'payment' (redundant)
      if (
        (filter[0] === 'has_payment' || filter[0] === 'has_payment_voucher') &&
        hasProgress === 'payment'
      )
        return false;
      // Remove has_netto1 unless has_progress is 'netto1'
      if (filter[0] === 'has_netto1' && hasProgress !== 'netto1') return false;
      // Remove has_netto1 when has_progress is 'netto1' (redundant)
      if (filter[0] === 'has_netto1' && hasProgress === 'netto1') return false;
      // Remove has_netto2 unless has_progress is 'netto2'
      if (filter[0] === 'has_netto2' && hasProgress !== 'netto2') return false;
      // Remove has_netto2 when has_progress is 'netto2' (redundant)
      if (filter[0] === 'has_netto2' && hasProgress === 'netto2') return false;
      // Remove has_lost unless has_progress is 'lost'
      if (filter[0] === 'has_lost' && hasProgress !== 'lost') return false;
      // Remove has_lost when has_progress is 'lost' (redundant)
      if (filter[0] === 'has_lost' && hasProgress === 'lost') return false;
      return true;
    }) || [];

  // Convert domain to JSON string - axios will encode it properly
  // Only include domain if there are remaining filters (not empty)
  if (filteredDomain.length > 0) {
    axiosParams.domain = JSON.stringify(filteredDomain);
  }

  // Add groupBy as JSON string
  axiosParams.groupBy = JSON.stringify(groupBy);

  // Include all records when grouping (required for most leads / reclamations grouped API).
  // Leads Bank and closed-leads omit this flag.
  const effectiveIncludeAll =
    listResource === 'closed-leads' ? false : includeAll;
  if (groupBy.length > 0 && effectiveIncludeAll !== false) {
    axiosParams.includeAll = 'true';
  }

  // Add default filters as regular query params (e.g., use_status=pending)
  // Filter out redundant has_opening/has_confirmation/has_payment_voucher if has_progress is set
  // Remove project_id from defaultFilters for offers/openings pages
  // has_progress indicates we're on offers/openings/confirmations/payments pages
  const cleanedDefaultFilters = { ...defaultFilters };
  if (hasProgress || entityType === 'Offer') {
    // Remove project_id for offers/openings/confirmations/payments/netto1/netto2 pages (has_progress) or Offer entity type
    delete cleanedDefaultFilters.project_id;
    delete cleanedDefaultFilters.project;
  }
  // Close-project grouped summary: scope with domain (team_id), not project_id query param
  if (listResource === 'closed-leads') {
    delete cleanedDefaultFilters.project_id;
    delete cleanedDefaultFilters.project;
  }

  if (cleanedDefaultFilters) {
    Object.entries(cleanedDefaultFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Skip project_id and project params for offers/openings/confirmations/payments/netto1/netto2 pages
        if (
          (hasProgress || entityType === 'Offer') &&
          (key === 'project_id' || key === 'project')
        ) {
          return; // Don't add project/project_id for progress pages
        }

        // Skip redundant filters that are already covered by has_progress
        if (hasProgress) {
          // Filter out has_opening unless has_progress is 'opening'
          if (key === 'has_opening' && hasProgress !== 'opening') return;
          // Filter out has_opening when has_progress is 'opening' (redundant)
          if (key === 'has_opening' && hasProgress === 'opening') return;
          // Filter out has_confirmation unless has_progress is 'confirmation'
          if (key === 'has_confirmation' && hasProgress !== 'confirmation') return;
          // Filter out has_confirmation when has_progress is 'confirmation' (redundant)
          if (key === 'has_confirmation' && hasProgress === 'confirmation') return;
          // Filter out has_payment/has_payment_voucher unless has_progress is 'payment'
          if ((key === 'has_payment' || key === 'has_payment_voucher') && hasProgress !== 'payment')
            return;
          // Filter out has_payment/has_payment_voucher when has_progress is 'payment' (redundant)
          if ((key === 'has_payment' || key === 'has_payment_voucher') && hasProgress === 'payment')
            return;
          // Filter out has_netto1 unless has_progress is 'netto1'
          if (key === 'has_netto1' && hasProgress !== 'netto1') return;
          // Filter out has_netto1 when has_progress is 'netto1' (redundant)
          if (key === 'has_netto1' && hasProgress === 'netto1') return;
          // Filter out has_netto2 unless has_progress is 'netto2'
          if (key === 'has_netto2' && hasProgress !== 'netto2') return;
          // Filter out has_netto2 when has_progress is 'netto2' (redundant)
          if (key === 'has_netto2' && hasProgress === 'netto2') return;
          // Filter out has_lost unless has_progress is 'lost'
          if (key === 'has_lost' && hasProgress !== 'lost') return;
          // Filter out has_lost when has_progress is 'lost' (redundant)
          if (key === 'has_lost' && hasProgress === 'lost') return;
        }
        axiosParams[key] = String(value);
      }
    });
  }

  // Add has_progress parameter if provided (for progress pages)
  if (hasProgress) {
    axiosParams.has_progress = hasProgress;
  }

  // Add pagination and sorting parameters
  if (rest.page) axiosParams.page = rest.page.toString();
  if (rest.limit) axiosParams.limit = rest.limit.toString();
  // Add subgroup pagination parameters if provided
  if (rest.subPage !== undefined && rest.subPage !== null) {
    axiosParams.subPage = rest.subPage.toString();
  }
  if (rest.subLimit !== undefined && rest.subLimit !== null) {
    axiosParams.subLimit = rest.subLimit.toString();
  }
  // Add groupId parameter if provided (required for subgroup pagination)
  if (rest.groupId !== undefined && rest.groupId !== null) {
    axiosParams.groupId = rest.groupId;
  }
  if (rest.sortBy) axiosParams.sortBy = rest.sortBy;
  // Always include sortOrder if provided (even if it's the default 'desc') to ensure consistent API calls
  if (rest.sortOrder) axiosParams.sortOrder = rest.sortOrder;
  // Add search / contact_name if provided (/closed-leads uses contact_name like flat list)
  if (rest.search) {
    if (listResource === 'closed-leads') {
      axiosParams.contact_name = rest.search;
    } else {
      axiosParams.search = rest.search;
    }
  }

  // Add bulk search values when grouping after bulk search (leads page)
  if (values && values.length > 0) {
    axiosParams.values = JSON.stringify(values);
  }

  // Determine endpoint: use /offers/progress if has_progress is provided, otherwise use entity-specific endpoint
  let endpoint: string;
  let isCashflowEndpoint = false;

  if (listResource === 'closed-leads') {
    endpoint = 'closed-leads';
  } else if (hasProgress) {
    // Use /offers/progress endpoint for progress pages (openings, confirmations, payments, netto1, netto2, lost)
    endpoint = 'offers/progress';
  } else {
    // For openings, confirmations, and payments pages (without has_progress), still use /offers/progress
    // This is because these pages are actually filtered views of offers with progress filters
    const useProgressEndpoint = ['Opening', 'Confirmation', 'Payment'].includes(entityType);
    if (useProgressEndpoint) {
      endpoint = 'offers/progress';
    } else {
      // Special case: Team entity type maps to projects endpoint
      if (entityType === 'Team') {
        endpoint = 'projects';
      } else if (entityType === 'CashflowEntry') {
        // Special case: CashflowEntry uses /cashflow endpoint
        endpoint = 'cashflow';
        isCashflowEndpoint = true;
      } else if (entityType === 'CashflowTransaction') {
        // Special case: CashflowTransaction uses /cashflow/transactions endpoint
        endpoint = 'cashflow/transactions';
        isCashflowEndpoint = true;
      } else {
        // Convert entity type to endpoint (e.g., 'Lead' -> 'leads', 'Offer' -> 'offers', 'User' -> 'users')
        endpoint = entityType.toLowerCase() + 's';
      }
    }
  }

  // For cashflow endpoints, the response format has been updated
  // New API returns { data: [...], meta: {...} } with proper GroupSummary structure
  // Old API returned { groups: [...], pagination: {...} }
  // Handle both formats for backward compatibility
  if (isCashflowEndpoint) {
    const response = await ApiService.fetchDataWithAxios<any>({
      url: `/${endpoint}`,
      method: 'get',
      params: axiosParams,
    });

    // Check if response is in new format (has data array with groupId, groupName, fieldName)
    if (
      response.data &&
      Array.isArray(response.data) &&
      response.data.length > 0 &&
      'groupId' in response.data[0]
    ) {
      // New format: Already has correct structure, return as-is
      return {
        success: response.success,
        data: response.data, // Already in GroupSummary[] format
        meta: {
          total: response.meta?.total || 0,
          page: response.meta?.page || 1,
          limit: response.meta?.limit || 50,
          pages: response.meta?.pages || 1,
        },
      };
    }

    // Old format: Has groups array, need to transform
    if (response.groups && Array.isArray(response.groups)) {
      const transformedData: GroupSummary[] = response.groups.map((group: any) => ({
        groupId: String(group._id || 'none'),
        groupName: group.name || 'Unknown',
        fieldName: groupBy[0] || '', // First groupBy field
        count: group.count || 0,
        summary: group.summary, // Include summary if available (for cashflow transactions)
      }));

      return {
        success: response.success,
        data: transformedData,
        meta: {
          total: response.pagination?.total || response.meta?.totalRecords || 0,
          page: response.pagination?.page || 1,
          limit: response.pagination?.limit || 50,
          pages: response.pagination?.totalPages || 1,
        },
      };
    }

    // Fallback: Empty response
    return {
      success: response.success || false,
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 50,
        pages: 0,
      },
    };
  }

  return ApiService.fetchDataWithAxios<GroupedSummaryResponse>({
    url: `/${endpoint}`,
    method: 'get',
    params: axiosParams,
  });
}
