'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import CommSocketService from '@/services/CommSocketService';
import CommApi from '@/services/CommApiService';
import { useCommStore } from '@/stores/commStore';
import { getAuthToken } from '@/utils/cookies';
import type { PresenceData, VoiceStateData, IncomingCall, StreamData } from '@/types/comm.types';

export default function CommsLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const connectedRef = useRef(false);
  const currentTokenRef = useRef<string | null>(null);

  // Connect WebSocket once when layout mounts
  useEffect(() => {
    if (!isAuthenticated) {
      // Auth lost — disconnect and cleanup
      if (connectedRef.current) {
        CommSocketService.getInstance().disconnect();
        connectedRef.current = false;
        currentTokenRef.current = null;
      }
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    const socket = CommSocketService.getInstance();

    // Detect token change (e.g., account switch, token refresh)
    if (currentTokenRef.current && currentTokenRef.current !== token) {
      socket.disconnect();
      connectedRef.current = false;
    }

    // Only connect if not already connected
    if (!socket.isConnected && !connectedRef.current) {
      connectedRef.current = true;
      currentTokenRef.current = token;
      socket.connect(token);
    }

    // Subscribe to events
    const store = useCommStore.getState;

    const unsubs: (() => void)[] = [];

    unsubs.push(
      socket.on('PRESENCE_UPDATE', (data: PresenceData) => {
        store().setUserPresence(data.userId, data.status);
      }),
    );

    unsubs.push(
      socket.on('VOICE_STATE_UPDATE', (data: VoiceStateData) => {
        store().setVoiceParticipant(data.channelId, data.userId, data.joined);
      }),
    );

    unsubs.push(
      socket.on('CALL_INCOMING', (data: IncomingCall) => {
        store().setIncomingCall(data);
      }),
    );

    unsubs.push(
      socket.on('TYPING_START', (data: { channelId: string; userId: string }) => {
        store().setTypingUser(data.channelId, data.userId);
        setTimeout(() => store().clearTypingUser(data.channelId, data.userId), 3000);
      }),
    );

    unsubs.push(
      socket.on('MESSAGE_CREATE', (data: { channelId: string }) => {
        const { activeChannelId, incrementUnread } = store();
        if (data.channelId !== activeChannelId) {
          incrementUnread(data.channelId);
        }
      }),
    );

    // Stream events (opt-in screen share)
    unsubs.push(
      socket.on('STREAM_START', (data: StreamData) => {
        store().setActiveStream(data.channelId, data.userId, true);
      }),
    );
    unsubs.push(
      socket.on('STREAM_END', (data: StreamData) => {
        store().setActiveStream(data.channelId, data.userId, false);
      }),
    );

    // Cleanup: only unsubscribe handlers, DON'T disconnect the socket.
    // The socket is a singleton and should stay alive across re-renders.
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [isAuthenticated]);

  // Visibility change: update presence when tab is hidden/shown
  useEffect(() => {
    const handleVisibility = () => {
      const socket = CommSocketService.getInstance();
      if (!socket.isConnected) return;

      if (document.hidden) {
        socket.updatePresence('idle');
      } else {
        socket.updatePresence('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Warn before reload/close if in a voice call, then disconnect on unload
  const voiceRoomToken = useCommStore((s) => s.voiceRoomToken);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (voiceRoomToken) {
        e.preventDefault();
        // Modern browsers show a generic prompt; returnValue is required for older ones
        e.returnValue = '';
      }
    };

    const handleUnload = () => {
      CommSocketService.getInstance().disconnect();
      connectedRef.current = false;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [voiceRoomToken]);

  // Auto-rejoin voice channel after page refresh
  const voiceChannelId = useCommStore((s) => s.voiceChannelId);
  const voiceServerId = useCommStore((s) => s.voiceServerId);
  const hasAttemptedRejoin = useRef(false);

  useEffect(() => {
    if (hasAttemptedRejoin.current) return;
    if (!voiceChannelId || !voiceServerId) return;
    if (voiceRoomToken) return; // already connected, no need to rejoin
    if (!isAuthenticated) return;

    hasAttemptedRejoin.current = true;

    // Small delay to ensure auth interceptors and WS connection are ready
    const timeout = setTimeout(() => {
      CommApi.joinVoiceChannel(voiceChannelId, { audio: true, video: false })
        .then((res) => {
          const data = res.data.data;
          useCommStore.getState().setVoiceChannel(
            voiceChannelId,
            voiceServerId,
            data.token,
            data.url,
            data.roomName,
            data.participantCount ?? 0,
          );
        })
        .catch(() => {
          // API failed (room closed, token expired, etc.) — clear stale state
          useCommStore.getState().clearVoice();
        });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [voiceChannelId, voiceServerId, voiceRoomToken, isAuthenticated]);

  return (
    <div className="comm-dark absolute inset-0 overflow-hidden bg-[#313338] text-[#dbdee1]">
      {children}
    </div>
  );
}
