/**
 * Presence Store - Real-time collaboration awareness
 * Tracks who's viewing and composing emails
 */

import { create } from 'zustand';
import { PresenceUser, EmailPresence } from '../_types/presence.types';

interface PresenceState {
  // Email presence data: emailId -> presence info
  emailPresence: Map<string, EmailPresence>;
  
  // Current user's activity
  currentUserViewing: string | null;
  currentUserComposing: string | null;
  
  // Actions
  setViewing: (emailId: string | null) => void;
  setComposing: (emailId: string | null) => void;
  
  addViewer: (emailId: string, user: PresenceUser) => void;
  removeViewer: (emailId: string, userId: string) => void;
  
  addComposer: (emailId: string, user: PresenceUser) => void;
  removeComposer: (emailId: string, userId: string) => void;
  
  getPresence: (emailId: string) => EmailPresence | null;
  getViewers: (emailId: string) => PresenceUser[];
  getComposers: (emailId: string) => PresenceUser[];
  
  clearPresence: (emailId: string) => void;
  clearAllPresence: () => void;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  emailPresence: new Map(),
  currentUserViewing: null,
  currentUserComposing: null,
  
  setViewing: (emailId) => set({ currentUserViewing: emailId }),
  
  setComposing: (emailId) => set({ currentUserComposing: emailId }),
  
  addViewer: (emailId, user) => set((state) => {
    const newPresence = new Map(state.emailPresence);
    const current = newPresence.get(emailId) || {
      email_id: emailId,
      viewing: [],
      composing: [],
      updated_at: new Date().toISOString(),
    };
    
    // Remove user if already in list, then add (ensures no duplicates)
    const viewing = current.viewing.filter(u => u._id !== user._id);
    viewing.push(user);
    
    newPresence.set(emailId, {
      ...current,
      viewing,
      updated_at: new Date().toISOString(),
    });
    
    return { emailPresence: newPresence };
  }),
  
  removeViewer: (emailId, userId) => set((state) => {
    const newPresence = new Map(state.emailPresence);
    const current = newPresence.get(emailId);
    
    if (current) {
      newPresence.set(emailId, {
        ...current,
        viewing: current.viewing.filter(u => u._id !== userId),
        updated_at: new Date().toISOString(),
      });
    }
    
    return { emailPresence: newPresence };
  }),
  
  addComposer: (emailId, user) => set((state) => {
    const newPresence = new Map(state.emailPresence);
    const current = newPresence.get(emailId) || {
      email_id: emailId,
      viewing: [],
      composing: [],
      updated_at: new Date().toISOString(),
    };
    
    const composing = current.composing.filter(u => u._id !== user._id);
    composing.push(user);
    
    newPresence.set(emailId, {
      ...current,
      composing,
      updated_at: new Date().toISOString(),
    });
    
    return { emailPresence: newPresence };
  }),
  
  removeComposer: (emailId, userId) => set((state) => {
    const newPresence = new Map(state.emailPresence);
    const current = newPresence.get(emailId);
    
    if (current) {
      newPresence.set(emailId, {
        ...current,
        composing: current.composing.filter(u => u._id !== userId),
        updated_at: new Date().toISOString(),
      });
    }
    
    return { emailPresence: newPresence };
  }),
  
  getPresence: (emailId) => {
    return get().emailPresence.get(emailId) || null;
  },
  
  getViewers: (emailId) => {
    const presence = get().emailPresence.get(emailId);
    return presence?.viewing || [];
  },
  
  getComposers: (emailId) => {
    const presence = get().emailPresence.get(emailId);
    return presence?.composing || [];
  },
  
  clearPresence: (emailId) => set((state) => {
    const newPresence = new Map(state.emailPresence);
    newPresence.delete(emailId);
    return { emailPresence: newPresence };
  }),
  
  clearAllPresence: () => set({ emailPresence: new Map() }),
}));

