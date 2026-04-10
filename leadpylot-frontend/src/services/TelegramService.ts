import ApiService from './ApiService';

export interface UpdateTelegramCredentialsRequest {
  telegram_username?: string;
  telegram_phone?: string;
}

export interface UpdateTelegramCredentialsResponse {
  success?: boolean;
  message?: string;
  telegram_username?: string;
  telegram_phone?: string;
  data?: {
    telegram_username?: string;
    telegram_phone?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface UnlinkTelegramResponse {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UnlinkTelegramRequest {
  chat_id: string;
}

export const apiUpdateTelegramCredentials = (data: UpdateTelegramCredentialsRequest) => {
  return ApiService.fetchDataWithAxios<
    UpdateTelegramCredentialsResponse,
    UpdateTelegramCredentialsRequest
  >({
    url: '/auth/telegram-credentials',
    method: 'put',
    data,
  });
};

export const apiUnlinkTelegram = (data: UnlinkTelegramRequest) => {
  return ApiService.fetchDataWithAxios<UnlinkTelegramResponse, UnlinkTelegramRequest>({
    url: '/users/unlink-telegram',
    method: 'post',
    data,
  });
};
