'use client';

import { useState } from 'react';
import { useRoles, useAssignRoles } from '@/services/hooks/comm';
import { X } from 'lucide-react';
import type { ServerMember } from '@/types/comm.types';
import ModalPortal from '../shared/ModalPortal';

interface Props {
  serverId: string;
  member: ServerMember;
  onClose: () => void;
}

export default function RoleManager({ serverId, member, onClose }: Props) {
  const { data: roles = [] } = useRoles(serverId);
  const assignRoles = useAssignRoles();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(member.roleIds);

  const assignableRoles = roles.filter((r) => !r.isDefault);

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const handleSave = async () => {
    await assignRoles.mutateAsync({ serverId, userId: member.userId, roleIds: selectedRoles });
    onClose();
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[380px] rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
          <h3 className="font-bold text-white/90">Manage Roles</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-2">
          {assignableRoles.length === 0 && (
            <p className="text-sm text-white/30">No custom roles available. Create roles first.</p>
          )}
          {assignableRoles.map((role) => (
            <label
              key={role.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/[0.06] transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedRoles.includes(role.id)}
                onChange={() => toggleRole(role.id)}
                className="h-4 w-4 rounded border-white/20 bg-white/[0.06] accent-indigo-500"
              />
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color || '#818cf8' }} />
                <span className="text-sm text-white/80">{role.name}</span>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 border-t border-white/[0.08] p-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-white/90 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={assignRoles.isPending} className="rounded-lg bg-white/[0.1] backdrop-blur-xl border border-white/[0.15] px-4 py-2 text-sm font-medium text-white/90 transition-all hover:bg-white/[0.18] hover:border-white/[0.25] disabled:opacity-40">
            {assignRoles.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
