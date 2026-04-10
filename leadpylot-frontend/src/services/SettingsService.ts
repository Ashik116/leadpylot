import ApiService from './ApiService';
// Removed BankFormValues import as we're now using FormData

export interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Bank {
  _id: string;
  name: string;
  nickName?: string;
  is_allow: boolean;
  is_default: boolean;
  multi_iban: boolean;
  lei_code: string;
  country: string;
  address: string;
  min_limit: number;
  max_limit: number;
  state: string;
  note: string;
  phone?: string;
  email?: string;
  account?: string;
  account_number?: string;
  swift_code?: string;
  iban?: string;
  code?: string;
  projects?: string[];
  createdAt: Date;
  updatedAt: Date;
  isRestricted?: boolean;
  allowedAgents?: string[];
  restrictedAgents?: string[];
  country_flag_code?: string;
  bank_country_code?: string;
  country_flag?: any;
  logo?: any;
  bank_country_flag?: any;
}

export type CreateBank = {
  name: string;
};

export interface GetAllBanksResponse {
  data: Bank[];
  meta: Meta;
}

export type CreateBankResponse = {
  response: number;
  server?: VoipServerInfo;
  error?: string;
};

export async function apiGetBanks(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<GetAllBanksResponse>({
    url: `/banks`,
    method: 'get',
    params,
  });
}

export async function apiGetBank(id: string) {
  return ApiService.fetchDataWithAxios<Bank>({
    url: `/banks/${id}`,
    method: 'get',
  });
}

export async function apiCreateBank(data: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<Bank>({
    url: '/banks',
    method: 'post',
    data,
  });
}

export async function apiUpdateBank(data: Record<string, unknown>, id: string) {
  return ApiService.fetchDataWithAxios<CreateBankResponse>({
    url: `/banks/${id}`,
    method: 'PUT',
    data,
  });
}

export async function apiDeleteBank(id: string) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/banks`,
    method: 'delete',
    data: { ids: [id] }, // Send as array since that's what the controller looks for next
  });
}

export interface MailServerProjectAssignment {
  project_id: string;
  assigned: string[];
}

export interface MailServerInfo {
  _id: string;
  type: string;
  name: string | { en_US: string };
  info: {
    smtp: string;
    admin_email?: string;
    projects?: MailServerProjectAssignment[];
  };
  /** @deprecated Use info.projects instead */
  assigned_users?: Array<string | { _id: string; login?: string; info?: { name?: string } }>;
}

export interface GetAllEmailTemplatesResponse {
  success: boolean;
  data: EmailTemplate[];
  meta: Meta;
  message: string;
}

export interface EmailTemplate extends Record<string, unknown> {
  _id?: string;
  name: string;
  template_content: string;
  include_signature: boolean;
  has_signature_file: boolean;
  created_at: Date;
  updated_at: Date;
  how_many_offers?: string;
  info?: {
    template_content?: string;
    subject?: string;
    body?: string;
    html_body?: string;
    to?: string;
    cc?: string;
    bcc?: string;
    attachments?: string[];
    attachments_ids?: string[];
  };
  type?: string;
  subject?: string;
  /** When populated from API, category_id is an object with _id and name */
  category_id?: string | { _id: string; name: string;[key: string]: unknown };
  category?: { _id: string; name: string };
  signature_file_id?: {
    _id: string;
    filename: string;
    filetype: string;
    path: string;
    size: number;
    type: string;
  };
  gender_type?: 'male' | 'female' | null;
  projects?: Array<{ _id: string; name: string }>;
}

export async function apiGetEmailTemplates(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<GetAllEmailTemplatesResponse>({
    url: `/settings/email_templates`,
    method: 'get',
    params,
  });
}

export async function apiGetEmailTemplate(id: string) {
  return ApiService.fetchDataWithAxios<EmailTemplate>({
    url: `/settings/email_templates/${id}`,
    method: 'get',
  });
}

export async function apiCreateEmailTemplate(data: EmailTemplate | FormData) {
  return ApiService.fetchDataWithAxios<EmailTemplate>({
    url: '/settings/email_templates',
    method: 'post',
    data: data as any,
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
}

export async function apiUpdateEmailTemplate(data: EmailTemplate | FormData, id: string) {
  return ApiService.fetchDataWithAxios<EmailTemplate>({
    url: `/settings/email_templates/${id}`,
    method: 'PUT',
    data: data as any,
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
}

export async function apiDeleteEmailTemplate(id: string) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/settings/email_templates/${id}`,
    method: 'delete',
    // data: { ids: [id] },
  });
}
export async function apiBulkDeleteMailServers(ids: string[]): Promise<any> {
  return ApiService.fetchDataWithAxios<void>({
    url: `/settings/mailservers`,
    method: 'delete',
    data: { ids: ids },
  });
}
export type GetAllMailServersResponse = MailServerInfo[];
export type TGetAllMailServersResponse = {
  data: MailServerInfo[];
  meta: Meta;
};

export async function apiGetSettings(type: string, params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<TGetAllMailServersResponse>({
    url: `/settings/${type}`,
    method: 'get',
    params,
  });
}

export async function apiGetSettingsById(type: string, id: string) {
  return ApiService.fetchDataWithAxios<[]>({
    url: `/settings/${type}/${id}`,
    method: 'get',
  });
}

// Default Filter Rule
export interface DefaultFilterRule {
  field: string;
  operator: string;
  value: string | number | boolean | string[] | [string, string];
}

// Default Grouping Fields Types
export interface DefaultGroupingFieldsRequest {
  user_ids: string[];
  defaultGroupingFields: {
    [modelName: string]: {
      [fieldName: string]: boolean;
    };
  };
  defaultFilter?: {
    [modelName: string]: DefaultFilterRule[];
  };
}

export interface DefaultGroupingFieldsResponse {
  success: boolean;
  message?: string;
  results?: any;
}

// Get default grouping fields for users
export async function apiGetDefaultGroupingFieldsPages(params?: Record<string, unknown>): Promise<DefaultGroupingFieldsResponse> {
  return ApiService.fetchDataWithAxios<DefaultGroupingFieldsResponse>({
    url: '/default-grouping-fields',
    method: 'get',
    params,
  });
}

// Get default grouping fields for users
export async function apiGetDefaultGroupingFields(
  userIds: string[]
): Promise<DefaultGroupingFieldsResponse> {
  return ApiService.fetchDataWithAxios<DefaultGroupingFieldsResponse>({
    url: '/default-grouping-fields',
    method: 'post',
    data: { user_ids: userIds },
  });
}

// Update default grouping fields
export async function apiUpdateDefaultGroupingFields(
  data: DefaultGroupingFieldsRequest
): Promise<DefaultGroupingFieldsResponse> {
  return ApiService.fetchDataWithAxios<DefaultGroupingFieldsResponse>({
    url: '/default-grouping-fields',
    method: 'put',
    data: data as any,
  });
}

export async function apiGetMailServers(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<MailServerInfo[]>({
    url: `/settings/mailservers`,
    method: 'get',
    params,
  });
}

export async function apiGetMailServer(id: string) {
  return ApiService.fetchDataWithAxios<MailServerInfo>({
    url: `/settings/mailservers/${id}`,
    method: 'get',
  });
}

export async function apiDeleteMailServer(id: string) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/settings/mailservers/${id}`,
    method: 'delete',
  });
}

export type CreateMailServerRequest = {
  name: string;
  smtp: string;
  imap: string;
  ssl: number;
  smtp_port: number;
  imap_port: number;
  // New email system fields
  admin_email?: string;
  admin_password?: string;
  auto_approve_emails?: boolean;
  auto_approve_attachments?: boolean;
  // Access control fields
  isRestricted?: boolean;
  allowedAgents?: string[];
  // Projects with assigned agents per project
  projects?: MailServerProjectAssignment[];
  /** @deprecated Use projects instead */
  assigned_users?: string[];
};

export type CreateMailServerResponse = {
  response: number;
  server?: MailServerInfo;
  error?: string;
};

export async function apiCreateMailServer(data: CreateMailServerRequest) {
  return ApiService.fetchDataWithAxios<CreateMailServerResponse>({
    url: '/settings/mailservers',
    method: 'post',
    data,
  });
}

export async function apiUpdateMailServer(data: CreateMailServerRequest, id: string) {
  return ApiService.fetchDataWithAxios<CreateMailServerResponse>({
    url: `/settings/mailservers/${id}`,
    method: 'PUT',
    data,
  });
}

export type TestMailServerConnectionResponse = {
  success: boolean;
  is_validate: boolean;
  message: string;
  error?: string;
};

export async function apiTestMailServerConnection(data: CreateMailServerRequest) {
  return ApiService.fetchDataWithAxios<TestMailServerConnectionResponse>({
    url: '/settings/mailservers/test-connection',
    method: 'POST',
    data,
  });
}

export type CreateVoip = {
  name: string;
  domain: string;
  websocket_address: string;
};
export type CreateVoipServerResponse = {
  response: number;
  server?: VoipServerInfo;
  error?: string;
};

export interface VoipServerInfo {
  _id: string;
  type: string;
  name: string;
  info: {
    domain: string;
    websocket_address: string;
    websocket_port: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export async function apiCreateVoipServer(data: CreateVoip) {
  return ApiService.fetchDataWithAxios<CreateVoipServerResponse>({
    url: '/settings/voipservers',
    method: 'post',
    data,
  });
}

export async function apiUpdateVoipServer(data: CreateVoip, id: string) {
  return ApiService.fetchDataWithAxios<CreateVoipServerResponse>({
    url: `/settings/voipservers/${id}`,
    method: 'PUT',
    data,
  });
}

export async function apiGetVoipServers(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<{ data: VoipServerInfo[]; meta: Meta }>({
    url: `/settings/voipservers`,
    method: 'get',
    params,
  });
}

export async function apiDeleteVoipServer(id: string) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/settings/voipservers/${id}`,
    method: 'delete',
  });
}

export async function apiGetVoipServer(id: string) {
  return ApiService.fetchDataWithAxios<VoipServerInfo>({
    url: `/settings/voipservers/${id}`,
    method: 'get',
  });
}

export interface SearchResult {
  _id: string;
  name: string;
  _type: string;
  _score: number;
  _exactMatch: boolean;
}

export interface SearchResponse {
  status: string;
  message: string;
  data: SearchResult[];
}

export async function apiSearch(query: string) {
  return ApiService.fetchDataWithAxios<SearchResponse>({
    url: `/search`,
    method: 'get',
    params: { query },
  });
}

/*
export type CreateUserRequest = {
  login: string;
  name: string;
  email: string;
  accounting?: string;
  bank?: string;
  dashboard?: string;
  administration?: string;
};

export type CreateUserResponse = {
  id: string;
  login: string;
  name: string;
  email: string;
  accounting?: string;
  bank?: string;
  dashboard?: string;
  administration?: string;
};


export async function apiCreateUser(data: CreateUserRequest) {
  return ApiService.fetchDataWithAxios<CreateUserResponse>({
    url: '/users',
    method: 'post',
    data,
  });
}

export async function apiUpdateUser(id: string, data: User) {
  return ApiService.fetchDataWithAxios<User>({
    url: `/users/${id}`,
    method: 'put',
    data: data as unknown as Record<string, unknown>,
  });
}

export async function apiDeleteUser(id: string) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/users/${id}`,
    method: 'delete',
  });
}
*/
