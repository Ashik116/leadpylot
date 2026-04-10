'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useCommStore } from '@/stores/commStore';
import { useDMMessages, useSendDM, useUserProfiles } from '@/services/hooks/comm';
import { useQueryClient } from '@tanstack/react-query';
import { commKeys } from '@/services/hooks/comm/useServers';
import CommSocketService from '@/services/CommSocketService';
import MessageItem from '../message/MessageItem';
import DateDivider from '../message/DateDivider';
import type { DirectMessage, Message } from '@/types/comm.types';
import { Loader2, PlusCircle, Send, Smile } from 'lucide-react';

export default function DMConversation() {
  const { activeDMId } = useCommStore();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useDMMessages(activeDMId);
  const sendDM = useSendDM();
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState('');

  const allMessages: DirectMessage[] = (data?.pages.flatMap((p) => p.data || []).filter(Boolean) || []).reverse();

  // Fetch profiles for DM message authors
  const authorIds = useMemo(() => [...new Set(allMessages.map((m) => m.authorId).filter(Boolean))], [allMessages]);
  useUserProfiles(authorIds);

  // Real-time DM subscription
  useEffect(() => {
    if (!activeDMId) return;
    const socket = CommSocketService.getInstance();

    const unsub = socket.on('DM_MESSAGE_CREATE', (msg: DirectMessage) => {
      if (msg.conversationId === activeDMId) {
        qc.invalidateQueries({ queryKey: commKeys.dmMessages(activeDMId) });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    });

    const unsubUpdate = socket.on('DM_MESSAGE_UPDATE', () => {
      qc.invalidateQueries({ queryKey: commKeys.dmMessages(activeDMId) });
    });

    const unsubDelete = socket.on('DM_MESSAGE_DELETE', () => {
      qc.invalidateQueries({ queryKey: commKeys.dmMessages(activeDMId) });
    });

    return () => { unsub(); unsubUpdate(); unsubDelete(); };
  }, [activeDMId, qc]);

  // Auto-scroll on load
  useEffect(() => {
    if (!isLoading) bottomRef.current?.scrollIntoView();
  }, [isLoading, activeDMId]);

  const handleSend = useCallback(async () => {
    if (!content.trim() || !activeDMId) return;
    const text = content.trim();
    setContent('');
    await sendDM.mutateAsync({ dmId: activeDMId, content: text });
  }, [content, activeDMId, sendDM]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Adapt DM messages to message format for reuse
  const asMessages: Message[] = allMessages.map((dm) => ({
    id: dm.id,
    channelId: dm.conversationId,
    authorId: dm.authorId,
    content: dm.content,
    editedAt: dm.editedAt,
    createdAt: dm.createdAt,
  }));

  const grouped = groupByDate(asMessages);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400/60" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {allMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-end pb-4">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08]">
              <span className="text-3xl">✉️</span>
            </div>
            <h3 className="text-xl font-bold text-white/80">Start of conversation</h3>
            <p className="text-sm text-white/30">Send a message to get started!</p>
          </div>
        )}

        {grouped.map(({ date, messages }) => (
          <div key={date}>
            <DateDivider date={date} />
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const isGrouped = prev && prev.authorId === msg.authorId && timeDiff(prev.createdAt, msg.createdAt) < 5;
              return <MessageItem key={msg.id} message={msg} isGrouped={isGrouped} />;
            })}
          </div>
        ))}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-0">
        <div className="flex items-end gap-2 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] px-4 py-1 transition-colors focus-within:border-indigo-500/40 focus-within:bg-white/[0.12] shadow-lg shadow-black/10">
          <button className="mb-2 text-white/30 hover:text-white/60 transition-colors"><PlusCircle size={20} /></button>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message"
            rows={1}
            className="max-h-[200px] flex-1 resize-none bg-transparent py-2.5 text-[15px] text-white/85 placeholder-white/20 outline-none"
          />
          <button className="mb-2 text-white/30 hover:text-white/60 transition-colors"><Smile size={20} /></button>
          {content.trim() && (
            <button onClick={handleSend} className="mb-2 text-indigo-400 hover:text-indigo-300 transition-colors"><Send size={20} /></button>
          )}
        </div>
      </div>
    </div>
  );
}

function groupByDate(messages: Message[]) {
  const groups: Record<string, Message[]> = {};
  for (const msg of messages) {
    if (!msg?.createdAt) continue;
    const d = new Date(msg.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!groups[d]) groups[d] = [];
    groups[d].push(msg);
  }
  return Object.entries(groups).map(([date, messages]) => ({ date, messages }));
}

function timeDiff(a: string, b: string) {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 60000;
}
