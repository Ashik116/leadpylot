'use client';

import { useParticipants, useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { useCommStore } from '@/stores/commStore';
import { useLeaveVoice, useChannels } from '@/services/hooks/comm';
import { PhoneOff, Mic, MicOff, VideoIcon, VideoOff, ArrowRight } from 'lucide-react';

export default function ActiveCallBar() {
  const { voiceChannelId, voiceServerId, setActiveServer, setActiveChannel, localMuted, setLocalMuted } = useCommStore();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const participants = useParticipants();
  const leaveVoice = useLeaveVoice();
  const { data: channels = [] } = useChannels(voiceServerId);

  const voiceChannel = channels.find((c) => c.id === voiceChannelId);
  const channelName = voiceChannel?.name || 'Voice Channel';
  const isCameraOn = localParticipant.isCameraEnabled;

  const handleReturn = () => {
    if (voiceServerId) setActiveServer(voiceServerId);
    if (voiceChannelId) setActiveChannel(voiceChannelId);
  };

  const toggleMic = async () => {
    try {
      await localParticipant.setMicrophoneEnabled(localMuted);
      setLocalMuted(!localMuted);
    } catch {}
  };

  const toggleCamera = async () => {
    try { await localParticipant.setCameraEnabled(!isCameraOn); } catch {}
  };

  const handleDisconnect = () => {
    room.disconnect();
    leaveVoice.mutate();
  };

  return (
    <div className="flex items-center gap-3 bg-[#232428] px-4 py-1.5 shadow-[0_1px_0_rgba(0,0,0,0.2)]">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="h-2 w-2 rounded-full bg-[#23a55a]" />
        <span className="text-[13px] font-semibold text-[#23a55a]">Voice Connected</span>
        <span className="text-[13px] text-[#949ba4] truncate">\u2014 {channelName}</span>
        <span className="text-[11px] text-[#80848e]">({participants.length})</span>
      </div>

      <div className="flex items-center gap-0.5">
        <button onClick={toggleMic} className={`rounded p-1 transition-colors ${localMuted ? 'text-[#f23f43]' : 'text-[#b5bac1] hover:text-[#dbdee1]'}`} title={localMuted ? 'Unmute' : 'Mute'}>
          {localMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button onClick={toggleCamera} className={`rounded p-1 transition-colors ${isCameraOn ? 'text-[#dbdee1]' : 'text-[#b5bac1] hover:text-[#dbdee1]'}`} title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}>
          {isCameraOn ? <VideoIcon size={16} /> : <VideoOff size={16} />}
        </button>
        <button onClick={handleDisconnect} className="rounded p-1 text-[#b5bac1] hover:text-[#f23f43] transition-colors" title="Disconnect">
          <PhoneOff size={16} />
        </button>
      </div>

      <button onClick={handleReturn} className="flex items-center gap-1 rounded bg-[#23a55a] px-2.5 py-1 text-[12px] font-medium text-white hover:bg-[#1a8d48] transition-colors">
        Return <ArrowRight size={12} />
      </button>
    </div>
  );
}
