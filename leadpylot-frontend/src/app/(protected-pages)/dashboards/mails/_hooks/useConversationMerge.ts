/**
 * useConversationMerge Hook
 * Merges query conversations with store updates and optimistic updates
 */

import { useMemo } from 'react';
import { EmailConversation } from '../_types/email.types';

interface OptimisticUpdate {
  admin_viewed?: boolean;
  agent_viewed?: boolean;
  unread_count?: number;
}

type OptimisticViewedMap = Map<string, OptimisticUpdate>;

/**
 * Merge query conversations with store updates and optimistic updates
 */
export function useConversationMerge(
  queryConversations: EmailConversation[],
  storeConversations: EmailConversation[],
  optimisticViewed: OptimisticViewedMap
): EmailConversation[] {
  return useMemo(() => {
    // Create a map of store conversations by ID for quick lookup
    const storeMap = new Map(storeConversations.map((conv) => [conv._id, conv]));

    // Merge: preserve optimistic viewed status and store updates
    return queryConversations.map((queryConv) => {
      const storeConv = storeMap.get(queryConv._id);
      const optimisticUpdate = optimisticViewed.get(queryConv._id);

      // If we have an optimistic update, preserve viewed status fields
      if (optimisticUpdate) {
        return {
          ...queryConv,
          ...storeConv, // Store updates (if any)
          ...optimisticUpdate, // Preserve optimistic viewed status
        };
      }

      // Otherwise, use store version if available, or query version
      return storeConv ? { ...queryConv, ...storeConv } : queryConv;
    });
  }, [queryConversations, storeConversations, optimisticViewed]);
}
