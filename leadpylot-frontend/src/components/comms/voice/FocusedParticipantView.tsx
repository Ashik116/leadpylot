'use client';

import { useEffect, useRef, useState } from 'react';
import { useParticipants } from '@livekit/components-react';
import { Track, type Participant } from 'livekit-client';
import { Monitor, Mic, MicOff, Minimize2 } from 'lucide-react';
import { useCommStore } from '@/stores/commStore';

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

interface Props {
  identity: string;
  onMinimize: () => void;
}

/**
 * Shows a single participant's camera or screen share as the focused/main view.
 * If the participant has a screen share, that takes priority.
 * Otherwise shows their camera. If neither, shows their avatar.
 */
export default function FocusedParticipantView({ identity, onMinimize }: Props) {
  const participants = useParticipants();
  const participant = participants.find((p) => p.identity === identity);
  const profile = useCommStore((s) => s.userProfiles[identity]);
  const displayName = profile?.username || identity.slice(-6);

  if (!participant) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center bg-[#2b2d31] rounded-xl m-2">
        <p className="text-sm text-[#949ba4]">Participant left the call</p>
      </div>
    );
  }

  const hasScreenShare = participant.isScreenShareEnabled;

  return (
    <div className="flex flex-1 min-h-0 flex-col relative m-2">
      {/* Main video area */}
      <div className="flex-1 min-h-0 relative rounded-xl overflow-hidden">
        {hasScreenShare ? (
          <ScreenShareFocus participant={participant} displayName={displayName} />
        ) : (
          <CameraFocus participant={participant} displayName={displayName} />
        )}

        {/* Top bar overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 rounded-lg bg-black/60 backdrop-blur-sm px-2.5 py-1">
            {hasScreenShare && <Monitor size={12} className="text-emerald-400" />}
            <span className="text-xs font-medium text-white/90">
              {displayName} {participant.isLocal && '(You)'}
            </span>
            {!participant.isMicrophoneEnabled && (
              <MicOff size={12} className="text-[#f23f43]" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasScreenShare && (
              <div className="flex items-center gap-1.5 rounded-lg bg-red-500/90 px-2 py-0.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                <span className="text-[10px] font-bold text-white">LIVE</span>
              </div>
            )}
            <button
              onClick={onMinimize}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm text-white/70 hover:text-white transition-colors"
              title="Back to grid view"
            >
              <Minimize2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Focused screen share view */
function ScreenShareFocus({ participant, displayName }: { participant: Participant; displayName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) { setHasVideo(false); return; }

    const pub = participant.getTrackPublication(Track.Source.ScreenShare);
    if (pub?.track) { pub.track.attach(el); setHasVideo(true); }

    const onSubscribed = (_t: any, pub: any) => {
      if (pub?.source === Track.Source.ScreenShare && pub?.track) { pub.track.attach(el); setHasVideo(true); }
    };
    const onPublished = (pub: any) => {
      if (pub?.source === Track.Source.ScreenShare && pub?.track) { pub.track.attach(el); setHasVideo(true); }
    };
    const onUnsubscribed = (_t: any, pub: any) => {
      if (pub?.source === Track.Source.ScreenShare) setHasVideo(false);
    };

    participant.on('trackSubscribed', onSubscribed);
    participant.on('trackPublished', onPublished);
    participant.on('trackUnsubscribed', onUnsubscribed);

    return () => {
      participant.off('trackSubscribed', onSubscribed);
      participant.off('trackPublished', onPublished);
      participant.off('trackUnsubscribed', onUnsubscribed);
      const p = participant.getTrackPublication(Track.Source.ScreenShare);
      if (p?.track) p.track.detach(el);
    };
  }, [participant, participant.isScreenShareEnabled]);

  return (
    <>
      <video ref={videoRef} autoPlay playsInline muted
        className="h-full w-full object-contain bg-black"
        style={{ display: hasVideo ? 'block' : 'none' }}
      />
      {!hasVideo && (
        <div className="flex h-full w-full items-center justify-center bg-[#1e1f22]">
          <div className="flex items-center gap-2 text-white/40">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
            <span className="text-sm">Loading screen share...</span>
          </div>
        </div>
      )}
    </>
  );
}

/** Focused camera view */
function CameraFocus({ participant, displayName }: { participant: Participant; displayName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const avatarColor = getAvatarColor(participant.identity);
  const avatarInitial = displayName[0]?.toUpperCase() || '?';

  useEffect(() => {
    const el = videoRef.current;
    if (!el) { setHasVideo(false); return; }

    if (!participant.isCameraEnabled) { el.srcObject = null; setHasVideo(false); return; }

    const pub = participant.getTrackPublication(Track.Source.Camera);
    if (pub?.track) { pub.track.attach(el); setHasVideo(true); }

    const onSub = (_t: any, pub: any) => {
      if (pub?.source === Track.Source.Camera && pub?.track) { pub.track.attach(el); setHasVideo(true); }
    };
    const onUnsub = (_t: any, pub: any) => {
      if (pub?.source === Track.Source.Camera) setHasVideo(false);
    };

    participant.on('trackSubscribed', onSub);
    participant.on('trackUnsubscribed', onUnsub);

    return () => {
      participant.off('trackSubscribed', onSub);
      participant.off('trackUnsubscribed', onUnsub);
      const p = participant.getTrackPublication(Track.Source.Camera);
      if (p?.track) p.track.detach(el);
    };
  }, [participant, participant.isCameraEnabled]);

  return (
    <>
      <video ref={videoRef} autoPlay playsInline muted
        className="h-full w-full object-cover"
        style={{
          display: hasVideo ? 'block' : 'none',
          transform: participant.isLocal ? 'scaleX(-1)' : undefined,
        }}
      />
      {!hasVideo && (
        <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: avatarColor }}>
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-black/20 text-4xl font-semibold text-white">
            {avatarInitial}
          </div>
        </div>
      )}
    </>
  );
}
