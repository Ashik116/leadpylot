import { useEffect } from 'react';
import socketService from '@/services/SocketService';
import { isDev } from '@/utils/utils';

/**
 * Custom hook to listen for Telegram user link/unlink events
 * @param callbacks - Object containing callback functions for events
 */
export function useTelegramEvents(callbacks: {
  onUserLinked?: (data: {
    user: { name: string; email?: string; login: string };
    identifier: string;
    identifier_type: string;
    chat_id: string;
    timestamp: string;
  }) => void;
  onUserUnlinked?: (data: { chat_id: string; timestamp: string }) => void;
}) {
  useEffect(() => {
    const unsubscribeLink = socketService.onTelegramUserLinked((data) => {
      isDev && console.log('🔗 Telegram user linked event received:', data);
      callbacks.onUserLinked?.(data);
    });

    const unsubscribeUnlink = socketService.onTelegramUserUnlinked((data) => {
      isDev && console.log('🔓 Telegram user unlinked event received:', data);
      callbacks.onUserUnlinked?.(data);
    });

    return () => {
      unsubscribeLink();
      unsubscribeUnlink();
    };
  }, [callbacks]);
}
