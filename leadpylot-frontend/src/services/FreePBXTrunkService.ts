import ApiService from './ApiService';

export interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Trunk {
  trunkid: number;
  name: string;
  tech: string;
  channelid: string;
  outcid: string;
  disabled: string;
  maxchans: string;
  dialoutprefix: string;
  pjsip_settings_count: number;
  sip_server?: string;
  contact?: string;
}

export interface TrunkDetails {
  trunk: {
    trunkid: number;
    tech: string;
    channelid: string;
    name: string;
    outcid: string;
    keepcid: string;
    maxchans: string;
    failscript: string;
    dialoutprefix: string;
    usercontext: string;
    provider: string;
    disabled: string;
    continue: string;
    routedisplay: string;
    trunk_name: string;
  };
  pjsipSettings: Array<{
    keyword: string;
    data: string;
    flags: number;
  }>;
}

export interface TrunkStatistics {
  total: number;
  byTechnology: Array<{
    tech: string;
    count: number;
    enabled_count: number;
    disabled_count: number;
  }>;
}

export interface CreateTrunkData extends Record<string, unknown> {
  name: string;
  sipServer: string;
  outboundCID: string;
}

export interface UpdateTrunkData extends Record<string, unknown> {
  name?: string;
  sipServer?: string;
  outboundCID?: string;
  disabled?: string | boolean;
  maxchans?: string;
}

export interface UpdateTrunkResponse {
  success: boolean;
  message: string;
  data: TrunkDetails;
}

export interface GetAllTrunksResponse {
  success: boolean;
  metadata: Meta;
  data: Trunk[];
}

export interface GetTrunkDetailsResponse {
  success: boolean;
  data: TrunkDetails;
}

export interface GetTrunkStatisticsResponse {
  success: boolean;
  data: TrunkStatistics;
}

export interface CreateTrunkResponse {
  success: boolean;
  message: string;
  data: {
    trunkId: number;
    name: string;
    sipServer: string;
    outboundCID: string;
    settingsCount: number;
  };
}

export interface DeleteTrunkResponse {
  success: boolean;
  message: string;
  data: {
    name: string;
    tech: string;
  };
}

export interface ReloadResponse {
  success: boolean;
  message: string;
  type: string;
  data: any;
}

export interface ReloadStatusResponse {
  success: boolean;
  data: {
    available: boolean;
    status: string;
    message: string;
  };
}

/**
 * Get all trunks
 */
export async function apiGetTrunks(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<GetAllTrunksResponse>({
    url: `/freepbx/trunks`,
    method: 'get',
    params,
  });
}

/**
 * Get trunk by ID with detailed settings
 */
export async function apiGetTrunk(id: number) {
  return ApiService.fetchDataWithAxios<GetTrunkDetailsResponse>({
    url: `/freepbx/trunks/${id}`,
    method: 'get',
  });
}

/**
 * Get trunk statistics
 */
export async function apiGetTrunkStatistics() {
  return ApiService.fetchDataWithAxios<GetTrunkStatisticsResponse>({
    url: `/freepbx/trunks/statistics`,
    method: 'get',
  });
}

/**
 * Create a new trunk with standard PJSIP configuration (33 settings)
 */
export async function apiCreateTrunk(data: CreateTrunkData) {
  return ApiService.fetchDataWithAxios<CreateTrunkResponse>({
    url: '/freepbx/trunks',
    method: 'post',
    data,
  });
}

/**
 * Update trunk by ID
 */
export async function apiUpdateTrunk(id: number, data: UpdateTrunkData) {
  return ApiService.fetchDataWithAxios<UpdateTrunkResponse>({
    url: `/freepbx/trunks/${id}`,
    method: 'put',
    data,
  });
}

/**
 * Delete trunk by ID
 */
export async function apiDeleteTrunk(id: number) {
  return ApiService.fetchDataWithAxios<DeleteTrunkResponse>({
    url: `/freepbx/trunks/${id}`,
    method: 'delete',
  });
}

/**
 * Reload FreePBX configuration
 */
export async function apiReloadFreePBX(full: boolean = true) {
  return ApiService.fetchDataWithAxios<ReloadResponse>({
    url: '/freepbx/reload',
    method: 'post',
    data: { full },
  });
}

/**
 * Check reload endpoint status
 */
export async function apiGetReloadStatus() {
  return ApiService.fetchDataWithAxios<ReloadStatusResponse>({
    url: '/freepbx/reload/status',
    method: 'get',
  });
}

