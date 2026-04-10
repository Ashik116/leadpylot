'use client';

import { useEffect, useRef } from 'react';
import { useParticipants } from '@livekit/components-react';
import { useCommStore } from '@/stores/commStore';
import CommSocketService from '@/services/CommSocketService';

/**
 * Invisible component rendered inside <LiveKitRoom>.
 * Detects when any participant starts/stops screen sharing and:
 * 1. Updates the store's activeStreams
 * 2. Sends STREAM_START / STREAM_END WS events so other server members
 *    (who may not be in the voice channel) see the LIVE badge.
 */
export default function StreamDetector() {
  const participants = useParticipants();
  const { voiceChannelId, voiceServerId, setActiveStream, toggleWatchStream, watchingStreams } = useCommStore();
  const prevStreamersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!voiceChannelId || !voiceServerId) return;

    const currentStreamers = new Set(
      participants
        .filter((p) => p.isScreenShareEnabled)
        .map((p) => p.identity),
    );

    const prev = prevStreamersRef.current;

    // Detect new streamers
    currentStreamers.forEach((identity) => {
      if (!prev.has(identity)) {
        setActiveStream(voiceChannelId, identity, true);

        // Only broadcast WS event if this is the local participant starting
        const participant = participants.find((p) => p.identity === identity);
        if (participant?.isLocal) {
          // Auto-watch own stream so it renders immediately
          if (!watchingStreams.includes(identity)) {
            toggleWatchStream(identity);
          }
          CommSocketService.getInstance().send({
            type: 'STREAM_START',
            data: { channelId: voiceChannelId, serverId: voiceServerId },
          });
        }
      }
    });

    // Detect stopped streamers
    prev.forEach((identity) => {
      if (!currentStreamers.has(identity)) {
        setActiveStream(voiceChannelId, identity, false);

        // Only broadcast WS event if this was the local participant stopping
        // (We can't check isLocal for a participant that left, but if they were
        // local, the local participant's isScreenShareEnabled would have changed)
        const participant = participants.find((p) => p.identity === identity);
        if (participant?.isLocal) {
          CommSocketService.getInstance().send({
            type: 'STREAM_END',
            data: { channelId: voiceChannelId, serverId: voiceServerId },
          });
        }
      }
    });

    prevStreamersRef.current = currentStreamers;
  }, [participants, voiceChannelId, voiceServerId, setActiveStream]);

  return null;
}
