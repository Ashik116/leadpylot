'use client';

import { useState } from 'react';
import { useCreateInvite, useInvites } from '@/services/hooks/comm';
import { X, Copy, Check } from 'lucide-react';
import ModalPortal from '../shared/ModalPortal';

interface Props {
  serverId: string;
  onClose: () => void;
}

export default function InviteModal({ serverId, onClose }: Props) {
  const createInvite = useCreateInvite();
  const { data: invites = [] } = useInvites(serverId);
  const [copied, setCopied] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createInvite.mutateAsync({ serverId, data: { maxUses: 0, expiresIn: 86400 } });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[440px] rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="text-lg font-bold text-white/90">Invite People</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors"><X size={20} /></button>
        </div>

        <div className="px-4 pb-4">
          <p className="mb-4 text-sm text-white/40">Share an invite code with others to join this server.</p>

          {invites.length > 0 && (
            <div className="mb-4 space-y-2">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-2">
                  <code className="flex-1 text-sm font-mono text-indigo-400">{inv.code}</code>
                  <span className="text-xs text-white/30">
                    {inv.uses}/{inv.maxUses || '∞'} uses
                  </span>
                  <button
                    onClick={() => handleCopy(inv.code)}
                    className="rounded-lg bg-white/[0.1] border border-white/[0.15] px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/[0.18] transition-all"
                  >
                    {copied === inv.code ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full rounded-lg bg-white/[0.1] backdrop-blur-xl border border-white/[0.15] py-2.5 text-sm font-medium text-white/90 transition-all hover:bg-white/[0.18] hover:border-white/[0.25] hover:shadow-lg hover:shadow-indigo-500/10 disabled:opacity-40"
          >
            {isCreating ? 'Generating...' : 'Generate New Invite Link'}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
