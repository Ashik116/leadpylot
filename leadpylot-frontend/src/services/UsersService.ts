import ApiService from './ApiService';

export interface GetAllUsersResponse {
  data: User[];
  meta: {
    total: number;
  };
}

export type TodoBoardUser = Partial<User>;

export interface TodoBoardUsersResponse {
  success: boolean;
  message?: string;
  data:
    | {
        boardMembers?: TodoBoardUser[];
        availableUsers?: TodoBoardUser[];
      }
    | TodoBoardUser[];
  meta?: Record<string, any>;
}

export interface UserProject {
  project_id: string;
  project_name: string;
  alias_name: string;
  alias_phone_number: string;
  alias_email: string;
  leads_assigned_count: number;
  active_in_project: boolean;
}
export interface UserSources {
  source_id: string;
  source_name: string;
  price: number;
  lead_count: number;
}

export interface OtherPlatformCredential {
  _id?: string;
  userName?: string;
  userEmail?: string;
  userPass?: string;
  link?: string;
  platform_name?: string;
  platform_type?: 'email' | 'telegram' | 'discord' | 'other';
  chat_id?: string | null;
  bot_enabled?: boolean;
  linked_at?: Date | string | null;
}
export interface User {
  _id: string;
  id: number;
  company_id: number;
  info: Info;
  active: boolean;
  login: string;
  password: null;
  action_id: null;
  create_uid: number;
  write_uid: number;
  signature: string;
  share: boolean;
  totp_secret: null;
  notification_type: string;
  odoobot_state: null;
  odoobot_failed: null;
  sale_team_id: null;
  target_sales_won: null;
  target_sales_done: null;
  instance_userid: null;
  anydesk: null;
  instance_status: string;
  instance_password: null;
  instance_message: null;
  backoffice: null;
  instance_config_id: null;
  instance_user_id: null;
  createdAt: Date;
  updatedAt: Date;
  unmask?: boolean;
  name?: string;
  view_type?: 'listView' | 'detailsView';
  color_code?: string;
  image_id?: string;
  __v: number;
  projects?: UserProject[];
  sources?: UserSources[];
  other_platform_credentials?: OtherPlatformCredential[];
  commission_percentage_load?: number;
  commission_percentage_opening?: number;
  voip_extension?: string | null;
  voip_password?: string | null;
  voip_enabled?: boolean;
  /** Office IDs or populated office objects (from API) */
  offices?: { _id: string; name?: string }[] | string[];
  /** Primary office ID or populated object */
  primary_office?: { _id: string; name?: string } | string | null;
}

export interface Info {
  id: number;
  company_id: null;
  create_date: Date;
  name: string;
  title: null;
  parent_id: null;
  user_id: null;
  state_id: null;
  country_id: null;
  industry_id: null;
  color: number;
  commercial_partner_id: number;
  create_uid: number;
  write_uid: number;
  complete_name: string;
  ref: null;
  lang: string;
  tz: null;
  vat: null;
  company_registry: null;
  website: null;
  function: null;
  type: string;
  street: null;
  street2: null;
  zip: null;
  city: null;
  email: null;
  phone: null;
  mobile: null;
  commercial_company_name: null;
  company_name: null;
  date: null;
  comment: null;
  partner_latitude: null;
  partner_longitude: null;
  employee: null;
  is_company: boolean;
  partner_share: boolean;
  write_date: Date;
  contact_address_complete: string;
  message_bounce: number;
  email_normalized: null;
  signup_type: null;
  signup_expiration: null;
  signup_token: null;
  calendar_last_notif_ack: Date;
  team_id: null;
  partner_gid: null;
  additional_info: null;
  phone_sanitized: null;
  ocn_token: null;
  supplier_rank: number;
  customer_rank: number;
  invoice_warn: string;
  invoice_warn_msg: null;
  debit_limit: null;
  last_time_entries_checked: null;
  ubl_cii_format: null;
  peppol_endpoint: null;
  peppol_eas: null;
  online_partner_information: null;
  followup_reminder_type: string;
  vies_valid: boolean;
  account_sepa_lei: null;
  l10n_de_datev_identifier: null;
  l10n_de_datev_identifier_customer: null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  sortBy?: string;
  sortOrder?: string;
  showInactive?: boolean;
  domain?: string; // Domain filters as JSON stringified array
  [key: string]: any; // Allow additional params for flexibility
}

export async function apiGetUsers(params?: PaginationParams | Record<string, unknown>) {
  // Extract known params with defaults
  const {
    page = 1,
    limit = 25,
    search,
    role,
    sortBy,
    sortOrder,
    showInactive,
    domain,
    ...restParams
  } = params || {};

  // Build params object, only including defined values
  const queryParams: Record<string, unknown> = {
    page,
    limit,
    ...(search !== undefined && { search }),
    ...(role !== undefined && { role }),
    ...(sortBy !== undefined && { sortBy }),
    ...(sortOrder !== undefined && { sortOrder }),
    ...(showInactive !== undefined && { showInactive }),
    ...(domain !== undefined && { domain }), // Include domain parameter if provided
    ...restParams, // Include any additional params (for future extensibility)
  };

  return ApiService.fetchDataWithAxios<GetAllUsersResponse>({
    url: '/users',
    method: 'get',
    params: queryParams,
  });
}

export async function apiGetTodoBoardUsers(params?: PaginationParams | Record<string, unknown>) {
  const {
    page = 1,
    limit = 25,
    search,
    role,
    sortBy,
    sortOrder,
    showInactive,
    domain,
    ...restParams
  } = params || {};

  const queryParams: Record<string, unknown> = {
    page,
    limit,
    ...(search !== undefined && { search }),
    ...(role !== undefined && { role }),
    ...(sortBy !== undefined && { sortBy }),
    ...(sortOrder !== undefined && { sortOrder }),
    ...(showInactive !== undefined && { showInactive }),
    ...(domain !== undefined && { domain }),
    ...restParams,
  };

  return ApiService.fetchDataWithAxios<TodoBoardUsersResponse>({
    url: '/api/users/get-users',
    method: 'get',
    params: queryParams,
  });
}

export async function apiGetUser(id: string) {
  return ApiService.fetchDataWithAxios<User>({
    url: `/users/${id}`,
    method: 'get',
  });
}

export type CreateUserRequest = {
  login: string;
  password: string;
  role?: string;
  info: {
    name: string;
    email: string;
  };
  accounting?: string;
  bank?: string;
  dashboard?: string;
  administration?: string;
  unmask?: boolean;
  view_type?: 'listView' | 'detailsView';
  color_code?: string;
  image_id?: string;
  offices?: string[];
  primary_office?: string | null;
  mail_servers?: string[];
  voip_extension?: string;
  voip_password?: string;
  voip_enabled?: boolean;
  other_platform_credentials?: OtherPlatformCredential[];
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
  // Ensure we're sending a properly structured user object
  // Extract only the fields we need to update to avoid sending unnecessary data
  const updatePayload: any = {
    login: data.login,
    role: (data as any).role, // Include role field for updates
    active: data.active,
    unmask: data.unmask, // Include unmask field for updates
    view_type: data.view_type, // Include view_type field for updates
    color_code: data.color_code, // Include color_code field for updates
    image_id: data.image_id, // Include image_id field for updates
    commission_percentage_load: data.commission_percentage_load !== undefined && data.commission_percentage_load !== null ? data.commission_percentage_load : undefined,
    commission_percentage_opening: data.commission_percentage_opening !== undefined && data.commission_percentage_opening !== null ? data.commission_percentage_opening : undefined,
    info: data.info
      ? {
        name: data.info.name,
        email: data.info.email,
        lang: data.info.lang,
        phone: data.info.phone,
        mobile: data.info.mobile,
        street: data.info.street,
        city: data.info.city,
        zip: data.info.zip,
        website: data.info.website,
      }
      : undefined,
  };

  // Include VoIP fields if present
  if ((data as any).voip_extension !== undefined) {
    updatePayload.voip_extension = (data as any).voip_extension || null;
  }
  if ((data as any).voip_password !== undefined) {
    updatePayload.voip_password = (data as any).voip_password || null;
  }
  if ((data as any).voip_enabled !== undefined) {
    updatePayload.voip_enabled = (data as any).voip_enabled;
  }

  // Include other_platform_credentials if present
  if ((data as any).other_platform_credentials !== undefined) {
    updatePayload.other_platform_credentials = (data as any).other_platform_credentials;
  }

  // Include mail_servers for user mail server assignment
  if ((data as any).mail_servers !== undefined) {
    updatePayload.mail_servers = Array.isArray((data as any).mail_servers)
      ? (data as any).mail_servers.map((ms: string | { _id: string }) => (typeof ms === 'string' ? ms : ms._id))
      : [];
  }

  // Include offices and primary_office for user office assignment
  if ((data as any).offices !== undefined) {
    updatePayload.offices = Array.isArray((data as any).offices)
      ? (data as any).offices.map((o: string | { _id: string }) => (typeof o === 'string' ? o : o._id))
      : [];
  }
  if ((data as any).primary_office !== undefined && (data as any).primary_office !== null) {
    const po = (data as any).primary_office;
    updatePayload.primary_office = typeof po === 'string' ? po : po?._id ?? null;
  } else if ((data as any).primary_office === null) {
    updatePayload.primary_office = null;
  }

  return ApiService.fetchDataWithAxios<User>({
    url: `/users/${id}`,
    method: 'put',
    data: updatePayload,
  });
}

export async function apiDeleteUser(id: string) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/users/${id}`,
    method: 'delete',
  });
}

export type BulkDeleteUsersRequest = {
  ids: string[];
};

export async function apiUserBulkDelete(data: BulkDeleteUsersRequest) {
  return ApiService.fetchDataWithAxios<void>({
    url: '/users',
    method: 'delete',
    data,
  });
}

export type ChangePasswordRequest = {
  newPassword: string;
};

export async function apiChangeUserPassword(id: string, data: ChangePasswordRequest) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/auth/change-password/${id}`,
    method: 'post',
    data,
  });
}

export interface DecryptCredentialResponse {
  status: string;
  data: {
    userId: string;
    userLogin: string;
    credential: OtherPlatformCredential & { _id: string };
  };
  message: string;
}

export async function apiDecryptCredentialPassword(
  userId: string,
  credentialId: string,
  adminPassword: string
) {
  return ApiService.fetchDataWithAxios<DecryptCredentialResponse>({
    url: `/credentials/user/${userId}/decrypt/password/${credentialId}`,
    method: 'post',
    data: {
      adminPassword,
    },
  });
}

// Bot credential management types and functions
export interface UpdateBotCredentialRequest {
  platform_type: 'email' | 'telegram' | 'discord' | 'other';
  platform_name: string;
  chat_id?: string | null;
  bot_enabled?: boolean;
}

export interface UpdateBotCredentialResponse {
  success: boolean;
  user?: User;
  message?: string;
}

export async function apiUpdateBotCredential(
  userId: string,
  data: UpdateBotCredentialRequest
) {
  return ApiService.fetchDataWithAxios<UpdateBotCredentialResponse>({
    url: `/users/${userId}/bot-credentials`,
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });
}

export async function apiToggleBotCredential(
  userId: string,
  credentialId: string,
  bot_enabled: boolean
) {
  return ApiService.fetchDataWithAxios<UpdateBotCredentialResponse>({
    url: `/users/${userId}/bot-credentials/${credentialId}`,
    method: 'put',
    data: { bot_enabled } as Record<string, unknown>,
  });
}

export async function apiRemoveBotCredential(
  userId: string,
  credentialId: string
) {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
    url: `/users/${userId}/bot-credentials/${credentialId}`,
    method: 'delete',
  });
}
