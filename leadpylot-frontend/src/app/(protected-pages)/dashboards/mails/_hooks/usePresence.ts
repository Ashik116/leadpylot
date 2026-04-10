/**
 * usePresence Hook
 * Real-time presence tracking for email viewing/composing
 */

import { useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import { PresenceService } from '../_services';
import { usePresenceStore } from '../_stores/presenceStore';
import { PresenceEvent } from '../_types/presence.types';

export function usePresence() {
  const { data: session } = useSession();
  const {
    setViewing,
    setComposing,
    addViewer,
    removeViewer,
    addComposer,
    removeComposer,
  } = usePresenceStore();

  useEffect(() => {
    if (!session?.user) return;

    // Initialize presence service
    const user = {
      _id: session.user.id,
      name: session.user.name,
      login: session.user.email.split('@')[0], // Use email prefix as login
      email: session.user.email,
    };

    PresenceService.initialize(user);

    // Listen for presence updates
    const handlePresenceUpdate = (event: PresenceEvent) => {
      switch (event.type) {
        case 'view_start':
          addViewer(event.email_id, event.user);
          break;
        case 'view_end':
          removeViewer(event.email_id, event.user._id);
          break;
        case 'compose_start':
          addComposer(event.email_id, event.user);
          break;
        case 'compose_end':
          removeComposer(event.email_id, event.user._id);
          break;
        default:
          // Unknown event type
          break;
      }
    };

    PresenceService.onPresenceUpdate(handlePresenceUpdate);

    // Cleanup on unmount
    return () => {
      PresenceService.offPresenceUpdate();
      PresenceService.disconnect();
    };
  }, [session, addViewer, removeViewer, addComposer, removeComposer]);

  // Start viewing an email
  const startViewing = useCallback((emailId: string) => {
    setViewing(emailId);
    PresenceService.startViewing(emailId);
  }, [setViewing]);

  // Stop viewing an email
  const stopViewing = useCallback((emailId: string) => {
    setViewing(null);
    PresenceService.stopViewing(emailId);
  }, [setViewing]);

  // Start composing
  const startComposing = useCallback((emailId: string) => {
    setComposing(emailId);
    PresenceService.startComposing(emailId);
  }, [setComposing]);

  // Stop composing
  const stopComposing = useCallback((emailId: string) => {
    setComposing(null);
    PresenceService.stopComposing(emailId);
  }, [setComposing]);

  return {
    startViewing,
    stopViewing,
    startComposing,
    stopComposing,
  };
}

export function useEmailPresence(emailId: string | null) {
  const { getViewers, getComposers } = usePresenceStore();

  if (!emailId) {
    return {
      viewers: [],
      composers: [],
      isAnyoneViewing: false,
      isAnyoneComposing: false,
    };
  }

  const viewers = getViewers(emailId);
  const composers = getComposers(emailId);

  return {
    viewers,
    composers,
    isAnyoneViewing: viewers.length > 0,
    isAnyoneComposing: composers.length > 0,
  };
}

