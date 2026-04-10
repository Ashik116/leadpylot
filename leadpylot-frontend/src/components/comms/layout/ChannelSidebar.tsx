'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useCommStore } from '@/stores/commStore';
import { useAuthStore } from '@/stores/authStore';
import { useServer, useChannels, useJoinVoice, useLeaveVoice, useLeaveServer, useUserProfiles } from '@/services/hooks/comm';
import {
  Hash, Volume2, Video, Plus, ChevronDown, ChevronRight, Settings,
  UserPlus, Mic, MicOff, Headphones, HeadphoneOff, PhoneOff,
  LogOut, FolderPlus, Shield, X, Signal, MonitorUp, VideoIcon, Smile,
  ScreenShare, Camera,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CreateChannelModal from '../channel/CreateChannelModal';
import InviteModal from '../server/InviteModal';
import ServerSettings from '../server/ServerSettings';
import type { Channel, ChannelType } from '@/types/comm.types';

const channelIcons: Record<ChannelType, React.ReactNode> = {
  text: <Hash size={20} className="shrink-0 text-[#80848e]" />,
  voice: <Volume2 size={20} className="shrink-0 text-[#80848e]" />,
  video: <Video size={20} className="shrink-0 text-[#80848e]" />,
};

export default function ChannelSidebar() {
  const {
    activeServerId, activeChannelId, setActiveChannel,
    voiceParticipants, voiceChannelId, voiceServerId,
    unreadCounts, activeStreams, setMobileSidebarOpen,
  } = useCommStore();
  const user = useAuthStore((s) => s.user);
  const { data: serverInfo } = useServer(activeServerId);
  const { data: channels = [] } = useChannels(activeServerId);

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [textCollapsed, setTextCollapsed] = useState(false);
  const [voiceCollapsed, setVoiceCollapsed] = useState(false);

  const localMuted = useCommStore((s) => s.localMuted);
  const localDeafened = useCommStore((s) => s.localDeafened);
  const setLocalMuted = useCommStore((s) => s.setLocalMuted);
  const setLocalDeafened = useCommStore((s) => s.setLocalDeafened);

  const server = serverInfo?.server;
  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice' || c.type === 'video');
  const joinVoice = useJoinVoice();
  const leaveVoice = useLeaveVoice();
  const leaveServer = useLeaveServer();

  const handleVoiceChannelClick = useCallback((channel: Channel) => {
    setActiveChannel(channel.id);
    setMobileSidebarOpen(false);
    if (voiceChannelId === channel.id) return;
    if (activeServerId) {
      joinVoice.mutate({ channelId: channel.id, serverId: activeServerId, audio: true, video: channel.type === 'video' });
    }
  }, [activeServerId, voiceChannelId, setActiveChannel, setMobileSidebarOpen, joinVoice]);

  const isVoiceConnectedHere = voiceServerId === activeServerId && voiceChannelId;
  const connectedVoiceChannel = channels.find((c) => c.id === voiceChannelId);

  const allVoiceUserIds = useMemo(() => {
    const ids: string[] = [];
    for (const ch of voiceChannels) ids.push(...(voiceParticipants[ch.id] || []));
    return [...new Set(ids)];
  }, [voiceChannels, voiceParticipants]);
  useUserProfiles(allVoiceUserIds);

  return (
    <div className="flex h-full flex-col">
      {/* Server Header */}
      <ServerHeaderDropdown
        serverName={server?.name || 'Server'}
        isOpen={serverMenuOpen}
        onToggle={() => setServerMenuOpen(!serverMenuOpen)}
        onInvite={() => { setShowInvite(true); setServerMenuOpen(false); }}
        onSettings={() => { setShowSettings(true); setServerMenuOpen(false); }}
        onCreateChannel={() => { setShowCreateChannel(true); setServerMenuOpen(false); }}
        onLeave={() => { if (activeServerId) leaveServer.mutate(activeServerId); setServerMenuOpen(false); }}
      />

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto px-2 pt-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#1a1b1e]">
        <ChannelGroup label="TEXT CHANNELS" collapsed={textCollapsed} onToggle={() => setTextCollapsed(!textCollapsed)} onAdd={() => setShowCreateChannel(true)}>
          {textChannels.map((channel) => (
            <ChannelItem key={channel.id} channel={channel} isActive={activeChannelId === channel.id} onClick={() => { setActiveChannel(channel.id); setMobileSidebarOpen(false); }} unread={unreadCounts[channel.id] || 0} />
          ))}
        </ChannelGroup>

        <ChannelGroup label="VOICE CHANNELS" collapsed={voiceCollapsed} onToggle={() => setVoiceCollapsed(!voiceCollapsed)} onAdd={() => setShowCreateChannel(true)}>
          {voiceChannels.map((channel) => {
            const participants = voiceParticipants[channel.id] || [];
            return (
              <div key={channel.id}>
                <ChannelItem
                  channel={channel}
                  isActive={activeChannelId === channel.id}
                  onClick={() => handleVoiceChannelClick(channel)}
                  isVoiceConnected={voiceChannelId === channel.id}
                  isLive={(activeStreams[channel.id] || []).length > 0}
                />
                {participants.length > 0 && (
                  <div className="ml-5 space-y-px pb-1">
                    {participants.map((userId) => (
                      <VoiceMemberItem key={userId} userId={userId} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </ChannelGroup>
      </div>

      {/* Voice Connected Bar — Discord-style */}
      {isVoiceConnectedHere && connectedVoiceChannel && (
        <div className="border-t border-[#1f2023] bg-[#232428]">
          {/* Status row */}
          <div className="flex items-center gap-2 px-3 pt-2 pb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Signal size={16} className="shrink-0 text-[#23a55a]" />
                <span className="text-[13px] font-semibold text-[#23a55a]">Voice Connected</span>
              </div>
              <p className="truncate text-[11px] text-[#949ba4] pl-[22px]">
                {connectedVoiceChannel.name} / {server?.name}
              </p>
            </div>
            <button
              onClick={() => leaveVoice.mutate()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#b5bac1] hover:bg-[#35373c] hover:text-[#f23f43] transition-colors"
              title="Disconnect"
            >
              <PhoneOff size={18} />
            </button>
          </div>

          {/* Media action buttons row */}
          <SidebarMediaActions />
        </div>
      )}

      {/* User Panel — Discord-style */}
      <div className="flex items-center gap-1.5 bg-[#232428] px-2 py-1.5">
        <div className="relative shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5865f2] text-xs font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-[2.5px] border-[#232428] bg-[#23a55a]" />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="truncate text-[13px] font-semibold leading-tight text-[#f2f3f5]">{user?.name || 'User'}</p>
          <p className="truncate text-[11px] leading-tight text-[#949ba4]">Online</p>
        </div>
        <div className="flex shrink-0 items-center">
          <button onClick={() => setLocalMuted(!localMuted)} className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${localMuted ? 'text-[#f23f43] bg-[#f23f43]/10' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'}`} title={localMuted ? 'Unmute' : 'Mute'}>
            {localMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button onClick={() => setLocalDeafened(!localDeafened)} className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${localDeafened ? 'text-[#f23f43] bg-[#f23f43]/10' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'}`} title={localDeafened ? 'Undeafen' : 'Deafen'}>
            {localDeafened ? <HeadphoneOff size={18} /> : <Headphones size={18} />}
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1] transition-colors" title="User Settings">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {showCreateChannel && activeServerId && <CreateChannelModal serverId={activeServerId} onClose={() => setShowCreateChannel(false)} />}
      {showInvite && activeServerId && <InviteModal serverId={activeServerId} onClose={() => setShowInvite(false)} />}
      {showSettings && activeServerId && <ServerSettings serverId={activeServerId} onClose={() => setShowSettings(false)} />}
    </div>
  );
}

// ---- Sub-components ----

function ServerHeaderDropdown({ serverName, isOpen, onToggle, onInvite, onSettings, onCreateChannel, onLeave }: {
  serverName: string; isOpen: boolean; onToggle: () => void; onInvite: () => void; onSettings: () => void; onCreateChannel: () => void; onLeave: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) onToggle(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onToggle]);

  return (
    <div ref={menuRef} className="relative">
      <button onClick={onToggle} className={`flex h-12 w-full items-center justify-between px-4 shadow-[0_1px_0_rgba(0,0,0,0.2)] transition-colors ${isOpen ? 'bg-[#35373c]' : 'hover:bg-[#35373c]'}`}>
        <h2 className="truncate text-[15px] font-semibold text-[#f2f3f5]">{serverName}</h2>
        {isOpen ? <X size={18} className="text-[#b5bac1]" /> : <ChevronDown size={18} className="text-[#b5bac1]" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1 }}
            className="absolute left-2 right-2 top-[52px] z-50 rounded-lg bg-[#111214] p-1.5 shadow-xl">
            <DropdownItem icon={<UserPlus size={16} />} label="Invite People" accent onClick={onInvite} />
            <DropdownItem icon={<FolderPlus size={16} />} label="Create Channel" onClick={onCreateChannel} />
            <DropdownItem icon={<Shield size={16} />} label="Server Settings" onClick={onSettings} />
            <div className="my-1 h-px bg-[#2d2f32]" />
            <DropdownItem icon={<LogOut size={16} />} label="Leave Server" danger onClick={onLeave} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownItem({ icon, label, accent, danger, onClick }: { icon: React.ReactNode; label: string; accent?: boolean; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] transition-colors ${
      danger ? 'text-[#f23f43] hover:bg-[#f23f43] hover:text-white' : accent ? 'text-[#5865f2] hover:bg-[#5865f2] hover:text-white' : 'text-[#b5bac1] hover:bg-[#5865f2] hover:text-white'
    }`}>
      {icon}{label}
    </button>
  );
}

function VoiceMemberItem({ userId }: { userId: string }) {
  const profile = useCommStore((s) => s.userProfiles[userId]);
  const mediaState = useCommStore((s) => s.voiceMediaStates[userId]);
  const displayName = profile?.username || userId.slice(-6);
  const avatarInitial = displayName[0]?.toUpperCase() || '?';

  const isMuted = mediaState?.muted ?? false;
  const hasCamera = mediaState?.camera ?? false;
  const isStreaming = mediaState?.screen ?? false;

  return (
    <div className="flex items-center gap-2 rounded px-1.5 py-0.5 hover:bg-[#35373c] transition-colors">
      <div className="relative">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5865f2] text-[9px] font-bold text-white">{avatarInitial}</div>
      </div>
      <span className="flex-1 truncate text-[13px] text-[#949ba4]">{displayName}</span>
      <div className="flex items-center gap-0.5 shrink-0">
        {isStreaming && (
          <span className="flex items-center gap-0.5 rounded bg-[#f23f43] px-1 py-px">
            <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
            <span className="text-[8px] font-bold text-white">LIVE</span>
          </span>
        )}
        {hasCamera && <Camera size={12} className="text-[#949ba4]" />}
        {isMuted && <MicOff size={12} className="text-[#f23f43]" />}
      </div>
    </div>
  );
}

function ChannelGroup({ label, collapsed, onToggle, onAdd, children }: { label: string; collapsed: boolean; onToggle: () => void; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div className="mb-0.5">
      <div className="group flex items-center px-0.5 py-1.5">
        <button onClick={onToggle} className="flex flex-1 items-center gap-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#949ba4] hover:text-[#dbdee1] transition-colors">
          <ChevronDown size={12} className={`transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          {label}
        </button>
        <button onClick={onAdd} className="invisible text-[#949ba4] hover:text-[#dbdee1] group-hover:visible transition-colors"><Plus size={16} /></button>
      </div>
      {!collapsed && children}
    </div>
  );
}

function ChannelItem({ channel, isActive, onClick, unread = 0, isVoiceConnected = false, isLive = false }: {
  channel: Channel; isActive: boolean; onClick: () => void; unread?: number; isVoiceConnected?: boolean; isLive?: boolean;
}) {
  return (
    <button onClick={onClick} className={`group mb-px flex w-full items-center gap-1.5 rounded px-2 py-[5px] text-left transition-colors ${
      isActive ? 'bg-[#404249] text-[#f2f3f5]' : isVoiceConnected ? 'bg-[#23a55a]/10 text-[#23a55a]' : unread > 0 ? 'text-[#f2f3f5] hover:bg-[#35373c]' : 'text-[#80848e] hover:bg-[#35373c] hover:text-[#dbdee1]'
    }`}>
      {isVoiceConnected ? <Volume2 size={20} className="shrink-0 text-[#23a55a]" /> : channelIcons[channel.type]}
      <span className={`flex-1 truncate text-[15px] ${unread > 0 && !isActive ? 'font-semibold' : 'font-medium'}`}>{channel.name}</span>
      {isLive && (
        <span className="flex items-center gap-1 rounded bg-[#f23f43] px-1.5 py-0.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          <span className="text-[9px] font-bold text-white">LIVE</span>
        </span>
      )}
      {unread > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f23f43] px-1 text-[10px] font-bold text-white">{unread}</span>}
    </button>
  );
}

function SidebarMediaActions() {
  const { localScreenShareOn, localCameraOn, requestToggleScreenShare, requestToggleCamera } = useCommStore();

  return (
    <div className="flex items-center gap-1 px-2 pb-2">
      <button
        onClick={requestToggleScreenShare}
        className={`flex flex-1 items-center justify-center rounded-md py-2 transition-colors ${
          localScreenShareOn
            ? 'bg-[#5865f2]/20 text-[#5865f2] hover:bg-[#5865f2]/30'
            : 'bg-[#2b2d31] text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'
        }`}
        title={localScreenShareOn ? 'Stop Sharing' : 'Share Screen'}
      >
        <MonitorUp size={20} />
      </button>
      <button
        onClick={requestToggleCamera}
        className={`flex flex-1 items-center justify-center rounded-md py-2 transition-colors ${
          localCameraOn
            ? 'bg-[#5865f2]/20 text-[#5865f2] hover:bg-[#5865f2]/30'
            : 'bg-[#2b2d31] text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'
        }`}
        title={localCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
      >
        <VideoIcon size={20} />
      </button>
      <button
        className="flex flex-1 items-center justify-center rounded-md bg-[#2b2d31] py-2 text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1] transition-colors"
        title="Activities"
      >
        <Smile size={20} />
      </button>
    </div>
  );
}
