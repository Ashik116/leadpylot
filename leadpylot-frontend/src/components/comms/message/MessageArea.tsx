'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCommStore } from '@/stores/commStore';
import { useMessages, commKeys, useUserProfiles } from '@/services/hooks/comm';
import { useQueryClient } from '@tanstack/react-query';
import { appendMessageToCache } from '@/services/hooks/comm/useMessages';
import CommSocketService from '@/services/CommSocketService';
import MessageItem from './MessageItem';
import DateDivider from './DateDivider';
import type { Message } from '@/types/comm.types';
import { Loader2 } from 'lucide-react';

/** A flattened item that can be either a date divider or a message */
type ListItem =
  | { type: 'date'; date: string }
  | { type: 'message'; message: Message; isGrouped: boolean };

export default function MessageArea() {
  const { activeChannelId, clearUnread } = useCommStore();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMessages(activeChannelId);
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Flatten all pages into a single message array (reversed to show newest at bottom), filter nulls
  const allMessages: Message[] = useMemo(
    () => (data?.pages.flatMap((p) => p.data || []).filter(Boolean) || []).reverse(),
    [data],
  );

  // Fetch user profiles for all message authors
  const authorIds = useMemo(() => [...new Set(allMessages.map((m) => m.authorId).filter(Boolean))], [allMessages]);
  useUserProfiles(authorIds);

  // Build a flat list of items (date dividers + messages) for virtualization
  const flatItems: ListItem[] = useMemo(() => {
    const items: ListItem[] = [];
    const groups = groupByDate(allMessages);
    for (const { date, messages } of groups) {
      items.push({ type: 'date', date });
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const prev = messages[i - 1];
        const isGrouped = !!prev && prev.authorId === msg.authorId && timeDiffMinutes(prev.createdAt, msg.createdAt) < 5;
        items.push({ type: 'message', message: msg, isGrouped });
      }
    }
    return items;
  }, [allMessages]);

  // Virtual list
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const item = flatItems[index];
      if (item.type === 'date') return 40; // Date divider height
      return item.isGrouped ? 28 : 56; // Grouped vs non-grouped message
    },
    overscan: 15,
  });

  // Clear unread when channel is active
  useEffect(() => {
    if (activeChannelId) clearUnread(activeChannelId);
  }, [activeChannelId, clearUnread]);

  // Real-time message subscription
  useEffect(() => {
    if (!activeChannelId) return;
    const socket = CommSocketService.getInstance();

    const unsubCreate = socket.on('MESSAGE_CREATE', (msg: Message) => {
      if (msg.channelId === activeChannelId) {
        appendMessageToCache(qc, activeChannelId, msg);
        if (isAtBottomRef.current) {
          // Scroll to bottom after render
          requestAnimationFrame(() => {
            virtualizer.scrollToIndex(flatItems.length, { align: 'end', behavior: 'smooth' });
          });
        }
      }
    });

    const unsubUpdate = socket.on('MESSAGE_UPDATE', () => {
      qc.invalidateQueries({ queryKey: commKeys.messages(activeChannelId) });
    });

    const unsubDelete = socket.on('MESSAGE_DELETE', () => {
      qc.invalidateQueries({ queryKey: commKeys.messages(activeChannelId) });
    });

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
    };
  }, [activeChannelId, qc, flatItems.length, virtualizer]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && flatItems.length > 0) {
      virtualizer.scrollToIndex(flatItems.length - 1, { align: 'end' });
    }
  }, [isLoading, activeChannelId, flatItems.length, virtualizer]);

  // Track scroll position for auto-scroll and infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;

    // Load more when scrolled near top
    if (el.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400/60" />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
    >
      {/* Load more indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-white/30" />
        </div>
      )}

      {/* Empty state */}
      {allMessages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-end pb-4">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08]">
            <span className="text-3xl">👋</span>
          </div>
          <h3 className="text-xl font-bold text-white/80">Welcome!</h3>
          <p className="text-sm text-white/30">This is the start of the channel. Say something!</p>
        </div>
      )}

      {/* Virtualized message list */}
      {flatItems.length > 0 && (
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = flatItems[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {item.type === 'date' ? (
                  <DateDivider date={item.date} />
                ) : (
                  <MessageItem message={item.message} isGrouped={item.isGrouped} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function groupByDate(messages: Message[]): { date: string; messages: Message[] }[] {
  const groups: Record<string, Message[]> = {};
  for (const msg of messages) {
    if (!msg?.createdAt) continue;
    const date = new Date(msg.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
  }
  return Object.entries(groups).map(([date, messages]) => ({ date, messages }));
}

function timeDiffMinutes(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 60000;
}
