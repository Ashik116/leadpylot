import ApiService from './ApiService';

export interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface InboundRoute {
  extension: string;
  destination: string;
  description: string;
  cidnum: string;
  mohclass: string;
  delay_answer: number;
  destinationType: string;
  destinationValue: string;
}

export interface InboundRouteStatistics {
  total: number;
  byDestinationType: Array<{
    dest_type: string;
    count: number;
  }>;
}

export interface CreateInboundRouteData extends Record<string, unknown> {
  didNumber: string;
  description: string;
  destination: string;
  destinationType?: string;
  cidNum?: string;
}

export interface UpdateInboundRouteData extends Record<string, unknown> {
  description?: string;
  destination?: string;
  destinationType?: string;
  cidNum?: string;
}

export interface GetAllInboundRoutesResponse {
  success: boolean;
  data: InboundRoute[];
  metadata: Meta;
}

export interface GetInboundRouteResponse {
  success: boolean;
  data: InboundRoute;
}

export interface CreateInboundRouteResponse {
  success: boolean;
  message: string;
  data: {
    didNumber: string;
    destination: string;
    destinationType: string;
    description: string;
  };
}

export interface UpdateInboundRouteResponse {
  success: boolean;
  message: string;
  data: InboundRoute;
}

export interface DeleteInboundRouteResponse {
  success: boolean;
  message: string;
  data: {
    didNumber: string;
    description: string;
  };
}

export interface GetInboundRouteStatisticsResponse {
  success: boolean;
  data: InboundRouteStatistics;
}

/**
 * Get all inbound routes
 */
export async function apiGetInboundRoutes(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<GetAllInboundRoutesResponse>({
    url: `/freepbx/inbound-routes`,
    method: 'get',
    params,
  });
}

/**
 * Get inbound route by DID number
 */
export async function apiGetInboundRoute(didNumber: string) {
  return ApiService.fetchDataWithAxios<GetInboundRouteResponse>({
    url: `/freepbx/inbound-routes/${encodeURIComponent(didNumber)}`,
    method: 'get',
  });
}

/**
 * Get inbound route statistics
 */
export async function apiGetInboundRouteStatistics() {
  return ApiService.fetchDataWithAxios<GetInboundRouteStatisticsResponse>({
    url: `/freepbx/inbound-routes/statistics`,
    method: 'get',
  });
}

/**
 * Create a new inbound route
 */
export async function apiCreateInboundRoute(data: CreateInboundRouteData) {
  return ApiService.fetchDataWithAxios<CreateInboundRouteResponse>({
    url: '/freepbx/inbound-routes',
    method: 'post',
    data,
  });
}

/**
 * Update inbound route by DID number
 */
export async function apiUpdateInboundRoute(didNumber: string, data: UpdateInboundRouteData) {
  return ApiService.fetchDataWithAxios<UpdateInboundRouteResponse>({
    url: `/freepbx/inbound-routes/${encodeURIComponent(didNumber)}`,
    method: 'put',
    data,
  });
}

/**
 * Delete inbound route by DID number
 */
export async function apiDeleteInboundRoute(didNumber: string) {
  return ApiService.fetchDataWithAxios<DeleteInboundRouteResponse>({
    url: `/freepbx/inbound-routes/${encodeURIComponent(didNumber)}`,
    method: 'delete',
  });
}

/**
 * Get available destinations (extensions, ring groups, queues)
 */
export interface AvailableDestination {
  value: string;
  label: string;
  type: 'extension' | 'ringgroup' | 'queue';
}

export interface AvailableDestinationsResponse {
  success: boolean;
  data: {
    extensions: AvailableDestination[];
    ringGroups: AvailableDestination[];
    queues: AvailableDestination[];
  };
}

export async function apiGetAvailableDestinations() {
  return ApiService.fetchDataWithAxios<AvailableDestinationsResponse>({
    url: '/freepbx/inbound-routes/available-destinations',
    method: 'get',
  });
}

