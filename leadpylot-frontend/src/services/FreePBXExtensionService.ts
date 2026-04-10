import ApiService from './ApiService';

export interface ExtensionFeatures {
  voicemail?: boolean;
  callRecording?: boolean;
  callWaiting?: boolean;
  callForwarding?: boolean;
  findMeFollowMe?: boolean;
  doNotDisturb?: boolean;
  webrtc?: boolean; // Always true by default
}

export interface Extension {
  extension: string;
  name: string;
  outboundcid: string;
  voicemail: string;
  recording: string;
  tech: string;
  dial: string;
  role: 'admin' | 'agent';
  role_created_at: string | null;
  sip_settings_count: number;
  pjsip_settings_count: number;
}

export interface ExtensionDetails {
  extension: {
    extension: string;
    name: string;
    outboundcid: string;
    voicemail: string;
    recording: string;
    ringtimer: number;
    noanswer: string;
    sipname: string;
    noanswer_cid: string;
    busy_cid: string;
    chanunavail_cid: string;
    noanswer_dest: string;
    busy_dest: string;
    chanunavail_dest: string;
    mohclass: string;
    tech: string;
    dial: string;
    devicetype: string;
    role: 'admin' | 'agent';
  };
  secret: string | null; // Extension password/secret
  sipSettings: Array<{
    keyword: string;
    data: string;
    flags: number;
  }>;
  pjsipSettings: Array<{
    keyword: string;
    data: string;
    flags: number;
  }>;
  features: ExtensionFeatures;
}

export interface CreateExtensionData extends Record<string, unknown> {
  extension: string;
  name: string;
  outboundCID?: string;
  role?: 'admin' | 'agent';
  features?: ExtensionFeatures;
}

export interface CreateExtensionResponse {
  success: boolean;
  message: string;
  data: {
    extension: string;
    name: string;
    outboundCID: string;
    role: 'admin' | 'agent';
    secret: string; // Important: Password for the extension
    features: ExtensionFeatures;
    settingsCount: number;
  };
}

export interface GetAllExtensionsResponse {
  success: boolean;
  data: Extension[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    sortBy: string;
    sortOrder: string;
    filters: {
      search: string | null;
      role: string | null;
      tech: string | null;
    };
  };
}

export interface GetExtensionDetailsResponse {
  success: boolean;
  data: ExtensionDetails;
}

export interface ExtensionStatistics {
  total: number;
  admin_count: number;
  agent_count: number;
  pjsip_count: number;
  voicemail_enabled_count: number;
}

export interface GetExtensionStatisticsResponse {
  success: boolean;
  data: ExtensionStatistics;
}

export interface UpdateRoleResponse {
  success: boolean;
  message: string;
  data: {
    extension: string;
    role: 'admin' | 'agent';
  };
}

export interface DeleteExtensionResponse {
  success: boolean;
  message: string;
  data: {
    extension: string;
    name: string;
    role: 'admin' | 'agent';
  };
}

/**
 * Create a new extension
 */
export async function apiCreateExtension(data: CreateExtensionData) {
  return ApiService.fetchDataWithAxios<CreateExtensionResponse>({
    url: '/freepbx/extensions',
    method: 'post',
    data,
  });
}

/**
 * Get all extensions
 */
export async function apiGetExtensions(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<GetAllExtensionsResponse>({
    url: '/freepbx/extensions',
    method: 'get',
    params,
  });
}

/**
 * Get extension by number with detailed settings
 */
export async function apiGetExtension(extension: string) {
  return ApiService.fetchDataWithAxios<GetExtensionDetailsResponse>({
    url: `/freepbx/extensions/${extension}`,
    method: 'get',
  });
}

/**
 * Get extension statistics
 */
export async function apiGetExtensionStatistics() {
  return ApiService.fetchDataWithAxios<GetExtensionStatisticsResponse>({
    url: '/freepbx/extensions/statistics',
    method: 'get',
  });
}

/**
 * Update extension role
 */
export async function apiUpdateExtensionRole(extension: string, role: 'admin' | 'agent') {
  return ApiService.fetchDataWithAxios<UpdateRoleResponse>({
    url: `/freepbx/extensions/${extension}/role`,
    method: 'put',
    data: { role },
  });
}

/**
 * Update extension
 */
export async function apiUpdateExtension(extension: string, data: Partial<CreateExtensionData>) {
  return ApiService.fetchDataWithAxios<CreateExtensionResponse>({
    url: `/freepbx/extensions/${extension}`,
    method: 'put',
    data,
  });
}

/**
 * Delete extension
 */
export async function apiDeleteExtension(extension: string) {
  return ApiService.fetchDataWithAxios<DeleteExtensionResponse>({
    url: `/freepbx/extensions/${extension}`,
    method: 'delete',
  });
}

