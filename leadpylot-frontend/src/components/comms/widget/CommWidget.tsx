'use client';

import { useCommStore } from '@/stores/commStore';
import { useServers, useDMConversations } from '@/services/hooks/comm';
import { MessageCircle, X, Hash, Users, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UnreadBadge from './UnreadBadge';
import Link from 'next/link';

export default function CommWidget() {
  const { widgetOpen, toggleWidget, unreadCounts, voiceChannelId, voiceRoomName } = useCommStore();
  const { data: servers = [] } = useServers();
  const { data: dms = [] } = useDMConversations();

  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={toggleWidget}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        title="Communication"
      >
        <MessageCircle size={22} />
        <UnreadBadge />
      </button>

      {/* Widget Panel */}
      <AnimatePresence>
        {widgetOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 w-80 rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-white/[0.06] px-4 py-3">
              <h3 className="text-sm font-semibold text-white/90">Communication</h3>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboards/comms"
                  className="text-xs text-indigo-400 hover:underline"
                  onClick={() => toggleWidget()}
                >
                  Open Full View
                </Link>
                <button onClick={toggleWidget} className="text-white/40 hover:text-white/80 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Active Voice */}
            {voiceChannelId && (
              <div className="border-b border-white/[0.08] px-4 py-2">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                  In voice: {voiceRoomName}
                </div>
              </div>
            )}

            {/* Servers */}
            <div className="px-3 py-2">
              <h4 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                Servers ({servers.length})
              </h4>
              <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                {servers.map((s) => (
                  <Link
                    key={s.id}
                    href="/dashboards/comms"
                    onClick={() => {
                      useCommStore.getState().setActiveServer(s.id);
                      toggleWidget();
                    }}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/80 hover:bg-white/[0.08] transition-colors"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/60 to-purple-600/60 text-[10px] font-bold text-white">
                      {s.name[0]}
                    </div>
                    <span className="flex-1 truncate">{s.name}</span>
                    <ChevronRight size={14} className="text-white/20" />
                  </Link>
                ))}
                {servers.length === 0 && (
                  <p className="px-2 py-2 text-xs text-white/30">No servers yet</p>
                )}
              </div>
            </div>

            {/* DMs */}
            <div className="border-t border-white/[0.08] px-3 py-2">
              <h4 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                Direct Messages ({dms.length})
              </h4>
              <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                {dms.slice(0, 5).map((dm) => {
                  const unread = unreadCounts[`dm_${dm.id}`] || 0;
                  return (
                    <Link
                      key={dm.id}
                      href="/dashboards/comms"
                      onClick={() => {
                        useCommStore.getState().setActiveDM(dm.id);
                        toggleWidget();
                      }}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/80 hover:bg-white/[0.08] transition-colors"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.1] text-[10px] font-bold text-white/60">
                        DM
                      </div>
                      <span className="flex-1 truncate">{dm.participants[1]?.slice(-6) || 'Conversation'}</span>
                      {unread > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500/90 px-1 text-[9px] font-bold text-white shadow-sm shadow-red-500/30">
                          {unread}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {dms.length === 0 && (
                  <p className="px-2 py-2 text-xs text-white/30">No conversations yet</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <Link
              href="/dashboards/comms"
              onClick={() => toggleWidget()}
              className="flex items-center justify-center gap-2 border-t border-white/[0.08] px-4 py-2.5 text-sm font-medium text-indigo-400 hover:bg-white/[0.06] transition-colors"
            >
              <Users size={16} />
              Open Communication Hub
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
