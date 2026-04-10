'use client';

import { useEffect, useRef, useState } from 'react';
import { useParticipants } from '@livekit/components-react';
import { Track, type Participant } from 'livekit-client';
import { MicOff, Monitor } from 'lucide-react';
import { useCommStore } from '@/stores/commStore';

// Discord-style avatar background colors
const AVATAR_COLORS = [
  '#5865f2', '#eb459e', '#57f287', '#fee75c',
  '#ed4245', '#3ba55c', '#faa61a', '#e67e22',
  '#9b59b6', '#1abc9c', '#e91e63', '#2ecc71',
];

function getAvatarColor(identity: string): string {
  let hash = 0;
  for (let i = 0; i < identity.length; i++) {
    hash = ((hash << 5) - hash + identity.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface CameraThumbnailStripProps {
  focusedIdentity?: string | null;
  onFocus?: (identity: string) => void;
}

/**
 * Horizontal strip of participant thumbnails.
 * Clicking a thumbnail calls onFocus to maximize that participant.
 */
export default function CameraThumbnailStrip({ focusedIdentity, onFocus }: CameraThumbnailStripProps) {
  const participants = useParticipants();

  if (participants.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 bg-[#2b2d31]/50">
      {participants.map((p) => (
        <CameraThumbnail
          key={p.sid || p.identity}
          participant={p}
          isFocused={focusedIdentity === p.identity}
          onClick={() => onFocus?.(p.identity)}
        />
      ))}
    </div>
  );
}

function CameraThumbnail({ participant, isFocused, onClick }: {
  participant: Participant; isFocused: boolean; onClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const profile = useCommStore((s) => s.userProfiles[participant.identity]);
  const displayName = profile?.username || participant.identity.slice(-6);
  const avatarInitial = displayName[0]?.toUpperCase() || '?';
  const isMuted = !participant.isMicrophoneEnabled;
  const isScreenSharing = participant.isScreenShareEnabled;
  const avatarColor = getAvatarColor(participant.identity);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (!participant.isCameraEnabled) {
      el.srcObject = null;
      setHasVideo(false);
      return;
    }

    const pub = participant.getTrackPublication(Track.Source.Camera);
    if (pub?.track) {
      pub.track.attach(el);
      setHasVideo(true);
    }

    const onSubscribed = (_track: any, publication: any) => {
      if (publication?.source === Track.Source.Camera && publication?.track) {
        publication.track.attach(el);
        setHasVideo(true);
      }
    };

    const onUnsubscribed = (_track: any, publication: any) => {
      if (publication?.source === Track.Source.Camera) {
        setHasVideo(false);
      }
    };

    participant.on('trackSubscribed', onSubscribed);
    participant.on('trackUnsubscribed', onUnsubscribed);

    return () => {
      participant.off('trackSubscribed', onSubscribed);
      participant.off('trackUnsubscribed', onUnsubscribed);
      const p = participant.getTrackPublication(Track.Source.Camera);
      if (p?.track) p.track.detach(el);
      setHasVideo(false);
    };
  }, [participant, participant.isCameraEnabled]);

  return (
    <button
      onClick={onClick}
      className={`relative shrink-0 h-[72px] w-[100px] sm:h-[80px] sm:w-[120px] overflow-hidden rounded-lg border-2 transition-all cursor-pointer hover:opacity-90 ${
        isFocused ? 'border-[#5865f2] ring-1 ring-[#5865f2]/50' : 'border-[#3f4147]/50 hover:border-[#5865f2]/50'
      }`}
      style={{ backgroundColor: hasVideo ? '#1e1f22' : avatarColor }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: hasVideo ? 'block' : 'none',
          transform: participant.isLocal ? 'scaleX(-1)' : undefined,
        }}
      />
      {!hasVideo && (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-xs font-bold text-white">
            {avatarInitial}
          </div>
        </div>
      )}

      {/* Screen share indicator */}
      {isScreenSharing && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5 rounded bg-[#f23f43] px-1 py-0.5">
          <Monitor size={8} className="text-white" />
          <span className="text-[7px] font-bold text-white">LIVE</span>
        </div>
      )}

      {/* Name + mute indicator */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-0.5">
        {isMuted && <MicOff size={9} className="shrink-0 text-[#f23f43]" />}
        <span className="text-[9px] text-white/80 truncate">{displayName}</span>
      </div>
    </button>
  );
}
