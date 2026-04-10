/**
 * Supervisor Actions Hook
 * Provides functions for call monitoring actions (spy, whisper, barge, disconnect)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ApiService from '@/services/ApiService';

// Types for supervisor actions
export interface SupervisorActionRequest {
  justification: string;
}

export interface SupervisorActionResponse {
  status: string;
  message: string;
  data: {
    sessionId: string;
    callId: string;
    agentExtension: string;
    supervisorExtension?: string;
    ami_response?: string;
  };
}

export interface SupervisorAction {
  _id: string;
  action_type: 'spy' | 'whisper' | 'barge' | 'disconnect' | 'monitor_start' | 'monitor_end';
  status: 'initiated' | 'active' | 'completed' | 'failed' | 'cancelled';
  call_id: string;
  unique_id: string;
  target_channel: string;
  target_extension: string;
  supervisor_id: string;
  supervisor_extension: string;
  supervisor_name: string;
  agent_id?: string;
  agent_extension?: string;
  agent_name?: string;
  project_id?: string;
  project_name?: string;
  lead_id?: string;
  customer_number?: string;
  initiated_at: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds: number;
  compliance_flags: {
    recorded: boolean;
    customer_notified: boolean;
    business_justification: string;
    approval_required: boolean;
    approved_by?: string;
  };
  metadata: Record<string, any>;
  monitoring_session_id: string;
}

export interface SupervisorActionsResponse {
  status: string;
  data: {
    actions: SupervisorAction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    statistics: Array<{
      _id: string;
      count: number;
      success_rate: number;
    }>;
  };
}

export interface SupervisorStatsResponse {
  status: string;
  data: {
    supervisor_id: string;
    total_actions: number;
    action_breakdown: Array<{
      _id: string;
      count: number;
      avg_duration: number;
      success_rate: number;
    }>;
    average_response_time: number;
    period: {
      start?: string;
      end?: string;
    };
  };
}

export interface SupervisorSession {
  sessionId: string;
  type: 'spy' | 'whisper' | 'barge';
  targetChannel: string;
  targetExtension: string;
  supervisorExtension: string;
  startTime: string;
  status: 'active' | 'terminated';
}

export interface SupervisorSessionsResponse {
  status: string;
  data: {
    sessions: SupervisorSession[];
    totalSessions: number;
  };
}

export interface TerminateSessionResponse {
  status: string;
  message: string;
  data: {
    success: boolean;
    sessionId: string;
  };
}

// Query keys
const QUERY_KEYS = {
  supervisorActions: (filters?: Record<string, any>) => ['supervisor-actions', filters],
  supervisorStats: (supervisorId?: string, filters?: Record<string, any>) => ['supervisor-stats', supervisorId, filters],
  supervisorSessions: () => ['supervisor-sessions'],
} as const;

/**
 * Hook for supervisor call actions
 */
export const useSupervisorActions = () => {
  const queryClient = useQueryClient();

  // Spy on call mutation
  const spyMutation = useMutation({
    mutationFn: async (params: { callId: string; justification: string }) => {
      console.log('🔍 useSupervisorActions - spyOnCall params:', params);
      console.log('🔍 useSupervisorActions - URL will be:', `/monitoring/calls/${params.callId}/spy`);
      
      return ApiService.fetchDataWithAxios<SupervisorActionResponse>({
        url: `/monitoring/calls/${params.callId}/spy`,
        method: 'POST',
        data: { justification: params.justification },
      });
    },
    onSuccess: () => {
      // Invalidate active calls query to update UI
      queryClient.invalidateQueries({ queryKey: ['active-calls'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-actions'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.supervisorSessions() });
    },
  });

  // Whisper to agent mutation
  const whisperMutation = useMutation({
    mutationFn: async (params: { callId: string; justification: string }) => {
      return ApiService.fetchDataWithAxios<SupervisorActionResponse>({
        url: `/monitoring/calls/${params.callId}/whisper`,
        method: 'POST',
        data: { justification: params.justification },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-calls'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-actions'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.supervisorSessions() });
    },
  });

  // Barge into call mutation
  const bargeMutation = useMutation({
    mutationFn: async (params: { callId: string; justification: string }) => {
      console.log('🔍 useSupervisorActions - bargeIntoCall params:', params);
      console.log('🔍 useSupervisorActions - URL will be:', `/monitoring/calls/${params.callId}/barge`);
      
      return ApiService.fetchDataWithAxios<SupervisorActionResponse>({
        url: `/monitoring/calls/${params.callId}/barge`,
        method: 'POST',
        data: { justification: params.justification },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-calls'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-actions'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.supervisorSessions() });
    },
  });

  // Disconnect call mutation
  const disconnectMutation = useMutation({
    mutationFn: async (params: { callId: string; justification: string }) => {
      return ApiService.fetchDataWithAxios<SupervisorActionResponse>({
        url: `/monitoring/calls/${params.callId}/disconnect`,
        method: 'POST',
        data: { justification: params.justification },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-calls'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-actions'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.supervisorSessions() });
    },
  });

  return {
    // Action functions
    spyOnCall: spyMutation.mutateAsync,
    whisperToAgent: whisperMutation.mutateAsync,
    bargeIntoCall: bargeMutation.mutateAsync,
    disconnectCall: disconnectMutation.mutateAsync,

    // Loading states
    isLoading: spyMutation.isPending || whisperMutation.isPending || 
               bargeMutation.isPending || disconnectMutation.isPending,
    
    // Individual loading states
    isSpying: spyMutation.isPending,
    isWhispering: whisperMutation.isPending,
    isBarging: bargeMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,

    // Error states
    error: spyMutation.error || whisperMutation.error || 
           bargeMutation.error || disconnectMutation.error,
  };
};

/**
 * Hook to fetch supervisor action history
 */
export const useSupervisorActionHistory = (filters?: {
  page?: number;
  limit?: number;
  project_id?: string;
  supervisor_id?: string;
  action_type?: string;
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: QUERY_KEYS.supervisorActions(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      return ApiService.fetchDataWithAxios<SupervisorActionsResponse>({
        url: `/monitoring/supervisor-actions?${params.toString()}`,
        method: 'GET',
      });
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

/**
 * Hook to fetch supervisor statistics
 */
export const useSupervisorStats = (filters?: {
  supervisor_id?: string;
  start_date?: string;
  end_date?: string;
  project_id?: string;
}) => {
  return useQuery({
    queryKey: QUERY_KEYS.supervisorStats(filters?.supervisor_id, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      return ApiService.fetchDataWithAxios<SupervisorStatsResponse>({
        url: `/monitoring/supervisor-stats?${params.toString()}`,
        method: 'GET',
      });
    },
    refetchInterval: 60000, // Refetch every minute
  });
};

/**
 * Hook for real-time supervisor action updates
 */
export const useRealtimeSupervisorActions = () => {
  const queryClient = useQueryClient();

  // This would integrate with the existing socket connection from useRealtimeMonitoring
  // For now, we'll rely on the polling from the other hooks

  return {
    // This can be extended with socket.io integration
    invalidateActions: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-actions'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-stats'] });
    },
  };
};

/**
 * Hook to fetch active supervisor sessions
 */
export const useSupervisorSessions = () => {
  return useQuery({
    queryKey: QUERY_KEYS.supervisorSessions(),
    queryFn: async () => {
      return ApiService.fetchDataWithAxios<SupervisorSessionsResponse>({
        url: '/monitoring/supervisor-sessions',
        method: 'GET',
      });
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });
};

/**
 * Hook for supervisor session management actions
 */
export const useSupervisorSessionActions = () => {
  const queryClient = useQueryClient();

  // Terminate specific session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return ApiService.fetchDataWithAxios<TerminateSessionResponse>({
        url: `/monitoring/supervisor-sessions/${sessionId}`,
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalidate sessions query to update UI
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.supervisorSessions() });
      queryClient.invalidateQueries({ queryKey: ['active-calls'] });
    },
  });

  // Terminate all sessions mutation
  const terminateAllSessionsMutation = useMutation({
    mutationFn: async () => {
      return ApiService.fetchDataWithAxios<TerminateSessionResponse>({
        url: '/monitoring/supervisor-sessions',
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalidate sessions query to update UI
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.supervisorSessions() });
      queryClient.invalidateQueries({ queryKey: ['active-calls'] });
    },
  });

  return {
    // Action functions
    terminateSession: terminateSessionMutation.mutateAsync,
    terminateAllSessions: terminateAllSessionsMutation.mutateAsync,

    // Loading states
    isTerminating: terminateSessionMutation.isPending || terminateAllSessionsMutation.isPending,
    isTerminatingSession: terminateSessionMutation.isPending,
    isTerminatingAll: terminateAllSessionsMutation.isPending,

    // Error states
    error: terminateSessionMutation.error || terminateAllSessionsMutation.error,
  };
};