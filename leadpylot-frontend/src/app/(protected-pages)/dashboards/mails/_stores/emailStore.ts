/**
 * Email Store - Zustand State Management
 * Central state for the Missive-style email system
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EmailConversation, EmailFilters, PresenceUser } from '../_types/email.types';
import { InternalComment } from '../_types';

export const getFiltersFromView = (
  view: EmailState['currentView'],
  agent_id: string | null,
  stage: string | null
): EmailFilters => {
  if (!view) return {};

  const baseFilters: EmailFilters = {};

  switch (view) {
    case 'inbox':
      return {
        ...baseFilters,
        status: 'incoming',
        agent_id: agent_id ?? undefined,
        stage: stage ?? undefined,
      };
    case 'sent':
      return {
        ...baseFilters,
        status: 'outgoing',
        agent_id: agent_id ?? undefined,
        stage: stage ?? undefined,
      };
    case 'drafts':
      return {
        ...baseFilters,
        view: 'drafts',
        agent_id: agent_id ?? undefined,
        stage: stage ?? undefined,
      };
    case 'starred':
      return {
        ...baseFilters,
        view: 'starred',
        is_starred: true,
        agent_id: agent_id ?? undefined,
        stage: stage ?? undefined,
      };
    case 'snoozed':
      return {
        ...baseFilters,
        is_snoozed: true,
        agent_id: agent_id ?? undefined,
        stage: stage ?? undefined,
      };
    case 'trash':
      return {
        ...baseFilters,
        is_active: false,
        agent_id: agent_id ?? undefined,
        stage: stage ?? undefined,
      };
    case 'all':
      return { ...baseFilters, agent_id: agent_id ?? undefined, stage: stage ?? undefined };
    case 'archived':
      return {
        ...baseFilters,
        status: 'all',
        agent_id: agent_id ?? undefined,
        stage: stage ?? undefined,
      };
    case 'pending':
      return {
        ...baseFilters,
        viewed: false,
        agent_id: agent_id ?? undefined,
        stage: stage ?? undefined,
      };
    default:
      return { ...baseFilters, agent_id: agent_id ?? undefined, stage: stage ?? undefined };
  }
};

interface EmailState {
  // Conversations
  conversations: EmailConversation[];
  selectedConversation: EmailConversation | null;

  // Filters & view
  filters: EmailFilters;
  currentView:
  | 'inbox'
  | 'sent'
  | 'drafts'
  | 'starred'
  | 'snoozed'
  | 'archived'
  | 'all'
  | 'trash'
  | 'pending'
  | null;

  // UI state
  isSidebarCollapsed: boolean;
  isComposeOpen: boolean;
  isDetailPanelOpen: boolean;

  // Presence
  presence: Map<string, PresenceUser[]>; // emailId -> viewers

  // Internal comments
  comments: Map<string, InternalComment[]>; // emailId -> comments

  // Actions
  setConversations: (conversations: EmailConversation[]) => void;
  selectConversation: (conversation: EmailConversation | null) => void;
  updateConversation: (conversationId: string, updates: Partial<EmailConversation>) => void;

  setFilters: (filters: Partial<EmailFilters>) => void;
  resetFiltersToDefault: () => void;
  agent_id: string | null;
  stage: string | null;
  setCurrentView: (view: EmailState['currentView'], extraFilters?: Partial<EmailFilters>) => void;
  setAssignedAgent: (agent: string | null) => void;
  setStage: (stage: string | null) => void;
  clearAssignedAgent: () => void;
  clearStage: () => void;
  toggleSidebar: () => void;
  setComposeOpen: (isOpen: boolean) => void;
  setDetailPanelOpen: (isOpen: boolean) => void;

  addPresence: (emailId: string, user: PresenceUser) => void;
  removePresence: (emailId: string, userId: string) => void;

  addComment: (emailId: string, comment: InternalComment) => void;
  updateComment: (emailId: string, commentId: string, updates: Partial<InternalComment>) => void;
  deleteComment: (emailId: string, commentId: string) => void;
}

export const useEmailStore = create<EmailState>()(
  persist(
    (set) => ({
      // Initial state
      conversations: [],
      selectedConversation: null,
      filters: {},
      currentView: null,
      agent_id: null, // FIX: was assignedAgent
      stage: null, // FIX: (was openingType; should match EmailState)
      isSidebarCollapsed: false,
      isComposeOpen: false,
      isDetailPanelOpen: false,
      presence: new Map(),
      comments: new Map(),

      // Actions
      setConversations: (conversations) => set({ conversations }),

      selectConversation: (conversation) =>
        set({
          selectedConversation: conversation,
          isDetailPanelOpen: !!conversation,
        }),

      updateConversation: (conversationId, updates) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv._id === conversationId ? { ...conv, ...updates } : conv
          ),
          selectedConversation:
            state.selectedConversation?._id === conversationId
              ? { ...state.selectedConversation, ...updates }
              : state.selectedConversation,
        })),

      setFilters: (filters) => set({ filters }),

      resetFiltersToDefault: () =>
        set((state) => {
          if (!state.currentView) return {};
          const defaultFilters = getFiltersFromView(state.currentView, state.agent_id, state.stage);
          return { filters: defaultFilters };
        }),

      setAssignedAgent: (agent: string | null) => set({ agent_id: agent }),
      setStage: (stage: string | null) => set({ stage: stage }),
      clearAssignedAgent: () => set({ agent_id: null }),
      clearStage: () => set({ stage: null }),

      setCurrentView: (view, extraFilters) =>
        set((state) => {
          if (!view) return state;

          const baseFilters = getFiltersFromView(view, state.agent_id, state.stage);
          const preservedFilters: Partial<EmailFilters> = {};

          if (state.filters?.date_filter) {
            preservedFilters.date_filter = state.filters.date_filter;
          }

          // Preserve existing mailserver_id when switching views unless the caller
          // explicitly overrides/clears it via extraFilters. This prevents a second
          // conversations fetch without mailserver_id when the URL sync re-applies
          // the same view.
          const hasExistingMailserver = state.filters?.mailserver_id;
          const overridesMailserver =
            extraFilters && Object.prototype.hasOwnProperty.call(extraFilters, 'mailserver_id');
          if (hasExistingMailserver && !overridesMailserver) {
            preservedFilters.mailserver_id = state.filters.mailserver_id;
          }

          return {
            currentView: view,
            filters: { ...baseFilters, ...preservedFilters, ...(extraFilters || {}) },
          };
        }),

      toggleSidebar: () =>
        set((state) => ({
          isSidebarCollapsed: !state.isSidebarCollapsed,
        })),

      setComposeOpen: (isOpen) => set({ isComposeOpen: isOpen }),

      setDetailPanelOpen: (isOpen) => set({ isDetailPanelOpen: isOpen }),

      addPresence: (emailId, user) =>
        set((state) => {
          const newPresence = new Map(state.presence);
          const currentUsers = newPresence.get(emailId) || [];
          newPresence.set(emailId, [...currentUsers.filter((u) => u._id !== user._id), user]);
          return { presence: newPresence };
        }),

      removePresence: (emailId, userId) =>
        set((state) => {
          const newPresence = new Map(state.presence);
          const currentUsers = newPresence.get(emailId) || [];
          newPresence.set(
            emailId,
            currentUsers.filter((u) => u._id !== userId)
          );
          return { presence: newPresence };
        }),

      addComment: (emailId, comment) =>
        set((state) => {
          const newComments = new Map(state.comments);
          const currentComments = newComments.get(emailId) || [];
          newComments.set(emailId, [...currentComments, comment]);
          return { comments: newComments };
        }),

      updateComment: (emailId, commentId, updates) =>
        set((state) => {
          const newComments = new Map(state.comments);
          const currentComments = newComments.get(emailId) || [];
          newComments.set(
            emailId,
            currentComments.map((c) => (c._id === commentId ? { ...c, ...updates } : c))
          );
          return { comments: newComments };
        }),

      deleteComment: (emailId, commentId) =>
        set((state) => {
          const newComments = new Map(state.comments);
          const currentComments = newComments.get(emailId) || [];
          newComments.set(
            emailId,
            currentComments.filter((c) => c._id !== commentId)
          );
          return { comments: newComments };
        }),
    }),
    {
      name: 'email-store',
      storage:
        typeof window !== 'undefined'
          ? createJSONStorage(() => sessionStorage)
          : (undefined as unknown as ReturnType<typeof createJSONStorage>),
      partialize: (state) => ({ currentView: state.currentView }),
      onRehydrateStorage: () => (state) => {
        // Sync filters when rehydrating from session storage
        if (state?.currentView) {
          state.filters = getFiltersFromView(state.currentView, state.agent_id, state.stage);
        }
      },
    }
  )
);
