'use client';

import { useState } from 'react';
import {
  useLocalParticipant,
  useRoomContext,
  useParticipants,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Mic, MicOff, VideoIcon, VideoOff, Monitor, MonitorOff, PhoneOff, Eye, Users, ScreenShare } from 'lucide-react';
import { useLeaveVoice } from '@/services/hooks/comm';
import { useCommStore } from '@/stores/commStore';

export default function VoiceControls() {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const leaveVoice = useLeaveVoice();
  const participants = useParticipants();
  const participantCount = participants.length;
  const { localMuted, setLocalMuted } = useCommStore();

  const isCameraOn = localParticipant.isCameraEnabled;
  const isScreenSharing = localParticipant.isScreenShareEnabled;

  const toggleMic = async () => {
    try {
      const newMuted = !localMuted;
      await localParticipant.setMicrophoneEnabled(!newMuted);
      setLocalMuted(newMuted);
    } catch {}
  };

  const toggleCamera = async () => {
    try {
      // Don't pass custom resolution — let the room's publishDefaults handle it
      // so simulcast layers are preserved
      await localParticipant.setCameraEnabled(!isCameraOn);
    } catch {}
  };

  const toggleScreenShare = async () => {
    try {
      // Don't pass custom resolution — room publishDefaults includes
      // screenShareSimulcastLayers for proper SFU fan-out
      await localParticipant.setScreenShareEnabled(!isScreenSharing);
    } catch {}
  };

  const handleDisconnect = () => {
    room.disconnect();
    leaveVoice.mutate();
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Mute */}
      <ControlBtn onClick={toggleMic} active={!localMuted} danger={localMuted} title={localMuted ? 'Unmute' : 'Mute'}>
        {localMuted ? <MicOff size={18} className="sm:hidden" /> : <Mic size={18} className="sm:hidden" />}
        {localMuted ? <MicOff size={20} className="hidden sm:block" /> : <Mic size={20} className="hidden sm:block" />}
      </ControlBtn>

      {/* Camera */}
      <ControlBtn onClick={toggleCamera} active={isCameraOn} title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}>
        {isCameraOn ? <VideoIcon size={18} className="sm:hidden" /> : <VideoOff size={18} className="sm:hidden" />}
        {isCameraOn ? <VideoIcon size={20} className="hidden sm:block" /> : <VideoOff size={20} className="hidden sm:block" />}
      </ControlBtn>

      {/* Screen Share */}
      <ControlBtn onClick={toggleScreenShare} active={isScreenSharing} accent={isScreenSharing} title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}>
        {isScreenSharing ? <MonitorOff size={18} className="sm:hidden" /> : <ScreenShare size={18} className="sm:hidden" />}
        {isScreenSharing ? <MonitorOff size={20} className="hidden sm:block" /> : <ScreenShare size={20} className="hidden sm:block" />}
      </ControlBtn>

      {/* Viewer badge when streaming */}
      {isScreenSharing && <ViewerBadge participantCount={participantCount} />}

      {/* Disconnect */}
      <button
        onClick={handleDisconnect}
        className="ml-1 sm:ml-2 flex h-10 sm:h-[52px] items-center gap-2 rounded-lg bg-[#2b2d31] px-3 sm:px-4 text-[13px] font-medium text-[#dbdee1] hover:bg-[#f23f43] hover:text-white transition-colors"
        title="Disconnect"
      >
        <PhoneOff size={18} className="sm:hidden" />
        <PhoneOff size={20} className="hidden sm:block" />
        <span className="hidden sm:inline">Disconnect</span>
      </button>
    </div>
  );
}

function ControlBtn({ onClick, active, danger, accent, title, children }: {
  onClick: () => void; active?: boolean; danger?: boolean; accent?: boolean; title: string; children: React.ReactNode;
}) {
  let cls = 'flex h-10 w-10 sm:h-[52px] sm:w-[52px] items-center justify-center rounded-full transition-colors ';
  if (danger) cls += 'bg-[#f23f43]/20 text-[#f23f43] hover:bg-[#f23f43]/30';
  else if (accent) cls += 'bg-[#5865f2]/20 text-[#5865f2] hover:bg-[#5865f2]/30';
  else if (active) cls += 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#404249]';
  else cls += 'bg-[#2b2d31] text-[#949ba4] hover:bg-[#404249] hover:text-[#dbdee1]';

  return <button onClick={onClick} className={cls} title={title}>{children}</button>;
}

function ViewerBadge({ participantCount }: { participantCount: number }) {
  const [showPopover, setShowPopover] = useState(false);
  const participants = useParticipants();
  const userProfiles = useCommStore((s) => s.userProfiles);
  const viewerCount = Math.max(0, participantCount - 1);

  return (
    <div className="relative">
      <button onClick={() => setShowPopover(!showPopover)} className="flex items-center gap-1.5 rounded-full bg-[#f23f43]/20 px-3 py-1.5 text-xs text-[#f23f43] hover:bg-[#f23f43]/30 transition-colors" title="Stream viewers">
        <Eye size={12} /><span className="font-medium">{viewerCount} watching</span>
      </button>
      {showPopover && viewerCount > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg bg-[#111214] p-2 shadow-xl z-50">
          <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-[#949ba4] uppercase">
            <Users size={10} /> Viewers ({viewerCount})
          </div>
          <div className="max-h-32 overflow-y-auto">
            {participants.filter((p) => !p.isLocal).map((p) => {
              const name = userProfiles[p.identity]?.username || p.identity.slice(-6);
              return (
                <div key={p.sid || p.identity} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-[#35373c]">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5865f2] text-[9px] font-bold text-white">{name[0]?.toUpperCase()}</div>
                  <span className="text-[12px] text-[#dbdee1] truncate">{name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
