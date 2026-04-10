import { useQuery, UseQueryResult } from '@tanstack/react-query';
import SecurityService, {
  LoginAttempt,
  UserSession,
  BlockedIP,
  SecurityStats,
} from '../SecurityService';

export interface SuccessfulLoginParams {
  page?: number;
  limit?: number;
  timeframe?: number;
  userId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface FailedLoginParams {
  page?: number;
  limit?: number;
  timeframe?: number;
  ipAddress?: string;
  login?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface ActiveSessionParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface BlockedIPParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

// Hook for successful logins
export const useSuccessfulLogins = (
  params: SuccessfulLoginParams = {}
): UseQueryResult<{
  data: any[];
  meta: { total: number; page: number; limit: number; pages: number };
}> => {
  const { page = 1, limit = 10, timeframe, userId, search, sortBy, sortOrder } = params;

  return useQuery({
    queryKey: ['successful-logins', { page, limit, timeframe, userId, search, sortBy, sortOrder }],
    queryFn: async () => {
      const result = await SecurityService.getSuccessfulLogins({
        page,
        limit,
        timeframe,
        userId,
      });

      if (!result.success) {
        throw new Error('Failed to fetch successful logins');
      }

      return {
        data: result.data.data,
        meta: {
          total: result.data.pagination.total,
          page: result.data.pagination.page,
          limit: result.data.pagination.limit,
          pages: result.data.pagination.pages,
        },
      };
    },
    // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook for failed login attempts
export const useFailedLogins = (
  params: FailedLoginParams = {}
): UseQueryResult<{
  data: LoginAttempt[];
  meta: { total: number; page: number; limit: number; pages: number };
}> => {
  const { page = 1, limit = 10, timeframe, ipAddress, login, search, sortBy, sortOrder } = params;

  return useQuery({
    queryKey: [
      'failed-logins',
      { page, limit, timeframe, ipAddress, login, search, sortBy, sortOrder },
    ],
    queryFn: async () => {
      const result = await SecurityService.getFailedLoginAttempts({
        page,
        limit,
        timeframe: timeframe ?? undefined,
        ipAddress,
        login,
      });

      if (!result.success) {
        throw new Error('Failed to fetch failed logins');
      }

      return {
        data: result.data.data,
        meta: {
          total: result.data.pagination.total,
          page: result.data.pagination.page,
          limit: result.data.pagination.limit,
          pages: result.data.pagination.pages,
        },
      };
    },
    // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook for active sessions
export const useActiveSessions = (
  params: ActiveSessionParams = {}
): UseQueryResult<{
  data: UserSession[];
  meta: { total: number; page: number; limit: number; pages: number };
}> => {
  const { page = 1, limit = 10, search, sortBy, sortOrder } = params;

  return useQuery({
    queryKey: ['active-sessions', { page, limit, search, sortBy, sortOrder }],
    queryFn: async () => {
      const result = await SecurityService.getActiveSessions({
        page,
        limit,
      });

      if (!result.success) {
        throw new Error('Failed to fetch active sessions');
      }

      return {
        data: result.data.data,
        meta: {
          total: result.data.pagination.total,
          page: result.data.pagination.page,
          limit: result.data.pagination.limit,
          pages: result.data.pagination.pages,
        },
      };
    },
    staleTime: 30 * 1000, // 30 seconds (more frequent for sessions)
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
};

// Hook for blocked IPs
export const useBlockedIPs = (
  params: BlockedIPParams = {}
): UseQueryResult<{
  data: BlockedIP[];
  meta: { total: number; page: number; limit: number; pages: number };
}> => {
  const { page = 1, limit = 10, search, sortBy, sortOrder } = params;

  return useQuery({
    queryKey: ['blocked-ips', { page, limit, search, sortBy, sortOrder }],
    queryFn: async () => {
      const result = await SecurityService.getBlockedIPs({
        page,
        limit,
      });

      if (!result.success) {
        throw new Error('Failed to fetch blocked IPs');
      }

      return {
        data: result.data.data,
        meta: {
          total: result.data.pagination.total,
          page: result.data.pagination.page,
          limit: result.data.pagination.limit,
          pages: result.data.pagination.pages,
        },
      };
    },
    // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook for security stats
export const useSecurityStats = (timeframe: number = 24): UseQueryResult<SecurityStats> => {
  return useQuery({
    queryKey: ['security-stats', timeframe],
    queryFn: async () => {
      const result = await SecurityService.getSecurityStats(timeframe);

      if (!result.success) {
        throw new Error('Failed to fetch security stats');
      }

      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });
};
