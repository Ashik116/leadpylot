import ApiService from './ApiService';

export interface TelegramConnection {
  _id?: string;
  id?: string;
  platform_type?: string;
  chat_id?: string;
  telegram_username?: string;
  telegram_phone?: string;
  bot_enabled?: boolean;
  linked_at?: string;
  bot_id?: string;
}

export interface CurrentUser {
  _id: string;
  login: string;
  role: string;
  active: boolean;
  create_date: string;
  pendingTodosCount: number;
  view_type?: 'listView' | 'detailsView';
  image_id?: any;
  color_code?: string;
  telegram?: TelegramConnection[];
  telegram_username?: string;
  telegram_phone?: string;
  info?: {
    name?: string;
    email?: string;
    telegram_username?: string;
    telegram_phone?: string;
    [key: string]: unknown;
  };
  office_name?: string | null;
  office_names?: string[];
  other_platform_credentials?: Array<{
    platform_type: string;
    telegram_username?: string;
    telegram_phone?: string;
    chat_id?: string;
    bot_enabled?: boolean;
    linked_at?: string;
  }>;
}

/**
 * Get current authenticated user information from the client-side
 * This uses the authenticated axios instance with proper headers
 */
export const apiGetCurrentUser = async (): Promise<CurrentUser> => {
  return ApiService.fetchDataWithAxios<CurrentUser>({
    url: '/auth/me',
    method: 'GET',
  });
};

/**
 * Update user's Telegram credentials
 * Stores/updates telegram username and phone in other_platform_credentials
 */
export const apiUpdateTelegramCredentials = async (data: {
  telegram_username: string;
  telegram_phone: string;
}): Promise<{ success: boolean; message: string; data: any }> => {
  return ApiService.fetchDataWithAxios({
    url: '/auth/telegram-credentials',
    method: 'PUT',
    data,
  });
};
