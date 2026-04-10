'use client';

import { useState, useMemo } from 'react';
import { useCommStore } from '@/stores/commStore';
import { useAuthStore } from '@/stores/authStore';
import { useDMConversations, useUserProfiles } from '@/services/hooks/comm';
import { MessageCircle, Plus } from 'lucide-react';
import CreateDMModal from './CreateDMModal';

export default function DMList() {
  const { activeDMId, setActiveDM, unreadCounts, userProfiles, setMobileSidebarOpen } = useCommStore();
  const currentUserId = useAuthStore((s) => s.user?.id || s.user?._id);
  const { data: conversations = [] } = useDMConversations();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch profiles for all DM participants
  const allParticipantIds = useMemo(
    () => [...new Set(conversations.flatMap((c) => c.participants).filter(Boolean))],
    [conversations],
  );
  useUserProfiles(allParticipantIds);

  return (
    <div className="flex h-full flex-col">
      {/* Search Header */}
      <div className="p-2">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find or start a conversation"
            className="w-full rounded-lg bg-white/[0.08] border border-white/[0.12] px-2 py-1.5 text-[13px] text-white/80 placeholder-white/20 outline-none focus:border-indigo-500/40 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {/* New DM button */}
        <div className="mb-1 flex items-center justify-between px-2 pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/25">Direct Messages</span>
          <button onClick={() => setShowCreate(true)} className="text-white/30 hover:text-white/60 transition-colors">
            <Plus size={16} />
          </button>
        </div>

        {/* Conversation List */}
        {conversations.length === 0 && (
          <div className="mt-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08]">
              <MessageCircle size={24} className="text-white/20" />
            </div>
            <p className="text-sm text-white/30">No conversations yet</p>
          </div>
        )}

        {conversations.map((conv) => {
          const isActive = activeDMId === conv.id;
          const unread = unreadCounts[`dm_${conv.id}`] || 0;
          const otherUserId = conv.participants.find((p) => p !== currentUserId) || conv.participants[1];
          const otherProfile = otherUserId ? userProfiles[otherUserId] : undefined;
          const displayName = otherProfile?.username || (otherUserId || 'Unknown').slice(-6);
          const avatarInitial = displayName[0]?.toUpperCase() || '?';

          return (
            <button
              key={conv.id}
              onClick={() => { setActiveDM(conv.id); setMobileSidebarOpen(false); }}
              className={`mb-0.5 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-all ${
                isActive ? 'bg-white/[0.1] text-white' : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/60 to-purple-600/60 text-xs font-bold text-white">
                {avatarInitial}
              </div>
              <span className="flex-1 truncate text-[15px]">
                {displayName}
              </span>
              {unread > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500/90 px-1 text-[10px] font-bold text-white shadow-sm shadow-red-500/30">
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showCreate && <CreateDMModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
