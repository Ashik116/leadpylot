import AxiosBase from './axios/AxiosBase';
import type {
  CommServer,
  Channel,
  Message,
  Role,
  ServerMember,
  Invite,
  DMConversation,
  DirectMessage,
  VoiceTokenResponse,
  UserProfile,
  ApiResponse,
  PaginatedResponse,
  CreateServerRequest,
  CreateChannelRequest,
  CreateRoleRequest,
  CreateInviteRequest,
  SendMessageRequest,
  PermissionOverride,
} from '@/types/comm.types';

// ============================================================
// Communication API Service
// Routes via MicroserviceRouter -> communication-service:4020
// ============================================================

const CommApi = {
  // ---- Servers ----
  createServer: (data: CreateServerRequest) =>
    AxiosBase.post<ApiResponse<CommServer>>('/api/servers', data),

  getMyServers: () =>
    AxiosBase.get<ApiResponse<CommServer[]>>('/api/servers'),

  getServer: (serverId: string) =>
    AxiosBase.get<ApiResponse<{ server: CommServer; memberCount: number }>>(`/api/servers/${serverId}`),

  updateServer: (serverId: string, data: Partial<CreateServerRequest>) =>
    AxiosBase.patch<ApiResponse<CommServer>>(`/api/servers/${serverId}`, data),

  deleteServer: (serverId: string) =>
    AxiosBase.delete<ApiResponse<{ deleted: boolean }>>(`/api/servers/${serverId}`),

  leaveServer: (serverId: string) =>
    AxiosBase.post<ApiResponse<{ left: boolean }>>(`/api/servers/${serverId}/leave`),

  // ---- Channels ----
  getChannels: (serverId: string) =>
    AxiosBase.get<ApiResponse<Channel[]>>(`/api/servers/${serverId}/channels`),

  createChannel: (serverId: string, data: CreateChannelRequest) =>
    AxiosBase.post<ApiResponse<Channel>>(`/api/servers/${serverId}/channels`, data),

  getChannel: (channelId: string) =>
    AxiosBase.get<ApiResponse<Channel>>(`/api/channels/${channelId}`),

  updateChannel: (channelId: string, data: { name?: string; topic?: string; position?: number }) =>
    AxiosBase.patch<ApiResponse<Channel>>(`/api/channels/${channelId}`, data),

  deleteChannel: (channelId: string) =>
    AxiosBase.delete<ApiResponse<{ deleted: boolean }>>(`/api/channels/${channelId}`),

  setChannelPermissions: (channelId: string, overrides: PermissionOverride[]) =>
    AxiosBase.put<ApiResponse<Channel>>(`/api/channels/${channelId}/permissions`, overrides),

  // ---- Messages ----
  getMessages: (channelId: string, params?: { limit?: number; before?: string; after?: string }) =>
    AxiosBase.get<PaginatedResponse<Message>>(`/api/channels/${channelId}/messages`, { params }),

  sendMessage: (channelId: string, data: SendMessageRequest) =>
    AxiosBase.post<ApiResponse<Message>>(`/api/channels/${channelId}/messages`, data),

  editMessage: (channelId: string, messageId: string, data: SendMessageRequest) =>
    AxiosBase.patch<ApiResponse<Message>>(`/api/channels/${channelId}/messages/${messageId}`, data),

  deleteMessage: (channelId: string, messageId: string) =>
    AxiosBase.delete<ApiResponse<{ deleted: boolean }>>(`/api/channels/${channelId}/messages/${messageId}`),

  // ---- Roles ----
  getRoles: (serverId: string) =>
    AxiosBase.get<ApiResponse<Role[]>>(`/api/servers/${serverId}/roles`),

  createRole: (serverId: string, data: CreateRoleRequest) =>
    AxiosBase.post<ApiResponse<Role>>(`/api/servers/${serverId}/roles`, data),

  updateRole: (serverId: string, roleId: string, data: Partial<CreateRoleRequest & { position?: number }>) =>
    AxiosBase.patch<ApiResponse<Role>>(`/api/servers/${serverId}/roles/${roleId}`, data),

  deleteRole: (serverId: string, roleId: string) =>
    AxiosBase.delete<ApiResponse<{ deleted: boolean }>>(`/api/servers/${serverId}/roles/${roleId}`),

  assignRoles: (serverId: string, userId: string, roleIds: string[]) =>
    AxiosBase.put<ApiResponse<{ assigned: boolean }>>(`/api/servers/${serverId}/members/${userId}/roles`, { roleIds }),

  // ---- Members ----
  getMembers: (serverId: string, params?: { limit?: number; skip?: number }) =>
    AxiosBase.get<ApiResponse<ServerMember[]>>(`/api/servers/${serverId}/members`, { params }),

  getMember: (serverId: string, userId: string) =>
    AxiosBase.get<ApiResponse<ServerMember>>(`/api/servers/${serverId}/members/${userId}`),

  updateMember: (serverId: string, userId: string, data: { nickname?: string }) =>
    AxiosBase.patch<ApiResponse<{ updated: boolean }>>(`/api/servers/${serverId}/members/${userId}`, data),

  kickMember: (serverId: string, userId: string) =>
    AxiosBase.delete<ApiResponse<{ kicked: boolean }>>(`/api/servers/${serverId}/members/${userId}`),

  // ---- Invites ----
  getInvites: (serverId: string) =>
    AxiosBase.get<ApiResponse<Invite[]>>(`/api/servers/${serverId}/invites`),

  createInvite: (serverId: string, data?: CreateInviteRequest) =>
    AxiosBase.post<ApiResponse<Invite>>(`/api/servers/${serverId}/invites`, data || {}),

  acceptInvite: (code: string) =>
    AxiosBase.post<ApiResponse<CommServer>>(`/api/invites/${code}/accept`),

  deleteInvite: (serverId: string, inviteId: string) =>
    AxiosBase.delete<ApiResponse<{ deleted: boolean }>>(`/api/servers/${serverId}/invites/${inviteId}`),

  // ---- DMs ----
  getDMConversations: () =>
    AxiosBase.get<ApiResponse<DMConversation[]>>('/api/dm'),

  createDMConversation: (recipientId: string) =>
    AxiosBase.post<ApiResponse<DMConversation>>('/api/dm', { recipientId }),

  getDMMessages: (dmId: string, params?: { limit?: number; before?: string }) =>
    AxiosBase.get<PaginatedResponse<DirectMessage>>(`/api/dm/${dmId}/messages`, { params }),

  sendDMMessage: (dmId: string, data: SendMessageRequest) =>
    AxiosBase.post<ApiResponse<DirectMessage>>(`/api/dm/${dmId}/messages`, data),

  editDMMessage: (dmId: string, messageId: string, data: SendMessageRequest) =>
    AxiosBase.patch<ApiResponse<DirectMessage>>(`/api/dm/${dmId}/messages/${messageId}`, data),

  deleteDMMessage: (dmId: string, messageId: string) =>
    AxiosBase.delete<ApiResponse<{ deleted: boolean }>>(`/api/dm/${dmId}/messages/${messageId}`),

  // ---- Voice / Video ----
  joinVoiceChannel: (channelId: string, data?: { audio?: boolean; video?: boolean }) =>
    AxiosBase.post<ApiResponse<VoiceTokenResponse>>(`/api/channels/${channelId}/join-voice`, data || { audio: true, video: false }),

  leaveVoiceChannel: (channelId: string) =>
    AxiosBase.post<ApiResponse<{ left: boolean }>>(`/api/channels/${channelId}/leave-voice`),

  getVoiceParticipants: (channelId: string) =>
    AxiosBase.get<ApiResponse<any[]>>(`/api/channels/${channelId}/participants`),

  startPersonalCall: (dmId: string, data?: { audio?: boolean; video?: boolean }) =>
    AxiosBase.post<ApiResponse<VoiceTokenResponse>>(`/api/dm/${dmId}/call`, data || { audio: true, video: false }),

  joinCall: (roomName: string, data?: { audio?: boolean; video?: boolean }) =>
    AxiosBase.post<ApiResponse<VoiceTokenResponse>>(`/api/calls/${roomName}/join`, data || { audio: true, video: false }),

  // ---- User Profiles ----
  getUserProfiles: (ids: string[]) =>
    AxiosBase.get<ApiResponse<UserProfile[]>>(`/api/users/profiles`, { params: { ids: ids.join(',') } }),

  // ---- Monitoring ----
  getMonitoringOverview: () =>
    AxiosBase.get<ApiResponse<MonitoringOverview>>('/api/monitoring/overview'),

  getMonitoringSystem: () =>
    AxiosBase.get<ApiResponse<MonitoringSystemStats>>('/api/monitoring/system'),

  getMonitoringRooms: () =>
    AxiosBase.get<ApiResponse<MonitoringRoomStats>>('/api/monitoring/rooms'),
};

// ---- Monitoring Types ----
export interface MonitoringSystemStats {
  cpu: { usagePercent: number; cores: number };
  memory: { totalBytes: number; usedBytes: number; usagePercent: number };
  network: { rxBytesPerSec: number; txBytesPerSec: number; rxTotalBytes: number; txTotalBytes: number };
  uptime: number;
}

export interface MonitoringRoomStats {
  totalRooms: number;
  totalParticipants: number;
  totalPublishers: number;
  rooms: { name: string; participants: number; publishers: number; createdAt: number }[];
}

export interface MonitoringOverview {
  system: MonitoringSystemStats | null;
  rooms: MonitoringRoomStats;
}

export default CommApi;
