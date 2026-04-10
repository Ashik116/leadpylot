/**
 * Notification Rules Service
 * API service for managing admin-configurable notification rules
 */

import ApiService from './ApiService';

// Types
export interface NotificationRule {
  _id: string;
  eventType: string;
  displayName: string;
  description: string;
  category: 'leads' | 'offers' | 'email' | 'auth' | 'project' | 'task' | 'document' | 'system' | 'other';
  enabled: boolean;
  scope: {
    type: 'global' | 'project';
    projectId?: string;
  };
  recipients: {
    roles: string[];
    specificUsers: string[];
    dynamicTargets: {
      assignedAgent: boolean;
      projectAgents: boolean;
      leadOwner: boolean;
      creator: boolean;
      mentionedUsers: boolean;
    };
    excludeCreator: boolean;
  };
  channels: {
    inApp: boolean;
    email: boolean;
  };
  priority: 'low' | 'medium' | 'high';
  customTitle?: string;
  customMessage?: string;
  isDefault: boolean;
  createdBy?: {
    _id: string;
    login: string;
    alias_name?: string;
  };
  updatedBy?: {
    _id: string;
    login: string;
    alias_name?: string;
  };
  createdAt: string;
  updatedAt: string;
  audio?: {
    _id: string;
    filename: string;
    path: string;
    size: number;
    assignmentCount?: number;
    formattedSize?: string;
    id: string;
  };
}

export interface EventType {
  key: string;
  type: string;
  category: string;
  priority: string;
  title: string;
  messageTemplate: string;
  targetRoles: string[];
}

export interface NotificationRulesResponse {
  success: boolean;
  data: NotificationRule[];
  grouped: Record<string, NotificationRule[]>;
  total: number;
}

export interface EventTypesResponse {
  success: boolean;
  data: EventType[];
  grouped: Record<string, EventType[]>;
  total: number;
}

export interface AnalyticsResponse {
  success: boolean;
  data: {
    byEventType: Array<{
      _id: string;
      statuses: Array<{ status: string; count: number }>;
      total: number;
    }>;
    totals: {
      delivered: number;
      failed: number;
      skipped: number;
      pending: number;
    };
    period: {
      startDate: string;
      endDate: string;
    };
  };
}

export interface CreateRulePayload {
  eventType: string;
  displayName: string;
  description?: string;
  category?: NotificationRule['category'];
  enabled?: boolean;
  scope?: {
    type: 'global' | 'project';
    projectId?: string;
  };
  recipients?: Partial<NotificationRule['recipients']>;
  channels?: Partial<NotificationRule['channels']>;
  priority?: NotificationRule['priority'];
  customTitle?: string;
  customMessage?: string;
}

export interface UpdateRulePayload extends Partial<CreateRulePayload> {}

const BASE_URL = '/notification-rules';

/**
 * Get all notification rules
 */
export const apiGetNotificationRules = async (params?: {
  category?: string;
  eventType?: string;
  enabled?: boolean;
  scope?: 'global' | 'project';
}): Promise<NotificationRulesResponse> => {
  return ApiService.fetchDataWithAxios<NotificationRulesResponse>({
    url: BASE_URL,
    method: 'get',
    params,
  });
};

/**
 * Get a single notification rule by ID
 */
export const apiGetNotificationRuleById = async (id: string): Promise<{ success: boolean; data: NotificationRule }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; data: NotificationRule }>({
    url: `${BASE_URL}/${id}`,
    method: 'get',
  });
};

/**
 * Get rule by event type
 */
export const apiGetRuleByEventType = async (
  eventType: string,
  projectId?: string
): Promise<{ success: boolean; data: NotificationRule }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; data: NotificationRule }>({
    url: `${BASE_URL}/by-event/${eventType}`,
    method: 'get',
    params: projectId ? { projectId } : undefined,
  });
};

/**
 * Get all available event types
 */
export const apiGetEventTypes = async (): Promise<EventTypesResponse> => {
  return ApiService.fetchDataWithAxios<EventTypesResponse>({
    url: `${BASE_URL}/event-types`,
    method: 'get',
  });
};

/**
 * Get notification delivery analytics
 */
export const apiGetNotificationAnalytics = async (params?: {
  startDate?: string;
  endDate?: string;
  eventType?: string;
}): Promise<AnalyticsResponse> => {
  return ApiService.fetchDataWithAxios<AnalyticsResponse>({
    url: `${BASE_URL}/analytics`,
    method: 'get',
    params,
  });
};

/**
 * Create a new notification rule
 */
export const apiCreateNotificationRule = async (
  payload: CreateRulePayload
): Promise<{ success: boolean; data: NotificationRule; message: string }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; data: NotificationRule; message: string }>({
    url: BASE_URL,
    method: 'post',
    data: payload as unknown as Record<string, unknown>,
  });
};

/**
 * Update a notification rule
 */
export const apiUpdateNotificationRule = async (
  id: string,
  payload: UpdateRulePayload
): Promise<{ success: boolean; data: NotificationRule; message: string }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; data: NotificationRule; message: string }>({
    url: `${BASE_URL}/${id}`,
    method: 'put',
    data: payload,
  });
};

/**
 * Toggle notification rule enabled status
 */
export const apiToggleNotificationRule = async (
  id: string
): Promise<{ success: boolean; data: NotificationRule; message: string }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; data: NotificationRule; message: string }>({
    url: `${BASE_URL}/${id}/toggle`,
    method: 'patch',
  });
};

/**
 * Reset rule to default settings
 */
export const apiResetNotificationRule = async (
  id: string
): Promise<{ success: boolean; data: NotificationRule; message: string }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; data: NotificationRule; message: string }>({
    url: `${BASE_URL}/${id}/reset`,
    method: 'patch',
  });
};

/**
 * Send a test notification using a rule
 */
export const apiTestNotificationRule = async (
  id: string
): Promise<{ success: boolean; message: string; notification: { id: string; type: string; title: string; message: string } }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string; notification: any }>({
    url: `${BASE_URL}/${id}/test`,
    method: 'post',
  });
};

/**
 * Delete a notification rule
 */
export const apiDeleteNotificationRule = async (id: string): Promise<{ success: boolean; message: string }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
    url: `${BASE_URL}/${id}`,
    method: 'delete',
  });
};

/**
 * Upload audio for a notification rule
 */
export const apiUploadNotificationRuleAudio = async (
  id: string,
  audioFile: File
): Promise<{ success: boolean; data: { ruleId: string; audio: any }; message: string }> => {
  const formData = new FormData();
  formData.append('audio', audioFile);

  return ApiService.fetchDataWithAxios<{ success: boolean; data: { ruleId: string; audio: any }; message: string }>({
    url: `/notification-audio/${id}`,
    method: 'post',
    data: formData as any,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Delete audio for a notification rule
 */
export const apiDeleteNotificationRuleAudio = async (id: string): Promise<{ success: boolean; message: string }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
    url: `/notification-audio/${id}`,
    method: 'delete',
  });
};

/**
 * Get audio info for a notification rule
 */
export const apiGetNotificationRuleAudioInfo = async (
  id: string
): Promise<{ success: boolean; data: any }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; data: any }>({
    url: `/notification-audio/${id}/info`,
    method: 'get',
  });
};

export default {
  apiGetNotificationRules,
  apiGetNotificationRuleById,
  apiGetRuleByEventType,
  apiGetEventTypes,
  apiGetNotificationAnalytics,
  apiCreateNotificationRule,
  apiUpdateNotificationRule,
  apiToggleNotificationRule,
  apiResetNotificationRule,
  apiTestNotificationRule,
  apiDeleteNotificationRule,
  apiUploadNotificationRuleAudio,
  apiDeleteNotificationRuleAudio,
  apiGetNotificationRuleAudioInfo,
};
