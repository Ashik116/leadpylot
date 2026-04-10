import ApiService from './ApiService';

export interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface OutboundRoute {
  route_id: number;
  name: string;
  outcid: string;
  outcid_mode: string;
  password: string;
  emergency_route: string;
  seq: number;
  pattern_count: number;
  trunk_count: number;
}

export interface DialPattern {
  id: number;
  route_id: number;
  match_pattern_prefix: string;
  match_pattern_pass: string;
  prepend_digits: string;
  seq: number;
}

export interface RouteTrunk {
  route_id: number;
  trunk_id: number;
  seq: number;
  trunk_name: string;
  tech: string;
  channelid: string;
}

export interface OutboundRouteStatistics {
  totalRoutes: number;
  totalPatterns: number;
  routesWithPatterns: Array<{
    name: string;
    pattern_count: number;
  }>;
}

export interface AddDialPatternData extends Record<string, unknown> {
  pattern: string;
  prepend?: string;
  prefix?: string;
}

export interface UpdateDialPatternData extends Record<string, unknown> {
  pattern?: string;
  prepend?: string;
  prefix?: string;
}

export interface GetAllOutboundRoutesResponse {
  success: boolean;
  data: OutboundRoute[];
  metadata: Meta;
}

export interface GetOutboundRouteResponse {
  success: boolean;
  data: OutboundRoute;
}

export interface GetDialPatternsResponse {
  success: boolean;
  data: DialPattern[];
}

export interface GetRouteTrunksResponse {
  success: boolean;
  data: RouteTrunk[];
}

export interface AddDialPatternResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    routeId: number;
    pattern: string;
    prepend: string;
    prefix: string;
    seq: number;
  };
}

export interface UpdateDialPatternResponse {
  success: boolean;
  message: string;
  data: {
    routeId: number;
    patternId: number;
    pattern?: string;
    prepend?: string;
    prefix?: string;
  };
}

export interface DeleteDialPatternResponse {
  success: boolean;
  message: string;
  data: {
    routeId: number;
    patternId: number;
    pattern: string;
  };
}

export interface GetOutboundRouteStatisticsResponse {
  success: boolean;
  data: OutboundRouteStatistics;
}

/**
 * Get all outbound routes
 */
export async function apiGetOutboundRoutes(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<GetAllOutboundRoutesResponse>({
    url: `/freepbx/outbound-routes`,
    method: 'get',
    params,
  });
}

/**
 * Get outbound route by ID
 */
export async function apiGetOutboundRoute(id: number) {
  return ApiService.fetchDataWithAxios<GetOutboundRouteResponse>({
    url: `/freepbx/outbound-routes/${id}`,
    method: 'get',
  });
}

/**
 * Get dial patterns for a route
 */
export async function apiGetDialPatterns(routeId: number) {
  return ApiService.fetchDataWithAxios<GetDialPatternsResponse>({
    url: `/freepbx/outbound-routes/${routeId}/patterns`,
    method: 'get',
  });
}

/**
 * Get trunks for a route
 */
export async function apiGetRouteTrunks(routeId: number) {
  return ApiService.fetchDataWithAxios<GetRouteTrunksResponse>({
    url: `/freepbx/outbound-routes/${routeId}/trunks`,
    method: 'get',
  });
}

/**
 * Add dial pattern to route
 */
export async function apiAddDialPattern(routeId: number, data: AddDialPatternData) {
  return ApiService.fetchDataWithAxios<AddDialPatternResponse>({
    url: `/freepbx/outbound-routes/${routeId}/patterns`,
    method: 'post',
    data,
  });
}

/**
 * Update dial pattern
 */
export async function apiUpdateDialPattern(
  routeId: number,
  patternId: number,
  data: UpdateDialPatternData
) {
  return ApiService.fetchDataWithAxios<UpdateDialPatternResponse>({
    url: `/freepbx/outbound-routes/${routeId}/patterns/${patternId}`,
    method: 'put',
    data,
  });
}

/**
 * Delete dial pattern
 */
export async function apiDeleteDialPattern(routeId: number, patternId: number) {
  return ApiService.fetchDataWithAxios<DeleteDialPatternResponse>({
    url: `/freepbx/outbound-routes/${routeId}/patterns/${patternId}`,
    method: 'delete',
  });
}

/**
 * Get outbound route statistics
 */
export async function apiGetOutboundRouteStatistics() {
  return ApiService.fetchDataWithAxios<GetOutboundRouteStatisticsResponse>({
    url: `/freepbx/outbound-routes/statistics`,
    method: 'get',
  });
}

