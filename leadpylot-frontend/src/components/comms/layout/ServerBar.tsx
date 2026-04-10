'use client';

import { useState } from 'react';
import { useCommStore } from '@/stores/commStore';
import { useServers } from '@/services/hooks/comm';
import { MessageCircle, Plus, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import CreateServerModal from '../server/CreateServerModal';
import JoinServerModal from '../server/JoinServerModal';
import ServerIcon from '../server/ServerIcon';

export default function ServerBar() {
  const { view, activeServerId, setView, setActiveServer, unreadCounts } = useCommStore();
  const { data: servers = [] } = useServers();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const totalDMUnread = Object.entries(unreadCounts)
    .filter(([key]) => key.startsWith('dm_'))
    .reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="flex w-[72px] flex-col items-center gap-2 bg-[#1e1f22] py-3 overflow-y-auto scrollbar-none">
      {/* Home / DM Button */}
      <div className="relative flex items-center justify-center">
        {view === 'dm' && (
          <motion.div
            layoutId="server-pill"
            className="absolute -left-[4px] h-10 w-[4px] rounded-r-full bg-white"
          />
        )}
        <button
          onClick={() => setView('dm')}
          className={`group flex h-12 w-12 items-center justify-center transition-all duration-200 ${
            view === 'dm'
              ? 'rounded-[16px] bg-[#5865f2] text-white'
              : 'rounded-[24px] bg-[#313338] text-[#dcddde] hover:rounded-[16px] hover:bg-[#5865f2] hover:text-white'
          }`}
          title="Direct Messages"
        >
          <MessageCircle size={24} />
        </button>
        {totalDMUnread > 0 && (
          <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f23f43] px-1 text-[11px] font-bold text-white">
            {totalDMUnread > 99 ? '99+' : totalDMUnread}
          </span>
        )}
      </div>

      {/* Separator */}
      <div className="mx-auto h-[2px] w-8 rounded-full bg-[#35373c]" />

      {/* Server Icons */}
      {servers.map((server) => {
        const isActive = view === 'servers' && activeServerId === server.id;

        return (
          <div key={server.id} className="relative flex items-center justify-center">
            {isActive && (
              <motion.div
                layoutId="server-pill"
                className="absolute -left-[4px] h-10 w-[4px] rounded-r-full bg-white"
              />
            )}
            <ServerIcon
              server={server}
              isActive={isActive}
              onClick={() => setActiveServer(server.id)}
            />
          </div>
        );
      })}

      {/* Separator */}
      <div className="mx-auto h-[2px] w-8 rounded-full bg-[#35373c]" />

      {/* Add Server */}
      <button
        onClick={() => setShowCreate(true)}
        title="Add a Server"
        className="group flex h-12 w-12 items-center justify-center rounded-[24px] bg-[#313338] text-[#23a55a] transition-all duration-200 hover:rounded-[16px] hover:bg-[#23a55a] hover:text-white"
      >
        <Plus size={24} />
      </button>

      {/* Join Server */}
      <button
        onClick={() => setShowJoin(true)}
        title="Explore Public Servers"
        className="group flex h-12 w-12 items-center justify-center rounded-[24px] bg-[#313338] text-[#23a55a] transition-all duration-200 hover:rounded-[16px] hover:bg-[#23a55a] hover:text-white"
      >
        <Compass size={24} />
      </button>

      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinServerModal onClose={() => setShowJoin(false)} />}
    </div>
  );
}
