import { useMutation } from '@tanstack/react-query';
import CommApi from '@/services/CommApiService';
import { useCommStore } from '@/stores/commStore';

export function useJoinVoice() {
  const setVoiceChannel = useCommStore((s) => s.setVoiceChannel);

  return useMutation({
    mutationFn: async ({ channelId, serverId, audio = true, video = false }: { channelId: string; serverId: string; audio?: boolean; video?: boolean }) => {
      const res = await CommApi.joinVoiceChannel(channelId, { audio, video });
      return { ...res.data.data, channelId, serverId };
    },
    onSuccess: (data) => {
      setVoiceChannel(data.channelId, data.serverId, data.token, data.url, data.roomName, data.participantCount ?? 0);
    },
  });
}

export function useLeaveVoice() {
  const clearVoice = useCommStore((s) => s.clearVoice);
  const voiceChannelId = useCommStore((s) => s.voiceChannelId);

  return useMutation({
    mutationFn: async () => {
      if (voiceChannelId) {
        await CommApi.leaveVoiceChannel(voiceChannelId);
      }
    },
    onSuccess: () => {
      clearVoice();
    },
  });
}

export function useStartCall() {
  const setVoiceChannel = useCommStore((s) => s.setVoiceChannel);

  return useMutation({
    mutationFn: async ({ dmId, audio = true, video = false }: { dmId: string; audio?: boolean; video?: boolean }) => {
      const res = await CommApi.startPersonalCall(dmId, { audio, video });
      return res.data.data;
    },
    onSuccess: (data) => {
      setVoiceChannel(null, null, data.token, data.url, data.roomName);
    },
  });
}

export function useJoinCall() {
  const setVoiceChannel = useCommStore((s) => s.setVoiceChannel);

  return useMutation({
    mutationFn: async ({ roomName, audio = true, video = false }: { roomName: string; audio?: boolean; video?: boolean }) => {
      const res = await CommApi.joinCall(roomName, { audio, video });
      return res.data.data;
    },
    onSuccess: (data) => {
      setVoiceChannel(null, null, data.token, data.url, data.roomName);
    },
  });
}
