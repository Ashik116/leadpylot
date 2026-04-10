/**
 * useOptimisticViewed Hook
 * Manages optimistic viewed status updates that persist across query refetches
 */

import { useState, useEffect, useCallback } from 'react';
import { EmailConversation } from '../_types/email.types';
import { Role } from '@/configs/navigation.config/auth.route.config';

interface OptimisticUpdate {
  admin_viewed?: boolean;
  agent_viewed?: boolean;
  unread_count?: number;
}

type OptimisticViewedMap = Map<string, OptimisticUpdate>;

/**
 * Check if server has confirmed the viewed status for a conversation
 */
const isServerConfirmedViewed = (conversation: EmailConversation, userRole?: string): boolean => {
  if (!userRole) return false;
  return (
    (userRole === Role.ADMIN && conversation.admin_viewed) ||
    (userRole === Role.AGENT && conversation.agent_viewed)
  );
};

/**
 * Create an optimistic update object based on user role
 */
const createOptimisticUpdate = (userRole?: string): OptimisticUpdate | null => {
  if (!userRole) return null;

  if (userRole === Role.ADMIN) {
    return { unread_count: 0, admin_viewed: true };
  }
  if (userRole === Role.AGENT) {
    return { unread_count: 0, agent_viewed: true };
  }
  return null;
};

/**
 * Check if conversation needs optimistic update based on user role
 */
const needsOptimisticUpdate = (conversation: EmailConversation, userRole?: string): boolean => {
  if (!userRole) return false;
  return (
    (userRole === Role.ADMIN && !conversation.admin_viewed) ||
    (userRole === Role.AGENT && !conversation.agent_viewed)
  );
};

export function useOptimisticViewed(queryConversations: EmailConversation[], userRole?: string) {
  const [optimisticViewed, setOptimisticViewed] = useState<OptimisticViewedMap>(new Map());

  // Clear optimistic updates when server confirms viewed status
  useEffect(() => {
    if (!userRole || optimisticViewed.size === 0) return;

    const toRemove: string[] = [];
    queryConversations.forEach((queryConv) => {
      const optimisticUpdate = optimisticViewed.get(queryConv._id);
      if (!optimisticUpdate) return;

      if (isServerConfirmedViewed(queryConv, userRole)) {
        toRemove.push(queryConv._id);
      }
    });

    if (toRemove.length > 0) {
      // Defer state update to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setOptimisticViewed((prev) => {
          const next = new Map(prev);
          toRemove.forEach((id) => next.delete(id));
          return next;
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [queryConversations, userRole, optimisticViewed]);

  /**
   * Add an optimistic update for a conversation
   */
  const addOptimisticUpdate = useCallback((conversationId: string, update: OptimisticUpdate) => {
    setOptimisticViewed((prev) => {
      const next = new Map(prev);
      next.set(conversationId, update);
      return next;
    });
  }, []);

  /**
   * Mark conversation as viewed optimistically
   */
  const markAsViewed = useCallback(
    (conversation: EmailConversation) => {
      if (!needsOptimisticUpdate(conversation, userRole)) return null;

      const update = createOptimisticUpdate(userRole);
      if (!update) return null;

      addOptimisticUpdate(conversation._id, update);
      return update;
    },
    [userRole, addOptimisticUpdate]
  );

  return {
    optimisticViewed,
    markAsViewed,
  };
}
