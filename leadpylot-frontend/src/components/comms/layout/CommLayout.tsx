'use client';

import { useMemo, useCallback, useRef } from 'react';
import { useCommStore } from '@/stores/commStore';
import ServerBar from './ServerBar';
import ChannelSidebar from './ChannelSidebar';
import CommHeader from './CommHeader';
import MemberSidebar from './MemberSidebar';
import MessageArea from '../message/MessageArea';
import MessageInput from '../message/MessageInput';
import TypingIndicator from '../message/TypingIndicator';
import DMList from '../dm/DMList';
import DMConversation from '../dm/DMConversation';
import VoiceChannel from '../voice/VoiceChannel';
import VoiceStateSync from '../voice/VoiceStateSync';
import StreamDetector from '../voice/StreamDetector';
import VoiceSoundEffects from '../voice/VoiceSoundEffects';
import ActiveCallBar from '../voice/ActiveCallBar';
import IncomingCallModal from '../voice/IncomingCallModal';
import { useChannels } from '@/services/hooks/comm';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { RoomOptions, VideoPresets, ScreenSharePresets, DisconnectReason } from 'livekit-client';
import '@livekit/components-styles';
import { AnimatePresence, motion } from 'framer-motion';

function getAdaptiveRoomOptions(count: number): RoomOptions {
  if (count <= 4) {
    return {
      videoCaptureDefaults: { resolution: { width: 1280, height: 720, frameRate: 30 } },
      publishDefaults: {
        simulcast: true,
        videoSimulcastLayers: [VideoPresets.h360, VideoPresets.h180],
        screenShareSimulcastLayers: [ScreenSharePresets.h1080fps15, ScreenSharePresets.h720fps15],
        videoCodec: 'vp8',
      },
      adaptiveStream: true,
      dynacast: true,
    };
  }
  if (count <= 15) {
    return {
      videoCaptureDefaults: { resolution: { width: 1280, height: 720, frameRate: 24 } },
      publishDefaults: {
        simulcast: true,
        videoSimulcastLayers: [VideoPresets.h360, VideoPresets.h180],
        screenShareSimulcastLayers: [ScreenSharePresets.h1080fps15, ScreenSharePresets.h720fps5],
        videoCodec: 'vp8',
      },
      adaptiveStream: true,
      dynacast: true,
    };
  }
  if (count <= 49) {
    return {
      videoCaptureDefaults: { resolution: { width: 854, height: 480, frameRate: 20 } },
      publishDefaults: {
        simulcast: true,
        videoSimulcastLayers: [VideoPresets.h180],
        screenShareSimulcastLayers: [ScreenSharePresets.h720fps5],
        videoCodec: 'vp8',
      },
      adaptiveStream: true,
      dynacast: true,
    };
  }
  return {
    videoCaptureDefaults: { resolution: { width: 640, height: 360, frameRate: 15 } },
    publishDefaults: {
      simulcast: true,
      videoSimulcastLayers: [VideoPresets.h180],
      screenShareSimulcastLayers: [ScreenSharePresets.h720fps5],
      videoCodec: 'vp8',
    },
    adaptiveStream: true,
    dynacast: true,
  };
}

export default function CommLayout() {
  // Use individual selectors to avoid re-rendering on unrelated store changes
  const view = useCommStore((s) => s.view);
  const activeServerId = useCommStore((s) => s.activeServerId);
  const activeChannelId = useCommStore((s) => s.activeChannelId);
  const activeDMId = useCommStore((s) => s.activeDMId);
  const memberSidebarOpen = useCommStore((s) => s.memberSidebarOpen);
  const voiceRoomToken = useCommStore((s) => s.voiceRoomToken);
  const voiceRoomUrl = useCommStore((s) => s.voiceRoomUrl);
  const voiceChannelId = useCommStore((s) => s.voiceChannelId);
  const voiceInitialCount = useCommStore((s) => s.voiceInitialCount);
  const incomingCall = useCommStore((s) => s.incomingCall);

  // Capture muted state at connection time — must NOT be reactive to avoid LiveKitRoom reconnects
  const initialAudioRef = useRef<boolean | null>(null);
  if (voiceRoomToken && initialAudioRef.current === null) {
    // Token just arrived — snapshot the current muted state
    initialAudioRef.current = !useCommStore.getState().localMuted;
  }
  if (!voiceRoomToken) {
    // Disconnected — reset for next connection
    initialAudioRef.current = null;
  }

  const { data: channels } = useChannels(activeServerId);

  const activeChannel = channels?.find((c) => c.id === activeChannelId);
  const isVoiceView = activeChannel && (activeChannel.type === 'voice' || activeChannel.type === 'video');
  const isViewingActiveCall = voiceRoomToken && voiceChannelId === activeChannelId;
  const isInCallButElsewhere = !!voiceRoomToken && voiceChannelId !== activeChannelId;

  const roomOptions = useMemo(() => getAdaptiveRoomOptions(voiceInitialCount ?? 0), [voiceInitialCount]);
  const wsUrl = voiceRoomUrl?.replace(/^http/, 'ws') || '';

  // Only clear voice on intentional/permanent disconnects, not transient reconnections
  const handleDisconnected = useCallback((reason?: DisconnectReason) => {
    // Ignore transient disconnects (ICE restart, migration, etc.)
    // DisconnectReason values: CLIENT_INITIATED=0, DUPLICATE_IDENTITY=1, SERVER_SHUTDOWN=2,
    // PARTICIPANT_REMOVED=3, ROOM_DELETED=4, STATE_MISMATCH=5, JOIN_FAILURE=6, MIGRATION=7,
    // SIGNAL_CLOSE=8, ROOM_CLOSED=9
    if (reason === DisconnectReason.MIGRATION || reason === DisconnectReason.STATE_MISMATCH || reason === DisconnectReason.SIGNAL_CLOSE) {
      return; // LiveKit will auto-reconnect, don't nuke the state
    }
    useCommStore.getState().clearVoice();
  }, []);

  const mainContent = (
    <>
      <CommHeader />
      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {isInCallButElsewhere && <div className="shrink-0"><ActiveCallBar /></div>}

          <AnimatePresence mode="wait">
            {view === 'dm' && activeDMId ? (
              <motion.div key={`dm-${activeDMId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className="flex flex-1 flex-col overflow-hidden">
                <DMConversation />
              </motion.div>
            ) : isViewingActiveCall || isVoiceView ? (
              <motion.div key={`voice-${activeChannelId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full">
                  <VoiceChannel />
                </div>
              </motion.div>
            ) : activeChannelId ? (
              <motion.div key={`text-${activeChannelId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className="flex flex-1 flex-col overflow-hidden">
                <MessageArea />
                <TypingIndicator />
                <MessageInput />
              </motion.div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#404249]">
                    <span className="text-3xl">💬</span>
                  </div>
                  <p className="text-base font-medium text-[#dbdee1]">No Text Channels</p>
                  <p className="text-sm text-[#949ba4]">Select a channel or conversation to get started</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* MemberSidebar moved to outer level for responsive rendering */}
      </div>
    </>
  );

  const { mobileSidebarOpen, setMobileSidebarOpen, memberSidebarOpen: mso } = useCommStore();

  const sidebarContent = (
    <>
      <ServerBar />
      <div className="flex w-60 shrink-0 flex-col bg-[#2b2d31]">
        {view === 'servers' && activeServerId ? <ChannelSidebar /> : <DMList />}
      </div>
    </>
  );

  return (
    <div className="flex h-full overflow-hidden bg-[#313338]">
      {/* Desktop/Tablet: sidebars in normal flow */}
      <div className="hidden md:flex shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile: sidebars as overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex shrink-0 h-full">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={() => setMobileSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#313338]">
        {voiceRoomToken && wsUrl ? (
          <LiveKitRoom
            serverUrl={wsUrl}
            token={voiceRoomToken}
            connect={true}
            audio={initialAudioRef.current ?? true}
            video={false}
            options={roomOptions}
            onDisconnected={handleDisconnected}
            style={{ display: 'contents' }}
          >
            <RoomAudioRenderer />
            <VoiceStateSync />
            <StreamDetector />
            <VoiceSoundEffects />
            {mainContent}
          </LiveKitRoom>
        ) : (
          mainContent
        )}
      </div>

      {/* MemberSidebar: inline on desktop, overlay on tablet, hidden on mobile */}
      {view === 'servers' && activeServerId && mso && activeChannel?.type === 'text' && (
        <>
          {/* Desktop inline */}
          <div className="hidden lg:block">
            <MemberSidebar />
          </div>
          {/* Tablet overlay */}
          <div className="fixed inset-0 z-40 hidden md:flex lg:hidden">
            <div className="flex-1" onClick={() => useCommStore.getState().toggleMemberSidebar()} />
            <MemberSidebar />
          </div>
        </>
      )}

      {incomingCall && <IncomingCallModal />}
    </div>
  );
}
