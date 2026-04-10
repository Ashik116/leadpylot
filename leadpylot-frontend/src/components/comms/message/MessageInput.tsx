'use client';

import { useState, useRef, useCallback } from 'react';
import { useCommStore } from '@/stores/commStore';
import { useSendMessage } from '@/services/hooks/comm';
import CommSocketService from '@/services/CommSocketService';
import { PlusCircle, Send, Smile } from 'lucide-react';
import { useChannels } from '@/services/hooks/comm';

export default function MessageInput() {
  const { activeChannelId, activeServerId } = useCommStore();
  const { data: channels = [] } = useChannels(activeServerId);
  const sendMessage = useSendMessage();
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingSentRef = useRef(0);

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  const TYPING_COOLDOWN = 3000; // Send typing indicator at most once every 3 seconds

  const handleSend = useCallback(async () => {
    if (!content.trim() || !activeChannelId) return;
    const text = content.trim();
    setContent('');
    try {
      await sendMessage.mutateAsync({ channelId: activeChannelId, content: text });
    } catch {
      setContent(text); // Restore on failure
    }
    textareaRef.current?.focus();
  }, [content, activeChannelId, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Send typing indicator (properly throttled — max once per 3 seconds)
    if (activeChannelId && activeServerId) {
      const now = Date.now();
      if (now - lastTypingSentRef.current > TYPING_COOLDOWN) {
        CommSocketService.getInstance().sendTyping(activeChannelId, activeServerId);
        lastTypingSentRef.current = now;
      }
    }

    // Auto-resize
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  };

  if (!activeChannelId) return null;

  return (
    <div className="px-4 pb-6 pt-0">
      <div className="flex items-end gap-2 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] px-4 py-1 transition-colors focus-within:border-indigo-500/40 focus-within:bg-white/[0.12] shadow-lg shadow-black/10">
        <button className="mb-2 text-white/30 hover:text-white/60 transition-colors">
          <PlusCircle size={20} />
        </button>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${activeChannel?.name || 'channel'}`}
          rows={1}
          className="max-h-[200px] flex-1 resize-none bg-transparent py-2.5 text-[15px] text-white/85 placeholder-white/20 outline-none"
        />
        <button className="mb-2 text-white/30 hover:text-white/60 transition-colors">
          <Smile size={20} />
        </button>
        {content.trim() && (
          <button onClick={handleSend} className="mb-2 text-indigo-400 hover:text-indigo-300 transition-colors">
            <Send size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
