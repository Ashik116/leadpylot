'use client';

import { useMemo } from 'react';
import { useCommStore } from '@/stores/commStore';
import { useMembers, useRoles, useUserProfiles } from '@/services/hooks/comm';
import type { ServerMember, Role, PresenceStatus } from '@/types/comm.types';

export default function MemberSidebar() {
  const { activeServerId, onlineUsers } = useCommStore();
  const { data: members = [] } = useMembers(activeServerId);
  const { data: roles = [] } = useRoles(activeServerId);

  const memberUserIds = useMemo(() => members.map((m) => m.userId), [members]);
  useUserProfiles(memberUserIds);

  const onlineMembers = members.filter((m) => {
    const status = onlineUsers[m.userId];
    return status && status !== 'offline';
  });
  const offlineMembers = members.filter((m) => {
    const status = onlineUsers[m.userId];
    return !status || status === 'offline';
  });

  return (
    <div className="flex w-60 flex-col bg-[#2b2d31]">
      <div className="flex-1 overflow-y-auto px-2 pt-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#1a1b1e]">
        {onlineMembers.length > 0 && (
          <MemberGroup label={`ONLINE \u2014 ${onlineMembers.length}`}>
            {onlineMembers.map((member) => (
              <MemberItem key={member.id} member={member} roles={roles} status={onlineUsers[member.userId] || 'online'} />
            ))}
          </MemberGroup>
        )}

        {offlineMembers.length > 0 && (
          <MemberGroup label={`OFFLINE \u2014 ${offlineMembers.length}`}>
            {offlineMembers.map((member) => (
              <MemberItem key={member.id} member={member} roles={roles} status="offline" />
            ))}
          </MemberGroup>
        )}
      </div>
    </div>
  );
}

function MemberGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <h3 className="mb-0.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-[#949ba4]">
        {label}
      </h3>
      {children}
    </div>
  );
}

function MemberItem({ member, roles, status }: { member: ServerMember; roles: Role[]; status: PresenceStatus }) {
  const memberRoles = roles.filter((r) => member.roleIds.includes(r.id));
  const highestRole = memberRoles.sort((a, b) => b.position - a.position)[0];
  const roleColor = highestRole?.color || undefined;

  const profile = useCommStore((s) => s.userProfiles[member.userId]);
  const displayName = member.nickname || profile?.username || member.userId.slice(-6);
  const avatarInitial = displayName[0]?.toUpperCase() || '?';

  const statusColors: Record<PresenceStatus, string> = {
    online: 'bg-[#23a55a]',
    idle: 'bg-[#f0b232]',
    dnd: 'bg-[#f23f43]',
    offline: 'bg-[#80848e]',
  };

  return (
    <button className={`group flex w-full items-center gap-3 rounded px-2 py-1 text-left transition-colors hover:bg-[#35373c] ${status === 'offline' ? 'opacity-30' : ''}`}>
      <div className="relative shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5865f2] text-xs font-semibold text-white">
          {avatarInitial}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-[2.5px] border-[#2b2d31] ${statusColors[status]}`} />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium" style={{ color: roleColor || '#f2f3f5' }}>
          {displayName}
        </p>
        {highestRole && !highestRole.isDefault && (
          <p className="truncate text-[11px] text-[#949ba4]">{highestRole.name}</p>
        )}
      </div>
    </button>
  );
}
