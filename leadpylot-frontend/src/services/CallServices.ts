import ApiService from './ApiService';

export interface CallApiResponse {
  status: string;
  message: string;
  notification: Notification;
}

export interface Notification {
  type: string;
  inbox: string;
  info: Info;
  metadata: Metadata;
  read: boolean;
  created_at: Date;
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface Info {
  project_id: string;
  agent_id: string;
  user_id: string;
  lead_id: string;
}

export interface Metadata {
  attachments: Attachment[];
  call_duration: number;
  call_status: string;
  notes: string;
  timestamp: Date;
}

export interface Attachment {
  name: string;
  url: string;
  mimetype: string;
  size: number;
  documentId?: string;
}

// Types for call history API
export interface CallHistoryItem {
  _id: string;
  type: string;
  inbox: 'incoming' | 'outgoing';
  info: CallHistoryInfo;
  metadata: CallHistoryMetadata;
  read: boolean;
  created_at: string;
}

export interface CallHistoryInfo {
  lead_id: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  project_id: string;
  agent_id: {
    _id: string;
    login: string;
  };
  user_id: {
    _id: string;
    login: string;
  };
}

export interface CallHistoryMetadata {
  call_duration: number;
  call_status: string;
  notes: string;
  timestamp: string;
  formatted_duration: string;
  attachments?: Attachment[];
}

export interface CallHistoryResponse {
  status: string;
  callHistory: CallHistoryItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface CallHistoryParams {
  limit?: number;
  page?: number;
  lead_id?: string;
}

export interface CallApiRequest {
  lead_id: string;
  project_id: string;
  call_duration: number;
  call_status: string;
  phone_number: string;
  notes?: string;
  recording_url?: string;
}

export const apiCreateOutGoingCall = async (data: CallApiRequest) =>
  ApiService.fetchDataWithAxios<CallApiResponse>({
    url: '/calls/outgoing',
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });

export const apiCreateIncomingCall = async (data: CallApiRequest) =>
  ApiService.fetchDataWithAxios<CallApiResponse>({
    url: '/calls/incoming',
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });

export const apiGetCallHistory = async (params?: CallHistoryParams) =>
  ApiService.fetchDataWithAxios<CallHistoryResponse>({
    url: '/calls/history',
    method: 'get',
    params,
  });
