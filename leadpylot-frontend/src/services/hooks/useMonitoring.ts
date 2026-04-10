/**
 * Real-time Call Monitoring Hooks
 * Provides live monitoring data for admin users with optimistic Socket.IO updates
 * Connects to call-service (4010) for real-time call/agent events
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from '@/hooks/useSession';
import {
  apiGetActiveCalls,
  apiGetAgentStatus,
  apiGetSystemStatus,
  apiGetCallDetails,
  type MonitoringData,
  type ActiveCall,
} from '../MonitoringService';
import { io, type Socket } from 'socket.io-client';
import { MICROSERVICES } from '@/configs/microservices.config';
import { Role } from '@/configs/navigation.config/auth.route.config';

const CALL_SERVICE_URL = MICROSERVICES.CALL_SERVICE.baseUrl;

/**
 * Hook for fetching active calls data
 * Polling at 5s as a safety net; primary updates come from Socket.IO via useRealtimeMonitoring
 */
export const useActiveCalls = (options?: { enabled?: boolean; refetchInterval?: number }) => {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useQuery({
    queryKey: ['monitoring', 'active-calls'],
    queryFn: async () => {
      const response = await apiGetActiveCalls();
      return (response as any)?.data ?? response;
    },
    enabled: status !== 'loading' && isAdmin && options?.enabled !== false,
    refetchInterval: options?.refetchInterval ?? 5000,
    refetchIntervalInBackground: false,
    staleTime: 3000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook for fetching agent status data
 * Polling at 10s as a safety net; primary updates come from Socket.IO
 */
export const useAgentStatus = (options?: { enabled?: boolean; refetchInterval?: number }) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useQuery({
    queryKey: ['monitoring', 'agent-status'],
    queryFn: async () => {
      const response = await apiGetAgentStatus();
      return (response as any)?.data ?? response;
    },
    enabled: isAdmin && options?.enabled !== false,
    refetchInterval: options?.refetchInterval || 10000,
    refetchIntervalInBackground: false,
    staleTime: 5000,
  });
};

/**
 * Hook for monitoring system status
 */
export const useMonitoringSystemStatus = () => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useQuery({
    queryKey: ['monitoring', 'system-status'],
    queryFn: async () => {
      const response = await apiGetSystemStatus();
      return (response as any)?.data ?? response;
    },
    enabled: isAdmin,
    refetchInterval: 60000,
    staleTime: 30000,
  });
};

/**
 * Hook for getting specific call details
 */
export const useCallDetails = (callId: string, enabled: boolean = false) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return useQuery({
    queryKey: ['monitoring', 'call-details', callId],
    queryFn: async () => {
      const response = await apiGetCallDetails(callId);
      return response.data;
    },
    enabled: isAdmin && enabled && !!callId,
    staleTime: 5000,
  });
};

/** Helper: get activeCalls from cache (handles both { data } and flat structure) */
const getCallsFromCache = (old: any): ActiveCall[] =>
  old?.data?.activeCalls ?? old?.activeCalls ?? [];

/** Helper: update cache with new calls */
const updateCacheWithCalls = (old: any, updatedCalls: ActiveCall[]) => {
  const base = old?.data ? { ...old, data: { ...old.data } } : { ...old };
  const target = base.data ?? base;
  target.activeCalls = updatedCalls;
  target.totalCalls = updatedCalls.length;
  target.connectedCalls = updatedCalls.filter((c) => c.status === 'connected').length;
  target.ringingCalls = updatedCalls.filter((c) => c.status === 'ringing').length;
  target.timestamp = new Date().toISOString();
  return base;
};

/**
 * Hook for real-time monitoring with Socket.IO
 * Connects to call-service (4010) for real-time call/agent events
 * Optimistically updates React Query cache on events, then reconciles with background refetch
 */
export const useRealtimeMonitoring = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const isAdmin = session?.user?.role === Role.ADMIN;
  const token =
    (session as any)?.accessToken ?? (session as any)?.token ?? (session as any)?.user?.accessToken;

  const optimisticUpdateCall = useCallback(
    (callData: ActiveCall, action: 'add' | 'update' | 'remove') => {
      queryClient.setQueryData(['monitoring', 'active-calls'], (old: any) => {
        if (!old) return old;
        const currentCalls = getCallsFromCache(old);
        let updatedCalls: ActiveCall[];

        switch (action) {
          case 'add': {
            const exists = currentCalls.some((c) => c.callId === callData.callId);
            updatedCalls = exists
              ? currentCalls.map((c) => (c.callId === callData.callId ? { ...c, ...callData } : c))
              : [callData, ...currentCalls];
            break;
          }
          case 'update': {
            updatedCalls = currentCalls.map((c) =>
              c.callId === callData.callId ? { ...c, ...callData } : c
            );
            break;
          }
          case 'remove': {
            updatedCalls = currentCalls.filter((c) => c.callId !== callData.callId);
            break;
          }
          default:
            updatedCalls = currentCalls;
        }

        return updateCacheWithCalls(old, updatedCalls);
      });
      setLastUpdate(new Date().toISOString());
    },
    [queryClient]
  );

  const reconcile = useCallback(
    (queryKey: string[]) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 2000);
    },
    [queryClient]
  );

  useEffect(() => {
    if (!isAdmin || !token) return;

    const socket = io(CALL_SERVICE_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    socketRef.current = socket;

    const handleCallInitiated = (callData: ActiveCall) => {
      optimisticUpdateCall(callData, 'add');
      reconcile(['monitoring', 'active-calls']);
      reconcile(['monitoring', 'agent-status']);
    };

    const handleCallRinging = (callData: ActiveCall) => {
      optimisticUpdateCall(callData, 'update');
    };

    const handleCallConnected = (callData: ActiveCall) => {
      optimisticUpdateCall(callData, 'update');
      reconcile(['monitoring', 'agent-status']);
    };

    const handleCallEnded = (callData: ActiveCall) => {
      optimisticUpdateCall(callData, 'remove');
      reconcile(['monitoring', 'active-calls']);
      reconcile(['monitoring', 'agent-status']);
    };

    const handleAgentStatusChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'agent-status'] });
      setLastUpdate(new Date().toISOString());
    };

    const handleAgentStatusUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'agent-status'] });
      setLastUpdate(new Date().toISOString());
    };

    const handleActiveCallsUpdate = (data: { activeCalls?: ActiveCall[]; totalCalls?: number; connectedCalls?: number; ringingCalls?: number; timestamp?: string }) => {
      const payload = {
        activeCalls: data.activeCalls ?? [],
        totalCalls: data.totalCalls ?? data.activeCalls?.length ?? 0,
        connectedCalls: data.connectedCalls ?? 0,
        ringingCalls: data.ringingCalls ?? 0,
        timestamp: data.timestamp ?? new Date().toISOString(),
      };
      queryClient.setQueryData(['monitoring', 'active-calls'], payload);
      setLastUpdate(new Date().toISOString());
    };

    const handleSupervisorActionInitiated = () => {
      reconcile(['monitoring', 'active-calls']);
      queryClient.invalidateQueries({ queryKey: ['supervisor-actions'] });
    };

    const handleSupervisorActionStatusUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-actions'] });
    };

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('call:initiated', handleCallInitiated);
    socket.on('call:ringing', handleCallRinging);
    socket.on('call:connected', handleCallConnected);
    socket.on('call:ended', handleCallEnded);
    socket.on('agent:status_changed', handleAgentStatusChanged);
    socket.on('agent_status_update', handleAgentStatusUpdate);
    socket.on('active_calls_update', handleActiveCallsUpdate);
    socket.on('supervisor:action_initiated', handleSupervisorActionInitiated);
    socket.on('supervisor:action_status_update', handleSupervisorActionStatusUpdate);
    socket.on('supervisor:action_notification', () => {});

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAdmin, token, optimisticUpdateCall, reconcile, queryClient]);

  return {
    isConnected,
    lastUpdate,
    isAdmin,
  };
};
