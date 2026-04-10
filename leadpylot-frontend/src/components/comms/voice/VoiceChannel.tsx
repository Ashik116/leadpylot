'use client';

import { useCallback, useState } from 'react';
import { useCommStore } from '@/stores/commStore';
import { useJoinVoice, useChannels, useUserProfiles } from '@/services/hooks/comm';
import VoiceControls from './VoiceControls';
import ParticipantGrid from './ParticipantGrid';
import ScreenShareView from './ScreenShareView';
import CameraThumbnailStrip from './CameraThumbnailStrip';
import FocusedParticipantView from './FocusedParticipantView';
import { PhoneCall, Eye, Radio } from 'lucide-react';

export default function VoiceChannel() {
  const {
    activeChannelId, activeServerId,
    voiceChannelId, voiceRoomToken,
    voiceParticipants, activeStreams, watchingStreams,
    setWatchingStreams,
  } = useCommStore();
  const joinVoice = useJoinVoice();
  const { data: channels = [] } = useChannels(activeServerId);

  const channel = channels.find((c) => c.id === activeChannelId);
  const isConnected = voiceChannelId === activeChannelId && !!voiceRoomToken;
  const participants = activeChannelId ? voiceParticipants[activeChannelId] || [] : [];
  const streamers = activeChannelId ? activeStreams[activeChannelId] || [] : [];
  const hasActiveStreams = streamers.length > 0;
  const isWatchingAny = watchingStreams.length > 0;

  // Focused participant — clicking a thumbnail maximizes them
  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);

  useUserProfiles(participants);
  useUserProfiles(streamers);
  const userProfiles = useCommStore((s) => s.userProfiles);

  const handleJoin = useCallback(() => {
    if (!activeChannelId || !activeServerId) return;
    joinVoice.mutate({
      channelId: activeChannelId,
      serverId: activeServerId,
      audio: true,
      video: channel?.type === 'video',
    });
  }, [activeChannelId, activeServerId, channel?.type, joinVoice]);

  const handleJoinStream = useCallback(() => {
    if (!activeChannelId || !activeServerId) return;
    joinVoice.mutate({
      channelId: activeChannelId,
      serverId: activeServerId,
      audio: true,
      video: false,
    });
    setWatchingStreams(streamers);
  }, [activeChannelId, activeServerId, joinVoice, streamers, setWatchingStreams]);

  const handleFocus = useCallback((identity: string) => {
    setFocusedIdentity((prev) => (prev === identity ? null : identity));
  }, []);

  const handleMinimize = useCallback(() => {
    setFocusedIdentity(null);
  }, []);

  // ---- Connected view ----
  if (isConnected) {
    const hasFocused = focusedIdentity !== null;

    return (
      <div className="flex h-full flex-col bg-[#313338]">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {hasFocused ? (
            <>
              {/* Focused participant takes the main view */}
              <FocusedParticipantView
                identity={focusedIdentity}
                onMinimize={handleMinimize}
              />
              {/* Everyone else in the thumbnail strip */}
              <div className="shrink-0">
                <CameraThumbnailStrip
                  focusedIdentity={focusedIdentity}
                  onFocus={handleFocus}
                />
              </div>
            </>
          ) : hasActiveStreams ? (
            <>
              {/* Screen shares take most of the space */}
              <ScreenShareView />
              {/* Camera thumbnail strip at the bottom when watching */}
              {isWatchingAny && (
                <div className="shrink-0">
                  <CameraThumbnailStrip
                    focusedIdentity={null}
                    onFocus={handleFocus}
                  />
                </div>
              )}
              {/* If not watching any, show participant grid below the watch-stream cards */}
              {!isWatchingAny && (
                <div className="flex-1 min-h-0">
                  <ParticipantGrid onFocusParticipant={handleFocus} />
                </div>
              )}
            </>
          ) : (
            /* No screen shares, no focus — full participant grid */
            <div className="flex-1 min-h-0">
              <ParticipantGrid onFocusParticipant={handleFocus} />
            </div>
          )}
        </div>
        {/* Controls bar — always pinned to bottom */}
        <div className="shrink-0 flex items-center justify-center bg-[#232428] px-4 py-2">
          <VoiceControls />
        </div>
      </div>
    );
  }

  // ---- Not connected view ----
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#313338]">
      <div className="mb-8 text-center">
        <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
          hasActiveStreams ? 'bg-[#f23f43]/10' : 'bg-[#5865f2]/10'
        }`}>
          {hasActiveStreams ? <Radio size={36} className="text-[#f23f43]" /> : <PhoneCall size={36} className="text-[#5865f2]" />}
        </div>
        <h2 className="text-2xl font-bold text-[#f2f3f5]">{channel?.name || 'Voice Channel'}</h2>
        <p className="mt-2 text-[15px] text-[#949ba4]">
          {hasActiveStreams
            ? `${streamers.length} stream${streamers.length > 1 ? 's' : ''} active`
            : participants.length > 0
              ? `${participants.length} member${participants.length > 1 ? 's' : ''} connected`
              : 'No one is here yet \u2014 be the first to join!'}
        </p>
      </div>

      {hasActiveStreams && (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
          {streamers.map((uid) => {
            const profile = userProfiles[uid];
            const name = profile?.username || uid.slice(-6);
            const initial = name[0]?.toUpperCase() || '?';
            return (
              <div key={uid} className="flex flex-col items-center gap-1">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f23f43] text-lg font-bold text-white">
                    {initial}
                  </div>
                  <div className="absolute -top-1 -right-1 flex items-center gap-0.5 rounded bg-[#f23f43] px-1 py-0.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    <span className="text-[8px] font-bold text-white">LIVE</span>
                  </div>
                </div>
                <span className="text-xs text-[#949ba4]">{name}</span>
              </div>
            );
          })}
        </div>
      )}

      {participants.filter((uid) => !streamers.includes(uid)).length > 0 && (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          {participants.filter((uid) => !streamers.includes(uid)).map((uid) => {
            const profile = userProfiles[uid];
            const name = profile?.username || uid.slice(-6);
            const initial = name[0]?.toUpperCase() || '?';
            return (
              <div key={uid} className="flex flex-col items-center gap-1">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5865f2] text-base font-bold text-white">
                  {initial}
                </div>
                <span className="text-xs text-[#949ba4]">{name}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        {hasActiveStreams ? (
          <button
            onClick={handleJoinStream}
            disabled={joinVoice.isPending}
            className="flex items-center gap-2 rounded-lg bg-[#f23f43] px-6 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-[#da373c] disabled:opacity-50"
          >
            <Eye size={18} />
            {joinVoice.isPending ? 'Joining...' : 'Watch Stream'}
          </button>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joinVoice.isPending}
            className="flex items-center gap-2 rounded-lg bg-[#23a55a] px-6 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-[#1a8d48] disabled:opacity-50"
          >
            <PhoneCall size={18} />
            {joinVoice.isPending ? 'Connecting...' : 'Join Voice'}
          </button>
        )}
      </div>
    </div>
  );
}
