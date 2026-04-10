import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiUnlinkTelegram,
  apiUpdateTelegramCredentials,
  type UnlinkTelegramRequest,
  type UpdateTelegramCredentialsRequest,
} from '../TelegramService';
import type { TelegramBot } from '../TelegramBotService';
import { apiToggleBotCredential } from '../UsersService';
import ApiService from '../ApiService';

export const useActiveTelegramBots = () => {
  return useQuery<TelegramBot[]>({
    queryKey: ['telegram-bots', 'for-user'],
    queryFn: async () => {
      const res = await ApiService.fetchDataWithAxios<{ success: boolean; data: TelegramBot[] }>({
        url: '/telegram-bots/for-user',
        method: 'get',
      });
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateTelegramCredentials = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTelegramCredentialsRequest) =>
      apiUpdateTelegramCredentials(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });
};

export const useUnlinkTelegram = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UnlinkTelegramRequest) => apiUnlinkTelegram(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });
};

export const useToggleBotNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      credentialId,
      bot_enabled,
    }: {
      userId: string;
      credentialId: string;
      bot_enabled: boolean;
    }) => apiToggleBotCredential(userId, credentialId, bot_enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });
};
