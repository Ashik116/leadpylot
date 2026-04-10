/**
 * useAutoMarkAsViewed Hook
 * Automatically marks emails in a thread as viewed when user opens them
 * Uses batch API (one call) instead of N individual calls
 */

import { useEffect, useRef } from 'react';
import { EmailConversation } from '../_types/email.types';
import { useEmailStore } from '../_stores/emailStore';
import EmailApiService from '../_services/EmailApiService';
import { useSession } from '@/hooks/useSession';

interface UseAutoMarkAsViewedProps {
  conversation: EmailConversation;
  threadMessages: any[];
  emailDetailData?: any;
}

export function useAutoMarkAsViewed({
  conversation,
  threadMessages,
  emailDetailData,
}: UseAutoMarkAsViewedProps) {
  const { updateConversation } = useEmailStore();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const markedAsViewedRef = useRef<Set<string>>(new Set());
  const processedConversationRef = useRef<string | null>(null);

  // Reset processed ref when conversation changes
  useEffect(() => {
    if (processedConversationRef.current !== conversation._id) {
      processedConversationRef.current = null;
    }
  }, [conversation._id]);

  // Auto-mark emails in thread as viewed (single batch API call)
  useEffect(() => {
    const conversationId = conversation._id;
    const isAlreadyViewed = conversation.admin_viewed && conversation.agent_viewed;

    // Skip if we've already processed this conversation
    if (processedConversationRef.current === conversationId) {
      return;
    }

    // Skip if conversation is already marked as viewed
    if (isAlreadyViewed) {
      processedConversationRef.current = conversationId;
      return;
    }

    const markThreadAsViewed = async () => {
      // Get current thread messages
      const currentConversation = emailDetailData?.email || conversation;
      const currentThreadMessages =
        emailDetailData?.thread || conversation.messages || [currentConversation];
      const validThreadMessages = Array.isArray(currentThreadMessages)
        ? currentThreadMessages.filter((msg) => msg !== null && msg !== undefined)
        : [currentConversation];

      // Get all email IDs from the thread
      const emailIds = validThreadMessages
        .map((msg: any) => msg._id)
        .filter((id: string) => id && !markedAsViewedRef.current.has(id));

      if (emailIds.length === 0) {
        processedConversationRef.current = conversationId;
        return;
      }

      // Update local state immediately (optimistic update)
      updateConversation(conversationId, {
        unread_count: 0,
        admin_viewed: true,
        agent_viewed: true,
      });

      processedConversationRef.current = conversationId;
      emailIds.forEach((id) => markedAsViewedRef.current.add(id));

      // Single batch API call instead of N individual calls
      try {
        await EmailApiService.markMultipleAsViewed(emailIds, userRole);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to mark thread as viewed:', error);
      }
    };

    const timer = setTimeout(markThreadAsViewed, 500);
    return () => clearTimeout(timer);
  }, [
    conversation._id,
    conversation.admin_viewed,
    conversation.agent_viewed,
    conversation.messages,
    emailDetailData,
    updateConversation,
    userRole,
  ]);
}

