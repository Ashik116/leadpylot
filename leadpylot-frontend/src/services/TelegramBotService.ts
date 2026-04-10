import ApiService from './ApiService';

export type TelegramBotType = 'general' | 'email_dedicated' | 'generate';

export interface TelegramBotConfig {
  allowed_roles: string[];
  notification_types: string[];
  rate_limit: number;
}

export interface TelegramBotStats {
  total_notifications_sent: number;
  total_users_linked: number;
  last_used_at: Date | string | null;
}

export interface TelegramBot {
  _id: string;
  name: string;
  description: string;
  bot_username: string;
  bot_token?: string;
  bot_type: TelegramBotType;
  is_active: boolean;
  webhook_url: string | null;
  config: TelegramBotConfig;
  stats: TelegramBotStats;
  created_by?: {
    _id: string;
    login: string;
    info?: {
      name: string;
    };
  };
  updated_by?: {
    _id: string;
    login: string;
    info?: {
      name: string;
    };
  };
  company_id?: number;
  active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateTelegramBotRequest {
  name: string;
  description?: string;
  bot_token: string;
  bot_username: string;
  bot_type?: TelegramBotType;
  webhook_url?: string;
  config?: Partial<TelegramBotConfig>;
  company_id?: number;
}

export interface UpdateTelegramBotRequest {
  name?: string;
  description?: string;
  bot_token?: string;
  bot_username?: string;
  bot_type?: TelegramBotType;
  webhook_url?: string;
  config?: Partial<TelegramBotConfig>;
  is_active?: boolean;
}

export interface TelegramBotsResponse {
  success: boolean;
  data: TelegramBot[];
  meta: {
    total: number;
  };
}

export interface TelegramBotResponse {
  success: boolean;
  data: TelegramBot;
  message?: string;
}

/**
 * Get all Telegram bot configurations
 */
export async function apiGetTelegramBots(params?: {
  company_id?: number;
  include_inactive?: boolean;
  is_active?: boolean;
}): Promise<TelegramBotsResponse> {
  return ApiService.fetchDataWithAxios<TelegramBotsResponse>({
    url: '/telegram-bots',
    method: 'get',
    params,
  });
}

/**
 * Get Telegram bot by ID
 */
export async function apiGetTelegramBotById(id: string): Promise<TelegramBotResponse> {
  return ApiService.fetchDataWithAxios<TelegramBotResponse>({
    url: `/telegram-bots/${id}`,
    method: 'get',
  });
}

/**
 * Create new Telegram bot configuration
 */
export async function apiCreateTelegramBot(data: CreateTelegramBotRequest): Promise<TelegramBotResponse> {
  return ApiService.fetchDataWithAxios<TelegramBotResponse>({
    url: '/telegram-bots',
    method: 'post',
    data: data as unknown as Record<string, unknown>,
  });
}

/**
 * Update Telegram bot configuration
 */
export async function apiUpdateTelegramBot(
  id: string,
  data: UpdateTelegramBotRequest
): Promise<TelegramBotResponse> {
  return ApiService.fetchDataWithAxios<TelegramBotResponse>({
    url: `/telegram-bots/${id}`,
    method: 'put',
    data: data as unknown as Record<string, unknown>,
  });
}

/**
 * Delete Telegram bot configuration
 */
export async function apiDeleteTelegramBot(id: string): Promise<{ success: boolean; message: string }> {
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
    url: `/telegram-bots/${id}`,
    method: 'delete',
  });
}

/**
 * Toggle Telegram bot active status
 */
export async function apiToggleTelegramBot(
  id: string,
  is_active: boolean
): Promise<TelegramBotResponse> {
  return ApiService.fetchDataWithAxios<TelegramBotResponse>({
    url: `/telegram-bots/${id}/toggle`,
    method: 'patch',
    data: { is_active } as Record<string, unknown>,
  });
}

/**
 * Test Telegram bot connection
 */
export async function apiTestTelegramBot(id: string): Promise<{
  success: boolean;
  message: string;
  bot_info?: {
    id: number;
    username: string;
    first_name: string;
    can_join_groups: boolean;
    can_read_all_group_messages: boolean;
  };
}> {
  return ApiService.fetchDataWithAxios({
    url: `/telegram-bots/${id}/test`,
    method: 'post',
  });
}

/**
 * Get Telegram bot statistics
 */
export async function apiGetTelegramBotStats(id: string): Promise<{
  success: boolean;
  data: TelegramBotStats;
}> {
  return ApiService.fetchDataWithAxios({
    url: `/telegram-bots/${id}/stats`,
    method: 'get',
  });
}

/**
 * Telegram update types
 */
export interface TelegramFrom {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramFrom;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: Array<{
    offset: number;
    length: number;
    type: string;
  }>;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramBotUpdatesResponse {
  success: boolean;
  bot_info: {
    id: string;
    name: string;
    bot_username: string;
  };
  updates: TelegramUpdate[];
  total: number;
}

export interface TelegramBotUpdatesPaginatedResponse {
  success: boolean;
  bot_info: {
    id: string;
    name: string;
    bot_username: string;
  };
  data: TelegramUpdate[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    has_more: boolean;
  };
}

/**
 * Get Telegram bot updates (recent cache)
 * Fetches from notification-service which has cached updates from active polling
 */
export async function apiGetTelegramBotUpdates(params?: {
  bot_id?: string;
  limit?: number;
}): Promise<TelegramBotUpdatesResponse> {
  // Call user-auth-service which uses Telegram Bot API's getUpdates
  return ApiService.fetchDataWithAxios<TelegramBotUpdatesResponse>({
    url: '/telegram-bots/updates',
    method: 'get',
    params: {
      limit: params?.limit || 100,
    },
  });
}

/**
 * Get ALL Telegram bot updates from database (with pagination and filters)
 * This allows viewing complete chat history
 */
export async function apiGetAllTelegramBotUpdates(params?: {
  limit?: number;
  skip?: number;
  start_date?: string;
  end_date?: string;
  chat_id?: number;
  search_text?: string;
}): Promise<TelegramBotUpdatesPaginatedResponse> {
  // Call user-auth-service which stores all Telegram bot updates
  return ApiService.fetchDataWithAxios<TelegramBotUpdatesPaginatedResponse>({
    url: '/telegram-bots/updates/all',
    method: 'get',
    params,
  });
}

/**
 * Get bot status from user-auth-service
 */
export async function apiGetNotificationBotStatus(): Promise<{
  success: boolean;
  data: {
    initialized: boolean;
  };
}> {
  // Call user-auth-service which manages Telegram bot configuration
  return ApiService.fetchDataWithAxios<{
    success: boolean;
    data: {
      initialized: boolean;
    };
  }>({
    url: '/telegram-bots/bot-status',
    method: 'get',
  });
}

/**
 * Trigger bot reload via user-auth-service
 */
export async function apiReloadNotificationBot(): Promise<{
  success: boolean;
  message: string;
}> {
  // Call user-auth-service to reload bot configuration
  return ApiService.fetchDataWithAxios<{
    success: boolean;
    message: string;
  }>({
    url: '/telegram-bots/reload',
    method: 'post',
    data: { action: 'reload' } as Record<string, unknown>,
  });
}
