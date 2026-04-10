'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  useParticipants,
  useSpeakingParticipants,
} from '@livekit/components-react';
import { Track, ConnectionQuality, type Participant } from 'livekit-client';
import { Mic, MicOff, Pin, PinOff, Wifi, WifiOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCommStore } from '@/stores/commStore';
import { useUserProfiles } from '@/services/hooks/comm';

const STRIP_PAGE_SIZE = 8;

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

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

interface GridProps {
  onFocusParticipant?: (identity: string) => void;
}

export default function ParticipantGrid({ onFocusParticipant }: GridProps = {}) {
  const participants = useParticipants();
  const speakingParticipants = useSpeakingParticipants();
  const count = participants.length;
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  // Pin state: user can click a tile to pin it as the featured speaker
  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);

  // Pagination state for the thumbnail strip in speaker-focus mode
  const [stripPage, setStripPage] = useState(0);

  // Debounced active speaker tracking (2s debounce to avoid flickering)
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const speakerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track active speaker with debounce
  useEffect(() => {
    if (speakingParticipants.length > 0) {
      const topSpeaker = speakingParticipants[0]?.identity;
      if (topSpeaker && topSpeaker !== activeSpeaker) {
        if (speakerTimeoutRef.current) clearTimeout(speakerTimeoutRef.current);
        speakerTimeoutRef.current = setTimeout(() => {
          setActiveSpeaker(topSpeaker);
        }, 2000);
      }
    }
    return () => {
      if (speakerTimeoutRef.current) clearTimeout(speakerTimeoutRef.current);
    };
  }, [speakingParticipants, activeSpeaker]);

  // Fetch profiles for all participants
  const participantIds = useMemo(() => participants.map((p) => p.identity).filter(Boolean), [participants]);
  useUserProfiles(participantIds);

  const togglePin = useCallback((identity: string) => {
    setPinnedIdentity((prev) => (prev === identity ? null : identity));
  }, []);

  if (count === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[#949ba4]">
        <p>Waiting for participants...</p>
      </div>
    );
  }

  // ---- Layout Mode: Equal Grid (1-9 participants) ----
  if (count <= 9) {
    const desktopCols = count <= 1 ? 1 : count <= 4 ? 2 : 3;
    const cols = isMobile ? Math.min(desktopCols, count <= 2 ? 1 : 2) : desktopCols;
    const rows = Math.ceil(count / cols);
    return (
      <div
        className="grid h-full gap-2 p-2 sm:gap-3 sm:p-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {participants.map((p) => (
          <ParticipantTile
            key={p.sid || p.identity}
            participant={p}
            isSpeaking={speakingParticipants.some((sp) => sp.identity === p.identity)}
            size="large"
            onPin={() => togglePin(p.identity)}
            isPinned={pinnedIdentity === p.identity}
            onDoubleClick={onFocusParticipant ? () => onFocusParticipant(p.identity) : undefined}
          />
        ))}
      </div>
    );
  }

  // ---- Layout Mode: Speaker Focus (10+ participants) ----
  const featured = pinnedIdentity
    ? participants.find((p) => p.identity === pinnedIdentity)
    : activeSpeaker
      ? participants.find((p) => p.identity === activeSpeaker)
      : participants[0];

  const others = participants.filter((p) => p.identity !== featured?.identity);
  const totalStripPages = Math.ceil(others.length / STRIP_PAGE_SIZE);
  const stripStart = stripPage * STRIP_PAGE_SIZE;
  const visibleStrip = others.slice(stripStart, stripStart + STRIP_PAGE_SIZE);

  return (
    <div className="flex h-full flex-col gap-2 p-2 sm:p-3">
      {/* Featured speaker — large tile */}
      {featured && (
        <div className="flex-[3] min-h-0">
          <ParticipantTile
            participant={featured}
            isSpeaking={speakingParticipants.some((sp) => sp.identity === featured.identity)}
            size="featured"
            onPin={() => togglePin(featured.identity)}
            isPinned={pinnedIdentity === featured.identity}
            onDoubleClick={onFocusParticipant ? () => onFocusParticipant(featured.identity) : undefined}
          />
        </div>
      )}

      {/* Thumbnail strip — paginated */}
      <div className="flex items-center gap-2" style={{ height: '120px' }}>
        <button
          onClick={() => setStripPage((p) => Math.max(0, p - 1))}
          disabled={stripPage === 0}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#2b2d31] text-[#949ba4] transition-colors hover:bg-[#404249] hover:text-[#dbdee1] disabled:opacity-20 disabled:cursor-default"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex flex-1 gap-2 overflow-hidden">
          {visibleStrip.map((p) => (
            <div key={p.sid || p.identity} className="w-[140px] shrink-0 h-full">
              <ParticipantTile
                participant={p}
                isSpeaking={speakingParticipants.some((sp) => sp.identity === p.identity)}
                size="small"
                onPin={() => togglePin(p.identity)}
                isPinned={pinnedIdentity === p.identity}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => setStripPage((p) => Math.min(totalStripPages - 1, p + 1))}
          disabled={stripPage >= totalStripPages - 1}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#2b2d31] text-[#949ba4] transition-colors hover:bg-[#404249] hover:text-[#dbdee1] disabled:opacity-20 disabled:cursor-default"
        >
          <ChevronRight size={16} />
        </button>

        {totalStripPages > 1 && (
          <span className="shrink-0 text-[10px] text-[#949ba4] w-10 text-center">
            {stripPage + 1}/{totalStripPages}
          </span>
        )}
      </div>
    </div>
  );
}

// ---- Participant Tile (manual track attach — proven to work) ----

interface TileProps {
  participant: Participant;
  isSpeaking: boolean;
  size: 'featured' | 'large' | 'small';
  onPin: () => void;
  isPinned: boolean;
  onDoubleClick?: () => void;
}

function ParticipantTile({ participant, isSpeaking, size, onPin, isPinned, onDoubleClick }: TileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const identity = participant.identity;
  const isLocal = participant.isLocal;
  const isMuted = !participant.isMicrophoneEnabled;
  const isCameraEnabled = participant.isCameraEnabled;
  const connQuality = participant.connectionQuality;

  // Resolve display name from profile cache
  const profile = useCommStore((s) => s.userProfiles[identity]);
  const displayName = profile?.username || identity.slice(-6);
  const avatarInitial = displayName[0]?.toUpperCase() || '?';

  // Auto-degrade: hide video for participants with lost connection
  const shouldShowVideo = isCameraEnabled && connQuality !== ConnectionQuality.Lost;

  // Manual track attach/detach — handles subscription lifecycle correctly
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !shouldShowVideo) {
      if (el) el.srcObject = null;
      setHasVideo(false);
      return;
    }

    const pub = participant.getTrackPublication(Track.Source.Camera);
    if (pub?.track) {
      pub.track.attach(el);
      setHasVideo(true);
    }

    const onSubscribed = (_remoteTrack: any, publication: any) => {
      if (publication?.source === Track.Source.Camera && publication?.track) {
        publication.track.attach(el);
        setHasVideo(true);
      }
    };

    const onPublished = (publication: any) => {
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
    participant.on('trackPublished', onPublished);
    participant.on('trackUnsubscribed', onUnsubscribed);

    return () => {
      participant.off('trackSubscribed', onSubscribed);
      participant.off('trackPublished', onPublished);
      participant.off('trackUnsubscribed', onUnsubscribed);
      const p = participant.getTrackPublication(Track.Source.Camera);
      if (p?.track) p.track.detach(el);
      setHasVideo(false);
    };
  }, [participant, shouldShowVideo]);

  const avatarSize = size === 'featured' ? 'h-24 w-24 text-4xl' : size === 'large' ? 'h-16 w-16 text-2xl' : 'h-10 w-10 text-sm';
  const avatarColor = getAvatarColor(identity);

  return (
    <div
      className={`relative h-full min-h-0 overflow-hidden rounded-xl border-2 transition-all ${
        isSpeaking ? 'border-[#23a55a]' : 'border-transparent'
      }`}
      style={{ backgroundColor: hasVideo ? '#2b2d31' : avatarColor, cursor: onDoubleClick ? 'pointer' : undefined }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={onDoubleClick}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: hasVideo ? 'block' : 'none', transform: isLocal ? 'scaleX(-1)' : undefined }}
      />

      {!hasVideo && (
        <div className="flex h-full w-full items-center justify-center">
          <div className={`flex items-center justify-center rounded-full bg-black/20 font-semibold text-white ${avatarSize}`}>
            {avatarInitial}
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
        <span className={`flex-1 truncate font-medium text-[#dbdee1] ${size === 'small' ? 'text-[11px]' : 'text-sm'}`}>
          {displayName} {isLocal && '(You)'}
        </span>
        <ConnectionBadge quality={connQuality} />
        {isMuted ? (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f23f43]">
            <MicOff size={12} className="text-white" />
          </div>
        ) : isSpeaking ? (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#23a55a]">
            <Mic size={12} className="text-white" />
          </div>
        ) : null}
      </div>

      {isHovered && size !== 'small' && (
        <button
          onClick={(e) => { e.stopPropagation(); onPin(); }}
          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded bg-black/60 text-[#b5bac1] hover:text-white transition-colors"
          title={isPinned ? 'Unpin' : 'Pin to main view'}
        >
          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
      )}

      {isPinned && (
        <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-[#5865f2] px-2 py-0.5">
          <Pin size={10} className="text-white" />
          <span className="text-[10px] font-bold text-white">PINNED</span>
        </div>
      )}
    </div>
  );
}

// ---- Connection Quality Badge ----

function ConnectionBadge({ quality }: { quality: ConnectionQuality }) {
  if (quality === ConnectionQuality.Excellent || quality === ConnectionQuality.Good) {
    return <span title="Good connection"><Wifi size={12} className="text-[#23a55a]" /></span>;
  }
  if (quality === ConnectionQuality.Poor) {
    return <span title="Poor connection"><Wifi size={12} className="text-[#f0b232]" /></span>;
  }
  if (quality === ConnectionQuality.Lost) {
    return <span title="Connection lost"><WifiOff size={12} className="text-[#f23f43]" /></span>;
  }
  return null;
}
