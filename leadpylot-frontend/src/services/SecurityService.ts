import ApiService from './ApiService';

export interface SecurityStats {
  totalFailedAttempts: number;
  totalSuccessfulLogins: number;
  activeSessionsCount: number;
  blockedIPsCount: number;
  blockedDevicesCount: number;
  uniqueFailedIPs: number;
  topFailedCountries: Array<{
    _id: string;
    count: number;
  }>;
  timeframe: number;
}

export interface SecurityDashboardData {
  stats: SecurityStats;
  recentFailedAttempts: any[];
  recentSuccessfulLogins: any[];
  activeSessions: any[];
  blockedIPs: any[];
}

export interface LoginAttempt {
  _id: string;
  ipAddress: string;
  login: string;
  attemptType: string;
  createdAt: string;
  userAgent?: string;
  geolocation?: {
    country?: string;
    city?: string;
    region?: string;
  };
}

export interface UserSession {
  _id: string;
  sessionId: string;
  userId: {
    _id: string;
    login: string;
    role: string;
    active: boolean;
  };
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  status: string;
}

export interface BlockedIP {
  _id: string;
  ipAddress: string;
  reason: string;
  blockType: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  notes?: string;
  blockedBy: {
    _id: string;
    login: string;
  };
}

export interface PaginatedResponse<T> {
  data: T;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BlockedIPsData {
  data: BlockedIP[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BlockedDevicesData {
  blocks: BlockedDevice[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BlockIPRequest {
  ipAddress: string;
  reason: string;
  blockType?: string;
  expirationHours?: number;
  notes?: string;
}

export interface BlockedDevice {
  _id: string;
  deviceFingerprint: string;
  blockType: string;
  blockReason: string;
  blockedBy: {
    _id: string;
    login: string;
    role: string;
  } | null;
  blockedAt: string;
  expiresAt?: string;
  attemptCount: number;
  lastAttemptAt?: string;
  userAgent?: string;
  notes: string;
  isActive: boolean;
}

export interface BlockDeviceRequest {
  deviceFingerprint: string;
  reason: string;
  blockType?: string;
  expirationHours?: number;
  notes?: string;
}

// API functions for direct use (following SettingsService pattern)
export const apiGetSuccessfulLogins = (params: {
  page?: number;
  limit?: number;
  timeframe?: number;
  userId?: string;
}) => SecurityService.getSuccessfulLogins(params);

export const apiGetFailedLogins = (params: {
  page?: number;
  limit?: number;
  timeframe?: number;
  ipAddress?: string;
  login?: string;
}) => SecurityService.getFailedLoginAttempts(params);

export const apiGetActiveSessions = (params: {
  page?: number;
  limit?: number;
}) => SecurityService.getActiveSessions(params);

export const apiGetBlockedIPs = (params: {
  page?: number;
  limit?: number;
}) => SecurityService.getBlockedIPs(params);

export const apiGetBlockedDevices = (params: {
  page?: number;
  limit?: number;
}) => SecurityService.getBlockedDevices(params);

export const apiBlockIP = (data: BlockIPRequest) => SecurityService.blockIP(data);

export const apiUnblockIP = (id: string) => SecurityService.unblockIP(id);

export const apiBlockDevice = (data: BlockDeviceRequest) => SecurityService.blockDevice(data);

export const apiUnblockDevice = (id: string) => SecurityService.unblockDevice(id);

export const apiForceLogoutSession = (sessionId: string) => SecurityService.forceLogoutSession(sessionId);

const SecurityService = {
  // Get security statistics
  getSecurityStats(timeframe: number = 24): Promise<{ success: boolean; data: SecurityStats }> {
    return ApiService.fetchDataWithAxios({
      url: `/login-security/stats?timeframe=${timeframe}`,
      method: 'get',
    });
  },

  // Get security dashboard data
  getSecurityDashboard(timeframe: number = 24, limit: number = 5): Promise<{ success: boolean; data: SecurityDashboardData }> {
    return ApiService.fetchDataWithAxios({
      url: `/login-security/dashboard?timeframe=${timeframe}&limit=${limit}`,
      method: 'get',
    });
  },

  // Get failed login attempts
  getFailedLoginAttempts(params: {
    page?: number;
    limit?: number;
    timeframe?: number;
    ipAddress?: string;
    login?: string;
  }): Promise<{ success: boolean; data: PaginatedResponse<LoginAttempt[]> }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    return ApiService.fetchDataWithAxios({
      url: `/login-security/failed-logins?${queryParams}`,
      method: 'get',
    });
  },

  // Get successful logins
  getSuccessfulLogins(params: {
    page?: number;
    limit?: number;
    timeframe?: number;
    userId?: string;
  }): Promise<{ success: boolean; data: PaginatedResponse<LoginAttempt[]> }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    return ApiService.fetchDataWithAxios({
      url: `/login-security/successful-logins?${queryParams}`,
      method: 'get',
    });
  },

  // Get active sessions
  getActiveSessions(params: {
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: PaginatedResponse<UserSession[]> }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        (typeof value !== 'string' || value !== '')
      ) {
        queryParams.append(key, value.toString());
      }
    });

    return ApiService.fetchDataWithAxios({
      url: `/login-security/active-sessions?${queryParams}`,
      method: 'get',
    });
  },

  // Get blocked IPs
  getBlockedIPs(params: {
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: BlockedIPsData }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        (typeof value !== 'string' || value !== '')
      ) {
        queryParams.append(key, value.toString());
      }
    });

    return ApiService.fetchDataWithAxios({
      url: `/login-security/blocked-ips?${queryParams}`,
      method: 'get',
    });
  },

  // Block an IP address
  blockIP(data: BlockIPRequest): Promise<{ success: boolean; data: BlockedIP; message: string }> {
    return ApiService.fetchDataWithAxios({
      url: '/login-security/block-ip',
      method: 'post',
      data,
    });
  },

  // Unblock an IP address
  unblockIP(id: string): Promise<{ success: boolean; message: string }> {
    return ApiService.fetchDataWithAxios({
      url: `/login-security/blocked-ips/${id}`,
      method: 'delete',
    });
  },

  // Block a device
  blockDevice(data: BlockDeviceRequest): Promise<{ success: boolean; data: BlockedDevice; message: string, block?: any }> {
    return ApiService.fetchDataWithAxios({
      url: '/device-security/block',
      method: 'post',
      data,
    });
  },

  // Unblock a device
  unblockDevice(deviceFingerprint: string): Promise<{ success: boolean; message: string }> {
    return ApiService.fetchDataWithAxios({
      url: '/device-security/unblock',
      method: 'post',
      data: { deviceFingerprint },
    });
  },

  // Get blocked devices
  getBlockedDevices(params: {
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: BlockedDevicesData }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        (typeof value !== 'string' || value !== '')
      ) {
        queryParams.append(key, value.toString());
      }
    });

    return ApiService.fetchDataWithAxios({
      url: `/device-security/blocks?${queryParams}`,
      method: 'get',
    });
  },

  // Force logout a session
  forceLogoutSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    return ApiService.fetchDataWithAxios({
      url: `/login-security/force-logout/${sessionId}`,
      method: 'post',
    });
  },
};

export default SecurityService;
