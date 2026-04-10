'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useParticipants } from '@livekit/components-react';
import { Track, type Participant } from 'livekit-client';
import { Monitor, Eye, EyeOff, Volume2 } from 'lucide-react';
import { useCommStore } from '@/stores/commStore';
import { useChannels } from '@/services/hooks/comm';

/**
 * Discord-style screen share view.
 * - Watched screen shares fill the available space (flex-1)
 * - Unwatched screen shares show "Watch Stream" opt-in cards
 * - No PiP overlay — cameras are rendered separately via CameraThumbnailStrip
 */
// Avatar colors for viewer circles
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

export default function ScreenShareView() {
  const participants = useParticipants();
  const userProfiles = useCommStore((s) => s.userProfiles);
  const watchingStreams = useCommStore((s) => s.watchingStreams);
  const toggleWatchStream = useCommStore((s) => s.toggleWatchStream);
  const activeChannelId = useCommStore((s) => s.activeChannelId);
  const activeServerId = useCommStore((s) => s.activeServerId);
  const { data: channels = [] } = useChannels(activeServerId);
  const activeChannel = channels.find((c) => c.id === activeChannelId);

  const allPresenters = useMemo(
    () => participants.filter((p) => p.isScreenShareEnabled),
    [participants],
  );

  const watchedPresenters = useMemo(
    () => allPresenters.filter((p) => watchingStreams.includes(p.identity)),
    [allPresenters, watchingStreams],
  );

  const unwatchedPresenters = useMemo(
    () => allPresenters.filter((p) => !watchingStreams.includes(p.identity)),
    [allPresenters, watchingStreams],
  );

  if (allPresenters.length === 0) return null;

  // Grid: 1 = full, 2 = side by side, 3+ = 2 cols
  const cols = watchedPresenters.length <= 1 ? 1 : 2;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Unwatched stream cards — shown as opt-in cards at the top */}
      {unwatchedPresenters.length > 0 && (
        <div className="shrink-0 flex gap-2 overflow-x-auto px-3 py-2">
          {unwatchedPresenters.map((p) => {
            const name = userProfiles[p.identity]?.username || p.identity.slice(-6);
            const initial = name[0]?.toUpperCase() || '?';
            return (
              <div
                key={p.sid || p.identity}
                className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-xl bg-[#2b2d31] border border-[#3f4147] px-6 py-4 min-w-[180px]"
              >
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865f2] text-sm font-bold text-white">
                    {initial}
                  </div>
                  <div className="absolute -top-1 -right-1 flex items-center gap-0.5 rounded bg-[#f23f43] px-1 py-0.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    <span className="text-[7px] font-bold text-white">LIVE</span>
                  </div>
                </div>
                <p className="text-xs text-[#949ba4]">
                  {name}
                </p>
                <button
                  onClick={() => toggleWatchStream(p.identity)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#5865f2] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4752c4] transition-colors"
                >
                  <Eye size={14} />
                  Watch Stream
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Watched screen shares — fill the remaining space */}
      {watchedPresenters.length > 0 && (
        <div className="flex flex-1 min-h-0 flex-col">
          {/* Stream viewer header bar */}
          <StreamViewerHeader
            channelName={activeChannel?.name || 'Voice Channel'}
            presenters={watchedPresenters}
            viewers={participants.filter((p) => !p.isScreenShareEnabled)}
            userProfiles={userProfiles}
          />
          <div
            className="flex-1 min-h-0 grid gap-2 p-2"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {watchedPresenters.map((presenter) => (
              <ScreenShareTile
                key={presenter.sid || presenter.identity}
                onStopWatching={() => toggleWatchStream(presenter.identity)}
                presenter={presenter}
                displayName={userProfiles[presenter.identity]?.username || presenter.identity.slice(-6)}
                isLocal={presenter.isLocal}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Single screen share tile — fills its grid cell */
function ScreenShareTile({ presenter, displayName, isLocal, onStopWatching }: { presenter: Participant; displayName: string; isLocal: boolean; onStopWatching: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !presenter) {
      if (el) el.srcObject = null;
      setHasVideo(false);
      return;
    }

    const pub = presenter.getTrackPublication(Track.Source.ScreenShare);
    if (pub?.track) {
      pub.track.attach(el);
      setHasVideo(true);
    }

    const onSubscribed = (_remoteTrack: any, publication: any) => {
      if (publication?.source === Track.Source.ScreenShare && publication?.track) {
        publication.track.attach(el);
        setHasVideo(true);
      }
    };

    const onPublished = (publication: any) => {
      if (publication?.source === Track.Source.ScreenShare && publication?.track) {
        publication.track.attach(el);
        setHasVideo(true);
      }
    };

    const onUnsubscribed = (_track: any, publication: any) => {
      if (publication?.source === Track.Source.ScreenShare) {
        setHasVideo(false);
      }
    };

    presenter.on('trackSubscribed', onSubscribed);
    presenter.on('trackPublished', onPublished);
    presenter.on('trackUnsubscribed', onUnsubscribed);

    return () => {
      presenter.off('trackSubscribed', onSubscribed);
      presenter.off('trackPublished', onPublished);
      presenter.off('trackUnsubscribed', onUnsubscribed);
      const p = presenter.getTrackPublication(Track.Source.ScreenShare);
      if (p?.track) p.track.detach(el);
      setHasVideo(false);
    };
  }, [presenter, presenter?.isScreenShareEnabled]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-xl bg-black/40 border border-[#3f4147]/50">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: hasVideo ? 'block' : 'none',
        }}
      />

      {!hasVideo && (
        <div className="flex h-full items-center justify-center">
          <div className="flex items-center gap-2 text-white/40">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
            <span className="text-sm">Loading screen share...</span>
          </div>
        </div>
      )}

      {/* Presenter label */}
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-black/60 backdrop-blur-sm px-2.5 py-1">
        <Monitor size={12} className="text-emerald-400" />
        <span className="text-xs font-medium text-white/90">
          {displayName} {isLocal && '(You)'}
        </span>
      </div>

      {/* LIVE badge + Stop Watching */}
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-red-500/90 px-2 py-0.5">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          <span className="text-[10px] font-bold text-white">LIVE</span>
        </div>
        <button
          onClick={onStopWatching}
          className="flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-sm px-2 py-1 text-[10px] font-medium text-white/80 hover:bg-[#f23f43] hover:text-white transition-colors"
        >
          <EyeOff size={12} />
          Stop Watching
        </button>
      </div>
    </div>
  );
}

/** Discord-style stream viewer header — channel name, presenter, viewer avatars */
function StreamViewerHeader({
  channelName, presenters, viewers, userProfiles,
}: {
  channelName: string;
  presenters: Participant[];
  viewers: Participant[];
  userProfiles: Record<string, { username: string } | undefined>;
}) {
  // Primary presenter name (first one)
  const primaryPresenter = presenters[0];
  const presenterName = primaryPresenter
    ? userProfiles[primaryPresenter.identity]?.username || primaryPresenter.identity.slice(-6)
    : '';

  const presenterLabel = presenters.length === 1
    ? `${presenterName}'s Screen`
    : `${presenters.length} Screens`;

  return (
    <div className="shrink-0 flex items-center gap-3 bg-[#1e1f22] px-4 py-2">
      {/* Channel name */}
      <div className="flex items-center gap-1.5 text-[#949ba4]">
        <Volume2 size={16} />
        <span className="text-sm font-semibold">{channelName}</span>
      </div>

      <div className="h-4 w-px bg-[#3f4147]" />

      {/* Presenter info */}
      <div className="flex items-center gap-1.5">
        <div
          className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ backgroundColor: getAvatarColor(primaryPresenter?.identity || '') }}
        >
          {presenterName[0]?.toUpperCase() || '?'}
        </div>
        <span className="text-sm font-medium text-[#dbdee1]">{presenterLabel}</span>
      </div>

      <div className="flex-1" />

      {/* Viewer avatars */}
      <div className="flex items-center">
        <div className="flex -space-x-1.5">
          {viewers.slice(0, 8).map((v) => {
            const name = userProfiles[v.identity]?.username || v.identity.slice(-6);
            return (
              <div
                key={v.sid || v.identity}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#1e1f22] text-[8px] font-bold text-white"
                style={{ backgroundColor: getAvatarColor(v.identity) }}
                title={name}
              >
                {name[0]?.toUpperCase() || '?'}
              </div>
            );
          })}
        </div>
        {viewers.length > 8 && (
          <span className="ml-1.5 text-[11px] text-[#949ba4]">+{viewers.length - 8}</span>
        )}
      </div>
    </div>
  );
}
