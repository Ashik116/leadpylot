import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { IncomingCall, PresenceStatus, UserProfile } from '@/types/comm.types';

export type CommView = 'servers' | 'dm';

interface CommState {
  // Navigation
  view: CommView;
  activeServerId: string | null;
  activeChannelId: string | null;
  activeDMId: string | null;
  memberSidebarOpen: boolean;

  // Voice
  voiceChannelId: string | null;
  voiceServerId: string | null;
  voiceRoomToken: string | null;
  voiceRoomUrl: string | null;
  voiceRoomName: string | null;
  voiceInitialCount: number | null; // participant count at join time for adaptive quality
  localMuted: boolean;
  localDeafened: boolean;
  localCameraOn: boolean;
  localScreenShareOn: boolean;
  pendingCameraToggle: boolean;
  pendingScreenShareToggle: boolean;
  incomingCall: IncomingCall | null;

  // Real-time state
  unreadCounts: Record<string, number>;
  typingUsers: Record<string, string[]>; // channelId -> userIds
  onlineUsers: Record<string, PresenceStatus>; // userId -> status
  voiceParticipants: Record<string, string[]>; // channelId -> userIds

  // Streams (opt-in screen share)
  activeStreams: Record<string, string[]>; // channelId -> streaming userIds
  watchingStreams: string[]; // identities the local user is watching

  // Voice participant media states (identity -> media state) — synced from LiveKit
  voiceMediaStates: Record<string, { muted: boolean; camera: boolean; screen: boolean }>;

  // User profiles cache (userId -> profile)
  userProfiles: Record<string, UserProfile>;

  // Widget
  widgetOpen: boolean;

  // Mobile
  mobileSidebarOpen: boolean;
}

interface CommActions {
  // Navigation
  setView: (view: CommView) => void;
  setActiveServer: (serverId: string | null) => void;
  setActiveChannel: (channelId: string | null) => void;
  setActiveDM: (dmId: string | null) => void;
  toggleMemberSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;

  // Voice
  setVoiceChannel: (channelId: string | null, serverId?: string | null, token?: string | null, url?: string | null, roomName?: string | null, initialCount?: number | null) => void;
  clearVoice: () => void;
  setLocalMuted: (muted: boolean) => void;
  setLocalDeafened: (deafened: boolean) => void;
  setLocalCameraOn: (on: boolean) => void;
  setLocalScreenShareOn: (on: boolean) => void;
  requestToggleCamera: () => void;
  requestToggleScreenShare: () => void;
  clearPendingCameraToggle: () => void;
  clearPendingScreenShareToggle: () => void;
  setIncomingCall: (call: IncomingCall | null) => void;

  // Real-time
  incrementUnread: (channelId: string) => void;
  clearUnread: (channelId: string) => void;
  setTypingUser: (channelId: string, userId: string) => void;
  clearTypingUser: (channelId: string, userId: string) => void;
  setUserPresence: (userId: string, status: PresenceStatus) => void;
  setVoiceParticipant: (channelId: string, userId: string, joined: boolean) => void;
  bulkSetPresence: (presences: Record<string, PresenceStatus>) => void;

  // Streams
  setActiveStream: (channelId: string, userId: string, active: boolean) => void;
  toggleWatchStream: (identity: string) => void;
  setWatchingStreams: (identities: string[]) => void;
  clearWatchingStreams: () => void;

  // Voice media states
  setVoiceMediaState: (identity: string, state: { muted: boolean; camera: boolean; screen: boolean }) => void;
  setVoiceMediaStates: (states: Record<string, { muted: boolean; camera: boolean; screen: boolean }>) => void;
  clearVoiceMediaStates: () => void;

  // User profiles
  setUserProfiles: (profiles: UserProfile[]) => void;
  getUserDisplayName: (userId: string) => string;

  // Widget
  toggleWidget: () => void;
  setWidgetOpen: (open: boolean) => void;

  // Reset
  reset: () => void;
}

const initialState: CommState = {
  view: 'servers',
  activeServerId: null,
  activeChannelId: null,
  activeDMId: null,
  memberSidebarOpen: true,
  voiceChannelId: null,
  voiceServerId: null,
  voiceRoomToken: null,
  voiceRoomUrl: null,
  voiceRoomName: null,
  voiceInitialCount: null,
  localMuted: false,
  localDeafened: false,
  localCameraOn: false,
  localScreenShareOn: false,
  pendingCameraToggle: false,
  pendingScreenShareToggle: false,
  incomingCall: null,
  unreadCounts: {},
  typingUsers: {},
  onlineUsers: {},
  voiceParticipants: {},
  activeStreams: {},
  watchingStreams: [],
  voiceMediaStates: {},
  userProfiles: {},
  widgetOpen: false,
  mobileSidebarOpen: false,
};

export const useCommStore = create<CommState & CommActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Navigation
      setView: (view) => set({ view, activeDMId: view === 'dm' ? get().activeDMId : null }),
      setActiveServer: (serverId) => set({ activeServerId: serverId, activeChannelId: null, view: 'servers' }),
      setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
      setActiveDM: (dmId) => set({ activeDMId: dmId, view: 'dm' }),
      toggleMemberSidebar: () => set({ memberSidebarOpen: !get().memberSidebarOpen }),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
      toggleMobileSidebar: () => set({ mobileSidebarOpen: !get().mobileSidebarOpen }),

      // Voice
      setVoiceChannel: (channelId, serverId, token, url, roomName, initialCount) =>
        set({ voiceChannelId: channelId, voiceServerId: serverId ?? null, voiceRoomToken: token ?? null, voiceRoomUrl: url ?? null, voiceRoomName: roomName ?? null, voiceInitialCount: initialCount ?? null }),
      clearVoice: () => {
        // Clear activeStreams for the channel we were in
        const channelId = get().voiceChannelId;
        const streams = { ...get().activeStreams };
        if (channelId) delete streams[channelId];
        set({ voiceChannelId: null, voiceServerId: null, voiceRoomToken: null, voiceRoomUrl: null, voiceRoomName: null, voiceInitialCount: null, localMuted: false, localDeafened: false, localCameraOn: false, localScreenShareOn: false, pendingCameraToggle: false, pendingScreenShareToggle: false, watchingStreams: [], activeStreams: streams, voiceMediaStates: {} });
      },
      setLocalMuted: (muted) => set({ localMuted: muted }),
      setLocalDeafened: (deafened) => {
        if (deafened) {
          // Deafening always forces mute
          set({ localDeafened: true, localMuted: true });
        } else {
          // Undeafening keeps mute off (user can re-mute manually)
          set({ localDeafened: false, localMuted: false });
        }
      },
      setLocalCameraOn: (on) => set({ localCameraOn: on }),
      setLocalScreenShareOn: (on) => set({ localScreenShareOn: on }),
      requestToggleCamera: () => set({ pendingCameraToggle: true }),
      requestToggleScreenShare: () => set({ pendingScreenShareToggle: true }),
      clearPendingCameraToggle: () => set({ pendingCameraToggle: false }),
      clearPendingScreenShareToggle: () => set({ pendingScreenShareToggle: false }),
      setIncomingCall: (call) => set({ incomingCall: call }),

      // Real-time
      incrementUnread: (channelId) =>
        set({ unreadCounts: { ...get().unreadCounts, [channelId]: (get().unreadCounts[channelId] || 0) + 1 } }),
      clearUnread: (channelId) => {
        const counts = { ...get().unreadCounts };
        delete counts[channelId];
        set({ unreadCounts: counts });
      },
      setTypingUser: (channelId, userId) => {
        const current = get().typingUsers[channelId] || [];
        if (!current.includes(userId)) {
          set({ typingUsers: { ...get().typingUsers, [channelId]: [...current, userId] } });
        }
      },
      clearTypingUser: (channelId, userId) => {
        const current = get().typingUsers[channelId] || [];
        set({ typingUsers: { ...get().typingUsers, [channelId]: current.filter((id) => id !== userId) } });
      },
      setUserPresence: (userId, status) =>
        set({ onlineUsers: { ...get().onlineUsers, [userId]: status } }),
      setVoiceParticipant: (channelId, userId, joined) => {
        const current = get().voiceParticipants[channelId] || [];
        if (joined && !current.includes(userId)) {
          set({ voiceParticipants: { ...get().voiceParticipants, [channelId]: [...current, userId] } });
        } else if (!joined) {
          set({ voiceParticipants: { ...get().voiceParticipants, [channelId]: current.filter((id) => id !== userId) } });
        }
      },
      bulkSetPresence: (presences) => set({ onlineUsers: { ...get().onlineUsers, ...presences } }),

      // Streams
      setActiveStream: (channelId, userId, active) => {
        const current = get().activeStreams[channelId] || [];
        if (active && !current.includes(userId)) {
          set({ activeStreams: { ...get().activeStreams, [channelId]: [...current, userId] } });
        } else if (!active) {
          const filtered = current.filter((id) => id !== userId);
          const streams = { ...get().activeStreams };
          if (filtered.length === 0) {
            delete streams[channelId];
          } else {
            streams[channelId] = filtered;
          }
          set({ activeStreams: streams, watchingStreams: get().watchingStreams.filter((id) => id !== userId) });
        }
      },
      toggleWatchStream: (identity) => {
        const current = get().watchingStreams;
        if (current.includes(identity)) {
          set({ watchingStreams: current.filter((id) => id !== identity) });
        } else {
          set({ watchingStreams: [...current, identity] });
        }
      },
      setWatchingStreams: (identities) => set({ watchingStreams: identities }),
      clearWatchingStreams: () => set({ watchingStreams: [] }),

      // Voice media states
      setVoiceMediaState: (identity, state) =>
        set({ voiceMediaStates: { ...get().voiceMediaStates, [identity]: state } }),
      setVoiceMediaStates: (states) => set({ voiceMediaStates: states }),
      clearVoiceMediaStates: () => set({ voiceMediaStates: {} }),

      // User profiles
      setUserProfiles: (profiles) => {
        const current = get().userProfiles;
        const updated = { ...current };
        for (const p of profiles) {
          updated[p.id] = p;
        }
        set({ userProfiles: updated });
      },
      getUserDisplayName: (userId) => {
        const profile = get().userProfiles[userId];
        return profile?.username || userId.slice(-6);
      },

      // Widget
      toggleWidget: () => set({ widgetOpen: !get().widgetOpen }),
      setWidgetOpen: (open) => set({ widgetOpen: open }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'comm-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        view: state.view,
        activeServerId: state.activeServerId,
        activeChannelId: state.activeChannelId,
        activeDMId: state.activeDMId,
        memberSidebarOpen: state.memberSidebarOpen,
        voiceChannelId: state.voiceChannelId,
        voiceServerId: state.voiceServerId,
      }),
    },
  ),
);
