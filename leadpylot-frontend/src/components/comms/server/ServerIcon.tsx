'use client';

import type { CommServer } from '@/types/comm.types';

interface ServerIconProps {
  server: CommServer;
  isActive: boolean;
  onClick: () => void;
  unreadCount?: number;
}

export default function ServerIcon({ server, isActive, onClick, unreadCount = 0 }: ServerIconProps) {
  const initial = server.name.charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      title={server.name}
      className={`group relative flex h-12 w-12 items-center justify-center overflow-hidden transition-all duration-300 ${
        isActive
          ? 'rounded-[16px] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25'
          : 'rounded-[24px] bg-white/[0.08] hover:rounded-[16px] hover:bg-gradient-to-br hover:from-indigo-500 hover:to-purple-600 hover:shadow-lg hover:shadow-indigo-500/20'
      }`}
    >
      {server.icon ? (
        <img src={server.icon} alt={server.name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-lg font-semibold text-white">{initial}</span>
      )}
      {unreadCount > 0 && !isActive && (
        <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-red-500/40">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      {/* Tooltip */}
      <div className="pointer-events-none absolute left-full ml-4 z-50 hidden whitespace-nowrap rounded-xl bg-black/80 backdrop-blur-xl border border-white/[0.1] px-3 py-2 text-sm font-medium text-white shadow-2xl group-hover:block">
        {server.name}
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-black/80" />
      </div>
    </button>
  );
}
