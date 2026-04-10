/**
 * Monitoring Service
 * API functions for real-time call monitoring and agent status
 */

import ApiService from './ApiService';

// Types for monitoring data
export interface ActiveCall {
  callId: string;
  uniqueId: string;
  extension: string;
  agentId?: string;
  direction: 'inbound' | 'outbound';
  status: 'initiated' | 'ringing' | 'connected' | 'ended';
  phoneNumber: string;
  startTime: string;
  connectTime?: string;
  duration: number;
  currentDuration: number;
  agent?: {
    id: string;
    name: string;
    login: string;
    email: string;
  };
  lead?: {
    id: string;
    name: string;
    phone: string;
    project: string;
  };
}

export interface AgentStatus {
  id: string;
  combinationId: string; // Unique ID for agent-project-extension combination
  name: string;
  login: string;
  extension: string;
  sipUsername: string;
  aliasName: string;
  project: string;
  projectId: string;
  status: 'available' | 'in_call' | 'offline';
  isOnline: boolean;
  extensionStatus: string;
  isSelected?: boolean; // NEW: indicates if this is the agent's currently selected extension
  selectedExtension?: string; // NEW: agent's currently selected extension
  currentCall?: {
    callId: string;
    direction: 'inbound' | 'outbound';
    phoneNumber: string;
    duration: number;
    callStatus: string;
    project: string;
  };
  lastActivity: string;
}

export interface MonitoringData {
  activeCalls: ActiveCall[];
  totalCalls: number;
  connectedCalls: number;
  ringingCalls: number;
  timestamp: string;
}

export interface AgentStatusData {
  agents: AgentStatus[];
  summary: {
    totalAgents: number;
    totalExtensions: number; // Same as totalAgents since extensions are unique
    availableAgents: number;
    agentsInCall: number;
    offlineAgents: number;
    // Keep these for backward compatibility
    totalCombinations: number;
    availableCombinations: number;
    inCallCombinations: number;
    offlineCombinations: number;
  };
  amiConnected: boolean;
  timestamp: string;
}

export interface SystemStatus {
  amiConnection: {
    connected: boolean;
    lastCheck: string;
  };
  activeCalls: {
    total: number;
    connected: number;
  };
  monitoring: {
    enabled: boolean;
    version: string;
    features: {
      realTimeMonitoring: boolean;
      callRecording: boolean;
      agentStatus: boolean;
      leadAssociation: boolean;
      supervisorActions: boolean;
    };
  };
}

/**
 * Get active calls for monitoring dashboard
 */
export const apiGetActiveCalls = async (): Promise<{ status: string; data: MonitoringData }> => {
  return ApiService.fetchDataWithAxios({
    url: '/monitoring/active-calls',
    method: 'GET',
  });
};

/**
 * Get agent status and availability
 */
export const apiGetAgentStatus = async (): Promise<{ status: string; data: AgentStatusData }> => {
  return ApiService.fetchDataWithAxios({
    url: '/monitoring/agent-status', 
    method: 'GET',
  });
};

/**
 * Get monitoring system status
 */
export const apiGetSystemStatus = async (): Promise<{ status: string; data: SystemStatus }> => {
  return ApiService.fetchDataWithAxios({
    url: '/monitoring/system-status',
    method: 'GET',
  });
};

/**
 * Get specific call details
 */
export const apiGetCallDetails = async (callId: string): Promise<{ status: string; data: ActiveCall }> => {
  return ApiService.fetchDataWithAxios({
    url: `/monitoring/calls/${callId}`,
    method: 'GET',
  });
};

/**
 * Update agent-extension mapping (admin only)
 */
export const apiUpdateAgentExtension = async (data: { agentId: string; extension: string }): Promise<{ status: string; data: any }> => {
  return ApiService.fetchDataWithAxios({
    url: '/monitoring/agent-extension',
    method: 'POST',
    data,
  });
};

/**
 * Update agent's own extension mapping (agent self-registration)
 */
export const apiUpdateMyExtension = async (data: { extension: string }): Promise<{ status: string; data: any }> => {
  return ApiService.fetchDataWithAxios({
    url: '/monitoring/my-extension',
    method: 'POST',
    data,
  });
};

// Future supervisor actions (currently return not implemented status)
export const apiSpyOnCall = async (callId: string): Promise<{ status: string; message: string }> => {
  return ApiService.fetchDataWithAxios({
    url: `/monitoring/calls/${callId}/spy`,
    method: 'POST',
  });
};

export const apiWhisperToAgent = async (callId: string, message: string): Promise<{ status: string; message: string }> => {
  return ApiService.fetchDataWithAxios({
    url: `/monitoring/calls/${callId}/whisper`,
    method: 'POST',
    data: { message },
  });
};

export const apiBargeIntoCall = async (callId: string): Promise<{ status: string; message: string }> => {
  return ApiService.fetchDataWithAxios({
    url: `/monitoring/calls/${callId}/barge`,
    method: 'POST',
  });
};
