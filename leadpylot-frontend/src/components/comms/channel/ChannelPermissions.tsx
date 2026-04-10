'use client';

import { useState } from 'react';
import { useSetChannelPermissions, useRoles } from '@/services/hooks/comm';
import { Permissions } from '@/types/comm.types';
import type { PermissionOverride, Role } from '@/types/comm.types';
import { X } from 'lucide-react';
import ModalPortal from '../shared/ModalPortal';

interface Props {
  channelId: string;
  serverId: string;
  currentOverrides: PermissionOverride[];
  onClose: () => void;
}

const permList = [
  { key: 'VIEW_CHANNEL', label: 'View Channel', bit: Permissions.VIEW_CHANNEL },
  { key: 'SEND_MESSAGES', label: 'Send Messages', bit: Permissions.SEND_MESSAGES },
  { key: 'MANAGE_MESSAGES', label: 'Manage Messages', bit: Permissions.MANAGE_MESSAGES },
  { key: 'CONNECT', label: 'Connect (Voice)', bit: Permissions.CONNECT },
  { key: 'SPEAK', label: 'Speak', bit: Permissions.SPEAK },
  { key: 'VIDEO', label: 'Video', bit: Permissions.VIDEO },
  { key: 'STREAM', label: 'Stream', bit: Permissions.STREAM },
];

export default function ChannelPermissions({ channelId, serverId, currentOverrides, onClose }: Props) {
  const { data: roles = [] } = useRoles(serverId);
  const setPerms = useSetChannelPermissions();
  const [overrides, setOverrides] = useState<PermissionOverride[]>(currentOverrides);

  const togglePerm = (roleId: string, bit: number, field: 'allow' | 'deny') => {
    setOverrides((prev) => {
      const idx = prev.findIndex((o) => o.targetId === roleId && o.targetType === 'role');
      const existing = idx >= 0 ? { ...prev[idx] } : { targetId: roleId, targetType: 'role' as const, allow: 0, deny: 0 };

      if (field === 'allow') {
        existing.allow ^= bit;
        existing.deny &= ~bit;
      } else {
        existing.deny ^= bit;
        existing.allow &= ~bit;
      }

      const newOverrides = [...prev];
      if (idx >= 0) {
        newOverrides[idx] = existing;
      } else {
        newOverrides.push(existing);
      }
      return newOverrides.filter((o) => o.allow !== 0 || o.deny !== 0);
    });
  };

  const handleSave = async () => {
    await setPerms.mutateAsync({ channelId, serverId, overrides });
    onClose();
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[80vh] w-[560px] overflow-y-auto rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] shadow-2xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl p-4">
          <h2 className="text-lg font-bold text-white/90">Channel Permissions</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-4">
          {roles.map((role) => (
            <RolePermRow key={role.id} role={role} overrides={overrides} permList={permList} togglePerm={togglePerm} />
          ))}

          <div className="mt-4 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-white/90 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={setPerms.isPending} className="rounded-lg bg-white/[0.1] backdrop-blur-xl border border-white/[0.15] px-4 py-2 text-sm font-medium text-white/90 transition-all hover:bg-white/[0.18] hover:border-white/[0.25] disabled:opacity-40">
              {setPerms.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

function RolePermRow({ role, overrides, permList, togglePerm }: {
  role: Role;
  overrides: PermissionOverride[];
  permList: { key: string; label: string; bit: number }[];
  togglePerm: (roleId: string, bit: number, field: 'allow' | 'deny') => void;
}) {
  const override = overrides.find((o) => o.targetId === role.id && o.targetType === 'role');

  return (
    <div className="mb-4 rounded-xl bg-white/[0.05] border border-white/[0.08] p-3">
      <h3 className="mb-2 text-sm font-semibold" style={{ color: role.color || '#c4b5fd' }}>
        {role.name}
      </h3>
      <div className="grid grid-cols-2 gap-1">
        {permList.map((p) => {
          const isAllowed = override ? (override.allow & p.bit) !== 0 : false;
          const isDenied = override ? (override.deny & p.bit) !== 0 : false;

          return (
            <div key={p.key} className="flex items-center justify-between rounded-lg px-2 py-1 text-xs">
              <span className="text-white/50">{p.label}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => togglePerm(role.id, p.bit, 'allow')}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-all ${isAllowed ? 'bg-emerald-500/30 border border-emerald-500/40 text-emerald-300' : 'bg-white/[0.06] border border-white/[0.08] text-white/30'}`}
                >
                  ✓
                </button>
                <button
                  onClick={() => togglePerm(role.id, p.bit, 'deny')}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-all ${isDenied ? 'bg-red-500/30 border border-red-500/40 text-red-300' : 'bg-white/[0.06] border border-white/[0.08] text-white/30'}`}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
