// ============================================================
// Communication Service TypeScript Types
// ============================================================

// ---- Server (Guild) ----
export interface CommServer {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  ownerId: string;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ---- Channel ----
export type ChannelType = 'text' | 'voice' | 'video';

export interface PermissionOverride {
  targetId: string;
  targetType: 'role' | 'member';
  allow: number;
  deny: number;
}

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  type: ChannelType;
  topic?: string;
  position: number;
  permissionOverrides?: PermissionOverride[];
  createdAt: string;
}

// ---- Message ----
export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  editedAt?: string;
  createdAt: string;
}

// ---- Role ----
export interface Role {
  id: string;
  serverId: string;
  name: string;
  color?: string;
  position: number;
  permissions: number;
  isDefault: boolean;
  createdAt: string;
}

// ---- Server Member ----
export interface ServerMember {
  id: string;
  serverId: string;
  userId: string;
  roleIds: string[];
  nickname?: string;
  joinedAt: string;
}

// ---- Invite ----
export interface Invite {
  id: string;
  serverId: string;
  code: string;
  inviterId: string;
  maxUses: number;
  uses: number;
  expiresAt?: string;
  createdAt: string;
}

// ---- Direct Message ----
export interface DMConversation {
  id: string;
  participants: string[];
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  editedAt?: string;
  createdAt: string;
}

// ---- Voice / Media ----
export interface VoiceTokenResponse {
  token: string;
  url: string;
  roomName: string;
  participantCount?: number;
}

export interface IncomingCall {
  callerID: string;
  roomName: string;
  audio: boolean;
  video: boolean;
}

// ---- User Profile (cached from JWT claims) ----
export interface UserProfile {
  id: string;
  username: string;
  role?: string;
}

// ---- Presence ----
export type PresenceStatus = 'online' | 'idle' | 'offline' | 'dnd';

export interface PresenceData {
  userId: string;
  status: PresenceStatus;
}

// ---- WebSocket Events ----
export type WSEventType =
  | 'READY'
  | 'MESSAGE_CREATE'
  | 'MESSAGE_UPDATE'
  | 'MESSAGE_DELETE'
  | 'TYPING_START'
  | 'PRESENCE_UPDATE'
  | 'VOICE_STATE_UPDATE'
  | 'MEMBER_JOIN'
  | 'MEMBER_LEAVE'
  | 'MEMBER_UPDATE'
  | 'CHANNEL_CREATE'
  | 'CHANNEL_UPDATE'
  | 'CHANNEL_DELETE'
  | 'SERVER_UPDATE'
  | 'SERVER_DELETE'
  | 'ROLE_CREATE'
  | 'ROLE_UPDATE'
  | 'ROLE_DELETE'
  | 'DM_MESSAGE_CREATE'
  | 'DM_MESSAGE_UPDATE'
  | 'DM_MESSAGE_DELETE'
  | 'CALL_INCOMING'
  | 'CALL_ENDED'
  | 'STREAM_START'
  | 'STREAM_END';

export interface WSEvent<T = any> {
  type: WSEventType;
  data: T;
}

export interface WSReadyData {
  clientId: string;
  userId: string;
  serverIds: string[];
}

export interface TypingData {
  channelId: string;
  userId: string;
  timestamp: number;
}

export interface VoiceStateData {
  userId: string;
  channelId: string;
  serverId: string;
  joined: boolean;
}

export interface StreamData {
  userId: string;
  channelId: string;
  serverId: string;
  active: boolean;
}

// ---- API Response Wrappers ----
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  hasMore: boolean;
}

// ---- Permission Bitfield Constants ----
export const Permissions = {
  VIEW_CHANNEL:    1 << 0,
  SEND_MESSAGES:   1 << 1,
  MANAGE_MESSAGES: 1 << 2,
  CONNECT:         1 << 3,
  SPEAK:           1 << 4,
  VIDEO:           1 << 5,
  STREAM:          1 << 6,
  MUTE_MEMBERS:    1 << 7,
  MANAGE_CHANNELS: 1 << 8,
  MANAGE_ROLES:    1 << 9,
  MANAGE_SERVER:   1 << 10,
  KICK_MEMBERS:    1 << 11,
  BAN_MEMBERS:     1 << 12,
  INVITE_MEMBERS:  1 << 13,
  ADMINISTRATOR:   1 << 14,
} as const;

export function hasPermission(perms: number, perm: number): boolean {
  if (perms & Permissions.ADMINISTRATOR) return true;
  return (perms & perm) === perm;
}

// ---- Request Types ----
export interface CreateServerRequest {
  name: string;
  icon?: string;
  description?: string;
}

export interface CreateChannelRequest {
  name: string;
  type: ChannelType;
  topic?: string;
}

export interface CreateRoleRequest {
  name: string;
  color?: string;
  permissions: number;
}

export interface CreateInviteRequest {
  maxUses?: number;
  expiresIn?: number;
}

export interface SendMessageRequest {
  content: string;
}
