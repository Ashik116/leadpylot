'use client';

import { useState } from 'react';
import { useCommStore } from '@/stores/commStore';
import { useEditMessage, useDeleteMessage } from '@/services/hooks/comm';
import { Pencil, Trash2 } from 'lucide-react';
import type { Message } from '@/types/comm.types';

interface Props {
  message: Message;
  isGrouped: boolean;
}

export default function MessageItem({ message, isGrouped }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();

  // Resolve author display name from cached profiles
  const authorProfile = useCommStore((s) => s.userProfiles[message.authorId]);
  const displayName = authorProfile?.username || message.authorId.slice(-6);
  const avatarInitial = displayName[0]?.toUpperCase() || '?';

  const time = new Date(message.createdAt);
  const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const fullDate = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await editMessage.mutateAsync({
        channelId: message.channelId,
        messageId: message.id,
        content: editContent.trim(),
      });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteMessage.mutate({ channelId: message.channelId, messageId: message.id });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  return (
    <div
      className={`group relative flex gap-4 px-1 py-0.5 rounded-lg transition-colors hover:bg-white/[0.03] ${isGrouped ? 'mt-0' : 'mt-4'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar or timestamp gutter */}
      <div className="w-10 shrink-0">
        {!isGrouped ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
            {avatarInitial}
          </div>
        ) : (
          <span className="invisible mt-1 block text-right text-[10px] text-white/20 group-hover:visible">
            {timeStr}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {!isGrouped && (
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className="text-[15px] font-medium text-white/90 hover:underline cursor-pointer">
              {displayName}
            </span>
            <span className="text-[11px] text-white/25">
              {fullDate} {timeStr}
            </span>
          </div>
        )}

        {isEditing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full resize-none rounded-lg bg-white/[0.06] border border-white/[0.1] px-3 py-2 text-[15px] text-white/90 outline-none focus:border-indigo-500/40 backdrop-blur-sm"
              rows={2}
              autoFocus
            />
            <p className="mt-1 text-[11px] text-white/30">
              Press <kbd className="rounded bg-white/[0.08] px-1 py-0.5">Enter</kbd> to save,{' '}
              <kbd className="rounded bg-white/[0.08] px-1 py-0.5">Escape</kbd> to cancel
            </p>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.375rem] text-white/75">
            {message.content}
            {message.editedAt && (
              <span className="ml-1 text-[10px] text-white/20">(edited)</span>
            )}
          </p>
        )}
      </div>

      {/* Action buttons (shown on hover) */}
      {isHovered && !isEditing && (
        <div className="absolute -top-4 right-4 flex items-center gap-0.5 rounded-lg bg-black/50 backdrop-blur-xl border border-white/[0.15] shadow-2xl">
          <button
            onClick={() => { setIsEditing(true); setEditContent(message.content); }}
            className="rounded-lg p-1.5 text-white/50 hover:text-white/90 hover:bg-white/[0.1] transition-all"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg p-1.5 text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
